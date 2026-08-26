from app.database import SessionLocal
from app.models import Transaction, RecoveryCase

db = SessionLocal()
txs = db.query(Transaction).all()
cases = db.query(RecoveryCase).all()

print(f"Total txs: {len(txs)}")
print(f"Successful: {len([t for t in txs if t.status == 'captured'])}")
print(f"Failed: {len([t for t in txs if t.status == 'failed'])}")
print(f"Abandoned: {len([t for t in txs if t.status == 'abandoned'])}")
print(f"Repeated failures: {len([c for c in cases if c.signals and c.signals.get('recent_failures_count', 0) >= 3])}")
print(f"Fraud cases: {len([c for c in cases if c.risk_type == 'fraud'])}")
print(f"High value cases: {len([t for t in txs if t.amount > 1000.0])}")
