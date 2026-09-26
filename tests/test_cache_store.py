from unittest.mock import AsyncMock, patch

import pytest

from agent.nodes import cache_store


def _state(validation_passed: bool) -> dict:
    return {
        "request_id": "r1",
        "raw_query": "q",
        "final_response": "a",
        "validation_passed": validation_passed,
    }


@pytest.mark.parametrize(("validation_passed", "expected_calls"), [(True, 1), (False, 0)])
async def test_only_validated_responses_are_cached(validation_passed, expected_calls):
    with patch.object(cache_store, "_store", new=AsyncMock()) as store:
        assert await cache_store.cache_store_node(_state(validation_passed)) == {}
    assert store.await_count == expected_calls
