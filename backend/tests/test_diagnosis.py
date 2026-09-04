import pytest
import os
from unittest.mock import patch, MagicMock

from app.models import RecoveryCase, Transaction
from app.schemas import RootCauseEnum, RecommendedActionEnum
from app.services.diagnosis import AIDiagnosisService

@pytest.fixture
def sample_data():
    tx = Transaction(
        id="tx_123",
        amount=100.0,
        currency="INR",
        status="failed",
        payment_method="card",
        error_code="INSUFFICIENT_FUNDS"
    )
    case = RecoveryCase(
        id="case_123",
        risk_type="failed_payment",
        signals={"recent_failures_count": 0}
    )
    return case, tx

def test_diagnose_success(sample_data):
    case, tx = sample_data
    
    with patch.dict(os.environ, {"OPENROUTER_API_KEY": "dummy_key"}):
        with patch("app.services.diagnosis.OpenAI") as MockOpenAI:
            mock_client_instance = MockOpenAI.return_value
            mock_response = MagicMock()
            # Mock the nested OpenAI response structure
            mock_message = MagicMock()
            mock_message.content = '{"root_cause": "temporary_payment_failure", "confidence": 0.95, "recommended_action": "retry"}'
            mock_choice = MagicMock()
            mock_choice.message = mock_message
            mock_response.choices = [mock_choice]
            
            mock_client_instance.chat.completions.create.return_value = mock_response
            
            result = AIDiagnosisService.diagnose(case, tx)
            
            assert result.root_cause == RootCauseEnum.temporary_payment_failure
            assert result.confidence == 0.95
            assert result.recommended_action == RecommendedActionEnum.retry

def test_diagnose_api_failure_fallback(sample_data):
    case, tx = sample_data
    
    with patch.dict(os.environ, {"OPENROUTER_API_KEY": "dummy_key"}):
        with patch("app.services.diagnosis.OpenAI") as MockOpenAI:
            mock_client_instance = MockOpenAI.return_value
            # Simulate API timeout/failure
            mock_client_instance.chat.completions.create.side_effect = Exception("API Timeout")
            
            result = AIDiagnosisService.diagnose(case, tx)
            
            assert result.root_cause == RootCauseEnum.unknown
            assert result.confidence == 0.0
            assert result.recommended_action == RecommendedActionEnum.human_review

def test_diagnose_validation_failure_fallback(sample_data):
    case, tx = sample_data
    
    with patch.dict(os.environ, {"OPENROUTER_API_KEY": "dummy_key"}):
        with patch("app.services.diagnosis.OpenAI") as MockOpenAI:
            mock_client_instance = MockOpenAI.return_value
            mock_response = MagicMock()
            mock_message = MagicMock()
            # Simulate LLM returning invalid schema (e.g. wrong enum or missing field)
            mock_message.content = '{"root_cause": "not_a_real_enum", "confidence": 0.95}'
            mock_choice = MagicMock()
            mock_choice.message = mock_message
            mock_response.choices = [mock_choice]
            
            mock_client_instance.chat.completions.create.return_value = mock_response
            
            result = AIDiagnosisService.diagnose(case, tx)
            
            # Should catch ValidationError and fallback
            assert result.root_cause == RootCauseEnum.unknown
            assert result.confidence == 0.0
            assert result.recommended_action == RecommendedActionEnum.human_review

def test_diagnose_missing_api_key(sample_data):
    case, tx = sample_data
    
    # Ensure keys are not set
    with patch.dict(os.environ, {}, clear=True):
        result = AIDiagnosisService.diagnose(case, tx)
        
        assert result.root_cause == RootCauseEnum.unknown
        assert result.confidence == 0.0
        assert result.recommended_action == RecommendedActionEnum.human_review

def test_diagnose_nemotron_normalization(sample_data):
    case, tx = sample_data
    
    with patch.dict(os.environ, {"OPENROUTER_API_KEY": "dummy_key"}):
        with patch("app.services.diagnosis.OpenAI") as MockOpenAI:
            mock_client_instance = MockOpenAI.return_value
            mock_response = MagicMock()
            mock_message = MagicMock()
            # Simulate Nemotron returning leading-dot keys
            mock_message.content = '{\n  ".root_cause": "temporary_payment_failure",\n  ".confidence": 0.8,\n  ".recommended_action": "retry"\n}'
            mock_choice = MagicMock()
            mock_choice.message = mock_message
            mock_response.choices = [mock_choice]
            
            mock_client_instance.chat.completions.create.return_value = mock_response
            
            result = AIDiagnosisService.diagnose(case, tx)
            
            # The normalization layer should successfully strip the dots
            assert result.root_cause == RootCauseEnum.temporary_payment_failure
            assert result.confidence == 0.8
            assert result.recommended_action == RecommendedActionEnum.retry

def test_diagnose_nvidia_provider(sample_data):
    case, tx = sample_data
    with patch.dict(os.environ, {"AI_PROVIDER": "nvidia", "NVIDIA_API_KEY": "dummy_nv_key"}):
        with patch("app.services.diagnosis.OpenAI") as MockOpenAI:
            mock_client_instance = MockOpenAI.return_value
            mock_response = MagicMock()
            mock_message = MagicMock()
            mock_message.content = '{"root_cause": "checkout_abandonment", "confidence": 0.88, "recommended_action": "send_nudge"}'
            mock_choice = MagicMock()
            mock_choice.message = mock_message
            mock_response.choices = [mock_choice]
            mock_client_instance.chat.completions.create.return_value = mock_response
            
            result = AIDiagnosisService.diagnose(case, tx)
            assert result.root_cause == RootCauseEnum.checkout_abandonment
            assert result.confidence == 0.88
            assert result.recommended_action == RecommendedActionEnum.send_nudge
            MockOpenAI.assert_called_with(api_key="dummy_nv_key", base_url="https://integrate.api.nvidia.com/v1")

