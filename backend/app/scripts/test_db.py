from sqlalchemy.orm import Session
from sqlalchemy import func
from app.database import engine, SessionLocal
from app.models import Transaction, RecoveryCase, Merchant

def test_database_integrity():
    db = SessionLocal()
    try:
        print("Running database verification tests...")
        
        # 1. Check total transactions
        tx_count = db.query(Transaction).count()
        print(f"Total Transactions: {tx_count}")
        assert tx_count > 0, "No transactions found!"
        if tx_count != 500:
            print(f"Warning: Expected exactly 500 transactions, found {tx_count}. (Might have old data)")

        # 2. Check distributions
        status_counts = db.query(Transaction.status, func.count(Transaction.id)).group_by(Transaction.status).all()
        print("\nTransaction Status Distribution:")
        for status, count in status_counts:
            percentage = (count / tx_count) * 100
            print(f"- {status}: {count} ({percentage:.1f}%)")
            
        error_counts = db.query(Transaction.error_code, func.count(Transaction.id)).filter(Transaction.status == 'failed').group_by(Transaction.error_code).all()
        print("\nError Code Distribution (Failed Transactions):")
        for err, count in error_counts:
            print(f"- {err}: {count}")

        # 3. Check relationships
        cases_count = db.query(RecoveryCase).count()
        print(f"\nTotal Recovery Cases: {cases_count}")
        
        # Verify foreign keys are resolving by pulling a case and checking its transaction
        sample_case = db.query(RecoveryCase).first()
        if sample_case:
            tx = sample_case.transaction
            merchant = tx.merchant
            print(f"\nRelationship Check PASS:")
            print(f"Case {sample_case.id} -> Tx {tx.id} -> Merchant {merchant.name}")
            assert tx is not None
            assert merchant is not None

        print("\nAll database tests passed successfully.")

    finally:
        db.close()

if __name__ == "__main__":
    test_database_integrity()
