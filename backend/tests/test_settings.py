
from database import Settings


def test_settings_api(client, auth_headers, db_session):
    # Clear existing settings
    db_session.query(Settings).delete()
    db_session.commit()

    # 1. Get Settings (should be empty/default)
    resp = client.get("/api/settings", headers=auth_headers)
    assert resp.status_code == 200

    # 2. Post Settings
    new_settings = {
        "company_emails": ["test1@example.com", "test2@example.com"],
        "theme": "dark",
    }

    resp = client.post("/api/settings", json=new_settings, headers=auth_headers)
    assert resp.status_code == 200

    # 3. Verify Persistence
    resp = client.get("/api/settings", headers=auth_headers)
    assert resp.status_code == 200
    data = resp.json.get("settings", {})

    assert data.get("company_emails") == new_settings["company_emails"], \
        "company_emails should persist correctly"
    assert data.get("theme") == "dark", "theme setting should persist correctly"
