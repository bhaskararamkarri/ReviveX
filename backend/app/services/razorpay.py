import hmac
import hashlib
import logging
from typing import Dict, Any, Optional

logger = logging.getLogger(__name__)

class RazorpayWebhookService:
    @staticmethod
    def verify_signature(payload_body: bytes, signature_header: str, secret: str) -> bool:
        """
        Verifies the Razorpay webhook signature using HMAC SHA256.
        """
        if not signature_header or not secret:
            return False
            
        expected_signature = hmac.new(
            secret.encode('utf-8'),
            payload_body,
            hashlib.sha256
        ).hexdigest()
        
        return hmac.compare_digest(expected_signature, signature_header)

    @staticmethod
    def normalize_event(payload_json: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """
        Normalizes a Razorpay webhook event into our Transaction schema dictionary.
        Returns None if the event type is unsupported.
        """
        event_type = payload_json.get("event")
        
        if event_type not in ["payment.failed", "payment.authorized", "payment.captured"]:
            return None
            
        try:
            payment = payload_json["payload"]["payment"]["entity"]
            
            status_map = {
                "failed": "failed",
                "authorized": "abandoned", 
                "captured": "success"
            }
            
            status = status_map.get(payment.get("status", ""), "failed")
            
            normalized_tx = {
                "id": payment["id"], 
                "amount": float(payment.get("amount", 0)) / 100.0,
                "currency": payment.get("currency", "INR"),
                "status": status,
                "payment_method": payment.get("method", "unknown"),
                "error_code": payment.get("error_code"),
                "error_description": payment.get("error_description")
            }
            
            return normalized_tx
            
        except KeyError as e:
            logger.error(f"Malformed Razorpay webhook payload. Missing key: {e}")
            return None
