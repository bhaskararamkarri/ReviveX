# ReviveX — Enterprise Payment Recovery Control Center

<p align="center">
  <strong>Autonomous AI Payment Failure Intelligence & Deterministic Revenue Recovery Platform</strong>
</p>

<p align="center">
  <a href="https://revive-x-five.vercel.app"><img src="https://img.shields.io/badge/Frontend-Next.js%2016%20Turbopack-000000?style=flat-square&logo=next.js" alt="Next.js 16" /></a>
  <a href="https://revivex-nzdp.onrender.com/health"><img src="https://img.shields.io/badge/Backend-FastAPI%200.141-009688?style=flat-square&logo=fastapi" alt="FastAPI" /></a>
  <a href="https://github.com/bhaskararamkarri/ReviveX"><img src="https://img.shields.io/badge/Tests-35%20Passing-brightgreen?style=flat-square" alt="Tests 35 Passing" /></a>
  <a href="https://github.com/bhaskararamkarri/ReviveX"><img src="https://img.shields.io/badge/AI-NVIDIA%20Nemotron%2070B-76B900?style=flat-square&logo=nvidia" alt="NVIDIA AI" /></a>
  <a href="https://razorpay.com"><img src="https://img.shields.io/badge/Gateway-Razorpay%20Test%20Mode-0C2340?style=flat-square&logo=razorpay" alt="Razorpay" /></a>
  <a href="https://github.com/bhaskararamkarri/ReviveX"><img src="https://img.shields.io/badge/Architecture-Enterprise%20Control%20Center-6366F1?style=flat-square" alt="Enterprise Control Center" /></a>
</p>

---

## 🧭 Product Mission & Core Operating Philosophy

A failed payment does not permanently mean lost revenue. **ReviveX** transforms opaque payment gateway telemetry into actionable revenue recovery through a strict separation of concerns:

> **"AI diagnoses. Safety policies decide. Humans authorize. Recovery executes. Gateway events verify. ReviveX measures."**

1. **AI is an Advisor, Not an Autocrat**: NVIDIA Nemotron 70B diagnoses root causes from noisy gateway error payloads, but can **never** directly trigger financial execution.
2. **Deterministic Safety Policies Authoritatively Decide**: Hard policies (`HARD_DECLINE_POLICY`, `MAX_RETRIES`, `CIRCUIT_BREAKER_POLICY`) evaluate bounds, exposure limits, and velocity caps before any retry.
3. **Merchants Retain Sovereign Control**: Automated recovery batches require explicit merchant authorization with full pre-flight idempotency verification.
4. **Gateway Webhooks Provide Ground Truth**: Revenue is only counted as recovered when a cryptographically verified `payment_link.paid` webhook event is processed and settled.

---

## ⚡ Architecture & End-to-End Pipeline

```mermaid
flowchart TD
    subgraph TELEMETRY["1. Telemetry & Ingestion"]
        A1["Razorpay Webhook Event\n(POST /api/webhooks/razorpay)"] --> A2["HMAC-SHA256 Signature Verification\n(RAZORPAY_WEBHOOK_SECRET)"]
        A2 --> A3["Webhook Idempotency Deduplication\n(WebhookEvent DB Table)"]
        A3 --> A4["Transaction Persistence\n(PostgreSQL Ledger)"]
    end

    subgraph DETECTION["2. Detection & Risk Classification"]
        A4 --> B1["DetectionEngine\n(Rule-Based Risk Tagging)"]
        B1 --> B2["Create/Update RecoveryCase\n(Severity: LOW / MED / HIGH / CRITICAL)"]
    end

    subgraph INVESTIGATION["3. AI Forensic Investigation"]
        B2 --> C1["AIDiagnosisService\n(NVIDIA Nemotron 70B / LLaMA 3.3)"]
        C1 --> C2["Pydantic Response Normalization\n(Root Cause + Confidence Score)"]
    end

    subgraph DECISION["4. Deterministic Policy Gate"]
        C2 --> D1["DecisionEngine & Guardrails\n(HARD_DECLINE_POLICY, TEMPORARY_FAILURE_POLICY)"]
        D1 --> D2{"Safety Policy Check"}
        D2 -->|"Hard Decline / Fraud"| D3["STOP\n(No Retries Allowed)"]
        D2 -->|"Threshold Exceeded"| D4["HUMAN_APPROVAL\n(Risk Queue)"]
        D2 -->|"Temporary Failure"| D5["RETRY / NUDGE\n(Policy-Eligible)"]
    end

    subgraph EXECUTION["5. Recovery Execution & Settlement"]
        D5 --> E1["Merchant Batch Authorization\n(Pre-Flight Verification)"]
        E1 --> E2["RecoveryEngine\n(Razorpay Test-Mode Payment Links)"]
        E2 --> E3["Customer Hosted Checkout\n(https://rzp.io/i/...)"]
        E3 --> E4["payment_link.paid Ingestion\n(Status: RECOVERED)"]
    end

    subgraph AUDIT["6. Immutable Audit & Analytics"]
        E4 --> F1["Immutable Audit Trail\n(Actor: Nemotron | SafetyEngine | Webhook | Operator)"]
        F1 --> F2["Real-Time SQL Dashboards & Control Center\n(Revenue at Risk, Recoverable, Recovered)"]
    end
```

---

## 🖥️ Enterprise Control Center (Frontend Views)

The ReviveX frontend is engineered with **Next.js 16 (Turbopack)** and Vanilla CSS design tokens for ultra-responsive operational visibility:

| Route | View Name | Capabilities & Purpose |
| :--- | :--- | :--- |
| `/overview` | **Executive Overview** | Real-time recovery KPIs (Revenue at Risk, Recoverable Revenue, Recovered Revenue, Active Cases), Nemotron 70B Anomaly banner, degraded payment rail breakdown, 24H/7D/30D/90D historical telemetry charts. |
| `/incidents` | **Incident Stream** | Live gateway degradation alerts, cluster tracking, error volume distribution, latency spikes, and one-click incident drilldown. |
| `/incidents/[id]` | **Incident Forensics** | Root-cause timeline, affected merchant exposure, gateway nodes involved, and automated mitigation status. |
| `/risk-cases` | **Risk Cases Portfolio** | Filterable case inventory by status (`open`, `investigating`, `recovered`, `abandoned`) and severity (`CRITICAL`, `HIGH`, `MEDIUM`, `LOW`). |
| `/risk-cases/[id]` | **Case Deep Dive** | **Root Cause Decision Tree**, side-by-side **AI Recommendation vs Authoritative Decision**, pre-flight safety checklists, and manual override controls. |
| `/investigations` | **Forensic Investigations** | **7-Stage Diagnostic Pipeline Visualizer** tracing each transaction from telemetry ingestion through to safety clearance. |
| `/investigations/[id]`| **Diagnostic Dossier** | Full LLM forensic prompt/completion inspector, telemetry metrics, and confidence calibration. |
| `/recovery` | **Recovery Operations** | Merchant Authorization Card, Batch Queue management, **Active Recovery Monitor** with dynamic failure-rate tracking, and one-click **Circuit Breaker Demonstration**. |
| `/transactions` | **Transactions Explorer** | Global transaction search, status/method filters, error diagnostics, and direct access to lifecycle histories. |
| `/transactions/[id]`| **Transaction Lifecycle** | **8-stage chronological lifecycle visualizer** tracking the transaction from initial checkout error to final webhook settlement. |
| `/policies` | **Safety Policy Center** | Dynamic policy bounds editor (`MAX_RETRIES`, `COOLDOWN_MINUTES`, `CIRCUIT_BREAKER_THRESHOLD`, `EXPOSURE_CAP`) with policy documentation. |
| `/audit` | **Immutable Audit Trail** | Cryptographically verifiable journal of all decisions and actions, tagged by actor (`Nemotron 70B`, `Safety Engine`, `Human Operator`, `Razorpay Webhook`). |
| `/ai-assistant` | **Operational AI Assistant** | Grounded operational chat powered by Nemotron 70B with 9 instant telemetry quick-prompts. |
| `/developer-console` | **Developer Console** | Interactive simulation sandbox with 7 gateway failure presets, real-time stage execution viewer, and live **Razorpay Test Checkout** launcher. |

---

## 🛠️ Technology Stack

| Layer | Technologies |
| :--- | :--- |
| **Frontend** | **Next.js 16.3.2 (Turbopack)**, React 19, TypeScript, Vanilla CSS Design System, Recharts, Lucide Icons |
| **Backend API** | **FastAPI 0.141**, Python 3.11 / 3.14, Pydantic v2, Uvicorn, Httpx |
| **Database & ORM** | **PostgreSQL**, SQLAlchemy 2.0 (with connection pooling & pre-ping), Alembic |
| **AI / LLM Engine** | **NVIDIA Integrate API** (`nvidia/nemotron-3-nano-30b-a3b`, `meta/llama-3.3-70b-instruct`) with JSON schema enforcement |
| **Payment Gateway** | **Razorpay Payments & Payment Links API** (Test Mode HMAC-SHA256 signature verification) |
| **Safety Engine** | Deterministic Guardrail Policies, Circuit Breakers, Pre-Flight Verification |

---

## 📂 Project Structure

```text
ReviveX/
├── backend/
│   ├── alembic/                         # Database schema migrations
│   ├── app/
│   │   ├── models.py                    # SQLAlchemy ORM models (Transaction, RecoveryCase, RecoveryAction, AuditLog, etc.)
│   │   ├── schemas.py                   # Pydantic validation schemas & API contracts
│   │   ├── database.py                  # PostgreSQL engine, sessionmaker & pool configuration
│   │   ├── main.py                      # FastAPI routes, webhook endpoints & error handlers
│   │   ├── scripts/
│   │   │   └── generate_data.py         # Realistic transaction data seeder
│   │   └── services/
│   │       ├── decision.py              # Authoritative Guardrails & DecisionEngine
│   │       ├── detection.py             # Rule-based failure detection & risk classifier
│   │       ├── diagnosis.py             # NVIDIA Nemotron LLM diagnosis & prompt engine
│   │       ├── guardrail.py             # Auxiliary rule validation service
│   │       ├── llm.py                   # LLM client abstractions
│   │       ├── orchestrator.py          # End-to-end pipeline orchestrator & audit logger
│   │       ├── razorpay.py              # Razorpay Payment Links API & webhook verification
│   │       ├── recovery.py              # Real Razorpay recovery execution & simulation engine
│   │       └── simulator.py             # Developer Console simulation & stage tracing session
│   ├── tests/
│   │   ├── test_data_integrity.py       # Case integrity & idempotency tests
│   │   ├── test_decision.py             # Guardrail & policy override tests
│   │   ├── test_detection.py            # Failure detection classification tests
│   │   ├── test_diagnosis.py            # LLM mock diagnosis & normalization tests
│   │   ├── test_exceptions.py          # Exception Center API tests
│   │   ├── test_razorpay.py             # Razorpay webhook, signature & payment link tests
│   │   ├── test_recovery.py             # RecoveryEngine execution tests
│   │   └── test_settings.py             # Dynamic merchant rules & settings tests
│   ├── requirements.txt                 # Python backend dependencies
│   └── alembic.ini                      # Alembic configuration
│
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   │   ├── layout.tsx               # Root layout with top navigation header
│   │   │   ├── overview/page.tsx        # Executive Overview dashboard & KPIs
│   │   │   ├── incidents/page.tsx       # Incident Stream
│   │   │   ├── incidents/[incidentId]/  # Incident Forensics
│   │   │   ├── risk-cases/page.tsx      # Risk Cases portfolio
│   │   │   ├── risk-cases/[caseId]/     # Risk Case deep dive & Root Cause Decision Tree
│   │   │   ├── investigations/page.tsx  # 7-Stage Diagnostic Pipeline Visualizer
│   │   │   ├── investigations/[id]/     # Forensic dossier detail
│   │   │   ├── recovery/page.tsx        # Recovery Batches & Active Recovery Monitor
│   │   │   ├── transactions/page.tsx    # Transactions Explorer
│   │   │   ├── transactions/[id]/       # 8-Stage Transaction Lifecycle
│   │   │   ├── policies/page.tsx        # Safety Policy Center & parameter bounds
│   │   │   ├── audit/page.tsx           # Immutable Audit Trail
│   │   │   ├── ai-assistant/page.tsx    # Grounded Operational AI Assistant
│   │   │   └── developer-console/       # Interactive Pipeline Simulator
│   │   ├── components/
│   │   │   ├── Header.tsx               # Top navigation bar
│   │   │   ├── Sidebar.tsx              # Operations navigation sidebar
│   │   │   └── DashboardCharts.tsx      # Recharts visualizations
│   │   └── lib/
│   │       └── config.ts                # API Base URL resolver
│   ├── next.config.ts                   # Next.js Turbopack config
│   ├── package.json                     # Frontend dependencies & scripts
│   └── tsconfig.json                    # TypeScript compiler config
│
├── .gitignore                           # Git ignore rules
└── README.md                            # Comprehensive project documentation
```

---

## 🔌 API Reference

### 1. Telemetry & Webhooks
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/api/webhooks/razorpay` | Cryptographic HMAC-SHA256 verified webhook ingestion & automatic recovery settlement |
| `GET` | `/health` | Backend and database connection health check |

### 2. Dashboard & Analytics
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/dashboard/stats` | Real-time aggregated KPIs (Revenue at Risk, Recoverable, Recovered, Recovery Rate) |
| `GET` | `/api/dashboard/breakdown` | Root cause & recovery action breakdown for telemetry charts |

### 3. Case & Incident Management
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/cases` | List cases with status, severity, and risk type filters |
| `GET` | `/api/cases/{case_id}` | Retrieve individual recovery case details |
| `GET` | `/api/cases/{case_id}/audit` | Retrieve chronological 5-step audit trail |
| `POST` | `/api/cases/{case_id}/action` | Execute operator action (`retry`, `send_nudge`, `stop`) |

### 4. Transactions & Audit
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/transactions` | Search and filter transactions by status and payment method |
| `GET` | `/api/transactions/{tx_id}` | Retrieve full transaction detail with linked recovery case |
| `GET` | `/api/audit` | Retrieve global immutable audit log records |

### 5. Recovery Operations & Safety Policies
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/api/recovery/run` | Execute recovery cycle on all registered open transactions |
| `POST` | `/api/recovery/batches/{id}/circuit-breaker` | Trip batch circuit breaker (simulates failure spike) |
| `GET` | `/api/settings` | Retrieve active safety policies and guardrail thresholds |
| `PUT` | `/api/settings` | Update policy limits (`MAX_RETRIES`, `EXPOSURE_CAP`, etc.) |
| `POST` | `/api/ai-assistant/chat` | Query the grounded Operational AI Assistant |

---

## 🔐 Environment Variables

### Backend (`backend/.env`)
```env
# PostgreSQL Database Connection URL
DATABASE_URL=postgresql://user:password@localhost:5432/revivex

# Frontend Origin for CORS
FRONTEND_URL=http://localhost:3000

# NVIDIA AI Inference API
AI_PROVIDER=nvidia
NVIDIA_API_KEY=nvapi-your-key-here
NVIDIA_BASE_URL=https://integrate.api.nvidia.com/v1
NVIDIA_MODEL=nvidia/nemotron-3-nano-30b-a3b

# Razorpay Test Mode Configuration
RAZORPAY_WEBHOOK_SECRET=your_test_webhook_secret
RAZORPAY_LIVE_RECOVERY_ENABLED=true
RAZORPAY_KEY_ID=rzp_test_xxxxxxxxxxxxxx
RAZORPAY_KEY_SECRET=yyyyyyyyyyyyyyyyyyyyyyyy
```

### Frontend (`frontend/.env.local`)
```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000/api
```

---

## 🚀 Quickstart & Verification

### 1. Run Backend Server
```bash
cd backend
.\venv\Scripts\activate          # Windows (or source venv/bin/activate on Linux/macOS)
pip install -r requirements.txt
python -m uvicorn app.main:app --reload --port 8000
```

### 2. Run Frontend Dev Server
```bash
cd frontend
npm install
npm run dev
```
Open **[http://localhost:3000](http://localhost:3000)** (redirects cleanly to `/overview`).

### 3. Run Automated Tests
```bash
cd backend
.\venv\Scripts\python -m pytest tests -q
# Output: 35 passed in ~40s
```

### 4. Build Production Bundle
```bash
cd frontend
npm run build
# Output: Next.js Turbopack compiled and generated 10 static & dynamic routes cleanly
```

---

## 🛡️ Security & Integrity Guarantees
- **HMAC-SHA256 Webhook Verification**: Inbound gateway events are cryptographically authenticated before touching any business logic.
- **Strict Test-Mode Isolation**: ReviveX validates the `rzp_test_` prefix on Razorpay keys to prevent accidental live charges.
- **Deduplication & Idempotency**: `WebhookEvent` and `idempotency_key` locking guarantee that duplicate webhook retries never produce duplicate charges or recovery loops.
- **Deterministic Circuit Breakers**: If downstream failure rate exceeds 15%, the system immediately trips the circuit breaker, protecting merchant credibility.

---

## 📄 License
This project is licensed under the MIT License.
