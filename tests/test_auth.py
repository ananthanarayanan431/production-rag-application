import pytest
from fastapi import FastAPI, Request
from fastapi.testclient import TestClient
from jose import jwt

from config.setting import get_settings
from middleware.auth import authenticate_middleware
from middleware.input_guard import input_guard_middleware


@pytest.fixture
def client():
    app = FastAPI()
    app.middleware("http")(input_guard_middleware)
    app.middleware("http")(authenticate_middleware)

    @app.post("/query")
    async def query(request: Request):
        body = await request.json()
        return {"user_id": request.state.user_id, "query": body["query"]}

    @app.get("/health")
    async def health():
        return {"status": "ok"}

    return TestClient(app, raise_server_exceptions=False)


def _token(claims: dict) -> str:
    settings = get_settings()
    return jwt.encode(claims, settings.JWT_SECRET.get_secret_value(), algorithm=settings.JWT_ALGORITHM)


def test_valid_token_reaches_endpoint_with_body_intact(client):
    resp = client.post("/query", json={"query": "hi"}, headers={"Authorization": f"Bearer {_token({'sub': 'u1'})}"})
    assert resp.status_code == 200
    assert resp.json() == {"user_id": "u1", "query": "hi"}


@pytest.mark.parametrize(
    "headers",
    [
        {},
        {"Authorization": "Bearer not-a-jwt"},
        {"Authorization": "Basic abc"},
    ],
)
def test_rejects_missing_or_invalid_token_with_401(client, headers):
    resp = client.post("/query", json={"query": "hi"}, headers=headers)
    assert resp.status_code == 401
    assert resp.json() == {"detail": "Unauthorized"}


def test_rejects_token_without_sub_with_401(client):
    resp = client.post("/query", json={"query": "hi"}, headers={"Authorization": f"Bearer {_token({'user': 'x'})}"})
    assert resp.status_code == 401


def test_invalid_body_returns_400_not_500(client):
    headers = {"Authorization": f"Bearer {_token({'sub': 'u1'})}"}
    resp = client.post("/query", content=b"{not json", headers=headers)
    assert resp.status_code == 400


def test_health_is_public(client):
    assert client.get("/health").status_code == 200
