import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
import hmac
import hashlib
import json
import uuid

from app.main import app
from app.models import Transaction, RecoveryCase, Merchant, WebhookEvent
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
    event_id = f"evt_{uuid.uuid4()}"
    response = client.post(
        "/api/webhooks/razorpay",
        json=payload,
        headers={"x-razorpay-signature": "invalid_signature", "x-razorpay-event-id": event_id}
    )
    assert response.status_code == 401
    assert response.json()["detail"] == "Invalid signature"

def test_razorpay_webhook_malformed_payload():
    secret = "test_secret"
    payload_str = "not_a_json"
    signature = generate_signature(payload_str, secret)
    event_id = f"evt_{uuid.uuid4()}"
    
    response = client.post(
        "/api/webhooks/razorpay",
        data=payload_str,
        headers={"x-razorpay-signature": signature, "Content-Type": "application/json", "x-razorpay-event-id": event_id}
    )
    assert response.status_code == 400
    assert response.json()["detail"] == "Invalid JSON"

def test_razorpay_webhook_unsupported_event():
    payload = {"event": "payment.dispute.created"}
    payload_str = json.dumps(payload, separators=(',', ':'))
    secret = "test_secret"
    signature = generate_signature(payload_str, secret)
    event_id = f"evt_{uuid.uuid4()}"
    
    response = client.post(
        "/api/webhooks/razorpay",
        data=payload_str,
        headers={"x-razorpay-signature": signature, "Content-Type": "application/json", "x-razorpay-event-id": event_id}
    )
    
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ignored"
    assert data["reason"] == "unsupported event"

def test_razorpay_webhook_valid_signature_and_idempotency():
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
                    "amount": 50000,
                    "currency": "INR",
                    "status": "failed",
                    "method": "card",
                    "error_code": "BAD_REQUEST_ERROR",
                    "error_description": "Payment processing failed"
                }
            }
        }
    }
    
    payload_str = json.dumps(payload, separators=(',', ':'))
    secret = "test_secret"
    signature = generate_signature(payload_str, secret)
    event_id = f"evt_idemp_{uuid.uuid4()}"
    
    # First Request
    response1 = client.post(
        "/api/webhooks/razorpay",
        data=payload_str,
        headers={"x-razorpay-signature": signature, "Content-Type": "application/json", "x-razorpay-event-id": event_id}
    )
    
    assert response1.status_code == 200
    data1 = response1.json()
    assert data1["status"] == "processed"
    assert data1["case_created"] is True
    
    # Second Request (Duplicate Event)
    response2 = client.post(
        "/api/webhooks/razorpay",
        data=payload_str,
        headers={"x-razorpay-signature": signature, "Content-Type": "application/json", "x-razorpay-event-id": event_id}
    )
    
    assert response2.status_code == 200
    data2 = response2.json()
    assert data2["status"] == "ignored"
    assert data2["reason"] == "duplicate event"
    
    # Verify DB
    db = SessionLocal()
    tx = db.query(Transaction).filter(Transaction.id == "pay_TESTRAZORPAY123").first()
    assert tx is not None
    assert tx.amount == 500.0
    assert tx.status == "failed"
    
    case = db.query(RecoveryCase).filter(RecoveryCase.transaction_id == "pay_TESTRAZORPAY123").first()
    assert case is not None
    
    webhook = db.query(WebhookEvent).filter(WebhookEvent.id == event_id).first()
    assert webhook is not None
    
    db.close()
