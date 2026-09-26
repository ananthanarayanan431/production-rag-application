import httpx
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
    logger=logger,
)

llm_retry = retry(
    stop=stop_after_attempt(3),
    wait=wait_exponential(multiplier=1, min=4, max=25),
    retry=retry_if_exception_type((httpx.TimeoutException, httpx.HTTPStatusError)),
    reraise=True,
    logger=logger,
)