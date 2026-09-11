from io import BytesIO

import pytest
from PIL import Image

from app.images import ImageValidationError, decode_and_normalize
from app.settings import ApiSettings


def encoded_image(image_format: str = "JPEG", size: tuple[int, int] = (8, 6)) -> bytes:
    output = BytesIO()
    Image.new("RGB", size=size, color=(120, 88, 44)).save(output, format=image_format)
    return output.getvalue()


def test_decode_and_normalize_returns_metadata_free_rgb_png() -> None:
    normalized = decode_and_normalize(encoded_image("JPEG"), ApiSettings())

    assert normalized.mime_type == "image/png"
    assert (normalized.width, normalized.height) == (8, 6)
    with Image.open(BytesIO(normalized.data)) as decoded:
        assert decoded.format == "PNG"
        assert decoded.mode == "RGB"
        assert decoded.getexif() == {}


def test_decode_and_normalize_rejects_unreadable_content() -> None:
    with pytest.raises(ImageValidationError, match="readable") as error:
        decode_and_normalize(b"not an image", ApiSettings())

    assert error.value.code == "image_unreadable"


def test_decode_and_normalize_rejects_unsupported_decoded_format() -> None:
    with pytest.raises(ImageValidationError, match="JPEG, PNG, or WebP") as error:
        decode_and_normalize(encoded_image("GIF"), ApiSettings())

    assert error.value.code == "image_type_unsupported"


def test_decode_and_normalize_rejects_excessive_byte_count_before_decode() -> None:
    with pytest.raises(ImageValidationError, match="at most 3 bytes") as error:
        decode_and_normalize(encoded_image(), ApiSettings(max_upload_bytes=3))

    assert error.value.code == "image_too_large"


def test_decode_and_normalize_rejects_excessive_dimensions() -> None:
    with pytest.raises(ImageValidationError, match="8 by 8") as error:
        decode_and_normalize(
            encoded_image(size=(9, 8)),
            ApiSettings(max_image_dimension=8),
        )

    assert error.value.code == "image_dimensions_exceeded"
