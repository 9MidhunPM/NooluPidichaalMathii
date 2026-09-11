"""Private, volume-backed storage for normalized map images."""

import os
from pathlib import Path
from tempfile import NamedTemporaryFile
from uuid import UUID

from app.images import NormalizedImage


def store_normalized_image(
    image: NormalizedImage,
    map_id: UUID,
    upload_dir: Path,
) -> str:
    """Atomically store an image under a generated, volume-relative path."""
    upload_dir.mkdir(parents=True, exist_ok=True)
    relative_path = f"{map_id}.png"
    destination = upload_dir / relative_path

    with NamedTemporaryFile(dir=upload_dir, prefix=".upload-", delete=False) as temp:
        temp.write(image.data)
        temporary_path = Path(temp.name)

    try:
        os.replace(temporary_path, destination)
    except OSError:
        temporary_path.unlink(missing_ok=True)
        raise

    return relative_path
