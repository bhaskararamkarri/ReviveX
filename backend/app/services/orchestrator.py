from sqlalchemy.orm import Session
from app.models import RecoveryCase, Transaction, AuditLog, SafetyPolicy
from app.services.diagnosis import AIDiagnosisService
from app.services.decision import DecisionEngine
from app.services.recovery import RecoveryEngine
import logging

logger = logging.getLogger(__name__)

class WorkflowOrchestrator:
    @staticmethod
    def log_audit(db: Session, case_id: str, transaction_id: str, event: str, actor: str, details: dict):
        log = AuditLog(
            recovery_case_id=case_id,
            transaction_id=transaction_id,
            event=event,
            actor=actor,
            details=details
        )
        db.add(log)
        db.commit()

    @staticmethod
    def process_case(db: Session, case: RecoveryCase) -> RecoveryCase | None:
        transaction = db.query(Transaction).filter(Transaction.id == case.transaction_id).first()
        if not transaction:
            return None
            
        # Ensure risk_amount is explicitly set to the transaction amount
        if case.risk_amount is None or case.risk_amount != transaction.amount:
            case.risk_amount = transaction.amount
            db.commit()
            
        # Log DETECTED
        WorkflowOrchestrator.log_audit(
            db, case.id, transaction.id, "DETECTED", "SYSTEM", 
            {"risk_type": case.risk_type, "signals": case.signals}
        )
        
        # 1. Diagnose
        diagnosis = AIDiagnosisService.diagnose(case, transaction)
        
        case.diagnosed_root_cause = diagnosis.root_cause.value if hasattr(diagnosis.root_cause, 'value') else diagnosis.root_cause
        case.confidence_score = diagnosis.confidence
        case.recommended_action = diagnosis.recommended_action.value if hasattr(diagnosis.recommended_action, 'value') else diagnosis.recommended_action
        db.commit()
        
        # Log DIAGNOSED
        WorkflowOrchestrator.log_audit(
            db, case.id, transaction.id, "DIAGNOSED", "LLM", 
            {"root_cause": case.diagnosed_root_cause, "confidence": float(case.confidence_score) if case.confidence_score is not None else 0.0, "recommended_action": case.recommended_action}
        )
        
        # 2. Decide
        rules = db.query(SafetyPolicy).all()
        decision = DecisionEngine.evaluate(case, transaction, diagnosis, rules)
        
        final_action_val = decision.decision.value if hasattr(decision.decision, 'value') else decision.decision
        case.final_action = final_action_val
        db.commit()
        
        # Log DECIDED
        WorkflowOrchestrator.log_audit(
            db, case.id, transaction.id, "DECIDED", "SYSTEM", 
            {"decision": final_action_val, "rule": decision.rule, "reason": decision.reason}
        )
        
        # Log ACTION_EXECUTED
        WorkflowOrchestrator.log_audit(
            db, case.id, transaction.id, "ACTION_EXECUTED", "SYSTEM", 
            {"action": final_action_val}
        )

        # 3. Act
        RecoveryEngine.execute_action(db, case, transaction, decision)
        
        # Log OUTCOME_RECORDED
        WorkflowOrchestrator.log_audit(
            db, case.id, transaction.id, "OUTCOME_RECORDED", "SYSTEM", 
            {"result": case.status, "recovered_amount": float(transaction.amount) if case.status == "recovered" else 0.0}
        )

        logger.info(f"Processed case {case.id} completely.")
        return case

    @staticmethod
    def dispatch_async_recovery_task(case_id: str, priority: str = "default") -> str:
        """
        SCALE / PRODUCTION LOAD STUB:
        Dispatches recovery case processing to an asynchronous task worker pool
        (e.g., Celery / Redis Queue / AWS SQS / Redis Streams).
        
        Decouples inbound webhook ingestion (POST /api/webhooks/razorpay) from 
        heavyweight LLM diagnosis and payment link creation, preventing gateway timeouts 
        and connection pool exhaustion under 10,000+ RPM traffic spikes.
        """
        # TODO: Production Distributed Queue Implementation:
        # from app.workers.celery_app import recovery_worker_task
        # job = recovery_worker_task.apply_async(args=[case_id], queue=priority)
        # return job.id
        
        logger.info(f"[ASYNC_QUEUE_DISPATCH] Queued Case {case_id} to background worker pool (queue={priority})")
        return f"job_stub_{case_id}"
