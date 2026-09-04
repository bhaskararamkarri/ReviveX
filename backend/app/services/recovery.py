import os
import logging
from sqlalchemy.orm import Session
from datetime import datetime, timezone
from typing import Dict, Any

from app.models import RecoveryCase, Transaction, RecoveryAction, AuditLog
from app.schemas import DecisionExplanation, RecommendedActionEnum
from app.services.razorpay import RazorpayWebhookService

logger = logging.getLogger(__name__)

class RecoveryEngine:
    @staticmethod
    def is_live_recovery_enabled() -> bool:
        """
        Determines whether real Razorpay Test-Mode Payment Link creation is active.
        Defaults strictly to False to guarantee safety.
        """
        flag = os.getenv("RAZORPAY_LIVE_RECOVERY_ENABLED", "false").lower()
        return flag in ["true", "1", "yes"]

    @staticmethod
    def execute_action(
        db: Session,
        case: RecoveryCase,
        transaction: Transaction,
        decision: DecisionExplanation
    ) -> RecoveryCase:
        """
        Executes a recovery action.
        If RAZORPAY_LIVE_RECOVERY_ENABLED=true and credentials are valid test keys,
        creates a real Razorpay Payment Link (status -> in_progress).
        Otherwise, safely executes dry-run simulation mode.
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
            status="pending",
            action_details={}
        )
        db.add(action)
        db.flush() # Get action.id without committing
        
        action_result_status = "failed"
        action_details: Dict[str, Any] = {}
        
        # 2. Check for Real Razorpay Test-Mode Recovery
        live_recovery = RecoveryEngine.is_live_recovery_enabled()
        
        if live_recovery and decision.decision in [RecommendedActionEnum.retry, RecommendedActionEnum.send_nudge]:
            try:
                logger.info(f"Executing LIVE Razorpay Test-Mode Recovery for Case {case.id}")
                plink_res = RazorpayWebhookService.create_payment_link(
                    amount=float(transaction.amount),
                    currency=transaction.currency or "INR",
                    reference_id=case.id,
                    description=f"ReviveX Recovery for Tx {transaction.id}",
                    notes={
                        "revivex_case_id": case.id,
                        "transaction_id": transaction.id,
                        "action": decision.decision.value
                    }
                )
                action_result_status = "link_created"
                action_details = {
                    "mode": "live_test",
                    "payment_link_id": plink_res.get("id"),
                    "short_url": plink_res.get("short_url"),
                    "created_at": datetime.now(timezone.utc).isoformat()
                }
                case.status = "open"
                logger.info(f"Live Razorpay Payment Link generated: {plink_res.get('short_url')}")
            except Exception as exc:
                logger.error(f"Live Razorpay Payment Link creation failed: {exc}. Falling back to dry-run simulation.")
                action_details = {"mode": "fallback_simulation", "error": str(exc)}
                live_recovery = False # Proceed to simulation fallback
                
        # 3. Dry-Run Simulation Mode (Default & Fallback)
        if not live_recovery:
            action_details["mode"] = "dry_run_simulation"
            
            if decision.decision == RecommendedActionEnum.retry:
                # Deterministic simulation: If amount is even, it succeeds. If odd, it fails.
                if int(transaction.amount) % 2 == 0:
                    action_result_status = "simulated_success"
                    case.status = "simulated_success"
                else:
                    action_result_status = "failed"
                    case.status = "failed"
                    
            elif decision.decision == RecommendedActionEnum.send_nudge:
                # Nudges always successfully "send" in simulation
                action_result_status = "simulated_success"
                case.status = "simulated_success" 
                
            elif decision.decision == RecommendedActionEnum.human_review:
                action_result_status = "completed"
                case.status = "pending_human_review"
                
            elif decision.decision == RecommendedActionEnum.stop:
                action_result_status = "completed"
                case.status = "failed"
                
        # 4. Update Action status and details
        action.status = action_result_status
        action.action_details = action_details
        action.created_at = datetime.now(timezone.utc)
        
        # 5. Update Case final action
        case.final_action = decision.decision.value
        case.updated_at = datetime.now(timezone.utc)
        
        db.commit()
        db.refresh(case)
        
        logger.info(f"RecoveryEngine executed {decision.decision.value} for Case {case.id}. Status -> {case.status}")
        return case

