import os
import time
import smtplib
import ssl
import logging
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from celery_app import celery
from utils import personalize_email, ensure_html_formatting, html_to_plain_text, make_mime_html_base64
from database import get_session, EmailTracking, Template
from templates import get_template  # Legacy defaults (fallback only)
from config import Config
import uuid

# Configure logger
logger = logging.getLogger(__name__)

@celery.task(bind=True)
def send_campaign_task(self, campaign_id, sender_email, subject, recipients, template_id=None, html_template=None, plain_template=None):
    """
    Background task to send a campaign of emails.
    """
    logger.info(f"Starting background campaign {campaign_id}")
    
    # Load config from env or database
    session = get_session()
    smtp_configs = {}
    try:
        from database import Settings
        setting = session.query(Settings).filter_by(key="smtp_configs").first()
        if setting:
            import json
            try:
                smtp_configs = json.loads(setting.value)
            except:
                logger.error("Failed to parse smtp_configs")
    except Exception as e:
        logger.error(f"Error loading SMTP settings: {e}")
    finally:
        session.close()

    # Determine SMTP credentials
    # Default to central Config values
    SMTP_SERVER = Config.SMTP_SERVER
    SMTP_PORT = Config.SMTP_PORT
    EMAIL_PASSWORD = Config.EMAIL_PASSWORD
    
    # Override if specific config exists for sender
    if sender_email in smtp_configs:
        config = smtp_configs[sender_email]
        SMTP_SERVER = config.get("host", SMTP_SERVER)
        SMTP_PORT = int(config.get("port", SMTP_PORT))
        EMAIL_PASSWORD = config.get("password", EMAIL_PASSWORD)
        logger.info(f"Using custom SMTP config for {sender_email}")

    RATE_LIMIT_DELAY = Config.RATE_LIMIT_DELAY

    if not EMAIL_PASSWORD:
        return {'status': 'failed', 'error': 'Email password not configured'}

    # Prepare templates
    if template_id and (html_template is None or plain_template is None):
        # 1) Try to load from database (primary source)
        try:
            session = get_session()
            db_template = session.query(Template).filter_by(id=template_id).first()
            if db_template:
                logger.info(f"Loaded template '{template_id}' from database for campaign {campaign_id}")
                html_template = db_template.html_content
                plain_template = db_template.plain_content
            else:
                # 2) Fallback to legacy in-memory templates module
                legacy = get_template(template_id)
                if legacy:
                    logger.info(f"Loaded template '{template_id}' from legacy templates.py for campaign {campaign_id}")
                    html_template = legacy.get('html_template')
                    plain_template = legacy.get('plain_template')
                else:
                    logger.error(f"Template '{template_id}' not found in DB or legacy templates for campaign {campaign_id}")
        except Exception as e:
            logger.error(f"Error resolving template '{template_id}' for campaign {campaign_id}: {e}")
        finally:
            try:
                session.close()
            except Exception:
                pass
    # If a template ID was provided but we still have no HTML body, abort early with a clear error.
    if template_id and not html_template:
        return {
            'status': 'failed',
            'error': f"Template '{template_id}' could not be resolved for campaign {campaign_id}",
            'total': 0,
            'successful': 0,
            'failed': 0,
            'results': []
        }

    results = []
    total = len(recipients)
    successful = 0
    failed = 0
    
    # helper for safe connection
    def create_server():
        try:
            context = ssl.create_default_context()
            server = smtplib.SMTP_SSL(SMTP_SERVER, SMTP_PORT, context=context, timeout=30)
            server.login(sender_email, EMAIL_PASSWORD)
            return server
        except Exception as e:
            logger.error(f"Failed to create SMTP connection: {e}")
            return None

    server = create_server()
    
    for i, recipient in enumerate(recipients):
        # Update task state
        self.update_state(state='PROGRESS', meta={
            'current': i,
            'total': total,
            'successful': successful,
            'failed': failed,
            'status': 'sending'
        })
        
        recipient_email = recipient.get('Email', '').strip()
        recipient_name = recipient.get('Name', 'Unknown')
        
        if not recipient_email:
            results.append({'email': '', 'status': 'failed', 'message': 'No email provided'})
            failed += 1
            continue
        
        try:
            # Generate tracking ID
            tracking_id = str(uuid.uuid4())
                
            # Personalize content
            html_body = personalize_email(html_template, recipient)
            html_body = ensure_html_formatting(html_body)
            
            # Inject tracking pixel
            # Determine API base URL (env var or default)
            api_base = os.getenv('API_BASE_URL', 'http://localhost:5000')
            pixel_url = f"{api_base}/api/track/{tracking_id}"
            pixel_html = f'<img src="{pixel_url}" width="1" height="1" style="display:none;" alt="" />'
            
            if '</body>' in html_body:
                html_body = html_body.replace('</body>', f'{pixel_html}</body>')
            else:
                html_body += pixel_html
            
            if plain_template:
                plain_body = personalize_email(plain_template, recipient)
            else:
                plain_body = html_to_plain_text(html_body)
                
            # Log to database
            try:
                session = get_session()
                tracking_record = EmailTracking(
                    tracking_id=tracking_id,
                    campaign_id=campaign_id,
                    recipient_email=recipient_email,
                    status='sent'
                )
                session.add(tracking_record)
                session.commit()
                session.close()
            except Exception as e:
                logger.error(f"Failed to log email tracking: {str(e)}")

            # Create message
            msg = MIMEMultipart("alternative")
            msg["From"] = sender_email
            msg["To"] = recipient_email
            msg["Subject"] = subject
            # msg["Bcc"] = sender_email  # Disabled to reduce spam likelihood/quota usage
            msg["X-Campaign-ID"] = campaign_id
            
            msg.attach(MIMEText(plain_body, "plain", "utf-8"))
            msg.attach(make_mime_html_base64(html_body))
            
            # Send logic with retry
            max_retries = 2
            sent = False
            for attempt in range(max_retries):
                try:
                    if server is None:
                        server = create_server()
                        if server is None:
                            raise Exception("Could not connect to SMTP server")
                            
                    server.sendmail(sender_email, [recipient_email], msg.as_string())
                    sent = True
                    break
                except (smtplib.SMTPServerDisconnected, smtplib.SMTPConnectError, smtplib.SMTPResponseException) as e:
                    logger.warning(f"SMTP Error on attempt {attempt+1}: {e}. Reconnecting...")
                    try:
                        server.close()
                    except:
                        pass
                    server = None # Force recreate next loop
                    time.sleep(1) # Backoff
                except Exception as e:
                    logger.error(f"Unexpected SMTP error: {e}")
                    raise e # Don't retry logic errors

            if sent:
                results.append({
                    'name': recipient_name,
                    'email': recipient_email,
                    'status': 'success',
                    'message': 'Sent'
                })
                successful += 1
            else:
                raise Exception("Failed to send after retries")

            # Rate limit
            if i < total - 1:
                time.sleep(RATE_LIMIT_DELAY)
                
        except Exception as e:
            results.append({
                'name': recipient_name,
                'email': recipient_email,
                'status': 'failed',
                'message': str(e)
            })
            failed += 1
            logger.error(f"Failed to send to {recipient_email}: {e}")

    # Cleanup
    if server:
        try:
            server.quit()
        except:
            pass
        
    return {
        'status': 'completed',
        'total': total,
        'successful': successful,
        'failed': failed,
        'results': results
    }
