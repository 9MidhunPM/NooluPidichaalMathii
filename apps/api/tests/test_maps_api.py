from io import BytesIO

import httpx
import pytest
from PIL import Image, ImageDraw

from app.main import create_app
from app.maps import new_map_record
from app.pipeline import process_image
from app.settings import ApiSettings


class FakeSession:
    def __init__(self, records: dict[object, object]) -> None:
        self.records = records

    def __call__(self) -> "FakeSession":
        return self

    async def __aenter__(self) -> "FakeSession":
        return self

    async def __aexit__(self, *_args: object) -> None:
        return None

    async def get(self, _model: object, map_id: object) -> object | None:
        return self.records.get(map_id)


class FakeDatabase:
    def __init__(self, sessions: FakeSession) -> None:
        self.sessions = sessions


@pytest.mark.anyio
async def test_create_map_returns_a_typed_rejection_for_unreadable_uploads() -> None:
    app = create_app()
    transport = httpx.ASGITransport(app=app)

    async with app.router.lifespan_context(app):
        async with httpx.AsyncClient(
            transport=transport,
            base_url="http://testserver",
        ) as client:
            response = await client.post(
                "/api/maps",
                files={"image": ("anything.jpg", b"not an image", "image/jpeg")},
            )

    assert response.status_code == 422
    assert response.json()["code"] == "image_unreadable"


@pytest.mark.anyio
async def test_create_map_checks_database_after_processing_a_valid_upload() -> None:
    output = BytesIO()
    image = Image.new("RGB", (100, 100), color="white")
    draw = ImageDraw.Draw(image)
    draw.line([(10, 50), (90, 50)], fill="black", width=6)
    draw.line([(50, 10), (50, 90)], fill="black", width=6)
    image.save(output, format="JPEG")

    app = create_app()
    transport = httpx.ASGITransport(app=app)
    async with app.router.lifespan_context(app):
        async with httpx.AsyncClient(
            transport=transport,
            base_url="http://testserver",
        ) as client:
            response = await client.post(
                "/api/maps",
                files={"image": ("plate.jpg", output.getvalue(), "image/jpeg")},
            )

    assert response.status_code == 503
    assert response.json()["code"] == "database_not_configured"


@pytest.mark.anyio
async def test_get_map_returns_a_saved_public_graph_without_image_path() -> None:
    settings = ApiSettings()
    record = new_map_record(
        process_image(a_valid_upload(), settings),
        settings,
        "private-volume-file.png",
    )
    app = create_app()
    transport = httpx.ASGITransport(app=app)
    async with app.router.lifespan_context(app):
        app.state.database = FakeDatabase(FakeSession({record.id: record}))  # type: ignore[assignment]
        async with httpx.AsyncClient(
            transport=transport,
            base_url="http://testserver",
        ) as client:
            response = await client.get(f"/api/maps/{record.id}")

    assert response.status_code == 200
    assert response.json()["id"] == str(record.id)
    assert response.json()["graph"] == record.graph
    assert "image_path" not in response.json()


@pytest.mark.anyio
async def test_route_map_returns_a_stored_graph_route() -> None:
    settings = ApiSettings()
    record = new_map_record(
        process_image(a_valid_upload(), settings),
        settings,
        "private-volume-file.png",
    )
    graph_nodes = record.graph["nodes"]
    assert isinstance(graph_nodes, list)
    origin_id = graph_nodes[0]["id"]
    destination_id = graph_nodes[-1]["id"]
    assert isinstance(origin_id, str)
    assert isinstance(destination_id, str)

    app = create_app()
    transport = httpx.ASGITransport(app=app)
    async with app.router.lifespan_context(app):
        app.state.database = FakeDatabase(FakeSession({record.id: record}))  # type: ignore[assignment]
        async with httpx.AsyncClient(
            transport=transport,
            base_url="http://testserver",
        ) as client:
            response = await client.post(
                f"/api/maps/{record.id}/route",
                json={"origin_id": origin_id, "destination_id": destination_id},
            )

    assert response.status_code == 200
    assert response.json()["status"] == "ok"
    assert response.json()["node_ids"][0] == origin_id
    assert response.json()["node_ids"][-1] == destination_id


@pytest.mark.anyio
async def test_get_map_image_does_not_expose_the_volume_path(tmp_path) -> None:
    settings = ApiSettings(upload_dir=tmp_path)
    record = new_map_record(
        process_image(a_valid_upload(), settings),
        settings,
        "private-volume-file.png",
    )
    (tmp_path / record.image_path).write_bytes(b"normalized-png")
    app = create_app(settings)
    transport = httpx.ASGITransport(app=app)
    async with app.router.lifespan_context(app):
        app.state.database = FakeDatabase(FakeSession({record.id: record}))  # type: ignore[assignment]
        async with httpx.AsyncClient(
            transport=transport,
            base_url="http://testserver",
        ) as client:
            response = await client.get(f"/api/maps/{record.id}/image")

    assert response.status_code == 200
    assert response.headers["content-type"] == "image/png"
    assert response.content == b"normalized-png"


def a_valid_upload() -> bytes:
    output = BytesIO()
    image = Image.new("RGB", (100, 100), color="white")
    draw = ImageDraw.Draw(image)
    draw.line([(10, 50), (90, 50)], fill="black", width=6)
    draw.line([(50, 10), (50, 90)], fill="black", width=6)
    image.save(output, format="JPEG")
    return output.getvalue()
