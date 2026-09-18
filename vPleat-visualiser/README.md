# V-Pleat Fold Pattern Visualiser

A single-file, offline HTML tool for turning a hand-drawn curve into a flat,
laser/CNC-ready cut pattern for V-groove pleat strips (bend a flat strip of
material into a polyline approximation of a curve by scoring V-shaped fold
lines across it). Built for the CabinetOfCuriosities project.

**Location:** `index.html` in this folder. No build step, no server, no
dependencies to install — open the file directly in a browser. It loads
[Paper.js](https://paperjs.org/) and [JSZip](https://stuk.github.io/jszip/)
from cdnjs at runtime, so an internet connection is needed the first time a
CDN response isn't cached, but nothing else.

## How it works — the four tabs

1. **Draw Curve** — freehand a spline by placing control points. It's
   rendered as a Catmull-Rom curve through those points.
2. **Segments & Width** — the curve is approximated by a small number of
   straight segments (1–15, slider-controlled). Each segment is offset
   left and right by half a strip width to form the two edges of a ribbon;
   an "auto-adjust" button nudges the segment break points to minimize
   deviation from the original curve, and each break point can also be
   dragged by hand.
3. **Straighten** — the bent ribbon is unrolled into a straight vertical
   strip with diagonal fold lines, one per joint between segments.
4. **Array & Export** — the straightened strip is mirrored (to give
   symmetric V/Λ-shaped folds) and that unit is repeated side by side.
   Download bundles the cut pattern plus two reference images into one zip.

Each tab recomputes from the previous one's data every time you switch into
it, so there's a single source of truth (the control points, segment count,
break-point positions, width, and array count) rather than four independent
copies of the drawing.

## Design decisions and why

**Units are real millimeters, not pixels.** All geometry is stored and
computed in mm; the on-screen canvases (tabs 1–2) apply a fixed px/mm scale
purely for display. The straighten/array SVGs are built directly in mm and
exported with `width="…mm" height="…mm"` attributes, so the downloaded SVG
opens at true 1:1 scale in laser/CNC software — no unit conversion needed
downstream.

**Tabs, not side-by-side panels or a layered canvas.** All three UI shapes
were on the table; tabs won because each stage needs a reasonably large
canvas to be usable (dragging small handles on a cramped panel is painful),
and the pipeline is inherently linear (each stage's output feeds the next),
so a layer-toggle's main benefit — seeing several stages overlaid — wasn't
worth the extra complexity.

**Paper.js for curve math and canvas interaction; hand-rolled geometry for
everything V-pleat-specific.** Paper.js earns its place for exactly the
generic parts: Catmull-Rom smoothing, arc-length parameterization
(`getPointAt`, `getOffsetOf`, `getNearestPoint`/`getNearestLocation`), and
hit-testing for drag/click/double-click interaction. There's no library that
knows about mitered strip offsets, straightening, or mirrored fold-line
export, so that part is plain JS. Tabs 3 and 4 are built as raw SVG DOM
(not Paper.js) since they're read-only and the exported file needs to be
exactly what's on screen — building it directly avoids a serialization step
that could drift from the preview.

**Hidden "math" Paper.js scope.** A tiny offscreen canvas holds a
dedicated `PaperScope` used purely to rebuild the smoothed spline and answer
arc-length questions (point-at-t, nearest-t) for tabs 2–4, independent of
whichever canvas is currently visible. Paper.js scopes are otherwise
one-per-canvas, so this keeps the "what does the curve look like at
distance X" logic in one place rather than duplicated per tab.

**Mirror axis on the R edge.** In tab 3/4, the ribbon's R-offset edge
becomes the shared centre line when the pattern is mirrored to produce
V/Λ-shaped folds. This is an arbitrary but fixed convention — L and R only
mean "one side" and "the other" of the centre-line, so mirroring on L
instead would be geometrically equivalent, just flipped.

**No gap between array instances.** Units are tiled edge-to-edge by
default (literal "array/repeat"), not because a gap wouldn't be useful —
just to keep the initial scope tight. Easy to add a numeric gap input later
if it turns out to matter for a given cut layout.

### Segment-fitting algorithm (tab 2)

Changing the segment-count slider resets break points to equal arc-length
spacing. "Auto-adjust" then runs a coordinate-descent pass: for each
interior break point, it samples candidate positions between its two
neighbors and keeps whichever minimizes the summed squared perpendicular
distance between the original curve and the two chords on either side of
that point, repeated for ~15 passes over all break points. This is a
local optimization (not a global optimum via, say, dynamic programming) —
cheap enough to run instantly for up to 15 segments, and in practice
converges to a good fit within a couple of passes. Dragging a break point
by hand snaps it to the nearest point on the original curve, constrained
to stay between its neighbors.

### Offset / miter geometry (tab 2)

Each straight centre-line segment is offset by half the strip width on
each side to get its L and R edges (infinite lines, not just the segment's
own length). Where two segments meet, the corner of the ribbon is the
actual intersection of segment *i*'s offset line with segment *i+1*'s
offset line (a standard miter join) — not just the two segments' raw
offset endpoints, which wouldn't meet at a sharp corner for anything but a
dead-straight run. The very first and last points of the ribbon (the open
ends of the strip) aren't mitered against anything — they're just the
perpendicular offset points capping that segment.

### Straightening math (tab 3)

The straightened rectangle's height is the *nominal* total centre-line
length (sum of the segments' own lengths) — not the true arc length along
either offset edge, which differs slightly on the inside vs. outside of
each bend (like the inner/outer edge of a curved road). Each fold line's
diagonal tilt is derived directly from the signed turning angle θ at that
joint: `delta = (width/2) * tan(θ/2)`, giving the fold line's endpoints at
`cumulative_length ± delta` on the two edges. This is the standard
miter-join relationship, and by the symmetry of a ±half-width offset around
a centre-line, the same `delta` (with the sign flipped) applies to the
other edge exactly, without needing a second computation. Using the
turning angle here (versus re-deriving positions from the tab 2
intersection points) keeps tabs 2 and 3 independent while remaining
mathematically consistent with tab 2's geometry.

### Mirroring and array (tab 4)

The straightened strip (2 vertical edges) is mirrored across its own R
edge to produce a 2-wide-unit with 3 vertical boundaries and Λ/V-shaped
fold lines meeting at the shared centre line. When multiple units are
placed side by side, unit *N*'s right-hand boundary sits at the exact same
x-coordinate as unit *N+1*'s left-hand boundary — drawing both would
produce a doubled line in the SVG (harmless visually, but doubled geometry
in a cut file some CAM software will flag or double-cut). Only the very
last unit draws its right-hand boundary; every other unit relies on its
neighbor's left edge to close it off.

### Page fit (tab 4)

The Export tab can show a page-size guide and offer two different ways to
shrink the output to fit it:

- **Page width/height (mm)** inputs draw a faint dashed rectangle behind the
  pattern representing the page, either **centred** on the pattern or
  **top-left aligned** with it. Leaving either field blank/0 disables the
  guide entirely (no constraint, no warning). This rectangle is preview-only
  — it's stripped out of the downloaded SVG (see below), it's just there to
  judge fit before exporting.
- A status line under the alignment controls turns green ("Fits page…") or
  red ("Exceeds page…") comparing the *actual output size* (pattern size ×
  export scale) against the page dimensions, and names which dimension(s)
  are over and by how much.
- **Two fit strategies**, since "make it smaller" means different things
  depending on what's exceeding:
  - **Proportional scale** — a pure export-time multiplier (`state.exportScale`,
    10–100%) applied only to the final SVG's `width`/`height` attributes at
    download time. The internal geometry (`viewBox`, every line coordinate)
    is untouched, so this is mathematically a uniform zoom: every fold
    angle is preserved exactly, because a uniform scale never changes
    angles. This is the only strategy that can address the *height* — the
    total centre-line length is fixed by the curve you drew, and the only
    way to make that shorter in the output is to shrink everything.
  - **Reduce strip width only** — actually lowers `state.widthMm` (the same
    slider that lives on the Segments tab; both sliders stay in sync via a
    shared `onWidthChange()`, wherever the change comes from). Because the
    fold-line tilt formula is `delta = (width/2) * tan(θ/2)`, changing the
    width directly changes `delta` while every segment's centre-line length
    (and therefore the total height) stays exactly as drawn. This can only
    ever reduce the pattern's *width*, so it cannot fix a height overflow —
    the status line says so explicitly when that's the case, rather than
    silently doing nothing useful.
  - **Auto-fit to page** computes the right value for whichever strategy is
    selected: for proportional, `min(1, pageW/patternW, pageH/patternH)`,
    floored to the nearest whole percent (rounding down, not to nearest, so
    the displayed percentage never overstates what was actually applied and
    the result never overshoots the page by a rounding error); for
    width-only, `pageWidth / (2 × arrayCount)` (since total output width is
    always `2 × stripWidth × arrayCount`).
- The **array-count slider** (already on this tab) is a third lever for
  reducing total width, independent of the above — more instances is wider,
  fewer is narrower, at a fixed per-unit size.
- The numeric readout below the controls always includes **"Strip width
  after export scale"** (`stripWidth × exportScale`) — under "reduce width
  only" this just equals the width slider's own value (scale stays 100%),
  but under proportional scale it's the number that actually matters
  physically: the real width of the strip material once the whole pattern
  is scaled down for the page.

Nothing here *blocks* downloading an over-size pattern — the warning is
informational, since tiling an oversized cut across multiple sheets is a
legitimate workflow the tool shouldn't get in the way of.

## Export

Clicking **Download** in the Array tab produces one `vpleat-export.zip`
containing:
- `vpleat-pattern.svg` — the cut pattern at true mm scale (solid black =
  cut, dashed red = fold/score line, dotted grey = mirror-axis reference,
  not a cut).
- `vpleat-curve.jpg` — a snapshot of the Draw tab's curve.
- `vpleat-segments.jpg` — a snapshot of the Segments & Width tab.

The exported SVG's `viewBox` is always reset to exactly the pattern's own
bounding box (`0 0 patternWidth patternHeight`) regardless of how much
padding the on-screen preview added to fit the page guide around it, and its
`width`/`height` attributes carry the export scale (see Page fit, above) —
so the file never contains the page guide or its extra padding.

**Why a zip instead of three separate downloads:** the first implementation
triggered three independent file downloads from one click. Testing (headless
Chromium via Playwright) showed Chrome silently drops the second and third
download when they're not each tied to a fresh user gesture — only the SVG
ever landed. Bundling everything into one zip via JSZip sidesteps that
browser restriction entirely and was verified to contain all three files.

## Draw tab controls

- **Click empty canvas** — add a point at the end of the curve.
- **Drag a point** — move it.
- **Double-click the curve itself** — insert a new point at the nearest
  location on the curve (uses Paper.js `getNearestLocation` to find which
  segment the click landed on and snaps the new point exactly onto the
  curve there).
- **Double-click a point** (or select it and press Delete/Backspace, or
  the "Delete selected" button) — remove it. At least 2 points are always
  kept.
- **Lock canvas** checkbox — disables all pointer-driven edits (add / drag
  / double-click insert / double-click delete) so accidental clicks while
  reviewing the curve can't change it. Selecting a point (for the button-
  based delete) still works while locked; only mutation is blocked.
- **Undo** — up to 10 steps, covering add / drag / delete / reset. A drag
  gesture pushes exactly one undo entry (captured on the first move, not
  per mouse-move event), so undoing a drag returns the point to its
  pre-drag position in one step. Ctrl+Z (Cmd+Z on Mac) also triggers undo
  while the Draw tab is active.

## Known limitations / things worth checking

- **Fold direction sign convention is untested against a physical strip.**
  The math is internally consistent (verified visually — offsets, miters,
  and mirrored chevrons all look geometrically correct in testing), but
  whether the V/Λ folds point the "physically correct" way for a given
  curve direction on your actual material hasn't been checked against a
  real cut sample. If it comes out mirrored, flip the sign of `delta` in
  `computeStraightenData()`.
- **Undo only covers Draw-tab control points**, not segment break-point
  positions, width, array count, or page/fit settings.
- **No gap between array-tiled units** (see design decisions above).
- **The page-fit warning is purely informational** — downloading an
  over-size pattern is still allowed, on the assumption that tiling across
  multiple physical sheets is a legitimate use case.

## Testing performed

No automated test suite (this is a single static HTML file with no
framework) — verification was done with headless Chromium via Playwright:
navigating all four tabs, exercising every slider/button (including
auto-adjust, double-click add/delete, the lock checkbox, and undo),
checking the browser console for errors, and downloading + unzipping the
export to confirm all three files are present and the SVG carries correct
mm dimensions and geometry.

## Changelog

- **v1** — Initial 4-tab tool: draw → segment/offset with auto-fit → 
  straighten → mirror/array → SVG download.
- **v2** — Added: zip export bundling the cut SVG with JPG snapshots of the
  curve and segment/width tabs; removed the duplicated boundary line
  between adjacent array units; Draw tab gained double-click-to-insert,
  double-click-to-delete, a canvas lock toggle, and a 10-step undo queue
  (plus Ctrl+Z).
- **v3** — Moved to `D:\Projects\vPleat-visualiser`. Added page-size guide
  (centred/top-left aligned) with a fit/overflow status line, plus two
  independent "reduce to fit" strategies (proportional export-scale vs.
  strip-width-only) and an auto-fit button, on the Array & Export tab.
