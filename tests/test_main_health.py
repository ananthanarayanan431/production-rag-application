from unittest.mock import patch

import pytest

from observability.health import check_pageindex


@pytest.mark.asyncio
async def test_check_pageindex_ok():
    with patch("observability.health.PageIndexClient.list_documents", return_value={"documents": []}) as m:
        await check_pageindex()
    m.assert_called_once_with(limit=1)


@pytest.mark.asyncio
async def test_check_pageindex_raises_on_error():
    with patch("observability.health.PageIndexClient.list_documents", side_effect=RuntimeError("boom")):
        with pytest.raises(RuntimeError):
            await check_pageindex()
