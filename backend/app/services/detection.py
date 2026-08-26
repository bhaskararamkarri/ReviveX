import logging
from datetime import timedelta
from sqlalchemy.orm import Session
from app.models import Transaction, RecoveryCase

logger = logging.getLogger(__name__)

class DetectionEngine:
    @staticmethod
    def detect_risk(db: Session, transaction: Transaction) -> RecoveryCase | None:
        """
        Deterministically detects revenue at risk for a given transaction.
        Returns a RecoveryCase if risk is detected, else None.
        """
        # 1. Successful payments pose no risk
        if transaction.status == "success":
            return None
            
        risk_type = None
        signals = {
            "error_code": transaction.error_code,
            "payment_method": transaction.payment_method
        }
        
        # 2. Checkout Abandonment
        if transaction.status == "abandoned":
            risk_type = "checkout_abandonment"
            
        # 3. Failed Payments & Repeated Failures
        elif transaction.status == "failed":
            risk_type = "failed_payment"
            
            # Since we don't have a user_id, we use merchant_id + amount + payment_method as a proxy for the same user retrying
            recent_failures = db.query(Transaction).filter(
                Transaction.merchant_id == transaction.merchant_id,
                Transaction.status == "failed",
                Transaction.id != transaction.id,
                Transaction.amount == transaction.amount,
                Transaction.payment_method == transaction.payment_method,
                Transaction.created_at >= transaction.created_at - timedelta(hours=24)
            ).count()
            
            signals["recent_failures_count"] = recent_failures
            
            if recent_failures > 0:
                risk_type = "repeated_failure"
                
        if risk_type:
            # Idempotency check: Does an active/open case already exist?
            case = db.query(RecoveryCase).filter(
                RecoveryCase.transaction_id == transaction.id,
                RecoveryCase.status.in_(["open", "pending_human_review", "in_progress"])
            ).first()
            
            if case:
                # Update existing case
                case.risk_type = risk_type
                case.risk_amount = transaction.amount
                case.signals = signals
                logger.info(f"Updated existing risk case {case.id} for Tx {transaction.id}")
            else:
                # Create new case
                case = RecoveryCase(
                    transaction_id=transaction.id,
                    status="open",
                    risk_type=risk_type,
                    risk_amount=transaction.amount,
                    signals=signals
                )
                db.add(case)
                logger.info(f"Detected risk {risk_type} for Tx {transaction.id}. Created Case {case.id}")
                
            db.commit()
            db.refresh(case)
            return case
            
        return None
