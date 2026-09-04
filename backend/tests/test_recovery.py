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
