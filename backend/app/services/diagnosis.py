import os
import json
import logging
from pydantic import ValidationError
from openai import OpenAI

from app.models import RecoveryCase, Transaction
from app.schemas import AIDiagnosisResponse, RootCauseEnum, RecommendedActionEnum

logger = logging.getLogger(__name__)

class AIDiagnosisService:
    @staticmethod
    def diagnose(case: RecoveryCase, transaction: Transaction) -> AIDiagnosisResponse:
        """
        Uses an LLM via OpenRouter/OpenAI API to diagnose the root cause and recommend an action.
        Falls back to HUMAN_REVIEW on any failure or validation error.
        """
        fallback_response = AIDiagnosisResponse(
            root_cause=RootCauseEnum.unknown,
            confidence=0.0,
            recommended_action=RecommendedActionEnum.human_review
        )
        
        provider = os.getenv("AI_PROVIDER", "openrouter").lower()
        
        if provider == "nvidia":
            api_key = os.getenv("NVIDIA_API_KEY")
            base_url = os.getenv("NVIDIA_BASE_URL", "https://integrate.api.nvidia.com/v1")
            model = os.getenv("NVIDIA_MODEL", "meta/llama-3.3-70b-instruct")
        else:
            api_key = os.getenv("OPENROUTER_API_KEY") or os.getenv("OPENAI_API_KEY")
            base_url = os.getenv("OPENAI_API_BASE", "https://openrouter.ai/api/v1")
            model = os.getenv("LLM_MODEL", "meta-llama/llama-3-8b-instruct:free")
            
        if not api_key:
            logger.warning(f"API key not found for provider {provider}. Falling back to human review for Case {case.id}.")
            return fallback_response
            
        try:
            client = OpenAI(api_key=api_key, base_url=base_url)
            
            prompt = f"""
            Analyze the following transaction and recovery case signals to determine the root cause and recommended action.
            
            Transaction Amount: {transaction.amount} {transaction.currency}
            Transaction Status: {transaction.status}
            Payment Method: {transaction.payment_method}
            Error Code: {transaction.error_code}
            
            Case Risk Type: {case.risk_type}
            Case Signals: {json.dumps(case.signals) if case.signals else "{{}}"}
            
            You must respond ONLY with a valid JSON object matching this schema exactly:
            {{
                "root_cause": "temporary_payment_failure" | "hard_payment_decline" | "checkout_abandonment" | "repeated_failure" | "unknown",
                "confidence": <float between 0.0 and 1.0>,
                "recommended_action": "retry" | "send_nudge" | "human_review" | "stop"
            }}
            
            Return ONLY valid JSON.
            Use EXACTLY these keys:
            root_cause
            confidence
            recommended_action
            
            Never prefix keys with "." or any other character.
            Do not use Markdown.
            Do not use code fences.
            Do not add explanatory text.
            """
            
            # model variable is already set based on provider
            
            response = client.chat.completions.create(
                model=model,
                messages=[
                    {"role": "system", "content": "You are an AI specialized in diagnosing payment failures. Always return raw JSON."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.1,
                response_format={"type": "json_object"}
            )
            
            raw_text = response.choices[0].message.content
            
            # Deterministic normalization layer for known formatting bugs
            raw_text = raw_text.replace('".root_cause"', '"root_cause"')
            raw_text = raw_text.replace('".confidence"', '"confidence"')
            raw_text = raw_text.replace('".recommended_action"', '"recommended_action"')
            
            # Parse it using Pydantic to ensure strict validation.
            result = AIDiagnosisResponse.model_validate_json(raw_text)
            logger.info(f"AI Diagnosis successful for Case {case.id}: {result.root_cause.value} -> {result.recommended_action.value}")
            return result
            
        except ValidationError as ve:
            logger.error(f"AI Diagnosis validation failed for Case {case.id}: {ve}")
            return fallback_response
        except Exception as e:
            logger.error(f"AI Diagnosis LLM call failed for Case {case.id}: {e}")
            return fallback_response
