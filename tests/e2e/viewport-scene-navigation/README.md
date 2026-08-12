# Viewport & scene navigation

`game.js`: wheel zoom through the four zoom levels, pointer-drag panning and
its clamping, drag cancellation on blur/visibility change, the table-leg
perspective effect, and the noticeboard scene transition (fade, button label
swap, active-scene save/restore).

| Spec | Covers |
| --- | --- |
| `viewport-zoom.spec.js` | Wheel zoom stepping through all 4 `ZOOM_LEVELS` and clamping at each end; the transient zoom readout appearing on a change and fading on its own; a no-op zoom at the clamp not re-triggering it |
| `viewport-panning.spec.js` | Pointer-drag panning by the drag delta; clamping at the world edges in both directions; drag cancellation on the pointer leaving the viewport, a window blur, and a tab visibility change, each proven by further movement *not* resuming the pan; the table-leg perspective effect responding to pan position |
| `scene-noticeboard-transition.spec.js` | The noticeboard button's scene transition (fade overlay, scene-visibility swap, button label swap); the re-entrancy guard against a rapid second click mid-transition; the active scene surviving a save/load round trip, a real-browser-refresh sticky-save resume, and New Game always resetting to the desktop |

**A note on `#desktopViewport`:** it covers the entire game area, so a drag
large enough to reach the world's pan-clamp bound can *also* be large enough
to cross the viewport's own screen edge and trigger the separate
pointer-leaves-the-viewport cancellation. `viewport-panning.spec.js`'s clamp
test deliberately uses a moderate overshoot to exercise the clamp in
isolation from that cancellation path, which has its own dedicated test.

**Still not covered:** the exact wheel-zoom anchor math (that zooming keeps
the *world point currently at the viewport's center* fixed rather than just
changing scale) is exercised indirectly but never asserted directly; and
`applySceneTransform`'s `window.addEventListener("resize", ...)` re-layout
on an actual viewport resize.
