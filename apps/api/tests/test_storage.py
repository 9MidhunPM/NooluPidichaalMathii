from uuid import UUID

import pytest

from app.images import NormalizedImage
from app.storage import delete_normalized_image, store_normalized_image


def test_store_normalized_image_uses_generated_volume_relative_path(tmp_path) -> None:
    image = NormalizedImage(
        data=b"normalized-png",
        mime_type="image/png",
        width=8,
        height=6,
    )
    map_id = UUID("45b88f7a-86c4-46e6-8a06-2a07a2cf0c3b")

    stored_path = store_normalized_image(image, map_id, tmp_path)

    assert stored_path == "45b88f7a-86c4-46e6-8a06-2a07a2cf0c3b.png"
    assert (tmp_path / stored_path).read_bytes() == b"normalized-png"
    assert list(tmp_path.glob(".upload-*")) == []


def test_store_normalized_image_replaces_an_existing_generated_image(tmp_path) -> None:
    map_id = UUID("45b88f7a-86c4-46e6-8a06-2a07a2cf0c3b")
    first = NormalizedImage(b"first", "image/png", 8, 6)
    replacement = NormalizedImage(b"replacement", "image/png", 8, 6)

    store_normalized_image(first, map_id, tmp_path)
    stored_path = store_normalized_image(replacement, map_id, tmp_path)

    assert (tmp_path / stored_path).read_bytes() == b"replacement"


def test_delete_normalized_image_rejects_non_generated_paths(tmp_path) -> None:
    with pytest.raises(ValueError, match="generated PNG"):
        delete_normalized_image("../outside.png", tmp_path)
