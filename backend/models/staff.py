from datetime import datetime
import bcrypt
import enum
from .user import db

class TeamType(enum.Enum):
    TEAM_A = "Team A"
    TEAM_B = "Team B"
    TEAM_C = "Team C"

class CategoryExpertise(enum.Enum):
    TECHNICAL = "Technical"
    ACADEMIC = "Academic"
    HOSTEL_MESS = "Hostel/Mess"
    MAINTENANCE = "Maintenance"

class AssignmentStatus(enum.Enum):
    ASSIGNED = "assigned"
    SELF_ASSIGNED = "self_assigned"
    REASSIGNED = "reassigned"
    COMPLETED = "completed"

class Staff(db.Model):
    __tablename__ = 'staff'

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False, index=True)
    number = db.Column(db.String(15), unique=True, nullable=False)
    password_hash = db.Column(db.String(128), nullable=False)
    team = db.Column(db.Enum(TeamType), nullable=False)
    category_expertise = db.Column(db.Enum(CategoryExpertise), nullable=False)
    is_available = db.Column(db.Boolean, default=True)
    current_load = db.Column(db.Integer, default=0)  # active complaints count
    total_resolved = db.Column(db.Integer, default=0)
    avg_resolution_time = db.Column(db.Float, default=0.0)  # in minutes
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    assignments = db.relationship('ComplaintAssignment', backref='staff', lazy=True)

    def __init__(self, name, email, number, password, team, category_expertise):
        self.name = name
        self.email = email
        self.number = number
        self.set_password(password)
        self.team = TeamType(team)
        self.category_expertise = CategoryExpertise(category_expertise)

    def set_password(self, password):
        self.password_hash = bcrypt.hashpw(
            password.encode('utf-8'), bcrypt.gensalt()
        ).decode('utf-8')

    def check_password(self, password):
        return bcrypt.checkpw(
            password.encode('utf-8'), self.password_hash.encode('utf-8')
        )

    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'email': self.email,
            'number': self.number,
            'team': self.team.value,
            'category_expertise': self.category_expertise.value,
            'is_available': self.is_available,
            'current_load': self.current_load,
            'total_resolved': self.total_resolved,
            'avg_resolution_time': self.avg_resolution_time,
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat()
        }

    def __repr__(self):
        return f'<Staff {self.email} - {self.team.value}>'


class ComplaintAssignment(db.Model):
    __tablename__ = 'complaint_assignments'

    id = db.Column(db.Integer, primary_key=True)
    complaint_id = db.Column(db.Integer, db.ForeignKey('complaints.id'), nullable=False)
    staff_id = db.Column(db.Integer, db.ForeignKey('staff.id'), nullable=True)
    team = db.Column(db.Enum(TeamType), nullable=False)
    category = db.Column(db.String(50), nullable=False)
    status = db.Column(db.Enum(AssignmentStatus), default=AssignmentStatus.ASSIGNED)
    is_auto_assigned = db.Column(db.Boolean, default=False)  # True if estimated_time < 30
    assigned_at = db.Column(db.DateTime, default=datetime.utcnow)
    accepted_at = db.Column(db.DateTime, nullable=True)   # when staff self-assigns
    completed_at = db.Column(db.DateTime, nullable=True)
    sla_deadline = db.Column(db.DateTime, nullable=True)   # based on priority
    notes = db.Column(db.Text, nullable=True)

    # Relationship back to complaint
    complaint = db.relationship('Complaint', backref=db.backref('assignment', uselist=False))

    def to_dict(self):
        return {
            'id': self.id,
            'complaint_id': self.complaint_id,
            'staff_id': self.staff_id,
            'staff_name': self.staff.name if self.staff else None,
            'staff_email': self.staff.email if self.staff else None,
            'team': self.team.value,
            'category': self.category,
            'status': self.status.value,
            'is_auto_assigned': self.is_auto_assigned,
            'assigned_at': self.assigned_at.isoformat(),
            'accepted_at': self.accepted_at.isoformat() if self.accepted_at else None,
            'completed_at': self.completed_at.isoformat() if self.completed_at else None,
            'sla_deadline': self.sla_deadline.isoformat() if self.sla_deadline else None,
            'notes': self.notes
        }

    def __repr__(self):
        return f'<Assignment complaint={self.complaint_id} team={self.team.value}>'
