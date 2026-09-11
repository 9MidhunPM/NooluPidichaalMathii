from io import BytesIO

import httpx
import pytest
from PIL import Image, ImageDraw

from app.main import create_app


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
