from pathlib import Path
from typing import Literal

from pydantic import BaseModel

from agent.state import SupportBotState
from config.llm import openrouter_chat
from config.setting import get_settings
from observability.logging import get_logger
from resilience.retry import llm_retry

PROMPT_VERSION = "v1"
_PROMPT_TEMPLATE = Path(f"prompts/{PROMPT_VERSION}/query_intelligence.txt").read_text()


class QueryAnalysis(BaseModel):
    intent: str
    sub_queries: list[str]
    complexity: Literal["low", "high"]
    needs_decomp: bool


settings = get_settings()

# function_calling is the structured-output mode supported by the most OpenRouter providers.
_llm = openrouter_chat(settings.LOW_COMPLEXITY_MODEL).with_structured_output(
    QueryAnalysis, method="function_calling"
)


@llm_retry
async def _analyse(prompt: str) -> QueryAnalysis:
    return await _llm.ainvoke(prompt)


async def query_intelligence_node(state: SupportBotState) -> dict:
    log = get_logger(state["request_id"], node="query_intelligence")

    history_text = "\n".join(
        f"{turn['role'].upper()}: {turn['content']}"
        for turn in (state.get("session_history") or [])[-6:]  # last 3 exchanges
    ) or "None"

    prompt = _PROMPT_TEMPLATE.format(
        query=state["scrubbed_query"],
        session_history=history_text,
    )

    feedback = state.get("validation_feedback")
    if feedback:
        prompt += (
            "\n\nThis is a retry: the answer generated from your previous analysis failed validation.\n"
            f"{feedback}\nRe-analyse the query accordingly."
        )

    result: QueryAnalysis = await _analyse(prompt)

    # Escalated requests always go to the high-complexity model.
    if state.get("retry_count", 0) > 0:
        result.complexity = "high"

    log.info(
        "query_intelligence_complete",
        intent=result.intent,
        num_sub_queries=len(result.sub_queries),
        complexity=result.complexity,
        needs_decomp=result.needs_decomp,
        prompt_version=PROMPT_VERSION,
        retry_count=state.get("retry_count", 0),
    )

    return {
        "intent": result.intent,
        "sub_queries": result.sub_queries,
        "complexity": result.complexity,
        "needs_decomp": result.needs_decomp,
        "prompt_version": PROMPT_VERSION,
        # Consume the feedback, and clear answers from the failed attempt (empty list resets the reducer).
        "validation_feedback": "",
        "sub_responses": [],
    }
