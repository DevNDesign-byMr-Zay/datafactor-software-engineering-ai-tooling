# Team collaboration notes

A few ideas surfaced while building the consumer boundary with Mr. Zay, Auren, and VÆLON:

- **Auren / agent perspective:** replaying trusted observations should be enough to explain first-seen, unchanged, and changed states without provider-log parsing.
- **Mr. Zay / repository perspective:** keep the runtime API narrow and make any new surface earn its place through consumer tests.
- **VÆLON / automation perspective:** semantic changes can become inputs to downstream automation, but the runtime should not own the resulting action.

The current implementation therefore favors replayable fixtures and semantic diffs over another orchestration layer.
