# Agent consumer checklist — executable target

The next test should exercise one complete decision path:

1. build an accepted receipt;
2. calculate its fingerprint;
3. compare it with a previously accepted fingerprint;
4. return `unchanged` when the semantic evidence is equivalent;
5. return `changed` when a trusted runtime fact changes;
6. return `unknown` or stop when required evidence is malformed or rejected.

The test should never need provider stdout, stderr, command arguments, or log parsing to reach the decision.

That gives us a concrete collaboration point for Auren and Mr. Zay: if the decision cannot be expressed cleanly here, we have found a real contract question.
