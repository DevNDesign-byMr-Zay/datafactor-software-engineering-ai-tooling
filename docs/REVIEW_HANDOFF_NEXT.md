# Review handoff — next pass

The next implementation pass should stay grounded in a real consumer decision.

Start with one accepted observation and one changed observation. Verify that an agent can decide whether to act using only the receipt and fingerprint. Then repeat with malformed or incomplete evidence and verify that the result is an explicit stop/unknown state.

If a scenario exposes a genuine semantic gap, propose that gap before adding a field. If it does not, keep the contract as-is and strengthen the tests.
