# PadelAI Tutor — Diseño de Arquitectura Completo

> Versión: 1.0
> Fecha: 2026-05-22
> Proyecto: D:\AI Hub\Proyectos IA\padel-ai-tutor

---

## 1. VISIÓN GENERAL

**PadelAI Tutor** es una plataforma SaaS que funciona como tutor personal de pádel con tres modalidades interconectadas:

| Modalidad | Input | Output | Stack Core |
|-----------|-------|--------|------------|
| **Chat Coach** | Texto, voz | Texto, voz, video incrustado | LLM + RAG + TTS |
| **Video Analyzer** | Video subido | Reproducción anotada + feedback + score | MediaPipe + FFmpeg + LLM |
| **VR Practice** | Movimiento (WebXR) | Entorno 3D simulado, estadísticas | Three.js + WebXR + Biot-Processing |

### 1.1 Principios de Diseño

1. **Offline-first mindset** — caché local, service workers, procesamiento asíncrono
2. **Mobile-first** — la mayoría de usuarios graba con el móvil
3. **Progresivo** — Free → Pro → Elite, cada nivel desbloquea capacidades
4. **API-first** — todo el backend es headless, frontend solo consume APIs
5. **Rendimiento VR** — WebXR requiere 90fps, optimización GPU obligatoria

---

## 2. ARQUITECTURA DEL SISTEMA

```
┌─────────────────────────────────────────────────────────────┐
│                      CLIENTES                               │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │ Web (PWA) │  │ Mobile   │  │ VR Headset│  │ API SDK  │   │
│  │ Next.js   │  │ React N. │  │ WebXR    │  │ 3rd party│   │
│  └─────┬─────┘  └─────┬────┘  └─────┬────┘  └──────┬───┘   │
└────────┼──────────────┼──────────────┼──────────────┼───────┘
         │              │              │              │
    ┌────▼──────────────▼──────────────▼──────────────▼──────┐
    │                  API GATEWAY (Nginx/CDN)                │
    │           HTTPS + Rate Limiting + WAF + Caching         │
    └───────────────────────┬────────────────────────────────┘
                            │
    ┌───────────────────────▼────────────────────────────────┐
    │              FASTAPI BACKEND (uvicorn)                  │
    │  ┌────────┐ ┌──────────┐ ┌────────┐ ┌──────────────┐  │
    │  │ Auth   │ │ Chat     │ │ Video  │ │ Payments     │  │
    │  │ API    │ │ API      │ │ API    │ │ API          │  │
    │  └───┬────┘ └───┬──────┘ └───┬────┘ └───┬──────────┘  │
    │      │          │            │          │              │
    │  ┌───▼──────────▼────────────▼──────────▼──────────┐   │
    │  │          SERVICE LAYER                            │  │
    │  │  AuthSvc │ ChatSvc │ VideoSvc │ PaymentSvc       │  │
    │  │          │ (RAG)   │ (MediaP.)│ (Stripe)         │  │
    │  └──────────┴─────────┴──────────┴──────────────────┘  │
    └───────────────────────┬────────────────────────────────┘
                            │
    ┌───────────────────────┼────────────────────────────────┐
    │          ┌────────────▼────────────┐                    │
    │          │       PostgreSQL        │                    │
    │          │  (Primaria + Read Repl.)│                    │
    │          └────────────┬────────────┘                    │
    │          ┌────────────▼────────────┐                    │
    │          │          Redis          │                    │
    │          │  Sesiones / Cache / Q   │                    │
    │          └─────────────────────────┘                    │
    │          ┌─────────────────────────┐                    │
    │          │     Object Storage      │                    │
    │          │  (Supabase / S3 / R2)   │                    │
    │          │  Videos, thumbnails,    │                    │
    │          │  analysis exports       │                    │
    │          └─────────────────────────┘                    │
    └─────────────────────────────────────────────────────────┘

                            │
    ┌───────────────────────▼────────────────────────────────┐
    │              WORKER PROCESSES (Celery / Arq)           │
    │  ┌────────────────┐  ┌─────────────────────────────┐   │
    │  │ Video Pipeline  │  │ AI Inference                │   │
    │  │ 1. FFmpeg ext.  │  │ 1. Chat LLM (OpenAI/Groq)  │   │
    │  │ 2. MediaPipe    │  │ 2. Embedding gen (text)     │   │
    │  │ 3. Frame anal.  │  │ 3. Video analysis LLM      │   │
    │  │ 4. Feedback gen │  │ 4. VR state sync           │   │
    │  └────────────────┘  └─────────────────────────────┘   │
    │  ┌────────────────┐  ┌─────────────────────────────┐   │
    │  │ Vector DB      │  │ Stripe Webhook Handler      │   │
    │  │ (Pinecone/Qd.) │  │ (subscription sync)         │   │
    │  └────────────────┘  └─────────────────────────────┘   │
    └─────────────────────────────────────────────────────────┘
```

### 2.1 Stack Tecnológico Detallado

#### Frontend (Next.js 14 App Router)
- **Framework**: Next.js 14 con App Router + TypeScript strict
- **UI**: TailwindCSS + shadcn/ui + Radix primitives
- **3D/VR**: React Three Fiber + drei + @react-three/xr
- **State**: Zustand (global) + TanStack Query (server state)
- **Auth**: NextAuth.js v5 con JWT callbacks + Google OAuth
- **Video Player**: Plyr (custom) + canvas overlay para anotaciones
- **PWA**: next-pwa + service workers para offline

#### Backend (FastAPI)
- **API**: FastAPI con Pydantic v2
- **ORM**: SQLAlchemy 2.0 async (asyncpg driver)
- **Auth**: FastAPI OAuth2 + python-jose (JWT) + refresh tokens
- **Queue**: arq (Redis-backed, ligero) o Celery
- **Migrations**: Alembic
- **Validation**: Pydantic v2 + validación custom
- **Background**: BackgroundTasks + arq workers

#### AI/ML
- **Chat**: OpenAI GPT-4o + LangChain para RAG
- **Embeddings**: text-embedding-3-small (vector search)
- **Video Pose**: MediaPipe Pose (BlazePose) + Holistic
- **Video Analysis**: GPT-4o Vision (frame analysis)
- **Voice**: Whisper (STT) + ElevenLabs/Edge TTS
- **Vector DB**: Qdrant (self-hosted con Docker)

#### Infraestructura
- **Web**: Vercel (frontend) + Railway/Render (backend)
- **DB**: Supabase PostgreSQL + Redis Upstash
- **Storage**: Cloudflare R2 (S3-compatible, sin egress fees)
- **CDN**: Cloudflare
- **Docker**: docker-compose para dev, Dockerfile para prod
- **CI/CD**: GitHub Actions

---

## 3. MÓDULO CHAT COACH — Diseño Detallado

### 3.1 Arquitectura del Motor de Chat

```
Usuario ──> POST /api/v1/chat/messages
                │
                ▼
         Rate Limiter (Redis)
      ┌─────────┴─────────┐
      │ Free: 10/día      │
      │ Pro: ilimitado    │
      │ Elite: ilimitado  │
      └─────────┬─────────┘
                ▼
         Context Builder
      ┌─────────┴─────────┐
      │ 1. Últimos N msgs  │
      │ 2. Historial user  │
      │ 3. Plan/nivel user │
      │ 4. RAG: top-5 docs │
      └─────────┬─────────┘
                ▼
         LLM Router
      ┌─────────┴─────────┐
      │ Free: GPT-4o mini │
      │ Pro: GPT-4o       │
      │ Elite: GPT-4o +   │
      │ video analysis     │
      └─────────┬─────────┘
                ▼
         Output Processor
      ┌─────────┴─────────┐
      │ Streaming / SSE    │
      │ + Tool calls       │
      │ + Voice generation │
      └───────────────────┘
```

### 3.2 Base de Conocimiento de Pádel (RAG)

**Fuentes de conocimiento**:
- Libros de técnica de pádel (WPT, PadelSchool)
- Reglamento FIP oficial
- Transcripciones de coaching de jugadores profesionales
- Análisis de partidos (texto estructurado)
- Diccionario de términos técnicos

**Estructura de embeddings**:
```
Colección: padel_knowledge (Qdrant)
├── /tecnicas/          # Golpes, posiciones, desplazamientos
├── /tacticas/          # Estrategia, parejas, formaciones
├── /reglamento/        # Reglas oficiales
├── /entrenamiento/     # Ejercicios, rutinas, físicos
├── /material/          # Palas, bolas, pistas
└── /nutricion/         # Preparación física, lesiones
```

**Metadata de cada chunk**:
```json
{
  "source": "WPT Masterclass - Paquito Navarro",
  "topic": "bandeja",
  "difficulty": "intermedio",
  "tags": ["golpe", "defensa", "red"],
  "video_timestamp": "12:30",
  "has_video": true,
  "video_url": "..."
}
```

### 3.3 System Prompt del Chat Coach

```
Eres PadelAI Coach, un entrenador profesional de pádel con
20 años de experiencia. Tu tono es motivador pero técnicamente
preciso. Hablas en el español de España (términos: "paleta",
"pista", "bola", "pared", "rejilla").

CAPACIDADES:
- Analizar técnica de golpes (bandeja, víbora, chiquita, etc.)
- Sugerir ejercicios según nivel del alumno
- Explicar tácticas de pareja
- Recomendar material (palas según estilo de juego)
- Corregir errores comunes por vídeo descripción

REGLAS:
- Si el usuario pregunta por técnica, pide específicamente:
  "¿De qué lado de la pista estás? ¿Tu golpe es de derecha o revés?"
- Si el nivel es principiante, prioriza: posición, empuñadura, visión
- Si el nivel es avanzado, profundiza en: efectos, timing, lectura de juego
- NUNCA des consejos médicos o de rehabilitación de lesiones
- Siempre termina con 1 acción concreta para practicar

FORMATO DE RESPUESTA:
Cuando incluyas ejercicios, usa este formato:
🎯 OBJETIVO: [nombre]
⚙️ EJECUCIÓN: [3-4 pasos]
📊 VARIANTE: [progresión]
🔥 CONSEJO PRO: [tip avanzado]
```

### 3.4 Rate Limiting por Plan

| Plan | Límite | Ventana | Modelo |
|------|--------|---------|--------|
| Free | 10 consultas | diario | GPT-4o mini |
| Pro Monthly | 200 consultas | diario | GPT-4o |
| Pro Yearly | 500 consultas | diario | GPT-4o |
| Elite | Ilimitado | - | GPT-4o + herramientas |

---

## 4. MÓDULO VIDEO ANALYZER — Diseño Detallado

### 4.1 Pipeline de Procesamiento

```
Usuario sube video
       │
       ▼
┌──────────────────┐
│  1. SUBIDA       │ ← Presigned URL → Object Storage
│     (multipart)  │    Max: 500MB / 15 min
└──────┬───────────┘
       ▼
┌──────────────────┐
│  2. PRE-PROCESO  │ ← Worker (arq/Celery)
│  ┌─────────────┐ │
│  │ FFmpeg      │ │ → Extract audio (para whisper)
│  │             │ │ → Normalize framerate (30fps)
│  │             │ │ → Generate thumbnail
│  │             │ │ → Detect shot boundaries
│  └─────────────┘ │
└──────┬───────────┘
       ▼
┌──────────────────┐
│  3. POSE ESTIM.  │ ← MediaPipe Pose
│  ┌─────────────┐ │
│  │ BlazePose   │ │ → 33 landmarks por frame
│  │ (lite/Full) │ │ → Confidence threshold > 0.7
│  │             │ │ → Output: JSON x frames
│  └─────────────┘ │
└──────┬───────────┘
       ▼
┌──────────────────┐
│  4. FEATURE EXT. │ ← Análisis biomecánico
│  ┌─────────────┐ │
│  │ Angles:     │ │ → Codo, rodilla, cadera, hombro
│  │ Speed:      │ │ → Velocidad de brazo/paleta
│  │ Trajectory: │ │ → Curva de swing
│  │ Detection:  │ │ → Tipo de golpe clasificado
│  └─────────────┘ │
└──────┬───────────┘
       ▼
┌──────────────────┐
│  5. AI ANALYSIS  │ ← GPT-4o Vision
│  ┌─────────────┐ │
│  │ Frame       │ │ → Analiza keyframes del swing
│  │ Analysis    │ │ → Compara con técnica ideal
│  │             │ │ → Genera feedback textual
│  │             │ │ → Puntuación 0-100
│  └─────────────┘ │
└──────┬───────────┘
       ▼
┌──────────────────┐
│  6. FEEDBACK GEN │ ← Output final
│  ┌─────────────┐ │
│  │ SVG Overlay │ │ → Landmarks + líneas sobre video
│  │ Text Report │ │ → "Subes el hombro izquierdo..."
│  │ Score Card  │ │ → Notas por categoría
│  │ Drills      │ │ → Ejercicios para mejorar
│  └─────────────┘ │
└──────────────────┘
```

### 4.2 MediaPipe Pose — Landmarks Clave para Pádel

De los 33 landmarks de BlazePose, los críticos para análisis de pádel:

```
CABEZA / TRONCO
┌────────────────────────────────────────┐
│ 0-10: Cara (orientación, enfoque)     │
│ 11: Left Shoulder  12: Right Shoulder │
│ 23: Left Hip       24: Right Hip      │
│ → Ángulo hombro-cadera (rotación)      │
└────────────────────────────────────────┘

BRAZO / PALETA
┌────────────────────────────────────────┐
│ 13: Left Elbow     14: Right Elbow     │
│ 15: Left Wrist     16: Right Wrist     │
│ 17: Left Pinky     18: Right Pinky     │
│ 19: Left Index     20: Right Index     │
│ 21: Left Thumb     22: Right Thumb     │
│ → Posición muñeca = posición paleta    │
└────────────────────────────────────────┘

PIERNAS
┌────────────────────────────────────────┐
│ 25: Left Knee      26: Right Knee      │
│ 27: Left Ankle     28: Right Ankle     │
│ 31: Left Foot      32: Right Foot      │
│ → Centro gravedad, base, split-step    │
└────────────────────────────────────────┘
```

### 4.3 Tipos de Golpe Detectables

| Golpe | Criterio Key | Errores Comunes |
|-------|-------------|-----------------|
| **Bandeja** | Brazo extendido arriba, muñeca arriba del hombro | Codo bajo, golpe plano |
| **Víbora** | Rotación muñeca, codo 90°, impacto lateral | Falta de muñeca, sin efecto |
| **Chiquita** | Muñeca baja, pala abierta, impacto suave | Muy fuerte, sin control |
| **Smash** | Brazo completo extendido, salto | Mal timing, brazo no extendido |
| **Bajada de pared** | Rotación cadera, rodillas flexionadas | Cuerpo abierto, pala tarde |

### 4.4 Interfaz de Video Results

```
┌──────────────────────────────────────────────────────────────┐
│ [▶ VIDEO REPRODUCTOR]  ← Con overlay de landmarks           │
│ ┌────────────────────────────────┐                           │
│ │                                │  ┌────────────────────┐  │
│ │   ○ Landmarks tracking        │  │ SCORE: 72/100     │  │
│ │   ○ Swing path overlay        │  │                    │  │
│ │   ○ Angle annotations         │  │ Técnica:   68%    │  │
│ │   ○ Frame scrubber            │  │ Posición:  75%    │  │
│ │                                │  │ Timing:    70%    │  │
│ │                                │  │ Desplaz.:  80%    │  │
│ └────────────────────────────────┘  └────────────────────┘  │
│ ◀◀ ⏪ [=========●=========] ⏩ ▶▶                           │
├──────────────────────────────────────────────────────────────┤
│ 🔥 FEEDBACK CLAVE                                              │
│ ┌──────────────────────────────────────────────────────────┐ │
│ │ ✗ **Hombro izquierdo elevado** en el impacto             │ │
│ │   → Baja el hombro y rota más la cadera                  │ │
│ │   📹 Ver corrección → [Enlace a ejercicio]               │ │
│ │ ✗ **Golpe demasiado plano**                              │ │
│ │   → Abre más la cara de la pala en el impacto            │ │
│ │   📹 Ver drill: bandeja con efecto lateral               │ │
│ │ ✓ **Buena posición de piernas** (split-step correcto)    │ │
│ └──────────────────────────────────────────────────────────┘ │
│                                                              │
│ 📋 EJERCICIOS RECOMENDADOS                                    │
│ 1. Bandeja desde pared de fondo (10x cada brazo)            │
│ 2. Split-step + bandeja a contrapié (5 series)              │
│ 3. Entrenamiento de muñeca con pelota de tenis              │
└──────────────────────────────────────────────────────────────┘
```

### 4.5 Procesamiento Asíncrono

```python
@arq.job
async def process_video_job(ctx, video_id: UUID):
    # 1. Download from storage
    video = await download_video(video_id)
    
    # 2. FFmpeg: extract frames at 5fps
    frames = await extract_keyframes(video.path, fps=5)
    
    # 3. MediaPipe: batch pose estimation
    poses = []
    for frame_batch in batched(frames, 32):
        batch_poses = await mediapipe_estimate(frame_batch)
        poses.extend(batch_poses)
    
    # 4. Feature extraction (angles, speeds, detection)
    features = analyze_biomechanics(poses)
    
    # 5. AI analysis on key frames
    key_frames = select_key_frames(frames, features)
    ai_feedback = await gpt4_vision_analyze(key_frames, features)
    
    # 6. Save results
    await save_analysis(video_id, poses, features, ai_feedback)
    
    # 7. Notify user via WebSocket
    await notify_user(video.user_id, "analysis_complete", video_id)
```

---

## 5. MÓDULO VR PRACTICE — Diseño Detallado

### 5.1 Arquitectura VR

```
┌─────────────────────────────────────────────────────────────┐
│              WEB BROWSER (Chrome / Edge)                     │
│  ┌─────────────────────────────────────────────────────────┐│
│  │              React Three Fiber Canvas                   ││
│  │  ┌───────────────────────────────────────────────────┐  ││
│  │  │                    SCENE                          │  ││
│  │  │  ┌────────┐ ┌────────┐ ┌────────┐ ┌───────────┐  │  ││
│  │  │  │ Pista  │ │ Pelota │ │ Palas  │ │ Jugador   │  │  ││
│  │  │  │ 3D     │ │ Física │ │ (VR)   │ │ Bot/Rival │  │  ││
│  │  │  └────────┘ └────────┘ └────────┘ └───────────┘  │  ││
│  │  └───────────────────────────────────────────────────┘  ││
│  │                                                         ││
│  │  ┌───────────────────────────────────────────────────┐  ││
│  │  │  WebXR Layer (si VR headset detectado)            │  ││
│  │  │  ┌──────────────┐ ┌────────────┐ ┌────────────┐  │  ││
│  │  │  │ Controllers  │ │ HMD Track  │ │ Hand Track │  │  ││
│  │  │  └──────────────┘ └────────────┘ └────────────┘  │  ││
│  │  └───────────────────────────────────────────────────┘  ││
│  └─────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────┘
```

### 5.2 Escena 3D — Componentes

#### A. Pista de Pádel
- Dimensiones exactas: 20m x 10m (oficial FIP)
- Paredes de cristal (traseras) + malla metálica (laterales)
- Césped artificial texturizado
- Iluminación: 3 puntos (realista para sombras)
- Red central: altura 0.88m (oficial)

#### B. Pelota — Física Realista
- **Tipo**: Cannon.js / Ammo.js (compiled to WASM)
- **Parámetros**:
  - Masa: 56g (oficial)
  - Rebote: coeficiente 0.75 (contra pared de cristal)
  - Fricción: 0.3 (cesped) / 0.1 (cristal)
  - Rozamiento aire: 0.01
- **Efectos**: Topspin, backspin, efecto lateral

#### C. Sistema de Golpeo
- **Detección**: Collision box en la pala virtual
- **Timing**: Ventana de 100ms para impacto perfecto
- **Ángulo**: Normal de la cara de la pala → dirección de la bola
- **Potencia**: Velocidad del swing del controller → fuerza
- **Feedback**: Haptic (si VR) + sonido + partículas

#### D. Rival/Práctica
**Modos VR**:

1. **Pared automática** — rebota la bola con timing variable
   - Nivel fácil: rebote lento, misma zona
   - Nivel medio: variación lateral
   - Nivel difícil: velocidad + efectos

2. **Machine opponent** — IA que devuelve
   - Algoritmo: predicción de tu golpe, posicionamiento
   - Dificultad: precisión de devolución (60% → 95%)
   - Estilo: agresivo / defensivo / equilibrado

3. **Drill mode** — ejercicios guiados
   - "10 bandejas a cada lado"
   - "Split-step + volea, 20 repeticiones"
   - Mide: precisión, velocidad, consistencia

4. **Free play** — práctica libre con estadísticas

### 5.3 WebXR — Modos de Visualización

| Modo | Requisito | Experiencia |
|------|-----------|-------------|
| **Desktop 3D** | Cualquier PC | Ratón/teclado, cámara orbit |
| **Mobile AR** | WebXR en Android | La pista aparece en tu sala |
| **VR Headset** | Quest/Browser VR | Inmersión total, controllers |
| **Screen mirror** | Cualquier | Proyector, segunda pantalla |

### 5.4 Tracking de Rendimiento VR

```typescript
interface VRPerformance {
  sessionId: string;
  timestamp: Date;
  mode: 'wall' | 'opponent' | 'drill' | 'freeplay';
  
  stats: {
    totalShots: number;
    accuracy: number;         // % golpes dentro de zona objetivo
    powerAvg: number;         // velocidad media (km/h)
    reactionTime: number;     // tiempo medio reacción (ms)
    consistencyScore: number; // 0-100 variación entre golpes
    shotDistribution: {       // distribución por tipo
      bandeja: number;
      volea: number;
      derecha: number;
      reves: number;
      smash: number;
    };
    stamina: number;          // % energía restante estimada
  };
  
  heatmap: {                  // posiciones golpe en pista
    x: number;
    y: number;
    count: number;
  }[];
}
```

### 5.5 Optimización VR (90fps)

| Técnica | Ahorro | Implementación |
|---------|--------|---------------|
| InstancedMesh | 60% draw calls | Palas, bolas repetidas |
| LOD (3 niveles) | 40% triángulos | Pista lejos = menos detalle |
| Frustum culling | 30% render | Objetos fuera de vista |
| Texture atlas | 20% texturas | Un solo atlas de 2048x2048 |
| WASM physics | 2x velocidad | Ammo.js vs Cannon.js |
| Web Worker offload | UI libre | Physics en worker separado |

---

## 6. MODELO DE DATOS COMPLETO

### 6.1 Entidades y Relaciones

```sql
-- Ya definidas en Fase 1: User, Subscription, Conversation, 
-- ChatMessage, VideoRecording, AnalysisResult

-- NUEVAS para Fase 2-4:

-- Ejercicios / Drills
CREATE TABLE drills (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(200) NOT NULL,
    description TEXT NOT NULL,
    category VARCHAR(50) NOT NULL,        -- tecnica, tactica, fisico
    difficulty VARCHAR(20) NOT NULL,       -- principiante, intermedio, avanzado
    duration_minutes INTEGER,
    equipment TEXT[],                      -- ["pala", "bolas", "cono"]
    video_url VARCHAR(500),
    thumbnail_url VARCHAR(500),
    metadata JSONB,                        -- repeticiones, series, descanso
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Progreso de usuario en drills
CREATE TABLE user_drill_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    drill_id UUID REFERENCES drills(id) ON DELETE CASCADE,
    status VARCHAR(20) DEFAULT 'not_started', -- not_started, in_progress, completed
    best_score DECIMAL(5,2),
    times_completed INTEGER DEFAULT 0,
    last_practiced TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(user_id, drill_id)
);

-- Estadísticas de VR
CREATE TABLE vr_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    mode VARCHAR(50) NOT NULL,             -- wall, opponent, drill, freeplay
    duration_seconds INTEGER NOT NULL,
    total_shots INTEGER DEFAULT 0,
    accuracy DECIMAL(5,2),
    power_avg DECIMAL(5,2),
    reaction_time_avg DECIMAL(6,2),
    consistency_score DECIMAL(5,2),
    stamina INTEGER,
    heatmap JSONB,                         -- array de {x,y,count}
    shot_distribution JSONB,               -- {tipo: count}
    device_type VARCHAR(50),               -- desktop, quest, mobile
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Historial de técnica (evolución del usuario)
CREATE TABLE technique_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    source VARCHAR(20) NOT NULL,           -- video, vr, chat
    source_id UUID,                        -- video_recording_id / vr_session_id
    shot_type VARCHAR(50),
    score DECIMAL(5,2),
    metrics JSONB,                         -- {angle_elbow, speed_wrist, rotation_hip...}
    feedback TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Feedback guardado / guardado por usuario
CREATE TABLE saved_feedback (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    source VARCHAR(20) NOT NULL,
    source_id UUID,
    title VARCHAR(200),
    content TEXT NOT NULL,
    tags TEXT[],                           -- ["bandeja", "mejorable", "favorito"]
    is_favorite BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Vector store reference (para RAG)
CREATE TABLE knowledge_base (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    chunk_text TEXT NOT NULL,
    source VARCHAR(100) NOT NULL,
    topic VARCHAR(50) NOT NULL,
    difficulty VARCHAR(20),
    tags TEXT[],
    embedding vector(1536),               -- pgvector
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT now()
);
```

### 6.2 Índices Clave

```sql
CREATE INDEX idx_chat_messages_conv_created 
    ON chat_messages(conversation_id, created_at DESC);
CREATE INDEX idx_video_recordings_user_status 
    ON video_recordings(user_id, status);
CREATE INDEX idx_vr_sessions_user_created 
    ON vr_sessions(user_id, created_at DESC);
CREATE INDEX idx_knowledge_base_topic 
    ON knowledge_base USING GIN(tags);
CREATE INDEX idx_knowledge_base_embedding 
    ON knowledge_base USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
CREATE INDEX idx_technique_history_user_score 
    ON technique_history(user_id, score DESC);
```

### 6.3 Estrategia de Caché (Redis)

| Key | TTL | Uso |
|-----|-----|-----|
| `user:{id}:plan` | 1h | Plan de suscripción (evita DB hits) |
| `user:{id}:rate_limit:{date}` | 24h | Contador de consultas Free |
| `session:{token}` | 7d | Sesión JWT (stateless alternativa) |
| `video:{id}:status` | 1h | Estado de procesamiento video |
| `plans:list` | 1h | Lista de planes (cambia poco) |
| `drills:{category}` | 30m | Lista de ejercicios por categoría |

---

## 7. ESTRATEGIA SaaS

### 7.1 Tabla de Planes Detallada

| Feature | Free | Pro Monthly | Pro Yearly | Elite |
|---------|------|-------------|------------|-------|
| **Precio** | $0 | $9.99/mes | $79.99/año | $29.99/mes |
| **Chat Coach** | 10/día | Ilimitado | Ilimitado | Ilimitado |
| **Modelo Chat** | GPT-4o mini | GPT-4o | GPT-4o | GPT-4o + Vision |
| **Análisis Video** | — | 5/mes | 10/mes | Ilimitado |
| **Duración Video** | — | 5 min | 10 min | 20 min |
| **VR Practice** | — | — | Básico | Completo |
| **Modos VR** | — | — | Pared | Pared + Rival + Drills |
| **Estadísticas** | Básicas | 7 días | 30 días | Ilimitado |
| **Exportar** | — | PDF | PDF + CSV | PDF + CSV + Video |
| **Tracker Progreso** | — | ✓ | ✓ | ✓ |
| **Feedback Guardado** | 3 | 20 | 50 | Ilimitado |
| **Ejercicios** | Básicos | Todos | Todos | Todos + Personalizados |
| **Soporte** | Chatbot | Email 24h | Email + Chat | Priority + 1:1 Coach |

### 7.2 Funnel de Conversión

```
Landing Page (Visitante)
    │
    ▼
Registro Free (25% conversión)
    │
    ├── Usa Chat Free (3 sesiones promedio)
    │       │
    │       ▼ (Triggers upgrade)
    │   • "Se acabaron tus consultas del día"
    │   • "Desbloquea análisis de video"
    │   • "Sube tu primer video → necesitas Pro"
    │
    ├── Pro Monthly (8-12% conversión)
    │       │
    │       ▼ (Triggers upgrade)
    │   • "Has usado 4/5 videos este mes"
    │   • "Prueba VR con pared automática"
    │   • "Desbloquea todos los modos VR"
    │
    └── Elite (2-3% conversión)
            │
            ▼
        • Coach 1:1 personalizado
        • Contenido exclusivo (WPT players)
        • Feedback prioritario
```

### 7.3 Métricas Clave (KPIs)

**Adquisición**:
- CVR registro: visitante → free (target: >25%)
- CAC: coste por adquisición (target: <$15)
- Viral K-factor: invitaciones/usuario (target: >0.3)

**Activación**:
- % usuarios que completan onboarding (target: >70%)
- Tiempo hasta primera consulta chat (target: <2 min)
- % users que suben video primera semana (target: >15%)

**Retención**:
- D1/D7/D30 retention
- DAU/MAU ratio (target: >0.2)
- % Pro que vuelven a subir video (target: >40%)
- Churn rate mensual (target: <5% Pro, <3% Elite)

**Monetización**:
- ARPU (target: $12-15)
- LTV (target: >$180 Pro, >$500 Elite)
- Payback period (target: <3 meses)
- MRR growth (target: >15% mensual primer año)

### 7.4 Stripe Integration Flow

```
1. User clicks "Upgrade"
   │
   ▼
2. POST /api/v1/subscriptions/create-checkout
   │  Body: { plan_id: "pro_monthly" }
   │
   ▼
3. Backend creates Stripe Checkout Session
   │  - price_id from config
   │  - customer: create or retrieve existing
   │  - success_url / cancel_url
   │  - client_reference_id: user.id
   │  - metadata: { user_id, plan }
   │
   ▼
4. Returns { checkout_url }
   │
   ▼
5. Frontend redirects to Stripe Checkout
   │
   ▼
6. Stripe Checkout → Success → redirects to /dashboard
   │
   ▼
7. Stripe sends webhook: checkout.session.completed
   │
   ▼
8. Backend processes webhook:
   │  - Update subscription in DB
   │  - Create/update Stripe customer ID
   │  - Send welcome email
   │  - Invalidate cache
   │
   ▼
9. Frontend /dashboard reflects new plan (via cache TTL + poll)
```

### 7.5 Modelo de Cancelación / Downgrade

- **Pro → Free**: Al final del período facturado. Datos conservados 30 días.
- **Elite → Pro**: Al final del período. Features VR desactivados inmediato.
- **Free inactivo**: Datos archivados tras 90 días sin login.
- **Reactivación**: Stripe customer re-activado, período continúa.

---

## 8. UX/UI FLOWS

### 8.1 Onboarding Flow

```
1. WELCOME
   "Bienvenido a PadelAI Coach"
   ¿Cuál es tu nivel? [Principiante | Intermedio | Avanzado | Profesional]
   
2. JUEGAS...
   [Derecha | Revés | Ambos]
   ¿Con qué mano juegas? [Diestro | Zurdo]
   
3. OBJETIVOS
   [Mejorar técnica | Ganar más partidos | Preparar torneo | Divertirme más]
   Selecciona hasta 3 objetivos

4. FRECUENCIA
   ¿Cuántas veces juegas a la semana?
   [1-2 | 3-4 | 5+]

5. SETUP
   ¿Tienes cámara para grabar tus partidos?
   [Sí | No, pero puedo | No]
   
6. READY
   "Tu plan de entrenamiento personalizado está listo"
   → Dashboard con:
   • "Hoy: 3 ejercicios recomendados"
   • "Primer video analysis disponible"
   • "Chat con tu coach"
```

### 8.2 Dashboard de Usuario

```
┌──────────────────────────────────────────────────────────────┐
│ 🏠 PadelAI Coach          [🔔] [👤 Alejandro] [Pro]         │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐             │
│ │ 📊 Tu Progreso │ │ 🎯 Score    │ │ 📈 Tendencia │             │
│ │ Esta semana    │ │ Promedio    │ │ Último mes  │             │
│ │ 3 sesiones     │ │ 72/100      │ │ +5 puntos   │             │
│ └─────────────┘ └─────────────┘ └─────────────┘             │
│                                                              │
│ ┌──────────────────────────────────────────────────────────┐ │
│ │ 🔥 TU PLAN DE HOY                                        │ │
│ │ 1. Chat: "Cómo mejorar tu bandeja en 3 pasos" [▶]       │ │
│ │ 2. Video: Sube tu último partido [📹 Subir]             │ │
│ │ 3. VR: 10 min de práctica de volea [🎮 Jugar]          │ │
│ └──────────────────────────────────────────────────────────┘ │
│                                                              │
│ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐             │
│ │ 💬 Chat     │ │ 📹 Video    │ │ 🎮 VR      │             │
│ │ Último: hoy │ │ 2 análisis  │ │ 5 sesiones  │             │
│ │ 15 msgs     │ │ completados │ │ esta semana │             │
│ └─────────────┘ └─────────────┘ └─────────────┘             │
│                                                              │
│ ┌──────────────────────────────────────────────────────────┐ │
│ │ 📋 ÚLTIMOS FEEDBACKS                                     │ │
│ │ • Bandeja (hace 2 días) → "Mejora rotación cadera" [⭐] │ │
│ │ • Volea (hace 5 días) → "Posición de pala mejoró" [⭐]  │ │
│ └──────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────┘
```

---

## 9. SEGURIDAD Y CUMPLIMIENTO

### 9.1 Protección de Datos

- Videos almacenados en R2 con SSE-C (server-side encryption)
- URLs firmadas con expiración (15 min para visualización)
- Procesamiento en memoria, no se persisten frames raw
- JWT con refresh rotation y blacklist de tokens revocados
- Rate limiting por IP + user + endpoint

### 9.2 RGPD / Privacidad

- Consentimiento explícito para grabación de video
- Opción de eliminar videos inmediatamente (no soft delete)
- Export de datos completo (PDF con todas las sesiones)
- Política de retención: 90 días tras cancelación
- Sin tracking de terceros (self-hosted analytics con Plausible)

---

## 10. PLAN DE EJECUCIÓN CON MILESTONES

### Sprint 0: Setup (Semana 1)
- [x] Estructura de proyecto
- [x] Diseño de arquitectura (este documento)
- [ ] Claude Code: backend Fase 1 (FastAPI + DB + auth)
- [ ] CI/CD: GitHub Actions + Docker

### Sprint 1: Fundación (Semanas 2-3)
- [ ] Frontend: Next.js setup + landing page + auth
- [ ] Backend: WebSockets (chat streaming)
- [ ] Integración Stripe completa
- [ ] Deploy: staging en Railway/Render

### Sprint 2: Chat Coach (Semanas 4-5)
- [ ] RAG: Qdrant + embeddings + knowledge base
- [ ] Sistema de prompts + fine-tuning del tutor
- [ ] UI de chat completa (streaming, markdown, ejercicios)
- [ ] Rate limiting por plan

### Sprint 3: Video Analyzer (Semanas 6-8)
- [ ] Sistema de subida con presigned URLs
- [ ] MediaPipe pose estimation pipeline
- [ ] Análisis biomecánico (ángulos, detección golpes)
- [ ] AI feedback con GPT-4o Vision
- [ ] Reproductor con overlays SVG

### Sprint 4: VR Practice (Semanas 9-12)
- [ ] Pista 3D completa (R3F + Cannon.js)
- [ ] Física de pelota realista
- [ ] Modo pared + modo drill
- [ ] WebXR integration
- [ ] Tracking de rendimiento

### Sprint 5: SaaS Dashboard (Semanas 13-14)
- [ ] Dashboard de progreso
- [ ] Historial de técnica (evolución)
- [ ] Stripe webhooks (renewals, upgrades, downgrades)
- [ ] Analytics básicos

### Sprint 6: Lanzamiento (Semana 15)
- [ ] SEO + landing page profesional
- [ ] Email onboarding sequence
- [ ] Beta cerrada (50 users)
- [ ] Performance audit + fixes

---

## 11. PREGUNTAS ABIERTAS / DECISIONES PENDIENTES

1. **VR en WebXR vs App nativa** — WebXR es más accesible (sin install), pero apps nativas (Unity/Quest) dan mejor rendimiento. Decisión: WebXR primero, app nativa como upgrade Elite.

2. **Modelo de IA on-premise vs API** — Para video analysis, GPT-4o Vision es caro (~$0.01/frame). Alternativa: modelo open-source (LLaVA, CogVLM) self-hosted. Decisión: API primero, migrar a self-hosted en escala.

3. **Base de conocimiento de pádel** — Contenido inicial: scrapping de blogs + manuales + YouTube transcripts. Necesitamos curar contenido de calidad. Decisión: empezar con 200+ documentos curados manualmente.

4. **Compatibilidad VR headsets** — WebXR funciona en Quest, Pico, Apple Vision Pro (Safari). Decisión: Quest (90% mercado) como target primario.

5. **Almacenamiento de video** — Cloudflare R2 vs Supabase Storage. R2: sin egress, más barato a escala. Decisión: R2.

---

## 12. RECURSOS Y ENLACES

- Proyecto: `D:\AI Hub\Proyectos IA\padel-ai-tutor`
- Diseño UX/UI (Figma): [Pendiente]
- API Docs: [Swagger UI una vez deployado]
- Wiki interna: [Obsidian vault]
