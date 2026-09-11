from io import BytesIO

from PIL import Image, ImageDraw

from app.pipeline import PIPELINE_VERSION, process_image
from app.settings import ApiSettings


def a_crossing_upload() -> bytes:
    image = Image.new("RGB", (100, 100), color="white")
    draw = ImageDraw.Draw(image)
    draw.line([(10, 50), (90, 50)], fill="black", width=6)
    draw.line([(50, 10), (50, 90)], fill="black", width=6)
    output = BytesIO()
    image.save(output, format="JPEG")
    return output.getvalue()


def test_process_image_creates_a_deterministic_contract_valid_metro_graph() -> None:
    image_data = a_crossing_upload()

    first = process_image(image_data, ApiSettings())
    second = process_image(image_data, ApiSettings())

    assert first.pipeline_version == PIPELINE_VERSION
    assert first.image.mime_type == "image/png"
    assert first.graph == second.graph
    assert first.visual_seed == second.visual_seed
    assert len(first.graph.nodes) == 5
    assert len(first.graph.edges) == 4
    assert len(first.graph.lines) == 1
    assert first.segmentation.foreground_ratio > 0
    assert first.skeleton.pixels.any()
