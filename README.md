# ReviveX

<p align="center">
  <em>An AI-powered autonomous payment recovery and revenue recovery platform.</em>
</p>

## Overview

ReviveX is an autonomous platform designed to detect failed payment transactions, diagnose their root causes, determine appropriate recovery actions, and recover at-risk revenue through automated AI workflows with human-in-the-loop approval for exceptions.

By analyzing payment failures from gateways like Razorpay using NVIDIA's advanced LLMs, ReviveX aims to drastically improve revenue recovery rates by automating the manual process of churn prevention and payment retries.

## Key Features

- **Autonomous Payment Recovery:** End-to-end pipeline to capture, diagnose, and resolve payment failures automatically.
- **AI-Powered Diagnostics:** Uses advanced LLMs (via NVIDIA API) to classify root causes (e.g., insufficient funds, bank declines, suspected fraud).
- **Orchestrator Workflow:** A background orchestration engine that routes cases through Detection -> Diagnosis -> Decision -> Recovery phases.
- **Human-in-the-Loop:** Cases requiring high-level intervention, such as large transaction amounts or complex fraud suspicions, are routed to a dashboard for manual review.
- **Exception Center:** Tracks and aggregates system anomalies and AI guardrail triggers.
- **Live Dashboard:** Next.js Server Components rendering real-time revenue metrics, recovery rates, and case breakdowns.

## Architecture

ReviveX leverages a modern, decoupled architecture:

- **Frontend:** Next.js 16 (App Router), React 19, Tailwind CSS v4, Recharts, hosted on **Vercel**.
- **Backend:** FastAPI (Python), SQLAlchemy, deployed on **Render**.
- **Database:** PostgreSQL (via Supabase or standard PostgreSQL).
- **AI Integration:** NVIDIA LLMs / OpenRouter.

### Production Environment
*   **Production Frontend:** `https://revive-x-five.vercel.app`
*   **Production Backend API:** `https://revivex-nzdp.onrender.com/api`

*(Note: Production endpoints and data (e.g. ₹392,296.71 at risk, 19.23% recovery rate) are completely dynamic and rely on the live database.)*

## Project Structure

```text
ReviveX/
├── backend/
│   ├── alembic/                # Database migration scripts
│   ├── app/
│   │   ├── models/             # SQLAlchemy database tables
│   │   ├── schemas/            # Pydantic data validation schemas
│   │   ├── scripts/            # CLI utilities and test data generators
│   │   ├── services/           # Core business logic & AI integration
│   │   │   ├── decision.py     # AI action decision logic
│   │   │   ├── detection.py    # Gateway payload parsing
│   │   │   ├── diagnosis.py    # Root cause LLM analysis
│   │   │   ├── guardrail.py    # AI safety and sanity checks
│   │   │   ├── llm.py          # NVIDIA LLM wrapper
│   │   │   ├── orchestrator.py # Pipeline state machine
│   │   │   ├── razorpay.py     # Payment gateway webhook handlers
│   │   │   └── recovery.py     # Automated execution of retry/nudge
│   │   ├── database.py         # PostgreSQL engine connection
│   │   └── main.py             # FastAPI entrypoint and routes
│   ├── tests/                  # Unit and integration tests
│   ├── alembic.ini             # Alembic configuration
│   └── requirements.txt        # Python dependencies
│
├── frontend/
│   ├── src/
│   │   ├── app/                # Next.js App Router (pages & layouts)
│   │   ├── components/         # Reusable React components (Charts, Badges, etc.)
│   │   └── lib/                # Configuration and utilities
│   ├── next.config.ts          # Next.js config & backend API rewrites
│   ├── tailwind.config.js      # Tailwind CSS configuration
│   └── package.json            # Node.js dependencies
│
├── .gitignore                  # Git ignore rules
└── README.md                   # Project documentation
```

## API Endpoints

The FastAPI backend exposes the following key endpoints:

**Dashboard & Metrics**
- `GET /api/dashboard/stats`: Returns core metrics (revenue at risk, recovered revenue, recovery rate).
- `GET /api/dashboard/breakdown`: Returns status breakdowns for charts.

**Case Management**
- `GET /api/cases`: List all payment failure cases with pagination.
- `GET /api/cases/{case_id}`: Retrieve a specific case by ID.
- `GET /api/cases/{case_id}/audit`: Retrieve the chronological timeline of AI decisions for a case.
- `POST /api/cases/{case_id}/action`: Submit human approval/rejection for pending cases.

**Orchestration & Webhooks**
- `POST /api/orchestrator/process-open`: Trigger asynchronous processing of all open cases.
- `POST /api/orchestrator/run-pipeline`: Run the complete end-to-end recovery pipeline.
- `POST /webhook/razorpay`: Endpoint to receive live failure events from Razorpay.

**System Configuration & Exceptions**
- `GET /api/settings` & `PUT /api/settings`: Manage system thresholds (e.g., max discount, auto-retry toggles).
- `GET /api/exceptions` & `GET /api/exceptions/{exc_id}`: View system exceptions and AI guardrail failures.
- `POST /api/exceptions/{exc_id}/action`: Resolve or acknowledge exceptions.

## Environment Variables

### Frontend (`frontend/.env.local` or Vercel Environment Variables)
```env
# The backend API URL. For production, set this in Vercel. 
# Defaults to localhost during local development.
API_BASE_URL=https://revivex-nzdp.onrender.com/api
```

### Backend (`backend/.env` or Render Environment Variables)
```env
# Database Connection
DATABASE_URL=postgresql://user:pass@host/db

# CORS Configuration
FRONTEND_URL=https://revive-x-five.vercel.app

# AI Provider Configuration
AI_PROVIDER=nvidia            # Or 'openrouter'
NVIDIA_API_KEY=your_nvidia_api_key
NVIDIA_BASE_URL=https://integrate.api.nvidia.com/v1
NVIDIA_MODEL=meta/llama-3.1-405b-instruct

# Webhook Secrets
# Webhook Secrets
RAZORPAY_WEBHOOK_SECRET=your_webhook_secret
```

## Razorpay Webhook Integration

ReviveX uses Razorpay webhooks (`POST /api/webhooks/razorpay`) as the primary event source for the recovery pipeline.

- **Setup**: Configure your Razorpay dashboard to send webhooks to this endpoint.
- **Required Environment Variable**: `RAZORPAY_WEBHOOK_SECRET` must match the secret configured in Razorpay.
- **Supported Events**: Currently supports `payment.failed`, `payment.authorized`, and `payment.captured`.
- **Security & Signature Verification**: All webhooks are verified using HMAC SHA-256 against the `x-razorpay-signature` header. Invalid signatures are rejected with HTTP 401.
- **Idempotency**: Webhooks are processed idempotently using the `x-razorpay-event-id`. Duplicate deliveries of the same event will be safely ignored (returning HTTP 200).
- **Simulated Recovery (Dry-Run)**: Currently, all AI-recommended recovery actions (like retries) are logged and simulated. No real financial charges are executed during this MVP phase.

## Security

**Authentication:** This MVP currently lacks API authentication. Before deploying to production with real user data or financial transactions, a robust authentication middleware (e.g., JWT, OAuth2, or Supabase Auth) **MUST** be implemented to protect the endpoints and dashboard.

**Secret Management:** Never commit `.env` files, API keys, or database credentials to version control. They should be strictly managed through Vercel and Render's environment variable dashboards.
