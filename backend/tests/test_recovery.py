import pytest
from app.models import RecoveryCase, Transaction
from app.schemas import DecisionExplanation, RecommendedActionEnum
from app.services.recovery import RecoveryEngine

@pytest.fixture
def base_case_tx():
    tx = Transaction(id="tx_123", amount=100.0, currency="INR")
    case = RecoveryCase(id="case_123", transaction_id="tx_123", status="open")
    return case, tx

def test_execute_retry_success(mocker, base_case_tx):
    case, tx = base_case_tx
    # Ensure amount is even for success simulation
    tx.amount = 100.0 
    
    decision = DecisionExplanation(
        decision=RecommendedActionEnum.retry,
        reason="Mock retry",
        rule="MOCK"
    )
    
    mock_db = mocker.MagicMock()
    
    updated_case = RecoveryEngine.execute_action(mock_db, case, tx, decision)
    
    assert updated_case.status == "simulated_success"
    assert updated_case.final_action == "retry"
    mock_db.add.assert_called()
    mock_db.commit.assert_called()

def test_execute_retry_fail(mocker, base_case_tx):
    case, tx = base_case_tx
    # Ensure amount is odd for failure simulation
    tx.amount = 101.0 
    
    decision = DecisionExplanation(
        decision=RecommendedActionEnum.retry,
        reason="Mock retry fail",
        rule="MOCK"
    )
    
    mock_db = mocker.MagicMock()
    
    updated_case = RecoveryEngine.execute_action(mock_db, case, tx, decision)
    
    assert updated_case.status == "failed"
    assert getattr(updated_case, "recovered_amount", 0.0) in [None, 0.0]
    assert updated_case.final_action == "retry"

def test_execute_send_nudge(mocker, base_case_tx):
    case, tx = base_case_tx
    
    decision = DecisionExplanation(
        decision=RecommendedActionEnum.send_nudge,
        reason="Mock nudge",
        rule="MOCK"
    )
    
    mock_db = mocker.MagicMock()
    
    updated_case = RecoveryEngine.execute_action(mock_db, case, tx, decision)
    
    assert updated_case.status == "simulated_success"
    assert updated_case.final_action == "send_nudge"

def test_execute_human_approval(mocker, base_case_tx):
    case, tx = base_case_tx
    
    decision = DecisionExplanation(
        decision=RecommendedActionEnum.human_review,
        reason="Mock human review",
        rule="MOCK"
    )
    
    mock_db = mocker.MagicMock()
    
    updated_case = RecoveryEngine.execute_action(mock_db, case, tx, decision)
    
    assert updated_case.status == "pending_human_review"
    assert updated_case.final_action == "human_review"

def test_execute_stop(mocker, base_case_tx):
    case, tx = base_case_tx
    
    decision = DecisionExplanation(
        decision=RecommendedActionEnum.stop,
        reason="Mock stop",
        rule="MOCK"
    )
    
    mock_db = mocker.MagicMock()
    
    updated_case = RecoveryEngine.execute_action(mock_db, case, tx, decision)
    
    assert updated_case.status == "failed"
    assert updated_case.final_action == "stop"

def test_is_live_recovery_enabled_truthy(monkeypatch):
    for val in ["true", "1", "yes", "TRUE", "Yes"]:
        monkeypatch.setenv("RAZORPAY_LIVE_RECOVERY_ENABLED", val)
        assert RecoveryEngine.is_live_recovery_enabled() is True

def test_is_live_recovery_enabled_falsy(monkeypatch):
    for val in ["false", "0", "no", "FALSE", "", "random"]:
        monkeypatch.setenv("RAZORPAY_LIVE_RECOVERY_ENABLED", val)
        assert RecoveryEngine.is_live_recovery_enabled() is False

def test_execute_live_recovery_success(mocker, monkeypatch, base_case_tx):
    case, tx = base_case_tx
    monkeypatch.setenv("RAZORPAY_LIVE_RECOVERY_ENABLED", "true")
    
    decision = DecisionExplanation(
        decision=RecommendedActionEnum.retry,
        reason="Test live retry",
        rule="POLICY"
    )
    
    mock_db = mocker.MagicMock()
    mocker.patch(
        "app.services.razorpay.RazorpayWebhookService.create_payment_link",
        return_value={"id": "plink_test_live_123", "short_url": "https://rzp.io/i/test", "status": "created"}
    )
    
    updated_case = RecoveryEngine.execute_action(mock_db, case, tx, decision)
    assert updated_case.status == "open"
    assert updated_case.final_action == "retry"

def test_execute_live_recovery_exception_fallback(mocker, monkeypatch, base_case_tx):
    case, tx = base_case_tx
    tx.amount = 100.0  # even -> simulated_success on fallback
    monkeypatch.setenv("RAZORPAY_LIVE_RECOVERY_ENABLED", "true")
    
    decision = DecisionExplanation(
        decision=RecommendedActionEnum.retry,
        reason="Test live retry with error",
        rule="POLICY"
    )
    
    mock_db = mocker.MagicMock()
    mocker.patch(
        "app.services.razorpay.RazorpayWebhookService.create_payment_link",
        side_effect=Exception("Gateway Network Timeout")
    )
    
    updated_case = RecoveryEngine.execute_action(mock_db, case, tx, decision)
    # Should fallback to dry run simulation
    assert updated_case.status == "simulated_success"
    assert updated_case.final_action == "retry"

