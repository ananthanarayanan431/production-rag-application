import os

# Settings are validated at import time, so provide test values before any
# app module is imported. Real env / .env values take precedence.
_TEST_ENV = {
    "JWT_SECRET": "test-jwt-secret-" + "x" * 32,
    "JWT_REFRESH_TOKEN_SECRET": "test-refresh-secret-" + "y" * 32,
    "GPTCACHE_URL": "http://localhost:8001",
    "RIVAL_URL": "http://localhost:8002",
    "MONGODB_URI": "mongodb://localhost:27017",
    "POSTGRES_DSN": "postgresql://postgres:postgres@localhost:5432/support_bot",
    "PAGEINDEX_API_KEY": "test-pageindex-key",
    "OPENROUTER_API_KEY": "test-openrouter-key",
}

for key, value in _TEST_ENV.items():
    os.environ.setdefault(key, value)
