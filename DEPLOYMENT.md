# Deployment Guide

This guide covers different deployment options for the Email Campaign System.

## Prerequisites

- Linux server (Ubuntu 20.04+ recommended)
- Docker and Docker Compose (for containerized deployment)
- Nginx (for reverse proxy)
- SSL certificate (for HTTPS)
- SMTP server credentials

## Option 1: Docker Deployment (Recommended)

### 1. Prepare the Server

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/download/v2.20.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Logout and login to apply Docker group changes
```

### 2. Deploy the Application

```bash
# Clone the repository
git clone <repository-url>
cd email-campaign-system

# Create environment file
cp env.example .env
nano .env  # Edit with your configuration

# Create necessary directories
mkdir -p logs data ssl

# Start the application
docker-compose up -d

# Check status
docker-compose ps
docker-compose logs -f
```

### 3. Configure SSL (Optional)

```bash
# Generate self-signed certificate (for testing)
sudo openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout ssl/key.pem -out ssl/cert.pem

# Or use Let's Encrypt (for production)
sudo apt install certbot
sudo certbot certonly --standalone -d your-domain.com
sudo cp /etc/letsencrypt/live/your-domain.com/fullchain.pem ssl/cert.pem
sudo cp /etc/letsencrypt/live/your-domain.com/privkey.pem ssl/key.pem
```

### 4. Update Nginx Configuration

Edit `nginx.conf` and uncomment the HTTPS server block, then restart:

```bash
docker-compose restart nginx
```

## Option 2: Manual Deployment

### 1. Install Dependencies

```bash
# Install Python 3.11
sudo apt install python3.11 python3.11-venv python3.11-dev

# Install system dependencies
sudo apt install nginx curl gcc

# Create application user
sudo useradd -m -s /bin/bash email-campaign
sudo usermod -aG www-data email-campaign
```

### 2. Deploy Application

```bash
# Create application directory
sudo mkdir -p /opt/email-campaign-system
sudo chown email-campaign:www-data /opt/email-campaign-system

# Switch to application user
sudo su - email-campaign

# Clone repository
cd /opt/email-campaign-system
git clone <repository-url> .

# Create virtual environment
python3.11 -m venv venv
source venv/bin/activate

# Install dependencies
pip install -r backend/requirements.txt

# Create environment file
cp env.example .env
nano .env  # Edit with your configuration

# Create directories
mkdir -p logs data
```

### 3. Configure Systemd Service

```bash
# Copy service file
sudo cp systemd/email-campaign.service /etc/systemd/system/

# Edit service file if needed
sudo nano /etc/systemd/system/email-campaign.service

# Enable and start service
sudo systemctl daemon-reload
sudo systemctl enable email-campaign
sudo systemctl start email-campaign

# Check status
sudo systemctl status email-campaign
```

### 4. Configure Nginx

```bash
# Copy Nginx configuration
sudo cp nginx.conf /etc/nginx/sites-available/email-campaign

# Enable site
sudo ln -s /etc/nginx/sites-available/email-campaign /etc/nginx/sites-enabled/

# Test configuration
sudo nginx -t

# Restart Nginx
sudo systemctl restart nginx
```

## Option 3: Cloud Deployment

### AWS EC2

1. **Launch EC2 Instance**
   - AMI: Ubuntu Server 20.04 LTS
   - Instance Type: t3.small or larger
   - Security Group: Allow HTTP (80), HTTPS (443), SSH (22)

2. **Configure Security Group**
   ```
   Type        Protocol    Port Range    Source
   HTTP        TCP         80            0.0.0.0/0
   HTTPS       TCP         443           0.0.0.0/0
   SSH         TCP         22            Your IP
   Custom      TCP         5000          Your IP (for direct access)
   ```

3. **Deploy using Docker**
   ```bash
   # Follow Docker deployment steps above
   ```

### DigitalOcean Droplet

1. **Create Droplet**
   - Image: Ubuntu 20.04
   - Size: 1GB RAM minimum
   - Add SSH key

2. **Deploy Application**
   ```bash
   # Follow manual deployment steps
   ```

### Google Cloud Platform

1. **Create VM Instance**
   - Machine Type: e2-small
   - Boot Disk: Ubuntu 20.04 LTS
   - Firewall: Allow HTTP and HTTPS traffic

2. **Deploy Application**
   ```bash
   # Follow Docker deployment steps
   ```

## Environment Configuration

### Required Environment Variables

```env
# SMTP Configuration (Required)
EMAIL_PASSWORD=your_smtp_password
SMTP_SERVER=smtp.hostinger.com
SMTP_PORT=465

# Security (Required)
INTERNAL_API_KEY=your_secure_api_key_here
SECRET_KEY=your_secret_key_here

# Application Settings (Optional)
MAX_RECIPIENTS=100
RATE_LIMIT_DELAY=2.0
```

### Generate Secure Keys

```bash
# Generate API key
python3 -c "import secrets; print('INTERNAL_API_KEY=' + secrets.token_hex(32))"

# Generate secret key
python3 -c "import secrets; print('SECRET_KEY=' + secrets.token_hex(32))"
```

## Monitoring and Maintenance

### Health Checks

```bash
# Check application health
curl http://your-server/api/health

# Check Docker containers
docker-compose ps
docker-compose logs -f

# Check systemd service
sudo systemctl status email-campaign
sudo journalctl -u email-campaign -f
```

### Log Management

```bash
# View application logs
tail -f logs/email_campaign.log

# View Nginx logs
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log

# Rotate logs (add to crontab)
0 0 * * * /usr/sbin/logrotate /etc/logrotate.d/email-campaign
```

### Backup

```bash
# Backup application data
tar -czf email-campaign-backup-$(date +%Y%m%d).tar.gz \
  logs/ data/ .env

# Backup to remote location
rsync -av email-campaign-backup-*.tar.gz user@backup-server:/backups/
```

### Updates

```bash
# Update application (Docker)
git pull
docker-compose down
docker-compose build
docker-compose up -d

# Update application (Manual)
git pull
source venv/bin/activate
pip install -r backend/requirements.txt
sudo systemctl restart email-campaign
```

## Security Considerations

### Firewall Configuration

```bash
# Configure UFW
sudo ufw enable
sudo ufw allow ssh
sudo ufw allow 'Nginx Full'
sudo ufw deny 5000  # Block direct access to backend
```

### SSL/TLS Configuration

1. **Use Let's Encrypt for production**
2. **Configure HSTS headers**
3. **Use strong cipher suites**
4. **Regular certificate renewal**

### Access Control

1. **Restrict API access to internal networks**
2. **Use strong API keys**
3. **Regular key rotation**
4. **Monitor access logs**

## Performance Tuning

### Nginx Optimization

```nginx
# Add to nginx.conf
worker_processes auto;
worker_connections 1024;

# Enable gzip compression
gzip on;
gzip_vary on;
gzip_min_length 1024;
gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;

# Enable caching
location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
    expires 1y;
    add_header Cache-Control "public, immutable";
}
```

### Application Optimization

```bash
# Increase worker processes
# Edit docker-compose.yml or systemd service
--workers 4  # For Gunicorn

# Adjust rate limits
RATE_LIMIT_DELAY=1.0  # Reduce for faster sending
```

## Troubleshooting

### Common Issues

1. **Port 5000 already in use**
   ```bash
   sudo lsof -i :5000
   sudo kill -9 <PID>
   ```

2. **Permission denied errors**
   ```bash
   sudo chown -R email-campaign:www-data /opt/email-campaign-system
   sudo chmod -R 755 /opt/email-campaign-system
   ```

3. **SMTP connection failed**
   - Check firewall settings
   - Verify SMTP credentials
   - Test SMTP connection manually

4. **Nginx 502 Bad Gateway**
   - Check if backend is running
   - Verify upstream configuration
   - Check backend logs

### Debug Mode

```bash
# Enable debug logging
export LOG_LEVEL=DEBUG

# Run in debug mode (development only)
export FLASK_DEBUG=True
```

## Scaling

### Horizontal Scaling

1. **Load Balancer**: Use Nginx or HAProxy
2. **Multiple Backend Instances**: Deploy multiple containers
3. **Database**: Move to PostgreSQL for shared state
4. **Session Management**: Use Redis for session storage

### Vertical Scaling

1. **Increase Server Resources**: More CPU/RAM
2. **Optimize Database**: Add indexes, connection pooling
3. **Caching**: Implement Redis caching
4. **CDN**: Use CloudFlare or AWS CloudFront

## Support

For deployment issues:
1. Check logs for error messages
2. Verify environment configuration
3. Test network connectivity
4. Contact system administrator
