.PHONY: setup test test-js test-python surface-check lock-check typecheck lint format-check audit check verify-fresh

setup:
	npm ci --ignore-scripts
	python -m pip install --disable-pip-version-check -r requirements.lock.txt

test: test-js test-python

test-js:
	npm run test:coverage

test-python:
	python -m coverage run -m pytest
	python -m coverage report --include="Software Engineering & AI Tooling/Backend Engineering/Python/Aster Python v002.py" --fail-under=85

surface-check:
	npm run verify:surface

lock-check:
	python scripts/verify_python_lock.py

typecheck:
	npm run typecheck

lint:
	npm run lint
	python -m ruff check .

format-check:
	npm run format:check

audit:
	npm audit --audit-level=moderate
	python -m pip check
	pip-audit -r requirements.lock.txt

check: surface-check lock-check typecheck lint format-check test audit

verify-fresh: setup check
