import pytest

from agent.nodes.output_validation import route_after_validation, validation_merge_node
from config.setting import get_settings

_BASE = {"request_id": "r1", "raw_response": "answer"}


@pytest.mark.asyncio
async def test_failure_escalates_with_feedback():
    state = {**_BASE, "faithfulness_score": 0.2, "completeness_score": 1.0, "retry_count": 0}
    update = await validation_merge_node(state)
    assert update["validation_passed"] is False
    assert update["retry_count"] == 1
    assert "not supported" in update["validation_feedback"]
    assert route_after_validation({**state, **update}) == "query_intelligence"


@pytest.mark.asyncio
async def test_incomplete_answer_feedback_mentions_sub_queries():
    state = {**_BASE, "faithfulness_score": 1.0, "completeness_score": 0.2, "retry_count": 0}
    update = await validation_merge_node(state)
    assert "sub_queries" in update["validation_feedback"]


@pytest.mark.asyncio
async def test_stops_escalating_after_max_retries():
    state = {
        **_BASE,
        "faithfulness_score": 0.2,
        "completeness_score": 0.2,
        "retry_count": get_settings().MAX_VALIDATION_RETRIES,
    }
    update = await validation_merge_node(state)
    assert update["validation_passed"] is False
    assert "validation_feedback" not in update
    assert route_after_validation({**state, **update}) == "cache_store"


@pytest.mark.asyncio
async def test_pass_goes_to_cache_store():
    state = {**_BASE, "faithfulness_score": 0.9, "completeness_score": 0.9, "retry_count": 0}
    update = await validation_merge_node(state)
    assert update["validation_passed"] is True
    assert route_after_validation({**state, **update}) == "cache_store"
