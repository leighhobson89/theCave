# Web content authentication

Netscape site login/logout: guest defaults, privilege gating of records,
case-sensitive credentials, and session lifetime across navigation, closing
the computer, and save/load. Distinct from `quick-login/`, which covers the
one-click replay feature built on top of a manual login.

| Spec | Covers |
| --- | --- |
| `authentication.spec.js` | Guest defaults, privilege gating, case sensitivity, log out, session persistence, save/load round trip |

Not one of the originally scoped 10 categories — added because "Quick login"
and general authentication are different behaviours and folding this into
`quick-login/` would have made that folder's name inaccurate.
