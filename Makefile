.PHONY: setup test lint format-check audit check

setup:
	npm ci --ignore-scripts
	python -m pip install --disable-pip-version-check -r requirements.lock.txt

test:
	npm test
	python -m pytest

lint:
	npm run lint
	python -m ruff check .

format-check:
	npm run format:check

audit:
	npm audit --audit-level=high
	pip-audit -r requirements.lock.txt

check: lint format-check test audit
