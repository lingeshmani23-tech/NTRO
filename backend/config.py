import os
from pydantic_settings import BaseSettings, SettingsConfigDict


def get_default_db_path() -> str:
    if os.getenv("VERCEL") or os.getenv("AWS_LAMBDA_FUNCTION_NAME"):
        return "/tmp/securemailscope.db"
    return "securemailscope.db"


class Settings(BaseSettings):
    TSHARK_PATH: str = "tshark"
    MAX_UPLOAD_MB: int = 100
    LLM_API_KEY: str = ""
    LLM_MODEL: str = "gemini-2.5-flash"
    LLM_BASE_URL: str = ""
    DB_PATH: str = get_default_db_path()

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )


settings = Settings()

