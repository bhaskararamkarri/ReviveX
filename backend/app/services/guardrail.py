from app.schemas import AgentDiagnosis
from app.models import Transaction, SafetyPolicy, Merchant
from sqlalchemy.orm import Session
from typing import List

class GuardrailService:
    @staticmethod
    def evaluate(db: Session, transaction: Transaction, diagnosis: AgentDiagnosis) -> str:
        # 1. Fetch Merchant Rules
        rules: List[SafetyPolicy] = db.query(SafetyPolicy).filter(SafetyPolicy.merchant_id == transaction.merchant_id).all()
        rules_map = {r.rule_type: r.rule_value for r in rules}
        
        # Default fallback
        final_action = diagnosis.recommended_action
        
        # 2. Fraud Check
        if diagnosis.root_cause == "fraud_suspected" or transaction.error_code == "RISK_ELEVATED":
            fraud_rule = rules_map.get("FRAUD_FLAG", {})
            if fraud_rule.get("active", True):
                return "STOP"
                
        # 3. Threshold Check
        threshold_rule = rules_map.get("HUMAN_APPROVAL_THRESHOLD", {})
        threshold = threshold_rule.get("value", 10000)
        if transaction.amount > threshold:
            return "HUMAN_APPROVAL"
            
        # 4. Input validation
        allowed_actions = ["RETRY", "SEND_NUDGE", "HUMAN_APPROVAL", "STOP"]
        if final_action not in allowed_actions:
            return "HUMAN_APPROVAL"
            
        # 5. Retry Limit Check
        # In a real app we would check previous recovery actions
        # Mocking the limit check for the MVP based on transaction status or a random chance if it's RETRY
        if final_action == "RETRY":
            max_retries = rules_map.get("MAX_RETRIES", {}).get("value", 2)
            # Just letting RETRY pass for now, if it was real we'd count existing RETRY actions.
            
        # 6. Hard Decline
        if transaction.error_code == "INSUFFICIENT_FUNDS":
            return "STOP"
            
        return final_action
