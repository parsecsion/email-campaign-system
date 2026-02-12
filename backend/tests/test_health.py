import app as app_module


def test_health_is_fast_and_skips_smtp_by_default(client, monkeypatch):
    called = {"smtp": 0}

    def fake_smtp(*args, **kwargs):
        called["smtp"] += 1
        raise AssertionError("SMTP should not be called for default health check")

    monkeypatch.setattr(app_module.smtplib, "SMTP_SSL", fake_smtp)

    resp = client.get('/api/health')
    assert resp.status_code == 200
    data = resp.json

    assert data['status'] == 'healthy'
    assert data['smtp_status'] == 'skipped'
    assert data['smtp_check_performed'] is False
    assert called['smtp'] == 0


def test_health_can_perform_smtp_check_when_requested(client, monkeypatch):
    class DummySMTP:
        def __enter__(self):
            return self

        def __exit__(self, exc_type, exc, tb):
            return False

    monkeypatch.setattr(app_module, 'EMAIL_PASSWORD', 'test-password')
    monkeypatch.setattr(app_module.smtplib, 'SMTP_SSL', lambda *args, **kwargs: DummySMTP())

    resp = client.get('/api/health?include_smtp=1')
    assert resp.status_code == 200
    data = resp.json

    assert data['status'] == 'healthy'
    assert data['smtp_check_performed'] is True
    assert data['smtp_status'] == 'connected'
