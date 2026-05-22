"""Tests for chat coach endpoints."""

from __future__ import annotations

import pytest
from httpx import AsyncClient

from tests.conftest import auth_headers


CHAT_PATH = "/api/v1/chat/messages"
CONV_PATH = "/api/v1/chat/conversations"


@pytest.mark.asyncio
async def test_chat_unauthenticated(client: AsyncClient) -> None:
    """POST /chat/messages without token returns 401."""
    resp = await client.post(
        CHAT_PATH,
        json={"message": "Hola, ¿cómo mejorar mi drive?"},
    )
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_chat_send_message(client: AsyncClient) -> None:
    """POST /chat/messages with a valid message returns a response."""
    headers = await auth_headers(client)
    resp = await client.post(
        CHAT_PATH,
        headers=headers,
        json={"message": "¿Qué pala recomiendas para nivel intermedio?"},
    )
    assert resp.status_code == 200
    data = resp.json()
    # The response should contain the coach's reply
    assert "response" in data or "message" in data or "content" in data


@pytest.mark.asyncio
async def test_chat_conversation_history(client: AsyncClient) -> None:
    """GET /chat/conversations returns user conversations."""
    headers = await auth_headers(client)
    # First send a message to create a conversation
    await client.post(
        CHAT_PATH,
        headers=headers,
        json={"message": "Consejos para mi revés"},
    )
    resp = await client.get(CONV_PATH, headers=headers)
    assert resp.status_code == 200
    data = resp.json()
    assert isinstance(data, list)
    assert len(data) > 0


@pytest.mark.asyncio
async def test_chat_empty_message(client: AsyncClient) -> None:
    """POST /chat/messages with empty message — API accepts it."""
    headers = await auth_headers(client)
    resp = await client.post(
        CHAT_PATH,
        headers=headers,
        json={"message": ""},
    )
    assert resp.status_code in (200, 422)


@pytest.mark.asyncio
async def test_chat_create_conversation(client: AsyncClient) -> None:
    """POST /chat/conversations creates a new conversation."""
    headers = await auth_headers(client)
    resp = await client.post(
        CONV_PATH,
        headers=headers,
        json={"title": "Mi primera consulta"},
    )
    assert resp.status_code in (200, 201)
    data = resp.json()
    assert "id" in data
    assert data.get("title") == "Mi primera consulta"
