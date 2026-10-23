# Environment configuration contract

The root [`.env.example`](../.env.example) is a **non-secret reference**, not an executable configuration or credential store. The maintained package/quality checks work without copying it to `.env`. Use an actual private local environment only when a specific service requires it.

## Maintained package

- `APP_API_TOKEN`, `ASTER_API_TOKEN`, `GEMINI_API_KEY`: placeholders only; never check in real credentials.
- `ALLOWED_ORIGINS`, `BUCKET_NAME`, `GOOGLE_CLOUD_PROJECT`, `GOOGLE_CLOUD_REGION`, `PORT`: provider/configuration examples, not live deployment credentials.
- The `ASTER_*` fields document optional maintained prompt defaults. `GITHUB_SHA` and `RELEASE_TAG` are CI/release metadata.

## ÆTHERFORGE cloud application

- `AETHERFORGE_PORT`: HTTP listen port, defaults to **4546** for the commercial IDE and **4545** for the original companion when unset.
- `AETHERFORGE_DATA_DIR` and `AETHERFORGE_WORKSPACE_DIR`: optional storage roots; the trusted Codespaces launcher supplies `/workspaces/.aetherforge-data/assets` and `/workspaces/.aetherforge-data/workspaces`. Do not store projects or credentials in Git.
- `CODESPACES` and `CODESPACE_NAME`: provided by GitHub Codespaces. Do not set `CODESPACES=true` outside a real authenticated private Codespace.
- `AETHERFORGE_CODESPACES_BIND`: defaults to 0. Enabling it with genuine `CODESPACES=true` permits the app to bind beyond loopback for Codespaces forwarding. Keep ports **Private**; the app itself is not a public SaaS authorization layer.

## Browser QA (optional)

- `AETHERFORGE_URL`, `AETHERFORGE_SCREENSHOT_DIR`, `CHROME_PATH`, `PLAYWRIGHT_MODULE_PATH`, `AETHERFORGE_BROWSER_BIN`, `AETHERFORGE_ACCEPTANCE_REPORT` and `AETHERFORGE_USER_DATA_DIR` are local/browser acceptance or desktop packaging inputs, not required for the application to start. Browsers and Playwright must be installed separately for those checks.
- `LOCALAPPDATA` and `PROGRAMFILES` are Windows-provided environment paths referenced by optional desktop integration. They are documented for discoverability only; do not override their operating-system values.

## Coverage

The Jest test `tests/js/env-example-completeness.test.js` walks maintained `src/` code, tooling scripts, runtime modules for both ÆTHERFORGE applications and the browser-acceptance script. It compares their statically declared `process.env.NAME` or `process.env['NAME']` keys with `.env.example`; missing or duplicate entries fail CI. Dynamic environment-variable names are outside this static check; review them when introduced.

Run locally:

```bash
npm test -- --runTestsByPath tests/js/env-example-completeness.test.js
```

The declaration file is informational; it never publishes your local settings or copies secrets into build artifacts.
