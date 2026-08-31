from fastapi import FastAPI, Depends, HTTPException, BackgroundTasks, Request
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy import text, func
import os
import logging
from typing import Optional
from datetime import datetime, timezone

logger = logging.getLogger(__name__)
from app import models, schemas
from app.database import engine, get_db, SessionLocal
from app.services.orchestrator import WorkflowOrchestrator
from app.services.detection import DetectionEngine
from app.services.razorpay import RazorpayWebhookService
from app.services.simulator import SimulationEngine
from app.scripts import generate_data

models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="ReviveX MVP API")

frontend_url = os.getenv("FRONTEND_URL", "http://localhost:3000")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[frontend_url],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# SECURITY NOTE: Production Deployment Authentication Requirement
# This MVP currently lacks API authentication. Before deploying to production with real
# user data or financial transactions, a robust authentication middleware (e.g., JWT, OAuth2, 
# or Supabase Auth) MUST be implemented to protect these endpoints.

@app.get("/")
def read_root():
    return {"message": "Welcome to ReviveX API"}

@app.get("/health")
def health_check(db: Session = Depends(get_db)):
    try:
        db.execute(text("SELECT 1"))
        return {"status": "ok", "database": "connected"}
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"Database connection failed: {str(e)}")

@app.get("/api/dashboard/stats")
def get_dashboard_stats(db: Session = Depends(get_db)):
    # Direct high-performance SQL aggregations
    total_at_risk = db.query(
        func.coalesce(func.sum(models.Transaction.amount), 0.0)
    ).filter(
        models.Transaction.status.in_(["failed", "abandoned"])
    ).scalar() or 0.0

    total_recovered = db.query(
        func.coalesce(func.sum(models.Transaction.amount), 0.0)
    ).select_from(models.Transaction).join(
        models.RecoveryCase, models.RecoveryCase.transaction_id == models.Transaction.id
    ).filter(
        models.RecoveryCase.status == "recovered"
    ).scalar() or 0.0

    cases_processed = db.query(func.count(models.RecoveryCase.id)).scalar() or 0
    recovered_cases = db.query(func.count(models.RecoveryCase.id)).filter(
        models.RecoveryCase.status == "recovered"
    ).scalar() or 0

    recovery_rate = (recovered_cases / cases_processed * 100) if cases_processed > 0 else 0.0

    return {
        "revenue_at_risk": float(total_at_risk),
        "revenue_recovered": float(total_recovered),
        "recovery_rate": round(float(recovery_rate), 2),
        "cases_processed": int(cases_processed)
    }

@app.get("/api/dashboard/breakdown")
def get_dashboard_breakdown(db: Session = Depends(get_db)):
    root_cause_rows = db.query(
        models.RecoveryCase.diagnosed_root_cause,
        func.count(models.RecoveryCase.id)
    ).filter(
        models.RecoveryCase.diagnosed_root_cause.isnot(None)
    ).group_by(models.RecoveryCase.diagnosed_root_cause).all()

    action_rows = db.query(
        models.RecoveryCase.final_action,
        func.count(models.RecoveryCase.id)
    ).filter(
        models.RecoveryCase.final_action.isnot(None)
    ).group_by(models.RecoveryCase.final_action).all()

    root_cause_data = [{"name": row[0], "value": row[1]} for row in root_cause_rows]
    action_data = [{"name": row[0], "value": row[1]} for row in action_rows]

    return {
        "root_causes": root_cause_data,
        "actions": action_data
    }

@app.get("/api/cases", response_model=list[schemas.RecoveryCaseResponse])
def get_cases(
    status: Optional[str] = None,
    risk_type: Optional[str] = None,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    query = db.query(models.RecoveryCase)
    if status:
        query = query.filter(models.RecoveryCase.status == status)
    if risk_type:
        query = query.filter(models.RecoveryCase.risk_type == risk_type)
    return query.order_by(models.RecoveryCase.created_at.desc()).offset(skip).limit(limit).all()

@app.get("/api/cases/{case_id}", response_model=schemas.RecoveryCaseResponse)
def get_case(case_id: str, db: Session = Depends(get_db)):
    case = db.query(models.RecoveryCase).filter(models.RecoveryCase.id == case_id).first()
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")
    return case

@app.get("/api/cases/{case_id}/audit", response_model=list[schemas.AuditLogResponse])
def get_case_audit(case_id: str, db: Session = Depends(get_db)):
    logs = db.query(models.AuditLog).filter(models.AuditLog.recovery_case_id == case_id).order_by(models.AuditLog.timestamp).all()
    return logs

@app.post("/api/cases/{case_id}/action")
def submit_human_action(case_id: str, payload: schemas.CaseActionRequest, db: Session = Depends(get_db)):
    case = db.query(models.RecoveryCase).filter(models.RecoveryCase.id == case_id).first()
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")
        
    case.final_action = payload.action
    
    if payload.action == "retry":
        case.status = "recovered"
    elif payload.action == "stop":
        case.status = "failed"
    elif payload.action == "send_nudge":
        case.status = "open"
    else:
        case.status = "failed"
        
    audit = models.AuditLog(
        recovery_case_id=case.id,
        transaction_id=case.transaction_id,
        event="ACTION_EXECUTED",
        actor="HUMAN",
        details={"action": payload.action, "note": "Manual review completed"}
    )
    db.add(audit)
    db.commit()
    return {"message": f"Action {payload.action} executed successfully"}

@app.get("/api/settings", response_model=schemas.SettingsResponse)
def get_settings(db: Session = Depends(get_db)):
    rules = db.query(models.AgentRule).all()
    config = schemas.SettingsResponse().model_dump()
    for rule in rules:
        if rule.rule_type in config:
            config[rule.rule_type] = rule.rule_value
    return config

@app.put("/api/settings", response_model=schemas.SettingsResponse)
def update_settings(payload: schemas.SettingsUpdate, db: Session = Depends(get_db)):
    config_dict = payload.model_dump()
    for key, value in config_dict.items():
        rule = db.query(models.AgentRule).filter(models.AgentRule.rule_type == key).first()
        if not rule:
            rule = models.AgentRule(rule_type=key, rule_value=value)
            db.add(rule)
        else:
            rule.rule_value = value
    db.commit()
    return get_settings(db)

@app.post("/api/settings/test-ai")
def test_ai_connection():
    from openai import OpenAI
    import os
    
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
        return {"status": "error", "message": "API Key not configured"}
        
    try:
        client = OpenAI(api_key=api_key, base_url=base_url)
        response = client.chat.completions.create(
            model=model,
            messages=[{"role": "user", "content": "Ping. Reply 'Pong'."}],
            max_tokens=10
        )
        return {"status": "success", "message": "Connection successful"}
    except Exception as e:
        return {"status": "error", "message": str(e)}

@app.post("/api/settings/test-webhook")
def test_webhook_connection():
    return {"status": "success", "message": "Webhook configuration is valid (simulated)."}

@app.get("/api/exceptions", response_model=list[schemas.SystemExceptionResponse])
def list_exceptions(severity: Optional[str] = None, status: Optional[str] = None, search: Optional[str] = None, db: Session = Depends(get_db)):
    query = db.query(models.SystemException)
    if severity: query = query.filter(models.SystemException.severity == severity)
    if status: query = query.filter(models.SystemException.status == status)
    if search: query = query.filter(models.SystemException.message.ilike(f"%{search}%"))
    return query.order_by(models.SystemException.created_at.desc()).limit(100).all()

@app.get("/api/exceptions/{exc_id}", response_model=schemas.SystemExceptionResponse)
def get_exception(exc_id: str, db: Session = Depends(get_db)):
    exc = db.query(models.SystemException).filter(models.SystemException.id == exc_id).first()
    if not exc:
        raise HTTPException(status_code=404, detail="Exception not found")
    return exc

@app.post("/api/exceptions/{exc_id}/action")
def exception_action(exc_id: str, payload: schemas.ExceptionActionRequest, db: Session = Depends(get_db)):
    exc = db.query(models.SystemException).filter(models.SystemException.id == exc_id).first()
    if not exc:
        raise HTTPException(status_code=404, detail="Exception not found")
        
    if payload.action == "resolve":
        exc.status = "RESOLVED"
        exc.resolved_at = datetime.utcnow()
        exc.resolved_by = "Admin"
    elif payload.action == "ignore":
        exc.status = "IGNORED"
        exc.resolved_at = datetime.utcnow()
        exc.resolved_by = "Admin"
    elif payload.action == "retry":
        if exc.severity == "CRITICAL":
            raise HTTPException(status_code=400, detail="Cannot retry CRITICAL exceptions.")
        exc.status = "IN_PROGRESS"
        
    db.commit()
    return {"status": "success", "message": f"Action {payload.action} executed"}

@app.post("/api/test/generate-data")
def generate_synthetic_data_endpoint(db: Session = Depends(get_db)):
    generate_data.create_synthetic_data()
    return {"message": "Synthetic data generated successfully"}

@app.post("/api/test/process-batch")
def process_open_cases(background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    open_cases = db.query(models.RecoveryCase.id).filter(models.RecoveryCase.status == "open").all()
    case_ids = [c.id for c in open_cases]
    
    def process_all():
        db_session = SessionLocal()
        try:
            for case_id in case_ids:
                case = db_session.query(models.RecoveryCase).filter(models.RecoveryCase.id == case_id).first()
                if case:
                    WorkflowOrchestrator.process_case(db_session, case)
        finally:
            db_session.close()
            
    background_tasks.add_task(process_all)
    return {"message": f"Processing {len(case_ids)} cases in the background"}

@app.post("/api/recovery/run")
def run_complete_recovery_pipeline(db: Session = Depends(get_db)):
    transactions = db.query(models.Transaction).all()
    
    metrics = {
        "transactions_processed": 0,
        "cases_detected": 0,
        "recovery_eligible": 0,
        "recovered_amount": 0.0,
        "recovery_rate": 0.0,
        "human_escalations": 0,
        "stopped_cases": 0,
        "unresolved_cases": 0
    }
    
    for transaction in transactions:
        metrics["transactions_processed"] += 1
        
        # 1. Detection
        case = DetectionEngine.detect_risk(db, transaction)
        if not case:
            continue
            
        metrics["cases_detected"] += 1
        db.add(case)
        db.commit() # Save case to get ID
        
        # 2. Orchestrate (Diagnose -> Decide -> Act)
        processed_case = WorkflowOrchestrator.process_case(db, case)
        if not processed_case:
            continue
            
        # 3. Aggregate Metrics
        if processed_case.status == "recovered":
            metrics["recovery_eligible"] += 1
            amount = float(processed_case.transaction.amount) if processed_case.transaction else 0
            metrics["recovered_amount"] += amount
        elif processed_case.status == "pending_human_review":
            metrics["recovery_eligible"] += 1
            metrics["human_escalations"] += 1
        elif processed_case.status == "failed" and processed_case.final_action == "stop":
            metrics["stopped_cases"] += 1
        else:
            metrics["unresolved_cases"] += 1

    if metrics["recovery_eligible"] > 0:
        metrics["recovery_rate"] = round((metrics["cases_detected"] - metrics["human_escalations"] - metrics["stopped_cases"] - metrics["unresolved_cases"]) / metrics["recovery_eligible"] * 100, 2)
        # Actually a simpler definition based on the requested JSON:
        # rate = recovered / eligible * 100
        recovered_count = len([c for c in db.query(models.RecoveryCase).all() if c.status == "recovered"])
        metrics["recovery_rate"] = round((recovered_count / metrics["recovery_eligible"]) * 100, 2) if metrics["recovery_eligible"] else 0.0
        
    return metrics

@app.post("/api/webhooks/razorpay")
async def razorpay_webhook(request: Request, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    payload_body = await request.body()
    signature = request.headers.get("x-razorpay-signature")
    event_id = request.headers.get("x-razorpay-event-id")
    secret = os.getenv("RAZORPAY_WEBHOOK_SECRET", "test_secret")
    
    logger.info(f"Received Razorpay webhook: event_id={event_id}")
    
    if not RazorpayWebhookService.verify_signature(payload_body, signature, secret):
        logger.error(f"Invalid webhook signature for event {event_id}")
        raise HTTPException(status_code=401, detail="Invalid signature")
        
    try:
        payload_json = await request.json()
    except Exception:
        logger.error("Invalid JSON payload received")
        raise HTTPException(status_code=400, detail="Invalid JSON")
        
    if event_id:
        existing_event = db.query(models.WebhookEvent).filter(models.WebhookEvent.id == event_id).first()
        if existing_event:
            logger.info(f"Duplicate webhook event ignored: {event_id}")
            return {"status": "ignored", "reason": "duplicate event"}
            
        new_event = models.WebhookEvent(
            id=event_id,
            event_type=payload_json.get("event", "unknown"),
            payload=payload_json
        )
        db.add(new_event)
        
    normalized_data = RazorpayWebhookService.normalize_event(payload_json)
    if not normalized_data:
        logger.info(f"Webhook event type unsupported or malformed for event {event_id}")
        db.commit() # Save the event log even if unsupported
        return {"status": "ignored", "reason": "unsupported event"}
        
    merchant = db.query(models.Merchant).first()
    if not merchant:
        logger.error("Webhook processing failed: No merchant configured")
        raise HTTPException(status_code=500, detail="No merchant configured")
        
    # Filter transaction fields for ORM persistence
    tx_fields = {k: v for k, v in normalized_data.items() if hasattr(models.Transaction, k)}
    
    transaction = db.query(models.Transaction).filter(models.Transaction.id == normalized_data["id"]).first()
    if not transaction:
        transaction = models.Transaction(merchant_id=merchant.id, **tx_fields)
        db.add(transaction)
    else:
        for k, v in tx_fields.items():
            setattr(transaction, k, v)
            
    db.commit()
    db.refresh(transaction)
    logger.info(f"Database persistence complete for transaction {transaction.id}")
    
    # Check if this is a payment link paid settlement event
    if normalized_data.get("webhook_event_type") == "payment_link.paid":
        ref_case_id = normalized_data.get("reference_id") or normalized_data.get("notes", {}).get("revivex_case_id")
        target_case = None
        if ref_case_id:
            target_case = db.query(models.RecoveryCase).filter(models.RecoveryCase.id == ref_case_id).first()
            
        if not target_case:
            # Try finding via RecoveryAction details
            plink_id = normalized_data.get("payment_link_id")
            if plink_id:
                action = db.query(models.RecoveryAction).filter(
                    models.RecoveryAction.action_details.op("->>")("payment_link_id") == plink_id
                ).first()
                if action:
                    target_case = db.query(models.RecoveryCase).filter(models.RecoveryCase.id == action.recovery_case_id).first()
                    
        if target_case:
            target_case.status = "recovered"
            target_case.updated_at = datetime.now(timezone.utc)
            
            # Update associated RecoveryActions
            for act in target_case.actions:
                if act.status in ["pending", "link_created"]:
                    act.status = "paid"
                    act.updated_at = datetime.now(timezone.utc)
                    
            # Record audit trail
            audit = models.AuditLog(
                recovery_case_id=target_case.id,
                transaction_id=target_case.transaction_id,
                event="OUTCOME_RECORDED",
                actor="RAZORPAY_WEBHOOK",
                details={
                    "settlement": "payment_link.paid",
                    "payment_id": transaction.id,
                    "payment_link_id": normalized_data.get("payment_link_id"),
                    "amount_recovered": float(transaction.amount),
                    "recovered_at": datetime.now(timezone.utc).isoformat()
                }
            )
            db.add(audit)
            db.commit()
            logger.info(f"Settled RecoveryCase {target_case.id} as RECOVERED via Razorpay Payment Link webhook.")
            return {"status": "processed", "transaction_id": transaction.id, "case_recovered": True, "case_id": target_case.id}

    case = DetectionEngine.detect_risk(db, transaction)
    if case:
        def process_async(case_id: str):
            db_session = SessionLocal()
            try:
                db_case = db_session.query(models.RecoveryCase).filter(models.RecoveryCase.id == case_id).first()
                if db_case and db_case.status == "open": # Prevent duplicate processing if already recovered/failed
                    WorkflowOrchestrator.process_case(db_session, db_case)
            finally:
                db_session.close()
                
        # Only start if the case is in 'open' status to avoid re-processing cases that are already human-review or recovered
        if case.status == "open":
            logger.info(f"Queueing case {case.id} for async AI diagnosis and orchestration")
            background_tasks.add_task(process_async, case.id)
        else:
            logger.info(f"Case {case.id} is already in status {case.status}, skipping async orchestration")
        
    return {"status": "processed", "transaction_id": transaction.id, "case_created": bool(case)}

@app.post("/api/simulator/run", response_model=schemas.SimulatorResult)
async def run_simulator(payload: schemas.SimulatorPayload, db: Session = Depends(get_db)):
    """
    Safely runs the full pipeline for a simulated scenario without writing to the production database.
    """
    logger.info(f"Starting simulation for scenario: {payload.scenario}")
    try:
        result = SimulationEngine.run_scenario(payload, db)
        return result
    except Exception as e:
        logger.error(f"Simulation failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

