import type { SubscriptionPlan } from '@/types'

// ─── API ────────────────────────────────────────────────────────────────────
export const API_URL = 'http://localhost:8000/api/v1'

// ─── App ────────────────────────────────────────────────────────────────────
export const APP_NAME = 'PadelAI Coach'

export const APP_DESCRIPTION =
  'Entrena tu pádel con inteligencia artificial – análisis de vídeo, tutor personalizado y seguimiento de progreso.'

// ─── Subscription plans (display info) ──────────────────────────────────────
export const PLANS: (SubscriptionPlan & { popular?: boolean })[] = [
  {
    id: 'free',
    name: 'Gratuito',
    price: 0,
    interval: 'month',
    features: [
      '3 análisis de vídeo al mes',
      'Estadísticas básicas',
      'Chat con IA limitado',
    ],
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 9.99,
    interval: 'month',
    popular: true,
    features: [
      'Análisis de vídeo ilimitado',
      'Estadísticas avanzadas',
      'Chat con IA ilimitado',
      'Plan de entrenamiento personalizado',
      'Comparativa con profesionales',
    ],
  },
  {
    id: 'annual',
    name: 'Anual',
    price: 89.99,
    interval: 'year',
    features: [
      'Todo lo de Pro',
      '2 meses gratis',
      'Soporte prioritario',
      'Acceso anticipado a nuevas funciones',
    ],
  },
]

// ─── Navigation ─────────────────────────────────────────────────────────────
export interface NavLink {
  label: string
  href: string
  requiresAuth?: boolean
  requiresGuest?: boolean
}

export const NAV_LINKS: NavLink[] = [
  { label: 'Inicio', href: '/' },
  { label: 'Análisis', href: '/analisis', requiresAuth: true },
  { label: 'Progreso', href: '/progreso', requiresAuth: true },
  { label: 'Planes', href: '/planes', requiresGuest: true },
  { label: 'Chat', href: '/chat', requiresAuth: true },
]
