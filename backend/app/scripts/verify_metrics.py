from app.database import SessionLocal
from app.models import Transaction, RecoveryCase, AuditLog

db = SessionLocal()

# 1. Total counts
txs = db.query(Transaction).all()
cases = db.query(RecoveryCase).all()

fraud_count = len([c for c in cases if c.risk_type == 'fraud'])
max_retries_count = len([c for c in cases if c.signals and c.signals.get('recent_failures_count', 0) >= 3])
high_value_count = len([t for t in txs if t.amount > 1000.0])

# Guardrail decisions
decisions = [c.final_action for c in cases if c.final_action]
print(f"Total cases evaluated: {len(decisions)}")
print(f"STOP: {decisions.count('stop')}")
print(f"HUMAN_APPROVAL: {decisions.count('human_review')}") # human_review acts as approval step
print(f"RETRY: {decisions.count('retry')}")
print(f"SEND_NUDGE: {decisions.count('send_nudge')}")

# Recovery metrics
cases_processed = len(cases)
successful = [c for c in cases if c.status == 'recovered']
failed = [c for c in cases if c.status == 'failed']
stopped = [c for c in cases if c.status == 'stopped']
human_approvals = [c for c in cases if c.status == 'human_approval_required']
unresolved = [c for c in cases if c.status not in ('recovered', 'failed', 'stopped', 'human_approval_required', 'resolved')]

revenue_at_risk = sum(tx.amount for tx in txs if tx.status in ('failed', 'abandoned'))
revenue_recovered = sum(c.transaction.amount for c in successful if c.transaction)
recovery_rate = (revenue_recovered / revenue_at_risk * 100) if revenue_at_risk else 0

print(f"\n--- Recovery Metrics ---")
print(f"Cases Processed: {cases_processed}")
print(f"Successful Recoveries: {len(successful)}")
print(f"Failed Recoveries: {len(failed)}")
print(f"Human Approvals: {len(human_approvals)}")
print(f"Stopped Cases: {len(stopped)}")
print(f"Unresolved Cases: {len(unresolved)}")
print(f"Revenue At Risk: {revenue_at_risk}")
print(f"Revenue Recovered: {revenue_recovered}")
print(f"Recovery Rate: {recovery_rate:.2f}%")

print(f"\n--- Revenue Calculation Sample ---")
for c in successful[:3]:
    print(f"Case {c.id}: TX Amount: {c.transaction.amount}, Status: {c.status}, Final Action: {c.final_action}, Recovered: {c.transaction.amount}")

print(f"\n--- Audit Verification ---")
def print_audit(case_id, label):
    logs = db.query(AuditLog).filter_by(recovery_case_id=case_id).order_by(AuditLog.timestamp.asc()).all()
    print(f"\n[{label}] Case {case_id}:")
    for log in logs:
        print(f" -> {log.event}")

if successful: print_audit(successful[0].id, "Successful")
if stopped: print_audit(stopped[0].id, "Stopped")
if human_approvals: print_audit(human_approvals[0].id, "Human Approval")
if failed: print_audit(failed[0].id, "Failed")

