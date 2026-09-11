from datetime import UTC, datetime, timedelta
from uuid import UUID

import pytest

from app.maps import get_map_record, new_map_record, persist_processed_map
from app.pipeline import process_image
from app.segmentation import SEGMENTATION_VERSION
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
    assert record.settings["segmentation_strategy"] == SEGMENTATION_VERSION
    assert record.visual_seed == processed.visual_seed
    assert 0 <= record.visual_seed <= 2**32 - 1
    assert record.expires_at == created_at + timedelta(days=7)


class FakeSession:
    def __init__(self, fail_commit: bool = False) -> None:
        self.records: list[object] = []
        self.fail_commit = fail_commit
        self.record_by_id: dict[UUID, object] = {}

    def __call__(self) -> "FakeSession":
        return self

    async def __aenter__(self) -> "FakeSession":
        return self

    async def __aexit__(self, *_args: object) -> None:
        return None

    def add(self, record: object) -> None:
        self.records.append(record)

    async def commit(self) -> None:
        if self.fail_commit:
            raise RuntimeError("database unavailable")

    async def get(self, _model: object, map_id: UUID) -> object | None:
        return self.record_by_id.get(map_id)


@pytest.mark.anyio
async def test_persist_processed_map_writes_the_file_and_commits_the_record(
    tmp_path,
) -> None:
    session = FakeSession()
    settings = ApiSettings(upload_dir=tmp_path)

    record = await persist_processed_map(
        process_image(a_crossing_upload(), settings),
        session,  # type: ignore[arg-type]
        settings,
    )

    assert session.records == [record]
    assert (tmp_path / record.image_path).read_bytes()


@pytest.mark.anyio
async def test_persist_processed_map_removes_the_file_when_commit_fails(
    tmp_path,
) -> None:
    session = FakeSession(fail_commit=True)
    settings = ApiSettings(upload_dir=tmp_path)

    with pytest.raises(RuntimeError, match="database unavailable"):
        await persist_processed_map(
            process_image(a_crossing_upload(), settings),
            session,  # type: ignore[arg-type]
            settings,
        )

    assert list(tmp_path.glob("*.png")) == []


@pytest.mark.anyio
async def test_get_map_record_returns_the_saved_map_without_processing(
    tmp_path,
) -> None:
    session = FakeSession()
    settings = ApiSettings(upload_dir=tmp_path)
    record = new_map_record(
        process_image(a_crossing_upload(), settings),
        settings,
        "known-map.png",
    )
    session.record_by_id[record.id] = record

    found = await get_map_record(session, record.id)  # type: ignore[arg-type]
    missing = await get_map_record(
        session,
        UUID("00000000-0000-0000-0000-000000000000"),
    )  # type: ignore[arg-type]

    assert found is record
    assert missing is None
