"""Safe decoded-content validation and normalization for map uploads."""

import warnings
from dataclasses import dataclass
from io import BytesIO

from PIL import Image, ImageOps, UnidentifiedImageError

from app.settings import ApiSettings

ALLOWED_IMAGE_MIME_TYPES = frozenset({"image/jpeg", "image/png", "image/webp"})
FORMAT_MIME_TYPES = {
    "JPEG": "image/jpeg",
    "PNG": "image/png",
    "WEBP": "image/webp",
}


class ImageValidationError(ValueError):
    """A safe, client-facing reason why an image cannot enter the pipeline."""

    def __init__(self, code: str, message: str) -> None:
        super().__init__(message)
        self.code = code


@dataclass(frozen=True, slots=True)
class NormalizedImage:
    """Metadata-free RGB PNG pixels ready for deterministic processing."""

    data: bytes
    mime_type: str
    width: int
    height: int


def decode_and_normalize(image: bytes, settings: ApiSettings) -> NormalizedImage:
    """Decode a supported upload and return a bounded, metadata-free PNG."""
    if not image:
        raise ImageValidationError("image_empty", "Choose a JPEG, PNG, or WebP image.")
    if len(image) > settings.max_upload_bytes:
        raise ImageValidationError(
            "image_too_large",
            f"Image uploads must be at most {settings.max_upload_bytes} bytes.",
        )

    try:
        with warnings.catch_warnings():
            warnings.simplefilter("error", Image.DecompressionBombWarning)
            with Image.open(BytesIO(image)) as decoded:
                source_format = decoded.format
                source_mime_type = FORMAT_MIME_TYPES.get(source_format or "")
                if source_mime_type not in ALLOWED_IMAGE_MIME_TYPES:
                    raise ImageValidationError(
                        "image_type_unsupported",
                        "Choose a JPEG, PNG, or WebP image.",
                    )

                width, height = decoded.size
                if (
                    width > settings.max_image_dimension
                    or height > settings.max_image_dimension
                ):
                    raise ImageValidationError(
                        "image_dimensions_exceeded",
                        "Choose an image no larger than "
                        f"{settings.max_image_dimension} by "
                        f"{settings.max_image_dimension} pixels.",
                    )

                normalized = ImageOps.exif_transpose(decoded).convert("RGB")
                normalized.load()
    except ImageValidationError:
        raise
    except (Image.DecompressionBombError, OSError, UnidentifiedImageError) as error:
        raise ImageValidationError(
            "image_unreadable",
            "Choose a readable JPEG, PNG, or WebP image.",
        ) from error

    output = BytesIO()
    normalized.save(output, format="PNG", optimize=True)
    return NormalizedImage(
        data=output.getvalue(),
        mime_type="image/png",
        width=normalized.width,
        height=normalized.height,
    )
