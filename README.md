## Email Campaign & Interview Scheduling System

A full-stack system for running email campaigns and managing a lightweight interview pipeline (candidates, schedules, and an AI assistant). This repository is structured and documented to be understandable as a portfolio project.

### Features

- **Email campaigns**
  - Template-driven campaigns with variable substitution
  - Per-sender SMTP configuration
  - Background sending via Celery + Redis with rate limiting
  - Open tracking via 1×1 pixel endpoint
- **Scheduling**
  - Candidate management (CRUD, CSV import)
  - Interview scheduling with conflict detection and calendar views
  - Drag-and-drop rescheduling in the UI
- **AI assistant**
  - OpenRouter-powered agent with tools for searching/updating candidates, scheduling interviews, and drafting emails
  - Confirmation flow before sensitive actions (e.g. delete, schedule)
- **Quality & ops**
  - JWT-based auth for the UI
  - Centralized configuration and logging
  - Pytest-based backend tests and CI workflow
  - Docker Compose setup with Nginx, Redis, Flask app, and Celery worker

---

## Architecture Overview

- **Backend** (`backend/`)
  - Flask REST API (`app.py`) with blueprints for scheduling (`scheduling_api.py`) and the AI agent (`agent/`).
  - Celery worker (`celery_app.py`, `tasks.py`) for background email sending.
  - SQLAlchemy models and SQLite database (`database.py`).
  - Business logic helpers (`scheduler.py`, `services/scheduling_service.py`, `utils.py`).
  - Configuration & env handling (`config.py`, `env.example`).
  - Tests under `backend/tests/` (pytest).

- **Frontend** (`frontend-new/`)
  - React SPA (Vite) with Tailwind CSS and Radix UI components.
  - Screens for campaigns, scheduler (`Scheduler.jsx`), candidates, settings, and agent chat.

- **Infra**
  - `docker-compose.yml` for app, Nginx, Redis, and Celery worker.
  - `nginx.conf` for reverse proxying frontend and backend.

---

## Getting Started (Local Development)

### Quick Start (Recommended)

We provide convenience scripts to set up the environment and run both backend and frontend services with a single command.

**Windows:**
```cmd
run-dev.bat
```

**Linux/Mac:**
```bash
chmod +x run-dev.sh
./run-dev.sh
```

These scripts will:
- Create a `.env` file from template (if missing)
- Create and activate a Python virtual environment
- Install all backend and frontend dependencies
- Start the Flask API and Vite Frontend server

---

### Manual Setup

### Prerequisites

- Python 3.11+
- Node.js 18+ and npm
- Redis (local or via Docker)
- SMTP account (for sending real emails) – or use a test/sandbox provider

### 1. Clone and create a virtualenv

```bash
git clone <your-fork-url>
cd email-campaign-system

python -m venv venv
venv\Scripts\activate  # Windows
# or: source venv/bin/activate  # macOS/Linux
```

### 2. Install backend dependencies

```bash
pip install -r backend/requirements.txt
pip install pytest
```

### 3. Configure environment

```bash
cp env.example .env
```

Then edit `.env` and set at least:

- `EMAIL_PASSWORD`, `SMTP_SERVER`, `SMTP_PORT`
- `ADMIN_EMAIL`, `ADMIN_PASSWORD`
- `SECRET_KEY`, `JWT_SECRET_KEY`
- `OPENROUTER_API_KEY` (if you want to use the AI agent)

### 4. Run the backend

From the project root:

```bash
cd backend
python app.py
```

The API will be available at `http://localhost:5000`.

### 5. Run the Celery worker (optional but recommended)

You need a Redis instance running (see Docker section below, or run Redis locally).

```bash
cd backend
celery -A celery_app.celery worker --loglevel=info
```

### 6. Run the frontend

```bash
cd frontend-new
npm install
npm run dev
```

The SPA will be available at the URL Vite prints (by default `http://localhost:5173`).

Log in using the admin credentials from your `.env`. The frontend talks to `http://localhost:5000` by default.

---

## Running Tests

Backend tests use pytest:

```bash
venv\Scripts\activate  # or source venv/bin/activate
pytest backend/tests -q
```

There is also a GitHub Actions workflow (`.github/workflows/backend-tests.yml`) that runs these tests on each push when configured with suitable secrets (`ADMIN_EMAIL`, `ADMIN_PASSWORD`).

---

## Docker & Deployment (Overview)

For a quick local all-in-one stack (app + Redis + Celery + Nginx):

```bash
docker-compose up --build
```

This expects a `.env` file in the project root. Nginx will serve the built frontend and proxy to the Flask API.

For a portfolio GitHub repository, the most important artifacts are:

- `backend/` (Flask app, models, Celery tasks, tests)
- `frontend-new/` (React SPA)
- `docker-compose.yml` and `nginx.conf`
- `env.example` (documenting configuration without real secrets)

Runtime artifacts such as `data/`, `logs/`, `email_campaign.log`, `venv/`, and `frontend-new/node_modules/` are **ignored** via `.gitignore` and should not be committed.

---

## Code & File Organization Notes

- **Production code**
  - `backend/app.py`, `backend/scheduling_api.py`, `backend/agent/*`, `backend/tasks.py`, `backend/scheduler.py`, `backend/services/`, `backend/database.py`, `backend/utils.py`.
  - `frontend-new/src/**` for all UI components, hooks, and agent skill wiring.

- **Tests**
  - `backend/tests/` contains pytest-based tests for search, pagination, settings, and schedule behavior.

- **Developer scripts**
  - Various one-off maintenance/verification scripts live at the repo root and under `backend/` (e.g. `check_db.py`, `audit_db.py`, `seed_data.py`, `import_csv.py`, `test_agent_features.py`, etc.).
  - These are **not required** for running the app, but can be useful to explore the database and behavior.
  - New scripts should go into the `scripts/` directory (see `scripts/README.md`).

If you want an ultra-lean public repo, you can keep only:

- `backend/` (excluding `data/` and any local `.env` files),
- `frontend-new/` (excluding `node_modules/` and build artifacts),
- infra files (`docker-compose.yml`, `nginx.conf`),
- top-level `.gitignore`, `env.example`, and this `README.md`,
- and `scripts/` as a home for any dev utilities you want to showcase.

---

## What Not to Commit

These are either already ignored or should remain local:

- Local environments: `venv/`, `.env`, `backend/.env`
- Generated/compiled artifacts: `__pycache__/`, `*.pyc`, `dist/`, `frontend-new/node_modules/`, any `build/` or `coverage` outputs
- Runtime data: `data/` directory and `*.db` files, `email_campaign.log`, `logs/`
- TLS material: `ssl/`, `*.pem`, `*.key`, `*.crt`

Keeping these out of the Git history ensures your GitHub repository stays clean and free of secrets.

