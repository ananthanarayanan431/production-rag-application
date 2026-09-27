from unittest.mock import AsyncMock, patch

import httpx
import openai
import pytest
from tenacity import wait_none

from agent.nodes import output_validation
from config.llm import close_llm_clients, openrouter_chat, openrouter_client
from resilience.retry import llm_retry

_REQUEST = httpx.Request("POST", "https://openrouter.ai/api/v1/chat/completions")


def _state() -> dict:
    return {
        "request_id": "r1",
        "scrubbed_query": "How do I reset my iPhone?",
        "raw_response": "Go to Settings > General > Reset.",
        "retrieved_context": ["Reset from Settings > General."],
        "intent": "reset_device",
        "sub_queries": [],
    }


# ── Validation nodes fail closed ──────────────────────────────────────────────

async def test_faithfulness_failure_scores_zero():
    with patch.object(output_validation, "_score_faithfulness", new=AsyncMock(side_effect=RuntimeError("boom"))):
        assert await output_validation.faithfulness_node(_state()) == {"faithfulness_score": 0.0}


async def test_completeness_failure_scores_zero():
    with patch.object(output_validation, "score_completeness", new=AsyncMock(side_effect=RuntimeError("boom"))):
        assert await output_validation.completeness_node(_state()) == {"completeness_score": 0.0}


async def test_faithfulness_clamps_score():
    result = type("Result", (), {"value": 1.4})()
    with patch.object(output_validation._faithfulness_scorer, "ascore", new=AsyncMock(return_value=result)):
        assert await output_validation.faithfulness_node(_state()) == {"faithfulness_score": 1.0}


# ── Retry policy ──────────────────────────────────────────────────────────────

def _response(status: int) -> httpx.Response:
    return httpx.Response(status, request=_REQUEST)


@pytest.mark.parametrize(
    ("error", "expected_attempts"),
    [
        (openai.APITimeoutError(request=_REQUEST), 3),
        (openai.RateLimitError("rate limited", response=_response(429), body=None), 3),
        (openai.InternalServerError("upstream", response=_response(502), body=None), 3),
        (openai.AuthenticationError("bad key", response=_response(401), body=None), 1),
        (openai.BadRequestError("bad request", response=_response(400), body=None), 1),
    ],
)
async def test_llm_retry_only_retries_transient_errors(error, expected_attempts):
    call = AsyncMock(side_effect=error)
    wrapped = llm_retry.copy(wait=wait_none())(call)

    with pytest.raises(type(error)):
        await wrapped()
    assert call.await_count == expected_attempts


# ── Client reuse ──────────────────────────────────────────────────────────────

def test_chat_models_are_reused_and_bounded():
    model = openrouter_chat("google/gemini-2.0-flash-001", temperature=0.0)
    assert model is openrouter_chat("google/gemini-2.0-flash-001", temperature=0.0)
    assert model.max_retries == 0
    assert model.request_timeout is not None


async def test_close_llm_clients_resets_shared_client():
    client = openrouter_client()
    assert client is openrouter_client()

    await close_llm_clients()

    assert client.is_closed()
    assert openrouter_client() is not client
    await close_llm_clients()
