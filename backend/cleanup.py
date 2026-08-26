from app.database import SessionLocal
from app.models import Transaction, RecoveryCase, AuditLog, RecoveryAction

db = SessionLocal()

print("Deleting all recovery actions...")
db.query(RecoveryAction).delete()
print("Deleting all audit logs...")
db.query(AuditLog).delete()
print("Deleting all recovery cases...")
db.query(RecoveryCase).delete()
print("Deleting all transactions...")
db.query(Transaction).delete()

db.commit()
print("Database cleaned up successfully.")
db.close()
