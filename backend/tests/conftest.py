import os
import sys

import pytest

# Provide safe defaults before importing the Flask app.
#
# The application config validates SECRET_KEY at import time, so tests should
# bootstrap required variables before importing app/config modules.
os.environ.setdefault("SECRET_KEY", "test-secret-key-32-bytes-minimum!!")
os.environ.setdefault("JWT_SECRET_KEY", "test-jwt-secret-key-32-bytes-min!!")
os.environ.setdefault("ADMIN_EMAIL", "admin@example.com")
os.environ.setdefault("ADMIN_PASSWORD", "admin123")

# Ensure backend package is importable
BACKEND_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if BACKEND_ROOT not in sys.path:
    sys.path.append(BACKEND_ROOT)

from app import app  # noqa: E402
from database import get_session  # noqa: E402

_CACHED_TEST_TOKEN = None


@pytest.fixture
def client():
    """Flask test client for API tests."""
    return app.test_client()


@pytest.fixture
def auth_headers(client):
    """
    Obtain an auth token using admin credentials from the environment.

    Caches a token for the whole pytest process to avoid triggering
    /api/token rate limits when many tests request auth headers.
    """
    admin_email = os.environ["ADMIN_EMAIL"]
    admin_pass = os.environ["ADMIN_PASSWORD"]

    assert admin_email, "ADMIN_EMAIL must be set in test environment"
    assert admin_pass, "ADMIN_PASSWORD must be set in test environment"

    resp = client.post("/api/token", json={"email": admin_email, "password": admin_pass})
    assert resp.status_code == 200, f"Failed to obtain token: {resp.data}"

    _CACHED_TEST_TOKEN = resp.json["access_token"]
    return {"Authorization": f"Bearer {_CACHED_TEST_TOKEN}"}


@pytest.fixture
def db_session():
    """
    Provide a DB session for tests that need direct DB access.
    Caller is responsible for cleaning up any data they create.
    """
    session = get_session()
    try:
        yield session
    finally:
        session.close()
