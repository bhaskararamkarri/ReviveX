import pytest
from unittest.mock import MagicMock, patch
from sqlalchemy.orm import Session
from app.database import SessionLocal
from app.models import Merchant, Transaction, RecoveryCase, AuditLog, SafetyPolicy
from app.schemas import AIDiagnosisResponse, RootCauseEnum, RecommendedActionEnum, DecisionExplanation
from app.services.orchestrator import WorkflowOrchestrator

@pytest.fixture
def db():
    session = SessionLocal()
    merchant = session.query(Merchant).first()
    if not merchant:
        merchant = Merchant(name="Orchestrator Merchant", email="orch@test.com")
        session.add(merchant)
        session.commit()
        session.refresh(merchant)
    
    yield session
    session.close()

def test_process_case_missing_transaction(db):
    """Test that process_case gracefully returns None when transaction is not found."""
    case = RecoveryCase(id="case_nonexistent_tx", transaction_id="tx_does_not_exist", risk_type="failed_payment")
    result = WorkflowOrchestrator.process_case(db, case)
    assert result is None

def test_process_case_happy_path(db):
    """Test full pipeline: DETECTED -> DIAGNOSED -> DECIDED -> ACTION_EXECUTED -> OUTCOME_RECORDED."""
    merchant = db.query(Merchant).first()
    tx = Transaction(
        merchant_id=merchant.id,
        amount=100.0,
        currency="INR",
        status="failed",
        payment_method="upi",
        error_code="TEMPORARY_NETWORK_FAILURE"
    )
    db.add(tx)
    db.commit()
    db.refresh(tx)
    
    case = RecoveryCase(
        transaction_id=tx.id,
        risk_type="failed_payment",
        risk_amount=None,  # Should be updated by process_case
        status="open",
        signals={"recent_failures_count": 0}
    )
    db.add(case)
    db.commit()
    db.refresh(case)
    
    # Mock AIDiagnosisService to return predictable response
    mock_diag = AIDiagnosisResponse(
        root_cause=RootCauseEnum.temporary_payment_failure,
        confidence=0.95,
        recommended_action=RecommendedActionEnum.retry
    )
    
    with patch("app.services.orchestrator.AIDiagnosisService.diagnose", return_value=mock_diag):
        processed = WorkflowOrchestrator.process_case(db, case)
        
        assert processed is not None
        assert float(processed.risk_amount) == 100.0
        assert processed.diagnosed_root_cause == "temporary_payment_failure"
        assert float(processed.confidence_score) == 0.95
        assert processed.recommended_action == "retry"
        assert processed.final_action == "retry"
        assert processed.status in ["simulated_success", "recovered", "open", "failed"]
        
        # Verify Audit Logs
        logs = db.query(AuditLog).filter(AuditLog.recovery_case_id == case.id).all()
        events = [l.event for l in logs]
        assert "DETECTED" in events
        assert "DIAGNOSED" in events
        assert "DECIDED" in events
        assert "ACTION_EXECUTED" in events
        assert "OUTCOME_RECORDED" in events

def test_process_case_hard_decline_decision(db):
    """Test pipeline when AI diagnoses hard decline -> guardrails force STOP."""
    merchant = db.query(Merchant).first()
    tx = Transaction(
        merchant_id=merchant.id,
        amount=250.0,
        currency="INR",
        status="failed",
        payment_method="card",
        error_code="CARD_STOLEN_OR_EXPIRED"
    )
    db.add(tx)
    db.commit()
    db.refresh(tx)
    
    case = RecoveryCase(
        transaction_id=tx.id,
        risk_type="failed_payment",
        status="open"
    )
    db.add(case)
    db.commit()
    db.refresh(case)
    
    mock_diag = AIDiagnosisResponse(
        root_cause=RootCauseEnum.hard_payment_decline,
        confidence=0.99,
        recommended_action=RecommendedActionEnum.stop
    )
    
    with patch("app.services.orchestrator.AIDiagnosisService.diagnose", return_value=mock_diag):
        processed = WorkflowOrchestrator.process_case(db, case)
        assert processed.final_action == "stop"
        assert processed.status == "failed"

def test_log_audit_helper(db):
    """Test log_audit directly creates and commits an AuditLog entry with valid foreign keys."""
    merchant = db.query(Merchant).first()
    tx = Transaction(
        merchant_id=merchant.id,
        amount=50.0,
        currency="INR",
        status="failed",
        payment_method="upi"
    )
    db.add(tx)
    db.flush()
    
    case = RecoveryCase(
        transaction_id=tx.id,
        status="open",
        risk_type="failed_payment"
    )
    db.add(case)
    db.commit()
    
    WorkflowOrchestrator.log_audit(
        db, case.id, tx.id, "CUSTOM_EVENT", "TEST_ACTOR", {"key": "value"}
    )
    
    log = db.query(AuditLog).filter(
        AuditLog.recovery_case_id == case.id,
        AuditLog.event == "CUSTOM_EVENT"
    ).first()
    
    assert log is not None
    assert log.actor == "TEST_ACTOR"
    assert log.details == {"key": "value"}

def test_dispatch_async_recovery_task_stub():
    """Test that dispatch_async_recovery_task stub returns proper job ID."""
    job_id = WorkflowOrchestrator.dispatch_async_recovery_task("case_12345", priority="high")
    assert job_id == "job_stub_case_12345"
