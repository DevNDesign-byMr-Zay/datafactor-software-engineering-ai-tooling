# Isolated runner lifecycle

Approved JavaScript and Python execution continues to require a Docker daemon,
preloaded Distroless images, and explicit execution confirmation. The existing
network-disabled, read-only, unprivileged, memory/CPU/PID-limited policy is
unchanged. No host interpreter fallback exists.

Each execution receives an internal UUID-based container name. A reception or
output deadline can terminate the Docker CLI, but the daemon owns the container.
After every execution result the runner therefore removes only that named
container with `docker rm --force`. If automatic `--rm` already removed it, a
successful empty `docker ps` query confirms its absence. Failed or timed-out
daemon communication does not count as confirmed cleanup.

The returned `sandboxId` identifies this one container. `cleanup.confirmed` and
`requiresOperatorAction` report its cleanup result. Unconfirmed cleanup makes
the result `status: failed`; it never produces a completed-success result or
an automatic execution retry. The existing `terminated` field records that a
CLI timeout/output limit was reached. When cleanup is unconfirmed, inspect the
Docker daemon and the named sandbox before submitting more code.

The runner retains at most 24,000 combined stdout/stderr characters. Normal
Node/Python execution limits remain 6.5 seconds for a snippet and 7.5 seconds
for a project. Each cleanup command has a separate 2.5-second bound; proving
that an already removed container is absent can require a second query.

```sh
node --test tests/aetherforge-runner-cleanup.test.mjs tests/aetherforge-commercial-cloud.test.mjs
# With Docker and both approved images already available:
node tests/aetherforge-runner-cleanup-live.mjs
```

Commercial Cloud CI runs the live acceptance probe after preloading its images.
It exercises Node and Python deadlines, noisy output, daemon-side absence and a
subsequent healthy run. The probe makes no image downloads itself and cannot
authorize a deployment or provider operation.
