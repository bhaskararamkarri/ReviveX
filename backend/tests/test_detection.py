import pytest
from datetime import datetime, timedelta
from app.database import Base, engine, SessionLocal
from app.models import Merchant, Transaction, RecoveryCase
from app.services.detection import DetectionEngine

@pytest.fixture(scope="module")
def db():
    # Because we're connected to the live Supabase for MVP, we won't drop everything. 
    # We will just yield the session and clean up the test merchant at the end.
    session = SessionLocal()
    
    # Create test merchant
    merchant = Merchant(name="Test Detection Merchant", email="test@detection.com")
    session.add(merchant)
    session.commit()
    session.refresh(merchant)
    
    yield session
    
    # Teardown
    # Find all transactions for this merchant
    txs = session.query(Transaction).filter(Transaction.merchant_id == merchant.id).all()
    tx_ids = [tx.id for tx in txs]
    
    if tx_ids:
        session.query(RecoveryCase).filter(RecoveryCase.transaction_id.in_(tx_ids)).delete(synchronize_session=False)
        session.query(Transaction).filter(Transaction.merchant_id == merchant.id).delete(synchronize_session=False)
        
    session.query(Merchant).filter(Merchant.id == merchant.id).delete(synchronize_session=False)
    session.commit()
    session.close()


def test_successful_payment(db):
    merchant = db.query(Merchant).filter(Merchant.name == "Test Detection Merchant").first()
    tx = Transaction(
        merchant_id=merchant.id,
        amount=100.00,
        status="success",
        payment_method="card"
    )
    db.add(tx)
    db.commit()
    
    case = DetectionEngine.detect_risk(db, tx)
    assert case is None, "Successful payments should not generate a recovery case"

def test_checkout_abandonment(db):
    merchant = db.query(Merchant).filter(Merchant.name == "Test Detection Merchant").first()
    tx = Transaction(
        merchant_id=merchant.id,
        amount=50.00,
        status="abandoned",
        payment_method="upi"
    )
    db.add(tx)
    db.commit()
    
    case = DetectionEngine.detect_risk(db, tx)
    assert case is not None
    assert case.risk_type == "checkout_abandonment"
    assert case.risk_amount == 50.00

def test_temporary_failure(db):
    merchant = db.query(Merchant).filter(Merchant.name == "Test Detection Merchant").first()
    tx = Transaction(
        merchant_id=merchant.id,
        amount=75.00,
        status="failed",
        payment_method="card",
        error_code="INSUFFICIENT_FUNDS",
        created_at=datetime.utcnow() - timedelta(days=5)
    )
    db.add(tx)
    db.commit()
    
    case = DetectionEngine.detect_risk(db, tx)
    assert case is not None
    assert case.risk_type == "failed_payment"
    assert case.signals["error_code"] == "INSUFFICIENT_FUNDS"

def test_hard_decline(db):
    merchant = db.query(Merchant).filter(Merchant.name == "Test Detection Merchant").first()
    tx = Transaction(
        merchant_id=merchant.id,
        amount=200.00,
        status="failed",
        payment_method="netbanking",
        error_code="DO_NOT_HONOR",
        created_at=datetime.utcnow() - timedelta(days=5)
    )
    db.add(tx)
    db.commit()
    
    case = DetectionEngine.detect_risk(db, tx)
    assert case is not None
    assert case.risk_type == "failed_payment"
    assert case.signals["error_code"] == "DO_NOT_HONOR"

def test_repeated_failure(db):
    merchant = db.query(Merchant).filter(Merchant.name == "Test Detection Merchant").first()
    now = datetime.utcnow()
    
    # First failure
    tx1 = Transaction(
        merchant_id=merchant.id,
        amount=150.00,
        status="failed",
        payment_method="card",
        error_code="TEMPORARY_HOLD",
        created_at=now - timedelta(hours=2)
    )
    db.add(tx1)
    db.commit()
    
    DetectionEngine.detect_risk(db, tx1)
    
    # Second failure (same amount, method, and recent)
    tx2 = Transaction(
        merchant_id=merchant.id,
        amount=150.00,
        status="failed",
        payment_method="card",
        error_code="TEMPORARY_HOLD",
        created_at=now - timedelta(hours=1)
    )
    db.add(tx2)
    db.commit()
    
    case2 = DetectionEngine.detect_risk(db, tx2)
    
    assert case2 is not None
    assert case2.risk_type == "repeated_failure"
    assert case2.signals["recent_failures_count"] == 1
