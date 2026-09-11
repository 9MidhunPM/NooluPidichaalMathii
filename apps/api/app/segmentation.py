"""Deterministic noodle-mask extraction from normalized upload pixels."""

from dataclasses import dataclass
from io import BytesIO

import cv2
import numpy as np
from numpy.typing import NDArray
from PIL import Image

from app.images import NormalizedImage

SEGMENTATION_VERSION = "color-ridge-v2"
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
    """Prefer visible pale noodle ridges, retaining a dark-strand fallback."""
    with Image.open(BytesIO(image.data)) as decoded:
        rgb = np.asarray(decoded.convert("RGB"))

    light_ridges = _light_ridge_mask(rgb)
    dark_ridges = _dark_ridge_mask(rgb)
    mask = _select_mask(light_ridges, dark_ridges)
    foreground = mask.astype(bool)
    foreground_ratio = float(np.mean(foreground))
    if not MIN_FOREGROUND_RATIO <= foreground_ratio <= MAX_FOREGROUND_RATIO:
        raise SegmentationError(
            "mask_foreground_out_of_bounds",
            "The visible noodle area is not clear enough to map. "
            "Try a top-down photo with a contrasting plate.",
        )

    return SegmentationResult(mask=foreground, foreground_ratio=foreground_ratio)


def _light_ridge_mask(rgb: NDArray[np.uint8]) -> NDArray[np.uint8]:
    """Find pale, low-saturation food strands without selecting colored surfaces."""
    lab = cv2.cvtColor(rgb, cv2.COLOR_RGB2LAB)
    hsv = cv2.cvtColor(rgb, cv2.COLOR_RGB2HSV)
    lightness = lab[:, :, 0]
    saturation = hsv[:, :, 1]
    threshold = max(170, int(np.percentile(lightness, 78)))
    mask = np.where(
        (lightness >= threshold) & (saturation <= 105),
        255,
        0,
    ).astype(np.uint8)
    cleaned = cv2.morphologyEx(
        mask,
        cv2.MORPH_OPEN,
        cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (3, 3)),
    )
    return np.asarray(cleaned, dtype=np.uint8)


def _dark_ridge_mask(rgb: NDArray[np.uint8]) -> NDArray[np.uint8]:
    """Retain support for deliberately high-contrast dark-on-light demo images."""
    grayscale = cv2.cvtColor(rgb, cv2.COLOR_RGB2GRAY)
    _, mask = cv2.threshold(
        grayscale,
        0,
        255,
        cv2.THRESH_BINARY_INV | cv2.THRESH_OTSU,
    )
    return np.asarray(mask, dtype=np.uint8)


def _select_mask(
    light_ridges: NDArray[np.uint8], dark_ridges: NDArray[np.uint8]
) -> NDArray[np.uint8]:
    """Choose a plausible ridge family; pale noodles win when available."""
    light_ratio = float(np.mean(light_ridges > 0))
    if MIN_FOREGROUND_RATIO <= light_ratio <= 0.45:
        return light_ridges
    return dark_ridges
