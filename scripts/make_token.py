"""
Mint a JWT for the local API, signed with JWT_SECRET from .env.

    uv run python -m scripts.make_token [--sub USER_ID] [--ttl SECONDS]

Paste the printed token into the web UI's token dialog. For local development
only: production tokens should come from your identity provider.
"""
import argparse
import time

from jose import jwt
from pydantic import Field, SecretStr
from pydantic_settings import BaseSettings, SettingsConfigDict

from config.setting import JWTAlgorithm


class _JwtSettings(BaseSettings):
    """Only the signing settings, so a token can be minted before the rest of .env is filled in."""

    model_config = SettingsConfigDict(
        env_file=".env", env_file_encoding="utf-8", extra="ignore", case_sensitive=True, hide_input_in_errors=True
    )

    JWT_SECRET: SecretStr = Field(min_length=32)
    JWT_ALGORITHM: JWTAlgorithm = "HS256"
    JWT_EXPIRATION: int = Field(default=3600, gt=0)


def main() -> None:
    settings = _JwtSettings()
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--sub", default="local-dev", help="user id to put in the sub claim")
    parser.add_argument(
        "--ttl",
        type=int,
        default=settings.JWT_EXPIRATION,
        help="lifetime in seconds (default: JWT_EXPIRATION)",
    )
    args = parser.parse_args()

    now = int(time.time())
    claims = {"sub": args.sub, "iat": now, "exp": now + args.ttl}
    print(jwt.encode(claims, settings.JWT_SECRET.get_secret_value(), algorithm=settings.JWT_ALGORITHM))


if __name__ == "__main__":
    main()
