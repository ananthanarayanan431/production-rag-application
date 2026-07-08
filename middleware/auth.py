from jose import jwt 
from jose import JWTError
from fastapi import Request
from fastapi import HTTPException
from fastapi import status
from config.setting import CustomerSupportBotSettings

settings = CustomerSupportBotSettings()

async def authenticate_middleware(request: Request, call_next):

    if request.url.path in ("/health", "/docs", "/openapi.json"):
        return await call_next(request)
    
    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Unauthorized")
    
    token = auth_header.removeprefix("Bearer ").strip()
    try:
        payload = jwt.decode(token, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM])
        request.state.user_id = payload["sub"]
        request.state.user_payload = payload
    except JWTError as e:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=f"Unauthorized: {e}")
    
    return await call_next(request)

