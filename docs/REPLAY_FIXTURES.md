# Runtime acceptance replay fixtures

The replay test is intentionally small: it exercises the public consumer surface across a sequence of trusted observations.

The baseline sequence is:

1. First accepted observation → `changed` because no prior fingerprint exists.
2. Equivalent accepted observation → `unchanged`.
3. New revision / traffic observation → `changed` with a semantic diff.

A separate readiness scenario verifies that a trusted readiness change is surfaced as a semantic change.

This gives consumers a deterministic place to add scenarios without coupling tests to provider command output or deployment orchestration.

Possible future fixtures:

- traffic split changes with the same ready revision;
- readiness recovery after degradation;
- service URL changes;
- release evidence stage changes;
- rejected observations between two accepted observations.
