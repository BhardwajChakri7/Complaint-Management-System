from flask import Blueprint, request, jsonify, current_app
from models.complaint import Complaint, ComplaintAttachment, ComplaintFeedback, ComplaintStatus, ComplaintCategory, ComplaintPriority, db
from models.user import User
from models.admin import Admin
from utils.cloudinary_service import cloudinary_service
from utils.pdf_generator import ComplaintPDFGenerator
from utils.email_service import email_service
from utils.assignment_engine import assign_complaint
from trained_models.standalone_ml import ml_service
import jwt
from functools import wraps
import os
from datetime import datetime

# Create blueprint
complaints_bp = Blueprint('complaints', __name__, url_prefix='/api/complaints')

def token_required(f):
    """Decorator to require valid JWT token"""
    @wraps(f)
    def decorated(*args, **kwargs):
        token = None
        auth_header = request.headers.get('Authorization')
        
        if auth_header and auth_header.startswith('Bearer '):
            token = auth_header.split(' ')[1]
        
        if not token:
            print("❌ Token is missing from request")
            return jsonify({
                'success': False,
                'message': 'Token is missing'
            }), 401
        
        try:
            jwt_secret = os.getenv('JWT_TOKEN')
            if not jwt_secret:
                print("❌ JWT_TOKEN environment variable not set")
                return jsonify({
                    'success': False,
                    'message': 'Server configuration error: JWT_TOKEN not set'
                }), 500
            
            data = jwt.decode(token, jwt_secret, algorithms=['HS256'])
            current_user_id = data.get('user_id') or data.get('admin_id')
            current_user_role = data.get('role')
            
            print(f"✅ Token decoded successfully - User ID: {current_user_id}, Role: {current_user_role}")
            
            if not current_user_id or not current_user_role:
                print(f"❌ Token missing required fields - user_id: {current_user_id}, role: {current_user_role}")
                return jsonify({
                    'success': False,
                    'message': 'Token is missing required fields'
                }), 401
                
        except jwt.ExpiredSignatureError:
            print("❌ Token has expired")
            return jsonify({
                'success': False,
                'message': 'Token has expired. Please login again.'
            }), 401
        except jwt.DecodeError:
            print("❌ Token format is invalid")
            return jsonify({
                'success': False,
                'message': 'Token format is invalid. Please login again to get a new token.'
            }), 401
        except jwt.InvalidTokenError as e:
            print(f"❌ Token is invalid: {str(e)}")
            return jsonify({
                'success': False,
                'message': f'Token is invalid: {str(e)}. Please login again.'
            }), 401
        except Exception as e:
            print(f"❌ Token validation error: {str(e)}")
            return jsonify({
                'success': False,
                'message': f'Token validation error: {str(e)}'
            }), 401
        
        return f(current_user_id, current_user_role, *args, **kwargs)
    
    return decorated

@complaints_bp.route('/submit', methods=['POST'])
@token_required
def submit_complaint(current_user_id, current_user_role):
    """Submit a new complaint with optional file attachments"""
    try:
        # Debug: Check environment variables
        jwt_token = os.getenv('JWT_TOKEN')
        neon_uri = os.getenv('NEON_URI')
        
        if not jwt_token:
            print("⚠️ JWT_TOKEN environment variable is not set")
        if not neon_uri:
            print("⚠️ NEON_URI environment variable is not set")
        
        print(f"Debug: current_user_id={current_user_id}, current_user_role={current_user_role}")
        # Only students and faculty can submit complaints
        if current_user_role not in ['student', 'faculty']:
            return jsonify({
                'success': False,
                'message': 'Only students and faculty can submit complaints'
            }), 403
        
        # Get form data
        title = request.form.get('title', '').strip()
        description = request.form.get('description', '').strip()
        estimated_time_str = request.form.get('estimated_completion_time', '').strip()
        
        # Validate required fields
        if not title or not description:
            return jsonify({
                'success': False,
                'message': 'Title and description are required'
            }), 400
        
        if len(title) < 5 or len(description) < 10:
            return jsonify({
                'success': False,
                'message': 'Title must be at least 5 characters and description at least 10 characters'
            }), 400
        
        # Validate and parse estimated completion time (optional, max 30 minutes)
        estimated_completion_time = None
        if estimated_time_str:
            try:
                estimated_completion_time = int(estimated_time_str)
                if estimated_completion_time <= 0:
                    return jsonify({
                        'success': False,
                        'message': 'Estimated completion time must be greater than 0 minutes'
                    }), 400
                if estimated_completion_time > 30:
                    return jsonify({
                        'success': False,
                        'message': 'Estimated completion time must be 30 minutes or less'
                    }), 400
            except ValueError:
                return jsonify({
                    'success': False,
                    'message': 'Estimated completion time must be a valid number (in minutes)'
                }), 400
        
        # Use ML service to classify the complaint
        try:
            category, priority = ml_service.classify_user_query(f"{title} {description}")
        except Exception as e:
            print(f"ML classification error: {e}")
            # Fallback to default values
            category = "Technical"
            priority = "medium"
        
        # Create complaint
        complaint = Complaint()
        complaint.ticket_id = Complaint.generate_ticket_id()
        complaint.user_id = current_user_id
        complaint.title = title
        complaint.description = description
        complaint.category = ComplaintCategory(category)
        complaint.priority = ComplaintPriority(priority)
        complaint.status = ComplaintStatus.PENDING
        
        if estimated_completion_time is not None:
            complaint.estimated_completion_time = estimated_completion_time
        
        try:
            db.session.add(complaint)
            db.session.flush()  # Get the complaint ID
        except Exception as e:
            print(f"Database error adding complaint: {e}")
            db.session.rollback()
            return jsonify({
                'success': False,
                'message': 'Database error occurred'
            }), 500
        
        # Handle file attachments
        uploaded_files = []
        if 'attachments' in request.files:
            files = request.files.getlist('attachments')
            
            for file in files:
                if file and file.filename:
                    try:
                        # Upload to Cloudinary
                        upload_result = cloudinary_service.upload_file(file, folder="complaints")
                        
                        if upload_result['success']:
                            # Create attachment record
                            attachment = ComplaintAttachment(
                                complaint_id=complaint.id,
                                filename=upload_result['data']['filename'],
                                original_filename=upload_result['data']['original_filename'],
                                file_url=upload_result['data']['file_url'],
                                file_type=upload_result['data']['file_type'],
                                file_size=upload_result['data']['file_size'],
                                cloudinary_public_id=upload_result['data']['cloudinary_public_id']
                            )
                            
                            db.session.add(attachment)
                            uploaded_files.append(upload_result['data'])
                        else:
                            # If any file upload fails, rollback and return error
                            db.session.rollback()
                            return jsonify({
                                'success': False,
                                'message': f"File upload failed: {upload_result['error']}"
                            }), 400
                    except Exception as e:
                        print(f"File upload error: {e}")
                        db.session.rollback()
                        return jsonify({
                            'success': False,
                            'message': 'File upload error occurred'
                        }), 500
        
        # Commit the transaction
        try:
            db.session.commit()
        except Exception as e:
            print(f"Database commit error: {e}")
            db.session.rollback()
            return jsonify({
                'success': False,
                'message': 'Database commit error occurred'
            }), 500

        # Auto-assign complaint to a team/staff
        assignment = None
        try:
            assignment = assign_complaint(complaint)
            print(f"✅ Assignment created: Team={assignment.team.value}, Auto={assignment.is_auto_assigned}")
        except Exception as e:
            print(f"⚠️ Assignment failed (non-critical): {e}")

        # Get user details for email
        user = User.query.get(current_user_id)

        # Build assignment info for email
        assignment_info = None
        if assignment:
            from models.staff import Staff
            assignment_info = {
                'team': assignment.team.value,
                'category': assignment.category,
                'sla_deadline': assignment.sla_deadline.strftime('%d %b %Y, %H:%M UTC') if assignment.sla_deadline else None,
                'is_auto_assigned': assignment.is_auto_assigned,
                'staff': None,
                'team_members': []
            }
            if assignment.staff_id:
                # Auto-assigned to a specific staff member
                assigned_staff = Staff.query.get(assignment.staff_id)
                if assigned_staff:
                    assignment_info['staff'] = {
                        'name': assigned_staff.name,
                        'email': assigned_staff.email,
                        'number': assigned_staff.number,
                        'category_expertise': assigned_staff.category_expertise.value,
                        'team': assigned_staff.team.value
                    }
            else:
                # Team pool — fetch all staff members in this team+category
                from models.staff import CategoryExpertise
                cat_enum = next((c for c in CategoryExpertise if c.value == assignment.category), None)
                team_members = Staff.query.filter_by(
                    team=assignment.team,
                    category_expertise=cat_enum
                ).all() if cat_enum else []
                assignment_info['team_members'] = [
                    {
                        'name': m.name,
                        'email': m.email,
                        'number': m.number,
                        'category_expertise': m.category_expertise.value,
                        'team': m.team.value
                    }
                    for m in team_members
                ]

        # Prepare complaint data for PDF and email
        complaint_data = complaint.to_dict()
        complaint_data['attachments'] = [att.to_dict() for att in complaint.attachments]

        # Generate PDF and send emails (optional - don't fail if this fails)
        try:
            # Generate PDF
            pdf_generator = ComplaintPDFGenerator()
            pdf_data = pdf_generator.generate_complaint_pdf(complaint_data)

            # Send emails
            try:
                # Send confirmation to user (with assignment info)
                user_email_sent = email_service.send_complaint_confirmation_to_user(
                    complaint_data, pdf_data, user.email, assignment_info
                )
                if not user_email_sent:
                    print(f"❌ Failed to send confirmation email to user: {user.email}")

                # Send notification to all admins in database
                admins = Admin.query.all()
                for admin in admins:
                    try:
                        email_sent = email_service.send_complaint_notification_to_admin(
                            complaint_data, pdf_data, admin.email
                        )
                        if not email_sent:
                            print(f"❌ Failed to send notification to admin: {admin.email}")
                    except Exception as admin_email_error:
                        print(f"❌ Exception while sending email to admin {admin.email}: {str(admin_email_error)}")

                if not admins:
                    print("⚠️ No admins found in database - no admin notifications sent")

            except Exception as e:
                print(f"Email sending failed: {str(e)}")
        except Exception as e:
            print(f"PDF generation failed: {str(e)}")
        
        return jsonify({
            'success': True,
            'message': 'Complaint submitted successfully',
            'data': {
                'complaint': complaint_data,
                'uploaded_files': uploaded_files,
                'classification': {
                    'category': category,
                    'priority': priority,
                    'method': 'ML Classification'
                }
            }
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({
            'success': False,
            'message': 'Internal server error',
            'error': str(e)
        }), 500

@complaints_bp.route('/my-complaints', methods=['GET'])
@token_required
def get_my_complaints(current_user_id, current_user_role):
    """Get complaints submitted by the current user"""
    try:
        # Only students and faculty can view their complaints
        if current_user_role not in ['student', 'faculty']:
            return jsonify({
                'success': False,
                'message': 'Access denied'
            }), 403
        
        # Get pagination parameters
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 10, type=int)
        status_filter = request.args.get('status', None)
        category_filter = request.args.get('category', None)
        
        # Build query
        query = Complaint.query.filter_by(user_id=current_user_id)
        
        if status_filter:
            query = query.filter_by(status=ComplaintStatus(status_filter))
        
        if category_filter:
            query = query.filter_by(category=ComplaintCategory(category_filter))
        
        # Order by creation date (newest first)
        query = query.order_by(Complaint.created_at.desc())
        
        # Paginate
        complaints = query.paginate(
            page=page, per_page=per_page, error_out=False
        )
        
        return jsonify({
            'success': True,
            'message': 'Complaints retrieved successfully',
            'data': {
                'complaints': [complaint.to_dict() for complaint in complaints.items],
                'pagination': {
                    'page': page,
                    'per_page': per_page,
                    'total': complaints.total,
                    'pages': complaints.pages,
                    'has_next': complaints.has_next,
                    'has_prev': complaints.has_prev
                }
            }
        }), 200
        
    except Exception as e:
        return jsonify({
            'success': False,
            'message': 'Internal server error',
            'error': str(e)
        }), 500

@complaints_bp.route('/<int:complaint_id>', methods=['GET'])
@token_required
def get_complaint_details(current_user_id, current_user_role, complaint_id):
    """Get detailed information about a specific complaint"""
    try:
        complaint = Complaint.query.get_or_404(complaint_id)
        
        # Check permissions
        if current_user_role in ['student', 'faculty']:
            # Users can only view their own complaints
            if complaint.user_id != current_user_id:
                return jsonify({
                    'success': False,
                    'message': 'Access denied'
                }), 403
        elif current_user_role == 'admin':
            # Verify admin exists
            if not current_user_id:
                return jsonify({
                    'success': False,
                    'message': 'Invalid admin token'
                }), 401
            
            admin = Admin.query.get(current_user_id)
            if not admin:
                return jsonify({
                    'success': False,
                    'message': 'Admin not found'
                }), 404
        else:
            return jsonify({
                'success': False,
                'message': 'Access denied'
            }), 403
        
        return jsonify({
            'success': True,
            'message': 'Complaint details retrieved successfully',
            'data': {
                'complaint': complaint.to_dict()
            }
        }), 200
        
    except Exception as e:
        return jsonify({
            'success': False,
            'message': 'Internal server error',
            'error': str(e)
        }), 500

@complaints_bp.route('/all', methods=['GET'])
@token_required
def get_all_complaints(current_user_id, current_user_role):
    """Get all complaints (admin only)"""
    try:
        # Only admins can view all complaints
        if current_user_role != 'admin':
            return jsonify({
                'success': False,
                'message': 'Admin access required'
            }), 403
        
        # Verify admin exists
        if not current_user_id:
            return jsonify({
                'success': False,
                'message': 'Invalid admin token'
            }), 401
        
        admin = Admin.query.get(current_user_id)
        if not admin:
            return jsonify({
                'success': False,
                'message': 'Admin not found'
            }), 404
        
        # Get pagination and filter parameters
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 20, type=int)
        status_filter = request.args.get('status', None)
        category_filter = request.args.get('category', None)
        priority_filter = request.args.get('priority', None)
        search_query = request.args.get('search', None)
        
        # Build query
        query = Complaint.query
        
        if status_filter:
            query = query.filter_by(status=ComplaintStatus(status_filter))
        
        if category_filter:
            query = query.filter_by(category=ComplaintCategory(category_filter))
        
        if priority_filter:
            query = query.filter_by(priority=ComplaintPriority(priority_filter))
        
        if search_query:
            query = query.filter(
                db.or_(
                    Complaint.title.ilike(f'%{search_query}%'),
                    Complaint.description.ilike(f'%{search_query}%'),
                    Complaint.ticket_id.ilike(f'%{search_query}%')
                )
            )
        
        # Order by creation date (newest first)
        query = query.order_by(Complaint.created_at.desc())
        
        # Paginate
        complaints = query.paginate(
            page=page, per_page=per_page, error_out=False
        )
        
        return jsonify({
            'success': True,
            'message': 'All complaints retrieved successfully',
            'data': {
                'complaints': [complaint.to_dict() for complaint in complaints.items],
                'pagination': {
                    'page': page,
                    'per_page': per_page,
                    'total': complaints.total,
                    'pages': complaints.pages,
                    'has_next': complaints.has_next,
                    'has_prev': complaints.has_prev
                },
                'filters': {
                    'status': status_filter,
                    'category': category_filter,
                    'priority': priority_filter,
                    'search': search_query
                }
            }
        }), 200
        
    except Exception as e:
        return jsonify({
            'success': False,
            'message': 'Internal server error',
            'error': str(e)
        }), 500

@complaints_bp.route('/<int:complaint_id>/update-status', methods=['PUT'])
@token_required
def update_complaint_status(current_user_id, current_user_role, complaint_id):
    """Update complaint status (admin only)"""
    try:
        # Only admins can update complaint status
        if current_user_role != 'admin':
            return jsonify({
                'success': False,
                'message': 'Admin access required'
            }), 403
        
        # Verify admin exists
        if not current_user_id:
            return jsonify({
                'success': False,
                'message': 'Invalid admin token'
            }), 401
        
        admin = Admin.query.get(current_user_id)
        if not admin:
            return jsonify({
                'success': False,
                'message': 'Admin not found'
            }), 404
        
        complaint = Complaint.query.get_or_404(complaint_id)
        
        data = request.get_json()
        new_status = data.get('status')
        admin_response = data.get('admin_response', '').strip()
        
        if not new_status:
            return jsonify({
                'success': False,
                'message': 'Status is required'
            }), 400
        
        try:
            status_enum = ComplaintStatus(new_status)
        except ValueError:
            return jsonify({
                'success': False,
                'message': 'Invalid status value'
            }), 400
        
        # Update complaint
        complaint.status = status_enum
        complaint.admin_id = current_user_id
        
        if admin_response:
            complaint.admin_response = admin_response
        
        if status_enum in [ComplaintStatus.RESOLVED, ComplaintStatus.CLOSED]:
            complaint.resolved_at = datetime.utcnow()
        
        db.session.commit()
        
        # Send update notification to user and admins
        try:
            user = User.query.get(complaint.user_id)
            complaint_data = complaint.to_dict()

            # Generate updated PDF
            pdf_generator = ComplaintPDFGenerator()
            pdf_data = pdf_generator.generate_complaint_pdf(complaint_data)

            # If status changed to in_progress, send assignment notification with staff details
            if status_enum == ComplaintStatus.IN_PROGRESS:
                staff_data = None
                if complaint.assignment and complaint.assignment.staff_id:
                    from models.staff import Staff
                    assigned_staff = Staff.query.get(complaint.assignment.staff_id)
                    if assigned_staff:
                        staff_data = assigned_staff.to_dict()

                email_service.send_assignment_notification_to_user(
                    complaint_data, staff_data, user.email
                )
            else:
                # Send generic update email for other status changes
                update_message = admin_response or f"Status updated to: {new_status}"
                user_email_sent = email_service.send_complaint_update_notification(
                    complaint_data, pdf_data, user.email, update_message
                )
                if not user_email_sent:
                    print(f"❌ Failed to send status update notification to user: {user.email}")
            
            # Send notification to all other admins (except the one who updated)
            other_admins = Admin.query.filter(Admin.id != current_user_id).all()
            for admin in other_admins:
                try:
                    # Create admin notification message
                    admin_update_message = f"Complaint {complaint.ticket_id} has been updated by another admin. New status: {new_status}"
                    if admin_response:
                        admin_update_message += f"\n\nAdmin Response: {admin_response}"
                    
                    admin_email_sent = email_service.send_complaint_update_notification(
                        complaint_data, pdf_data, admin.email, admin_update_message
                    )
                    if not admin_email_sent:
                        print(f"❌ Failed to send update notification to admin: {admin.email}")
                except Exception as admin_email_error:
                    print(f"❌ Exception while sending update email to admin {admin.email}: {str(admin_email_error)}")
            
        except Exception as e:
            print(f"Email sending failed: {str(e)}")
        
        return jsonify({
            'success': True,
            'message': 'Complaint status updated successfully',
            'data': {
                'complaint': complaint.to_dict()
            }
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({
            'success': False,
            'message': 'Internal server error',
            'error': str(e)
        }), 500

@complaints_bp.route('/stats', methods=['GET'])
@token_required
def get_complaint_stats(current_user_id, current_user_role):
    """Get complaint statistics"""
    try:
        if current_user_role == 'admin':
            # Verify admin exists
            if not current_user_id:
                return jsonify({
                    'success': False,
                    'message': 'Invalid admin token'
                }), 401
            
            admin = Admin.query.get(current_user_id)
            if not admin:
                return jsonify({
                    'success': False,
                    'message': 'Admin not found'
                }), 404
            
            # Admin can see all stats
            total_complaints = Complaint.query.count()
            pending_complaints = Complaint.query.filter_by(status=ComplaintStatus.PENDING).count()
            in_progress_complaints = Complaint.query.filter_by(status=ComplaintStatus.IN_PROGRESS).count()
            resolved_complaints = Complaint.query.filter_by(status=ComplaintStatus.RESOLVED).count()
            closed_complaints = Complaint.query.filter_by(status=ComplaintStatus.CLOSED).count()
            
            # Category stats
            category_stats = {}
            for category in ComplaintCategory:
                category_stats[category.value] = Complaint.query.filter_by(category=category).count()
            
            # Priority stats
            priority_stats = {}
            for priority in ComplaintPriority:
                priority_stats[priority.value] = Complaint.query.filter_by(priority=priority).count()
            
        else:
            # Users can see only their stats
            total_complaints = Complaint.query.filter_by(user_id=current_user_id).count()
            pending_complaints = Complaint.query.filter_by(user_id=current_user_id, status=ComplaintStatus.PENDING).count()
            in_progress_complaints = Complaint.query.filter_by(user_id=current_user_id, status=ComplaintStatus.IN_PROGRESS).count()
            resolved_complaints = Complaint.query.filter_by(user_id=current_user_id, status=ComplaintStatus.RESOLVED).count()
            closed_complaints = Complaint.query.filter_by(user_id=current_user_id, status=ComplaintStatus.CLOSED).count()
            
            # Category stats for user
            category_stats = {}
            for category in ComplaintCategory:
                category_stats[category.value] = Complaint.query.filter_by(user_id=current_user_id, category=category).count()
            
            # Priority stats for user
            priority_stats = {}
            for priority in ComplaintPriority:
                priority_stats[priority.value] = Complaint.query.filter_by(user_id=current_user_id, priority=priority).count()
        
        return jsonify({
            'success': True,
            'message': 'Statistics retrieved successfully',
            'data': {
                'total_complaints': total_complaints,
                'status_stats': {
                    'pending': pending_complaints,
                    'in_progress': in_progress_complaints,
                    'resolved': resolved_complaints,
                    'closed': closed_complaints
                },
                'category_stats': category_stats,
                'priority_stats': priority_stats
            }
        }), 200
        
    except Exception as e:
        return jsonify({
            'success': False,
            'message': 'Internal server error',
            'error': str(e)
        }), 500

@complaints_bp.route('/<int:complaint_id>/download-pdf', methods=['GET'])
@token_required
def download_complaint_pdf(current_user_id, current_user_role, complaint_id):
    """Download complaint as PDF"""
    try:
        complaint = Complaint.query.get_or_404(complaint_id)
        
        # Check permissions
        if current_user_role in ['student', 'faculty']:
            if complaint.user_id != current_user_id:
                return jsonify({
                    'success': False,
                    'message': 'Access denied'
                }), 403
        elif current_user_role == 'admin':
            # Verify admin exists
            if not current_user_id:
                return jsonify({
                    'success': False,
                    'message': 'Invalid admin token'
                }), 401
            
            admin = Admin.query.get(current_user_id)
            if not admin:
                return jsonify({
                    'success': False,
                    'message': 'Admin not found'
                }), 404
        else:
            return jsonify({
                'success': False,
                'message': 'Access denied'
            }), 403
        
        # Generate PDF
        complaint_data = complaint.to_dict()
        pdf_generator = ComplaintPDFGenerator()
        pdf_data = pdf_generator.generate_complaint_pdf(complaint_data)
        
        # Return PDF as response
        from flask import Response
        return Response(
            pdf_data,
            mimetype='application/pdf',
            headers={
                'Content-Disposition': f'attachment; filename=complaint_{complaint.ticket_id}.pdf'
            }
        )
        
    except Exception as e:
        return jsonify({
            'success': False,
            'message': 'Internal server error',
            'error': str(e)
        }), 500

@complaints_bp.route('/<int:complaint_id>/feedback', methods=['POST'])
@token_required
def submit_feedback(current_user_id, current_user_role, complaint_id):
    """Submit feedback for a resolved complaint"""
    try:
        complaint = Complaint.query.get_or_404(complaint_id)
        
        # Check if user owns this complaint
        if complaint.user_id != current_user_id:
            return jsonify({
                'success': False,
                'message': 'Access denied'
            }), 403
        
        # Check if complaint is resolved or closed
        if complaint.status not in [ComplaintStatus.RESOLVED, ComplaintStatus.CLOSED]:
            return jsonify({
                'success': False,
                'message': 'Feedback can only be submitted for resolved complaints'
            }), 400
        
        # Check if feedback already exists
        if complaint.feedback:
            return jsonify({
                'success': False,
                'message': 'Feedback already submitted for this complaint'
            }), 400
        
        data = request.json
        rating = data.get('rating')
        feedback_text = data.get('feedback_text', '').strip()
        
        # Validate rating
        if not rating or not isinstance(rating, int) or rating < 1 or rating > 5:
            return jsonify({
                'success': False,
                'message': 'Rating must be between 1 and 5'
            }), 400
        
        # Create feedback
        feedback = ComplaintFeedback(
            complaint_id=complaint_id,
            rating=rating,
            feedback_text=feedback_text
        )
        
        db.session.add(feedback)
        db.session.commit()
        
        # Send email notification to admin
        try:
            email_service.send_feedback_notification(
                complaint=complaint,
                feedback=feedback
            )
        except Exception as e:
            print(f"Failed to send feedback email: {e}")
        
        return jsonify({
            'success': True,
            'message': 'Feedback submitted successfully',
            'data': feedback.to_dict()
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({
            'success': False,
            'message': 'Internal server error',
            'error': str(e)
        }), 500

@complaints_bp.route('/<int:complaint_id>/feedback', methods=['GET'])
@token_required
def get_feedback(current_user_id, current_user_role, complaint_id):
    """Get feedback for a complaint"""
    try:
        complaint = Complaint.query.get_or_404(complaint_id)
        
        # Check permissions
        if current_user_role in ['student', 'faculty']:
            if complaint.user_id != current_user_id:
                return jsonify({
                    'success': False,
                    'message': 'Access denied'
                }), 403
        
        if complaint.feedback:
            return jsonify({
                'success': True,
                'message': 'Feedback retrieved successfully',
                'data': complaint.feedback.to_dict()
            }), 200
        else:
            return jsonify({
                'success': True,
                'message': 'No feedback found',
                'data': None
            }), 200
        
    except Exception as e:
        return jsonify({
            'success': False,
            'message': 'Internal server error',
            'error': str(e)
        }), 500

@complaints_bp.route('/community', methods=['GET'])
@token_required
def get_community_complaints(current_user_id, current_user_role):
    """Get recent complaints for community view (anonymized)"""
    try:
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 10, type=int)
        
        # Get recent resolved/closed complaints
        complaints = Complaint.query.filter(
            Complaint.status.in_([ComplaintStatus.RESOLVED, ComplaintStatus.CLOSED])
        ).order_by(Complaint.resolved_at.desc()).paginate(
            page=page, per_page=per_page, error_out=False
        )
        
        # Anonymize the complaints
        anonymized_complaints = []
        for complaint in complaints.items:
            # Create anonymous user info
            user_name = complaint.user.name if complaint.user else "Anonymous"
            anonymous_name = f"User{complaint.user_id}" if complaint.user_id else "Anonymous"
            
            complaint_data = {
                'id': complaint.id,
                'ticket_id': complaint.ticket_id,
                'title': complaint.title,
                'description': complaint.description,
                'category': complaint.category.value,
                'priority': complaint.priority.value,
                'status': complaint.status.value,
                'created_at': complaint.created_at.isoformat(),
                'resolved_at': complaint.resolved_at.isoformat() if complaint.resolved_at else None,
                'admin_response': complaint.admin_response,
                'anonymous_user': anonymous_name,
                'feedback': complaint.feedback.to_dict() if complaint.feedback else None
            }
            anonymized_complaints.append(complaint_data)
        
        return jsonify({
            'success': True,
            'message': 'Community complaints retrieved successfully',
            'data': {
                'complaints': anonymized_complaints,
                'pagination': {
                    'page': page,
                    'per_page': per_page,
                    'total': complaints.total,
                    'pages': complaints.pages,
                    'has_next': complaints.has_next,
                    'has_prev': complaints.has_prev
                }
            }
        }), 200
        
    except Exception as e:
        return jsonify({
            'success': False,
            'message': 'Internal server error',
            'error': str(e)
        }), 500


@complaints_bp.route('/feedbacks', methods=['GET'])
@token_required
def get_all_feedbacks(current_user_id, current_user_role):
    """Get all feedbacks with complaint + user info (admin only)"""
    if current_user_role != 'admin':
        return jsonify({'success': False, 'message': 'Admin access required'}), 403

    try:
        feedbacks = ComplaintFeedback.query.order_by(ComplaintFeedback.submitted_at.desc()).all()
        result = []
        for fb in feedbacks:
            complaint = Complaint.query.get(fb.complaint_id)
            if not complaint:
                continue
            result.append({
                'id': fb.id,
                'rating': fb.rating,
                'feedback_text': fb.feedback_text,
                'submitted_at': fb.submitted_at.isoformat(),
                'complaint': {
                    'id': complaint.id,
                    'ticket_id': complaint.ticket_id,
                    'title': complaint.title,
                    'category': complaint.category.value,
                    'priority': complaint.priority.value,
                    'status': complaint.status.value,
                },
                'user': {
                    'name': complaint.user.name if complaint.user else None,
                    'email': complaint.user.email if complaint.user else None,
                    'role': complaint.user.role.value if complaint.user else None,
                },
                'staff': {
                    'name': complaint.assignment.staff.name if complaint.assignment and complaint.assignment.staff else None,
                    'email': complaint.assignment.staff.email if complaint.assignment and complaint.assignment.staff else None,
                    'team': complaint.assignment.team.value if complaint.assignment else None,
                } if complaint.assignment else None
            })

        avg_rating = round(sum(f['rating'] for f in result) / len(result), 1) if result else 0

        return jsonify({
            'success': True,
            'data': {
                'feedbacks': result,
                'total': len(result),
                'avg_rating': avg_rating
            }
        }), 200

    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500
