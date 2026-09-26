import json

from fastapi import Request, status
from fastapi.responses import JSONResponse

from config.setting import get_settings

settings = get_settings()


def _bad_request(detail: str) -> JSONResponse:
    # HTTP middleware runs outside FastAPI's exception handlers, so raising
    # HTTPException here would surface as a 500; return the response instead.
    return JSONResponse(status_code=status.HTTP_400_BAD_REQUEST, content={"detail": detail})


async def input_guard_middleware(request: Request, call_next):
    if request.method == "POST" and request.url.path == "/query":
        body = await request.body()
        try:
            data = json.loads(body)
        except (json.JSONDecodeError, UnicodeDecodeError):
            return _bad_request("Invalid JSON body")

        if not isinstance(data, dict):
            return _bad_request("Body must be a JSON object")

        query = data.get("query", "")

        if not isinstance(query, str):
            return _bad_request("query must be a string")

        if not query.strip():
            return _bad_request("query must not be empty")

        if len(query) > settings.MAX_INPUT_CHARS:
            return _bad_request(f"query exceeds maximum length of {settings.MAX_INPUT_CHARS} characters")

    return await call_next(request)
