import pytest
from app.models import RecoveryCase, Transaction, SafetyPolicy
from app.schemas import AIDiagnosisResponse, RootCauseEnum, RecommendedActionEnum
from app.services.decision import DecisionEngine

@pytest.fixture
def base_data():
    tx = Transaction(amount=100.0, currency="INR")
    case = RecoveryCase(signals={"recent_failures_count": 0})
    rules = [
        SafetyPolicy(rule_type="MAX_RETRIES", rule_value={"max_retries": 3}),
        SafetyPolicy(rule_type="HUMAN_APPROVAL_THRESHOLD", rule_value={"threshold": 1000.0}),
        SafetyPolicy(rule_type="FRAUD_FLAG", rule_value={"is_fraud": False})
    ]
    return tx, case, rules

def test_rule_fraud_flag_overrides_ai(base_data):
    tx, case, rules = base_data
    # Flag as fraud
    rules[2].rule_value = {"is_fraud": True}
    
    # AI says retry
    ai_diag = AIDiagnosisResponse(
        root_cause=RootCauseEnum.temporary_payment_failure,
        confidence=0.9,
        recommended_action=RecommendedActionEnum.retry
    )
    
    decision = DecisionEngine.evaluate(case, tx, ai_diag, rules)
    assert decision.decision == RecommendedActionEnum.stop
    assert decision.rule == "FRAUD_FLAG"

def test_rule_max_retries_overrides_ai(base_data):
    tx, case, rules = base_data
    # Set retry count to 3 (which hits the limit)
    case.signals = {"recent_failures_count": 3}
    
    # AI ignores the limit and says retry
    ai_diag = AIDiagnosisResponse(
        root_cause=RootCauseEnum.temporary_payment_failure,
        confidence=0.9,
        recommended_action=RecommendedActionEnum.retry
    )
    
    decision = DecisionEngine.evaluate(case, tx, ai_diag, rules)
    assert decision.decision == RecommendedActionEnum.stop
    assert decision.rule == "MAX_RETRIES"

def test_rule_high_amount_overrides_ai(base_data):
    tx, case, rules = base_data
    # Set amount to exceed 1000.0 threshold
    tx.amount = 5000.0
    
    # AI says retry
    ai_diag = AIDiagnosisResponse(
        root_cause=RootCauseEnum.temporary_payment_failure,
        confidence=0.9,
        recommended_action=RecommendedActionEnum.retry
    )
    
    decision = DecisionEngine.evaluate(case, tx, ai_diag, rules)
    assert decision.decision == RecommendedActionEnum.human_review
    assert decision.rule == "HUMAN_APPROVAL_THRESHOLD"

def test_rule_hard_decline_forced_stop(base_data):
    tx, case, rules = base_data
    
    # AI hallucinates a nudge on a hard decline
    ai_diag = AIDiagnosisResponse(
        root_cause=RootCauseEnum.hard_payment_decline,
        confidence=0.9,
        recommended_action=RecommendedActionEnum.send_nudge
    )
    
    decision = DecisionEngine.evaluate(case, tx, ai_diag, rules)
    assert decision.decision == RecommendedActionEnum.stop
    assert decision.rule == "HARD_DECLINE_POLICY"

def test_rule_temporary_failure_allowed(base_data):
    tx, case, rules = base_data
    
    # Valid normal flow
    ai_diag = AIDiagnosisResponse(
        root_cause=RootCauseEnum.temporary_payment_failure,
        confidence=0.9,
        recommended_action=RecommendedActionEnum.retry
    )
    
    decision = DecisionEngine.evaluate(case, tx, ai_diag, rules)
    assert decision.decision == RecommendedActionEnum.retry
    assert decision.rule == "TEMPORARY_FAILURE_POLICY"

def test_rule_checkout_abandonment(base_data):
    tx, case, rules = base_data
    
    # Valid normal flow
    ai_diag = AIDiagnosisResponse(
        root_cause=RootCauseEnum.checkout_abandonment,
        confidence=0.9,
        recommended_action=RecommendedActionEnum.send_nudge
    )
    
    decision = DecisionEngine.evaluate(case, tx, ai_diag, rules)
    assert decision.decision == RecommendedActionEnum.send_nudge
    assert decision.rule == "ABANDONMENT_POLICY"
    
def test_rule_unknown_cause_human_review(base_data):
    tx, case, rules = base_data
    
    # AI doesn't know, recommends stop
    ai_diag = AIDiagnosisResponse(
        root_cause=RootCauseEnum.unknown,
        confidence=0.1,
        recommended_action=RecommendedActionEnum.stop
    )
    
    # We force human review on unknown causes regardless of AI rec
    decision = DecisionEngine.evaluate(case, tx, ai_diag, rules)
    assert decision.decision == RecommendedActionEnum.human_review
    assert decision.rule == "UNKNOWN_CAUSE_POLICY"

def test_rule_threshold_boundary_exact_amount(base_data):
    tx, case, rules = base_data
    # Exactly 1000.0 is <= 1000.0, so it should NOT trigger HUMAN_APPROVAL_THRESHOLD
    tx.amount = 1000.0
    ai_diag = AIDiagnosisResponse(
        root_cause=RootCauseEnum.temporary_payment_failure,
        confidence=0.9,
        recommended_action=RecommendedActionEnum.retry
    )
    decision = DecisionEngine.evaluate(case, tx, ai_diag, rules)
    assert decision.decision == RecommendedActionEnum.retry
    assert decision.rule == "TEMPORARY_FAILURE_POLICY"

def test_rule_null_signals_and_empty_rules():
    tx = Transaction(amount=50.0, currency="INR")
    case = RecoveryCase(signals=None)
    rules = []
    ai_diag = AIDiagnosisResponse(
        root_cause=RootCauseEnum.temporary_payment_failure,
        confidence=0.9,
        recommended_action=RecommendedActionEnum.retry
    )
    decision = DecisionEngine.evaluate(case, tx, ai_diag, rules)
    assert decision.decision == RecommendedActionEnum.retry
    assert decision.rule == "TEMPORARY_FAILURE_POLICY"

def test_rule_repeated_failure_passthrough(base_data):
    tx, case, rules = base_data
    ai_diag = AIDiagnosisResponse(
        root_cause=RootCauseEnum.repeated_failure,
        confidence=0.85,
        recommended_action=RecommendedActionEnum.human_review
    )
    decision = DecisionEngine.evaluate(case, tx, ai_diag, rules)
    assert decision.decision == RecommendedActionEnum.human_review
    assert decision.rule == "AI_PASSTHROUGH"

