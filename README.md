# ReviveX

<p align="center">
  <strong>Autonomous AI-Powered Payment Recovery & Revenue Optimization Engine</strong>
</p>

<p align="center">
  <a href="https://revive-x-five.vercel.app"><img src="https://img.shields.io/badge/Frontend-Vercel-black?style=flat-square&logo=vercel" alt="Vercel Deployment" /></a>
  <a href="https://revivex-nzdp.onrender.com/health"><img src="https://img.shields.io/badge/Backend-Render-46E3B7?style=flat-square&logo=render" alt="Render Deployment" /></a>
  <a href="https://github.com/bhaskararamkarri/ReviveX"><img src="https://img.shields.io/badge/Tests-35%20Passing-brightgreen?style=flat-square" alt="Tests 35 Passing" /></a>
  <a href="https://github.com/bhaskararamkarri/ReviveX"><img src="https://img.shields.io/badge/Next.js-16%20Turbopack-000000?style=flat-square&logo=next.js" alt="Next.js 16" /></a>
  <a href="https://github.com/bhaskararamkarri/ReviveX"><img src="https://img.shields.io/badge/FastAPI-0.141-009688?style=flat-square&logo=fastapi" alt="FastAPI" /></a>
  <a href="https://github.com/bhaskararamkarri/ReviveX"><img src="https://img.shields.io/badge/NVIDIA-Nemotron%20AI-76B900?style=flat-square&logo=nvidia" alt="NVIDIA AI" /></a>
</p>

---

## 📌 Overview

**ReviveX** is an enterprise-grade, autonomous payment recovery and revenue protection platform built for the modern digital economy. It seamlessly captures failed payment transactions from gateways like **Razorpay**, diagnoses the root cause of failure in real-time using **NVIDIA Nemotron / LLaMA AI**, evaluates deterministic **Guardrail policies**, and autonomously executes optimal recovery actions (such as generating **Razorpay Test-Mode Payment Links** or sending recovery nudges)—routing edge cases and high-value transactions to a human approval queue.

### Live Deployments:
- **Production Dashboard**: [https://revive-x-five.vercel.app](https://revive-x-five.vercel.app)
- **Developer Console**: [https://revive-x-five.vercel.app/developer-console](https://revive-x-five.vercel.app/developer-console)
- **Production API**: [https://revivex-nzdp.onrender.com](https://revivex-nzdp.onrender.com)
- **API Health Check**: [https://revivex-nzdp.onrender.com/health](https://revivex-nzdp.onrender.com/health)

---

## ⚡ Core Architecture & Pipeline Flow

```mermaid
flowchart TD
    A["1. Razorpay Webhook Ingestion\n(POST /api/webhooks/razorpay)"] --> B["2. Cryptographic Verification\n(HMAC-SHA256 Signature Header)"]
    B --> C["3. Webhook Idempotency Check\n(Deduplication via WebhookEvent Table)"]
    C --> D["4. Normalization & Persistence\n(Transaction Table in PostgreSQL)"]
    D --> E["5. DetectionEngine\n(Rule-Based Risk Classification)"]
    E --> F["6. AIDiagnosisService\n(NVIDIA Nemotron / LLaMA Inference)"]
    F --> G["7. Normalization & Pydantic Validation\n(Schema Validation & Fallback Guard)"]
    G --> H["8. DecisionEngine & Guardrails\n(HARD_DECLINE_POLICY, MAX_RETRIES, FRAUD_FLAG)"]
    H --> I["9. RecoveryEngine\n(Razorpay Test Payment Links / Safe Dry-Run)"]
    I --> J["10. Webhook Settlement & Outcome\n(payment_link.paid -> Status: Recovered)"]
    J --> K["11. Immutable Audit Trail\n(5-Step Event Log in AuditLog Table)"]
    K --> L["12. Live Dashboard Analytics\n(Real-Time SQL Aggregations & Charts)"]
```

---

## ✨ Key Features

### 1. Webhook Ingestion & Cryptographic Idempotency
- Receives inbound Razorpay webhooks (`payment.failed`, `payment.authorized`, `payment.captured`, `payment_link.paid`, `payment_link.expired`, `payment_link.cancelled`).
- Validates HMAC-SHA256 signatures against `RAZORPAY_WEBHOOK_SECRET` using constant-time comparison (`hmac.compare_digest`).
- Deduplicates replayed webhook events using the `WebhookEvent` table to prevent duplicate charges or recovery loops.

### 2. Autonomous AI Diagnosis (NVIDIA Nemotron)
- Invokes NVIDIA's `nvidia/nemotron-3-nano-30b-a3b` or `meta/llama-3.3-70b-instruct` models to diagnose the exact root cause of failure:
  - `temporary_payment_failure` (e.g. gateway timeout, network drop, bank downtime)
  - `hard_payment_decline` (e.g. insufficient funds, card expired, stolen card)
  - `checkout_abandonment` (authorized but uncaptured sessions)
  - `repeated_failure` (consecutive transaction retries)
  - `unknown` (ambiguous errors)
- Pydantic schema validation ensures strict JSON output with automated fallback to `human_review` upon LLM timeout or validation error.

### 3. Deterministic Guardrails (DecisionEngine)
- Safety rules authoritatively override AI recommendations:
  - **`FRAUD_FLAG`**: Immediately enforces `STOP` if fraud signals are flagged.
  - **`MAX_RETRIES`**: Halts automated retries when previous failure count $\ge 3$.
  - **`HUMAN_APPROVAL_THRESHOLD`**: Forces `HUMAN_APPROVAL` if transaction amount $> ₹1,000.00$.
  - **`HARD_DECLINE_POLICY`**: Strictly blocks retries on hard declines (`STOP`).
  - **`TEMPORARY_FAILURE_POLICY`**: Allows recovery actions for transient gateway errors (`RETRY`).
  - **`ABANDONMENT_POLICY`**: Triggers customer recovery nudges (`SEND_NUDGE`).

### 4. Real Razorpay Test-Mode Payment Link Recovery
- Integrated with Razorpay's hosted Payment Links API (`POST https://api.razorpay.com/v1/payment_links`).
- **Triple-Lock Safety**:
  - Requires `RAZORPAY_LIVE_RECOVERY_ENABLED=true` (defaults to `false` safe dry-run mode).
  - Strict key validation enforces `rzp_test_*` prefixes, actively preventing accidental live charges.
  - Automatic fallback to deterministic simulation if keys are missing or invalid.
- Generates hosted checkout URLs (`https://rzp.io/i/...`) and automatically settles the `RecoveryCase` when Razorpay fires `payment_link.paid`.

### 5. Interactive Developer Console
- Interactive hands-on simulator at `/developer-console` allowing engineers, CTOs, and judges to simulate 7 distinct failure scenarios in dry-run mode.
- Visual execution trace, stage inspector, JSON input/output viewer, database diff inspector, and live **"Open Razorpay Test Checkout"** button.

### 6. Human-in-the-Loop Queue & Exceptions Center
- High-value transactions and edge cases are staged in the **Human Queue** (`/human-approval`) for one-click manual resolution (`Retry`, `Nudge`, `Stop`).
- System-level exceptions and LLM fallbacks are tracked and resolvable in the **Exceptions Center** (`/exceptions`).

---

## 🛠️ Technology Stack

| Layer | Technologies |
| :--- | :--- |
| **Frontend** | **Next.js 16.3.2 (App Router & Turbopack)**, React 19, TypeScript, Vanilla CSS Design System, Recharts, Lucide Icons |
| **Backend** | **FastAPI 0.141**, Python 3.14 / 3.11, Pydantic v2, Uvicorn, Httpx |
| **Database & ORM** | **PostgreSQL**, SQLAlchemy 2.0 (with connection pooling & pre-ping), Alembic |
| **AI / LLM** | **NVIDIA Integrate API** (`nvidia/nemotron-3-nano-30b-a3b`, `meta/llama-3.3-70b-instruct`) & OpenRouter fallback |
| **Payment Gateway** | **Razorpay Payments & Payment Links API** (Test Mode HMAC-SHA256) |
| **Hosting & CI/CD** | **Vercel** (Frontend) & **Render** (Backend API) |

---

## 📂 Project Structure

```text
ReviveX/
├── backend/
│   ├── alembic/                    # Database migration configurations
│   ├── app/
│   │   ├── models.py               # SQLAlchemy ORM models (Transaction, RecoveryCase, RecoveryAction, AuditLog, AgentRule, etc.)
│   │   ├── schemas.py              # Pydantic validation schemas & API contracts
│   │   ├── database.py             # PostgreSQL connection pool & SessionLocal factory
│   │   ├── main.py                 # FastAPI application routes & webhook handlers
│   │   ├── scripts/
│   │   │   └── generate_data.py    # Synthetic transaction data generator
│   │   └── services/
│   │       ├── decision.py         # Authoritative Guardrails & DecisionEngine
│   │       ├── detection.py        # Rule-based failure detection & risk classifier
│   │       ├── diagnosis.py        # NVIDIA Nemotron LLM diagnosis & prompt engine
│   │       ├── guardrail.py        # Auxiliary rule validation service
│   │       ├── llm.py              # LLM client abstractions
│   │       ├── orchestrator.py     # End-to-end pipeline orchestrator & audit logger
│   │       ├── razorpay.py         # Razorpay Payment Links API & webhook verification
│   │       ├── recovery.py         # Real Razorpay recovery execution & simulation engine
│   │       └── simulator.py        # Developer Console simulation & stage tracing session
│   ├── tests/
│   │   ├── test_data_integrity.py  # Case integrity & idempotency tests
│   │   ├── test_decision.py        # Guardrail & policy override tests
│   │   ├── test_detection.py       # Failure detection classification tests
│   │   ├── test_diagnosis.py       # LLM mock diagnosis & normalization tests
│   │   ├── test_exceptions.py     # Exception Center API tests
│   │   ├── test_razorpay.py        # Razorpay webhook, signature & payment link tests
│   │   ├── test_recovery.py        # RecoveryEngine execution tests
│   │   └── test_settings.py        # Dynamic merchant rules & settings tests
│   ├── requirements.txt            # Python backend dependencies
│   └── alembic.ini                 # Alembic configuration
│
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   │   ├── page.tsx                    # Live Home Dashboard (KPIs, Charts, Recent Cases)
│   │   │   ├── layout.tsx                  # Root layout with navigation sidebar
│   │   │   ├── developer-console/page.tsx  # Interactive Pipeline Simulator & Test Checkout
│   │   │   ├── human-approval/page.tsx     # Human-in-the-loop review queue
│   │   │   ├── exceptions/page.tsx         # System Exceptions Center
│   │   │   ├── settings/page.tsx           # Merchant Guardrail rules & threshold config
│   │   │   ├── cases/[id]/page.tsx         # Detailed single-case drilldown
│   │   │   └── cases/[id]/audit/page.tsx   # 5-step visual audit trail timeline
│   │   ├── components/
│   │   │   ├── Sidebar.tsx                 # Navigation sidebar component
│   │   │   └── DashboardCharts.tsx         # Recharts breakdown visualizations
│   │   └── lib/
│   │       └── config.ts                   # Dynamic API base URL resolver
│   ├── next.config.ts                      # Next.js Turbopack configuration
│   ├── package.json                        # Frontend dependencies & scripts
│   └── tsconfig.json                       # TypeScript compiler options
│
├── .gitignore                              # Comprehensive secrets & environment ignore rules
└── README.md                               # Project documentation
```

---

## 🔌 API Reference

### 1. Dashboard & Analytics
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/` | API welcome message |
| `GET` | `/health` | Database connection health check |
| `GET` | `/api/dashboard/stats` | High-performance SQL aggregated KPIs (Revenue at Risk, Recovered, Recovery Rate) |
| `GET` | `/api/dashboard/breakdown` | Root cause & recovery action distribution for charts |

### 2. Case Management & Audit
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/cases` | List cases with optional `status` & `risk_type` filtering |
| `GET` | `/api/cases/{case_id}` | Retrieve individual case details |
| `GET` | `/api/cases/{case_id}/audit` | Retrieve chronological 5-step audit trail |
| `POST` | `/api/cases/{case_id}/action` | Execute human approval action (`retry`, `send_nudge`, `stop`) |

### 3. Razorpay Webhook & Recovery Execution
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/api/webhooks/razorpay` | Cryptographic HMAC-verified webhook ingestion & settlement |
| `POST` | `/api/simulator/run` | Safe dry-run & live test-mode simulator for Developer Console |
| `POST` | `/api/recovery/run` | Run complete recovery cycle on all registered transactions |
| `POST` | `/api/test/process-batch` | Trigger asynchronous background processing of open cases |
| `POST` | `/api/test/generate-data` | Seed synthetic transactions for benchmarking |

### 4. Settings & Exceptions Center
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/settings` | Retrieve active merchant guardrail rules & thresholds |
| `PUT` | `/api/settings` | Update threshold rules (e.g. `HUMAN_APPROVAL_THRESHOLD`, `MAX_RETRIES`) |
| `POST` | `/api/settings/test-ai` | Test live connectivity to NVIDIA AI API |
| `POST` | `/api/settings/test-webhook` | Validate webhook configuration |
| `GET` | `/api/exceptions` | List system exceptions with severity & status filters |
| `GET` | `/api/exceptions/{exc_id}` | Get exception details |
| `POST` | `/api/exceptions/{exc_id}/action` | Resolve, ignore, or retry exception |

---

## 🔐 Environment Variables & Configuration

### Backend (`backend/.env` or Render Dashboard)
```env
# PostgreSQL Database Connection URL (Supabase or standard PostgreSQL)
DATABASE_URL=postgresql://user:password@host:5432/dbname

# Frontend URL for CORS
FRONTEND_URL=https://revive-x-five.vercel.app

# AI Provider Configuration
AI_PROVIDER=nvidia
NVIDIA_API_KEY=nvapi-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
NVIDIA_BASE_URL=https://integrate.api.nvidia.com/v1
NVIDIA_MODEL=nvidia/nemotron-3-nano-30b-a3b

# Razorpay Webhook & Payment Link Configuration
RAZORPAY_WEBHOOK_SECRET=your_test_webhook_secret

# Master toggle for real Razorpay Payment Link creation (Default: false)
RAZORPAY_LIVE_RECOVERY_ENABLED=false

# Razorpay Test Mode API Credentials (Must start with rzp_test_)
RAZORPAY_KEY_ID=rzp_test_xxxxxxxxxxxxxx
RAZORPAY_KEY_SECRET=yyyyyyyyyyyyyyyyyyyyyyyy
```

### Frontend (`frontend/.env.local` or Vercel Dashboard)
```env
# Backend API Base URL
NEXT_PUBLIC_API_BASE_URL=https://revivex-nzdp.onrender.com
```

---

## 🚀 Local Development Setup

### Prerequisites
- Python 3.11+ / 3.14
- Node.js 18+ & npm
- PostgreSQL database instance

### 1. Clone Repository
```bash
git clone https://github.com/bhaskararamkarri/ReviveX.git
cd ReviveX
```

### 2. Backend Setup
```bash
cd backend
python -m venv venv

# Windows
venv\Scripts\activate
# macOS/Linux
source venv/bin/activate

pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

### 3. Frontend Setup
```bash
cd ../frontend
npm install
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🧪 Testing & Verification

Run the automated backend test suite (35 unit and integration tests):
```bash
cd backend
pytest -v
```

Run frontend linter and production build verification:
```bash
cd frontend
npm run lint
npm run build
```

---

## 🛡️ Security & Compliance
- **Cryptographic Signature Verification**: Every webhook request is verified via HMAC-SHA256 before ingestion.
- **Test Mode Isolation**: Strict key prefix validation (`rzp_test_*`) guarantees no live financial charges can ever be initiated.
- **Idempotency Guard**: All inbound events and transaction states are checked for duplicates.
- **Zero Secret Exposure**: `.env` and sensitive credential files are excluded from Git tracking via comprehensive `.gitignore` rules.

---

## 📄 License
This project is licensed under the MIT License.
