# Replay handoff change matrix

| Current observation | Trusted fingerprint | Decision |
| --- | --- | --- |
| accepted A | none | changed |
| rejected/tampered | A | rejected |
| accepted A | A | unchanged |
| accepted B | A | changed |

The matrix is intentionally limited to classification. Persistence of a newly trusted fingerprint belongs after accepted classification, and operational actions remain outside this contract.
