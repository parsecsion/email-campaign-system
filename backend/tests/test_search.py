
from database import Candidate


def test_search_api(client, auth_headers, db_session):
    # Create test candidate if not exist
    test_email = "search_test_unique@example.com"
    existing = db_session.query(Candidate).filter_by(email=test_email).first()
    if not existing:
        c = Candidate(
            first_name="UniqueName",
            last_name="SearchTarget",
            email=test_email,
        )
        db_session.add(c)
        db_session.commit()

    # 1. Search for unique name
    resp = client.get("/api/candidates?search=UniqueName", headers=auth_headers)
    assert resp.status_code == 200
    data = resp.json
    candidates = data.get("candidates", [])

    assert any(c["email"] == test_email for c in candidates), \
        "Search should return the test candidate by unique name"

    # 2. Search for non-existent
    resp = client.get(
        "/api/candidates?search=NONEXISTENT_XYZ_123", headers=auth_headers
    )
    assert resp.status_code == 200
    data = resp.json
    candidates = data.get("candidates", [])

    assert len(candidates) == 0, "Search for non-existent term should return no results"

    # Cleanup
    db_session.query(Candidate).filter_by(email=test_email).delete()
    db_session.commit()
