.PHONY: setup test test-js test-python lint lint-legacy format-check audit check

setup:
	npm ci --ignore-scripts
	python -m pip install --disable-pip-version-check -r requirements.lock.txt

test: test-js test-python

test-js:
	npm run test:coverage

test-python:
	python -m coverage run -m pytest
	python -m coverage report --include="Software Engineering & AI Tooling/Backend Engineering/Python/Aster Python v002.py" --fail-under=85

lint:
	npm run lint
	python -m ruff check .

lint-legacy:
	npm run lint:legacy

format-check:
	npm run format:check

audit:
	npm audit --audit-level=moderate
	python -m pip check
	pip-audit -r requirements.lock.txt

check: lint format-check test audit
