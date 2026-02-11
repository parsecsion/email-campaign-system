import os
import sys

import pytest

# Ensure backend package is importable
BACKEND_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if BACKEND_ROOT not in sys.path:
    sys.path.append(BACKEND_ROOT)

from app import app  # noqa: E402
from database import get_session  # noqa: E402


@pytest.fixture
def client():
    """Flask test client for API tests."""
    return app.test_client()


@pytest.fixture
def auth_headers(client):
    """
    Obtain an auth token using admin credentials from the environment.

    Tests assume ADMIN_EMAIL/ADMIN_PASSWORD are configured for the test run.
    """
    admin_email = os.getenv("ADMIN_EMAIL")
    admin_pass = os.getenv("ADMIN_PASSWORD")

    assert admin_email, "ADMIN_EMAIL must be set in test environment"
    assert admin_pass, "ADMIN_PASSWORD must be set in test environment"

    resp = client.post("/api/token", json={"email": admin_email, "password": admin_pass})
    assert resp.status_code == 200, f"Failed to obtain token: {resp.data}"

    token = resp.json["access_token"]
    return {"Authorization": f"Bearer {token}"}


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

