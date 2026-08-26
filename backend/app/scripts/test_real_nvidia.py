import os
from dotenv import load_dotenv

# Load env BEFORE importing diagnosis so it picks up the correct LLM_MODEL
load_dotenv()

from app.models import RecoveryCase, Transaction
from app.services.diagnosis import AIDiagnosisService
import logging
import sys

logging.basicConfig(level=logging.INFO)

def main():
    print(f"Testing real NVIDIA API...")
    print(f"Base URL: {os.getenv('OPENAI_API_BASE')}")
    print(f"Model: {os.getenv('LLM_MODEL')}")
    
    tx = Transaction(
        id="test_nvidia_tx",
        amount=500.0,
        currency="INR",
        status="failed",
        payment_method="card",
        error_code="BAD_REQUEST_ERROR"
    )
    case = RecoveryCase(
        id="test_nvidia_case",
        risk_type="failed_payment",
        signals={"recent_failures_count": 0}
    )
    
    try:
        response = AIDiagnosisService.diagnose(case, tx)
        print("Response received:")
        print(f"root_cause: {response.root_cause.value}")
        print(f"confidence: {response.confidence}")
        print(f"recommended_action: {response.recommended_action.value}")
        
    except Exception as e:
        print(f"Error during diagnosis: {e}")

if __name__ == "__main__":
    main()
