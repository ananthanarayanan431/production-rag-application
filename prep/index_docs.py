"""
Offline preparation script.

Run once (or whenever your Apple support docs change) to:
1. Submit PDFs to PageIndex and get document tree structures
2. Store the trees in MongoDB for use by the context_retrieval node

Usage:
    python -m prep.index_docs --pdf path/to/apple-support.pdf

Set PAGEINDEX_API_KEY and MONGODB_URI in your environment or .env file.
"""
import argparse
import asyncio
import sys
import time
from pathlib import Path

import motor.motor_asyncio
import pageindex.utils as utils
from pageindex import PageIndexClient
from pydantic import SecretStr
from pydantic_settings import BaseSettings, SettingsConfigDict

# Must match the doc_id that agent/nodes/context_retrieval.py looks up.
DEFAULT_DOC_ID = "apple-support"
POLL_INTERVAL_SECONDS = 10


class PrepSettings(BaseSettings):
    """Only what this script needs, so it runs without the API's JWT/service settings."""

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore", case_sensitive=True)

    PAGEINDEX_API_KEY: SecretStr
    MONGODB_URI: SecretStr


def _count_nodes_with_text(tree: list) -> int:
    count = 0
    for node in tree:
        if node.get("text"):
            count += 1
        count += _count_nodes_with_text(node.get("nodes", []))
    return count


def submit_and_wait(pi_client: PageIndexClient, pdf_path: Path, timeout_seconds: int) -> list:
    pi_doc_id = pi_client.submit_document(str(pdf_path))["doc_id"]
    print(f"Submitted to PageIndex: {pi_doc_id}")

    deadline = time.monotonic() + timeout_seconds
    while time.monotonic() < deadline:
        # get_document raises on API errors (bad key, unknown doc) instead of
        # swallowing them like is_retrieval_ready does, and exposes a "failed" status.
        status = pi_client.get_document(pi_doc_id).get("status")
        if status == "failed":
            raise RuntimeError(f"PageIndex failed to process document {pi_doc_id}")

        result = pi_client.get_tree(pi_doc_id, node_summary=True)
        if result.get("retrieval_ready"):
            tree = result["result"]
            print(f"Tree ready: {len(tree)} top-level nodes")
            return tree

        print(f"  Waiting for PageIndex to process... (status={status})")
        time.sleep(POLL_INTERVAL_SECONDS)

    raise TimeoutError(f"PageIndex did not finish processing {pi_doc_id} within {timeout_seconds}s")


async def store_tree(mongodb_uri: str, doc_id: str, tree: list) -> None:
    client = motor.motor_asyncio.AsyncIOMotorClient(mongodb_uri)
    try:
        await client.support_bot.document_trees.replace_one(
            {"doc_id": doc_id},
            {"doc_id": doc_id, "tree": tree},
            upsert=True,
        )
    finally:
        client.close()
    print(f"Stored tree for '{doc_id}' in MongoDB.")


def main() -> None:
    parser = argparse.ArgumentParser(description="Index a PDF with PageIndex and store its tree in MongoDB.")
    parser.add_argument("--pdf", required=True, type=Path, help="Path to the PDF to index")
    parser.add_argument("--doc-id", default=DEFAULT_DOC_ID, help=f"Identifier for this document (default: {DEFAULT_DOC_ID})")
    parser.add_argument("--timeout", type=int, default=600, help="Seconds to wait for PageIndex processing (default: 600)")
    args = parser.parse_args()

    if not args.pdf.is_file():
        sys.exit(f"PDF not found: {args.pdf}")

    settings = PrepSettings()

    print(f"Indexing '{args.pdf}' as doc_id='{args.doc_id}'")
    pi_client = PageIndexClient(api_key=settings.PAGEINDEX_API_KEY.get_secret_value())
    tree = submit_and_wait(pi_client, args.pdf, args.timeout)

    # context_retrieval returns node["text"] as context; a tree without it would
    # make every query retrieve nothing, so refuse to store it.
    if _count_nodes_with_text(tree) == 0:
        sys.exit("PageIndex tree has no node text; refusing to store a tree that retrieval can't use.")

    print("\nTree structure:")
    utils.print_tree(tree)

    asyncio.run(store_tree(settings.MONGODB_URI.get_secret_value(), args.doc_id, tree))
    print("\nDone. Document is ready for retrieval.")


if __name__ == "__main__":
    main()
