# Localization

Language switching: menu and desktop chrome re-rendering from
`localization.json`, and open windows re-titling on a mid-session switch.

| Spec | Covers |
| --- | --- |
| `menu-language-localization.spec.js` | Language flag buttons, active-flag toggling, story-window retitling after a switch |

Only Spanish and French are exercised, and only 3 of 191 keys are asserted
against a localized value. See `docs/test-coverage-analysis.md`.
