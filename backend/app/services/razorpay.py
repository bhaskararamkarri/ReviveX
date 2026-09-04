import os
import hmac
import hashlib
import logging
from typing import Dict, Any, Optional
from datetime import datetime, timezone
import httpx

logger = logging.getLogger(__name__)

class RazorpayWebhookService:
    @staticmethod
    def get_credentials() -> tuple[str, str]:
        """
        Retrieves Razorpay API credentials from environment.
        Enforces test key safety for non-production environments.
        """
        key_id = os.getenv("RAZORPAY_KEY_ID", "")
        key_secret = os.getenv("RAZORPAY_KEY_SECRET", "")
        return key_id, key_secret

    @staticmethod
    def verify_signature(payload_body: bytes, signature_header: str, secret: str) -> bool:
        """
        Verifies the Razorpay webhook signature using HMAC SHA256.
        """
        if not signature_header or not secret:
            logger.warning("Signature verification failed: Missing signature header or secret.")
            return False
            
        expected_signature = hmac.new(
            secret.encode('utf-8'),
            payload_body,
            hashlib.sha256
        ).hexdigest()
        
        is_valid = hmac.compare_digest(expected_signature, signature_header)
        if not is_valid:
            logger.warning("Signature verification failed: Signature mismatch.")
        else:
            logger.info("Signature verification successful.")
            
        return is_valid

    @staticmethod
    def create_payment_link(
        amount: float,
        currency: str = "INR",
        reference_id: str = "",
        description: str = "ReviveX Payment Recovery",
        customer: Optional[Dict[str, str]] = None,
        notes: Optional[Dict[str, str]] = None
    ) -> Dict[str, Any]:
        """
        Creates a real Razorpay Payment Link in Test Mode.
        Enforces that the key starts with rzp_test_ to prevent accidental live charges.
        """
        key_id, key_secret = RazorpayWebhookService.get_credentials()
        
        if not key_id or not key_secret:
            raise ValueError("Razorpay credentials (RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET) not configured.")
            
        if not key_id.startswith("rzp_test_"):
            raise ValueError(f"Safety Violation: Non-test Razorpay Key ID detected ({key_id[:8]}...). Real recovery is strictly restricted to test keys (rzp_test_*).")

        # Amount in paise (integer)
        amount_in_paise = int(round(amount * 100))
        
        payload: Dict[str, Any] = {
            "amount": amount_in_paise,
            "currency": currency,
            "accept_partial": False,
            "reference_id": reference_id,
            "description": description,
            "notify": {
                "sms": False,
                "email": False
            },
            "reminder_enable": True,
            "notes": notes or {}
        }
        
        if customer:
            payload["customer"] = customer

        logger.info(f"Initiating Razorpay Payment Link creation: amount=INR {amount}, ref={reference_id}")
        
        try:
            with httpx.Client(timeout=10.0) as client:
                response = client.post(
                    "https://api.razorpay.com/v1/payment_links",
                    auth=(key_id, key_secret),
                    json=payload
                )
                
            if response.status_code not in [200, 201]:
                logger.error(f"Razorpay Payment Link API error ({response.status_code}): {response.text}")
                raise RuntimeError(f"Razorpay API Error ({response.status_code}): {response.text}")
                
            data = response.json()
            logger.info(f"Payment Link created successfully: id={data.get('id')}, url={data.get('short_url')}")
            return {
                "id": data.get("id"),
                "short_url": data.get("short_url"),
                "status": data.get("status"),
                "amount": amount,
                "currency": currency,
                "reference_id": reference_id,
                "raw_response": data
            }
        except httpx.RequestError as exc:
            logger.error(f"Network error communicating with Razorpay API: {exc}")
            raise RuntimeError(f"Network error connecting to Razorpay: {str(exc)}")

    @staticmethod
    def fetch_payment_link(payment_link_id: str) -> Dict[str, Any]:
        """
        Fetches status of an existing Razorpay Payment Link.
        """
        key_id, key_secret = RazorpayWebhookService.get_credentials()
        with httpx.Client(timeout=10.0) as client:
            response = client.get(
                f"https://api.razorpay.com/v1/payment_links/{payment_link_id}",
                auth=(key_id, key_secret)
            )
        if response.status_code != 200:
            raise RuntimeError(f"Failed to fetch payment link: {response.text}")
        return response.json()

    @staticmethod
    def normalize_event(payload_json: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """
        Normalizes a Razorpay webhook event into our Transaction schema dictionary.
        Supports payment.* and payment_link.* events.
        Returns None if the event type is unsupported.
        """
        event_type = payload_json.get("event")
        
        supported_events = [
            "payment.failed", 
            "payment.authorized", 
            "payment.captured",
            "payment_link.paid",
            "payment_link.expired",
            "payment_link.cancelled"
        ]
        
        if event_type not in supported_events:
            return None
            
        try:
            # Handle payment_link.paid event
            if event_type == "payment_link.paid":
                plink = payload_json.get("payload", {}).get("payment_link", {}).get("entity", {})
                payment = payload_json.get("payload", {}).get("payment", {}).get("entity", {})
                
                amount = float(payment.get("amount") or plink.get("amount") or 0) / 100.0
                payment_id = payment.get("id") or f"pay_from_{plink.get('id', 'plink')}"
                
                return {
                    "id": payment_id,
                    "amount": amount,
                    "currency": payment.get("currency") or plink.get("currency", "INR"),
                    "status": "success",
                    "payment_method": payment.get("method", "payment_link"),
                    "error_code": None,
                    "error_description": None,
                    "webhook_event_type": event_type,
                    "event_timestamp": datetime.now(timezone.utc),
                    "reference_id": plink.get("reference_id"),
                    "payment_link_id": plink.get("id"),
                    "notes": plink.get("notes", {})
                }

            # Standard payment.* events
            payment = payload_json["payload"]["payment"]["entity"]
            
            status_map = {
                "failed": "failed",
                "authorized": "abandoned", 
                "abandoned": "abandoned",
                "captured": "success"
            }
            
            status = status_map.get(payment.get("status", ""), "failed")
            
            created_at_ts = payment.get("created_at")
            event_timestamp = datetime.fromtimestamp(created_at_ts, tz=timezone.utc) if created_at_ts else None

            normalized_tx = {
                "id": payment["id"], 
                "amount": float(payment.get("amount", 0)) / 100.0,
                "currency": payment.get("currency", "INR"),
                "status": status,
                "payment_method": payment.get("method", "unknown"),
                "error_code": payment.get("error_code"),
                "error_description": payment.get("error_description"),
                "webhook_event_type": event_type,
                "event_timestamp": event_timestamp
            }
            
            return normalized_tx
            
        except KeyError as e:
            logger.error(f"Malformed Razorpay webhook payload. Missing key: {e}")
            return None

