"""Video analysis API routes — upload, status, history, detail.

Stores uploads in the database and triggers mock analysis.
Replace with real MediaPipe / FFmpeg integration in production.
"""

from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, HTTPException, UploadFile, status
from sqlalchemy.ext.asyncio import AsyncSession

from api.deps import get_current_user, get_db
from models.user import User
from services.video_service import (
    create_video_upload,
    get_analysis_detail,
    get_analysis_history,
    trigger_mock_analysis,
)

router = APIRouter(prefix="/video", tags=["Video"])


@router.post("/upload")
async def upload_video(
    file: UploadFile,
    title: str | None = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Upload a video file for analysis.

    Accepts a multipart ``file`` and optional ``title``.
    Triggers a mock analysis immediately and returns the result.
    """
    if not file.filename:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No file provided",
        )

    # Validate file type
    allowed_types = {"video/mp4", "video/webm", "video/quicktime", "video/x-msvideo"}
    if file.content_type and file.content_type not in allowed_types:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported file type: {file.content_type}. "
                   f"Allowed: {', '.join(sorted(allowed_types))}",
        )

    # Save metadata (in production, store the file to S3/Supabase)
    video_title = title or file.filename or "Untitled video"
    recording = await create_video_upload(
        db=db,
        user_id=current_user.id,
        title=video_title,
        file_url=f"uploads/{current_user.id}/{file.filename or 'video'}",
    )

    # Trigger analysis (in production this would be async via Celery/Redis)
    result = await trigger_mock_analysis(db, recording.id)
    await db.commit()

    return {
        "id": str(recording.id),
        "status": "completed",
        "analysis": {
            "id": str(result.id),
            "score": result.score,
            "summary": result.summary,
            "feedback_points": result.feedback,
            "ejercicios": _mock_exercises(result.score or 50),
            "created_at": result.created_at.isoformat(),
        },
    }


@router.get("/{video_id}/status")
async def get_analysis_status(
    video_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Get the status of a video analysis."""
    detail = await get_analysis_detail(db, video_id, current_user.id)
    if detail is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Video or analysis not found",
        )
    return {"id": str(video_id), "status": "completed", "progress": 100, **detail}


@router.get("/history")
async def get_history(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[dict]:
    """Get analysis history for the current user."""
    return await get_analysis_history(db, current_user.id)


# ── Mock helpers (duplicated from service for fast routing) ───────────────────


def _mock_exercises(score: float) -> list[dict]:
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
