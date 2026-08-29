from sqlalchemy import Column, String, Numeric, DateTime, ForeignKey, JSON, CheckConstraint
from sqlalchemy.orm import relationship
from datetime import datetime
import uuid
from app.database import Base

def generate_uuid():
    return str(uuid.uuid4())

class Merchant(Base):
    __tablename__ = "merchants"
    id = Column(String, primary_key=True, default=generate_uuid)
    name = Column(String)
    email = Column(String)
    created_at = Column(DateTime, default=datetime.utcnow)
    transactions = relationship("Transaction", back_populates="merchant")
    rules = relationship("AgentRule", back_populates="merchant")

class WebhookEvent(Base):
    __tablename__ = "webhook_events"
    id = Column(String, primary_key=True) # x-razorpay-event-id
    event_type = Column(String, index=True)
    payload = Column(JSON)
    created_at = Column(DateTime, default=datetime.utcnow)

class Transaction(Base):
    __tablename__ = "transactions"
    id = Column(String, primary_key=True, default=generate_uuid)
    merchant_id = Column(String, ForeignKey("merchants.id"), index=True)
    amount = Column(Numeric(10, 2))
    currency = Column(String, default="INR")
    status = Column(String, index=True) # success, failed, abandoned
    payment_method = Column(String)
    error_code = Column(String, nullable=True)
    error_description = Column(String, nullable=True)
    webhook_event_type = Column(String, nullable=True)
    event_timestamp = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    merchant = relationship("Merchant", back_populates="transactions")
    recovery_case = relationship("RecoveryCase", back_populates="transaction", uselist=False)

    __table_args__ = (
        CheckConstraint("status IN ('success', 'failed', 'abandoned')", name="valid_tx_status"),
    )

class RecoveryCase(Base):
    __tablename__ = "recovery_cases"
    id = Column(String, primary_key=True, default=generate_uuid)
    transaction_id = Column(String, ForeignKey("transactions.id"), index=True)
    status = Column(String, default="open", index=True) # open, recovered, failed, pending_human_review
    risk_type = Column(String, nullable=True) # failed_payment, checkout_abandonment, repeated_failure
    risk_amount = Column(Numeric(10, 2), nullable=True)
    signals = Column(JSON, nullable=True)
    diagnosed_root_cause = Column(String, nullable=True)
    confidence_score = Column(Numeric(4, 3), nullable=True)
    recommended_action = Column(String, nullable=True)
    final_action = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    transaction = relationship("Transaction", back_populates="recovery_case")
    actions = relationship("RecoveryAction", back_populates="case")
    audit_logs = relationship("AuditLog", back_populates="case")

    __table_args__ = (
        CheckConstraint("status IN ('open', 'recovered', 'failed', 'pending_human_review')", name="valid_case_status"),
    )

class RecoveryAction(Base):
    __tablename__ = "recovery_actions"
    id = Column(String, primary_key=True, default=generate_uuid)
    recovery_case_id = Column(String, ForeignKey("recovery_cases.id"), index=True)
    action_type = Column(String, index=True) # RETRY, SEND_NUDGE, HUMAN_APPROVAL, STOP
    status = Column(String, default="pending")
    action_details = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    case = relationship("RecoveryCase", back_populates="actions")

class AuditLog(Base):
    __tablename__ = "audit_logs"
    id = Column(String, primary_key=True, default=generate_uuid)
    recovery_case_id = Column(String, ForeignKey("recovery_cases.id"), index=True)
    transaction_id = Column(String, ForeignKey("transactions.id"), index=True)
    event = Column(String) # DETECTED, DIAGNOSED, DECIDED, ACTION_EXECUTED, OUTCOME_RECORDED
    actor = Column(String) # LLM, SYSTEM, HUMAN
    details = Column(JSON, nullable=True)
    timestamp = Column(DateTime, default=datetime.utcnow, index=True)
    case = relationship("RecoveryCase", back_populates="audit_logs")
    transaction = relationship("Transaction")

class AgentRule(Base):
    __tablename__ = "agent_rules"
    id = Column(String, primary_key=True, default=generate_uuid)
    merchant_id = Column(String, ForeignKey("merchants.id"), index=True)
    rule_type = Column(String) # MAX_RETRIES, HUMAN_APPROVAL_THRESHOLD, MAX_DISCOUNT_PERCENT, FRAUD_FLAG
    rule_value = Column(JSON)
    merchant = relationship("Merchant", back_populates="rules")

class SystemException(Base):
    __tablename__ = "exceptions"
    id = Column(String, primary_key=True, default=generate_uuid)
    merchant_id = Column(String, ForeignKey("merchants.id"), index=True, nullable=True)
    transaction_id = Column(String, ForeignKey("transactions.id"), index=True, nullable=True)
    recovery_case_id = Column(String, ForeignKey("recovery_cases.id"), index=True, nullable=True)
    type = Column(String, index=True) # AI_ERROR, WEBHOOK_ERROR, RECOVERY_ERROR, DATABASE_ERROR, SYSTEM_ERROR, RATE_LIMIT, AI_VALIDATION_ERROR
    severity = Column(String, index=True) # CRITICAL, ERROR, WARNING, INFO
    status = Column(String, default="OPEN", index=True) # OPEN, IN_PROGRESS, RESOLVED, IGNORED
    message = Column(String)
    details = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    resolved_at = Column(DateTime, nullable=True)
    resolved_by = Column(String, nullable=True)
