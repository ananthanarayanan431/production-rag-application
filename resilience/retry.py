import logging

import httpx
import openai
import structlog
from tenacity import before_sleep_log, retry, retry_if_exception_type, stop_after_attempt, wait_exponential

logger = structlog.get_logger()
logger = logger.bind(service="resilience")

http_retry = retry(
    stop=stop_after_attempt(3),
    wait=wait_exponential(multiplier=1, min=4, max=15),
    retry=retry_if_exception_type((httpx.TimeoutException, httpx.HTTPStatusError)),
    reraise=True,
    before_sleep=before_sleep_log(logger, logging.WARNING),
)

# The OpenAI SDK wraps httpx errors in its own types, so those are what LLM calls raise.
# APIConnectionError covers APITimeoutError; 4xx other than 429 are not worth retrying.
llm_retry = retry(
    stop=stop_after_attempt(3),
    wait=wait_exponential(multiplier=1, min=4, max=25),
    retry=retry_if_exception_type((
        openai.APIConnectionError,
        openai.RateLimitError,
        openai.InternalServerError,
        httpx.TimeoutException,
    )),
    reraise=True,
    before_sleep=before_sleep_log(logger, logging.WARNING),
)
