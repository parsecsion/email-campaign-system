import os
from dotenv import load_dotenv

# Base directory of the backend application (where config.py is)
BACKEND_DIR = os.path.dirname(os.path.abspath(__file__))
# Project root (one level up)
PROJECT_ROOT = os.path.dirname(BACKEND_DIR)

# Data Directory
DATA_DIR = os.path.join(PROJECT_ROOT, 'data')
os.makedirs(DATA_DIR, exist_ok=True)

# Database Path
DB_PATH = os.path.join(DATA_DIR, 'candidates.db')

# Log File Path (Absolute path in project root)
LOG_FILE = os.path.join(PROJECT_ROOT, 'email_campaign.log')

# Environment File
ENV_PATH = os.path.join(PROJECT_ROOT, '.env')

# Load Environment Variables explicitly
load_dotenv(ENV_PATH)


class Config:
    """Central configuration class and single source of truth for settings."""

    # Core security keys
    SECRET_KEY = os.getenv("SECRET_KEY")
    if not SECRET_KEY:
        raise ValueError("No SECRET_KEY set for Flask application")

    JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY") or SECRET_KEY

    # SMTP Defaults
    SMTP_SERVER = os.getenv("SMTP_SERVER", "smtp.hostinger.com")
    SMTP_PORT = int(os.getenv("SMTP_PORT", "465"))
    EMAIL_PASSWORD = os.getenv("EMAIL_PASSWORD")
    MAX_RECIPIENTS = int(os.getenv("MAX_RECIPIENTS", "100"))
    RATE_LIMIT_DELAY = float(os.getenv("RATE_LIMIT_DELAY", "2.0"))
    RATELIMIT_STORAGE_URI = os.getenv("RATELIMIT_STORAGE_URI", "memory://")

    # Admin – MUST be provided explicitly (no insecure defaults)
    ADMIN_EMAIL = os.getenv("ADMIN_EMAIL")
    ADMIN_PASSWORD = os.getenv("ADMIN_PASSWORD")

    # API Keys
    OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY")

    # CORS
    _cors_origins_raw = os.getenv(
        "CORS_ORIGINS",
        "http://localhost:5173,http://127.0.0.1:5173",
    )
    CORS_ORIGINS = [o.strip() for o in _cors_origins_raw.split(",") if o.strip()]


def get_env(key, default=None):
    """Thin wrapper around os.getenv for legacy use; prefer Config attributes."""
    return os.getenv(key, default)
