.PHONY: dev test lint evals evals-offline evals-traces baseline-update docker-up docker-down tf-plan tf-apply

# Local dev
dev:
	uv run uvicorn main:app --reload --port 8000

# Testing
test:
	uv run pytest tests/ -v

lint:
	uv run ruff check .

# Evals
evals:
	uv run python -m evals.run_evals

evals-offline:
	uv run python -m evals.eval_offline

evals-traces:
	uv run python -m evals.eval_traces

# Update eval baseline from current results
baseline-update:
	uv run python -m evals.run_evals
	cp evals/reports/latest.json evals/baselines/latest.json
	@echo "Baseline updated. Commit evals/baselines/latest.json to lock it in."

# Docker
docker-up:
	docker compose up -d --build

docker-down:
	docker compose down

# Terraform
tf-plan:
	cd terraform && terraform plan

tf-apply:
	cd terraform && terraform apply
