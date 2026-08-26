from pydantic import BaseModel, ConfigDict, Field
from typing import Optional, List, Dict, Any
from datetime import datetime
from uuid import UUID, uuid4
from enum import Enum

class AgentDiagnosis(BaseModel):
    root_cause: str # "temporary_failure", "hard_decline", "checkout_abandonment", "fraud_suspected", "unknown"
    confidence_score: float # 0.0 to 1.0
    reasoning: str # Brief explanation for the audit log
    recommended_action: str # "RETRY", "SEND_NUDGE", "HUMAN_APPROVAL", "STOP"

class TransactionBase(BaseModel):
    amount: float
    currency: str
    status: str
    payment_method: str
    error_code: Optional[str] = None
    error_description: Optional[str] = None

class TransactionCreate(TransactionBase):
    merchant_id: str

class TransactionResponse(TransactionBase):
    model_config = ConfigDict(from_attributes=True)
    id: str
    merchant_id: str
    created_at: datetime

class RecoveryCaseBase(BaseModel):
    status: str = "open"
    diagnosed_root_cause: Optional[str] = None
    confidence_score: Optional[float] = None
    recommended_action: Optional[str] = None
    final_action: Optional[str] = None
    risk_amount: Optional[float] = None
    risk_type: Optional[str] = None
    signals: Optional[Dict[str, Any]] = None

class RecoveryCaseResponse(RecoveryCaseBase):
    model_config = ConfigDict(from_attributes=True)
    id: str
    transaction_id: str
    created_at: datetime
    updated_at: datetime

class AuditLogResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    recovery_case_id: str
    event: str
    actor: str
    details: Optional[Dict[str, Any]] = None
    timestamp: datetime

class RootCauseEnum(str, Enum):
    temporary_payment_failure = "temporary_payment_failure"
    hard_payment_decline = "hard_payment_decline"
    checkout_abandonment = "checkout_abandonment"
    repeated_failure = "repeated_failure"
    unknown = "unknown"

class RecommendedActionEnum(str, Enum):
    retry = "retry"
    send_nudge = "send_nudge"
    human_review = "human_review"
    stop = "stop"

class AIDiagnosisResponse(BaseModel):
    root_cause: RootCauseEnum
    confidence: float = Field(ge=0.0, le=1.0)
    recommended_action: RecommendedActionEnum

class DecisionExplanation(BaseModel):
    decision: RecommendedActionEnum
    reason: str
    rule: str

class CaseActionRequest(BaseModel):
    action: str # "retry", "send_nudge", "stop"

class SettingsUpdate(BaseModel):
    max_retries: int = Field(ge=0, default=2)
    human_approval_threshold: float = Field(ge=0, default=10000.0)
    max_discount: float = Field(ge=0, le=100, default=10.0)
    automatic_retry: bool = True
    automatic_nudge: bool = True

class SettingsResponse(SettingsUpdate):
    pass

class ExceptionActionRequest(BaseModel):
    action: str # "retry", "resolve", "ignore"

class SystemExceptionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    merchant_id: Optional[str] = None
    transaction_id: Optional[str] = None
    recovery_case_id: Optional[str] = None
    type: str
    severity: str
    status: str
    message: str
    details: Optional[Dict[str, Any]] = None
    created_at: datetime
    updated_at: datetime
    resolved_at: Optional[datetime] = None
    resolved_by: Optional[str] = None

