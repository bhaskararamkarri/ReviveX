from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_get_settings():
    response = client.get("/api/settings")
    assert response.status_code == 200
    data = response.json()
    assert "max_retries" in data
    assert "human_approval_threshold" in data
    
def test_update_settings():
    payload = {
        "max_retries": 5,
        "human_approval_threshold": 15000.0,
        "max_discount": 15.0,
        "automatic_retry": False,
        "automatic_nudge": False
    }
    response = client.put("/api/settings", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["max_retries"] == 5
    assert data["automatic_retry"] is False

def test_update_settings_validation():
    payload = {
        "max_retries": -1,
        "human_approval_threshold": 15000.0,
        "max_discount": 150.0, # invalid
        "automatic_retry": False,
        "automatic_nudge": False
    }
    response = client.put("/api/settings", json=payload)
    assert response.status_code == 422
