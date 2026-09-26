from pydantic_settings import BaseSettings, SettingsConfigDict


class EvalSettings(BaseSettings):
    model_config = SettingsConfigDict(env_prefix="EVAL_", env_file=".env", env_file_encoding="utf-8", extra="ignore")

    APP_URL: str = "http://localhost:8000"
    # Must match the target app's JWT_SECRET / JWT_ALGORITHM
    JWT_SECRET: str = ""
    JWT_ALGORITHM: str = "HS256"
    EVAL_TIMEOUT_MS: int = 30000
    FAITHFULNESS_THRESHOLD: float = 0.7
    COMPLETENESS_THRESHOLD: float = 0.7
    LATENCY_REGRESSION_THRESHOLD: float = 0.2  # 20% regression allowed
    COST_REGRESSION_THRESHOLD: float = 0.3  # 30% cost increase allowed
    BASELINE_FILE: str = "evals/baselines/latest.json"
    DATASET_FILE: str = "evals/datasets/golden.json"


eval_settings = EvalSettings()
