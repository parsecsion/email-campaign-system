#!/bin/bash

# Email Campaign System Deployment Script
# This script automates the deployment process

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to check if running as root
check_root() {
    if [[ $EUID -eq 0 ]]; then
        print_error "This script should not be run as root"
        exit 1
    fi
}

# Function to install Docker
install_docker() {
    print_status "Installing Docker..."
    
    if command_exists docker; then
        print_warning "Docker is already installed"
        return 0
    fi
    
    # Update package index
    sudo apt-get update
    
    # Install required packages
    sudo apt-get install -y \
        apt-transport-https \
        ca-certificates \
        curl \
        gnupg \
        lsb-release
    
    # Add Docker's official GPG key
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg
    
    # Set up stable repository
    echo \
        "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu \
        $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
    
    # Install Docker Engine
    sudo apt-get update
    sudo apt-get install -y docker-ce docker-ce-cli containerd.io
    
    # Add user to docker group
    sudo usermod -aG docker $USER
    
    print_success "Docker installed successfully"
    print_warning "Please logout and login again to use Docker without sudo"
}

# Function to install Docker Compose
install_docker_compose() {
    print_status "Installing Docker Compose..."
    
    if command_exists docker-compose; then
        print_warning "Docker Compose is already installed"
        return 0
    fi
    
    # Get latest version
    COMPOSE_VERSION=$(curl -s https://api.github.com/repos/docker/compose/releases/latest | grep 'tag_name' | cut -d\" -f4)
    
    # Download and install
    sudo curl -L "https://github.com/docker/compose/releases/download/${COMPOSE_VERSION}/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    sudo chmod +x /usr/local/bin/docker-compose
    
    print_success "Docker Compose installed successfully"
}

# Function to setup environment
setup_environment() {
    print_status "Setting up environment..."
    
    if [[ ! -f .env ]]; then
        print_status "Creating .env file from template..."
        cp env.example .env
        
        # Generate secure keys
        SECRET_KEY=$(python3 -c "import secrets; print(secrets.token_hex(32))")
        JWT_SECRET_KEY=$(python3 -c "import secrets; print(secrets.token_hex(32))")
        
        # Update .env file
        # Use simple sed, assuming placeholders are unique
        # Using | as delimiter to avoid issues with / in keys (though hex shouldn't have them)
        sed -i "s|replace_with_strong_secret_key|$SECRET_KEY|" .env
        sed -i "s|replace_with_strong_jwt_secret_key|$JWT_SECRET_KEY|" .env
        
        print_success "Environment file created with secure keys"
        print_warning "Please edit .env file with your SMTP credentials and Admin password"
    else
        print_warning ".env file already exists"
    fi
}

# Function to create directories
create_directories() {
    print_status "Creating necessary directories..."
    
    mkdir -p logs data ssl
    
    print_success "Directories created"
}

# Function to generate SSL certificates
generate_ssl_certs() {
    print_status "Generating SSL certificates..."
    
    if [[ ! -f ssl/cert.pem ]] || [[ ! -f ssl/key.pem ]]; then
        sudo openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
            -keyout ssl/key.pem -out ssl/cert.pem \
            -subj "/C=US/ST=State/L=City/O=Organization/CN=localhost"
        
        print_success "SSL certificates generated"
    else
        print_warning "SSL certificates already exist"
    fi
}

# Function to deploy with Docker
deploy_docker() {
    print_status "Deploying with Docker Compose..."
    
    # Build and start services
    docker-compose up -d --build
    
    # Wait for services to be ready
    print_status "Waiting for services to start..."
    sleep 10
    
    # Check if services are running
    if docker-compose ps | grep -q "Up"; then
        print_success "Services started successfully"
    else
        print_error "Failed to start services"
        docker-compose logs
        exit 1
    fi
}

# Function to check deployment
check_deployment() {
    print_status "Checking deployment..."
    
    # Wait a bit more for services to be fully ready
    sleep 5
    
    # Check health endpoint
    if curl -f http://localhost/api/health >/dev/null 2>&1; then
        print_success "Application is healthy and accessible"
    else
        print_warning "Health check failed, but services might still be starting"
    fi
    
    # Show service status
    print_status "Service status:"
    docker-compose ps
}

# Function to show access information
show_access_info() {
    print_success "Deployment completed successfully!"
    echo
    echo "Access Information:"
    echo "=================="
    echo "Frontend: http://localhost"
    echo "Backend API: http://localhost/api"
    echo "Health Check: http://localhost/api/health"
    echo
    echo "Login Credentials:"
    echo "  Email: $(grep ADMIN_EMAIL .env | cut -d'=' -f2)"
    echo "  Password: $(grep ADMIN_PASSWORD .env | cut -d'=' -f2)"
    echo
    echo "Next Steps:"
    echo "==========="
    echo "1. Edit .env file with your SMTP credentials"
    echo "2. Restart services: docker-compose restart"
    echo "3. Access the application and login with the credentials above"
    echo "4. Test email sending functionality"
    echo
    echo "Useful Commands:"
    echo "==============="
    echo "View logs: docker-compose logs -f"
    echo "Stop services: docker-compose down"
    echo "Restart services: docker-compose restart"
    echo "Update application: git pull && docker-compose up -d --build"
}

# Function to install system dependencies
install_system_deps() {
    print_status "Installing system dependencies..."
    
    sudo apt-get update
    sudo apt-get install -y \
        curl \
        wget \
        git \
        python3 \
        python3-pip \
        openssl \
        nginx \
        ufw
    
    print_success "System dependencies installed"
}

# Main deployment function
main() {
    print_status "Starting Email Campaign System deployment..."
    
    # Check if running as root
    check_root
    
    # Install system dependencies
    install_system_deps
    
    # Install Docker and Docker Compose
    install_docker
    install_docker_compose
    
    # Setup environment
    setup_environment
    
    # Create directories
    create_directories
    
    # Generate SSL certificates
    generate_ssl_certs
    
    # Deploy with Docker
    deploy_docker
    
    # Check deployment
    check_deployment
    
    # Show access information
    show_access_info
}

# Handle command line arguments
case "${1:-}" in
    --help|-h)
        echo "Email Campaign System Deployment Script"
        echo
        echo "Usage: $0 [OPTIONS]"
        echo
        echo "Options:"
        echo "  --help, -h     Show this help message"
        echo "  --docker-only  Only install Docker and Docker Compose"
        echo "  --env-only     Only setup environment file"
        echo "  --deploy-only  Only deploy (assumes Docker is installed)"
        echo
        exit 0
        ;;
    --docker-only)
        install_docker
        install_docker_compose
        exit 0
        ;;
    --env-only)
        setup_environment
        exit 0
        ;;
    --deploy-only)
        create_directories
        generate_ssl_certs
        deploy_docker
        check_deployment
        show_access_info
        exit 0
        ;;
    *)
        main
        ;;
esac
