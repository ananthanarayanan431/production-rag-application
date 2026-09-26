from typing import TypedDict
from typing import Literal
from typing import Annotated

def append_list(existing: list, new: list) -> list:
    """
    Reducer that appends to a list — used for parallel sub_responses.

    An explicit empty list resets it. State is checkpointed per session, so
    main.py passes sub_responses=[] each turn to drop the previous turn's
    answers; nodes always return a non-empty list and keep appending.
    """
    if new == []:
        return []
    return (existing or []) + (new or [])


class SupportBotState(TypedDict):
    raw_query: str
    session_id: str
    request_id: str
    scrubbed_query: str
    pii_found: list[str]
    is_attack: bool
    attack_confidence: float
    intent: str
    sub_queries: list[str]
    complexity: Literal["low", "high"]
    needs_decomp: bool
    prompt_version: str
    current_subquery: str
    session_history: list[dict]
    retrieved_context: list[str]
    sub_responses: Annotated[list[str], append_list]
    raw_response: str
    model_used: str
    faithfulness_score: float
    completeness_score: float
    validation_passed: bool
    final_response: str