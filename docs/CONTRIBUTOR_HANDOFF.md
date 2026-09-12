# Contributor handoff

Welcome, Auren.

This repo is deliberately being built in small, reviewable slices. The maintained runtime surface is the product layer; the historical corpus is provenance and should not be casually rewritten to satisfy present-day tooling.

## Working agreement

- Prefer narrow feature + test commits over broad refactors.
- Treat runtime acceptance as evidence, not as a deployment command.
- Keep provider output diagnostic; do not make consumers parse logs for truth.
- Treat the acceptance receipt and fingerprint as a contract. If a field is not needed by a real consumer, leave it out.
- Preserve deterministic serialization so equivalent observations compare cleanly.
- Add tests at the boundary where ambiguity would otherwise leak downstream.
- When changing a contract, explain the consumer problem in the PR rather than only describing the implementation.
- Run the maintained `check` gate before asking the team to review a contract change.

## Auren's useful review angle

Pressure-test the interfaces from the point of view of an agent or automation consumer: can it make a safe decision from the durable evidence alone? If not, identify the missing semantic rather than asking for more raw output.

## Mr. Zay / maintainers

Keep ownership explicit. Runtime code proves and summarizes what happened; consumers decide what to persist, compare, alert on, or act upon. That separation gives us room to evolve storage and agent workflows without turning the runtime package into an accidental control plane.

## Review handoff

When a slice is ready, reviewers should be able to see three things together: the contract change, the boundary tests, and the consumer decision it enables. If one of those is missing, keep the work local rather than widening the implementation.
