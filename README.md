# Support Bot

A production-ready AI support bot for Apple devices and services.

Built with FastAPI + LangGraph + PageIndex + Ragas + Rival AI.

---

## Architecture

```
POST /query
  │
  ├─ Middleware: JWT auth · rate limiting (slowapi) · input guard
  │
  ├─ Semantic cache check (GPTCache server)
  │     └─ HIT → return immediately
  │
  └─ LangGraph graph (LangSmith traces everything)
       ├─ safety_gate       Presidio PII scrub + Rival attack detection (parallel)
       ├─ query_intelligence  1 structured LLM call → intent, sub_queries, complexity
       ├─ context_retrieval PageIndex tree search + MongoDB
       ├─ execution         Low / high complexity model via OpenRouter / parallel sub-queries (Send API)
       ├─ output_validation Ragas faithfulness + custom completeness metric
       ├─ session_save      Append the exchange to per-session history (PostgresSaver checkpointer)
       └─ cache_store       GPTCache write + structlog summary
```

## Stack

| Layer | Tool |
|---|---|
| API framework | FastAPI |
| Graph orchestration | LangGraph |
| Auth | python-jose |
| Rate limiting | slowapi |
| PII scrubbing | presidio-analyzer + presidio-anonymizer |
| Attack detection | rival-ai (Bhairava-0.4B, separate microservice) |
| Semantic caching | GPTCache (server mode) |
| RAG retrieval | PageIndex + MongoDB (motor) |
| Session memory | LangGraph PostgresSaver + asyncpg |
| LLM provider | OpenRouter (OpenAI-compatible API via langchain-openai) |
| LLM (low complexity) | `google/gemini-2.0-flash-001` (configurable) |
| LLM (high complexity) | `google/gemini-2.5-pro` (configurable) |
| Hallucination detection | Ragas Faithfulness |
| Completeness check | Custom LLM-as-judge metric |
| Observability (LLM) | LangSmith |
| Observability (app) | structlog |
| Retries | tenacity |
| Circuit breaking | pybreaker |
| HTTP client | httpx |

## Quickstart

Requires [uv](https://docs.astral.sh/uv/), Node 24+ and Docker. Run `make` to list every target.

**1. Install and configure**

```bash
make install     # Python deps + spaCy model, and web UI deps
make env         # creates .env and web/.env from the examples
# Fill in OPENROUTER_API_KEY, PAGEINDEX_API_KEY and JWT_SECRET / JWT_REFRESH_TOKEN_SECRET (32+ chars each) in .env
```

**2. Index your support documents** (once, needs MongoDB running)

```bash
make mongodb
make index-docs PDF=path/to/apple-support-guide.pdf
```

**3. Start everything for development**

```bash
make dev
```

This starts the backing services in Docker, then runs the API and the web UI with hot reload:

| Service | Make target | Port |
|---|---|---|
| Web UI (Vite, proxies `/api` to the API) | `make web` | 5173 |
| FastAPI app | `make api` | 8000 |
| GPTCache semantic cache | `make gptcache` | 8001 |
| Rival attack detection | `make rival` | 8002 |
| MongoDB (document trees) | `make mongodb` | 27017 |
| PostgreSQL (session memory) | `make postgres` | 5432 |

Each service can be started on its own with its target; `make infra` starts only the backing services.

**4. Open the UI**

```bash
make token       # prints a JWT signed with JWT_SECRET (SUB=user-id TTL=seconds to customise)
```

Open http://localhost:5173 and paste the token when asked.

To run the whole stack in containers instead, including the production web build behind nginx, use `make up` (UI at http://localhost:3000) and `make down`.

**Calling the API directly**

```bash
curl -X POST http://localhost:8000/query \
  -H "Authorization: Bearer $(make -s token)" \
  -H "Content-Type: application/json" \
  -d '{"query": "How do I factory reset my MacBook Pro?", "session_id": "session-abc"}'
```

## Web UI

A React 19 + TypeScript + Tailwind CSS v4 app in [`web/`](web/):

- Chat with multi-turn context: each chat keeps the API's `session_id`, so follow-ups use the conversation history.
- Every answer shows whether it passed validation, its grounding (Ragas faithfulness) and completeness scores, the model used or a cache hit, latency, and a copyable request id for tracing.
- Chats are kept in the browser: rename, delete, clear. Requests can be stopped, and failed ones retried.
- Live API health indicator, JWT dialog that checks expiry, light and dark themes, mobile layout.

In development Vite proxies `/api/*` to the API; in the container nginx does the same, so the API needs no CORS setup. Settings are in [`web/.env.example`](web/.env.example). Run `make test-web` and `make lint-web` for the UI's tests and checks.

## Project structure

```
production-rag/
├── main.py                        # FastAPI app, /query endpoint
├── web/                           # React + Tailwind UI (Vite; nginx in Docker)
│   ├── src/components/            # Chat, sidebar, composer, token dialog
│   ├── src/hooks/                 # Conversations store, health, theme, token
│   └── src/lib/                   # API client, JWT decoding, storage
├── scripts/
│   └── make_token.py              # Mint a local JWT (make token)
├── config/
│   └── setting.py                 # Settings via pydantic-settings (get_settings())
├── agent/
│   ├── state.py                   # SupportBotState TypedDict
│   ├── graph.py                   # StateGraph definition + compile
│   └── nodes/
│       ├── safety_gate.py         # Presidio + Rival (parallel graph nodes)
│       ├── query_intelligence.py  # Structured LLM call
│       ├── session_memory.py      # Records each exchange in session history
│       ├── context_retrieval.py   # PageIndex + MongoDB
│       ├── execution.py           # Model selection + Send fan-out
│       ├── output_validation.py   # Ragas + completeness
│       └── cache_store.py         # GPTCache write + final log
├── services/
│   └── rival_service/
│       ├── main.py                # Standalone FastAPI microservice
│       ├── requirements.txt
│       └── Dockerfile
├── metrics/
│   └── completeness.py            # LLM-as-judge completeness metric
├── prompts/
│   └── v1/
│       ├── query_intelligence.txt
│       ├── generation.txt
│       └── completeness_judge.txt
├── prep/
│   └── index_docs.py              # Offline: PageIndex → MongoDB
├── resilience/
│   ├── breaker.py                 # pybreaker circuit breakers
│   └── retry.py                   # tenacity retry decorators
├── middleware/
│   ├── auth.py                    # JWT verification
│   ├── rate_limit.py              # slowapi limiter
│   └── input_guard.py             # Length + encoding check
├── observability/
│   └── logging.py                 # structlog setup
├── evals/                         # Offline, live, and trace evals + golden dataset
├── tests/                         # Unit tests (uv run pytest)
├── .github/workflows/             # CI, eval gate, deploy, nightly evals
├── Dockerfile
├── docker-compose.yml
├── Makefile
├── pyproject.toml / uv.lock
└── .env.example
```

## Configuration

All configuration is via environment variables. See `.env.example` for the full list.

Key variables:

| Variable | Default | Description |
|---|---|---|
| `PAGEINDEX_API_KEY` | — (required) | PageIndex API key (offline indexing and `/health/pageindex`) |
| `OPENROUTER_API_KEY` | — (required) | Key for every LLM call |
| `OPENROUTER_BASE_URL` | `https://openrouter.ai/api/v1` | OpenAI-compatible endpoint all models are called through |
| `LLM_TIMEOUT_SECONDS` | `60` | Per-request timeout for every LLM call; transient failures are retried up to 3 times |
| `LOW_COMPLEXITY_MODEL` | `google/gemini-2.0-flash-001` | OpenRouter model slug for simple queries, query analysis, tree search and the completeness judge |
| `HIGH_COMPLEXITY_MODEL` | `google/gemini-2.5-pro` | OpenRouter model slug for complex queries (e.g. `openai/gpt-4o`) |
| `FAITHFULNESS_MODEL` | `openai/gpt-4o-mini` | OpenRouter model slug for the Ragas faithfulness judge |
| `FAITHFULNESS_THRESHOLD` | `0.7` | Ragas score below this triggers escalation, then a warning |
| `COMPLETENESS_THRESHOLD` | `0.7` | Completeness score below this triggers escalation, then a warning |
| `MAX_VALIDATION_RETRIES` | `1` | Failed validation loops back to `query_intelligence` this many times (forced onto the high-complexity model) before the answer is returned unvalidated |
| `MAX_INPUT_CHARS` | `10000` | Queries longer than this are rejected with 400 |
| `MAX_SESSION_TURNS` | `10` | How many conversation turns to keep in context |

## Prompt versioning

Prompts live in `prompts/v{n}/`. The active version is set in `agent/nodes/query_intelligence.py`. The version string is stored in LangGraph state and logged with every request, so you can correlate quality changes with prompt changes in LangSmith.

To make a new prompt version: copy `prompts/v1/` to `prompts/v2/`, edit, and update `PROMPT_VERSION` in the node.

## Circuit breakers and fallbacks

| Dependency | Breaker opens after | Fallback behaviour |
|---|---|---|
| Rival (attack detection) | 5 failures | Allow request through, log warning |
| PageIndex / MongoDB | 5 failures | Empty context, LLM answers from knowledge |
| GPTCache | 5 failures | Skip cache, continue normally |
| LLM provider | — (tenacity retries x3) | 503 to user |

## What's next

- **Eval regression suite** — LangSmith datasets + evaluations to catch regressions when prompts or models change
- **Streaming output** — FastAPI `StreamingResponse` with LangChain async streaming
- **A/B model testing** — route N% of traffic to a new model, compare scores before cutting over
- **Long-term cross-session memory** — user preference store (device model, past issues, communication style)
