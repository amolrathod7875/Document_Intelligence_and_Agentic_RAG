import os
from pathlib import Path
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    ENVIRONMENT: str = "development"
    ALLOWED_EXTENSIONS: set = {"pdf", "png", "jpg", "jpeg", "txt"}
    MAX_FILE_SIZE_BYTES: int = 15 * 1024 * 1024
    
    # Cerebras Configuration
    CEREBRAS_API_KEY: str = ""
    CEREBRAS_BASE_URL: str = "https://api.cerebras.ai/v1"
    CEREBRAS_MODEL: str = "zai-glm-4.7"
    
    BASE_DIR: Path = Path(__file__).resolve().parent.parent.parent
    DATA_DIR: Path = BASE_DIR / "data"
    UPLOAD_DIR: Path = DATA_DIR / "uploads"
    IMAGE_DIR: Path = DATA_DIR / "page_images"
    TEXT_DIR: Path = DATA_DIR / "processed_text"
    VECTOR_DB_DIR: Path = DATA_DIR / "vector_db"
    
    class Config:
        env_file = ".env"
        # Allow missing keys during local setup fallback
        extra = "ignore"

settings = Settings()

# Ensure internal structural storage layers exist securely
for path in [settings.UPLOAD_DIR, settings.IMAGE_DIR, settings.TEXT_DIR, settings.VECTOR_DB_DIR]:
    path.mkdir(parents=True, exist_ok=True)