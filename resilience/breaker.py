import pybreaker
import structlog

logger = structlog.get_logger()

CIRCUIT_BREAKER_FAIL_MAX = 5
CIRCUIT_BREAKER_RESET_TIMEOUT = 30

def on_open(breaker: pybreaker.CircuitBreaker, *args, **kwargs):
    logger.info("Circuit breaker opened", breaker=breaker)

def on_close(breaker: pybreaker.CircuitBreaker, *args, **kwargs):
    logger.info("Circuit breaker closed", breaker=breaker)

def on_half_open(breaker: pybreaker.CircuitBreaker, *args, **kwargs):
    logger.info("Circuit breaker half-opened", breaker=breaker)

def on_failure(breaker: pybreaker.CircuitBreaker, *args, **kwargs):
    logger.info("Circuit breaker failed", breaker=breaker)

rival_breaker = pybreaker.CircuitBreaker(
    fail_max=CIRCUIT_BREAKER_FAIL_MAX,
    reset_timeout=CIRCUIT_BREAKER_RESET_TIMEOUT,
    name="rival_breaker",
    listeners=[
        pybreaker.CircuitBreakerListener()
    ],
)

pageindex_breaker = pybreaker.CircuitBreaker(
    fail_max=CIRCUIT_BREAKER_FAIL_MAX,
    reset_timeout=CIRCUIT_BREAKER_RESET_TIMEOUT,
    name="pageindex_breaker",
    listeners=[
        pybreaker.CircuitBreakerListener()
    ],
)

gptcache_breaker = pybreaker.CircuitBreaker(
    fail_max=CIRCUIT_BREAKER_FAIL_MAX,
    reset_timeout=CIRCUIT_BREAKER_RESET_TIMEOUT,
    name="gptcache_breaker",
    listeners=[
        pybreaker.CircuitBreakerListener()
    ],
)
