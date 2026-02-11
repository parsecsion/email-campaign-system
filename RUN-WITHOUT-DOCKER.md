# Running Without Docker

This guide explains how to run the Email Campaign System without Docker, using Python directly.

## Prerequisites

- **Python 3.11+** installed
- **pip** package manager
- **Node.js 18+** and **npm** (for the frontend)
- A `.env` file with your configuration (see `env.example`)

## Quick Start

### Windows

1. **Run the development script**:
   ```cmd
   run-dev.bat
   ```
   This script will:
   - Create a `.env` file from `env.example` if needed
   - Set up the Python virtual environment
   - Install backend dependencies
   - Install frontend dependencies
   - Start both Backend and Frontend services

### Linux/Mac

1. **Make the script executable**:
   ```bash
   chmod +x run-dev.sh
   ```

2. **Run the script**:
   ```bash
   ./run-dev.sh
   ```

## Manual Setup (Alternative)

If you prefer to run the services manually:

### 1. Setup Python Virtual Environment

**Windows:**
```cmd
python -m venv venv
venv\Scripts\activate.bat
pip install -r backend\requirements.txt
```

**Linux/Mac:**
```bash
python3 -m venv venv
source venv/bin/activate
pip install -r backend/requirements.txt
```

### 2. Configure Environment

Copy `env.example` to `.env` and edit it with your credentials:

```cmd
copy env.example .env
```

### 3. Start Backend (Terminal 1)

**Windows:**
```cmd
venv\Scripts\activate.bat
cd backend
python app.py
```

**Linux/Mac:**
```bash
source venv/bin/activate
cd backend
python app.py
```

The backend will run on `http://localhost:5000`

### 4. Start Frontend (Terminal 2)

**Windows/Linux/Mac:**
```cmd
cd frontend-new
npm install
npm run dev
```

The frontend will run on `http://localhost:5173` (or similar port assigned by Vite).

## Access the Application

1. Open your browser and go to: **`http://localhost:5173`**
2. Login with credentials configured in your `.env` file.

## Troubleshooting

### Port Already in Use

If port 5000 or 5173 is already in use:

1. **Backend**: Change port in `backend/app.py` or use `flask run --port=XXXX`.
2. **Frontend**: Vite will automatically try the next available port.

### Module Not Found

Make sure you've activated the virtual environment and installed dependencies:
```cmd
venv\Scripts\activate.bat  # Windows
pip install -r backend\requirements.txt
```

## Production Deployment

For production, we recommend using Docker as it provides:
- Better security isolation
- Easier deployment
- Nginx reverse proxy
- Consistent environment

See `README.md` for Docker deployment instructions.

