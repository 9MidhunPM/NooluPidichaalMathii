from fastapi.testclient import TestClient

from app.main import create_app


def test_live_reports_process_liveness() -> None:
    client = TestClient(create_app())

    response = client.get("/health/live")

    assert response.status_code == 200
    assert response.json() == {"status": "ok"}
