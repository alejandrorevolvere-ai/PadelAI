# PadelAI Tutor — Plan de Proyecto

## Visión General
App SaaS tipo tutor personal de pádel con 3 modalidades principales:
1. **Chat Coach** — Tutor AI conversacional (técnica, táctica, entrenamiento)
2. **Video Analyzer** — Subes videos de tus partidos, la IA analiza tu técnica
3. **VR Practice** — Simulación 3D/VR para practicar golpes sin estar en la pista

## Modelos de Pago (SaaS)
- **Free**: Chat básico (10 consultas/día), sin video, sin VR
- **Pro Monthly ($9.99)**: Chat ilimitado + análisis de video (5 videos/mes)
- **Pro Yearly ($79.99)**: Chat ilimitado + 10 videos/mes + VR básico
- **Elite ($29.99/mes)**: Todo ilimitado + VR completo + estadísticas avanzadas + contenido exclusivo

## Arquitectura Técnica

### Stack Principal
- **Frontend**: Next.js 14 (App Router) + React Three Fiber (3D/VR) + TailwindCSS
- **Backend**: FastAPI + SQLAlchemy + PostgreSQL
- **AI/ML**: OpenAI API (chat tutor) + MediaPipe Pose (análisis video) + LangChain (RAG)
- **Auth**: NextAuth.js + JWT
- **Pagos**: Stripe
- **Infra**: Docker + Vercel (frontend) + Railway/Render (backend)
- **Almacenamiento**: Supabase Storage (videos), Redis (caché/sesiones)

### Directorios
```
padel-ai-tutor/
├── frontend/              # Next.js app
│   ├── app/               # App Router pages
│   │   ├── chat/          # Chat coach
│   │   ├── video/         # Video analyzer
│   │   ├── vr/            # VR practice
│   │   ├── pricing/       # Planes de pago
│   │   └── dashboard/     # Panel de usuario
│   ├── components/        # Componentes reutilizables
│   ├── lib/               # Utilidades, hooks, API client
│   └── public/            # Assets estáticos
├── backend/               # FastAPI
│   ├── api/               # Endpoints REST
│   ├── models/            # SQLAlchemy models
│   ├── services/          # Lógica de negocio
│   │   ├── tutor/         # Motor del chat tutor
│   │   ├── video/         # Procesamiento de video
│   │   └── vr/            # Lógica VR
│   ├── payments/          # Stripe integration
│   └── core/              # Config, DB, auth
├── shared/                # Tipos y schemas compartidos
├── docs/                  # Documentación
└── docker-compose.yml
```

## Fases de Implementación

### Fase 1: Base (Sprint 1) — CLAUDE CODE
- Setup del monorepo
- Backend FastAPI con auth y DB
- Frontend Next.js con landing page y auth
- Modelo de datos (usuarios, suscripciones)
- Stripe integración básica

### Fase 2: Chat Coach (Sprint 2) — CLAUDE CODE
- Motor de chat con RAG
- Base de conocimiento de pádel
- UI de chat con mensajes en tiempo real
- Límites por plan de suscripción

### Fase 3: Video Analyzer (Sprint 3) — CLAUDE CODE
- Subida y procesamiento de video
- MediaPipe Pose Estimation
- Análisis de técnica (posición, golpes, errores)
- Feedback visual sobre el video

### Fase 4: VR Practice (Sprint 4) — CLAUDE CODE
- Escena 3D con React Three Fiber
- WebXR para VR
- Simulación de golpes
- Modalidad "sin pista" (entorno virtual)

### Fase 5: SaaS Completo (Sprint 5) — CLAUDE CODE
- Dashboard de usuario
- Analytics y progreso
- Stripe webhooks (renewals, upgrades)
- Landing page profesional
- SEO y performance

## Stack Específico por Módulo

| Módulo | Tecnología | Librerías Clave |
|--------|-----------|-----------------|
| Chat Coach | OpenAI + LangChain | gpt-4, RAG, embeddings |
| Video | MediaPipe + FFmpeg | Pose Landmarks, shot detection |
| VR | Three.js + WebXR | React Three Fiber, @react-three/xr |
| Pagos | Stripe | Stripe Checkout, webhooks |
| Auth | NextAuth.js | JWT, Google OAuth, Magic Link |
| DB | PostgreSQL + Redis | SQLAlchemy, asyncpg, redis-py |
| Cache | Redis | Upstash / Redis Stack |
| Storage | Supabase / S3 | Multer, presigned URLs |
