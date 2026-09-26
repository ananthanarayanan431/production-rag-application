from functools import lru_cache
from typing import Annotated, Literal

from pydantic import AfterValidator, Field, HttpUrl, SecretStr, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

# Only HMAC algorithms: the service verifies tokens with a shared secret, not a key pair.
JWTAlgorithm = Literal["HS256", "HS384", "HS512"]

# Validated as a URL but stored as a str without a trailing slash, so call sites can f"{url}/path".
ServiceUrl = Annotated[HttpUrl, AfterValidator(lambda url: str(url).rstrip("/"))]


class CustomerSupportBotSettings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
        case_sensitive=True,
        frozen=True,
    )

    MAX_INPUT_CHARS: int = Field(default=10_000, gt=0, le=100_000)

    JWT_SECRET: SecretStr = Field(min_length=32)
    JWT_ALGORITHM: JWTAlgorithm = "HS256"
    JWT_EXPIRATION: int = Field(default=3600, gt=0, description="Access token lifetime in seconds")

    JWT_REFRESH_TOKEN_SECRET: SecretStr = Field(min_length=32)
    JWT_REFRESH_TOKEN_ALGORITHM: JWTAlgorithm = "HS256"
    JWT_REFRESH_TOKEN_EXPIRATION: int = Field(default=86400, gt=0, description="Refresh token lifetime in seconds")

    # External services
    GPTCACHE_URL: ServiceUrl
    RIVAL_URL: ServiceUrl
    MONGODB_URI: SecretStr
    POSTGRES_DSN: SecretStr

    # Generation
    LOW_COMPLEXITY_MODEL: str = "gemini-2.0-flash"
    HIGH_COMPLEXITY_MODEL: str = "gemini-2.5-pro"

    # Output validation
    FAITHFULNESS_THRESHOLD: float = Field(default=0.7, ge=0.0, le=1.0)
    COMPLETENESS_THRESHOLD: float = Field(default=0.7, ge=0.0, le=1.0)

    # Session memory
    MAX_SESSION_TURNS: int = Field(default=10, gt=0)

    @model_validator(mode="after")
    def _validate_jwt(self) -> "CustomerSupportBotSettings":
        if self.JWT_SECRET.get_secret_value() == self.JWT_REFRESH_TOKEN_SECRET.get_secret_value():
            raise ValueError("JWT_REFRESH_TOKEN_SECRET must differ from JWT_SECRET")
        if self.JWT_REFRESH_TOKEN_EXPIRATION <= self.JWT_EXPIRATION:
            raise ValueError("JWT_REFRESH_TOKEN_EXPIRATION must be greater than JWT_EXPIRATION")
        return self


@lru_cache
def get_settings() -> CustomerSupportBotSettings:
    return CustomerSupportBotSettings()
