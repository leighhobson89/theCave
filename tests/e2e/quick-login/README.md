# Quick login — the model to copy

100% covered. After a manual login succeeds, the credentials that achieved it
are remembered so they can be replayed with one click; the remembered level is
a high-water mark and can never grant access above what was earned.

| Spec | Covers |
| --- | --- |
| `browser-quick-login.spec.js` | Visibility rules, replay at the stored level, high-water-mark behaviour in both directions, both gated sites, save/load round trip, New Game clearing |

This is the coverage shape every other category should aim for: every
visibility rule, every direction of state change, and both the persistence and
reset paths.
