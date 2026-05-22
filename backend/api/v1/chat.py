"""
Chat API router — v1 endpoints for the PadelAI Coach conversation system.

Endpoints:
- POST   /chat/messages        — Send a message and get a coach response
- GET    /chat/conversations   — List user's conversations
- POST   /chat/conversations   — Create a new conversation
"""

from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from api.deps import get_current_user, get_db
from models.chat import ChatMessage, Conversation, MessageRole
from models.user import User
from schemas.chat import (
    ChatMessageResponse,
    ChatRequest,
    ChatResponse,
    ConversationListResponse,
    ConversationResponse,
    CreateConversationRequest,
)
from services.chat_service import send_message as send_chat_message

router = APIRouter(prefix="/chat", tags=["Chat"])


@router.post("/messages", response_model=ChatResponse)
async def post_message(
    body: ChatRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ChatResponse:
    """Send a message to the PadelAI Coach and receive a response.

    If ``conversation_id`` is provided and belongs to the current user,
    the message is added to that conversation. Otherwise, a new conversation
    is created automatically.

    The response includes both the coach's reply and the conversation ID
    for subsequent messages.
    """
    response_text = await send_chat_message(
        db=db,
        user_id=current_user.id,
        conversation_id=body.conversation_id,
        message=body.message,
    )

    # Fetch the last assistant message to get its conversation_id
    result = await db.execute(
        select(ChatMessage)
        .where(
            ChatMessage.role == MessageRole.assistant,
            ChatMessage.content == response_text,
        )
        .order_by(ChatMessage.created_at.desc())
        .limit(1)
    )
    last_msg: ChatMessage | None = result.scalar_one_or_none()

    return ChatResponse(
        message=response_text,
        role="assistant",
        conversation_id=last_msg.conversation_id if last_msg else UUID(int=0),
    )


@router.get("/conversations", response_model=list[ConversationResponse])
async def list_conversations(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[ConversationResponse]:
    """List all conversations for the authenticated user, ordered by most recent first."""
    result = await db.execute(
        select(Conversation)
        .where(Conversation.user_id == current_user.id)
        .options(selectinload(Conversation.messages))
        .order_by(Conversation.updated_at.desc())
    )
    conversations = result.scalars().all()

    return [
        ConversationResponse(
            id=c.id,
            title=c.title,
            created_at=c.created_at,
            updated_at=c.updated_at,
            message_count=len(c.messages),
            last_message=c.messages[-1].content[:200] if c.messages else None,
        )
        for c in conversations
    ]


@router.post("/conversations", response_model=ConversationResponse, status_code=status.HTTP_201_CREATED)
async def create_conversation(
    body: CreateConversationRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ConversationResponse:
    """Create a new conversation for the authenticated user."""
    conversation = Conversation(
        user_id=current_user.id,
        title=body.title or "Nueva conversación",
    )
    db.add(conversation)
    await db.flush()
    await db.refresh(conversation)

    return ConversationResponse(
        id=conversation.id,
        title=conversation.title,
        created_at=conversation.created_at,
        updated_at=conversation.updated_at,
        message_count=0,
        last_message=None,
    )


@router.get("/conversations/{conversation_id}/messages", response_model=list[ChatMessageResponse])
async def get_conversation_messages(
    conversation_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[ChatMessageResponse]:
    """Get all messages in a conversation (belonging to the current user)."""
    # Verify ownership
    result = await db.execute(
        select(Conversation).where(
            Conversation.id == conversation_id,
            Conversation.user_id == current_user.id,
        )
    )
    conversation = result.scalar_one_or_none()
    if conversation is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Conversation not found",
        )

    result = await db.execute(
        select(ChatMessage)
        .where(ChatMessage.conversation_id == conversation_id)
        .order_by(ChatMessage.created_at.asc())
    )
    messages = result.scalars().all()

    return [
        ChatMessageResponse(
            id=m.id,
            role=m.role.value,
            content=m.content,
            created_at=m.created_at,
        )
        for m in messages
    ]


@router.post(
    "/conversations/{conversation_id}/messages",
    response_model=ChatResponse,
)
async def post_conversation_message(
    conversation_id: UUID,
    body: ChatRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ChatResponse:
    """Send a message inside an existing conversation (alternate endpoint).

    Frontend-friendly alternative to ``POST /messages`` that takes the
    conversation ID from the URL path.
    """
    response_text = await send_chat_message(
        db=db,
        user_id=current_user.id,
        conversation_id=conversation_id,
        message=body.message,
    )

    return ChatResponse(
        message=response_text,
        role="assistant",
        conversation_id=conversation_id,
    )


@router.delete(
    "/conversations/{conversation_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def delete_conversation(
    conversation_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> None:
    """Delete a conversation and all its messages (owner only)."""
    result = await db.execute(
        select(Conversation).where(
            Conversation.id == conversation_id,
            Conversation.user_id == current_user.id,
        )
    )
    conversation = result.scalar_one_or_none()
    if conversation is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Conversation not found",
        )

    await db.delete(conversation)
    await db.flush()
