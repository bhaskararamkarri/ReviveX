import pytest
from datetime import datetime, timedelta
from uuid import uuid4
from app.database import SessionLocal
from app.models import Merchant, Transaction, RecoveryCase
from app.services.detection import DetectionEngine

@pytest.fixture(scope="module")
def db():
    session = SessionLocal()
    
    merchant = Merchant(name="Test Integrity Merchant", email="integrity@test.com")
    session.add(merchant)
    session.commit()
    session.refresh(merchant)
    
    yield session
    
    # Teardown
    txs = session.query(Transaction).filter(Transaction.merchant_id == merchant.id).all()
    tx_ids = [tx.id for tx in txs]
    session.query(RecoveryCase).filter(RecoveryCase.transaction_id.in_(tx_ids)).delete(synchronize_session=False)
    session.query(Transaction).filter(Transaction.merchant_id == merchant.id).delete(synchronize_session=False)
    session.delete(merchant)
    session.commit()
    session.close()

def test_detection_engine_idempotency(db):
    merchant = db.query(Merchant).filter(Merchant.email == "integrity@test.com").first()
    
    transaction = Transaction(
        merchant_id=merchant.id,
        amount=100.0,
        currency="INR",
        status="failed",
        payment_method="card",
        error_code="INSUFFICIENT_FUNDS",
        created_at=datetime.utcnow()
    )
    db.add(transaction)
    db.commit()
    
    # 1. First run should create a case
    case1 = DetectionEngine.detect_risk(db, transaction)
    assert case1 is not None
    assert case1.status == "open"
    assert case1.transaction_id == transaction.id
    
    initial_case_id = case1.id
    
    # 2. Second run should return the same case
    case2 = DetectionEngine.detect_risk(db, transaction)
    assert case2 is not None
    assert case2.id == initial_case_id
    
    # Verify no duplicates were created
    total_cases = db.query(RecoveryCase).filter(RecoveryCase.transaction_id == transaction.id).count()
    assert total_cases == 1

def test_risk_amount_is_populated(db):
    merchant = db.query(Merchant).filter(Merchant.email == "integrity@test.com").first()
    
    transaction = Transaction(
        merchant_id=merchant.id,
        amount=250.50,
        currency="INR",
        status="abandoned",
        payment_method="upi",
        created_at=datetime.utcnow()
    )
    db.add(transaction)
    db.commit()
    
    case = DetectionEngine.detect_risk(db, transaction)
    assert case is not None
    assert float(case.risk_amount) == float(transaction.amount)
