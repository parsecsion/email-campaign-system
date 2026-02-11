#!/bin/bash

# Email Campaign System - Development Mode
# Usage: ./run-dev.sh

echo "========================================"
echo "Email Campaign System - Development Mode"
echo "========================================"
echo ""

# Check if .env file exists
if [ -f .env ]; then
    echo "[INFO] .env file found."
else
    echo "[INFO] .env file not found. Attempting to create..."
    if [ -f env.example ]; then
        cp env.example .env
        echo "[INFO] Created .env from env.example."
    else
        echo "[WARN] env.example not found. Creating empty .env..."
        echo "# Auto-generated .env" > .env
        echo "SECRET_KEY=dev_key" >> .env
        echo "[WARN] Please edit .env with your configuration!"
    fi
fi

echo ""
echo "[1/4] Setting up Python virtual environment..."
if [ ! -d "venv" ]; then
    python3 -m venv venv
fi
source venv/bin/activate

echo "[2/4] Installing Python dependencies..."
pip install -q -r backend/requirements.txt

echo "[3/4] Installing Frontend dependencies..."
if [ ! -d "frontend-new/node_modules" ]; then
    echo "Installing node_modules..."
    cd frontend-new
    npm install
    cd ..
fi

echo "[4/4] Starting services..."
echo ""
echo "Starting Flask backend on http://localhost:5000"
echo "Starting Vite frontend on http://localhost:5173"
echo ""
echo "Press Ctrl+C to stop both servers"
echo ""

# Start Flask backend in background
cd backend
python app.py &
FLASK_PID=$!
cd ..

# Wait a moment for Flask to start
sleep 3

# Start Vite frontend
cd frontend-new
npm run dev &
FRONTEND_PID=$!
cd ..

# Function to cleanup on exit
cleanup() {
    echo ""
    echo "Stopping servers..."
    kill $FLASK_PID $FRONTEND_PID 2>/dev/null
    exit
}

trap cleanup SIGINT SIGTERM

# Wait for both processes
wait
