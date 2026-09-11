"""PostgreSQL representation of a persisted generated metro map."""

from datetime import datetime
from uuid import UUID, uuid4

from sqlalchemy import BigInteger, CheckConstraint, DateTime, Integer, String, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.dialects.postgresql import UUID as PostgreSQLUUID
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column


class Base(DeclarativeBase):
    """Base metadata for API-owned relational tables."""


class MapRecord(Base):
    """One shareable map and its versioned graph presentation data."""

    __tablename__ = "maps"
    __table_args__ = (
        CheckConstraint("schema_version > 0", name="maps_schema_version_positive"),
        CheckConstraint("image_width > 0", name="maps_image_width_positive"),
        CheckConstraint("image_height > 0", name="maps_image_height_positive"),
        CheckConstraint("expires_at > created_at", name="maps_expiry_after_creation"),
    )

    id: Mapped[UUID] = mapped_column(
        PostgreSQLUUID(as_uuid=True),
        primary_key=True,
        default=uuid4,
    )
    schema_version: Mapped[int] = mapped_column(Integer, nullable=False)
    pipeline_version: Mapped[str] = mapped_column(String(length=64), nullable=False)
    image_path: Mapped[str] = mapped_column(String(length=512), nullable=False)
    skeleton_path: Mapped[str | None] = mapped_column(String(length=512), nullable=True)
    image_width: Mapped[int] = mapped_column(Integer, nullable=False)
    image_height: Mapped[int] = mapped_column(Integer, nullable=False)
    settings: Mapped[dict[str, object]] = mapped_column(JSONB, nullable=False)
    graph: Mapped[dict[str, object]] = mapped_column(JSONB, nullable=False)
    visual_seed: Mapped[int] = mapped_column(BigInteger, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )
    expires_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        index=True,
    )
