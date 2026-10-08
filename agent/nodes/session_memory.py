"""
Session memory: the PostgresSaver checkpointer persists state per session_id, and
session_history is an append-only field (see append_history in state.py, which also
caps its length). This node records each completed exchange so later turns can
use it as conversation context.
"""
from agent.state import SupportBotState
from observability.logging import get_logger


async def session_save_node(state: SupportBotState) -> dict:
    log = get_logger(state["request_id"], node="session_save")

    if not state.get("final_response"):
        return {}

    # scrubbed_query, not raw_query: history is checkpointed to Postgres and re-sent to the LLM.
    exchange = [
        {"role": "user", "content": state["scrubbed_query"]},
        {"role": "assistant", "content": state["final_response"]},
    ]
    log.info("session_exchange_saved", prior_messages=len(state.get("session_history") or []))
    return {"session_history": exchange}
