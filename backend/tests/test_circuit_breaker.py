import pytest
from fastapi.testclient import TestClient
from datetime import datetime

from app.main import app
from app.database import SessionLocal
from app.models import Merchant, Transaction, RecoveryCase, SafetyPolicy, AuditLog, RecoveryBatch

client = TestClient(app)

@pytest.fixture(autouse=True)
def clean_circuit_breaker_db():
    db = SessionLocal()
    # Reset any active circuit breaker batch
    db.query(RecoveryBatch).filter(RecoveryBatch.status == "STOPPED_CIRCUIT_BREAKER").delete()
    
    # Ensure a test merchant and case exist
    merchant = db.query(Merchant).filter(Merchant.id == "merch_cb_test_01").first()
    if not merchant:
        merchant = Merchant(id="merch_cb_test_01", name="CB Test Merchant", email="cb@test.com")
        db.add(merchant)
        db.flush()

    case = db.query(RecoveryCase).filter(RecoveryCase.id == "CASE_CB_TEST_01").first()
    if not case:
        tx = Transaction(
            id="tx_cb_test_01",
            merchant_id="merch_cb_test_01",
            amount=3000.0,
            currency="INR",
            status="failed",
            payment_method="upi",
            created_at=datetime.utcnow()
        )
        db.add(tx)
        db.flush()
        
        case = RecoveryCase(
            id="CASE_CB_TEST_01",
            transaction_id=tx.id,
            status="pending_human_review",
            risk_type="failed_payment",
            risk_severity="HIGH",
            risk_amount=3000.0,
            diagnosed_root_cause="temporary_payment_failure",
            confidence_score=0.95,
            recommended_action="retry",
            created_at=datetime.utcnow()
        )
        db.add(case)
        
    db.commit()
    db.close()

def test_circuit_breaker_status_initially_closed():
    res = client.get("/api/circuit-breaker/status")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "CLOSED"
    assert data["is_tripped"] is False
    assert data["failure_rate"] == 0.0
    assert data["threshold"] == 15.0

def test_circuit_breaker_trigger_and_status():
    # Trigger global circuit breaker
    res = client.post("/api/circuit-breaker/trigger")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "OPEN"
    assert data["is_tripped"] is True
    assert data["circuit_breaker_triggered"] is True
    assert data["observed_failure_rate"] == 70.0
    
    # Check status endpoint reflects OPEN
    status_res = client.get("/api/circuit-breaker/status")
    assert status_res.status_code == 200
    assert status_res.json()["status"] == "OPEN"
    assert status_res.json()["is_tripped"] is True
    
    # Check that audit log was recorded
    db = SessionLocal()
    log = db.query(AuditLog).filter(AuditLog.event == "CIRCUIT_BREAKER_TRIGGERED").first()
    assert log is not None
    assert log.actor == "SAFETY_ENGINE"
    assert "CIRCUIT_BREAKER_THRESHOLD_EXCEEDED" in log.details.get("deterministic_rule", "")
    db.close()

def test_circuit_breaker_blocks_recovery_when_open():
    # Trigger circuit breaker
    client.post("/api/circuit-breaker/trigger")
    
    # Attempt to approve recovery
    res = client.post("/api/cases/CASE_CB_TEST_01/action", json={
        "action": "approve",
        "reason": "Trying to override while circuit breaker is open"
    })
    assert res.status_code == 400
    assert "Circuit Breaker" in res.json()["detail"]

def test_circuit_breaker_reset():
    # Trigger then reset
    client.post("/api/circuit-breaker/trigger")
    
    reset_res = client.post("/api/circuit-breaker/reset")
    assert reset_res.status_code == 200
    reset_data = reset_res.json()
    assert reset_data["status"] == "CLOSED"
    assert reset_data["is_tripped"] is False
    assert reset_data["observed_failure_rate"] == 0.0
    
    # Check status endpoint reflects CLOSED
    status_res = client.get("/api/circuit-breaker/status")
    assert status_res.status_code == 200
    assert status_res.json()["status"] == "CLOSED"
    assert status_res.json()["is_tripped"] is False
    
    # Check audit log recorded CIRCUIT_BREAKER_RESET
    db = SessionLocal()
    log = db.query(AuditLog).filter(AuditLog.event == "CIRCUIT_BREAKER_RESET").first()
    assert log is not None
    assert log.actor == "DEVELOPER_CONSOLE"
    db.close()

def test_batch_reset_endpoint():
    # Create stopped batch
    db = SessionLocal()
    batch = RecoveryBatch(
        id="batch_specific_reset_01",
        status="STOPPED_CIRCUIT_BREAKER",
        total_cases=10,
        successful_cases=1,
        failed_cases=9,
        created_at=datetime.utcnow()
    )
    db.add(batch)
    db.commit()
    db.close()
    
    res = client.post("/api/batches/batch_specific_reset_01/reset")
    assert res.status_code == 200
    assert res.json()["status"] == "CLOSED"
    assert res.json()["batch_id"] == "batch_specific_reset_01"
