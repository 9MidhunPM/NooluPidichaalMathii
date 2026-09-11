from sqlalchemy.dialects import postgresql
from sqlalchemy.schema import CreateTable

from app.db.models import MapRecord


def test_map_record_declares_versioned_graph_storage() -> None:
    columns = MapRecord.__table__.c

    assert set(columns.keys()) == {
        "id",
        "schema_version",
        "pipeline_version",
        "image_path",
        "image_width",
        "image_height",
        "settings",
        "graph",
        "visual_seed",
        "created_at",
        "expires_at",
    }
    assert columns["expires_at"].index is True


def test_map_record_compiles_to_postgresql_jsonb_columns() -> None:
    statement = str(
        CreateTable(MapRecord.__table__).compile(dialect=postgresql.dialect())
    )

    assert "settings JSONB NOT NULL" in statement
    assert "graph JSONB NOT NULL" in statement
    assert (
        "CONSTRAINT maps_schema_version_positive CHECK (schema_version > 0)"
        in statement
    )
    assert "CONSTRAINT maps_image_width_positive CHECK (image_width > 0)" in statement
    assert "CONSTRAINT maps_image_height_positive CHECK (image_height > 0)" in statement
    assert (
        "CONSTRAINT maps_expiry_after_creation CHECK (expires_at > created_at)"
        in statement
    )
