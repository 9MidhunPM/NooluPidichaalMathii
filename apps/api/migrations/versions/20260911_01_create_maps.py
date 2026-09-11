"""Create persisted maps storage.

Revision ID: 20260911_01
Revises:
Create Date: 2026-09-11
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "20260911_01"
down_revision: str | Sequence[str] | None = None
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "maps",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("schema_version", sa.Integer(), nullable=False),
        sa.Column("pipeline_version", sa.String(length=64), nullable=False),
        sa.Column("image_path", sa.String(length=512), nullable=False),
        sa.Column("image_width", sa.Integer(), nullable=False),
        sa.Column("image_height", sa.Integer(), nullable=False),
        sa.Column("settings", postgresql.JSONB(), nullable=False),
        sa.Column("graph", postgresql.JSONB(), nullable=False),
        sa.Column("visual_seed", sa.Integer(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.CheckConstraint("schema_version > 0", name="maps_schema_version_positive"),
        sa.CheckConstraint("image_width > 0", name="maps_image_width_positive"),
        sa.CheckConstraint("image_height > 0", name="maps_image_height_positive"),
        sa.CheckConstraint(
            "expires_at > created_at",
            name="maps_expiry_after_creation",
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_maps_expires_at", "maps", ["expires_at"], unique=False)


def downgrade() -> None:
    op.drop_index("ix_maps_expires_at", table_name="maps")
    op.drop_table("maps")
