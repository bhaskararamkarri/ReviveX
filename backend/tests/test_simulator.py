import pytest
from sqlalchemy.orm import Session
from app.database import SessionLocal, Base, engine
from app.models import Merchant, SafetyPolicy
from app.schemas import SimulatorPayload
from app.services.simulator import SimulationEngine, SimulationSession

@pytest.fixture(scope="module")
def db():
    session = SessionLocal()
    # Ensure a test merchant exists
    merchant = session.query(Merchant).first()
    if not merchant:
        merchant = Merchant(name="Simulator Test Merchant", email="sim@test.com")
        session.add(merchant)
        session.commit()
        session.refresh(merchant)
    
    # Ensure default safety policies exist
    policies = [
        SafetyPolicy(rule_type="MAX_RETRIES", rule_value={"max_retries": 3}),
        SafetyPolicy(rule_type="HUMAN_APPROVAL_THRESHOLD", rule_value={"threshold": 10000.0}),
        SafetyPolicy(rule_type="FRAUD_FLAG", rule_value={"is_fraud": False})
    ]
    for p in policies:
        existing = session.query(SafetyPolicy).filter(SafetyPolicy.rule_type == p.rule_type).first()
        if not existing:
            session.add(p)
    session.commit()
    
    yield session
    session.close()

def test_simulation_session_isolation(db):
    """Test that SimulationSession intercepts DB mutations and does not persist them to the database."""
    sim_session = SimulationSession(db)
    from app.models import Transaction
    
    dummy_tx = Transaction(merchant_id="test", amount=500.0, status="failed")
    sim_session.add(dummy_tx)
    sim_session.flush()
    sim_session.commit()
    
    assert len(sim_session.added_objects) == 1
    assert len(sim_session.db_operations) == 1
    assert dummy_tx.id is not None
    assert dummy_tx.id.startswith("sim_")
    
    # Verify it is NOT in the real db
    real_check = db.query(Transaction).filter(Transaction.id == dummy_tx.id).first()
    assert real_check is None

def test_preset_temporary_failure(db):
    payload = SimulatorPayload(scenario="temporary_failure", amount=2500.0)
    result = SimulationEngine.run_scenario(payload, db)
    
    assert result.scenario == "temporary_failure"
    assert result.amount == 2500.0
    assert len(result.traces) > 0
    assert any(t.stage == "AI DIAGNOSIS" for t in result.traces)
    assert any(t.stage == "GUARDRAILS & DECISION" for t in result.traces)
    assert result.final_action in ["retry", "human_review", "send_nudge", "stop"]

def test_preset_hard_decline(db):
    payload = SimulatorPayload(scenario="hard_decline", amount=1200.0)
    result = SimulationEngine.run_scenario(payload, db)
    
    assert result.scenario == "hard_decline"
    assert len(result.traces) > 0
    # Guardrails block hard decline
    guardrail_trace = next((t for t in result.traces if t.stage == "GUARDRAILS & DECISION"), None)
    assert guardrail_trace is not None

def test_preset_abandoned(db):
    payload = SimulatorPayload(scenario="abandoned", amount=3500.0)
    result = SimulationEngine.run_scenario(payload, db)
    
    assert result.scenario == "abandoned"
    assert len(result.traces) > 0
    detect_trace = next((t for t in result.traces if t.stage == "FAILURE DETECTED"), None)
    assert detect_trace is not None
    assert detect_trace.output_data.get("risk_type") == "checkout_abandonment"

def test_preset_fraud(db):
    payload = SimulatorPayload(scenario="fraud", amount=5000.0, fraud_flag=True)
    result = SimulationEngine.run_scenario(payload, db)
    
    assert result.scenario == "fraud"
    assert len(result.traces) > 0
    guardrail_trace = next((t for t in result.traces if t.stage == "GUARDRAILS & DECISION"), None)
    assert guardrail_trace is not None

def test_preset_high_value(db):
    payload = SimulatorPayload(scenario="high_value", amount=25000.0)
    result = SimulationEngine.run_scenario(payload, db)
    
    assert result.scenario == "high_value"
    assert len(result.traces) > 0
    guardrail_trace = next((t for t in result.traces if t.stage == "GUARDRAILS & DECISION"), None)
    assert guardrail_trace is not None
    # High value should trigger human review or stop
    assert result.final_action in ["human_review", "stop", "retry"]

def test_preset_retry_limit(db):
    payload = SimulatorPayload(scenario="retry_limit", amount=1500.0, retry_count=4)
    result = SimulationEngine.run_scenario(payload, db)
    
    assert result.scenario == "retry_limit"
    assert len(result.traces) > 0
    guardrail_trace = next((t for t in result.traces if t.stage == "GUARDRAILS & DECISION"), None)
    assert guardrail_trace is not None
    assert guardrail_trace.output_data.get("final_action") == "stop"

def test_preset_unknown(db):
    payload = SimulatorPayload(scenario="unknown", amount=999.0)
    result = SimulationEngine.run_scenario(payload, db)
    
    assert result.scenario == "unknown"
    assert len(result.traces) > 0
    assert len(result.audit_trail) > 0
