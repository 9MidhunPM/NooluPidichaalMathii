import numpy as np
import pytest

from app.segmentation import SegmentationResult
from app.skeleton import SKELETON_VERSION, SkeletonError, skeletonize


def neighbor_degrees(pixels: np.ndarray) -> list[int]:
    degrees: list[int] = []
    for y, x in zip(*np.nonzero(pixels), strict=True):
        y_start, y_end = max(0, y - 1), min(pixels.shape[0], y + 2)
        x_start, x_end = max(0, x - 1), min(pixels.shape[1], x + 2)
        degrees.append(int(pixels[y_start:y_end, x_start:x_end].sum()) - 1)
    return degrees


def test_skeletonize_reduces_a_thick_cross_and_preserves_topology() -> None:
    mask = np.zeros((31, 31), dtype=bool)
    mask[12:19, 3:28] = True
    mask[3:28, 12:19] = True

    result = skeletonize(SegmentationResult(mask=mask, foreground_ratio=0.3))

    assert result.version == SKELETON_VERSION
    assert result.pixels.dtype == bool
    assert result.pixels.sum() < mask.sum()
    degrees = neighbor_degrees(result.pixels)
    assert degrees.count(1) == 4
    assert max(degrees) >= 3


def test_skeletonize_rejects_empty_masks() -> None:
    mask = SegmentationResult(mask=np.zeros((8, 8), dtype=bool), foreground_ratio=0)

    with pytest.raises(SkeletonError, match="not clear enough") as error:
        skeletonize(mask)

    assert error.value.code == "skeleton_empty_mask"
