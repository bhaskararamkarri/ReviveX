import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
import hmac
import hashlib
import json

from app.main import app
from app.models import Transaction, RecoveryCase, Merchant
from app.database import get_db, Base, engine

client = TestClient(app)

# Test setup for DB
def override_get_db():
    from app.database import SessionLocal
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

app.dependency_overrides[get_db] = override_get_db

def generate_signature(payload_str: str, secret: str) -> str:
    return hmac.new(
        secret.encode('utf-8'),
        payload_str.encode('utf-8'),
        hashlib.sha256
    ).hexdigest()

def test_razorpay_webhook_invalid_signature():
    payload = {"event": "payment.failed"}
    response = client.post(
        "/api/webhooks/razorpay",
        json=payload,
        headers={"x-razorpay-signature": "invalid_signature"}
    )
    assert response.status_code == 400
    assert response.json()["detail"] == "Invalid signature"

def test_razorpay_webhook_valid_signature_and_pipeline():
    # Make sure a merchant exists
    from app.database import SessionLocal
    db = SessionLocal()
    if not db.query(Merchant).first():
        merchant = Merchant(name="Test Merchant")
        db.add(merchant)
        db.commit()
    db.close()

    payload = {
        "event": "payment.failed",
        "payload": {
            "payment": {
                "entity": {
                    "id": "pay_TESTRAZORPAY123",
                    "amount": 50000, # 500.00 INR
                    "currency": "INR",
                    "status": "failed",
                    "method": "card",
                    "error_code": "BAD_REQUEST_ERROR",
                    "error_description": "Payment processing failed"
                }
            }
        }
    }
    
    payload_str = json.dumps(payload, separators=(',', ':')) # Match FastAPI exact byte encoding
    # To avoid JSON encoding differences, we'll send it as bytes directly
    
    secret = "test_secret"
    signature = generate_signature(payload_str, secret)
    
    response = client.post(
        "/api/webhooks/razorpay",
        data=payload_str,
        headers={"x-razorpay-signature": signature, "Content-Type": "application/json"}
    )
    
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "processed"
    assert data["transaction_id"] == "pay_TESTRAZORPAY123"
    assert data["case_created"] is True
    
    # Verify DB
    db = SessionLocal()
    tx = db.query(Transaction).filter(Transaction.id == "pay_TESTRAZORPAY123").first()
    assert tx is not None
    assert tx.amount == 500.0
    assert tx.status == "failed"
    
    case = db.query(RecoveryCase).filter(RecoveryCase.transaction_id == "pay_TESTRAZORPAY123").first()
    assert case is not None
    assert case.risk_type == "failed_payment"
    
    db.close()
