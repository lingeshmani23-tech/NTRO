import os
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    TSHARK_PATH: str = "tshark"
    MAX_UPLOAD_MB: int = 100
    LLM_API_KEY: str = ""
    LLM_MODEL: str = "gemini-2.5-flash"
    LLM_BASE_URL: str = ""
    DB_PATH: str = "securemailscope.db"

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )


settings = Settings()
