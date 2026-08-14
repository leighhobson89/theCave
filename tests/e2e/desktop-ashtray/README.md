# Desktop ashtray

The desk ashtray's stub-out/relight toggle. See the "Stubbing-out and
relighting" comment block in `styles.css` and the `desktopAshtrayHotspot`
click handler in `ui.js`.

| Spec | Covers |
| --- | --- |
| `ashtray.spec.js` | A new game starting lit; a real click stubbing the cigarette out (the `is-extinguishing` animation class appearing, then clearing into the static `has-extra-butt` state on schedule) and relighting it the same way; a click mid-animation being ignored rather than restarting or reversing it; the extinguished state surviving a save/load round trip and a real-browser-refresh sticky-save resume |

Not one of the originally scoped 10 categories — added because this desk
object had no coverage at all (see `docs/test-coverage-analysis.md` §1.1) and
didn't fit any existing folder.

Every click is real (`locator.click()`), never a synthetic class toggle: the
point is to prove the hotspot is actually reachable and wired up, not just
that the CSS looks right once a class is present.

**Still not covered:** the exact visual choreography of the crush/relight
animation (multi-stage transform keyframes, ash flecks, the ignition flare) —
verified by eye during development, not asserted pixel-by-pixel here, since a
geometry assertion on hand-tuned keyframe values would be more brittle than
useful.
