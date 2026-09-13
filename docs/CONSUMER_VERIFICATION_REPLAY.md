# Consumer verification replay

The verification consumer and replay contract meet at one small boundary: only a receipt whose supplied fingerprint matches a freshly computed fingerprint can enter change detection.

A rejected verification has no trusted fingerprint. A consumer therefore retains its previous trusted fingerprint and can safely classify a later verified copy of the same receipt as `unchanged`.

This sequence is intentionally covered independently from deployment or persistence behavior:

`verified A → tampered A → verified A = changed → rejected → unchanged`

The runtime does not decide what the consumer should do after any of these states.
