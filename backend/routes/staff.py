from flask import Blueprint, request, jsonify
from models.staff import Staff, ComplaintAssignment, TeamType, CategoryExpertise, AssignmentStatus
from models.complaint import Complaint, ComplaintStatus
from models.user import User, db
from utils.assignment_engine import complete_assignment, get_staff_active_count
from utils.email_service import email_service
import jwt
import os
from functools import wraps
from datetime import datetime, timedelta

MAX_ACTIVE_PER_STAFF = 2  # individual staff cap for self-assign

staff_bp = Blueprint('staff', __name__, url_prefix='/api/staff')

# ---------- Auth Decorator ----------

def staff_token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = None
        auth_header = request.headers.get('Authorization')
        if auth_header and auth_header.startswith('Bearer '):
            token = auth_header.split(' ')[1]

        if not token:
            return jsonify({'success': False, 'message': 'Token is missing'}), 401

        try:
            data = jwt.decode(token, os.getenv('JWT_TOKEN'), algorithms=['HS256'])
            if data.get('role') != 'staff':
                return jsonify({'success': False, 'message': 'Staff access required'}), 403
            current_staff_id = data.get('staff_id')
        except jwt.ExpiredSignatureError:
            return jsonify({'success': False, 'message': 'Token has expired'}), 401
        except jwt.InvalidTokenError:
            return jsonify({'success': False, 'message': 'Invalid token'}), 401

        return f(current_staff_id, *args, **kwargs)
    return decorated

# ---------- Auth Routes ----------

@staff_bp.route('/signup', methods=['POST'])
def staff_signup():
    """Register a new staff member"""
    data = request.json
    required = ['name', 'email', 'number', 'password', 'team', 'category_expertise']
    if not data or not all(data.get(f) for f in required):
        return jsonify({'success': False, 'message': 'All fields are required'}), 400

    # Validate team
    valid_teams = [t.value for t in TeamType]
    if data['team'] not in valid_teams:
        return jsonify({'success': False, 'message': f'Team must be one of: {valid_teams}'}), 400

    # Validate category
    valid_categories = [c.value for c in CategoryExpertise]
    if data['category_expertise'] not in valid_categories:
        return jsonify({'success': False, 'message': f'Category must be one of: {valid_categories}'}), 400

    if Staff.query.filter_by(email=data['email']).first():
        return jsonify({'success': False, 'message': 'Email already registered'}), 409

    if Staff.query.filter_by(number=data['number']).first():
        return jsonify({'success': False, 'message': 'Phone number already registered'}), 409

    try:
        staff = Staff(
            name=data['name'],
            email=data['email'],
            number=data['number'],
            password=data['password'],
            team=data['team'],
            category_expertise=data['category_expertise']
        )
        db.session.add(staff)
        db.session.commit()

        token = jwt.encode({
            'staff_id': staff.id,
            'email': staff.email,
            'role': 'staff',
            'exp': datetime.utcnow() + timedelta(days=7)
        }, os.getenv('JWT_TOKEN'), algorithm='HS256')

        return jsonify({
            'success': True,
            'message': 'Staff registered successfully',
            'data': {'staff': staff.to_dict(), 'token': token}
        }), 201

    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'message': str(e)}), 500


@staff_bp.route('/login', methods=['POST'])
def staff_login():
    """Staff login"""
    data = request.json
    if not data or not data.get('email') or not data.get('password'):
        return jsonify({'success': False, 'message': 'Email and password required'}), 400

    staff = Staff.query.filter_by(email=data['email']).first()
    if not staff or not staff.check_password(data['password']):
        return jsonify({'success': False, 'message': 'Invalid credentials'}), 401

    token = jwt.encode({
        'staff_id': staff.id,
        'email': staff.email,
        'role': 'staff',
        'exp': datetime.utcnow() + timedelta(days=7)
    }, os.getenv('JWT_TOKEN'), algorithm='HS256')

    return jsonify({
        'success': True,
        'message': 'Login successful',
        'data': {'staff': staff.to_dict(), 'token': token}
    }), 200

# ---------- Profile ----------

@staff_bp.route('/profile', methods=['GET'])
@staff_token_required
def get_profile(current_staff_id):
    staff = Staff.query.get(current_staff_id)
    if not staff:
        return jsonify({'success': False, 'message': 'Staff not found'}), 404
    return jsonify({'success': True, 'data': {'staff': staff.to_dict()}}), 200


@staff_bp.route('/availability', methods=['PUT'])
@staff_token_required
def toggle_availability(current_staff_id):
    """Toggle staff availability"""
    staff = Staff.query.get(current_staff_id)
    if not staff:
        return jsonify({'success': False, 'message': 'Staff not found'}), 404

    staff.is_available = not staff.is_available
    db.session.commit()

    return jsonify({
        'success': True,
        'message': f'You are now {"available" if staff.is_available else "unavailable"}',
        'data': {'is_available': staff.is_available}
    }), 200

# ---------- Complaints ----------

@staff_bp.route('/complaints', methods=['GET'])
@staff_token_required
def get_team_complaints(current_staff_id):
    """Get all complaints assigned to this staff's team"""
    staff = Staff.query.get(current_staff_id)
    if not staff:
        return jsonify({'success': False, 'message': 'Staff not found'}), 404

    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 20, type=int)
    status_filter = request.args.get('status', None)
    view = request.args.get('view', 'team')  # 'team' or 'mine'

    if view == 'mine':
        # All complaints ever assigned to this staff (including completed)
        query = ComplaintAssignment.query.filter_by(staff_id=current_staff_id)
    else:
        # All complaints for this team + category
        query = ComplaintAssignment.query.filter_by(
            team=staff.team,
            category=staff.category_expertise.value
        )

    if status_filter:
        query = query.filter_by(status=AssignmentStatus(status_filter))

    assignments = query.order_by(ComplaintAssignment.assigned_at.desc()).paginate(
        page=page, per_page=per_page, error_out=False
    )

    result = []
    for assignment in assignments.items:
        complaint_data = assignment.complaint.to_dict()
        complaint_data['assignment'] = assignment.to_dict()
        result.append(complaint_data)

    return jsonify({
        'success': True,
        'data': {
            'complaints': result,
            'pagination': {
                'page': page,
                'per_page': per_page,
                'total': assignments.total,
                'pages': assignments.pages
            }
        }
    }), 200


@staff_bp.route('/complaints/pool', methods=['GET'])
@staff_token_required
def get_pool_complaints(current_staff_id):
    """Get unassigned complaints in team pool (staff can self-assign)"""
    staff = Staff.query.get(current_staff_id)
    if not staff:
        return jsonify({'success': False, 'message': 'Staff not found'}), 404

    # Complaints assigned to team but no specific staff yet, and not resolved/closed
    assignments = ComplaintAssignment.query.filter_by(
        team=staff.team,
        category=staff.category_expertise.value,
        staff_id=None,
        status=AssignmentStatus.ASSIGNED
    ).join(ComplaintAssignment.complaint).filter(
        Complaint.status.notin_([ComplaintStatus.RESOLVED, ComplaintStatus.CLOSED])
    ).order_by(ComplaintAssignment.sla_deadline.asc()).all()

    result = []
    for assignment in assignments:
        complaint_data = assignment.complaint.to_dict()
        complaint_data['assignment'] = assignment.to_dict()
        result.append(complaint_data)

    return jsonify({'success': True, 'data': {'complaints': result}}), 200


@staff_bp.route('/complaints/<int:assignment_id>/self-assign', methods=['PUT'])
@staff_token_required
def self_assign(current_staff_id, assignment_id):
    """Staff self-assigns a complaint from the pool"""
    staff = Staff.query.get(current_staff_id)
    assignment = ComplaintAssignment.query.get(assignment_id)

    if not assignment:
        return jsonify({'success': False, 'message': 'Assignment not found'}), 404

    if assignment.team != staff.team:
        return jsonify({'success': False, 'message': 'This complaint belongs to a different team'}), 403

    if assignment.staff_id:
        return jsonify({'success': False, 'message': 'Already assigned to a staff member'}), 400

    # Check if this staff is already at max active complaints
    active_count = get_staff_active_count(current_staff_id)
    if active_count >= MAX_ACTIVE_PER_STAFF:
        return jsonify({
            'success': False,
            'message': f'You already have {active_count} active complaints. Complete one before taking more.'
        }), 400

    assignment.staff_id = current_staff_id
    assignment.status = AssignmentStatus.SELF_ASSIGNED
    assignment.accepted_at = datetime.utcnow()
    staff.current_load += 1

    db.session.commit()

    # Notify the user who raised the complaint
    try:
        complaint = assignment.complaint
        user = User.query.get(complaint.user_id)
        if user:
            staff_details = {
                'name': staff.name,
                'email': staff.email,
                'number': staff.number,
                'team': staff.team.value,
                'category_expertise': staff.category_expertise.value,
            }
            email_service.send_staff_assigned_notification(
                complaint.to_dict(), staff_details, user.email
            )
    except Exception as e:
        print(f"⚠️ Failed to send staff assignment email: {e}")

    return jsonify({
        'success': True,
        'message': 'Complaint self-assigned successfully',
        'data': {'assignment': assignment.to_dict()}
    }), 200


@staff_bp.route('/complaints/<int:assignment_id>/complete', methods=['PUT'])
@staff_token_required
def mark_complete(current_staff_id, assignment_id):
    """Mark a complaint as resolved"""
    assignment = ComplaintAssignment.query.get(assignment_id)

    if not assignment:
        return jsonify({'success': False, 'message': 'Assignment not found'}), 404

    if assignment.staff_id != current_staff_id:
        return jsonify({'success': False, 'message': 'Not your assignment'}), 403

    data = request.json or {}
    notes = data.get('notes', '')

    # Update complaint status
    complaint = assignment.complaint
    complaint.status = ComplaintStatus.RESOLVED
    complaint.resolved_at = datetime.utcnow()
    if notes:
        complaint.admin_response = notes
        assignment.notes = notes

    complete_assignment(assignment)

    return jsonify({
        'success': True,
        'message': 'Complaint marked as resolved',
        'data': {'assignment': assignment.to_dict()}
    }), 200


@staff_bp.route('/complaints/<int:assignment_id>/notes', methods=['PUT'])
@staff_token_required
def update_notes(current_staff_id, assignment_id):
    """Add notes to an assignment"""
    assignment = ComplaintAssignment.query.get(assignment_id)
    if not assignment or assignment.staff_id != current_staff_id:
        return jsonify({'success': False, 'message': 'Not found or unauthorized'}), 404

    data = request.json or {}
    assignment.notes = data.get('notes', assignment.notes)
    db.session.commit()

    return jsonify({'success': True, 'message': 'Notes updated', 'data': assignment.to_dict()}), 200

# ---------- Stats ----------

@staff_bp.route('/stats', methods=['GET'])
@staff_token_required
def get_stats(current_staff_id):
    """Get staff personal stats"""
    staff = Staff.query.get(current_staff_id)
    if not staff:
        return jsonify({'success': False, 'message': 'Staff not found'}), 404

    total = ComplaintAssignment.query.filter_by(staff_id=current_staff_id).count()
    active = ComplaintAssignment.query.filter_by(
        staff_id=current_staff_id
    ).join(ComplaintAssignment.complaint).filter(
        Complaint.status.notin_([ComplaintStatus.RESOLVED, ComplaintStatus.CLOSED])
    ).count()
    completed = ComplaintAssignment.query.filter_by(
        staff_id=current_staff_id
    ).join(ComplaintAssignment.complaint).filter(
        Complaint.status.in_([ComplaintStatus.RESOLVED, ComplaintStatus.CLOSED])
    ).count()

    # Pool size (unassigned in team, excluding resolved/closed)
    pool_size = ComplaintAssignment.query.filter_by(
        team=staff.team,
        category=staff.category_expertise.value,
        staff_id=None,
        status=AssignmentStatus.ASSIGNED
    ).join(ComplaintAssignment.complaint).filter(
        Complaint.status.notin_([ComplaintStatus.RESOLVED, ComplaintStatus.CLOSED])
    ).count()

    # SLA breached
    now = datetime.utcnow()
    breached = ComplaintAssignment.query.filter_by(
        staff_id=current_staff_id
    ).filter(
        ComplaintAssignment.sla_deadline < now,
        ComplaintAssignment.status != AssignmentStatus.COMPLETED
    ).count()

    return jsonify({
        'success': True,
        'data': {
            'total_assigned': total,
            'active': active,
            'completed': completed,
            'pool_size': pool_size,
            'sla_breached': breached,
            'total_resolved': staff.total_resolved,
            'avg_resolution_time': round(staff.avg_resolution_time, 1),
            'is_available': staff.is_available,
            'current_load': staff.current_load
        }
    }), 200


# ---------- Admin: manage all staff ----------

@staff_bp.route('/all', methods=['GET'])
def get_all_staff():
    """Get all staff (admin use) - no auth for simplicity, add admin check if needed"""
    staff_list = Staff.query.order_by(Staff.team, Staff.category_expertise).all()
    return jsonify({
        'success': True,
        'data': {'staff': [s.to_dict() for s in staff_list]}
    }), 200
