from fastapi import Request, status
from fastapi.responses import JSONResponse
from jose import JWTError, jwt

from config.setting import get_settings

settings = get_settings()

_PUBLIC_PATHS = ("/health", "/docs", "/openapi.json")


def _unauthorized() -> JSONResponse:
    # HTTP middleware runs outside FastAPI's exception handlers, so raising
    # HTTPException here would surface as a 500; return the response instead.
    return JSONResponse(status_code=status.HTTP_401_UNAUTHORIZED, content={"detail": "Unauthorized"})


async def authenticate_middleware(request: Request, call_next):
    if request.url.path in _PUBLIC_PATHS:
        return await call_next(request)

    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        return _unauthorized()

    token = auth_header.removeprefix("Bearer ").strip()
    try:
        payload = jwt.decode(token, settings.JWT_SECRET.get_secret_value(), algorithms=[settings.JWT_ALGORITHM])
    except JWTError:
        return _unauthorized()

    user_id = payload.get("sub")
    if not user_id:
        return _unauthorized()

    request.state.user_id = user_id
    request.state.user_payload = payload
    return await call_next(request)
