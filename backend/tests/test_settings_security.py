import json

from database import Settings


MASK = "********"


def test_settings_get_masks_sensitive_values(client, auth_headers, db_session):
    smtp_configs = {
        "ops@example.com": {
            "host": "smtp.example.com",
            "port": 465,
            "user": "ops@example.com",
            "password": "super-secret",
        }
    }
    db_session.merge(Settings(key="agent_api_key", value="real-api-key"))
    db_session.merge(Settings(key="smtp_configs", value=json.dumps(smtp_configs)))
    db_session.commit()

    resp = client.get('/api/settings', headers=auth_headers)
    assert resp.status_code == 200

    settings = resp.json['settings']
    assert settings['agent_api_key'] == MASK
    assert settings['smtp_configs']['ops@example.com']['password'] == MASK


def test_settings_post_preserves_masked_secrets(client, auth_headers, db_session):
    db_session.merge(Settings(key="agent_api_key", value="real-api-key"))
    db_session.merge(
        Settings(
            key="smtp_configs",
            value=json.dumps(
                {
                    "ops@example.com": {
                        "host": "smtp.example.com",
                        "port": 465,
                        "user": "ops@example.com",
                        "password": "super-secret",
                    }
                }
            ),
        )
    )
    db_session.commit()

    payload = {
        "agent_api_key": MASK,
        "smtp_configs": {
            "ops@example.com": {
                "host": "smtp.changed.example.com",
                "port": 587,
                "user": "ops@example.com",
                "password": MASK,
            }
        },
    }
    resp = client.post('/api/settings', json=payload, headers=auth_headers)
    assert resp.status_code == 200

    agent_key = db_session.query(Settings).filter_by(key='agent_api_key').first().value
    smtp_setting = db_session.query(Settings).filter_by(key='smtp_configs').first().value
    smtp_value = json.loads(smtp_setting)

    assert agent_key == "real-api-key"
    assert smtp_value['ops@example.com']['password'] == "super-secret"
    assert smtp_value['ops@example.com']['host'] == "smtp.changed.example.com"


def test_settings_post_rejects_unknown_keys(client, auth_headers):
    resp = client.post('/api/settings', json={"not_allowed_key": 1}, headers=auth_headers)
    assert resp.status_code == 400
    assert resp.json['error'] == 'Unknown setting keys'
    assert 'not_allowed_key' in resp.json['unknown_keys']
