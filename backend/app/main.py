from fastapi import FastAPI, Depends, HTTPException, BackgroundTasks, Request
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy import text
import os
from typing import Optional
from datetime import datetime
from app import models, schemas
from app.database import engine, get_db, SessionLocal
from app.services.orchestrator import WorkflowOrchestrator
from app.services.detection import DetectionEngine
from app.services.razorpay import RazorpayWebhookService
from app.scripts import generate_data

models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="ReviveX MVP API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

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
    transactions = db.query(models.Transaction).all()
    cases = db.query(models.RecoveryCase).all()
    
    total_at_risk = sum(t.amount for t in transactions if t.status in ["failed", "abandoned"])
    total_recovered = sum(t.amount for t in transactions for c in cases if c.transaction_id == t.id and c.status == "recovered")
    
    cases_processed = len(cases)
    recovery_rate = (len([c for c in cases if c.status == "recovered"]) / cases_processed * 100) if cases_processed > 0 else 0

    return {
        "revenue_at_risk": total_at_risk,
        "revenue_recovered": total_recovered,
        "recovery_rate": round(recovery_rate, 2),
        "cases_processed": cases_processed
    }

@app.get("/api/dashboard/breakdown")
def get_dashboard_breakdown(db: Session = Depends(get_db)):
    cases = db.query(models.RecoveryCase).all()
    
    root_cause_counts = {}
    action_counts = {}
    
    for case in cases:
        if case.diagnosed_root_cause:
            root_cause_counts[case.diagnosed_root_cause] = root_cause_counts.get(case.diagnosed_root_cause, 0) + 1
        if case.final_action:
            action_counts[case.final_action] = action_counts.get(case.final_action, 0) + 1
            
    root_cause_data = [{"name": k, "value": v} for k, v in root_cause_counts.items()]
    action_data = [{"name": k, "value": v} for k, v in action_counts.items()]
    
    return {
        "root_causes": root_cause_data,
        "actions": action_data
    }

@app.get("/api/cases", response_model=list[schemas.RecoveryCaseResponse])
def get_cases(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    cases = db.query(models.RecoveryCase).offset(skip).limit(limit).all()
    return cases

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
    secret = os.getenv("RAZORPAY_WEBHOOK_SECRET", "test_secret")
    
    if not RazorpayWebhookService.verify_signature(payload_body, signature, secret):
        raise HTTPException(status_code=400, detail="Invalid signature")
        
    try:
        payload_json = await request.json()
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid JSON")
        
    normalized_data = RazorpayWebhookService.normalize_event(payload_json)
    if not normalized_data:
        return {"status": "ignored", "reason": "unsupported event"}
        
    merchant = db.query(models.Merchant).first()
    if not merchant:
        raise HTTPException(status_code=500, detail="No merchant configured")
        
    transaction = db.query(models.Transaction).filter(models.Transaction.id == normalized_data["id"]).first()
    if not transaction:
        transaction = models.Transaction(merchant_id=merchant.id, **normalized_data)
        db.add(transaction)
    else:
        for k, v in normalized_data.items():
            setattr(transaction, k, v)
            
    db.commit()
    db.refresh(transaction)
    
    case = DetectionEngine.detect_risk(db, transaction)
    if case:
        db.add(case)
        db.commit()
        
        def process_async(case_id: str):
            db_session = SessionLocal()
            try:
                db_case = db_session.query(models.RecoveryCase).filter(models.RecoveryCase.id == case_id).first()
                if db_case:
                    WorkflowOrchestrator.process_case(db_session, db_case)
            finally:
                db_session.close()
                
        background_tasks.add_task(process_async, case.id)
        
    return {"status": "processed", "transaction_id": transaction.id, "case_created": bool(case)}
