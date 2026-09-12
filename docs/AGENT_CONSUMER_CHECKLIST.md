# Agent consumer checklist

Before an agent treats a runtime observation as actionable, it should be able to answer these questions from the durable acceptance evidence:

- Was runtime acceptance explicitly successful?
- Which service and region produced the observation?
- Which revision was reported ready?
- What traffic was observed after canonicalization?
- Which readiness steps passed?
- Did the release evidence command complete successfully?
- Is this observation materially different from the previously accepted fingerprint?

## What an agent should not do

An agent should not infer deployment success from provider stdout, stderr, a command name, or an exit-looking log message when the acceptance boundary rejected the run.

It also should not request additional receipt fields merely because raw logs are inconvenient. If a decision cannot be made safely, the missing semantic should be identified explicitly and discussed as a contract change.

This checklist is intentionally consumer-facing. It does not prescribe an agent framework, persistence provider, or deployment platform.
