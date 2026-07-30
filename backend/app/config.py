from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    app_name: str = "MyTube"
    database_url: str = "sqlite+aiosqlite:///./data/mytube.db"
    secret_key: str = "mytube-secret-key-change-in-production"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 1440
    tmdb_api_key: str = ""
    youtube_api_key: str = ""

    class Config:
        env_file = ".env"


settings = Settings()
