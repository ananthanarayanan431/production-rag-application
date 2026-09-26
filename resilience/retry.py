import logging

import httpx
from tenacity import before_sleep_log
from tenacity import retry
from tenacity import stop_after_attempt
from tenacity import wait_exponential
from tenacity import retry_if_exception_type
import structlog

logger = structlog.get_logger()
logger = logger.bind(service="resilience")

http_retry = retry(
    stop=stop_after_attempt(3),
    wait=wait_exponential(multiplier=1, min=4, max=15),
    retry=retry_if_exception_type((httpx.TimeoutException, httpx.HTTPStatusError)),
    reraise=True,
    before_sleep=before_sleep_log(logger, logging.WARNING),
)

llm_retry = retry(
    stop=stop_after_attempt(3),
    wait=wait_exponential(multiplier=1, min=4, max=25),
    retry=retry_if_exception_type((httpx.TimeoutException, httpx.HTTPStatusError)),
    reraise=True,
    before_sleep=before_sleep_log(logger, logging.WARNING),
)