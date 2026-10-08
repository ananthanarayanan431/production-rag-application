import pytest

from agent.nodes.session_memory import session_save_node


@pytest.mark.asyncio
async def test_saves_scrubbed_query_and_response():
    state = {
        "request_id": "r1",
        "raw_query": "my email is a@b.com, how do I reset?",
        "scrubbed_query": "my email is <EMAIL_ADDRESS>, how do I reset?",
        "final_response": "Hold the button.",
        "session_history": [],
    }
    result = await session_save_node(state)
    assert result["session_history"] == [
        {"role": "user", "content": "my email is <EMAIL_ADDRESS>, how do I reset?"},
        {"role": "assistant", "content": "Hold the button."},
    ]


@pytest.mark.asyncio
async def test_skips_when_no_response():
    result = await session_save_node({"request_id": "r1", "scrubbed_query": "q", "final_response": ""})
    assert result == {}
