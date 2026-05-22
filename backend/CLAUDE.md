# PadelAI Tutor — Backend

## Stack
- **Backend**: FastAPI + SQLAlchemy 2.0 (async) + PostgreSQL + Redis
- **Auth**: JWT (python-jose) + OAuth2 password + refresh tokens
- **Payments**: Stripe Checkout + webhooks
- **Python**: 3.12+, async/await throughout
- **Deps**: pip + requirements.txt (pinned)

## Full File Structure to Build
Crea todos estos archivos con código completo y funcional:

```
backend/
├── main.py                 # FastAPI entrypoint, CORS, routers
├── requirements.txt        # Pinned deps
├── .env.example            # Template env vars
├── alembic.ini             # DB migrations setup
├── alembic/
│   ├── env.py
│   └── versions/
├── core/
│   ├── __init__.py
│   ├── config.py           # pydantic-settings Settings
│   ├── database.py         # async engine, sessionmaker, get_db
│   └── security.py         # JWT create/verify, password hash, OAuth2 scheme
├── models/
│   ├── __init__.py
│   ├── base.py             # DeclarativeBase
│   ├── user.py             # User, Subscription
│   ├── chat.py             # Conversation, ChatMessage
│   └── video.py            # VideoRecording, AnalysisResult
├── schemas/
│   ├── __init__.py
│   ├── auth.py             # RegisterRequest, LoginRequest, TokenResponse
│   ├── user.py             # UserResponse, UserUpdate
│   ├── subscription.py     # PlanResponse, CheckoutSessionResponse
│   └── chat.py             # ChatRequest, ChatResponse
├── api/
│   ├── __init__.py
│   ├── deps.py             # get_db, get_current_user, rate_limit
│   └── v1/
│       ├── __init__.py
│       ├── auth.py         # POST register, login, refresh
│       ├── users.py        # GET/PATCH me
│       ├── subscriptions.py# GET plans, POST create-checkout
│       └── webhooks.py     # POST stripe
├── services/
│   ├── __init__.py
│   ├── auth_service.py     # Register, authenticate, refresh
│   └── payment_service.py  # Stripe session creation, webhook handling
└── migrations/             # Alembic auto-generated
```

## Coding Standards
- Type hints on ALL functions (def func(x: int) -> str:)
- Async/await everywhere (no sync DB calls)
- SQLAlchemy 2.0 style: select(), not query()
- Pydantic v2 models for schemas
- Alembic for migrations (autogenerate)
- Pinned requirements.txt (pip freeze style)
- Docstrings on all public functions
- Error handling with HTTPException + proper status codes

## Models

### User
- id: UUID (primary key, default uuid4)
- email: String(255), unique, indexed, not null
- name: String(100), not null
- hashed_password: String(255), not null
- is_active: Boolean, default True
- is_verified: Boolean, default False
- created_at: DateTime(timezone=True), server_default=func.now()
- updated_at: DateTime(timezone=True), onupdate=func.now()

### Subscription
- id: UUID, primary key
- user_id: UUID, ForeignKey("users.id"), unique (one sub per user)
- plan: Enum("free", "pro_monthly", "pro_yearly", "elite"), default "free"
- stripe_customer_id: String(255), nullable
- stripe_subscription_id: String(255), nullable
- status: Enum("active", "canceled", "past_due", "incomplete"), default "active"
- current_period_end: DateTime(timezone=True), nullable
- created_at: DateTime(timezone=True)
- updated_at: DateTime(timezone=True)

### Conversation
- id: UUID, primary key
- user_id: UUID, ForeignKey("users.id"), indexed
- title: String(200), default "New conversation"
- created_at: DateTime(timezone=True)
- updated_at: DateTime(timezone=True)

### ChatMessage
- id: UUID, primary key
- conversation_id: UUID, ForeignKey("conversations.id"), indexed
- role: Enum("user", "assistant", "system")
- content: Text, not null
- metadata: JSONB, nullable (for token counts, model used, etc.)
- created_at: DateTime(timezone=True)

### VideoRecording
- id: UUID, primary key
- user_id: UUID, ForeignKey("users.id"), indexed
- title: String(200)
- file_url: String(500), not null (S3/Supabase URL)
- thumbnail_url: String(500), nullable
- duration_seconds: Integer, nullable
- status: Enum("uploaded", "processing", "completed", "failed"), default "uploaded"
- created_at: DateTime(timezone=True)
- updated_at: DateTime(timezone=True)

### AnalysisResult
- id: UUID, primary key
- video_id: UUID, ForeignKey("video_recordings.id"), unique
- pose_data: JSONB, nullable (MediaPipe landmarks per frame)
- feedback: JSONB, nullable (structured AI feedback)
- score: Float, nullable (overall technique score 0-100)
- summary: Text, nullable
- created_at: DateTime(timezone=True)
- updated_at: DateTime(timezone=True)

## API Routes (complete)
- POST   /api/v1/auth/register          — {email, name, password} → {access_token, refresh_token, user}
- POST   /api/v1/auth/login             — {email, password} → {access_token, refresh_token, user}
- POST   /api/v1/auth/refresh           — {refresh_token} → {access_token, refresh_token}
- GET    /api/v1/users/me               — → current user profile
- PATCH  /api/v1/users/me               — update name, email
- GET    /api/v1/subscriptions/plans    — → list of plans with prices
- POST   /api/v1/subscriptions/create-checkout  — {plan_id} → {checkout_url}
- GET    /api/v1/subscriptions/current  — → current user's subscription
- POST   /api/v1/webhooks/stripe        — Stripe event handler

## Stripe Plans Config
Stripe products/prices are created via dashboard. In config.py, define:
- FREE: no Stripe price
- PRO_MONTHLY: price_xxx (stripe_price_id)
- PRO_YEARLY: price_xxx
- ELITE: price_xxx

## Build Requirements
1. All files must be syntactically valid Python
2. The app must run with: uvicorn main:app --reload
3. All relationships must work (User.subscription, Conversation.messages, etc.)
4. Use asyncpg for PostgreSQL driver
5. Use python-jose[cryptography] for JWT
6. Use passlib[bcrypt] for password hashing
7. Use pydantic-settings for config
8. Include proper CORS middleware
9. Include health endpoint: GET /health
