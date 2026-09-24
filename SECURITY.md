# Security Policy

## Supported surface

Security maintenance applies to the canonical maintained library under `src/`, maintained tests and scripts, dependency manifests/lockfiles, container verification, package exports, and CI/release automation.

Preserved historical corpus files remain provenance material. They are not silently rewritten or treated as maintained runtime code solely to satisfy security or quality tooling.

## Reporting a vulnerability

Do not open a public issue containing credentials, tokens, private keys, personal identifiers, customer data, or exploit details that could expose a real deployment.

Use GitHub private vulnerability reporting when available. Otherwise, contact the repository owner privately through an existing trusted channel and include:

- the affected maintained module or trust boundary;
- a minimal reproducer;
- expected versus observed behavior;
- whether identity, evidence, provider, persistence, or deployment boundaries are involved; and
- any known safe mitigation.

## Security expectations

Changes to runtime acceptance, holographic evidence, authentication/CORS, provider error handling, deployment evidence, sustainability evidence, or release automation should add or update a focused regression for the relevant failure mode.

The maintained verification path includes reproducible Node/Python installs, dependency audits, type checking, linting, formatting, coverage, maintained/reference-boundary checks, container verification, and CodeQL for JavaScript/TypeScript and Python.

Never lower a security or quality threshold merely to make a change pass. Never move raw provider diagnostics, secrets, environment dumps, or untrusted historical state into durable evidence contracts without an explicit reviewed boundary.
