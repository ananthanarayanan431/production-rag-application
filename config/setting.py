

class CustomerSupportBotSettings:
    MAX_INPUT_CHARS: int = 10000
    JWT_SECRET: str
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRATION: int = 3600
    JWT_REFRESH_TOKEN_EXPIRATION: int = 86400
    JWT_REFRESH_TOKEN_SECRET: str = "refresh_secret"
    JWT_REFRESH_TOKEN_ALGORITHM: str = "HS256"