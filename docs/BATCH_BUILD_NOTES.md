# Batch build notes

The consumer work is being advanced in small, reviewable batches.

## Batch A — evidence handoff
- decision remains the runtime boundary;
- semantic changes are derived from trusted receipt fields;
- explanation is descriptive only.

## Batch B — consumer contract
- structured observations combine decision + change metadata + deterministic summary;
- replay scenarios exercise first-seen, stable, rollout, and readiness-regression states;
- consumer policy remains outside the runtime.

## Batch C — next candidate
Before expanding the API further, validate the public surface with a compact replay matrix and CI. If the matrix exposes a missing contract, fix that specific seam; otherwise prefer documentation and examples over another abstraction.

This batching keeps each increment easy to review, revert, or combine with parallel team work.
