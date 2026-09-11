import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import create_database
from app.settings import ApiSettings


def test_database_requires_configured_database_url() -> None:
    with pytest.raises(RuntimeError, match="DATABASE_URL"):
        create_database(ApiSettings())


@pytest.mark.anyio
async def test_database_uses_asyncpg_and_releases_resources() -> None:
    database = create_database(
        ApiSettings(
            database_url="postgresql+asyncpg://noolu:placeholder@localhost/noolu"
        )
    )

    assert database.engine.url.drivername == "postgresql+asyncpg"
    assert database.sessions.class_ is AsyncSession

    await database.dispose()
