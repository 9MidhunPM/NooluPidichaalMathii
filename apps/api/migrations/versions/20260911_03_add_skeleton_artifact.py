"""Persist raw skeleton reveal artifacts.

Revision ID: 20260911_03
Revises: 20260911_02
Create Date: 2026-09-11
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "20260911_03"
down_revision: str | Sequence[str] | None = "20260911_02"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("maps", sa.Column("skeleton_path", sa.String(length=512), nullable=True))


def downgrade() -> None:
    op.drop_column("maps", "skeleton_path")
