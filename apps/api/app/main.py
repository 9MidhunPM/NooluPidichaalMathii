from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI, File, UploadFile
from fastapi.responses import JSONResponse
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError

from app.db.session import Database, create_database
from app.maps import persist_processed_map
from app.pipeline import process_image
from app.settings import ApiSettings


def create_app(settings: ApiSettings | None = None) -> FastAPI:
    """Build the API application without opening external connections."""
    resolved_settings = settings or ApiSettings()

    @asynccontextmanager
    async def lifespan(app: FastAPI) -> AsyncIterator[None]:
        database = (
            create_database(resolved_settings)
            if resolved_settings.database_url is not None
            else None
        )
        app.state.database = database
        yield
        if database is not None:
            await database.dispose()

    app = FastAPI(
        title="Noolu Pidichaal Mathi API",
        version="0.0.0",
        lifespan=lifespan,
    )

    @app.get("/health/live")
    async def live() -> dict[str, str]:
        """Report process liveness without checking dependencies."""
        return {"status": "ok"}

    @app.get("/health/ready")
    async def ready() -> JSONResponse:
        """Report whether required database storage can accept requests."""
        database: Database | None = app.state.database
        if database is None:
            return JSONResponse(
                status_code=503,
                content={"status": "not_ready", "code": "database_not_configured"},
            )

        try:
            async with database.engine.connect() as connection:
                await connection.execute(text("SELECT 1"))
        except SQLAlchemyError:
            return JSONResponse(
                status_code=503,
                content={"status": "not_ready", "code": "database_unavailable"},
            )

        return JSONResponse(content={"status": "ok"})

    @app.post("/api/maps", status_code=201)
    async def create_map(image: UploadFile = File(...)) -> JSONResponse:
        """Process and persist one untrusted image upload as a shareable metro map."""
        image_data = await image.read(resolved_settings.max_upload_bytes + 1)
        try:
            processed = process_image(image_data, resolved_settings)
        except ValueError as error:
            return JSONResponse(
                status_code=422,
                content={
                    "code": getattr(error, "code", "processing_failed"),
                    "message": str(error),
                },
            )

        database: Database | None = app.state.database
        if database is None:
            return JSONResponse(
                status_code=503,
                content={"status": "not_ready", "code": "database_not_configured"},
            )

        record = await persist_processed_map(
            processed,
            database.sessions,
            resolved_settings,
        )
        return JSONResponse(
            status_code=201,
            content={
                "id": str(record.id),
                "schema_version": record.schema_version,
                "share_url": f"{resolved_settings.public_base_url}map/{record.id}",
            },
        )

    return app


app = create_app()
