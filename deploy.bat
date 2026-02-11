@echo off
REM Email Campaign System Deployment Script for Windows
REM This script automates the deployment process on Windows

setlocal enabledelayedexpansion

echo [INFO] Starting Email Campaign System deployment...

REM Check if Docker is installed
docker --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Docker is not installed. Please install Docker Desktop first.
    echo Download from: https://www.docker.com/products/docker-desktop
    pause
    exit /b 1
)

REM Check if Docker Compose is available
docker-compose --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Docker Compose is not available. Please ensure Docker Desktop is running.
    pause
    exit /b 1
)

echo [SUCCESS] Docker and Docker Compose are available

REM Create .env file if it doesn't exist
if not exist .env (
    echo [INFO] Creating .env file from template...
    copy env.example .env
    
    REM Generate secure secret keys using PowerShell
    for /f %%i in ('powershell -command "[System.Web.Security.Membership]::GeneratePassword(64, 0)"') do set SECRET_KEY=%%i
    for /f %%j in ('powershell -command "[System.Web.Security.Membership]::GeneratePassword(64, 0)"') do set JWT_SECRET_KEY=%%j
    
    REM Update .env file with generated keys
    powershell -command "(Get-Content .env) -replace 'replace_with_strong_secret_key', '%SECRET_KEY%' | Set-Content .env"
    powershell -command "(Get-Content .env) -replace 'replace_with_strong_jwt_secret_key', '%JWT_SECRET_KEY%' | Set-Content .env"
    
    echo [SUCCESS] Environment file created with secure keys
    echo [WARNING] Please edit .env file with your SMTP credentials and Admin password
) else (
    echo [WARNING] .env file already exists
)

REM Create necessary directories
echo [INFO] Creating necessary directories...
if not exist logs mkdir logs
if not exist data mkdir data
if not exist ssl mkdir ssl
echo [SUCCESS] Directories created

REM Generate SSL certificates if they don't exist
if not exist ssl\cert.pem (
    echo [INFO] Generating SSL certificates...
    openssl req -x509 -nodes -days 365 -newkey rsa:2048 -keyout ssl\key.pem -out ssl\cert.pem -subj "/C=US/ST=State/L=City/O=Organization/CN=localhost"
    echo [SUCCESS] SSL certificates generated
) else (
    echo [WARNING] SSL certificates already exist
)

REM Deploy with Docker Compose
echo [INFO] Deploying with Docker Compose...
docker-compose up -d --build

if %errorlevel% neq 0 (
    echo [ERROR] Failed to start services
    docker-compose logs
    pause
    exit /b 1
)

echo [SUCCESS] Services started successfully

REM Wait for services to be ready
echo [INFO] Waiting for services to start...
timeout /t 15 /nobreak >nul

REM Check deployment
echo [INFO] Checking deployment...
curl -f http://localhost/api/health >nul 2>&1
if %errorlevel% equ 0 (
    echo [SUCCESS] Application is healthy and accessible
) else (
    echo [WARNING] Health check failed, but services might still be starting
)

REM Show service status
echo [INFO] Service status:
docker-compose ps

REM Show access information
echo.
echo [SUCCESS] Deployment completed successfully!
echo.
echo Access Information:
echo ==================
echo Frontend: http://localhost
echo Backend API: http://localhost/api
echo Health Check: http://localhost/api/health
echo.
echo Next Steps:
echo ===========
echo 1. Edit .env file with your SMTP credentials
echo 2. Restart services: docker-compose restart
echo 3. Access the application and configure API key in settings
echo 4. Test email sending functionality
echo.
echo Useful Commands:
echo ===============
echo View logs: docker-compose logs -f
echo Stop services: docker-compose down
echo Restart services: docker-compose restart
echo Update application: git pull ^&^& docker-compose up -d --build
echo.
pause
