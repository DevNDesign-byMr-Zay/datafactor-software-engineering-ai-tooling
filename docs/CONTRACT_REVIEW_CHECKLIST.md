# Contract review checklist

Before expanding the runtime evidence surface, reviewers should confirm:

- [ ] A real consumer decision requires the proposed semantic.
- [ ] Existing receipt fields cannot support that decision safely.
- [ ] The proposed addition is the smallest useful semantic.
- [ ] Equivalent observations still canonicalize deterministically.
- [ ] Missing or malformed evidence has an explicit safe failure mode.
- [ ] Provider logs remain diagnostic rather than contractual.
- [ ] Historical corpus content is not modified unnecessarily.
- [ ] Tests demonstrate the consumer behavior, not only object shape.

Auren's review should be especially useful on the first three boxes: consumer need should drive contract growth, not implementation convenience.
