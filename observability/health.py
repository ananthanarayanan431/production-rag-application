import asyncio

from pageindex import PageIndexClient

from config.setting import get_settings

_TIMEOUT_SECONDS = 5.0


async def check_pageindex() -> None:
    """Cheap authenticated call: raises if the PageIndex API is unreachable or rejects the key."""
    client = PageIndexClient(api_key=get_settings().PAGEINDEX_API_KEY.get_secret_value())
    # The SDK is synchronous (requests), so keep it off the event loop.
    await asyncio.wait_for(asyncio.to_thread(client.list_documents, limit=1), timeout=_TIMEOUT_SECONDS)
