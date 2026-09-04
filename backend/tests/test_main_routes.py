import pytest
import uuid
import json
from fastapi.testclient import TestClient
from unittest.mock import patch, MagicMock
from app.main import app
from app.models import Merchant, Transaction, RecoveryCase, SafetyPolicy, Incident, RecoveryBatch, AuditLog
from app.database import SessionLocal, get_db

client = TestClient(app)

@pytest.fixture(scope="module", autouse=True)
def setup_test_data():
    db = SessionLocal()
    merchant = db.query(Merchant).first()
    if not merchant:
        merchant = Merchant(id="merch_test_routes", name="Test Merchant", email="test@routes.com")
        db.add(merchant)
        db.commit()
        db.refresh(merchant)
    
    # Ensure test transaction
    tx = db.query(Transaction).filter(Transaction.id == "tx_route_test_001").first()
    if not tx:
        tx = Transaction(
            id="tx_route_test_001",
            merchant_id=merchant.id,
            amount=1200.0,
            currency="INR",
            status="failed",
            payment_method="upi",
            error_code="GATEWAY_TIMEOUT",
            error_description="Bank switch timeout"
        )
        db.add(tx)
        db.flush()
    
    # Ensure test case
    case = db.query(RecoveryCase).filter(RecoveryCase.id == "case_route_test_001").first()
    if not case:
        case = RecoveryCase(
            id="case_route_test_001",
            transaction_id=tx.id,
            status="open",
            risk_type="failed_payment",
            risk_amount=1200.0,
            diagnosed_root_cause="temporary_payment_failure",
            confidence_score=0.9,
            recommended_action="retry",
            final_action="retry"
        )
        db.add(case)
    
    # Ensure test incident
    incident = db.query(Incident).filter(Incident.id == "inc_route_test_001").first()
    if not incident:
        incident = Incident(
            id="inc_route_test_001",
            merchant_id=merchant.id,
            type="GATEWAY_DEGRADATION",
            severity="MEDIUM",
            status="OPEN",
            message="UPI Gateway Degradation"
        )
        db.add(incident)
        
    db.commit()
    db.close()

def test_read_root():
    response = client.get("/")
    assert response.status_code == 200
    assert "ReviveX" in response.json()["message"]

def test_health_check_success():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"

def test_dashboard_stats():
    response = client.get("/api/dashboard/stats")
    assert response.status_code == 200
    data = response.json()
    assert "revenue_at_risk" in data
    assert "revenue_recovered" in data
    assert "recovery_rate" in data
    assert "cases_processed" in data

def test_dashboard_breakdown():
    response = client.get("/api/dashboard/breakdown")
    assert response.status_code == 200
    data = response.json()
    assert "root_causes" in data
    assert "actions" in data

def test_get_cases_with_filters():
    response = client.get("/api/cases?limit=10&skip=0")
    assert response.status_code == 200
    assert isinstance(response.json(), list)

def test_get_case_detail_existing():
    response = client.get("/api/cases/case_route_test_001")
    assert response.status_code == 200
    assert response.json()["id"] == "case_route_test_001"

def test_get_case_detail_fallback_mock():
    # Case RC-001 or RC-002 auto-generates if missing
    response = client.get("/api/cases/RC-001")
    assert response.status_code == 200
    assert response.json()["id"] == "RC-001"

def test_get_case_not_found():
    response = client.get("/api/cases/NON_EXISTENT_CASE_999999")
    assert response.status_code == 404
    assert response.json()["detail"] == "Case not found"

def test_get_investigation_endpoint():
    response = client.get("/api/investigations/RC-001")
    assert response.status_code == 200

def test_get_case_audit():
    response = client.get("/api/cases/case_route_test_001/audit")
    assert response.status_code == 200
    assert isinstance(response.json(), list)

def test_submit_human_action_retry():
    response = client.post(
        "/api/cases/case_route_test_001/action",
        json={"action": "retry", "notes": "Approved by supervisor"}
    )
    assert response.status_code == 200
    assert "authorized successfully" in response.json()["message"]

def test_submit_human_action_not_found():
    response = client.post(
        "/api/cases/NON_EXISTENT_CASE/action",
        json={"action": "retry"}
    )
    assert response.status_code == 404

def test_submit_human_action_invalid_payload():
    response = client.post(
        "/api/cases/case_route_test_001/action",
        json={"invalid_field": 123}
    )
    assert response.status_code == 422

def test_settings_get_and_put():
    get_res = client.get("/api/settings")
    assert get_res.status_code == 200
    
    update_payload = {
        "max_retries": 4,
        "human_approval_threshold": 12000.0,
        "max_discount": 10.0,
        "automatic_retry": True,
        "automatic_nudge": True
    }
    put_res = client.put("/api/settings", json=update_payload)
    assert put_res.status_code == 200
    assert put_res.json()["max_retries"] == 4

def test_settings_test_ai():
    response = client.post("/api/settings/test-ai")
    assert response.status_code == 200
    assert response.json()["status"] in ["success", "error"]

def test_settings_test_webhook():
    response = client.post("/api/settings/test-webhook")
    assert response.status_code == 200
    assert response.json()["status"] == "success"

def test_incidents_list_and_detail():
    list_res = client.get("/api/incidents")
    assert list_res.status_code == 200
    assert isinstance(list_res.json(), list)
    
    detail_res = client.get("/api/incidents/inc_route_test_001")
    assert detail_res.status_code == 200
    
    not_found_res = client.get("/api/incidents/NON_EXISTENT_INCIDENT")
    assert not_found_res.status_code == 404

def test_incident_actions():
    # Resolve action
    resolve_res = client.post(
        "/api/incidents/inc_route_test_001/action",
        json={"action": "resolve"}
    )
    assert resolve_res.status_code == 200
    assert resolve_res.json()["status"] == "success"
    
    # 404 action
    res_404 = client.post(
        "/api/incidents/UNKNOWN_INCIDENT/action",
        json={"action": "resolve"}
    )
    assert res_404.status_code == 404

def test_transactions_list_and_detail():
    list_res = client.get("/api/transactions?limit=5")
    assert list_res.status_code == 200
    data = list_res.json()
    assert "total" in data
    assert "transactions" in data
    
    detail_res = client.get("/api/transactions/tx_route_test_001")
    assert detail_res.status_code == 200
    assert detail_res.json()["id"] == "tx_route_test_001"
    
    not_found = client.get("/api/transactions/TX_UNKNOWN_999")
    assert not_found.status_code == 404

def test_audit_logs_endpoint():
    res = client.get("/api/audit?limit=10")
    assert res.status_code == 200
    assert isinstance(res.json(), list)

def test_batches_endpoints():
    list_res = client.get("/api/batches")
    assert list_res.status_code == 200
    
    create_res = client.post("/api/batches/create")
    assert create_res.status_code == 200
    batch_id = create_res.json()["batch_id"]
    
    cb_res = client.post(f"/api/batches/{batch_id}/trigger-circuit-breaker")
    assert cb_res.status_code == 200
    assert cb_res.json()["circuit_breaker_triggered"] is True

def test_ai_assistant_chat_keywords():
    # Test different branch queries
    queries = [
        "What is the revenue at risk?",
        "How many transactions are recoverable?",
        "What is the root cause of failures?",
        "Which bank is affected?",
        "What safety policies are in place?",
        "How much revenue was recovered?",
        "What is the recommended next action?",
        "General status report"
    ]
    for q in queries:
        res = client.post("/api/ai-assistant/chat", json={"message": q})
        assert res.status_code == 200
        data = res.json()
        assert "reply" in data
        assert len(data["suggested_actions"]) > 0

def test_simulator_run_endpoint():
    # Valid payload
    payload = {
        "scenario": "temporary_failure",
        "amount": 1500.0,
        "retry_count": 0,
        "fraud_flag": False
    }
    res = client.post("/api/simulator/run", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert data["scenario"] == "temporary_failure"
    assert len(data["traces"]) > 0
    
    # Invalid payload (422: string for float amount)
    invalid_res = client.post("/api/simulator/run", json={"scenario": "temporary_failure", "amount": "not_a_number"})
    assert invalid_res.status_code == 422
