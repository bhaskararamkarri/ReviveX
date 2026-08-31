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

def test_razorpay_create_payment_link_success(monkeypatch):
    import os
    from app.services.razorpay import RazorpayWebhookService
    from unittest.mock import MagicMock
    
    monkeypatch.setenv("RAZORPAY_KEY_ID", "rzp_test_valid123")
    monkeypatch.setenv("RAZORPAY_KEY_SECRET", "valid_secret_xyz")
    
    mock_post = MagicMock()
    mock_post.return_value.status_code = 200
    mock_post.return_value.json.return_value = {
        "id": "plink_test_999",
        "short_url": "https://rzp.io/i/test_short_url",
        "status": "created"
    }
    
    monkeypatch.setattr("httpx.Client.post", mock_post)
    
    result = RazorpayWebhookService.create_payment_link(
        amount=150.0,
        currency="INR",
        reference_id="case_abc_123",
        description="Test Recovery"
    )
    
    assert result["id"] == "plink_test_999"
    assert result["short_url"] == "https://rzp.io/i/test_short_url"
    assert result["status"] == "created"

def test_razorpay_create_payment_link_rejects_live_key(monkeypatch):
    from app.services.razorpay import RazorpayWebhookService
    import pytest
    
    # Live production key simulation
    monkeypatch.setenv("RAZORPAY_KEY_ID", "rzp_live_PROD_DANGEROUS_KEY")
    monkeypatch.setenv("RAZORPAY_KEY_SECRET", "prod_secret")
    
    with pytest.raises(ValueError, match="Safety Violation: Non-test Razorpay Key ID detected"):
        RazorpayWebhookService.create_payment_link(
            amount=500.0,
            reference_id="case_prod_attempt"
        )

def test_razorpay_payment_link_paid_webhook_settlement():
    from app.database import SessionLocal
    from app.models import RecoveryCase, Transaction, AuditLog
    
    db = SessionLocal()
    
    # 1. Create a dummy open case
    tx_id = f"tx_failed_{uuid.uuid4().hex[:8]}"
    case_id = f"case_{uuid.uuid4().hex[:8]}"
    merchant = db.query(Merchant).first()
    
    tx = Transaction(
        id=tx_id,
        merchant_id=merchant.id,
        amount=750.0,
        currency="INR",
        status="failed",
        payment_method="card"
    )
    db.add(tx)
    db.flush()
    
    case = RecoveryCase(
        id=case_id,
        transaction_id=tx.id,
        status="open",
        risk_type="failed_payment",
        risk_amount=750.0
    )
    db.add(case)
    db.commit()
    db.close()
    
    # 2. Simulate Razorpay payment_link.paid webhook event
    payload = {
        "event": "payment_link.paid",
        "payload": {
            "payment_link": {
                "entity": {
                    "id": "plink_xyz_123",
                    "amount": 75000,
                    "currency": "INR",
                    "status": "paid",
                    "reference_id": case_id,
                    "notes": {"revivex_case_id": case_id}
                }
            },
            "payment": {
                "entity": {
                    "id": f"pay_recovered_{uuid.uuid4().hex[:8]}",
                    "amount": 75000,
                    "currency": "INR",
                    "status": "captured",
                    "method": "upi"
                }
            }
        }
    }
    
    payload_str = json.dumps(payload, separators=(',', ':'))
    signature = generate_signature(payload_str, "test_secret")
    event_id = f"evt_paid_{uuid.uuid4()}"
    
    response = client.post(
        "/api/webhooks/razorpay",
        data=payload_str,
        headers={"x-razorpay-signature": signature, "Content-Type": "application/json", "x-razorpay-event-id": event_id}
    )
    
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "processed"
    assert data["case_recovered"] is True
    
    # Verify DB updated
    db = SessionLocal()
    updated_case = db.query(RecoveryCase).filter(RecoveryCase.id == case_id).first()
    assert updated_case.status == "recovered"
    
    audit = db.query(AuditLog).filter(
        AuditLog.recovery_case_id == case_id,
        AuditLog.event == "OUTCOME_RECORDED"
    ).first()
    assert audit is not None
    assert audit.actor == "RAZORPAY_WEBHOOK"
    assert audit.details["amount_recovered"] == 750.0
    db.close()

