from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
from uuid import UUID

from fastapi import FastAPI, File, UploadFile
from fastapi.responses import JSONResponse, Response
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError

from app.contracts import MetroGraph
from app.db.session import Database, create_database
from app.maps import get_map_record, persist_processed_map
from app.pipeline import process_image
from app.routing import find_route
from app.settings import ApiSettings
from app.storage import read_normalized_image


class RouteRequest(BaseModel):
    """Station choices supplied by the accessible route planner."""

    model_config = ConfigDict(extra="forbid")

    origin_id: str = Field(min_length=1, max_length=128)
    destination_id: str = Field(min_length=1, max_length=128)


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

    @app.get("/api/maps/{map_id}")
    async def get_map(map_id: UUID) -> JSONResponse:
        """Return a stored map's public graph without rerunning processing."""
        database: Database | None = app.state.database
        if database is None:
            return JSONResponse(
                status_code=503,
                content={"status": "not_ready", "code": "database_not_configured"},
            )

        record = await get_map_record(database.sessions, map_id)
        if record is None:
            return JSONResponse(
                status_code=404,
                content={
                    "code": "map_not_found",
                    "message": "This map is unavailable.",
                },
            )
        return JSONResponse(
            content={
                "id": str(record.id),
                "schema_version": record.schema_version,
                "pipeline_version": record.pipeline_version,
                "image_width": record.image_width,
                "image_height": record.image_height,
                "visual_seed": record.visual_seed,
                "graph": record.graph,
            },
        )

    @app.get("/api/maps/{map_id}/image")
    async def get_map_image(map_id: UUID) -> Response:
        """Return the normalized source image for the matching persisted map."""
        database: Database | None = app.state.database
        if database is None:
            return JSONResponse(
                status_code=503,
                content={"status": "not_ready", "code": "database_not_configured"},
            )

        record = await get_map_record(database.sessions, map_id)
        if record is None:
            return JSONResponse(
                status_code=404,
                content={
                    "code": "map_not_found",
                    "message": "This map is unavailable.",
                },
            )
        image = read_normalized_image(record.image_path, resolved_settings.upload_dir)
        if image is None:
            return JSONResponse(
                status_code=404,
                content={
                    "code": "map_image_not_found",
                    "message": "This map image is unavailable.",
                },
            )
        return Response(content=image, media_type="image/png")

    @app.post("/api/maps/{map_id}/route")
    async def route_map(map_id: UUID, request: RouteRequest) -> JSONResponse:
        """Calculate a deterministic route from the stored graph only."""
        database: Database | None = app.state.database
        if database is None:
            return JSONResponse(
                status_code=503,
                content={"status": "not_ready", "code": "database_not_configured"},
            )

        record = await get_map_record(database.sessions, map_id)
        if record is None:
            return JSONResponse(
                status_code=404,
                content={
                    "code": "map_not_found",
                    "message": "This map is unavailable.",
                },
            )

        route = find_route(
            MetroGraph.model_validate(record.graph),
            request.origin_id,
            request.destination_id,
        )
        return JSONResponse(
            content={
                "status": route.status,
                "node_ids": list(route.node_ids),
                "edge_ids": list(route.edge_ids),
                "total_length_px": route.total_length_px,
                "warning": route.warning,
            },
        )

    return app


app = create_app()
