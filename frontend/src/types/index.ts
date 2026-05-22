// ─── User ───────────────────────────────────────────────────────────────────
export interface User {
  id: string
  email: string
  name: string
  is_active: boolean
  is_verified: boolean
  created_at: string
}

// ─── Subscription ───────────────────────────────────────────────────────────
export type SubscriptionStatus =
  | 'active'
  | 'canceled'
  | 'past_due'
  | 'incomplete'
  | 'incomplete_expired'
  | 'trialing'
  | 'unpaid'

export type PlanInterval = 'month' | 'year'

export interface SubscriptionPlan {
  id: string
  name: string
  price: number
  interval: PlanInterval
  features: string[]
}

export interface Subscription {
  id: string
  plan: SubscriptionPlan
  status: SubscriptionStatus
  current_period_end: string
  created_at: string
}

// ─── Auth ────────────────────────────────────────────────────────────────────
export interface AuthTokens {
  access_token: string
  refresh_token: string
  token_type: string
}

export interface AuthResponse {
  access_token: string
  refresh_token: string
  token_type: string
  user: User
}

// ─── Chat ────────────────────────────────────────────────────────────────────
export type MessageRole = 'user' | 'assistant' | 'system'

export interface ChatMessage {
  id: string
  conversation_id: string
  role: MessageRole
  content: string
  created_at: string
}

export interface Conversation {
  id: string
  title: string
  last_message?: string
  updated_at: string
  created_at: string
}

// ─── Video ────────────────────────────────────────────────────────────────────
export type VideoStatus = 'processing' | 'ready' | 'failed'

export interface VideoRecording {
  id: string
  title: string
  file_url: string
  status: VideoStatus
  created_at: string
}

// ─── Video Analysis ──────────────────────────────────────────────────────────
export interface FeedbackPoint {
  id: string
  icon: 'target' | 'alert-triangle' | 'check-circle' | 'trending-up' | 'lightbulb'
  title: string
  description: string
}

export interface Exercise {
  id: string
  title: string
  description: string
  duration: string
  difficulty: 'principiante' | 'intermedio' | 'avanzado'
}

export interface AnalysisResult {
  id: string
  video_title: string
  score: number
  feedback_points: FeedbackPoint[]
  ejercicios: Exercise[]
  created_at: string
  thumbnail_url?: string
}

export interface VideoAnalysisHistory {
  id: string
  title: string
  score: number
  thumbnail_url?: string
  created_at: string
  analysis_id: string
}

// ─── VR ──────────────────────────────────────────────────────────────────────
export interface VRSession {
  id: string
  title: string
  duration_seconds: number
  score?: number
  created_at: string
  feedback?: string
}

// ─── Upload ──────────────────────────────────────────────────────────────────
export type UploadState = 'empty' | 'selected' | 'uploading' | 'success' | 'error'

export type AnalysisState = 'idle' | 'uploading' | 'processing' | 'results'
