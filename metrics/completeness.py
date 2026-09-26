import re
from pathlib import Path

import structlog
from langchain_google_genai import ChatGoogleGenerativeAI

from resilience.retry import llm_retry

logger = structlog.get_logger().bind(metric="completeness")

_PROMPT = Path("prompts/v1/completeness_judge.txt").read_text()
_SCORE_PATTERN = re.compile(r"\d+(?:\.\d+)?")
_FALLBACK_SCORE = 0.5

_judge = ChatGoogleGenerativeAI(model="gemini-2.0-flash", temperature=0)


@llm_retry
async def score_completeness(
    intent: str,
    sub_queries: list[str],
    response: str,
) -> float:
    """
    LLM-as-judge metric: did the response address all sub-queries?
    Returns a float in [0.0, 1.0].
    """
    sub_queries_text = "\n".join(f"- {q}" for q in sub_queries) if sub_queries else "- (single question)"

    prompt = _PROMPT.format(
        intent=intent,
        sub_queries=sub_queries_text,
        response=response,
    )

    result = await _judge.ainvoke(prompt)

    # .text handles both str content and a list of content blocks; the regex
    # tolerates replies like "Score: 0.8" despite the prompt asking for a bare number.
    match = _SCORE_PATTERN.search(result.text)
    if match is None:
        logger.warning("completeness_parse_failed", raw=result.text[:200], fallback=_FALLBACK_SCORE)
        return _FALLBACK_SCORE

    return max(0.0, min(1.0, float(match.group())))
