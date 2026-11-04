# ÆtherForge local HTTP request boundaries

The Companion (`apps/aetherforge-workbench/server.mjs`) and Commercial
(`apps/aetherforge-commercial/server.mjs`) adapters serve the existing local
application. They accept loopback hosts or the exact configured private
Codespaces forward, enforce the matching browser origin, and reject cross-site
requests. These are private adapters, not public multi-tenant services. The
separately exported token-authentication and CORS middleware keep their existing
contracts; neither widens these application adapters' origin policy.

## Bounded body reception

Both adapters share `apps/aetherforge-workbench/http-request-body.mjs`.
The default total body reception deadline is **15 seconds**, measured from
admission to the body reader. Incoming bytes do not restart this deadline.
There are at most **8 active body-consuming requests per server**, including
validation, storage writes, or execution after reception, until their response
finishes or the connection closes. Read-only health and diagnostic routes do not
consume these reservations.

| Route                             | Adapter    | Maximum incoming body bytes |
| --------------------------------- | ---------- | --------------------------: |
| `POST /api/run`                   | Both       |                      65,536 |
| `POST /api/assets/upload`         | Both       |                   6,291,456 |
| `PUT /api/workspace/projects/:id` | Commercial |                   1,800,000 |
| `POST /api/execution/run`         | Commercial |                      35,000 |
| `POST /api/execution/project`     | Commercial |                      76,000 |

The limits count raw bytes, including for chunked requests without a declared
length. An oversized `Content-Length` is refused before buffering the body.
Completing reception does not bypass the workflow, project, image-signature, or
execution validators; those may apply narrower domain limits.

| Condition                                                   | HTTP result                                                      |
| ----------------------------------------------------------- | ---------------------------------------------------------------- |
| Body deadline expires                                       | `408`, bounded JSON error                                        |
| Declared or received body exceeds its route limit           | `413`, existing route-specific JSON error                        |
| All body request reservations are occupied                  | `503`, bounded JSON error and `Retry-After: 1`                   |
| Unsupported required content type                           | Existing `415` response                                          |
| Malformed workflow/project/execution JSON or invalid schema | Existing `422` response                                          |
| Client disconnects before finishing its body                | Reading stops; no response is attempted on the closed connection |

The `408`, `413`, and admission `503` responses close their connection after the
response is sent. Partial body buffers, reception timers, and stream listeners
are released. Client aborts and expected body refusals are not reported as
unhandled internal server failures. A rejected partial upload/project is never
passed to its storage operation. Existing security headers and generic unexpected
`500` responses remain in place.

Trusted local callers of `createWorkbenchServer()` may set
`requestBodyTimeoutMs` to an integer from 1 through 300,000, and
`maxConcurrentBodyRequests` to an integer from 1 through 64. Invalid values throw
at server creation. These are programmatic options, not client request headers.
The deadline bounds body reception, not the subsequent duration of filesystem or
Docker operations; the isolated runner retains its own execution limits.

## Browser requests and retry boundaries

The UI calls its own adapter origin. Foreign-origin requests, including their
preflights, are refused with `403`. A same-origin `OPTIONS` request has no route
and retains `404`; these adapters do not advertise cross-origin API access.
The Commercial project and execution endpoints continue to require
`x-aetherforge-local: 1`; execution additionally requires `confirmRun: true`,
approved preloaded images, and an available Docker daemon. No provider or
deployment success is simulated.

Admission `503` refuses the request before an operation runs, so a client may
retry after the advertised delay. An uncertain result after a completed
execution request is not permission to run it again automatically. Asset object
references remain SHA-256 content identifiers, and project `PUT` requests retain
their existing identified replacement behavior. This change adds no external
mutation, idempotency-key store, or automatic execution retry.

## Reproducible acceptance tests

From an installed checkout:

```sh
npm test -- --runTestsByPath tests/js/aetherforge-request-lifecycle.test.js tests/js/aetherforge-http-byte-limit.test.js tests/js/aetherforge-http-error-tracking.test.js
npm run test:coverage
node --test tests/*.test.mjs
```

The lifecycle matrix starts actual servers on ephemeral loopback ports, uses
real HTTP streams for slow/chunked/aborted requests, checks admission recovery,
and removes temporary storage after each case. It does not contact a provider,
download container images, or execute submitted code on the host.
