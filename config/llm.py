from functools import lru_cache

from langchain_openai import ChatOpenAI
from openai import AsyncOpenAI

from config.setting import get_settings

settings = get_settings()


# Clients are cached so every call reuses one connection pool instead of opening a new one.
# SDK-level retries are off: resilience.retry.llm_retry owns retries, so attempts don't multiply.

@lru_cache
def openrouter_chat(model: str, temperature: float | None = None) -> ChatOpenAI:
    """LangChain chat model served through OpenRouter's OpenAI-compatible API."""
    return ChatOpenAI(
        model=model,
        temperature=temperature,
        base_url=settings.OPENROUTER_BASE_URL,
        api_key=settings.OPENROUTER_API_KEY,
        timeout=settings.LLM_TIMEOUT_SECONDS,
        max_retries=0,
    )


@lru_cache
def openrouter_client() -> AsyncOpenAI:
    """Async OpenAI SDK client pointed at OpenRouter, for libraries like Ragas."""
    return AsyncOpenAI(
        base_url=settings.OPENROUTER_BASE_URL,
        api_key=settings.OPENROUTER_API_KEY.get_secret_value(),
        timeout=settings.LLM_TIMEOUT_SECONDS,
        max_retries=0,
    )


async def close_llm_clients() -> None:
    """Release the shared OpenRouter connection pool on shutdown."""
    if openrouter_client.cache_info().currsize:
        await openrouter_client().close()
        openrouter_client.cache_clear()
