# Tooltips

The game's hover tooltips, which replace the browser's own. See
`tooltipManager.js` and the Tooltips section of `docs/architecture.md`.

| Spec | Covers |
| --- | --- |
| `tooltips.spec.js` | The panel appearing on hover and the native tooltip being suppressed (and the `title` put back on leave), body-size text, wrapping, cursor following, staying wholly on screen against a window edge, localization in all five languages, and the player's own frame note being shown verbatim rather than translated |

Every test drives a real pointer (`page.mouse.move`). A tooltip that only
appeared for a dispatched event would prove nothing here: the entire point of
this layer is that the browser's own pointer machinery reaches it, over
elements that swallow pointer events and over the noticeboard's drag gestures.
