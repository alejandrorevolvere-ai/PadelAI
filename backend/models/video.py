import enum
import uuid

from sqlalchemy import Enum, Float, ForeignKey, Integer, JSON, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .base import Base


class VideoStatus(str, enum.Enum):
    uploaded = "uploaded"
    processing = "processing"
    completed = "completed"
    failed = "failed"


class VideoRecording(Base):
    __tablename__ = "video_recordings"

    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id"), index=True, nullable=False
    )
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    file_url: Mapped[str] = mapped_column(String(500), nullable=False)
    thumbnail_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    duration_seconds: Mapped[int | None] = mapped_column(Integer, nullable=True)
    status: Mapped[VideoStatus] = mapped_column(
        Enum(VideoStatus, name="video_status"), nullable=False
    )

    # Relationships
    user: Mapped["User"] = relationship(back_populates="video_recordings")  # noqa: F821
    analysis_result: Mapped["AnalysisResult | None"] = relationship(
        back_populates="video_recording", uselist=False
    )


class AnalysisResult(Base):
    __tablename__ = "analysis_results"

    video_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("video_recordings.id"), unique=True, nullable=False
    )
    pose_data: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    feedback: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    score: Mapped[float | None] = mapped_column(Float, nullable=True)
    summary: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Relationships
    video_recording: Mapped["VideoRecording"] = relationship(
        back_populates="analysis_result"
    )
