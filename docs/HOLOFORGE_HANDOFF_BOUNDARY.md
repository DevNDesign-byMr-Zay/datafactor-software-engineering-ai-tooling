# HoloForge handoff boundary

The maintained library should expose validated handoff state as evidence, not as an implicit command channel. The current holographic work makes acceptance, provenance, fingerprint integrity, and safety explicit before downstream presentation consumes a scene.

## Handoff contract

A validated handoff should preserve:

- acceptance state;
- provenance validity;
- fingerprint validity;
- safety validity;
- advisory-only semantics;
- explicit non-authoritative and non-actuating flags.

These fields describe the trust state of the artifact. They do not grant the consumer permission to mutate the source system.

## Immutability

Once a handoff fingerprint is issued, the represented scene and acceptance state must not be mutable through caller-owned nested references. Verification should fail closed when the captured state no longer matches its trusted identity.

## Downstream responsibility

A holographic or Canva consumer can render and explain a validated handoff, but it should not infer missing provenance, repair an invalid fingerprint, or promote an advisory candidate into an authoritative action. Explicit authorization belongs at the action boundary.

This keeps the maintained package useful to multiple presentation clients while preserving one auditable evidence path across the broader ÆTHERGRID collaboration.
