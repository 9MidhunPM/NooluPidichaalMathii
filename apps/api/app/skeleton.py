"""One-pixel topology extraction from accepted segmentation masks."""

from dataclasses import dataclass

import numpy as np
from numpy.typing import NDArray
from skimage.morphology import skeletonize as skimage_skeletonize

from app.segmentation import SegmentationResult

SKELETON_VERSION = "skeleton-v1"


class SkeletonError(ValueError):
    """A safe reason why a mask cannot produce a route topology."""

    def __init__(self, code: str, message: str) -> None:
        super().__init__(message)
        self.code = code


@dataclass(frozen=True, slots=True)
class SkeletonResult:
    """A deterministic one-pixel mask for graph extraction."""

    pixels: NDArray[np.bool_]
    version: str = SKELETON_VERSION


def skeletonize(mask: SegmentationResult) -> SkeletonResult:
    """Reduce a non-empty foreground mask to its visible centre lines."""
    if not np.any(mask.mask):
        raise SkeletonError(
            "skeleton_empty_mask",
            "The visible noodle area is not clear enough to map.",
        )

    pixels = skimage_skeletonize(mask.mask).astype(bool)  # type: ignore[no-untyped-call]
    if not np.any(pixels):
        raise SkeletonError(
            "skeleton_empty_result",
            "The visible noodle area is not clear enough to map.",
        )

    return SkeletonResult(pixels=pixels)
