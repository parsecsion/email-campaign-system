@echo off
cd /d %~dp0
echo ========================================
echo Email Campaign System - Development Mode
echo ========================================
echo Current Directory: %CD%
echo.

REM Check if .env file exists
if exist .env (
    echo [INFO] .env file found.
) else (
    echo [INFO] .env file not found. Attempting to create...
    if exist env.example (
        copy env.example .env
        echo [INFO] Created .env from env.example.
    ) else (
        echo [WARN] env.example not found. Creating empty .env...
        echo # Auto-generated .env > .env
        echo SECRET_KEY=dev_key >> .env
        echo [WARN] Please edit .env with your configuration!
    )
)

echo.
echo [1/4] Setting up Python virtual environment...
if not exist venv (
    python -m venv venv
)
call venv\Scripts\activate.bat

echo [2/4] Installing Python dependencies...
pip install -q -r backend\requirements.txt

echo [3/4] Installing Frontend dependencies...
if not exist frontend-new\node_modules (
    echo Installing node_modules...
    cd frontend-new
    call npm install
    cd ..
)

echo [4/4] Starting services...
echo.
echo Starting Flask backend on http://localhost:5000
echo Starting Vite frontend on http://localhost:5173
echo.

REM Start Flask backend in a new window
start "Flask Backend" cmd /k "venv\Scripts\activate.bat && cd backend && python app.py"

REM Wait a moment for Flask to start
timeout /t 3 /nobreak >nul

REM Start Vite frontend in a new window
start "Vite Frontend" cmd /k "cd frontend-new && npm run dev"
