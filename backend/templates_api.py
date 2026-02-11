from flask import Blueprint, request, jsonify
from database import get_session, Template, Interview
import uuid
from datetime import datetime
import logging
from utils import make_mime_html_base64 # Assuming this util exists or we use smtplib direct
import smtplib
import ssl
import json
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from config import Config

templates_bp = Blueprint('templates', __name__)
logger = logging.getLogger(__name__)

# ... existing template CRUD ...
@templates_bp.route('/api/templates', methods=['GET'])
def get_templates():
    session = get_session()
    try:
        templates = session.query(Template).all()
        return jsonify({'templates': [t.to_dict() for t in templates]}), 200
    except Exception as e:
        logger.error(f"Error fetching templates: {str(e)}")
        return jsonify({'error': str(e)}), 500
    finally:
        session.close()

@templates_bp.route('/api/templates', methods=['POST'])
def create_template():
    session = get_session()
    try:
        data = request.json
        if not data.get('name') or not data.get('subject') or not data.get('html_content'):
            return jsonify({'error': 'Name, subject, and content are required'}), 400

        # Generate custom ID or use provided if system template (though system templates usually seeded)
        template_id = data.get('id') or str(uuid.uuid4())
        
        # Check if ID exists
        existing = session.query(Template).filter_by(id=template_id).first()
        if existing:
             return jsonify({'error': 'Template ID already exists'}), 400

        new_template = Template(
            id=template_id,
            name=data['name'],
            subject=data['subject'],
            html_content=data['html_content'],
            plain_content=data.get('plain_content', ''), # Optional, or strip HTML
            variables=json.dumps(data.get('variables', [])), # JSON string
            is_system=data.get('is_system', False)
        )
        
        session.add(new_template)
        session.commit()
        return jsonify({'success': True, 'template': new_template.to_dict()}), 201

    except Exception as e:
        logger.error(f"Error creating template: {str(e)}")
        session.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        session.close()

@templates_bp.route('/api/templates/<template_id>', methods=['GET'])
def get_template(template_id):
    session = get_session()
    try:
        template = session.query(Template).filter_by(id=template_id).first()
        if not template:
            return jsonify({'error': 'Template not found'}), 404
        return jsonify({'template': template.to_dict()}), 200
    except Exception as e:
        logger.error(f"Error fetching template {template_id}: {str(e)}")
        return jsonify({'error': str(e)}), 500
    finally:
        session.close()

@templates_bp.route('/api/templates/<template_id>', methods=['PUT'])
def update_template(template_id):
    session = get_session()
    try:
        template = session.query(Template).filter_by(id=template_id).first()
        if not template:
            return jsonify({'error': 'Template not found'}), 404

        data = request.json
        if 'name' in data: template.name = data['name']
        if 'subject' in data: template.subject = data['subject']
        if 'html_content' in data: template.html_content = data['html_content']
        if 'plain_content' in data: template.plain_content = data['plain_content']
        if 'variables' in data: template.variables = json.dumps(data['variables'])
        
        template.updated_at = datetime.utcnow()
        
        session.commit()
        return jsonify({'success': True, 'template': template.to_dict()}), 200

    except Exception as e:
        logger.error(f"Error updating template {template_id}: {str(e)}")
        session.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        session.close()

@templates_bp.route('/api/templates/<template_id>', methods=['DELETE'])
def delete_template(template_id):
    session = get_session()
    try:
        template = session.query(Template).filter_by(id=template_id).first()
        if not template:
            return jsonify({'error': 'Template not found'}), 404
            
        if template.is_system:
            return jsonify({'error': 'Cannot delete system templates'}), 403

        session.delete(template)
        session.commit()
        return jsonify({'success': True, 'message': 'Template deleted'}), 200

    except Exception as e:
        logger.error(f"Error deleting template {template_id}: {str(e)}")
        session.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        session.close()


@templates_bp.route('/api/send-custom-email', methods=['POST'])
def send_custom_email():
    """Send a one-off email (e.g., from Scheduler)"""
    data = request.json
    recipient_email = data.get('recipient_email')
    recipient_name = data.get('recipient_name')
    subject = data.get('subject')
    html_content = data.get('html_content')
    interview_id = data.get('interview_id')

    if not recipient_email or not subject or not html_content:
        return jsonify({'error': 'Missing required fields'}), 400

    # SMTP Send
    try:
        sender_email = Config.ADMIN_EMAIL or "noreply@example.com" # Should use configured sender
        password = Config.EMAIL_PASSWORD

        if not password:
             return jsonify({'error': 'SMTP not configured'}), 500

        msg = MIMEMultipart('alternative')
        msg['Subject'] = subject
        msg['From'] = f"Recruitment Team <{sender_email}>"
        msg['To'] = recipient_email

        # Attach parts
        part1 = MIMEText(html_content, 'html')
        msg.attach(part1)

        context = ssl.create_default_context()
        with smtplib.SMTP_SSL(Config.SMTP_SERVER, Config.SMTP_PORT, context=context) as server:
            server.login(Config.ADMIN_EMAIL, password) # Assuming Auth matches Admin
            server.sendmail(sender_email, recipient_email, msg.as_string())

        # Log to DB if interview_id
        if interview_id:
             session = get_session()
             interview = session.query(Interview).filter_by(id=interview_id).first()
             if interview:
                 interview.email_sent = True
                 interview.email_sent_at = datetime.utcnow()
                 session.commit()
             session.close()

        return jsonify({'success': True, 'message': 'Email sent'}), 200

    except Exception as e:
        logger.error(f"Send Custom Email Error: {str(e)}")
        return jsonify({'error': str(e)}), 500
