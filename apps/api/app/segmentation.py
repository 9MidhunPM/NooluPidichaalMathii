"""Deterministic noodle-mask extraction from normalized upload pixels."""

from dataclasses import dataclass
from io import BytesIO

import cv2
import numpy as np
from numpy.typing import NDArray
from PIL import Image

from app.images import NormalizedImage

SEGMENTATION_VERSION = "otsu-v1"
MIN_FOREGROUND_RATIO = 0.002
MAX_FOREGROUND_RATIO = 0.8


class SegmentationError(ValueError):
    """A safe reason why a decoded image cannot form a useful noodle mask."""

    def __init__(self, code: str, message: str) -> None:
        super().__init__(message)
        self.code = code


@dataclass(frozen=True, slots=True)
class SegmentationResult:
    """A deterministic, one-bit foreground mask plus diagnostic measurements."""

    mask: NDArray[np.bool_]
    foreground_ratio: float
    strategy: str = SEGMENTATION_VERSION


def segment(image: NormalizedImage) -> SegmentationResult:
    """Isolate dark visible strands with a deterministic Otsu threshold."""
    with Image.open(BytesIO(image.data)) as decoded:
        rgb = np.asarray(decoded.convert("RGB"))

    grayscale = cv2.cvtColor(rgb, cv2.COLOR_RGB2GRAY)
    _, mask = cv2.threshold(
        grayscale,
        0,
        255,
        cv2.THRESH_BINARY_INV | cv2.THRESH_OTSU,
    )
    foreground = mask.astype(bool)
    foreground_ratio = float(np.mean(foreground))
    if not MIN_FOREGROUND_RATIO <= foreground_ratio <= MAX_FOREGROUND_RATIO:
        raise SegmentationError(
            "mask_foreground_out_of_bounds",
            "The visible noodle area is not clear enough to map. "
            "Try a top-down photo with a contrasting plate.",
        )

    return SegmentationResult(mask=foreground, foreground_ratio=foreground_ratio)
