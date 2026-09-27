from langchain_openai import ChatOpenAI
from openai import AsyncOpenAI

from config.setting import get_settings

settings = get_settings()


def openrouter_chat(model: str, **kwargs) -> ChatOpenAI:
    """LangChain chat model served through OpenRouter's OpenAI-compatible API."""
    return ChatOpenAI(
        model=model,
        base_url=settings.OPENROUTER_BASE_URL,
        api_key=settings.OPENROUTER_API_KEY,
        **kwargs,
    )


def openrouter_client() -> AsyncOpenAI:
    """Raw OpenAI SDK client pointed at OpenRouter, for libraries like Ragas."""
    return AsyncOpenAI(
        base_url=settings.OPENROUTER_BASE_URL,
        api_key=settings.OPENROUTER_API_KEY.get_secret_value(),
    )
