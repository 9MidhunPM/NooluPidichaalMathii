"""Private, volume-backed storage for normalized map images."""

import os
from pathlib import Path
from tempfile import NamedTemporaryFile
from uuid import UUID

from app.images import NormalizedImage
from app.skeleton import SkeletonResult


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


def store_skeleton_image(
    skeleton: SkeletonResult, map_id: UUID, upload_dir: Path
) -> str:
    """Store the actual one-pixel extraction result for the reveal."""
    import cv2

    upload_dir.mkdir(parents=True, exist_ok=True)
    relative_path = f"{map_id}-skeleton.png"
    destination = upload_dir / relative_path
    ok, encoded = cv2.imencode(".png", skeleton.pixels.astype("uint8") * 255)
    if not ok:
        raise ValueError("could not encode skeleton artifact")
    with NamedTemporaryFile(dir=upload_dir, prefix=".skeleton-", delete=False) as temp:
        temp.write(encoded.tobytes())
        temporary_path = Path(temp.name)
    try:
        os.replace(temporary_path, destination)
    except OSError:
        temporary_path.unlink(missing_ok=True)
        raise
    return relative_path


def delete_normalized_image(relative_path: str, upload_dir: Path) -> None:
    """Remove one generated upload path without accepting arbitrary traversal."""
    path = Path(relative_path)
    if path.name != relative_path or path.suffix != ".png":
        raise ValueError("normalized image paths must be generated PNG filenames")
    (upload_dir / path).unlink(missing_ok=True)


def read_normalized_image(relative_path: str, upload_dir: Path) -> bytes | None:
    """Read one generated PNG without allowing a path outside the upload volume."""
    path = Path(relative_path)
    if path.name != relative_path or path.suffix != ".png":
        raise ValueError("normalized image paths must be generated PNG filenames")
    try:
        return (upload_dir / path).read_bytes()
    except FileNotFoundError:
        return None


def read_artifact_image(relative_path: str, upload_dir: Path) -> bytes | None:
    """Read a generated PNG artifact from the map storage volume."""
    path = Path(relative_path)
    if path.name != relative_path or not path.name.endswith("-skeleton.png"):
        raise ValueError("artifact paths must be generated skeleton PNG filenames")
    try:
        return (upload_dir / path).read_bytes()
    except FileNotFoundError:
        return None
