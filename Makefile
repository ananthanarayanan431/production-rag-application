.DEFAULT_GOAL := help
SHELL := /bin/bash

COMPOSE     := docker compose
INFRA       := postgres mongodb gptcache rival-service
SPACY_MODEL := https://github.com/explosion/spacy-models/releases/download/en_core_web_lg-3.8.0/en_core_web_lg-3.8.0-py3-none-any.whl
API_PORT    ?= 8000
WEB_PORT    ?= 5173

.PHONY: help install install-api install-web env \
        postgres mongodb gptcache rival infra \
        api web dev token index-docs \
        up down stop logs ps docker-up docker-down \
        test test-api test-web lint lint-api lint-web build-web \
        evals evals-offline evals-traces baseline-update

help: ## Show this help
	@awk 'BEGIN {FS = ":.*## "} /^##@/ {printf "\n\033[1m%s\033[0m\n", substr($$0, 5)} /^[a-zA-Z_-]+:.*## / {printf "  \033[36m%-16s\033[0m %s\n", $$1, $$2}' $(MAKEFILE_LIST)

##@ Setup

install: install-api install-web ## Install API and web dependencies

install-api: ## Install Python deps and the spaCy model Presidio needs
	uv sync
	uv pip install $(SPACY_MODEL)

install-web: ## Install web UI dependencies
	cd web && npm ci

env: ## Create .env and web/.env from the examples (never overwrites)
	@test -f .env || { cp .env.example .env && echo "Created .env; fill in the secrets."; }
	@test -f web/.env || { cp web/.env.example web/.env && echo "Created web/.env"; }

##@ Services (each one on its own)

postgres: ## Start PostgreSQL (session memory) on :5432
	$(COMPOSE) up -d --wait postgres

mongodb: ## Start MongoDB (document trees) on :27017
	$(COMPOSE) up -d --wait mongodb

gptcache: ## Start the GPTCache semantic cache on :8001
	$(COMPOSE) up -d --wait gptcache

rival: ## Start the Rival attack-detection service on :8002 (waits for the model to load)
	$(COMPOSE) up -d --build --wait rival-service

infra: ## Start every backing service the API needs
	$(COMPOSE) up -d --build --wait $(INFRA)

api: ## Run the FastAPI app locally with reload on :8000
	uv run uvicorn main:app --reload --port $(API_PORT)

web: ## Run the web UI dev server on :5173 (proxies /api to the API)
	cd web && npm run dev -- --port $(WEB_PORT)

dev: infra ## Start backing services, then the API and web UI together (Ctrl-C stops both)
	@echo "API → http://localhost:$(API_PORT)   Web → http://localhost:$(WEB_PORT)"
	@$(MAKE) --no-print-directory -j2 api web

token: ## Print a JWT for the web UI (SUB=user-id TTL=seconds)
	@uv run python -m scripts.make_token $(if $(SUB),--sub $(SUB)) $(if $(TTL),--ttl $(TTL))

index-docs: ## Index a support PDF into MongoDB (PDF=path/to/file.pdf)
	@test -n "$(PDF)" || { echo "Usage: make index-docs PDF=path/to/file.pdf"; exit 1; }
	uv run python -m prep.index_docs --pdf $(PDF)

##@ Full stack in Docker

up: ## Build and start everything, web UI included (http://localhost:3000)
	$(COMPOSE) up -d --build

down: ## Stop and remove all containers (volumes are kept)
	$(COMPOSE) down

stop: ## Stop containers without removing them
	$(COMPOSE) stop

logs: ## Follow logs (S=service to pick one)
	$(COMPOSE) logs -f $(S)

ps: ## Show container status
	$(COMPOSE) ps

docker-up: up
docker-down: down

##@ Quality

test: test-api test-web ## Run all tests

test-api: ## Run API unit tests
	uv run pytest tests/ -v

test-web: ## Run web UI tests
	cd web && npm test

lint: lint-api lint-web ## Lint API and web UI

lint-api:
	uv run ruff check .

lint-web:
	cd web && npm run lint && npm run typecheck

build-web: ## Production build of the web UI into web/dist
	cd web && npm run build

##@ Evals

evals: ## Run live evals against a running API
	uv run python -m evals.run_evals

evals-offline: ## Run offline evals (no API needed)
	uv run python -m evals.eval_offline

evals-traces: ## Run LangSmith trace evals
	uv run python -m evals.eval_traces

baseline-update: ## Refresh the eval baseline from the current results
	uv run python -m evals.run_evals
	cp evals/reports/latest.json evals/baselines/latest.json
	@echo "Baseline updated. Commit evals/baselines/latest.json to lock it in."
