from app.database import SessionLocal
from app import models
from sqlalchemy import func
from pprint import pprint

db = SessionLocal()

print("--- TASK 1 ---")
recovered_cases = db.query(models.RecoveryCase).filter(models.RecoveryCase.status == 'recovered').all()
print(f"total recovered cases: {len(recovered_cases)}")

root_cause_pending = len([c for c in recovered_cases if c.diagnosed_root_cause == 'pending' or c.diagnosed_root_cause is None])
print(f"recovered cases with root_cause = pending/None: {root_cause_pending}")

root_cause_unknown = len([c for c in recovered_cases if c.diagnosed_root_cause == 'unknown'])
print(f"recovered cases with root_cause = unknown: {root_cause_unknown}")

missing_final_action = len([c for c in recovered_cases if c.final_action == '-' or c.final_action is None])
print(f"recovered cases with missing final_action: {missing_final_action}")

missing_zero_amount = 0
for c in recovered_cases:
    tx = c.transaction
    if tx is None or tx.amount is None or tx.amount == 0:
        missing_zero_amount += 1
print(f"recovered cases with missing/zero transaction amount: {missing_zero_amount}")

print("\n--- TASK 2 ---")
unknown_retry = db.query(models.RecoveryCase).filter(
    models.RecoveryCase.diagnosed_root_cause == 'unknown',
    models.RecoveryCase.final_action == 'retry'
).all()
print(f"Cases with unknown -> retry: {len(unknown_retry)}")

print("\n--- TASK 3 ---")
duplicates = db.query(
    models.RecoveryCase.transaction_id, 
    func.count(models.RecoveryCase.id)
).group_by(models.RecoveryCase.transaction_id).having(func.count(models.RecoveryCase.id) > 1).all()

print(f"Duplicate transactions found: {len(duplicates)}")
for tx_id, count in duplicates:
    cases = db.query(models.RecoveryCase).filter(models.RecoveryCase.transaction_id == tx_id).all()
    print(f"\ntransaction_id: {tx_id}")
    print(f"number_of_cases: {count}")
    print("cases:")
    for c in cases:
        print(f"  - ID: {c.id}, Status: {c.status}, Created: {c.created_at}, Final Action: {c.final_action}")

db.close()
