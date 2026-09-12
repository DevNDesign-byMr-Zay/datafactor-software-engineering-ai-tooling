# Consumer contract change policy

A receipt field is a contract commitment, not a convenience field.

Before adding one, the team should be able to name:

1. the consumer decision that currently cannot be made;
2. the exact semantic the new field supplies;
3. the boundary test that proves the semantic;
4. why existing receipt facts cannot provide the same decision;
5. why the field belongs in durable evidence rather than diagnostics.

## Keep the contract small

The runtime surface already has a useful separation: acceptance evidence is normalized and fingerprinted, while provider/process details remain operational diagnostics. The goal is to preserve that separation as more agent and release consumers arrive.

A proposed field that cannot answer the questions above should stay out of the receipt until a real consumer demonstrates the need.

## Review sequence

When a consumer gap is demonstrated, land the smallest contract change first, add its boundary test, then document the new semantic. Storage, orchestration, and provider-specific integration should remain separate follow-up work.
