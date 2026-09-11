from datetime import UTC, datetime, timedelta
from uuid import UUID

from app.maps import new_map_record
from app.pipeline import process_image
from app.settings import ApiSettings
from tests.test_pipeline import a_crossing_upload


def test_new_map_record_persists_reproducible_processing_metadata() -> None:
    processed = process_image(a_crossing_upload(), ApiSettings())
    created_at = datetime(2026, 9, 11, 12, 0, tzinfo=UTC)

    record = new_map_record(
        processed,
        ApiSettings(retention_days=7),
        "45b88f7a.png",
        map_id=UUID("45b88f7a-86c4-46e6-8a06-2a07a2cf0c3b"),
        now=created_at,
    )

    assert str(record.id) == "45b88f7a-86c4-46e6-8a06-2a07a2cf0c3b"
    assert record.image_path == "45b88f7a.png"
    assert record.graph["schema_version"] == 1
    assert record.settings["segmentation_strategy"] == "otsu-v1"
    assert record.expires_at == created_at + timedelta(days=7)
