# ReviveX
It is an autonomous revenue recovery platform

## Environment Variables

### Frontend (.env or Vercel Environment Variables)
\\\env
API_BASE_URL=https://revivex-nzdp.onrender.com/api  # Replace with backend URL in production
\\\

### Backend (.env or Render Environment Variables)
\\\env
FRONTEND_URL=https://your-vercel-domain.vercel.app            # Replace with frontend URL in production
DATABASE_URL=postgresql://user:pass@host/db   # PostgreSQL connection string
AI_PROVIDER=nvidia                            # or openrouter
NVIDIA_API_KEY=your_nvidia_api_key
RAZORPAY_WEBHOOK_SECRET=your_webhook_secret
\\\

## Security
**Authentication:** This MVP currently lacks API authentication. Before deploying to production with real user data or financial transactions, a robust authentication middleware (e.g., JWT, OAuth2, or Supabase Auth) MUST be implemented.
