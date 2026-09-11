from io import BytesIO

import numpy as np
import pytest
from PIL import Image, ImageDraw

from app.images import NormalizedImage
from app.segmentation import SEGMENTATION_VERSION, SegmentationError, segment


def normalized_image_with_dark_strands() -> NormalizedImage:
    image = Image.new("RGB", (100, 100), color="white")
    ImageDraw.Draw(image).line([(10, 20), (90, 20)], fill="black", width=6)
    ImageDraw.Draw(image).line([(50, 10), (50, 90)], fill="black", width=6)
    output = BytesIO()
    image.save(output, format="PNG")
    return NormalizedImage(output.getvalue(), "image/png", 100, 100)


def test_segment_extracts_dark_strands_deterministically() -> None:
    image = normalized_image_with_dark_strands()

    first = segment(image)
    second = segment(image)

    assert first.strategy == SEGMENTATION_VERSION
    assert first.mask.shape == (100, 100)
    assert first.mask[20, 10]
    assert not first.mask[0, 0]
    assert 0.05 < first.foreground_ratio < 0.15
    assert np.array_equal(first.mask, second.mask)


def test_segment_prefers_pale_low_saturation_strands_over_colored_background() -> None:
    image = Image.new("RGB", (100, 100), color="#2f7f35")
    draw = ImageDraw.Draw(image)
    draw.line([(10, 30), (90, 30)], fill="#f7f0dd", width=7)
    draw.line([(15, 70), (85, 70)], fill="#f7f0dd", width=7)
    output = BytesIO()
    image.save(output, format="PNG")

    result = segment(NormalizedImage(output.getvalue(), "image/png", 100, 100))

    assert result.mask[30, 50]
    assert result.mask[70, 50]
    assert not result.mask[0, 0]


def test_segment_removes_a_bright_background_connected_to_the_photo_border() -> None:
    image = Image.new("RGB", (120, 120), color="#c4c9c5")
    draw = ImageDraw.Draw(image)
    draw.ellipse((18, 18, 102, 102), fill="#252925")
    draw.ellipse((24, 24, 96, 96), fill="#f5f0df")
    draw.line([(36, 48), (82, 70)], fill="#fffdf2", width=5)
    output = BytesIO()
    image.save(output, format="PNG")

    result = segment(NormalizedImage(output.getvalue(), "image/png", 120, 120))

    assert result.mask[60, 60]
    assert not result.mask[0, 0]


def test_segment_rejects_images_without_enough_foreground() -> None:
    output = BytesIO()
    Image.new("RGB", (100, 100), color="white").save(output, format="PNG")
    image = NormalizedImage(output.getvalue(), "image/png", 100, 100)

    with pytest.raises(SegmentationError, match="not clear enough") as error:
        segment(image)

    assert error.value.code == "mask_foreground_out_of_bounds"
