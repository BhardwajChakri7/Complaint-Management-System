from flask_mail import Mail, Message
from flask import current_app
import os
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.mime.base import MIMEBase
from email import encoders
import smtplib

class EmailService:
    def __init__(self, app=None):
        self.mail = None
        if app:
            self.init_app(app)
    
    def init_app(self, app):
        """Initialize email service with Flask app"""
        email_user = os.getenv('EMAIL_USER')
        email_pass = os.getenv('EMAIL_PASS')
        
        if not email_user or not email_pass:
            print("⚠️ WARNING: EMAIL_USER or EMAIL_PASS environment variables are not set. Email functionality will not work.")
            print("⚠️ Please set EMAIL_USER and EMAIL_PASS in your .env file")
            self.mail = None
            return
        
        # Clean password (remove spaces, which are common when copying App Passwords)
        email_pass = email_pass.strip().replace(' ', '')
        
        # Debug: Show masked credentials
        masked_pass = '*' * (len(email_pass) - 4) + email_pass[-4:] if len(email_pass) > 4 else '****'
        print(f"📧 Email Configuration:")
        print(f"   User: {email_user}")
        print(f"   Password: {masked_pass} (length: {len(email_pass)} chars)")
        
        app.config['MAIL_SERVER'] = 'smtp.gmail.com'
        app.config['MAIL_PORT'] = 587
        app.config['MAIL_USE_TLS'] = True
        app.config['MAIL_USERNAME'] = email_user
        app.config['MAIL_PASSWORD'] = email_pass
        app.config['MAIL_DEFAULT_SENDER'] = email_user
        app.config['MAIL_DEBUG'] = False  # Set to True for more verbose SMTP debugging
        
        try:
            self.mail = Mail(app)
            self.app = app  # Store app reference for context
            print("✅ Email service initialized successfully")
            print(f"   📮 SMTP Server: smtp.gmail.com:587")
            print(f"   ⚠️  Note: Make sure EMAIL_PASS is a Gmail App Password (not your regular password)")
            print(f"   🔗 Get App Password: https://myaccount.google.com/apppasswords")
            
            # Test connection in background (non-blocking)
            self._test_connection_async(app, email_user, email_pass)
        except Exception as e:
            print(f"❌ Error initializing email service: {str(e)}")
            self.mail = None
    
    def _test_connection_async(self, app, email_user, email_pass):
        """Test SMTP connection asynchronously"""
        def test_connection():
            try:
                import smtplib
                print(f"🔍 Testing SMTP connection...")
                print(f"   Server: smtp.gmail.com:587")
                print(f"   User: {email_user}")
                print(f"   Password length: {len(email_pass)} characters")
                
                server = smtplib.SMTP('smtp.gmail.com', 587, timeout=10)
                server.set_debuglevel(0)  # Set to 1 for verbose debugging
                server.starttls()
                server.login(email_user, email_pass)
                server.quit()
                print("✅ SMTP connection test successful!")
                print("   Email service is properly configured and ready to send emails.")
            except smtplib.SMTPAuthenticationError as e:
                error_code = str(e).split()[0] if str(e).split() else "Unknown"
                print(f"❌ SMTP Authentication Failed (Error {error_code})")
                print(f"   Full error: {str(e)}")
                print(f"   💡 This usually means:")
                print(f"      1. The password is incorrect or has extra spaces")
                print(f"      2. You're using a regular password instead of App Password")
                print(f"      3. 2-Step Verification is not enabled on your Google Account")
                print(f"      4. The App Password was revoked or expired")
                print(f"   📝 What to check:")
                print(f"      - Password should be exactly 16 characters (no spaces)")
                print(f"      - Make sure you copied the App Password correctly")
                print(f"      - Verify 2-Step Verification is enabled")
                print(f"   🔗 Generate new App Password: https://myaccount.google.com/apppasswords")
            except smtplib.SMTPException as e:
                print(f"❌ SMTP Error: {str(e)}")
                print(f"   This might be a network or server issue.")
            except Exception as e:
                print(f"⚠️  SMTP connection test failed: {str(e)}")
                print(f"   (This might be a network issue, but emails may still work)")
        
        # Run test in a thread to not block startup
        import threading
        thread = threading.Thread(target=test_connection, daemon=True)
        thread.start()
    
    def test_email_connection(self):
        """Test email connection synchronously (for API endpoint)"""
        if not self.mail:
            return False, "Email service not initialized"
        
        try:
            email_user = os.getenv('EMAIL_USER')
            email_pass = os.getenv('EMAIL_PASS')
            
            if not email_user or not email_pass:
                return False, "Email credentials not configured"
            
            # Clean password
            email_pass = email_pass.strip().replace(' ', '')
            
            import smtplib
            server = smtplib.SMTP('smtp.gmail.com', 587, timeout=10)
            server.starttls()
            server.login(email_user, email_pass)
            server.quit()
            return True, "Connection successful"
        except smtplib.SMTPAuthenticationError as e:
            return False, f"Authentication failed: {str(e)}. Make sure you're using a Gmail App Password."
        except Exception as e:
            return False, f"Connection failed: {str(e)}"
    
    def send_complaint_notification_to_admin(self, complaint_data, pdf_data, admin_email):
        """Send complaint notification to admin with PDF attachment"""
        if not self.mail:
            print("❌ Email service not initialized. Cannot send admin notification.")
            return False
        
        try:
            # Ensure we're in Flask app context
            if hasattr(self, 'app'):
                with self.app.app_context():
                    return self._send_complaint_notification_to_admin_internal(complaint_data, pdf_data, admin_email)
            else:
                return self._send_complaint_notification_to_admin_internal(complaint_data, pdf_data, admin_email)
        except Exception as e:
            error_msg = str(e)
            if "535" in error_msg or "BadCredentials" in error_msg or "Username and Password not accepted" in error_msg:
                print(f"❌ Gmail Authentication Error: Invalid email credentials")
                print(f"   📧 Recipient: {admin_email}")
                print(f"   💡 Solution: Use Gmail App Password instead of regular password")
                print(f"   🔗 Guide: https://support.google.com/accounts/answer/185833")
                print(f"   📝 Steps:")
                print(f"      1. Enable 2-Step Verification on your Google Account")
                print(f"      2. Go to https://myaccount.google.com/apppasswords")
                print(f"      3. Generate an App Password for 'Mail'")
                print(f"      4. Use that 16-character password in EMAIL_PASS environment variable")
            else:
                print(f"❌ Error sending admin notification to {admin_email}: {error_msg}")
            return False
    
    def _send_complaint_notification_to_admin_internal(self, complaint_data, pdf_data, admin_email):
        """Internal method to send complaint notification to admin"""
        try:
            subject = f"New Complaint Submitted - {complaint_data['ticket_id']}"
            
            # HTML email body
            html_body = f"""
            <html>
                <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                    <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                        <h2 style="color: #2c3e50; border-bottom: 2px solid #3498db; padding-bottom: 10px;">
                            New Complaint Submitted
                        </h2>
                        
                        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 5px; margin: 20px 0;">
                            <h3 style="color: #e74c3c; margin-top: 0;">Complaint Details</h3>
                            <table style="width: 100%; border-collapse: collapse;">
                                <tr>
                                    <td style="padding: 8px; font-weight: bold; width: 30%;">Ticket ID:</td>
                                    <td style="padding: 8px;">{complaint_data['ticket_id']}</td>
                                </tr>
                                <tr style="background-color: #ecf0f1;">
                                    <td style="padding: 8px; font-weight: bold;">User:</td>
                                    <td style="padding: 8px;">{complaint_data['user_name']} ({complaint_data['user_email']})</td>
                                </tr>
                                <tr>
                                    <td style="padding: 8px; font-weight: bold;">Title:</td>
                                    <td style="padding: 8px;">{complaint_data['title']}</td>
                                </tr>
                                <tr style="background-color: #ecf0f1;">
                                    <td style="padding: 8px; font-weight: bold;">Category:</td>
                                    <td style="padding: 8px;"><span style="background-color: #3498db; color: white; padding: 2px 8px; border-radius: 3px;">{complaint_data['category']}</span></td>
                                </tr>
                                <tr>
                                    <td style="padding: 8px; font-weight: bold;">Priority:</td>
                                    <td style="padding: 8px;"><span style="background-color: #e74c3c; color: white; padding: 2px 8px; border-radius: 3px;">{complaint_data['priority']}</span></td>
                                </tr>
                                <tr style="background-color: #ecf0f1;">
                                    <td style="padding: 8px; font-weight: bold;">Status:</td>
                                    <td style="padding: 8px;"><span style="background-color: #f39c12; color: white; padding: 2px 8px; border-radius: 3px;">{complaint_data['status']}</span></td>
                                </tr>
                                {f'''<tr>
                                    <td style="padding: 8px; font-weight: bold;">Estimated Completion Time:</td>
                                    <td style="padding: 8px;"><span style="background-color: #9b59b6; color: white; padding: 2px 8px; border-radius: 3px;">{complaint_data.get('estimated_completion_time_formatted', f"{complaint_data.get('estimated_completion_time')} minutes")}</span></td>
                                </tr>''' if complaint_data.get('estimated_completion_time') else ''}
                                <tr>
                                    <td style="padding: 8px; font-weight: bold;">Created:</td>
                                    <td style="padding: 8px;">{complaint_data['created_at']}</td>
                                </tr>
                            </table>
                        </div>
                        
                        <div style="background-color: #fff; padding: 20px; border: 1px solid #ddd; border-radius: 5px;">
                            <h4 style="color: #2c3e50; margin-top: 0;">Description:</h4>
                            <p style="background-color: #f8f9fa; padding: 15px; border-left: 4px solid #3498db; margin: 0;">
                                {complaint_data['description']}
                            </p>
                        </div>
                        
                        {self._get_attachments_html(complaint_data.get('attachments', []))}
                        
                        <div style="margin-top: 30px; padding: 20px; background-color: #2c3e50; color: white; text-align: center; border-radius: 5px;">
                            <p style="margin: 0;">Please find the detailed complaint ticket attached as PDF.</p>
                            <p style="margin: 5px 0 0 0; font-size: 12px; opacity: 0.8;">
                                This is an automated notification from the Complaint Management System.
                            </p>
                        </div>
                    </div>
                </body>
            </html>
            """
            
            # Create message
            msg = Message(
                subject=subject,
                recipients=[admin_email],
                html=html_body
            )
            
            # Attach PDF
            msg.attach(
                filename=f"complaint_{complaint_data['ticket_id']}.pdf",
                content_type="application/pdf",
                data=pdf_data
            )
            
            self.mail.send(msg)
            print(f"✅ Admin notification email sent successfully to {admin_email}")
            return True
        except Exception as e:
            raise e
    
    def send_complaint_confirmation_to_user(self, complaint_data, pdf_data, user_email, assignment_info=None):
        """Send complaint confirmation to user with PDF attachment"""
        if not self.mail:
            print("❌ Email service not initialized. Cannot send user confirmation.")
            return False

        try:
            if hasattr(self, 'app'):
                with self.app.app_context():
                    return self._send_complaint_confirmation_to_user_internal(complaint_data, pdf_data, user_email, assignment_info)
            else:
                return self._send_complaint_confirmation_to_user_internal(complaint_data, pdf_data, user_email, assignment_info)
        except Exception as e:
            error_msg = str(e)
            if "535" in error_msg or "BadCredentials" in error_msg or "Username and Password not accepted" in error_msg:
                print(f"❌ Gmail Authentication Error: Invalid email credentials")
                print(f"   📧 Recipient: {user_email}")
                print(f"   💡 Solution: Use Gmail App Password instead of regular password")
                print(f"   🔗 Guide: https://support.google.com/accounts/answer/185833")
            else:
                print(f"❌ Error sending user confirmation to {user_email}: {error_msg}")
            return False

    def _send_complaint_confirmation_to_user_internal(self, complaint_data, pdf_data, user_email, assignment_info=None):
        """Internal method to send complaint confirmation to user"""
        try:
            subject = f"Complaint Submitted Successfully - {complaint_data['ticket_id']}"

            # Build assignment section HTML — matches the complaint details table style
            if assignment_info:
                staff = assignment_info.get('staff')
                team_members = assignment_info.get('team_members', [])
                sla_row = f'''<tr>
                                    <td style="padding: 8px; font-weight: bold; width: 35%;">Resolution Deadline:</td>
                                    <td style="padding: 8px;">{assignment_info["sla_deadline"]}</td>
                                </tr>''' if assignment_info.get('sla_deadline') else ''

                def member_rows(s, start_alt=False):
                    alt = start_alt
                    rows = ''
                    fields = [
                        ('Name', s['name']),
                        ('Email', f'<a href="mailto:{s["email"]}" style="color: #3498db; text-decoration: none;">{s["email"]}</a>'),
                        ('Phone', s['number']),
                        ('Team', s['team']),
                        ('Expertise', f'<span style="background-color: #3498db; color: white; padding: 2px 8px; border-radius: 3px;">{s["category_expertise"]}</span>'),
                    ]
                    for label, value in fields:
                        bg = ' background-color: #ecf0f1;' if alt else ''
                        rows += f'<tr style="{bg}"><td style="padding: 8px; font-weight: bold; width: 35%;">{label}:</td><td style="padding: 8px;">{value}</td></tr>'
                        alt = not alt
                    return rows

                if staff:
                    assignment_section = f"""
                        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 5px; margin: 20px 0;">
                            <h3 style="color: #2c3e50; margin-top: 0;">👤 Assigned Staff Member</h3>
                            <table style="width: 100%; border-collapse: collapse;">
                                {member_rows(staff)}
                                {sla_row}
                            </table>
                        </div>
                    """
                elif team_members:
                    members_html = ''
                    for i, m in enumerate(team_members):
                        sep = '<tr><td colspan="2" style="padding: 4px 0;"></td></tr>' if i > 0 else ''
                        members_html += sep + member_rows(m, start_alt=(i % 2 == 0))
                    assignment_section = f"""
                        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 5px; margin: 20px 0;">
                            <h3 style="color: #2c3e50; margin-top: 0;">👥 Assigned Team — {assignment_info['team']}</h3>
                            <p style="color: #555; font-size: 13px; margin: 0 0 12px 0;">
                                Your complaint has been assigned to the <strong>{assignment_info['category']}</strong> team.
                                A member will pick it up shortly. You may contact any of them directly:
                            </p>
                            <table style="width: 100%; border-collapse: collapse;">
                                {members_html}
                                {sla_row}
                            </table>
                        </div>
                    """
                else:
                    assignment_section = f"""
                        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 5px; margin: 20px 0;">
                            <h3 style="color: #2c3e50; margin-top: 0;">👥 Team Assignment</h3>
                            <table style="width: 100%; border-collapse: collapse;">
                                <tr>
                                    <td style="padding: 8px; font-weight: bold; width: 35%;">Assigned Team:</td>
                                    <td style="padding: 8px;"><span style="background-color: #3498db; color: white; padding: 2px 8px; border-radius: 3px;">{assignment_info['team']}</span></td>
                                </tr>
                                <tr style="background-color: #ecf0f1;">
                                    <td style="padding: 8px; font-weight: bold;">Category:</td>
                                    <td style="padding: 8px;">{assignment_info['category']}</td>
                                </tr>
                                {sla_row}
                            </table>
                        </div>
                    """
            else:
                assignment_section = ""

            html_body = f"""
            <html>
                <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                    <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                        <h2 style="color: #27ae60; border-bottom: 2px solid #27ae60; padding-bottom: 10px;">
                            Complaint Submitted Successfully
                        </h2>

                        <div style="background-color: #d5f4e6; padding: 20px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #27ae60;">
                            <h3 style="color: #155724; margin-top: 0;">✅ Your complaint has been received!</h3>
                            <p style="margin: 0;">
                                Thank you for submitting your complaint. We have received your request and our team will review it shortly.
                            </p>
                        </div>

                        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 5px; margin: 20px 0;">
                            <h3 style="color: #2c3e50; margin-top: 0;">Your Complaint Details</h3>
                            <table style="width: 100%; border-collapse: collapse;">
                                <tr>
                                    <td style="padding: 8px; font-weight: bold; width: 35%;">Ticket ID:</td>
                                    <td style="padding: 8px; font-family: monospace; background-color: #e9ecef; border-radius: 3px;">{complaint_data['ticket_id']}</td>
                                </tr>
                                <tr style="background-color: #ecf0f1;">
                                    <td style="padding: 8px; font-weight: bold;">Title:</td>
                                    <td style="padding: 8px;">{complaint_data['title']}</td>
                                </tr>
                                <tr>
                                    <td style="padding: 8px; font-weight: bold;">Category:</td>
                                    <td style="padding: 8px;"><span style="background-color: #3498db; color: white; padding: 2px 8px; border-radius: 3px;">{complaint_data['category']}</span></td>
                                </tr>
                                <tr style="background-color: #ecf0f1;">
                                    <td style="padding: 8px; font-weight: bold;">Priority:</td>
                                    <td style="padding: 8px;"><span style="background-color: #e74c3c; color: white; padding: 2px 8px; border-radius: 3px;">{complaint_data['priority']}</span></td>
                                </tr>
                                <tr>
                                    <td style="padding: 8px; font-weight: bold;">Status:</td>
                                    <td style="padding: 8px;"><span style="background-color: #f39c12; color: white; padding: 2px 8px; border-radius: 3px;">{complaint_data['status']}</span></td>
                                </tr>
                                {f'''<tr style="background-color: #ecf0f1;">
                                    <td style="padding: 8px; font-weight: bold;">Est. Completion:</td>
                                    <td style="padding: 8px;"><span style="background-color: #9b59b6; color: white; padding: 2px 8px; border-radius: 3px;">{complaint_data.get('estimated_completion_time_formatted', f"{complaint_data.get('estimated_completion_time')} minutes")}</span></td>
                                </tr>''' if complaint_data.get('estimated_completion_time') else ''}
                                <tr style="background-color: #ecf0f1;">
                                    <td style="padding: 8px; font-weight: bold;">Submitted:</td>
                                    <td style="padding: 8px;">{complaint_data['created_at']}</td>
                                </tr>
                            </table>
                        </div>

                        {assignment_section}

                        <div style="background-color: #fff3cd; padding: 20px; border-radius: 5px; border-left: 4px solid #ffc107;">
                            <h4 style="color: #856404; margin-top: 0;">📋 What happens next?</h4>
                            <ul style="color: #856404; margin: 0; padding-left: 20px;">
                                <li>Our support team will work on your complaint</li>
                                <li>You will receive email updates at every stage</li>
                                <li>Use Ticket ID <strong>{complaint_data['ticket_id']}</strong> for any follow-ups</li>
                            </ul>
                        </div>

                        {self._get_attachments_html(complaint_data.get('attachments', []))}

                        <div style="margin-top: 30px; padding: 20px; background-color: #2c3e50; color: white; text-align: center; border-radius: 5px;">
                            <p style="margin: 0;">A detailed copy of your complaint ticket is attached to this email.</p>
                            <p style="margin: 10px 0 0 0; font-size: 12px; opacity: 0.8;">
                                Please keep this email for your records.
                            </p>
                        </div>
                    </div>
                </body>
            </html>
            """

            msg = Message(
                subject=subject,
                recipients=[user_email],
                html=html_body
            )
            msg.attach(
                filename=f"complaint_{complaint_data['ticket_id']}.pdf",
                content_type="application/pdf",
                data=pdf_data
            )

            self.mail.send(msg)
            print(f"✅ User confirmation email sent successfully to {user_email}")
            return True
        except Exception as e:
            raise e
    
    def send_complaint_update_notification(self, complaint_data, pdf_data, user_email, update_message):
        """Send complaint update notification to user"""
        if not self.mail:
            print("❌ Email service not initialized. Cannot send update notification.")
            return False
        
        try:
            # Ensure we're in Flask app context
            if hasattr(self, 'app'):
                with self.app.app_context():
                    return self._send_complaint_update_notification_internal(complaint_data, pdf_data, user_email, update_message)
            else:
                return self._send_complaint_update_notification_internal(complaint_data, pdf_data, user_email, update_message)
        except Exception as e:
            error_msg = str(e)
            if "535" in error_msg or "BadCredentials" in error_msg or "Username and Password not accepted" in error_msg:
                print(f"❌ Gmail Authentication Error: Invalid email credentials")
                print(f"   📧 Recipient: {user_email}")
                print(f"   💡 Solution: Use Gmail App Password instead of regular password")
                print(f"   🔗 Guide: https://support.google.com/accounts/answer/185833")
            else:
                print(f"❌ Error sending update notification to {user_email}: {error_msg}")
            return False
    
    def _send_complaint_update_notification_internal(self, complaint_data, pdf_data, user_email, update_message):
        """Internal method to send complaint update notification"""
        try:
            subject = f"Complaint Update - {complaint_data['ticket_id']}"
            
            # HTML email body
            html_body = f"""
            <html>
                <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                    <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                        <h2 style="color: #3498db; border-bottom: 2px solid #3498db; padding-bottom: 10px;">
                            Complaint Status Update
                        </h2>
                        
                        <div style="background-color: #d1ecf1; padding: 20px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #3498db;">
                            <h3 style="color: #0c5460; margin-top: 0;">📢 Update on your complaint</h3>
                            <p style="margin: 0;">
                                There has been an update to your complaint <strong>{complaint_data['ticket_id']}</strong>.
                            </p>
                        </div>
                        
                        <div style="background-color: #fff; padding: 20px; border: 1px solid #ddd; border-radius: 5px;">
                            <h4 style="color: #2c3e50; margin-top: 0;">Update Message:</h4>
                            <p style="background-color: #f8f9fa; padding: 15px; border-left: 4px solid #3498db; margin: 0;">
                                {update_message}
                            </p>
                        </div>
                        
                        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 5px; margin: 20px 0;">
                            <h3 style="color: #2c3e50; margin-top: 0;">Current Status</h3>
                            <table style="width: 100%; border-collapse: collapse;">
                                <tr>
                                    <td style="padding: 8px; font-weight: bold; width: 30%;">Ticket ID:</td>
                                    <td style="padding: 8px; font-family: monospace; background-color: #e9ecef; border-radius: 3px;">{complaint_data['ticket_id']}</td>
                                </tr>
                                <tr style="background-color: #ecf0f1;">
                                    <td style="padding: 8px; font-weight: bold;">Status:</td>
                                    <td style="padding: 8px;"><span style="background-color: #28a745; color: white; padding: 2px 8px; border-radius: 3px;">{complaint_data['status']}</span></td>
                                </tr>
                                <tr>
                                    <td style="padding: 8px; font-weight: bold;">Last Updated:</td>
                                    <td style="padding: 8px;">{complaint_data['updated_at']}</td>
                                </tr>
                            </table>
                        </div>
                        
                        <div style="margin-top: 30px; padding: 20px; background-color: #2c3e50; color: white; text-align: center; border-radius: 5px;">
                            <p style="margin: 0;">Updated complaint details are attached as PDF.</p>
                            <p style="margin: 5px 0 0 0; font-size: 12px; opacity: 0.8;">
                                Thank you for your patience.
                            </p>
                        </div>
                    </div>
                </body>
            </html>
            """
            
            # Create message
            msg = Message(
                subject=subject,
                recipients=[user_email],
                html=html_body
            )
            
            # Attach PDF
            msg.attach(
                filename=f"complaint_{complaint_data['ticket_id']}_updated.pdf",
                content_type="application/pdf",
                data=pdf_data
            )
            
            self.mail.send(msg)
            print(f"✅ Update notification email sent successfully to {user_email}")
            return True
        except Exception as e:
            raise e
    
    def send_welcome_email(self, recipient_email, recipient_name, user_type, role=None):
        """Send welcome email to new users/admins"""
        if not self.mail:
            error_msg = "Email service not initialized. Flask-Mail instance is None."
            print(f"❌ {error_msg}")
            return False, error_msg
        
        try:
            # Ensure we're in Flask app context
            if hasattr(self, 'app'):
                with self.app.app_context():
                    return self._send_welcome_email_internal(recipient_email, recipient_name, user_type, role)
            else:
                return self._send_welcome_email_internal(recipient_email, recipient_name, user_type, role)
        except Exception as e:
            error_msg = str(e)
            if "535" in error_msg or "BadCredentials" in error_msg or "Username and Password not accepted" in error_msg:
                detailed_error = "Gmail Authentication Error: Invalid email credentials. Use Gmail App Password instead of regular password. See: https://support.google.com/accounts/answer/185833"
                print(f"❌ Gmail Authentication Error when sending welcome email to {recipient_email}")
                print(f"   💡 Solution: Use Gmail App Password instead of regular password")
                print(f"   🔗 Guide: https://support.google.com/accounts/answer/185833")
                print(f"   📝 Steps:")
                print(f"      1. Enable 2-Step Verification on your Google Account")
                print(f"      2. Go to https://myaccount.google.com/apppasswords")
                print(f"      3. Generate an App Password for 'Mail'")
                print(f"      4. Use that 16-character password in EMAIL_PASS environment variable")
                return False, detailed_error
            else:
                print(f"❌ Error sending welcome email to {recipient_email}: {error_msg}")
                return False, f"Error sending welcome email: {error_msg}"
    
    def _send_welcome_email_internal(self, recipient_email, recipient_name, user_type, role=None):
        """Internal method to send welcome email"""
        try:
            if user_type == "admin":
                subject = "Welcome to CMS - Admin Account Created"
                html_body = f"""
                <html>
                    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                            <h2 style="color: #2c3e50; border-bottom: 2px solid #e74c3c; padding-bottom: 10px;">
                                Welcome to Complaint Management System
                            </h2>
                            
                            <div style="background-color: #f8d7da; padding: 20px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #e74c3c;">
                                <h3 style="color: #721c24; margin-top: 0;">🛡️ Admin Account Created</h3>
                                <p style="margin: 0;">
                                    Hello <strong>{recipient_name}</strong>, your admin account has been successfully created.
                                </p>
                            </div>
                            
                            <div style="background-color: #f8f9fa; padding: 20px; border-radius: 5px;">
                                <h4 style="color: #2c3e50; margin-top: 0;">Admin Responsibilities:</h4>
                                <ul style="margin: 0; padding-left: 20px;">
                                    <li>Review and manage user complaints</li>
                                    <li>Update complaint status and provide responses</li>
                                    <li>Monitor system statistics and performance</li>
                                    <li>Ensure timely resolution of issues</li>
                                </ul>
                            </div>
                            
                            <div style="margin-top: 30px; padding: 20px; background-color: #2c3e50; color: white; text-align: center; border-radius: 5px;">
                                <p style="margin: 0;">You can now log in to the admin panel and start managing complaints.</p>
                            </div>
                        </div>
                    </body>
                </html>
                """
            else:
                subject = "Welcome to CMS - Account Created"
                role_display = role.title() if role else "User"
                html_body = f"""
                <html>
                    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                            <h2 style="color: #2c3e50; border-bottom: 2px solid #27ae60; padding-bottom: 10px;">
                                Welcome to Complaint Management System
                            </h2>
                            
                            <div style="background-color: #d5f4e6; padding: 20px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #27ae60;">
                                <h3 style="color: #155724; margin-top: 0;">🎉 Account Created Successfully</h3>
                                <p style="margin: 0;">
                                    Hello <strong>{recipient_name}</strong>, welcome to our Complaint Management System! Your {role_display} account has been created.
                                </p>
                            </div>
                            
                            <div style="background-color: #f8f9fa; padding: 20px; border-radius: 5px;">
                                <h4 style="color: #2c3e50; margin-top: 0;">What you can do:</h4>
                                <ul style="margin: 0; padding-left: 20px;">
                                    <li>Submit complaints with detailed descriptions</li>
                                    <li>Upload supporting documents and images</li>
                                    <li>Track the status of your complaints</li>
                                    <li>Receive email updates on progress</li>
                                    <li>Download complaint tickets as PDF</li>
                                </ul>
                            </div>
                            
                            <div style="background-color: #fff3cd; padding: 20px; border-radius: 5px; border-left: 4px solid #ffc107; margin: 20px 0;">
                                <h4 style="color: #856404; margin-top: 0;">📋 Getting Started:</h4>
                                <p style="color: #856404; margin: 0;">
                                    Log in to your account and start submitting complaints. Our team is here to help resolve your issues quickly and efficiently.
                                </p>
                            </div>
                            
                            <div style="margin-top: 30px; padding: 20px; background-color: #2c3e50; color: white; text-align: center; border-radius: 5px;">
                                <p style="margin: 0;">Thank you for joining our platform!</p>
                            </div>
                        </div>
                    </body>
                </html>
                """
            
            # Create message
            msg = Message(
                subject=subject,
                recipients=[recipient_email],
                html=html_body
            )
            
            self.mail.send(msg)
            print(f"✅ Welcome email sent successfully to {recipient_email}")
            return True, "Welcome email sent successfully"
        except Exception as e:
            raise e

    def _get_attachments_html(self, attachments):
        """Generate HTML for attachments section"""
        if not attachments:
            return ""
        
        html = """
        <div style="background-color: #fff; padding: 20px; border: 1px solid #ddd; border-radius: 5px; margin-top: 20px;">
            <h4 style="color: #2c3e50; margin-top: 0;">Attachments:</h4>
            <ul style="margin: 0; padding-left: 20px;">
        """
        
        for attachment in attachments:
            html += f"""
                <li style="margin-bottom: 5px;">
                    <a href="{attachment['file_url']}" style="color: #3498db; text-decoration: none;">
                        📎 {attachment['original_filename']}
                    </a>
                    <span style="color: #7f8c8d; font-size: 12px; margin-left: 10px;">
                        ({attachment['file_type']}, {self._format_file_size(attachment['file_size'])})
                    </span>
                </li>
            """
        
        html += """
            </ul>
        </div>
        """
        return html
    
    def _format_file_size(self, size_bytes):
        """Format file size in human readable format"""
        if size_bytes == 0:
            return "0B"
        size_names = ["B", "KB", "MB", "GB"]
        i = 0
        while size_bytes >= 1024 and i < len(size_names) - 1:
            size_bytes /= 1024.0
            i += 1
        return f"{size_bytes:.1f}{size_names[i]}"
    
    def send_feedback_notification(self, complaint, feedback):
        """Send feedback notification to admin"""
        if not self.mail:
            print("❌ Email service not initialized. Cannot send feedback notification.")
            return False, "Email service not initialized"
        
        try:
            # Ensure we're in Flask app context
            if hasattr(self, 'app'):
                with self.app.app_context():
                    return self._send_feedback_notification_internal(complaint, feedback)
            else:
                return self._send_feedback_notification_internal(complaint, feedback)
        except Exception as e:
            error_msg = str(e)
            if "535" in error_msg or "BadCredentials" in error_msg or "Username and Password not accepted" in error_msg:
                detailed_error = "Gmail Authentication Error: Invalid email credentials. Use Gmail App Password instead of regular password."
                print(f"❌ Gmail Authentication Error when sending feedback notification")
                print(f"   💡 Solution: Use Gmail App Password instead of regular password")
                print(f"   🔗 Guide: https://support.google.com/accounts/answer/185833")
                return False, detailed_error
            else:
                print(f"❌ Error sending feedback notification: {error_msg}")
                return False, f"Failed to send feedback notification: {error_msg}"
    
    def _send_feedback_notification_internal(self, complaint, feedback):
        """Internal method to send feedback notification"""
        try:
            subject = f"Feedback Received - {complaint.ticket_id}"
            
            # Generate star rating HTML
            stars_html = ""
            for i in range(1, 6):
                if i <= feedback.rating:
                    stars_html += "⭐"
                else:
                    stars_html += "☆"
            
            # HTML email body
            html_body = f"""
            <html>
                <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                    <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                        <h2 style="color: #2c3e50; border-bottom: 2px solid #3498db; padding-bottom: 10px;">
                            Feedback Received
                        </h2>
                        
                        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 5px; margin: 20px 0;">
                            <h3 style="color: #27ae60; margin-top: 0;">Complaint Details</h3>
                            <table style="width: 100%; border-collapse: collapse;">
                                <tr>
                                    <td style="padding: 8px; font-weight: bold; width: 30%;">Ticket ID:</td>
                                    <td style="padding: 8px;">{complaint.ticket_id}</td>
                                </tr>
                                <tr style="background-color: #ecf0f1;">
                                    <td style="padding: 8px; font-weight: bold;">User:</td>
                                    <td style="padding: 8px;">{complaint.user.name} ({complaint.user.email})</td>
                                </tr>
                                <tr>
                                    <td style="padding: 8px; font-weight: bold;">Title:</td>
                                    <td style="padding: 8px;">{complaint.title}</td>
                                </tr>
                                <tr style="background-color: #ecf0f1;">
                                    <td style="padding: 8px; font-weight: bold;">Category:</td>
                                    <td style="padding: 8px;"><span style="background-color: #3498db; color: white; padding: 2px 8px; border-radius: 3px;">{complaint.category.value}</span></td>
                                </tr>
                                <tr>
                                    <td style="padding: 8px; font-weight: bold;">Status:</td>
                                    <td style="padding: 8px;"><span style="background-color: #27ae60; color: white; padding: 2px 8px; border-radius: 3px;">{complaint.status.value}</span></td>
                                </tr>
                            </table>
                        </div>
                        
                        <div style="background-color: #fff; padding: 20px; border: 1px solid #ddd; border-radius: 5px; margin: 20px 0;">
                            <h4 style="color: #2c3e50; margin-top: 0;">User Feedback</h4>
                            <div style="text-align: center; margin: 20px 0;">
                                <div style="font-size: 24px; margin-bottom: 10px;">
                                    {stars_html}
                                </div>
                                <div style="font-size: 18px; font-weight: bold; color: #2c3e50;">
                                    {feedback.rating}/5 Stars
                                </div>
                            </div>
                            {f'<p style="background-color: #f8f9fa; padding: 15px; border-left: 4px solid #3498db; margin: 0;"><strong>Comment:</strong> {feedback.feedback_text}</p>' if feedback.feedback_text else ''}
                        </div>
                        
                        <div style="margin-top: 30px; padding: 20px; background-color: #2c3e50; color: white; text-align: center; border-radius: 5px;">
                            <p style="margin: 0;">Thank you for your service! This feedback helps improve our complaint resolution process.</p>
                            <p style="margin: 5px 0 0 0; font-size: 12px; opacity: 0.8;">
                                This is an automated notification from the Complaint Management System.
                            </p>
                        </div>
                    </div>
                </body>
            </html>
            """
            
            # Get admin email from environment or use default
            admin_email = os.getenv('ADMIN_EMAIL', os.getenv('EMAIL_USER'))
            
            # Create message
            msg = Message(
                subject=subject,
                recipients=[admin_email],
                html=html_body
            )
            
            # Send email
            self.mail.send(msg)
            print(f"✅ Feedback notification email sent successfully to {admin_email}")
            return True, "Feedback notification sent successfully"
        except Exception as e:
            raise e

    def send_assignment_notification_to_user(self, complaint_data, staff_data, user_email):
        """Send notification to user when complaint is assigned to a staff member (in_progress)"""
        if not self.mail:
            print("❌ Email service not initialized. Cannot send assignment notification.")
            return False

        try:
            if hasattr(self, 'app'):
                with self.app.app_context():
                    return self._send_assignment_notification_internal(complaint_data, staff_data, user_email)
            else:
                return self._send_assignment_notification_internal(complaint_data, staff_data, user_email)
        except Exception as e:
            print(f"❌ Error sending assignment notification to {user_email}: {str(e)}")
            return False

    def _send_assignment_notification_internal(self, complaint_data, staff_data, user_email):
        """Internal method to send assignment notification to user"""
        try:
            subject = f"Your Complaint is Being Worked On - {complaint_data['ticket_id']}"

            staff_section = ""
            if staff_data:
                staff_section = f"""
                        <div style="background-color: #eaf4fb; padding: 20px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #2980b9;">
                            <h3 style="color: #1a5276; margin-top: 0;">👤 Assigned Staff Member</h3>
                            <table style="width: 100%; border-collapse: collapse;">
                                <tr>
                                    <td style="padding: 8px; font-weight: bold; width: 30%;">Name:</td>
                                    <td style="padding: 8px;">{staff_data.get('name', '—')}</td>
                                </tr>
                                <tr style="background-color: #d6eaf8;">
                                    <td style="padding: 8px; font-weight: bold;">Email:</td>
                                    <td style="padding: 8px;">{staff_data.get('email', '—')}</td>
                                </tr>
                                <tr>
                                    <td style="padding: 8px; font-weight: bold;">Team:</td>
                                    <td style="padding: 8px;">{staff_data.get('team', '—')}</td>
                                </tr>
                                <tr style="background-color: #d6eaf8;">
                                    <td style="padding: 8px; font-weight: bold;">Expertise:</td>
                                    <td style="padding: 8px;"><span style="background-color: #2980b9; color: white; padding: 2px 8px; border-radius: 3px;">{staff_data.get('category_expertise', '—')}</span></td>
                                </tr>
                                <tr>
                                    <td style="padding: 8px; font-weight: bold;">Contact:</td>
                                    <td style="padding: 8px;">{staff_data.get('number', '—')}</td>
                                </tr>
                            </table>
                        </div>
                """
            else:
                staff_section = """
                        <div style="background-color: #eaf4fb; padding: 20px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #2980b9;">
                            <h3 style="color: #1a5276; margin-top: 0;">👥 Team Assignment</h3>
                            <p style="margin: 0; color: #1a5276;">Your complaint has been assigned to our support team and is currently being worked on.</p>
                        </div>
                """

            html_body = f"""
            <html>
                <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                    <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                        <h2 style="color: #2980b9; border-bottom: 2px solid #2980b9; padding-bottom: 10px;">
                            Your Complaint is Now In Progress
                        </h2>

                        <div style="background-color: #d6eaf8; padding: 20px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #2980b9;">
                            <h3 style="color: #1a5276; margin-top: 0;">🔄 Work has started on your complaint!</h3>
                            <p style="margin: 0;">
                                Good news! Your complaint <strong>{complaint_data['ticket_id']}</strong> has been picked up and is actively being worked on.
                            </p>
                        </div>

                        {staff_section}

                        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 5px; margin: 20px 0;">
                            <h3 style="color: #2c3e50; margin-top: 0;">Complaint Details</h3>
                            <table style="width: 100%; border-collapse: collapse;">
                                <tr>
                                    <td style="padding: 8px; font-weight: bold; width: 30%;">Ticket ID:</td>
                                    <td style="padding: 8px; font-family: monospace; background-color: #e9ecef; border-radius: 3px;">{complaint_data['ticket_id']}</td>
                                </tr>
                                <tr style="background-color: #ecf0f1;">
                                    <td style="padding: 8px; font-weight: bold;">Title:</td>
                                    <td style="padding: 8px;">{complaint_data['title']}</td>
                                </tr>
                                <tr>
                                    <td style="padding: 8px; font-weight: bold;">Category:</td>
                                    <td style="padding: 8px;"><span style="background-color: #3498db; color: white; padding: 2px 8px; border-radius: 3px;">{complaint_data['category']}</span></td>
                                </tr>
                                <tr style="background-color: #ecf0f1;">
                                    <td style="padding: 8px; font-weight: bold;">Priority:</td>
                                    <td style="padding: 8px;"><span style="background-color: #e74c3c; color: white; padding: 2px 8px; border-radius: 3px;">{complaint_data['priority']}</span></td>
                                </tr>
                                <tr>
                                    <td style="padding: 8px; font-weight: bold;">Status:</td>
                                    <td style="padding: 8px;"><span style="background-color: #2980b9; color: white; padding: 2px 8px; border-radius: 3px;">In Progress</span></td>
                                </tr>
                            </table>
                        </div>

                        <div style="margin-top: 30px; padding: 20px; background-color: #2c3e50; color: white; text-align: center; border-radius: 5px;">
                            <p style="margin: 0;">You will be notified once your complaint is resolved.</p>
                            <p style="margin: 5px 0 0 0; font-size: 12px; opacity: 0.8;">
                                Thank you for your patience — Complaint Management System
                            </p>
                        </div>
                    </div>
                </body>
            </html>
            """

            msg = Message(
                subject=subject,
                recipients=[user_email],
                html=html_body
            )

            self.mail.send(msg)
            print(f"✅ Assignment notification sent to {user_email}")
            return True
        except Exception as e:
            raise e

    def send_staff_assigned_notification(self, complaint_data, staff_data, user_email):
        """Send notification to user when a staff member self-assigns their complaint"""
        if not self.mail:
            print("❌ Email service not initialized.")
            return False
        try:
            if hasattr(self, 'app'):
                with self.app.app_context():
                    return self._send_staff_assigned_notification_internal(complaint_data, staff_data, user_email)
            else:
                return self._send_staff_assigned_notification_internal(complaint_data, staff_data, user_email)
        except Exception as e:
            print(f"❌ Error sending staff assignment notification to {user_email}: {str(e)}")
            return False

    def _send_staff_assigned_notification_internal(self, complaint_data, staff_data, user_email):
        try:
            subject = f"Staff Assigned to Your Complaint - {complaint_data['ticket_id']}"

            html_body = f"""
            <html>
                <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                    <div style="max-width: 600px; margin: 0 auto; padding: 20px;">

                        <h2 style="color: #2980b9; border-bottom: 2px solid #2980b9; padding-bottom: 10px;">
                            A Staff Member Has Been Assigned to Your Complaint
                        </h2>

                        <div style="background-color: #d6eaf8; padding: 20px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #2980b9;">
                            <h3 style="color: #1a5276; margin-top: 0;">🙋 Someone is now working on your issue!</h3>
                            <p style="margin: 0;">
                                A staff member has picked up your complaint <strong>{complaint_data['ticket_id']}</strong>
                                and will be working on it directly. Here are their details:
                            </p>
                        </div>

                        <!-- Staff Details -->
                        <div style="background-color: #eaf4fb; padding: 20px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #1a5276;">
                            <h3 style="color: #1a5276; margin-top: 0;">👤 Your Assigned Staff Member</h3>
                            <table style="width: 100%; border-collapse: collapse;">
                                <tr>
                                    <td style="padding: 10px 8px; font-weight: bold; width: 35%; color: #555;">Name</td>
                                    <td style="padding: 10px 8px; font-size: 15px; font-weight: 600; color: #1a1a1a;">{staff_data['name']}</td>
                                </tr>
                                <tr style="background-color: #d6eaf8;">
                                    <td style="padding: 10px 8px; font-weight: bold; color: #555;">Email</td>
                                    <td style="padding: 10px 8px;">
                                        <a href="mailto:{staff_data['email']}" style="color: #2980b9; text-decoration: none;">{staff_data['email']}</a>
                                    </td>
                                </tr>
                                <tr>
                                    <td style="padding: 10px 8px; font-weight: bold; color: #555;">Phone</td>
                                    <td style="padding: 10px 8px;">{staff_data['number']}</td>
                                </tr>
                                <tr style="background-color: #d6eaf8;">
                                    <td style="padding: 10px 8px; font-weight: bold; color: #555;">Team</td>
                                    <td style="padding: 10px 8px;">{staff_data['team']}</td>
                                </tr>
                                <tr>
                                    <td style="padding: 10px 8px; font-weight: bold; color: #555;">Expertise</td>
                                    <td style="padding: 10px 8px;">
                                        <span style="background-color: #2980b9; color: white; padding: 3px 10px; border-radius: 12px; font-size: 13px;">
                                            {staff_data['category_expertise']}
                                        </span>
                                    </td>
                                </tr>
                            </table>
                        </div>

                        <!-- Complaint Summary -->
                        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 5px; margin: 20px 0;">
                            <h3 style="color: #2c3e50; margin-top: 0;">📋 Complaint Summary</h3>
                            <table style="width: 100%; border-collapse: collapse;">
                                <tr>
                                    <td style="padding: 8px; font-weight: bold; width: 35%;">Ticket ID</td>
                                    <td style="padding: 8px; font-family: monospace; background-color: #e9ecef; border-radius: 3px;">{complaint_data['ticket_id']}</td>
                                </tr>
                                <tr style="background-color: #ecf0f1;">
                                    <td style="padding: 8px; font-weight: bold;">Title</td>
                                    <td style="padding: 8px;">{complaint_data['title']}</td>
                                </tr>
                                <tr>
                                    <td style="padding: 8px; font-weight: bold;">Category</td>
                                    <td style="padding: 8px;">
                                        <span style="background-color: #3498db; color: white; padding: 2px 8px; border-radius: 3px;">{complaint_data['category']}</span>
                                    </td>
                                </tr>
                                <tr style="background-color: #ecf0f1;">
                                    <td style="padding: 8px; font-weight: bold;">Priority</td>
                                    <td style="padding: 8px;">
                                        <span style="background-color: #e74c3c; color: white; padding: 2px 8px; border-radius: 3px;">{complaint_data['priority']}</span>
                                    </td>
                                </tr>
                                <tr>
                                    <td style="padding: 8px; font-weight: bold;">Status</td>
                                    <td style="padding: 8px;">
                                        <span style="background-color: #2980b9; color: white; padding: 2px 8px; border-radius: 3px;">In Progress</span>
                                    </td>
                                </tr>
                            </table>
                        </div>

                        <div style="background-color: #fff3cd; padding: 15px 20px; border-radius: 5px; border-left: 4px solid #ffc107; margin: 20px 0;">
                            <p style="margin: 0; color: #856404; font-size: 13px;">
                                💡 You can reach out to your assigned staff member directly using the contact details above
                                if you have any additional information to share.
                            </p>
                        </div>

                        <div style="margin-top: 30px; padding: 20px; background-color: #2c3e50; color: white; text-align: center; border-radius: 5px;">
                            <p style="margin: 0;">You will receive another update once your complaint is resolved.</p>
                            <p style="margin: 8px 0 0 0; font-size: 12px; opacity: 0.7;">
                                Complaint Management System — automated notification
                            </p>
                        </div>

                    </div>
                </body>
            </html>
            """

            msg = Message(
                subject=subject,
                recipients=[user_email],
                html=html_body
            )
            self.mail.send(msg)
            print(f"✅ Staff assignment notification sent to {user_email}")
            return True
        except Exception as e:
            raise e

# Global email service instance
email_service = EmailService()