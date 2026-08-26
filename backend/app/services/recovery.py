import logging
from sqlalchemy.orm import Session
from datetime import datetime, timezone

from app.models import RecoveryCase, Transaction, RecoveryAction, AuditLog
from app.schemas import DecisionExplanation, RecommendedActionEnum

logger = logging.getLogger(__name__)

class RecoveryEngine:
    @staticmethod
    def execute_action(
        db: Session,
        case: RecoveryCase,
        transaction: Transaction,
        decision: DecisionExplanation
    ) -> RecoveryCase:
        """
        Safely simulates executing a recovery action.
        Writes to recovery_actions, updates recovery_cases, and logs to audit_logs.
        """
        
        # 1. Create the RecoveryAction
        action_type_mapping = {
            RecommendedActionEnum.retry: "charge_retry",
            RecommendedActionEnum.send_nudge: "send_email",
            RecommendedActionEnum.human_review: "manual_review",
            RecommendedActionEnum.stop: "abort"
        }
        
        action = RecoveryAction(
            recovery_case_id=case.id,
            action_type=action_type_mapping.get(decision.decision, "unknown"),
            status="pending"
        )
        db.add(action)
        db.flush() # Get action.id without committing
        
        action_result_status = "failed"
        recovered_amount = 0.0
        
        # 2. Simulate the action deterministically
        if decision.decision == RecommendedActionEnum.retry:
            # Deterministic simulation: If amount is even, it succeeds. If odd, it fails.
            if int(transaction.amount) % 2 == 0:
                action_result_status = "completed"
                case.status = "recovered"
                recovered_amount = float(transaction.amount)
            else:
                action_result_status = "failed"
                case.status = "failed"
                
        elif decision.decision == RecommendedActionEnum.send_nudge:
            # Nudges always successfully "send" in simulation
            action_result_status = "completed"
            # We treat the nudge success as recovery for simulation purposes
            case.status = "recovered" 
            recovered_amount = float(transaction.amount) 
            
        elif decision.decision == RecommendedActionEnum.human_review:
            action_result_status = "completed"
            case.status = "pending_human_review"
            
        elif decision.decision == RecommendedActionEnum.stop:
            action_result_status = "completed"
            case.status = "failed"
            
        # 3. Update Action status
        action.status = action_result_status
        action.updated_at = datetime.now(timezone.utc)
        
        # 4. Update Case final action
        case.final_action = decision.decision.value
        case.updated_at = datetime.now(timezone.utc)
        
        # Audit Logging is now handled centrally by WorkflowOrchestrator
        
        db.commit()
        db.refresh(case)
        
        logger.info(f"RecoveryEngine executed {decision.decision.value} for Case {case.id}. Status -> {case.status}")
        return case
