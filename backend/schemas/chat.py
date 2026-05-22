"""Chat schemas.

Pydantic v2 models for chat-related request/response payloads.
"""

from __future__ import annotations

from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict


class ChatRequest(BaseModel):
    """Request schema for sending a message in a conversation."""

    message: str
    conversation_id: Optional[UUID] = None


class ChatResponse(BaseModel):
    """Response schema for a chat message."""

    message: str
    role: str = "assistant"
    conversation_id: UUID

    model_config = ConfigDict(from_attributes=True)


class HealthResponse(BaseModel):
    """Response schema for the health check endpoint."""

    status: str = "ok"
    version: str = "1.0.0"


class ConversationResponse(BaseModel):
    """Response schema for a conversation summary."""

    id: UUID
    title: str
    created_at: datetime
    updated_at: datetime
    message_count: int = 0
    last_message: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class ConversationListResponse(BaseModel):
    """Response schema for a list of conversations."""

    conversations: list[ConversationResponse]


class CreateConversationRequest(BaseModel):
    """Request schema for creating a new conversation."""

    title: Optional[str] = None


class ChatMessageResponse(BaseModel):
    """Response schema for a single chat message."""

    id: UUID
    role: str
    content: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
