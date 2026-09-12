# Agent decision matrix

| Decision | Receipt input | Safe default when absent |
| --- | --- | --- |
| Treat runtime as accepted | `accepted` | Do not proceed |
| Identify release target | service + revision | Do not guess |
| Understand observed routing | canonical traffic | Treat as unknown |
| Verify readiness | readiness summaries | Do not infer readiness |
| Detect meaningful change | canonical fingerprint | Treat as changed/unknown |
| Diagnose provider failure | external diagnostics | Keep operational; do not promote to contract truth |

The matrix is intentionally conservative. An agent should prefer an explicit unknown or stop condition over reconstructing state from logs.
