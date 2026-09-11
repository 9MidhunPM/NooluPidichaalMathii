"""Asynchronous PostgreSQL engine and session construction."""

from dataclasses import dataclass

from sqlalchemy.ext.asyncio import (
    AsyncEngine,
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)

from app.settings import ApiSettings


@dataclass(frozen=True, slots=True)
class Database:
    """Database resources owned by one running API process."""

    engine: AsyncEngine
    sessions: async_sessionmaker[AsyncSession]

    async def dispose(self) -> None:
        """Release pooled database connections during application shutdown."""
        await self.engine.dispose()


def create_database(settings: ApiSettings) -> Database:
    """Create database resources from validated runtime settings."""
    if settings.database_url is None:
        raise RuntimeError("DATABASE_URL is required for database access")

    engine = create_async_engine(settings.database_url, pool_pre_ping=True)
    sessions = async_sessionmaker(engine, expire_on_commit=False)
    return Database(engine=engine, sessions=sessions)
