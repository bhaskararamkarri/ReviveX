import logging
from typing import List
from app.models import RecoveryCase, Transaction, SafetyPolicy
from app.schemas import AIDiagnosisResponse, DecisionExplanation, RecommendedActionEnum, RootCauseEnum

logger = logging.getLogger(__name__)

class DecisionEngine:
    @staticmethod
    def evaluate(
        case: RecoveryCase, 
        transaction: Transaction, 
        ai_diagnosis: AIDiagnosisResponse,
        merchant_rules: List[SafetyPolicy]
    ) -> DecisionExplanation:
        """
        Evaluates the AI diagnosis against deterministic guardrails.
        Returns the authoritative decision and explanation.
        """
        # Parse rules into a dictionary for easy access
        rules_dict = {}
        for rule in merchant_rules:
            rules_dict[rule.rule_type] = rule.rule_value
            
        # 1. fraud flagged -> STOP
        if rules_dict.get("FRAUD_FLAG", {}).get("is_fraud", False):
            return DecisionExplanation(
                decision=RecommendedActionEnum.stop,
                reason="Transaction flagged as potential fraud",
                rule="FRAUD_FLAG"
            )
            
        # 2. retry_count >= MAX_RETRIES -> STOP
        max_retries = rules_dict.get("MAX_RETRIES", {}).get("max_retries", 3)
        recent_failures = case.signals.get("recent_failures_count", 0) if case.signals else 0
        
        if recent_failures >= max_retries:
            return DecisionExplanation(
                decision=RecommendedActionEnum.stop,
                reason=f"Maximum retry count reached ({recent_failures} >= {max_retries})",
                rule="MAX_RETRIES"
            )
            
        # 3. amount > HUMAN_APPROVAL_THRESHOLD -> HUMAN_APPROVAL
        human_threshold = rules_dict.get("HUMAN_APPROVAL_THRESHOLD", {}).get("threshold", 1000.0)
        
        if float(transaction.amount) > human_threshold:
            return DecisionExplanation(
                decision=RecommendedActionEnum.human_review,
                reason=f"Amount exceeds human approval threshold ({transaction.amount} > {human_threshold})",
                rule="HUMAN_APPROVAL_THRESHOLD"
            )
            
        # 4. hard_payment_decline -> STOP
        if ai_diagnosis.root_cause == RootCauseEnum.hard_payment_decline:
            return DecisionExplanation(
                decision=RecommendedActionEnum.stop,
                reason="Hard payment declines cannot be retried",
                rule="HARD_DECLINE_POLICY"
            )
            
        # 5. unknown -> HUMAN_REVIEW
        if ai_diagnosis.root_cause == RootCauseEnum.unknown:
            return DecisionExplanation(
                decision=RecommendedActionEnum.human_review,
                reason="Root cause is unknown, requires manual review",
                rule="UNKNOWN_CAUSE_POLICY"
            )
            
        # 6. temporary_payment_failure -> RETRY
        if ai_diagnosis.root_cause == RootCauseEnum.temporary_payment_failure:
            return DecisionExplanation(
                decision=RecommendedActionEnum.retry,
                reason="Temporary failure allowed for retry",
                rule="TEMPORARY_FAILURE_POLICY"
            )
            
        # 7. checkout_abandonment -> SEND_NUDGE
        if ai_diagnosis.root_cause == RootCauseEnum.checkout_abandonment:
            return DecisionExplanation(
                decision=RecommendedActionEnum.send_nudge,
                reason="Checkout abandonment eligible for nudge",
                rule="ABANDONMENT_POLICY"
            )
            
        # Fallback 
        return DecisionExplanation(
            decision=ai_diagnosis.recommended_action,
            reason="AI recommendation passed all guardrails",
            rule="AI_PASSTHROUGH"
        )
