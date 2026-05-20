from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    llm_base_url: str = "https://api.deepseek.com"
    llm_api_key: str = ""
    llm_model: str = "deepseek-chat"
    llm_max_tokens: int = 65536

    database_url: str = "sqlite+aiosqlite:///data/omnimind.db"
    chroma_persist_dir: str = "data/chroma"

    bing_api_key: str = ""
    searchapi_key: str = ""

    api_key_hash: str = ""
    require_api_key: bool = True

    workspace_dir: str = "data/workspace"

    host: str = "0.0.0.0"
    port: int = 8000
    log_level: str = "info"
    llm_request_timeout: int = 120
    llm_max_retries: int = 3

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}


settings = Settings()
