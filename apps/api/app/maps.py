"""Creation of persisted map records from one completed processing run."""

from datetime import UTC, datetime, timedelta
from uuid import UUID, uuid4

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from app.db.models import MapRecord
from app.pipeline import ProcessedMap
from app.settings import ApiSettings
from app.storage import delete_normalized_image, store_normalized_image


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


async def persist_processed_map(
    processed: ProcessedMap,
    sessions: async_sessionmaker[AsyncSession],
    settings: ApiSettings,
) -> MapRecord:
    """Persist one processed map and remove its file if the database write fails."""
    map_id = uuid4()
    image_path = store_normalized_image(processed.image, map_id, settings.upload_dir)
    record = new_map_record(processed, settings, image_path, map_id=map_id)
    try:
        async with sessions() as session:
            session.add(record)
            await session.commit()
    except Exception:
        delete_normalized_image(image_path, settings.upload_dir)
        raise
    return record


async def get_map_record(
    sessions: async_sessionmaker[AsyncSession],
    map_id: UUID,
) -> MapRecord | None:
    """Retrieve one persisted map without rerunning the vision pipeline."""
    async with sessions() as session:
        return await session.get(MapRecord, map_id)
