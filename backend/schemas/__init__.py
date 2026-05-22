"""PadelAI Tutor — Pydantic v2 Schemas.

Exports all request/response schemas for the API layer.
"""

from .auth import LoginRequest, RefreshRequest, RegisterRequest, TokenResponse
from .chat import (
    ChatMessageResponse,
    ChatRequest,
    ChatResponse,
    ConversationListResponse,
    ConversationResponse,
    CreateConversationRequest,
    HealthResponse,
)
from .subscription import (
    CheckoutRequest,
    CheckoutResponse,
    PlanResponse,
    SubscriptionResponse,
)
from .user import UserResponse, UserUpdate

__all__ = [
    # Auth
    "RegisterRequest",
    "LoginRequest",
    "TokenResponse",
    "RefreshRequest",
    # User
    "UserResponse",
    "UserUpdate",
    # Subscription
    "PlanResponse",
    "CheckoutRequest",
    "CheckoutResponse",
    "SubscriptionResponse",
    # Chat
    "ChatRequest",
    "ChatResponse",
    "HealthResponse",
    "ConversationResponse",
    "ConversationListResponse",
    "CreateConversationRequest",
    "ChatMessageResponse",
]
