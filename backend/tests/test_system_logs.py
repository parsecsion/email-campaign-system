from pathlib import Path

import app as app_module


def test_system_logs_reads_from_configured_log_file(client, auth_headers, tmp_path):
    log_path = tmp_path / "custom.log"
    log_path.write_text("line-1\nline-2\nline-3\n")

    original = app_module.LOG_FILE
    app_module.LOG_FILE = str(log_path)
    try:
        resp = client.get('/api/system/logs?lines=2', headers=auth_headers)
        assert resp.status_code == 200
        data = resp.json
        assert data['logs'] == ['line-2', 'line-3']
    finally:
        app_module.LOG_FILE = original


def test_clear_system_logs_truncates_configured_log_file(client, auth_headers, tmp_path):
    log_path = tmp_path / "clearable.log"
    log_path.write_text("old-line\n")

    original = app_module.LOG_FILE
    app_module.LOG_FILE = str(log_path)
    try:
        resp = client.post('/api/system/logs/clear', headers=auth_headers)
        assert resp.status_code == 200

        contents = Path(log_path).read_text()
        assert "Logs cleared by user" in contents
        assert "old-line" not in contents
    finally:
        app_module.LOG_FILE = original
