# Contract change rules

A runtime receipt field earns a place in the stable contract only when a real consumer decision depends on it.

## Proposal format

When proposing a new semantic, document:

1. the consumer decision that cannot currently be made safely;
2. why existing receipt data is insufficient;
3. the smallest semantic addition that closes the gap;
4. how deterministic serialization and fingerprinting should treat it;
5. the failure behavior when the new evidence is absent or malformed.

## Review standard

A request for more raw output is not, by itself, a contract requirement. Diagnostics can remain available to operators while the receipt stays intentionally small.

This keeps the runtime surface stable enough for agents and tooling while allowing consumer implementations to evolve independently.
