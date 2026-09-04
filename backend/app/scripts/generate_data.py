import random
from datetime import datetime, timedelta
import logging
from unittest.mock import patch
from sqlalchemy.orm import Session
from app.database import engine, Base, SessionLocal
from app.models import Merchant, Transaction, RecoveryCase, SafetyPolicy
from app.services.detection import DetectionEngine
from app.services.orchestrator import WorkflowOrchestrator
from app.schemas import AIDiagnosisResponse, RootCauseEnum, RecommendedActionEnum

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def generate_synthetic_data(db: Session, num_transactions: int = 500, merchant: Merchant = None):
    logger.info("Initializing database schema...")
    Base.metadata.create_all(bind=engine)
    
    # 1. Create a synthetic merchant if none provided
    if not merchant:
        merchant = db.query(Merchant).first()
        if not merchant:
            merchant = Merchant(
                name="Acme Corp",
                email="finance@acmecorp.com"
            )
            db.add(merchant)
            db.commit()
            db.refresh(merchant)
        
        # Add basic rules
        rule = SafetyPolicy(
            merchant_id=merchant.id,
            rule_type="MAX_RETRIES",
            rule_value={"max_retries": 3}
        )
        db.add(rule)
        db.commit()
        
    logger.info(f"Using Merchant: {merchant.name} ({merchant.id})")

    # Error distribution (realistic)
    # Recoverable
    # - INSUFFICIENT_FUNDS (Often recoverable if retried on payday)
    # - TEMPORARY_HOLD (Often recoverable)
    # Non-Recoverable (Hard Declines)
    # - DO_NOT_HONOR
    # - STOLEN_CARD
    # - EXPIRED_CARD (Sometimes recoverable with account updater, but let's count as hard)
    # - FRAUD_SUSPECTED
    
    error_types = [
        {"code": "INSUFFICIENT_FUNDS", "desc": "Not enough funds in account", "is_recoverable": True},
        {"code": "TEMPORARY_HOLD", "desc": "Account temporarily frozen", "is_recoverable": True},
        {"code": "DO_NOT_HONOR", "desc": "Bank declined without specific reason", "is_recoverable": False},
        {"code": "STOLEN_CARD", "desc": "Card reported stolen", "is_recoverable": False},
        {"code": "EXPIRED_CARD", "desc": "Card has expired", "is_recoverable": False},
        {"code": "FRAUD_SUSPECTED", "desc": "Bank suspects fraud", "is_recoverable": False},
    ]
    
    # Status distribution
    # ~70% Success
    # ~25% Failed
    # ~5% Abandoned
    
    logger.info(f"Generating {num_transactions} synthetic transactions...")
    
    def mock_diagnose_factory(error_code, status):
        def mock_diagnose(case, transaction):
            # Deterministic mock based on error code
            if status == "abandoned":
                return AIDiagnosisResponse(
                    root_cause=RootCauseEnum.checkout_abandonment,
                    confidence=0.9,
                    recommended_action=RecommendedActionEnum.send_nudge
                )
            if error_code in ["INSUFFICIENT_FUNDS", "TEMPORARY_HOLD"]:
                return AIDiagnosisResponse(
                    root_cause=RootCauseEnum.temporary_payment_failure,
                    confidence=0.8,
                    recommended_action=RecommendedActionEnum.retry
                )
            if error_code in ["DO_NOT_HONOR", "STOLEN_CARD", "EXPIRED_CARD", "FRAUD_SUSPECTED"]:
                return AIDiagnosisResponse(
                    root_cause=RootCauseEnum.hard_payment_decline,
                    confidence=0.95,
                    recommended_action=RecommendedActionEnum.stop
                )
            return AIDiagnosisResponse(
                root_cause=RootCauseEnum.unknown,
                confidence=0.5,
                recommended_action=RecommendedActionEnum.human_review
            )
        return mock_diagnose
    
    start_date = datetime.utcnow() - timedelta(days=30)
    
    transactions_added = 0
    cases_added = 0
    
    for i in range(num_transactions):
        rand = random.random()
        
        if rand < 0.70:
            status = "success"
            error = None
        elif rand < 0.95:
            status = "failed"
            error = random.choices(
                error_types,
                weights=[0.3, 0.1, 0.2, 0.05, 0.2, 0.15], # Weighted towards hard declines and insufficient funds
                k=1
            )[0]
        else:
            status = "abandoned"
            error = None

        amount = round(random.uniform(10.0, 5000.0), 2)
        created_at = start_date + timedelta(days=random.uniform(0, 30))
        
        tx = Transaction(
            merchant_id=merchant.id,
            amount=amount,
            currency="INR",
            status=status,
            payment_method=random.choice(["card", "upi", "netbanking"]),
            error_code=error["code"] if error else None,
            error_description=error["desc"] if error else None,
            created_at=created_at
        )
        db.add(tx)
        db.flush()
        
        # Process through real pipeline if failed/abandoned
        if status in ["failed", "abandoned"]:
            # Mock the AI diagnosis for this specific transaction
            with patch('app.services.diagnosis.AIDiagnosisService.diagnose', side_effect=mock_diagnose_factory(error["code"] if error else None, status)):
                case = DetectionEngine.detect_risk(db, tx)
                if case:
                    WorkflowOrchestrator.process_case(db, case)
                    cases_added += 1
            
        transactions_added += 1

    db.commit()
    logger.info(f"Successfully generated {transactions_added} transactions and {cases_added} recovery cases.")

if __name__ == "__main__":
    db = SessionLocal()
    try:
        generate_synthetic_data(db, 500)
    finally:
        db.close()
