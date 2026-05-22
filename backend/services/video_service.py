"""Video analysis service — upload, status, history.

In production this would use MediaPipe / FFmpeg for actual pose estimation.
For now it stores uploads and returns mock analysis results.
"""

from __future__ import annotations

import math
import random
import uuid
from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from models.video import AnalysisResult, VideoRecording, VideoStatus


async def create_video_upload(
    db: AsyncSession,
    user_id: uuid.UUID,
    title: str,
    file_url: str,
    duration_seconds: int | None = None,
) -> VideoRecording:
    """Create a video recording entry and trigger mock analysis.

    Parameters
    ----------
    db:
        Async database session.
    user_id:
        UUID of the uploading user.
    title:
        Display title for the recording.
    file_url:
        URL or path to the uploaded video file.
    duration_seconds:
        Optional video duration in seconds.

    Returns
    -------
    VideoRecording
        The newly created recording with ``status='uploaded'``.
    """
    recording = VideoRecording(
        user_id=user_id,
        title=title,
        file_url=file_url,
        duration_seconds=duration_seconds,
        status=VideoStatus.uploaded,
    )
    db.add(recording)
    await db.flush()
    await db.refresh(recording)
    return recording


async def trigger_mock_analysis(
    db: AsyncSession,
    recording_id: uuid.UUID,
) -> AnalysisResult:
    """Simulate an AI analysis of the video.

    In production this would call MediaPipe for pose landmarks + an LLM
    for technique feedback. For now it generates plausible random data.
    """
    recording = await db.get(VideoRecording, recording_id)
    if recording is None:
        raise ValueError(f"Recording {recording_id} not found")

    # Mark as processing
    recording.status = VideoStatus.processing
    await db.flush()

    # Generate mock analysis
    score = random.randint(45, 92)
    feedback = _mock_feedback(score)
    pose_data = _mock_pose_data()

    result = AnalysisResult(
        video_id=recording_id,
        pose_data=pose_data,
        feedback=feedback,
        score=float(score),
        summary=_mock_summary(score, recording.title),
    )
    db.add(result)

    # Mark video as completed
    recording.status = VideoStatus.completed
    await db.flush()
    await db.refresh(result)
    return result


async def get_analysis_history(
    db: AsyncSession,
    user_id: uuid.UUID,
    limit: int = 20,
) -> list[dict]:
    """Return the user's video analysis history.

    Each entry includes data from both ``VideoRecording`` and
    ``AnalysisResult`` (if available).
    """
    result = await db.execute(
        select(VideoRecording)
        .where(VideoRecording.user_id == user_id)
        .options(selectinload(VideoRecording.analysis_result))
        .order_by(VideoRecording.created_at.desc())
        .limit(limit)
    )
    recordings = result.scalars().all()

    history: list[dict] = []
    for rec in recordings:
        entry: dict = {
            "id": str(rec.id),
            "title": rec.title,
            "created_at": rec.created_at.isoformat(),
            "status": rec.status.value,
            "thumbnail_url": rec.thumbnail_url,
        }
        if rec.analysis_result:
            entry["score"] = rec.analysis_result.score
            entry["analysis_id"] = str(rec.analysis_result.id)
        else:
            entry["score"] = None
            entry["analysis_id"] = None
        history.append(entry)

    return history


async def get_analysis_detail(
    db: AsyncSession,
    recording_id: uuid.UUID,
    user_id: uuid.UUID,
) -> dict | None:
    """Get full analysis result for a recording (if it belongs to the user)."""
    result = await db.execute(
        select(VideoRecording)
        .where(
            VideoRecording.id == recording_id,
            VideoRecording.user_id == user_id,
        )
        .options(selectinload(VideoRecording.analysis_result))
    )
    recording: VideoRecording | None = result.scalar_one_or_none()
    if recording is None or recording.analysis_result is None:
        return None

    ar = recording.analysis_result
    return {
        "id": str(ar.id),
        "video_title": recording.title,
        "score": ar.score,
        "feedback_points": ar.feedback,
        "ejercicios": _mock_exercises(ar.score or 50),
        "created_at": ar.created_at.isoformat(),
        "thumbnail_url": recording.thumbnail_url,
        "summary": ar.summary,
    }


# ── Mock helpers ──────────────────────────────────────────────────────────────


def _mock_feedback(score: int) -> list[dict]:
    """Generate plausible feedback points based on score."""
    base: list[dict] = [
        {
            "id": "f1",
            "icon": "target",
            "title": "Ajusta tu posición corporal",
            "description": "Tu cadera está ligeramente adelantada al impacto. Intenta mantener el peso centrado para más control.",
        },
        {
            "id": "f2",
            "icon": "trending-up",
            "title": "Mejora el timing del golpe",
            "description": "Estás golpeando la pelota demasiado tarde. Anticipa el rebote y prepárate antes.",
        },
    ]
    if score < 60:
        base.append({
            "id": "f3",
            "icon": "alert-triangle",
            "title": "Abre el brazo en el impacto",
            "description": "El codo se dobla antes del impacto. Mantén el brazo extendido para mayor potencia y precisión.",
        })
    else:
        base.append({
            "id": "f3",
            "icon": "lightbulb",
            "title": "Buena extensión de brazo",
            "description": "Mantienes el brazo extendido correctamente en el impacto. Sigue así.",
        })
    if score > 75:
        base.append({
            "id": "f4",
            "icon": "check-circle",
            "title": "Excelente rotación de cadera",
            "description": "Tu rotación de cadera es muy buena. Estás generando potencia de forma eficiente.",
        })
    return base


def _mock_exercises(score: int) -> list[dict]:
    """Generate relevant exercise suggestions."""
    exercises: list[dict] = [
        {
            "id": "e1",
            "title": "Ejercicio de espejo frente a pared",
            "description": "Practica el gesto técnico frente a un espejo o pared, repitiendo 20 veces el movimiento completo sin pelota.",
            "duration": "10 min",
            "difficulty": "principiante",
        },
    ]
    if score < 70:
        exercises.append({
            "id": "e2",
            "title": "Sombra con goma elástica",
            "description": "Sujeta una goma elástica desde un punto fijo y simula el golpe sintiendo la resistencia.",
            "duration": "15 min",
            "difficulty": "intermedio",
        })
    else:
        exercises.append({
            "id": "e2",
            "title": "Entrenamiento con conos",
            "description": "Coloca 5 conos en la pista y practica desplazamientos laterales golpeando a cada uno.",
            "duration": "20 min",
            "difficulty": "avanzado",
        })
    return exercises


def _mock_summary(score: int, title: str) -> str:
    """Generate a narrative summary."""
    if score >= 80:
        return (
            f"Excelente técnica en '{title}'. Tu forma es sólida y consistente. "
            "Sigue practicando para mantener este nivel y trabaja en la anticipación "
            "para llevar tu juego al siguiente nivel."
        )
    elif score >= 60:
        return (
            f"Buen rendimiento en '{title}'. Tu técnica base es correcta pero hay "
            "aspectos que pulir. Concéntrate en la posición corporal y el timing "
            "para ver mejoras significativas."
        )
    else:
        return (
            f"Tu análisis de '{title}' muestra áreas de mejora importantes. "
            "Los ejercicios recomendados te ayudarán a corregir la postura y el "
            "timing. ¡No te desanimes, la práctica constante da resultados!"
        )


def _mock_pose_data() -> dict:
    """Return a minimal mock of pose landmarks data."""
    return {
        "landmarks_count": 33,
        "frames_analyzed": random.randint(30, 120),
        "average_confidence": round(random.uniform(0.75, 0.95), 2),
        "key_angles": {
            "elbow_angle": round(random.uniform(140, 175), 1),
            "shoulder_rotation": round(random.uniform(30, 60), 1),
            "hip_rotation": round(random.uniform(15, 45), 1),
            "knee_flexion": round(random.uniform(20, 40), 1),
        },
    }
