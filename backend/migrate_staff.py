"""Migration: Add staff and complaint_assignments tables"""
from server import create_app
from models.user import db
from models.staff import Staff, ComplaintAssignment

def migrate():
    app = create_app()
    with app.app_context():
        db.create_all()
        print("✅ Staff and ComplaintAssignment tables created successfully!")

if __name__ == '__main__':
    migrate()
