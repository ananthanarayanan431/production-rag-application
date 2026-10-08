import logging

import structlog


def configure_logging():
    structlog.configure(
        processors=[
            structlog.contextvars.merge_contextvars,
            structlog.processors.add_log_level,
            structlog.processors.TimeStamper(fmt="iso"),
            structlog.processors.StackInfoRenderer(),
            structlog.processors.JSONRenderer(),
        ],
        wrapper_class=structlog.make_filtering_bound_logger(logging.INFO),
        context_class=dict,
        logger_factory=structlog.PrintLoggerFactory(),
        cache_logger_on_first_use=True,
    )


def get_logger(request_id: str | None = None, **kwargs):
    """Per-request logger when request_id is given; otherwise a plain (lazy) logger for scripts and startup."""
    if request_id is None:
        return structlog.get_logger().bind(**kwargs) if kwargs else structlog.get_logger()
    return structlog.get_logger().bind(request_id=request_id, **kwargs)
