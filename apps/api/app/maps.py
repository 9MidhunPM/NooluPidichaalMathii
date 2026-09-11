"""Creation of persisted map records from one completed processing run."""

from datetime import UTC, datetime, timedelta
from uuid import UUID, uuid4

from app.db.models import MapRecord
from app.pipeline import ProcessedMap
from app.settings import ApiSettings


def new_map_record(
    processed: ProcessedMap,
    settings: ApiSettings,
    image_path: str,
    map_id: UUID | None = None,
    now: datetime | None = None,
) -> MapRecord:
    """Prepare a fully specified database record without trusting client input."""
    created_at = now or datetime.now(UTC)
    return MapRecord(
        id=map_id or uuid4(),
        schema_version=processed.graph.schema_version,
        pipeline_version=processed.pipeline_version,
        image_path=image_path,
        image_width=processed.image.width,
        image_height=processed.image.height,
        settings={
            "segmentation_strategy": processed.segmentation.strategy,
            "foreground_ratio": processed.segmentation.foreground_ratio,
        },
        graph=processed.graph.model_dump(mode="json"),
        visual_seed=processed.visual_seed,
        created_at=created_at,
        expires_at=created_at + timedelta(days=settings.retention_days),
    )
