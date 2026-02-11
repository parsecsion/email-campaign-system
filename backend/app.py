from flask import Flask, request, jsonify, session
from flask_cors import CORS
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
import smtplib
import ssl
import os
import logging
import re
import time
import hashlib
import secrets
from datetime import datetime, timedelta
from dotenv import load_dotenv
from functools import wraps
from templates import get_template, get_all_templates, get_template_summary
from database import init_db
from scheduling_api import scheduling_bp
from celery_app import celery
from tasks import send_campaign_task
from celery.result import AsyncResult
from utils import validate_email, extract_first_name, clean_html_spacing, html_to_plain_text, personalize_email, ensure_html_formatting, make_mime_html_base64
from flask_jwt_extended import JWTManager, create_access_token, jwt_required, get_jwt_identity
from flask import send_file, g
import io
import base64
import json
import uuid
from database import get_session, EmailTracking, Draft, Settings, Candidate, Interview, Template, get_database_path

# Central configuration
from config import LOG_FILE, Config

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    handlers=[
        logging.FileHandler(LOG_FILE),
        logging.StreamHandler(),
    ],
)
logger = logging.getLogger(__name__)

app = Flask(__name__)
app.config["SECRET_KEY"] = Config.SECRET_KEY
app.config["JWT_SECRET_KEY"] = Config.JWT_SECRET_KEY
app.config["JWT_ACCESS_TOKEN_EXPIRES"] = timedelta(hours=8)

jwt = JWTManager(app)


@app.before_request
def attach_request_id():
    """
    Attach a request ID to the Flask global context for logging and tracing.

    Honors an incoming X-Request-ID header when present, otherwise generates
    a new UUID4. Handlers can include this in logs via g.request_id.
    """
    request_id = request.headers.get("X-Request-ID") or str(uuid.uuid4())
    g.request_id = request_id

# Initialize database
init_db()

# Register scheduling blueprint
app.register_blueprint(scheduling_bp)

from agent.api import agent_bp
app.register_blueprint(agent_bp)

from templates_api import templates_bp
app.register_blueprint(templates_bp)

# Configure CORS
# Origins are configured via CORS_ORIGINS env var, with sensible local defaults.
CORS(app, origins=Config.CORS_ORIGINS, supports_credentials=True)

# Rate limiting
limiter = Limiter(
    app=app,
    key_func=get_remote_address,
    default_limits=["1000 per hour", "100 per minute"],
    storage_uri=Config.RATELIMIT_STORAGE_URI,
)

# SMTP Configuration
SMTP_SERVER = Config.SMTP_SERVER
SMTP_PORT = Config.SMTP_PORT
EMAIL_PASSWORD = Config.EMAIL_PASSWORD
MAX_RECIPIENTS = Config.MAX_RECIPIENTS
RATE_LIMIT_DELAY = Config.RATE_LIMIT_DELAY

# Simple authentication credentials – must be provided explicitly
ADMIN_EMAIL = Config.ADMIN_EMAIL
ADMIN_PASSWORD = Config.ADMIN_PASSWORD

if not ADMIN_EMAIL or not ADMIN_PASSWORD:
    logger.error("Admin credentials are not set in environment variables.")



# validate_email imported from utils

from pydantic import ValidationError
from schemas import EmailCampaignRequest

@app.route('/api/token', methods=['POST'])
@limiter.limit("5 per minute")
def create_token():
    """Create JWT access token"""
    try:
        data = request.json
        if not data:
            return jsonify({'error': 'No data provided'}), 400
        
        email = data.get('email', '').strip()
        password = data.get('password', '').strip()
        
        if not email or not password:
            return jsonify({'error': 'Email and password required'}), 400
        
        # Simple credential check
        if email == ADMIN_EMAIL and password == ADMIN_PASSWORD:
            access_token = create_access_token(identity=email)
            logger.info(f"Successful login from {request.remote_addr}")
            return jsonify({
                'success': True,
                'access_token': access_token,
                'user': email
            })
        else:
            logger.warning(f"Failed login attempt from {request.remote_addr} with email: {email}")
            return jsonify({'error': 'Invalid credentials'}), 401
    
    except Exception as e:
        logger.error(f"Login error: {str(e)}")
        return jsonify({'error': 'Login failed'}), 500



@app.route('/api/auth-status', methods=['GET'])
@jwt_required(optional=True)
def auth_status():
    """Check authentication status"""
    current_user = get_jwt_identity()
    return jsonify({
        'authenticated': bool(current_user),
        'user': current_user if current_user else ''
    })

@app.route('/api/templates', methods=['GET', 'POST'])
@jwt_required()
def handle_templates():
    """Handle get all templates and create new template"""
    session = get_session()
    try:
        if request.method == 'GET':
            templates = session.query(Template).all()
            return jsonify({
                'success': True,
                'templates': [t.to_dict() for t in templates]
            })
            
        elif request.method == 'POST':
            data = request.json
            if not data or 'name' not in data or 'html_content' not in data:
                return jsonify({'error': 'Missing required fields'}), 400
                
            # Generate ID if not provided
            template_id = data.get('id')
            if not template_id:
                # Simple slugify
                s = str(data['name']).lower().strip()
                s = re.sub(r'[^\w\s-]', '', s)
                s = re.sub(r'[\s_-]+', '_', s)
                s = re.sub(r'^-+|-+$', '', s)
                template_id = s or 'template'
            
            # Check existence
            if session.query(Template).filter_by(id=template_id).first():
                 template_id = f"{template_id}_{secrets.token_hex(4)}"
    
            new_template = Template(
                id=template_id,
                name=data['name'],
                subject=data.get('subject', ''),
                variables=json.dumps(data.get('variables', [])),
                html_content=data['html_content'],
                plain_content=data.get('plain_content', ''),
                is_system=False
            )
            
            session.add(new_template)
            session.commit()
            
            return jsonify({'success': True, 'template': new_template.to_dict()}), 201
            
    except Exception as e:
        logger.error(f"Error handling templates: {str(e)}")
        return jsonify({'error': str(e)}), 500
    finally:
        session.close()

@app.route('/api/templates/<template_id>', methods=['GET'])
@jwt_required()
def get_template_by_id(template_id):
    """Get a specific template by ID"""
    session = get_session()
    try:
        template = session.query(Template).filter_by(id=template_id).first()
        if not template:
            return jsonify({'error': 'Template not found'}), 404
        return jsonify({
            'success': True,
            'template': template.to_dict()
        })
    except Exception as e:
        logger.error(f"Error fetching template {template_id}: {str(e)}")
        return jsonify({'error': 'Failed to fetch template'}), 500
    finally:
        session.close()

@app.route('/api/templates/<template_id>', methods=['PUT'])
@jwt_required()
def update_template(template_id):
    """Update a template"""
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
        
        session.commit()
        return jsonify({'success': True, 'template': template.to_dict()})
    except Exception as e:
        logger.error(f"Error updating template: {str(e)}")
        return jsonify({'error': str(e)}), 500
    finally:
        session.close()

@app.route('/api/templates/<template_id>', methods=['DELETE'])
@jwt_required()
def delete_template(template_id):
    """Delete a template"""
    session = get_session()
    try:
        template = session.query(Template).filter_by(id=template_id).first()
        if not template:
            return jsonify({'error': 'Template not found'}), 404
            
        if template.is_system:
             return jsonify({'error': 'Cannot delete system templates'}), 403
             
        session.delete(template)
        session.commit()
        return jsonify({'success': True, 'message': 'Template deleted'})
    except Exception as e:
        logger.error(f"Error deleting template: {str(e)}")
        return jsonify({'error': str(e)}), 500
    finally:
        session.close()

@app.route('/api/send-emails', methods=['POST'])
@limiter.limit("50 per minute")
@jwt_required()
def send_emails():
    """Send emails using background task"""
    try:
        json_data = request.json
        if not json_data:
            return jsonify({'error': 'No data provided'}), 400
        
        # Validate input using Pydantic
        try:
            campaign_data = EmailCampaignRequest(**json_data)
        except ValidationError as e:
            import json
            return jsonify({'error': 'Validation failed', 'details': json.loads(e.json())}), 400
        
        # Access data from Pydantic model
        sender_email = campaign_data.senderEmail
        subject = campaign_data.subject
        # dict() needed for Celery serialization if passing objects? 
        # Recipients is List[Recipient] (Pydantic models). Celery needs JSON serializable.
        # So we convert recipients back to list of dicts.
        recipients = [r.model_dump() for r in campaign_data.recipients]
        
        template_id = campaign_data.templateId
        html_template = campaign_data.htmlTemplate
        plain_template = campaign_data.plainTemplate
        
        # Generate ID
        import uuid
        campaign_id = str(uuid.uuid4())
        
        # Start background task
        task = send_campaign_task.delay(
            campaign_id=campaign_id,
            sender_email=sender_email,
            subject=subject,
            recipients=recipients,
            template_id=template_id,
            html_template=html_template,
            plain_template=plain_template
        )
        
        logger.info(f"Started campaign {campaign_id} with task {task.id}")
        
        return jsonify({
            'success': True,
            'campaign_id': campaign_id,
            'task_id': task.id,
            'status': 'queued',
            'message': 'Campaign started in background'
        })
        
    except Exception as e:
        logger.error(f"Error starting campaign: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500

@app.route('/api/campaigns/<task_id>/status', methods=['GET'])
@jwt_required()
def get_campaign_status(task_id):
    """Check status of background campaign task"""
    task = AsyncResult(task_id, app=celery)
    
    if task.state == 'PENDING':
        response = {
            'state': task.state,
            'status': 'Pending...',
            'current': 0,
            'total': 0,
            'successful': 0,
            'failed': 0
        }
    elif task.state == 'PROGRESS':
        response = {
            'state': task.state,
            'status': task.info.get('status', ''),
            'current': task.info.get('current', 0),
            'total': task.info.get('total', 0),
            'successful': task.info.get('successful', 0),
            'failed': task.info.get('failed', 0)
        }
    elif task.state == 'SUCCESS':
        # Task finished successfully
        # The result (return value) is in task.result OR task.info (if configured)
        # If task failed with exception, state is FAILURE
        response = {
            'state': task.state,
            'status': 'Completed',
            'current': task.result.get('total', 0),
            'total': task.result.get('total', 0),
            'successful': task.result.get('successful', 0),
            'failed': task.result.get('failed', 0),
            'results': task.result.get('results', [])
        }
    elif task.state == 'FAILURE':
        response = {
            'state': task.state,
            'status': 'Failed',
            'error': str(task.info),  # Exception message
        }
    else:
        response = {
            'state': task.state,
            'status': str(task.state)
        }
        
    return jsonify(response)

@app.route('/api/health', methods=['GET'])
def health_check():
    """Health check endpoint with detailed status"""
    try:
        # Test SMTP connection
        smtp_status = "unknown"
        if EMAIL_PASSWORD:
            try:
                context = ssl.create_default_context()
                with smtplib.SMTP_SSL(SMTP_SERVER, SMTP_PORT, context=context, timeout=10) as server:
                    smtp_status = "connected"
            except Exception as e:
                smtp_status = f"error: {str(e)}"
        else:
            smtp_status = "not_configured"
        
        return jsonify({
            'status': 'healthy',
            'message': 'Email campaign system is running',
            'version': '1.0.0',
            'timestamp': datetime.now().isoformat(),
            'smtp_status': smtp_status,
            'max_recipients': MAX_RECIPIENTS,
            'rate_limit_delay': RATE_LIMIT_DELAY
        })
    except Exception as e:
        logger.error(f"Health check failed: {str(e)}")
        return jsonify({
            'status': 'unhealthy',
            'message': 'Health check failed',
            'error': str(e)
        }), 500

@app.errorhandler(429)
def ratelimit_handler(e):
    """Handle rate limit errors"""
    return jsonify({
        'error': 'Rate limit exceeded',
        'message': 'Too many requests. Please try again later.'
    }), 429

@app.errorhandler(404)
def not_found_handler(e):
    """Handle 404 errors"""
    return jsonify({
        'error': 'Not found',
        'message': 'The requested resource was not found.'
    }), 404

@app.errorhandler(500)
def internal_error_handler(e):
    """Handle 500 errors"""
    logger.error(f"Internal server error: {str(e)}")
    return jsonify({
        'error': 'Internal server error',
        'message': 'An unexpected error occurred.'
    }), 500



@app.route('/api/track/<tracking_id>', methods=['GET'])
def track_email(tracking_id):
    """Track email open"""
    try:
        # Log the open
        session = get_session()
        try:
            record = session.query(EmailTracking).filter_by(tracking_id=tracking_id).first()
            if record:
                record.open_count += 1
                record.status = 'opened'
                if not record.opened_at:
                    record.opened_at = datetime.utcnow()
                
                # Capture metadata
                if request.headers.get('X-Forwarded-For'):
                    record.ip_address = request.headers.get('X-Forwarded-For').split(',')[0]
                else:
                    record.ip_address = request.remote_addr
                
                record.user_agent = request.headers.get('User-Agent')
                
                session.commit()
                # logger.info(f"Tracked open for {tracking_id}")
        except Exception as e:
            logger.error(f"Tracking DB error: {str(e)}")
        finally:
            session.close()
            
    except Exception as e:
        logger.error(f"Tracking error: {str(e)}")
    
    # Return 1x1 transparent GIF
    # Transparent GIF base64: R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7
    img_data = base64.b64decode("R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7")
    return send_file(
        io.BytesIO(img_data),
        mimetype='image/gif',
        as_attachment=False,
        download_name='pixel.gif'
    )

@app.route('/api/drafts', methods=['GET', 'POST'])
@jwt_required()
def handle_drafts():
    """Handle draft creation and listing"""
    sender_email = get_jwt_identity()
    session = get_session()
    
    try:
        if request.method == 'GET':
            drafts = session.query(Draft).filter_by(sender_email=sender_email).order_by(Draft.updated_at.desc()).all()
            return jsonify({'drafts': [d.to_dict() for d in drafts]}), 200
            
        elif request.method == 'POST':
            data = request.json
            new_draft = Draft(
                sender_email=sender_email,
                subject=data.get('subject'),
                template_id=data.get('template_id'),
                html_content=data.get('html_content'),
                recipients=data.get('recipients') # Expecting JSON string
            )
            session.add(new_draft)
            session.commit()
            return jsonify({'success': True, 'draft': new_draft.to_dict()}), 201
            
    except Exception as e:
        logger.error(f"Drafts error: {str(e)}")
        return jsonify({'error': str(e)}), 500
    finally:
        session.close()

@app.route('/api/drafts/<int:draft_id>', methods=['PUT', 'DELETE'])
@jwt_required()
def handle_single_draft(draft_id):
    """Handle operations on a single draft"""
    sender_email = get_jwt_identity()
    session = get_session()
    
    try:
        draft = session.query(Draft).filter_by(id=draft_id, sender_email=sender_email).first()
        if not draft:
            return jsonify({'error': 'Draft not found'}), 404
            
        if request.method == 'DELETE':
            session.delete(draft)
            session.commit()
            return jsonify({'success': True, 'message': 'Draft deleted'}), 200
            
        elif request.method == 'PUT':
            data = request.json
            if 'subject' in data: draft.subject = data['subject']
            if 'template_id' in data: draft.template_id = data['template_id']
            if 'html_content' in data: draft.html_content = data['html_content']
            if 'recipients' in data: draft.recipients = data['recipients']
            
            session.commit()
            return jsonify({'success': True, 'draft': draft.to_dict()}), 200
            
    except Exception as e:
        logger.error(f"Draft operation error: {str(e)}")
        return jsonify({'error': str(e)}), 500
    finally:
        session.close()

@app.route('/api/settings', methods=['GET', 'POST'])
@jwt_required()
def handle_settings():
    """Handle application settings"""
    session = get_session()
    try:
        if request.method == 'GET':
            settings = session.query(Settings).all()
            settings_dict = {}
            for s in settings:
                # Try to parse JSON if it looks like a list or dict
                import json
                try:
                    settings_dict[s.key] = json.loads(s.value)
                except:
                    settings_dict[s.key] = s.value
            return jsonify({'settings': settings_dict}), 200
            
        elif request.method == 'POST':
            data = request.json
            import json
            
            for key, value in data.items():
                setting = session.query(Settings).filter_by(key=key).first()
                val_str = json.dumps(value) if isinstance(value, (list, dict)) else str(value)
                
                if setting:
                    setting.value = val_str
                else:
                    setting = Settings(key=key, value=val_str)
                    session.add(setting)
            
            session.commit()
            return jsonify({'success': True, 'message': 'Settings updated'}), 200
            
    except Exception as e:
        logger.error(f"Settings error: {str(e)}")
        return jsonify({'error': str(e)}), 500
    finally:
        session.close()

@app.route('/api/system/logs', methods=['GET'])
@jwt_required()
def get_system_logs():
    """Get system logs"""
    try:
        lines = request.args.get('lines', default=100, type=int)
        log_file = LOG_FILE
        
        if not os.path.exists(log_file):
            return jsonify({'logs': []}), 200
            
        with open(log_file, 'r') as f:
            # Read all lines and get the last N
            all_lines = f.readlines()
            last_lines = all_lines[-lines:]
            
        return jsonify({'logs': [line.strip() for line in last_lines]}), 200
    except Exception as e:
        logger.error(f"Error reading logs: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/system/logs/clear', methods=['POST'])
@jwt_required()
def clear_system_logs():
    """Clear system logs"""
    try:
        log_file = LOG_FILE
        # Open in write mode to truncate
        os.makedirs(os.path.dirname(log_file) or '.', exist_ok=True)
        with open(log_file, 'w') as f:
            f.write(f"{datetime.now()} - System - INFO - Logs cleared by user\n")
        return jsonify({'success': True, 'message': 'Logs cleared'}), 200
    except Exception as e:
        logger.error(f"Error clearing logs: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/system/stats', methods=['GET'])
@jwt_required()
def get_system_stats():
    """Get system statistics"""
    session = get_session()
    try:
        candidate_count = session.query(Candidate).count()
        interview_count = session.query(Interview).count()
        email_sent_count = session.query(EmailTracking).filter_by(status='sent').count()
        email_opened_count = session.query(EmailTracking).filter_by(status='opened').count()
        
        return jsonify({
            'candidates': candidate_count,
            'interviews': interview_count,
            'emails_sent': email_sent_count,
            'emails_opened': email_opened_count,
            'db_size': os.path.getsize(get_database_path()) if os.path.exists(get_database_path()) else 0
        }), 200
    except Exception as e:
        logger.error(f"Error getting stats: {str(e)}")
        return jsonify({'error': str(e)}), 500
    finally:
        session.close()

if __name__ == '__main__':
    logger.info("Starting Email Campaign System")
    logger.info(f"SMTP Server: {SMTP_SERVER}:{SMTP_PORT}")
    logger.info(f"Max Recipients: {MAX_RECIPIENTS}")
    logger.info(f"Rate Limit Delay: {RATE_LIMIT_DELAY}s")
    logger.info(f"Admin Email: {ADMIN_EMAIL}")
    
    app.run(host='0.0.0.0', port=5000, debug=False)