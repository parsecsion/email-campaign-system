
from database import Candidate


def test_pagination_api(client, auth_headers, db_session):
    # Create enough dummy candidates for pagination
    for i in range(15):
        email = f"page_test_{i}@example.com"
        existing = db_session.query(Candidate).filter_by(email=email).first()
        if not existing:
            c = Candidate(
                first_name="Page",
                last_name=f"Test {i}",
                email=email,
            )
            db_session.add(c)
    db_session.commit()

    # 1) Page 1
    resp = client.get(
        "/api/candidates?limit=5&offset=0&search=page_test", headers=auth_headers
    )
    assert resp.status_code == 200
    data = resp.json
    candidates = data.get("candidates", [])
    total = data.get("total", 0)

    assert len(candidates) == 5, f"Expected 5 candidates on page 1, got {len(candidates)}"
    assert total >= 10, "Total should reflect all dummy candidates"

    page1_ids = [c["id"] for c in candidates]

    # 2) Page 2
    resp = client.get(
        "/api/candidates?limit=5&offset=5&search=page_test", headers=auth_headers
    )
    assert resp.status_code == 200
    data = resp.json
    candidates_p2 = data.get("candidates", [])

    assert len(candidates_p2) == 5, f"Expected 5 candidates on page 2, got {len(candidates_p2)}"

    page2_ids = [c["id"] for c in candidates_p2]

    # Ensure no overlap between pages
    overlap = set(page1_ids).intersection(set(page2_ids))
    assert not overlap, f"Expected no overlap between pages, found overlap {overlap}"
