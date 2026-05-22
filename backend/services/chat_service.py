"""
Chat service — RAG-powered padel coaching assistant.

Pipeline:
1. Create or retrieve the conversation
2. Save the user message to the database
3. Retrieve relevant knowledge via ``PadelKnowledgeBase`` (TF-IDF + cosine)
4. Build a prompt with system instructions + RAG context + history
5. Call the LLM API (or fallback to simulated response if no key configured)
6. Save the assistant response to the database
7. Return the response string
"""

from __future__ import annotations

import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from knowledge.embeddings import kb as padel_kb
from models.chat import ChatMessage, Conversation, MessageRole
from services.llm_service import (
    _is_llm_available,
    ask_llm,
    build_messages,
    get_search_results,
    get_rag_context,
)

SYSTEM_PROMPT = """Eres PadelAI Coach, un entrenador experto de pádel con amplio conocimiento \
en técnica, táctica, reglamento, entrenamiento y material. Tu objetivo es ayudar a jugadores \
de todos los niveles a mejorar su juego de pádel.

Responde SIEMPRE en español, de forma clara y didáctica. Usa el contexto proporcionado \
para fundamentar tus respuestas. Sé específico y práctico: da consejos accionables, \
no teoría abstracta.

Si no encuentras información relevante en el contexto, responde con tu conocimiento \
general de pádel pero indícalo claramente al usuario.

Tono: profesional pero cercano, como un entrenador personal en la pista."""


def _simulate_response(user_message: str) -> str:
    """Fallback: show which RAG sources were matched when no LLM is configured."""
    results = get_search_results(user_message, top_k=5)

    if not results:
        return (
            "No he encontrado información específica en mi base de conocimiento "
            "para responder a tu pregunta con los documentos cargados. "
            "Por favor, reformula tu pregunta o pregúntame sobre técnica, táctica, "
            "reglamento, entrenamiento o material de pádel."
        )

    sources: list[str] = []
    topics: set[str] = set()
    for r in results:
        src = r["source"].replace(".md", "")
        sources.append(src)
        topics.add(r["topic"])

    lines: list[str] = [
        f"🎾 **Coach PadelAI responde**\n",
        f"He encontrado información relevante en {len(results)} secciones "
        f"de tu base de conocimiento:\n",
    ]

    for i, r in enumerate(results, 1):
        first_line = r["text"].split("\n")[0].replace("# ", "").strip()
        lines.append(
            f"  {i}. **{first_line}** — {r['source']} "
            f"(relevancia: {r['score']:.1%})"
        )

    lines.append(f"\n**Fuentes utilizadas**: {', '.join(sorted(set(sources)))}")
    lines.append(f"**Temas cubiertos**: {', '.join(sorted(topics))}")
    lines.append(
        f"\n---\n*Modo demostración — configura LLM_API_KEY en .env "
        f"para obtener respuestas generadas por IA.*"
    )

    return "\n".join(lines)


async def send_message(
    db: AsyncSession,
    user_id: uuid.UUID,
    conversation_id: uuid.UUID | None,
    message: str,
) -> str:
    """Process a user message and return the coach's response."""
    # ── 1. Resolve conversation ──────────────────────────────────────────────
    if conversation_id is not None:
        result = await db.execute(
            select(Conversation).where(
                Conversation.id == conversation_id,
                Conversation.user_id == user_id,
            )
        )
        conversation: Conversation | None = result.scalar_one_or_none()
        if conversation is None:
            conversation = Conversation(
                user_id=user_id,
                title=message[:100] + ("..." if len(message) > 100 else ""),
            )
            db.add(conversation)
            await db.flush()
    else:
        conversation = Conversation(
            user_id=user_id,
            title=message[:100] + ("..." if len(message) > 100 else ""),
        )
        db.add(conversation)
        await db.flush()

    # ── 2. Save user message ────────────────────────────────────────────────
    user_msg = ChatMessage(
        conversation_id=conversation.id,
        role=MessageRole.user,
        content=message,
    )
    db.add(user_msg)
    await db.flush()

    # ── 3. Build response ───────────────────────────────────────────────────
    if _is_llm_available():
        # Real LLM call with conversation history
        history_result = await db.execute(
            select(ChatMessage)
            .where(ChatMessage.conversation_id == conversation.id)
            .order_by(ChatMessage.created_at.asc())
        )
        history_messages = history_result.scalars().all()

        history: list[dict[str, str]] = []
        for msg in history_messages[:-1]:  # exclude the current user msg (already saved)
            if msg.role in (MessageRole.user, MessageRole.assistant):
                history.append({
                    "role": msg.role.value,
                    "content": msg.content,
                })

        llm_messages = build_messages(message, history=history)

        try:
            response_text = await ask_llm(llm_messages)
        except RuntimeError:
            response_text = _simulate_response(message)
    else:
        response_text = _simulate_response(message)

    # ── 4. Save assistant response ───────────────────────────────────────────
    assistant_msg = ChatMessage(
        conversation_id=conversation.id,
        role=MessageRole.assistant,
        content=response_text,
        message_metadata={
            "rag_context_length": len(get_rag_context(message)),
            "model": "gpt-4o-mini" if _is_llm_available() else "simulated-rag",
        },
    )
    db.add(assistant_msg)
    await db.flush()

    return response_text
