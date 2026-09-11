"""Typed runtime configuration with safe development defaults."""

from pathlib import Path

from pydantic import Field, HttpUrl
from pydantic_settings import BaseSettings, SettingsConfigDict

MAX_MVP_UPLOAD_BYTES = 10 * 1024 * 1024


class ApiSettings(BaseSettings):
    """Configuration supplied through environment variables or a local .env file."""

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str | None = None
    public_base_url: HttpUrl = HttpUrl("http://localhost:3000")
    upload_dir: Path = Path("data/uploads")
    max_upload_bytes: int = Field(
        default=MAX_MVP_UPLOAD_BYTES,
        ge=1,
        le=MAX_MVP_UPLOAD_BYTES,
    )
    retention_days: int = Field(default=7, ge=1)
    processing_timeout_seconds: int = Field(default=30, ge=1)
