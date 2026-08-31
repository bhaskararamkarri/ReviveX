import time
import uuid
import copy
import json
from typing import Dict, Any, List, Optional
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from sqlalchemy import inspect

from app.models import Transaction, RecoveryCase, RecoveryAction, AuditLog, WebhookEvent, AgentRule
from app.schemas import SimulatorPayload, SimulatorResult, StageTrace, RootCauseEnum, RecommendedActionEnum
from app.services.razorpay import RazorpayWebhookService
from app.services.detection import DetectionEngine
from app.services.diagnosis import AIDiagnosisService
from app.services.decision import DecisionEngine
from app.services.recovery import RecoveryEngine
from app.services.orchestrator import WorkflowOrchestrator
from app.database import engine, Base

class SimulationSession:
    """
    A wrapper around sqlalchemy Session that delegates queries to the real database (so we can fetch AgentRules)
    but intercepts add, commit, flush, and refresh to prevent mutating the real database.
    It records simulated operations for the UI.
    """
    def __init__(self, real_db: Session):
        self.real_db = real_db
        self.added_objects = []
        self.db_operations = []
        
    def query(self, *args, **kwargs):
        # Allow querying the real database (e.g. for AgentRules)
        return self.real_db.query(*args, **kwargs)
        
    def add(self, obj):
        self.added_objects.append(obj)
        table_name = obj.__class__.__tablename__ if hasattr(obj.__class__, '__tablename__') else type(obj).__name__
        
        # Simple serialization for the trace
        state = {}
        for c in inspect(obj.__class__).mapper.column_attrs:
            val = getattr(obj, c.key, None)
            if not isinstance(val, (int, float, str, bool, type(None))):
                val = str(val)
            state[c.key] = val
            
        self.db_operations.append({
            "operation": "CREATE",
            "table": table_name,
            "fields": state
        })
        
    def commit(self):
        # Do not commit to real DB
        pass
        
    def flush(self):
        # Do not flush to real DB, but assign dummy IDs to objects if they need them
        for obj in self.added_objects:
            if hasattr(obj, "id") and getattr(obj, "id") is None:
                setattr(obj, "id", f"sim_{uuid.uuid4().hex[:8]}")
                
    def refresh(self, obj):
        # Do nothing since it's not actually in DB
        pass

class SimulationEngine:
    @staticmethod
    def run_scenario(payload: SimulatorPayload, real_db: Session) -> SimulatorResult:
        traces: List[StageTrace] = []
        audit_trail: List[Dict[str, Any]] = []
        
        sim_db = SimulationSession(real_db)
        
        # Scenario mapping
        error_code = "BAD_REQUEST_ERROR"
        status = "failed"
        method = "card"
        
        if payload.scenario == "temporary_failure":
            error_code = "TEMPORARY_ERROR"
        elif payload.scenario == "hard_decline":
            error_code = "CARD_DECLINED"
        elif payload.scenario == "abandoned":
            status = "abandoned"
            error_code = None
        elif payload.scenario == "fraud":
            error_code = "RISK_REJECTED"
        
        # --- STAGE 01: WEBHOOK RECEIVED & 02: SIGNATURE VERIFIED ---
        start_time = time.time()
        
        raw_webhook = {
            "event": "payment.failed" if status == "failed" else "payment.authorized",
            "payload": {
                "payment": {
                    "entity": {
                        "id": f"pay_sim_{uuid.uuid4().hex[:8]}",
                        "amount": int(payload.amount * 100),
                        "currency": "INR",
                        "status": status,
                        "method": method,
                        "error_code": error_code,
                        "error_description": "Simulated failure description"
                    }
                }
            }
        }
        
        # Simulate webhook reception
        webhook_event_id = f"evt_sim_{uuid.uuid4().hex[:8]}"
        sim_db.add(WebhookEvent(id=webhook_event_id, event_type=raw_webhook["event"], payload=raw_webhook))
        
        traces.append(StageTrace(
            stage="WEBHOOK RECEIVED",
            status="SUCCESS",
            service="RazorpayWebhookService",
            method="verify_signature",
            duration_ms=int((time.time() - start_time) * 1000) + 2, # Add small jitter
            input_data={"endpoint": "POST /api/webhooks/razorpay", "headers": {"x-razorpay-signature": "<valid>", "x-razorpay-event-id": webhook_event_id}, "body": raw_webhook},
            output_data={"signature_valid": True, "idempotency_passed": True},
            reason="Valid simulation webhook.",
            db_operation="CREATE WebhookEvent",
            next_stage="EVENT NORMALIZED"
        ))
        
        # --- STAGE 03: EVENT NORMALIZED ---
        start_time = time.time()
        normalized_data = RazorpayWebhookService.normalize_event(raw_webhook)
        
        traces.append(StageTrace(
            stage="EVENT NORMALIZED",
            status="SUCCESS",
            service="RazorpayWebhookService",
            method="normalize_event",
            duration_ms=int((time.time() - start_time) * 1000) + 1,
            input_data=raw_webhook,
            output_data=normalized_data,
            reason="Converted Razorpay payload to ReviveX transaction schema.",
            next_stage="TRANSACTION PERSISTED"
        ))
        
        # --- STAGE 04: TRANSACTION PERSISTED ---
        start_time = time.time()
        transaction = Transaction(
            merchant_id="sim_merchant", 
            created_at=datetime.now(timezone.utc),
            **normalized_data
        )
        
        sim_db.add(transaction)
        sim_db.flush()
        
        db_op = None
        if sim_db.db_operations:
            db_op = json.dumps(sim_db.db_operations[-1], default=str)
            
        traces.append(StageTrace(
            stage="TRANSACTION PERSISTED",
            status="SUCCESS",
            service="Database",
            method="Session.add",
            duration_ms=int((time.time() - start_time) * 1000) + 3,
            input_data={"transaction": normalized_data},
            output_data={"transaction_id": transaction.id},
            reason="Transaction saved to database.",
            db_operation=db_op,
            next_stage="FAILURE DETECTED"
        ))
        
        # --- STAGE 05: FAILURE DETECTED ---
        start_time = time.time()
        
        case = DetectionEngine.detect_risk(sim_db, transaction)
        
        if not case:
            traces.append(StageTrace(
                stage="FAILURE DETECTED",
                status="SUCCESS",
                service="DetectionEngine",
                method="detect_risk",
                duration_ms=int((time.time() - start_time) * 1000) + 1,
                input_data={"transaction_id": transaction.id, "status": transaction.status},
                output_data={"risk_detected": False},
                reason="Transaction was successful or unsupported.",
                next_stage="None"
            ))
            return SimulatorResult(scenario=payload.scenario, amount=payload.amount, final_action="NONE", traces=traces, audit_trail=[])
            
        # Manually inject simulation signals if requested
        if payload.retry_count > 0:
            case.risk_type = "repeated_failure"
            if not case.signals:
                case.signals = {}
            case.signals["recent_failures_count"] = payload.retry_count
            
        if payload.fraud_flag:
            if not case.signals:
                case.signals = {}
            case.signals["fraud_suspected"] = True
            
        sim_db.flush()
        
        db_op = None
        if sim_db.db_operations:
            db_op = json.dumps(sim_db.db_operations[-1], default=str)
            
        audit_trail.append({"timestamp": datetime.now(timezone.utc).isoformat(), "event": "DETECTED", "service": "SYSTEM", "result": case.risk_type})
        
        traces.append(StageTrace(
            stage="FAILURE DETECTED",
            status="SUCCESS",
            service="DetectionEngine",
            method="detect_risk",
            duration_ms=int((time.time() - start_time) * 1000) + 4,
            input_data={"transaction_id": transaction.id, "status": transaction.status, "error_code": transaction.error_code},
            output_data={"risk_detected": True, "risk_type": case.risk_type, "signals": case.signals, "case_id": case.id},
            reason="Matches failure criteria.",
            db_operation=db_op,
            next_stage="AI DIAGNOSIS"
        ))
        
        # --- STAGE 06: AI DIAGNOSIS ---
        start_time = time.time()
        
        # Execute real AI diagnosis
        diagnosis = AIDiagnosisService.diagnose(case, transaction)
        
        case.diagnosed_root_cause = diagnosis.root_cause.value if hasattr(diagnosis.root_cause, 'value') else diagnosis.root_cause
        case.confidence_score = diagnosis.confidence
        case.recommended_action = diagnosis.recommended_action.value if hasattr(diagnosis.recommended_action, 'value') else diagnosis.recommended_action
        
        audit_trail.append({"timestamp": datetime.now(timezone.utc).isoformat(), "event": "DIAGNOSED", "service": "LLM", "result": case.recommended_action})
        
        traces.append(StageTrace(
            stage="AI DIAGNOSIS",
            status="SUCCESS",
            service="AIDiagnosisService",
            method="diagnose",
            duration_ms=int((time.time() - start_time) * 1000),
            input_data={"case_signals": case.signals, "transaction_error": transaction.error_code},
            output_data=diagnosis.model_dump(),
            reason="LLM evaluated the root cause and provided a recommendation.",
            next_stage="GUARDRAILS"
        ))
        
        # --- STAGE 07 & 08: GUARDRAILS & DECISION ---
        start_time = time.time()
        
        rules = real_db.query(AgentRule).all() # Load real rules
        decision = DecisionEngine.evaluate(case, transaction, diagnosis, rules)
        
        final_action_val = decision.decision.value if hasattr(decision.decision, 'value') else decision.decision
        case.final_action = final_action_val
        
        audit_trail.append({"timestamp": datetime.now(timezone.utc).isoformat(), "event": "DECIDED", "service": "SYSTEM", "result": final_action_val})
        
        traces.append(StageTrace(
            stage="GUARDRAILS & DECISION",
            status="SUCCESS" if decision.decision != RecommendedActionEnum.stop else "BLOCKED",
            service="DecisionEngine",
            method="evaluate",
            duration_ms=int((time.time() - start_time) * 1000) + 1,
            input_data={"ai_recommendation": diagnosis.recommended_action, "amount": transaction.amount},
            output_data={"final_action": final_action_val, "rule_triggered": decision.rule, "reason": decision.reason},
            rules_applied=decision.rule,
            reason=decision.reason,
            next_stage="RECOVERY ACTION"
        ))
        
        # --- STAGE 09: RECOVERY ACTION & 10: OUTCOME ---
        start_time = time.time()
        
        RecoveryEngine.execute_action(sim_db, case, transaction, decision)
        sim_db.flush()
        
        db_op = None
        if sim_db.db_operations:
            db_op = json.dumps(sim_db.db_operations[-1], default=str)
            
        audit_trail.append({"timestamp": datetime.now(timezone.utc).isoformat(), "event": "ACTION_EXECUTED", "service": "SYSTEM", "result": final_action_val})
        audit_trail.append({"timestamp": datetime.now(timezone.utc).isoformat(), "event": "OUTCOME_RECORDED", "service": "SYSTEM", "result": case.status})
        
        # 3. Extract action details (e.g. payment_link_id, short_url, mode)
        recovery_action = next((obj for obj in sim_db.added_objects if isinstance(obj, RecoveryAction)), None)
        action_details = getattr(recovery_action, "action_details", {}) if recovery_action else {}

        traces.append(StageTrace(
            stage="RECOVERY ACTION & OUTCOME",
            status="SUCCESS" if case.status == "recovered" or action_details.get("mode") == "live_test" else ("FAILED" if case.status == "failed" else "PENDING"),
            service="RecoveryEngine",
            method="execute_action",
            duration_ms=int((time.time() - start_time) * 1000) + 2,
            input_data={"action": final_action_val, "mode": action_details.get("mode", "dry_run_simulation")},
            output_data={
                "case_status": case.status, 
                "recovered_amount": transaction.amount if case.status == "recovered" else 0.0,
                "action_details": action_details
            },
            reason="Executed the decided recovery action." if action_details.get("mode") == "live_test" else "Simulated execution of the decided action.",
            db_operation=db_op,
            next_stage="AUDIT"
        ))
        
        # --- STAGE 11: AUDIT ---
        traces.append(StageTrace(
            stage="AUDIT",
            status="SUCCESS",
            service="WorkflowOrchestrator",
            method="log_audit",
            duration_ms=1,
            input_data={"events": len(audit_trail)},
            output_data={"audit_trail_recorded": True},
            reason="Audit trail collected for simulation.",
            next_stage="None"
        ))
        
        return SimulatorResult(
            scenario=payload.scenario,
            amount=payload.amount,
            final_action=final_action_val,
            traces=traces,
            audit_trail=audit_trail
        )
