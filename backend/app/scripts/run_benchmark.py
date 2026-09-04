import os
import json
from decimal import Decimal
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.database import SessionLocal, engine, Base
from app.models import Merchant, Transaction, RecoveryCase, SafetyPolicy, AuditLog
from app.scripts.generate_data import generate_synthetic_data

def run_benchmark():
    db = SessionLocal()
    try:
        # Patch the check constraint to support the new statuses introduced in Phase 2
        from sqlalchemy import text
        try:
            db.execute(text("ALTER TABLE recovery_cases DROP CONSTRAINT IF EXISTS valid_case_status;"))
            db.execute(text("ALTER TABLE recovery_cases ADD CONSTRAINT valid_case_status CHECK (status IN ('open', 'recovered', 'failed', 'pending_human_review', 'pending_batch', 'simulated_success', 'waiting_for_webhook', 'investigating', 'decision_ready', 'authorization_required', 'authorized', 'executing'));"))
            db.commit()
            print("Patched database constraint 'valid_case_status' to allow new statuses.")
        except Exception as e:
            db.rollback()
            print(f"Warning: Could not patch constraint: {e}")
            
        # Create a dedicated benchmark merchant
        merchant_name = "Benchmark Merchant - DO NOT USE"
        merchant = db.query(Merchant).filter(Merchant.name == merchant_name).first()
        if not merchant:
            merchant = Merchant(
                name=merchant_name,
                email="benchmark@revivex.test"
            )
            db.add(merchant)
            db.commit()
            db.refresh(merchant)
            
            # Basic policies to ensure we trigger hard rules
            policies = [
                SafetyPolicy(merchant_id=merchant.id, rule_type="MAX_RETRIES", rule_value={"max_retries": 3}),
                SafetyPolicy(merchant_id=merchant.id, rule_type="HARD_DECLINE_POLICY", rule_value={"enabled": True}),
                SafetyPolicy(merchant_id=merchant.id, rule_type="CIRCUIT_BREAKER", rule_value={"failure_threshold_percent": 30, "min_volume": 10})
            ]
            db.add_all(policies)
            db.commit()
            
        print(f"Running batch generation for merchant: {merchant.name}")
        
        # Generate 50 synthetic transactions for this specific merchant
        # This will internally invoke the DetectionEngine and WorkflowOrchestrator
        generate_synthetic_data(db, num_transactions=50, merchant=merchant)
        
        # 1. Total transactions processed
        total_tx = db.query(Transaction).filter(Transaction.merchant_id == merchant.id).count()
        
        # 2. Total amount at risk (transactions that generated a RecoveryCase)
        risk_txs = db.query(Transaction).join(RecoveryCase, RecoveryCase.transaction_id == Transaction.id).filter(Transaction.merchant_id == merchant.id).all()
        total_at_risk = sum((tx.amount for tx in risk_txs), Decimal('0.0'))
        
        # 3. Total amount recovered
        # Due to earlier architectural changes, simulation sets status to "simulated_success" instead of "recovered"
        recovered_txs = db.query(Transaction).join(RecoveryCase, RecoveryCase.transaction_id == Transaction.id).filter(
            Transaction.merchant_id == merchant.id,
            RecoveryCase.status.in_(["recovered", "simulated_success"])
        ).all()
        total_recovered = sum((tx.amount for tx in recovered_txs), Decimal('0.0'))
        
        # 4. Recovery rate (%)
        recovery_rate = (total_recovered / total_at_risk * 100) if total_at_risk > 0 else Decimal('0.0')
        
        # 5. AI-override rate
        # We need to look at cases for this merchant and compare AI diagnosis vs final action
        cases = db.query(RecoveryCase).join(Transaction).filter(Transaction.merchant_id == merchant.id).all()
        total_cases = len(cases)
        
        ai_overrides = 0
        ai_followed = 0
        hard_stopped = 0
        human_approval = 0
        
        for case in cases:
            # Re-evaluating the audit logs for each case to see what happened
            logs = db.query(AuditLog).filter(AuditLog.recovery_case_id == case.id).order_by(AuditLog.timestamp.asc()).all()
            
            ai_recommendation = case.recommended_action
            final_decision = case.final_action
            
            # Check if decision engine overrode AI
            # Look for DECISION_ENGINE_EVALUATED log
            for log in logs:
                if log.event == "DECISION_ENGINE_EVALUATED":
                    details = log.details
                    rule_applied = details.get("rule_applied")
                    decision = details.get("decision")
                    if rule_applied and decision != ai_recommendation:
                        ai_overrides += 1
                    else:
                        ai_followed += 1
                    
                    if decision == "stop":
                        hard_stopped += 1
                    elif decision == "human_review":
                        human_approval += 1
                    break
            else:
                # Fallback if no log found (shouldn't happen with orchestrator)
                if ai_recommendation != final_decision:
                    ai_overrides += 1
                else:
                    ai_followed += 1
                
                if final_decision == "stop":
                    hard_stopped += 1
                elif final_decision == "human_review":
                    human_approval += 1
                    
        override_rate = (ai_overrides / total_cases * 100) if total_cases > 0 else 0
        followed_rate = (ai_followed / total_cases * 100) if total_cases > 0 else 0
        
        report = f"""# ReviveX Recovery Benchmark Report

## 1. Volume Metrics
- **Total transactions processed:** {total_tx}
- **Total cases generated:** {total_cases}

## 2. Financial Metrics
- **Total amount at risk:** INR {total_at_risk:,.2f}
- **Total amount recovered:** INR {total_recovered:,.2f}
- **Recovery rate:** {recovery_rate:.2f}%

## 3. Autonomous AI & Safety Guardrail Metrics
- **AI-override rate (Safety Policy intervened):** {override_rate:.2f}% ({ai_overrides} cases)
- **AI recommendation followed as-is:** {followed_rate:.2f}% ({ai_followed} cases)

## 4. Escalation & Stopping Rules
- **Cases stopped by hard rule (MAX_RETRIES / Circuit Breaker / Hard Decline):** {hard_stopped}
- **Cases escalated to human approval:** {human_approval}
"""
        
        print("\n" + "="*50)
        print(report)
        print("="*50 + "\n")
        
        with open(os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "RECOVERY_BENCHMARK.md"), "w") as f:
            f.write(report)
            
        print("Benchmark artifact written to backend/RECOVERY_BENCHMARK.md")

    finally:
        db.close()

if __name__ == "__main__":
    run_benchmark()
