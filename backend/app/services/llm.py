from app.schemas import AgentDiagnosis
from app.models import Transaction
import random

class LLMService:
    @staticmethod
    def diagnose(transaction: Transaction) -> AgentDiagnosis:
        # Mock LLM API call for the synthetic MVP
        
        if transaction.status == "abandoned":
            return AgentDiagnosis(
                root_cause="checkout_abandonment",
                confidence_score=0.95,
                reasoning="Customer left the checkout page without completing payment.",
                recommended_action="SEND_NUDGE"
            )
            
        if transaction.error_code == "BAD_REQUEST_ERROR":
            return AgentDiagnosis(
                root_cause="temporary_failure",
                confidence_score=0.85,
                reasoning="Payment failed due to temporary gateway timeout.",
                recommended_action="RETRY"
            )
            
        if transaction.error_code == "INSUFFICIENT_FUNDS":
            return AgentDiagnosis(
                root_cause="hard_decline",
                confidence_score=0.99,
                reasoning="Bank rejected transaction due to insufficient funds.",
                recommended_action="STOP"
            )
            
        if transaction.error_code == "RISK_ELEVATED":
            return AgentDiagnosis(
                root_cause="fraud_suspected",
                confidence_score=0.80,
                reasoning="Transaction amount is unusually high, triggering risk flag.",
                recommended_action="HUMAN_APPROVAL"
            )
            
        # Default unknown
        return AgentDiagnosis(
            root_cause="unknown",
            confidence_score=0.40,
            reasoning="Unable to definitively determine the reason for failure.",
            recommended_action="HUMAN_APPROVAL"
        )
