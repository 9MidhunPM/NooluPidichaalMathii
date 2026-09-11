import pytest
from pydantic import ValidationError

from app.settings import MAX_MVP_IMAGE_DIMENSION, MAX_MVP_UPLOAD_BYTES, ApiSettings


def test_settings_use_mvp_safe_defaults() -> None:
    settings = ApiSettings()

    assert settings.retention_days == 7
    assert settings.max_upload_bytes == MAX_MVP_UPLOAD_BYTES
    assert settings.max_image_dimension == MAX_MVP_IMAGE_DIMENSION
    assert settings.upload_dir.as_posix() == "data/uploads"


def test_settings_reject_uploads_larger_than_mvp_limit() -> None:
    with pytest.raises(ValidationError):
        ApiSettings(max_upload_bytes=MAX_MVP_UPLOAD_BYTES + 1)


def test_settings_reject_image_dimensions_larger_than_mvp_limit() -> None:
    with pytest.raises(ValidationError):
        ApiSettings(max_image_dimension=MAX_MVP_IMAGE_DIMENSION + 1)
