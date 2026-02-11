# Security Guide

This document outlines the security features and best practices for the Email Campaign System.

## Security Features

### Authentication & Authorization

- **API Key Authentication**: All API endpoints require a valid API key
- **Internal Use Only**: CORS restricted to internal company domains
- **Rate Limiting**: Prevents abuse with configurable limits
- **Input Validation**: Comprehensive validation of all user inputs

### Data Protection

- **Environment Variables**: Sensitive data stored in environment variables
- **Secure Headers**: Security headers implemented in Nginx
- **Input Sanitization**: All inputs sanitized before processing
- **Error Handling**: Secure error messages without sensitive data exposure

### Network Security

- **HTTPS Support**: SSL/TLS encryption for all communications
- **Firewall Configuration**: Restricted port access
- **Reverse Proxy**: Nginx as reverse proxy with security features
- **SMTP Security**: Secure SMTP connections with SSL/TLS

## Security Configuration

### API Key Management

1. **Generate Strong API Keys**
   ```bash
   # Generate 256-bit API key
   python3 -c "import secrets; print(secrets.token_hex(32))"
   ```

2. **Store Securely**
   ```env
   # In .env file (never commit to version control)
   INTERNAL_API_KEY=your_secure_api_key_here
   ```

3. **Rotate Regularly**
   - Change API keys monthly
   - Update both backend and frontend configurations
   - Monitor for unauthorized access

### Environment Security

```env
# Required security variables
INTERNAL_API_KEY=your_secure_api_key_here
SECRET_KEY=your_secret_key_here
EMAIL_PASSWORD=your_smtp_password

# Optional security settings
MAX_RECIPIENTS=100
RATE_LIMIT_DELAY=2.0
```

### Nginx Security Headers

```nginx
# Security headers in nginx.conf
add_header X-Frame-Options DENY;
add_header X-Content-Type-Options nosniff;
add_header X-XSS-Protection "1; mode=block";
add_header Referrer-Policy "strict-origin-when-cross-origin";
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
```

## Access Control

### Network Access

1. **Internal Networks Only**
   - Restrict access to company internal networks
   - Use VPN for remote access
   - Block external access to backend ports

2. **Firewall Configuration**
   ```bash
   # Allow only necessary ports
   sudo ufw allow ssh
   sudo ufw allow 'Nginx Full'
   sudo ufw deny 5000  # Block direct backend access
   sudo ufw enable
   ```

### User Access

1. **API Key Distribution**
   - Distribute API keys securely
   - Use encrypted communication
   - Track key usage and access

2. **Role-Based Access**
   - Implement user roles if needed
   - Restrict admin functions
   - Monitor user activities

## Data Security

### Input Validation

The system validates all inputs:

```python
# Email validation
def validate_email(email):
    pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    return re.match(pattern, email) is not None

# Input sanitization
def validate_input(data):
    errors = []
    # Check required fields
    # Validate email formats
    # Check data types
    # Validate lengths
    return errors
```

### Data Storage

1. **Local Storage**
   - Templates stored in browser localStorage
   - No sensitive data in localStorage
   - Clear data on logout

2. **Log Files**
   - Logs contain no sensitive data
   - Regular log rotation
   - Secure log file permissions

### Email Security

1. **SMTP Configuration**
   ```python
   # Secure SMTP connection
   context = ssl.create_default_context()
   with smtplib.SMTP_SSL(SMTP_SERVER, SMTP_PORT, context=context) as server:
       server.login(sender_email, EMAIL_PASSWORD)
   ```

2. **Email Content**
   - No sensitive data in email content
   - HTML sanitization
   - Variable validation

## Monitoring & Auditing

### Logging

1. **Application Logs**
   ```python
   # Structured logging
   logging.basicConfig(
       level=logging.INFO,
       format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
       handlers=[
           logging.FileHandler('email_campaign.log'),
           logging.StreamHandler()
       ]
   )
   ```

2. **Security Events**
   - Failed authentication attempts
   - Rate limit violations
   - Input validation failures
   - SMTP connection errors

### Monitoring

1. **Health Checks**
   ```bash
   # Regular health monitoring
   curl -f http://localhost:5000/api/health
   ```

2. **Performance Monitoring**
   - Response times
   - Error rates
   - Resource usage
   - Email delivery rates

## Vulnerability Management

### Regular Updates

1. **Dependencies**
   ```bash
   # Update Python packages
   pip list --outdated
   pip install --upgrade package_name
   ```

2. **System Updates**
   ```bash
   # Update system packages
   sudo apt update && sudo apt upgrade
   ```

### Security Scanning

1. **Dependency Scanning**
   ```bash
   # Scan for vulnerabilities
   pip install safety
   safety check
   ```

2. **Container Scanning**
   ```bash
   # Scan Docker images
   docker run --rm -v /var/run/docker.sock:/var/run/docker.sock \
     aquasec/trivy image email-campaign:latest
   ```

## Incident Response

### Security Incident Procedures

1. **Detection**
   - Monitor logs for suspicious activity
   - Set up alerts for failed authentications
   - Monitor rate limit violations

2. **Response**
   - Immediately revoke compromised API keys
   - Block suspicious IP addresses
   - Review and rotate all credentials

3. **Recovery**
   - Restore from clean backups
   - Update all security configurations
   - Conduct security review

### Backup & Recovery

1. **Regular Backups**
   ```bash
   # Backup configuration and data
   tar -czf backup-$(date +%Y%m%d).tar.gz \
     .env logs/ data/ nginx.conf
   ```

2. **Recovery Procedures**
   - Document recovery steps
   - Test backup restoration
   - Maintain offline backups

## Compliance

### Data Protection

1. **Personal Data**
   - Minimize data collection
   - Secure data transmission
   - Regular data cleanup

2. **Email Compliance**
   - Follow CAN-SPAM Act guidelines
   - Include unsubscribe options
   - Respect recipient preferences

### Audit Trail

1. **Logging Requirements**
   - All API calls logged
   - Email sending activities tracked
   - Configuration changes recorded

2. **Retention Policies**
   - Define log retention periods
   - Secure log storage
   - Regular log archival

## Best Practices

### Development Security

1. **Code Security**
   - Input validation in all functions
   - Secure error handling
   - No hardcoded credentials

2. **Testing**
   - Security testing in CI/CD
   - Penetration testing
   - Vulnerability assessments

### Operational Security

1. **Access Management**
   - Principle of least privilege
   - Regular access reviews
   - Strong authentication

2. **Monitoring**
   - Real-time security monitoring
   - Automated alerting
   - Regular security reviews

## Security Checklist

### Pre-Deployment

- [ ] Strong API keys generated and configured
- [ ] Environment variables secured
- [ ] SSL/TLS certificates installed
- [ ] Firewall rules configured
- [ ] Security headers implemented
- [ ] Input validation tested
- [ ] Rate limiting configured
- [ ] Logging enabled

### Post-Deployment

- [ ] Health checks working
- [ ] Monitoring alerts configured
- [ ] Backup procedures tested
- [ ] Incident response plan ready
- [ ] Security documentation updated
- [ ] Team training completed
- [ ] Regular security reviews scheduled

### Ongoing Maintenance

- [ ] Regular security updates
- [ ] API key rotation
- [ ] Log monitoring
- [ ] Vulnerability scanning
- [ ] Access reviews
- [ ] Security training
- [ ] Incident response testing

## Contact

For security concerns or incidents:
- **Emergency**: Contact IT security team immediately
- **General**: Report through standard IT channels
- **Vulnerabilities**: Follow responsible disclosure practices
