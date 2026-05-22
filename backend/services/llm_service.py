"""LLM service — async calls to OpenAI-compatible chat APIs.

Supports any OpenAI-compatible provider (OpenAI, Anthropic via proxy, local
LLaMA.cpp, etc.) by configuring ``LLM_API_URL`` and ``LLM_API_KEY`` in the
environment.

Falls back to a simulated RAG-only coach response when no API key is configured.
Includes retry logic, token estimation, and structured logging.
"""

from __future__ import annotations

import json
import logging
import time
from typing import Any

import httpx

from core.config import settings
from knowledge.embeddings import kb as padel_kb

logger = logging.getLogger("padelai.llm")

# ─── System prompt for the Padel coach ────────────────────────────────────────

SYSTEM_PROMPT = """Eres PadelAI Coach, un entrenador experto de pádel con amplio conocimiento \
en técnica, táctica, reglamento, entrenamiento y material. Tu objetivo es ayudar a jugadores \
de todos los niveles a mejorar su juego de pádel.

Responde SIEMPRE en español, de forma clara y didáctica. Usa el contexto proporcionado \
para fundamentar tus respuestas. Sé específico y práctico: da consejos accionables, \
no teoría abstracta.

Si no encuentras información relevante en el contexto, responde con tu conocimiento \
general de pádel pero indícalo claramente al usuario.

Tono: profesional pero cercano, como un entrenador personal en la pista.
"""

# ─── Knowledge retrieval ──────────────────────────────────────────────────────


def get_rag_context(user_message: str, top_k: int = 5) -> str:
    """Retrieve relevant padel knowledge and format as context.

    Returns an empty string if no documents are loaded.
    """
    return padel_kb.get_context(user_message, top_k=top_k)


def get_search_results(user_message: str, top_k: int = 5) -> list[dict[str, Any]]:
    """Return raw search results (used for simulated fallback response)."""
    return padel_kb.search(user_message, top_k=top_k)


# ─── Token estimation ─────────────────────────────────────────────────────────


def estimate_tokens(text: str) -> int:
    """Rough token count: ~4 chars per token for Spanish text."""
    return max(1, len(text) // 4)


# ─── LLM availability ─────────────────────────────────────────────────────────


def _is_llm_available() -> bool:
    """Return ``True`` when an LLM backend is configured."""
    return bool(settings.LLM_API_KEY) and bool(settings.LLM_API_URL)


# ─── Retry wrapper ────────────────────────────────────────────────────────────


async def _call_with_retry(
    client: httpx.AsyncClient,
    url: str,
    headers: dict[str, str],
    payload: dict[str, Any],
    max_retries: int = 3,
) -> httpx.Response:
    """POST to the LLM API with exponential backoff on transient errors.

    Retries on: 429 (rate limit), 502, 503, 504 (server errors),
    and network timeouts. Does NOT retry 4xx auth/validation errors.
    """
    last_error: Exception | None = None

    for attempt in range(1, max_retries + 1):
        try:
            response = await client.post(url, headers=headers, json=payload)

            # Don't retry client errors (4xx) except 429
            if 400 <= response.status_code < 500 and response.status_code != 429:
                return response

            # Success or server error — retry 5xx only
            if response.status_code < 500:
                return response

            # Server error (5xx) — retry
            logger.warning(
                "LLM API 5xx (attempt %d/%d): %s",
                attempt, max_retries, response.status_code,
            )

        except (httpx.TimeoutException, httpx.NetworkError) as e:
            last_error = e
            logger.warning(
                "LLM API network error (attempt %d/%d): %s",
                attempt, max_retries, e,
            )

        # Exponential backoff: 1s, 2s, 4s
        if attempt < max_retries:
            wait = 2 ** (attempt - 1)
            logger.info("Retrying LLM call in %ds...", wait)
            await _asyncio_sleep(wait)

    if isinstance(last_error, Exception):
        raise RuntimeError(f"LLM API unavailable after {max_retries} retries: {last_error}") from last_error

    # If we exhausted retries on 5xx, the last response is our best effort
    return response  # type: ignore[possibly-undefined]


# Import asyncio.sleep lazily to avoid circular imports at module level
async def _asyncio_sleep(seconds: float) -> None:
    import asyncio
    await asyncio.sleep(seconds)


# ─── LLM call with logging ───────────────────────────────────────────────────


async def ask_llm(
    messages: list[dict[str, str]],
    temperature: float = 0.7,
    max_tokens: int = 1024,
) -> str:
    """Send a message list to the LLM API and return the full text response.

    Includes retry logic, structured logging, and a natural fallback
    when no API key is configured.

    Parameters
    ----------
    messages:
        Standard chat message list ``[{"role": …, "content": …}, …]``.
    temperature:
        Sampling temperature (default 0.7).
    max_tokens:
        Maximum tokens in the response (default 1024).

    Returns
    -------
    str
        The assistant's reply text.

    Raises
    ------
    RuntimeError
        If the LLM API call fails after all retries.
    """
    if not _is_llm_available():
        raise RuntimeError("No LLM API key configured — use simulated response instead")

    start = time.monotonic()
    input_tokens = sum(estimate_tokens(m.get("content", "")) for m in messages)

    async with httpx.AsyncClient(timeout=60.0) as client:
        response = await _call_with_retry(
            client,
            f"{settings.LLM_API_URL}/chat/completions",
            headers={
                "Authorization": f"Bearer {settings.LLM_API_KEY}",
                "Content-Type": "application/json",
            },
            json={
                "model": settings.LLM_MODEL,
                "messages": messages,
                "temperature": temperature,
                "max_tokens": max_tokens,
                "stream": False,
            },
        )

    duration = time.monotonic() - start

    if response.status_code != 200:
        detail = response.text[:500]
        logger.error("LLM call failed [%d] in %.2fs: %s", response.status_code, duration, detail)
        raise RuntimeError(f"LLM API returned {response.status_code}: {detail}")

    data: dict[str, Any] = response.json()
    content = data["choices"][0]["message"]["content"]
    output_tokens = estimate_tokens(content)

    logger.info(
        "LLM call OK [%s] in %.2fs — %d in / %d out",
        settings.LLM_MODEL, duration, input_tokens, output_tokens,
    )
    return content


# ─── Streaming LLM call ───────────────────────────────────────────────────────


async def ask_llm_stream(
    messages: list[dict[str, str]],
    *,
    on_token: callable,
    temperature: float = 0.7,
    max_tokens: int = 1024,
) -> None:
    """Stream a response from the LLM API, calling *on_token* per chunk.

    Parameters
    ----------
    messages:
        Standard chat message list.
    on_token:
        Async or sync callback receiving each text delta.
    temperature:
        Sampling temperature (default 0.7).
    max_tokens:
        Maximum tokens (default 1024).
    """
    if not _is_llm_available():
        raise RuntimeError("No LLM API key configured")

    start = time.monotonic()
    input_tokens = sum(estimate_tokens(m.get("content", "")) for m in messages)
    output_chars = 0

    async with httpx.AsyncClient(timeout=120.0) as client:
        async with client.stream(
            "POST",
            f"{settings.LLM_API_URL}/chat/completions",
            headers={
                "Authorization": f"Bearer {settings.LLM_API_KEY}",
                "Content-Type": "application/json",
            },
            json={
                "model": settings.LLM_MODEL,
                "messages": messages,
                "temperature": temperature,
                "max_tokens": max_tokens,
                "stream": True,
            },
        ) as response:

            if response.status_code != 200:
                detail = await response.aread()
                raise RuntimeError(
                    f"LLM API returned {response.status_code}: {detail[:500]}"
                )

            async for line in response.aiter_lines():
                if not line.startswith("data: "):
                    continue
                payload = line[6:].strip()
                if payload == "[DONE]":
                    break
                try:
                    chunk: dict[str, Any] = json.loads(payload)
                    delta: str = (
                        chunk.get("choices", [{}])[0]
                        .get("delta", {})
                        .get("content", "")
                    )
                    if delta:
                        output_chars += len(delta)
                        await on_token(delta)
                except json.JSONDecodeError:
                    continue  # skip malformed chunks

    duration = time.monotonic() - start
    output_tokens = estimate_tokens(" " * output_chars)
    logger.info(
        "LLM stream OK [%s] in %.2fs — %d in / ~%d out",
        settings.LLM_MODEL, duration, input_tokens, output_tokens,
    )


# ─── Build messages with RAG context ──────────────────────────────────────────


def build_messages(user_message: str, history: list[dict[str, str]] | None = None) -> list[dict[str, str]]:
    """Build a message list with system prompt, RAG context, and conversation history.

    Parameters
    ----------
    user_message:
        Current user query.
    history:
        Optional list of previous messages (role + content).

    Returns
    -------
    list[dict[str, str]]
        Messages ready to send to the LLM API.
    """
    context = get_rag_context(user_message)
    messages: list[dict[str, str]] = [{"role": "system", "content": SYSTEM_PROMPT}]

    if context:
        messages.append({"role": "system", "content": context})

    if history:
        # Only include the last N messages to stay within context window
        for msg in history[-10:]:
            messages.append(msg)

    messages.append({"role": "user", "content": user_message})
    return messages


# ─── Simulated fallback (no API key) ─────────────────────────────────────────


FALLBACK_RESPONSES = [
    "¡Excelente pregunta! Basándome en mi conocimiento sobre pádel, te recomiendo "
    "prestar atención a tu posicionamiento en la pista. Recuerda que la clave está "
    "en la anticipación: observa la posición de tus rivales antes de cada golpe. "
    "¿Quieres que profundice en algún aspecto concreto?",
    "Buena pregunta. En pádel, la técnica de los golpes es fundamental, pero "
    "a menudo se descuida la parte táctica. Te sugiero trabajar la 'salida de pared' "
    "y los cambios de ritmo. ¿Te interesa más técnica, táctica o preparación física?",
    "Muy interesante. Hablando de pádel, recuerda que el 70% del juego se decide "
    "en la red. Practica tus voleas y bandejas, y sobre todo, la comunicación "
    "con tu pareja. ¿Hay algo más en lo que pueda ayudarte?",
    "¡Buena observación! En pádel, la elección de la pala también influye mucho. "
    "Para jugadores intermedios, una pala con balance medio y forma de lágrima "
    "suele ser la más versátil. Pero lo más importante es que te sientas cómodo "
    "con ella. ¿Quieres que hablemos de material o de técnica?",
]

_FALLBACK_IDX = 0


def simulated_response(user_message: str) -> str:
    """Generate a natural-looking coach response when no LLM is available.

    Uses RAG context when possible, otherwise returns a pre-written varied
    response that sounds like a real padel coach.
    """
    global _FALLBACK_IDX
    results = get_search_results(user_message, top_k=3)
    rag_topics = set()

    for r in results:
        title = r.get("title", "") or r.get("source", "")
        if title:
            rag_topics.add(title)

    if rag_topics:
        topics_str = ", ".join(sorted(rag_topics)[:3])
        response = (
            f"He encontrado información relevante sobre: {topics_str}. "
            "Para acceder al análisis completo y detallado, "
            "conecta una API key de OpenAI en la configuración. "
            "Mientras tanto, ¿quieres preguntar sobre otro aspecto del pádel?"
        )
    else:
        response = FALLBACK_RESPONSES[_FALLBACK_IDX % len(FALLBACK_RESPONSES)]
        _FALLBACK_IDX += 1

    return response
