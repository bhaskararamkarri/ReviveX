import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from datetime import datetime

from app.main import app
from app.database import SessionLocal, get_db
from app.models import Merchant, Transaction, RecoveryCase, SafetyPolicy, AuditLog, RecoveryBatch, RecoveryAction
from app.schemas import RootCauseEnum, RecommendedActionEnum

client = TestClient(app)

@pytest.fixture(autouse=True)
def setup_human_auth_db():
    db = SessionLocal()
    
    # 1. Merchant
    merchant = db.query(Merchant).filter(Merchant.id == "merch_human_auth_01").first()
    if not merchant:
        merchant = Merchant(id="merch_human_auth_01", name="Human Auth Test Merchant", email="auth@test.com")
        db.add(merchant)
        
    # 2. Safety Policies
    db.query(SafetyPolicy).filter(SafetyPolicy.merchant_id == "merch_human_auth_01").delete()
    
    policy_retries = SafetyPolicy(
        merchant_id="merch_human_auth_01",
        rule_type="MAX_RETRIES",
        rule_value={"max_retries": 2}
    )
    policy_threshold = SafetyPolicy(
        merchant_id="merch_human_auth_01",
        rule_type="HUMAN_APPROVAL_THRESHOLD",
        rule_value={"threshold": 10000.0}
    )
    db.add(policy_retries)
    db.add(policy_threshold)
    
    # Clean up any active circuit breaker batch
    db.query(RecoveryBatch).filter(RecoveryBatch.status == "STOPPED_CIRCUIT_BREAKER").delete()
    
    db.commit()
    db.close()

def create_test_case(db: Session, case_id: str, amount: float, status: str = "pending_human_review", root_cause: str = "temporary_payment_failure", signals: dict = None):
    # Ensure transaction
    tx_id = f"tx_{case_id}"
    tx = db.query(Transaction).filter(Transaction.id == tx_id).first()
    if not tx:
        tx = Transaction(
            id=tx_id,
            merchant_id="merch_human_auth_01",
            amount=amount,
            currency="INR",
            status="failed",
            payment_method="upi",
            error_code="GATEWAY_TIMEOUT",
            created_at=datetime.utcnow()
        )
        db.add(tx)
        db.flush()

    case = db.query(RecoveryCase).filter(RecoveryCase.id == case_id).first()
    if not case:
        case = RecoveryCase(
            id=case_id,
            transaction_id=tx.id,
            status=status,
            risk_type="failed_payment",
            risk_severity="HIGH",
            risk_amount=amount,
            diagnosed_root_cause=root_cause,
            confidence_score=0.95,
            recommended_action="retry",
            signals=signals or {"recent_failures_count": 0},
            created_at=datetime.utcnow()
        )
        db.add(case)
    else:
        case.status = status
        case.diagnosed_root_cause = root_cause
        case.risk_amount = amount
        case.signals = signals or {"recent_failures_count": 0}
        case.final_action = None

    db.commit()
    db.refresh(case)
    return case

def test_human_review_case_can_be_approved():
    db = SessionLocal()
    case = create_test_case(db, "CASE_AUTH_001", 15000.0, status="pending_human_review")
    
    res = client.post(f"/api/cases/{case.id}/action", json={
        "action": "approve",
        "reason": "Authorized by supervisor for high value customer",
        "operator_id": "supervisor_john"
    })
    
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "success"
    assert data["final_action"] == "retry"
    
    # Reload case
    db.refresh(case)
    # Status should be open (in flight) or simulated_success, NOT immediately 'recovered'
    assert case.status != "recovered"
    assert case.final_action == "retry"
    db.close()

def test_approval_invokes_recovery_engine_and_creates_action():
    db = SessionLocal()
    case = create_test_case(db, "CASE_AUTH_002", 12000.0, status="pending_human_review")
    
    res = client.post(f"/api/cases/{case.id}/action", json={
        "action": "approve",
        "reason": "Verified checkout intent"
    })
    assert res.status_code == 200
    
    # Check that a RecoveryAction was created
    action = db.query(RecoveryAction).filter(RecoveryAction.recovery_case_id == case.id).first()
    assert action is not None
    assert action.action_type in ["charge_retry", "send_email"]
    db.close()

def test_approval_creates_audit_entries():
    db = SessionLocal()
    case = create_test_case(db, "CASE_AUTH_003", 14000.0, status="pending_human_review")
    
    res = client.post(f"/api/cases/{case.id}/action", json={
        "action": "approve",
        "reason": "Audit verification test note",
        "operator_id": "auditor_ops"
    })
    assert res.status_code == 200
    
    logs = db.query(AuditLog).filter(AuditLog.recovery_case_id == case.id).all()
    approved_log = next((l for l in logs if l.event == "RECOVERY_APPROVED"), None)
    executed_log = next((l for l in logs if l.event == "RECOVERY_EXECUTED"), None)
    
    assert approved_log is not None
    assert approved_log.actor == "HUMAN_OPERATOR"
    assert approved_log.details.get("operator") == "auditor_ops"
    assert "Audit verification test note" in approved_log.details.get("reason", "")
    
    assert executed_log is not None
    assert executed_log.actor == "SYSTEM"
    db.close()

def test_rejection_works_and_creates_audit():
    db = SessionLocal()
    case = create_test_case(db, "CASE_AUTH_004", 18000.0, status="pending_human_review")
    
    res = client.post(f"/api/cases/{case.id}/action", json={
        "action": "reject",
        "reason": "Customer confirmed order cancellation",
        "operator_id": "operator_sarah"
    })
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "success"
    assert data["case_status"] == "failed"
    assert data["final_action"] == "stop"
    
    db.refresh(case)
    assert case.status == "failed"
    assert case.final_action == "stop"
    
    # Audit log check
    log = db.query(AuditLog).filter(
        AuditLog.recovery_case_id == case.id,
        AuditLog.event == "RECOVERY_REJECTED"
    ).first()
    assert log is not None
    assert log.actor == "HUMAN_OPERATOR"
    assert "Customer confirmed order cancellation" in log.details.get("reason", "")
    db.close()

def test_hard_decline_cannot_be_overridden_by_approval():
    db = SessionLocal()
    # Case has hard decline
    case = create_test_case(db, "CASE_AUTH_HARD_DECLINE", 5000.0, status="pending_human_review", root_cause="hard_payment_decline")
    
    res = client.post(f"/api/cases/{case.id}/action", json={
        "action": "approve"
    })
    assert res.status_code == 400
    assert "HARD_DECLINE_POLICY" in res.json()["detail"]
    db.close()

def test_fraud_cannot_be_overridden_by_approval():
    db = SessionLocal()
    # Case has fraud flag
    case = create_test_case(
        db, "CASE_AUTH_FRAUD", 5000.0, 
        status="pending_human_review", 
        signals={"fraud_suspected": True}
    )
    
    res = client.post(f"/api/cases/{case.id}/action", json={
        "action": "approve"
    })
    assert res.status_code == 400
    assert "FRAUD_FLAG" in res.json()["detail"]
    db.close()

def test_retry_limit_cannot_be_bypassed_by_approval():
    db = SessionLocal()
    # Case has 3 previous failures (MAX_RETRIES is 2)
    case = create_test_case(
        db, "CASE_AUTH_MAX_RETRIES", 5000.0, 
        status="pending_human_review", 
        signals={"recent_failures_count": 3}
    )
    
    res = client.post(f"/api/cases/{case.id}/action", json={
        "action": "approve"
    })
    assert res.status_code == 400
    assert "MAX_RETRIES" in res.json()["detail"]
    db.close()

def test_circuit_breaker_blocks_recovery_approval():
    db = SessionLocal()
    case = create_test_case(db, "CASE_AUTH_CB_TEST", 5000.0, status="pending_human_review")
    
    # Insert an active circuit breaker batch
    batch = RecoveryBatch(
        id="batch_circuit_breaker_active",
        status="STOPPED_CIRCUIT_BREAKER",
        total_cases=20,
        successful_cases=2,
        failed_cases=8,
        created_at=datetime.utcnow()
    )
    db.add(batch)
    db.commit()
    
    res = client.post(f"/api/cases/{case.id}/action", json={
        "action": "approve"
    })
    assert res.status_code == 400
    assert "Circuit Breaker" in res.json()["detail"]
    
    # Cleanup batch
    db.delete(batch)
    db.commit()
    db.close()

def test_already_recovered_case_cannot_be_approved_again():
    db = SessionLocal()
    case = create_test_case(db, "CASE_AUTH_ALREADY_RECOVERED", 5000.0, status="recovered")
    
    res = client.post(f"/api/cases/{case.id}/action", json={
        "action": "approve"
    })
    assert res.status_code == 400
    assert "already recovered" in res.json()["detail"]
    db.close()

def test_already_stopped_case_cannot_be_approved_again():
    db = SessionLocal()
    case = create_test_case(db, "CASE_AUTH_ALREADY_STOPPED", 5000.0, status="failed")
    case.final_action = "stop"
    db.commit()
    
    res = client.post(f"/api/cases/{case.id}/action", json={
        "action": "approve"
    })
    assert res.status_code == 400
    assert "already been stopped" in res.json()["detail"]
    db.close()

def test_invalid_case_id_returns_404():
    res = client.post("/api/cases/CASE_DOES_NOT_EXIST_9999/action", json={
        "action": "approve"
    })
    assert res.status_code == 404

def test_unsupported_action_returns_400():
    db = SessionLocal()
    case = create_test_case(db, "CASE_AUTH_UNSUPPORTED", 5000.0, status="pending_human_review")
    
    res = client.post(f"/api/cases/{case.id}/action", json={
        "action": "unknown_action_type"
    })
    assert res.status_code == 400
    assert "Unsupported action" in res.json()["detail"]
    db.close()
