from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from app.main import app
from app import models
from app.database import SessionLocal

client = TestClient(app)

def test_exceptions_api():
    # Insert a dummy exception
    db = SessionLocal()
    exc = models.Incident(
        type="AI_ERROR",
        severity="CRITICAL",
        status="OPEN",
        message="Test exception"
    )
    db.add(exc)
    db.commit()
    db.refresh(exc)
    
    # Test list
    res = client.get("/api/exceptions")
    assert res.status_code == 200
    assert len(res.json()) >= 1
    
    # Test details
    res = client.get(f"/api/exceptions/{exc.id}")
    assert res.status_code == 200
    assert res.json()["id"] == exc.id
    
    # Test action (resolve)
    res = client.post(f"/api/exceptions/{exc.id}/action", json={"action": "resolve"})
    assert res.status_code == 200
    
    # Verify status changed
    res = client.get(f"/api/exceptions/{exc.id}")
    assert res.json()["status"] == "RESOLVED"
    
    # Test retry critical error (should fail)
    res = client.post(f"/api/exceptions/{exc.id}/action", json={"action": "retry"})
    assert res.status_code == 400
    
    db.delete(exc)
    db.commit()
    db.close()
