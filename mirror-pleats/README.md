# Mirror Pleats

Offline, dependency-free HTML tool for designing reflected crease patterns:
verticals across a rectangle act as mirrors, and every line you draw between
two adjacent verticals is reflected across all the others, producing a trail
of V-pleats.

**Files** (open the `.html` directly — no build, no server):

| File | Purpose |
|---|---|
| `index.html` | Chooser page |
| `linear.html` | Verticals spaced in **mm**, optional ±45° cap |
| `radial.html` | Verticals fanned from a centre, spaced in **degrees** |
| `core.js` | Shared engine (geometry, interaction, dimensions, export) |
| `core.css` | Shared styles |

Each page just sets `window.MODE` and loads `core.js`; only the "Verticals"
panel and the vertical generator differ.

## Using it

**Sheet** — page W × H in mm, typed or from the *Size* presets (⇄ swaps
portrait/landscape), and margins (below). The "rectangle" everything below
refers to is the area inside the margins: the pattern is cropped there and its
outline is the exported cut line. Changing the page or a margin rescales
verticals.

**Margins** — two, each symmetric: **↔** left & right, **↕** top & bottom
(5–15 mm; 🔗 keeps them equal). **Fit to grid** moves each margin line onto the
nearest grid line, so the area inside holds a whole number of grid steps —
e.g. A4 with a 10 mm grid → ↔ 8.5, ↕ 5 → 280 × 200 mm = 28 × 20 steps (if
no single value fits both axes it unlocks 🔗 and says so). **Margin** edit
mode: drag any margin edge; the opposite edge follows (all four with 🔗),
it snaps to grid lines (Alt = free; off the grid it moves in 0.1 mm steps),
and the status bar shows the working area in mm and grid steps, flagging an
axis that isn't on the grid. The margins can always be typed to any value. On the radial page the grid is polar, so
*Fit to grid* is disabled and edges don't snap; set the margins by value.

**Verticals**
- Linear: count, spacing (mm), first x (mm); "Fit edge to edge"; ±45° cap.
- Radial: count, step (°) between subsequent verticals, rotation (°), centre
  (x, y). With the centre above or below the rectangle the verticals are
  lines through it, as described next; with it level with or inside the
  rectangle they become **rays** (see *Rays* below). Verticals are
  infinite lines, so they may **enter and exit the rectangle through any edge**
  (top, bottom, left or right); only lines beyond ±89° are dropped. One that
  misses the rectangle entirely is kept (it still acts as a mirror) and drawn
  as a grey ghost, so the count always matches what you see.
- Radial has an **Enforce radial from centre** toggle (on by default). On: all
  verticals pass through the centre. Switching it on snaps existing verticals
  (each keeps its end on the edge farther from the centre and swings the other
  end onto the centre line); a new vertical is a single click on an edge;
  dragging an end or body, the numeric fields and ◀ ▶ rotate about the centre;
  moving the centre carries the verticals with it. Off: verticals are free
  lines; add one by clicking a point on any edge then a point on another edge,
  and dragging an end slides it along the rectangle outline (a body drag moves
  the line sideways). Free verticals may not cross or touch inside the
  rectangle.
- Ends can never cross a neighbour (min 1 mm), so verticals never intersect.

**Edit modes** (buttons, or hold **Shift** for the other edit mode)
- **Lines** — click a vertical to start a line, click an adjacent vertical to
  finish. Click a circle/line to select and drag it (circles slide along their
  vertical; the line body slides both ends). Delete removes the selected line.
  Lines can be drawn in any section, not only the first; they reflect in both
  directions.
  A handle whose end lies outside the view (e.g. after moving verticals) is
  drawn with a dashed outline at the nearest visible point of its line, so the
  line can still be grabbed, adjusted or selected and deleted; only the
  display moves, not the line.
- **Verticals** — drag a body to move the whole line in ±x, drag a square
  handle to move one end, or use the numeric fields / ◀ ▶ nudge. (Radial: drag
  the ◆ to move the centre.) **Add a vertical** by clicking a point on the top
  (or bottom) edge, then a point on the opposite edge; it's inserted in sorted
  position and rejected if it would cross/touch a neighbour or break the ±45°
  cap (linear). Lines that spanned the new vertical are trimmed to it.
  **Delete** removes the selected vertical (min 2), along with the lines
  attached to it. Hand-added verticals make the layout "free".
- **Measure** — *distance*: click two points (snaps to corners, vertical ends
  and vertices); *angle*: click two lines (verticals, rectangle edges, any
  drawn or reflected line). Shown as acute / obtuse. Measurements are
  snapshots and don't follow later edits; "Clear measurements" removes them.

**Rays** (radial, centre level with or inside the rectangle, i.e.
0 ≤ y ≤ H) — each vertical is a ray from the centre, kept in angular order,
and the last ray neighbours the first. Moving the centre into that band (drag
or type) switches over automatically: the rays start as a full circle
(Step = 360° ÷ Count), lines are re-hung on the same verticals by projecting
their ends, and *Enforce radial* is locked on. Moving it out switches back.
- A line joins two neighbouring rays; its trail is mirrored onward round the
  centre for **exactly one lap** and stops on the ray it started from.
- It closes on itself only if the rays are flat-foldable (Kawasaki): an even
  count with alternate angles each summing to 180°. The status bar shows the
  two alternate sums (green when flat-foldable), says when the count is odd,
  and counts trails that end a lap without closing.
- **Keep flat-foldable** — turning a ray turns the ray two along the other way
  by the same amount, which keeps both sums (2 rays: both turn together).
  Switching it on corrects the current rays by turning all the odd ones
  equally. Needs an even count.
- **Full circle** — Step = 360° ÷ Count and regenerate.
- Verticals mode: drag a ray (or its outer square) to turn it; click an edge
  point to add a ray through it; the selected ray has an *angle* field and
  ◀ ▶ turn it by the step in degrees. Edge-spacing dimensions become the
  wedge angles; tilt becomes each ray's angle. A line's body drag slides both
  ends in/out.

**Reflection** — verticals are treated as infinite mirrors. Each line is
mirrored across the next vertical and extended/trimmed to the one after, and
so on to the last, *without* regard to the rectangle; the result is cropped to
the rectangle only at the end. A trail that leaves the rectangle and re-enters
is therefore drawn where it's inside. The first and last verticals also
mirror **outward**: the trail continues as a ray past them, cropped by the
rectangle (one step; there is no further virtual mirror beyond).

**Ghost lines** — everything the rectangle crops away is drawn grey and dashed
(reflected segments outside it, and on the radial page each vertical's
extension toward the centre). The status bar counts verticals that miss the
rectangle and reflected segments that fall wholly outside. Toggle with "Show
off-rectangle ghost lines".

**Dimensions** (toggles) — edge spacing, vertical tilt, drawn-line angle,
reflected-line angles, vertex gaps along each vertical.

**Layouts**
- *Ordered* — evenly distributed lines snapped to 45° (optional alternating
  ↑↓), on the current linear or radial verticals.
- *Randomize* — verticals, lines, or both. Lines are added one at a time and
  rejected if they cross any other trail or leave less than the **min vertex
  gap** (mm) between vertices on any vertical. If not all requested lines fit,
  fewer are placed and the status bar says so.
- The status bar always reports crossings and the smallest vertex gap
  (green = OK, red = violates).

**Export** — SVG (true mm, 1:1), PNG (px/mm), or a ZIP with both; file names
are time-stamped (`mirror-pleats-radial_2026_0925_143012.svg`). One colour for all lines
(default green), another for the rectangle; stroke width in mm. Verticals lying
exactly on a rectangle edge are not exported twice. Dimensions/measurements are
not exported.

**Project** — Save… / Load… a `.json` (geometry + grid & snap settings), or
load an exported `.svg` (it carries the same data), or drop either onto the
page; *Templates…* lists `templates/linear.txt` / `templates/radial.txt`.
Linear and radial projects don't load into each other. Loading is one undo step;
fields missing from an older file take the start-up defaults.

Undo/redo: Ctrl+Z / Ctrl+Shift+Z (80 steps). Esc cancels a pending line/measure.

## Decisions

- **No libraries** — the geometry is small and the view is plain SVG.
- **Mirror, not billiard** — line *k+1* is the mirror image of line *k* across
  the shared vertical (zig-zag).
- **Linear/radial are separate pages on one engine** — the inputs differ
  (mm vs degrees, centre), the maths after "generate verticals" is identical.
- **Modes instead of overloading clicks** — a vertical body click would be
  ambiguous between "start a line" and "move the vertical", so verticals and
  lines are edited in separate modes with Shift as a momentary swap.
- **"45°" means 45° to the horizontal**, also in radial mode.
- **Rays instead of lines once the centre is level with the sheet** — a line
  through such a centre would be near-horizontal, and the old x-at-top /
  x-at-bottom storage can't hold a horizontal line. Rays are stored as angles
  and line ends as distances from the centre; the low-level helpers (`vp`,
  `reflectPt`, `rayVert`, `vSeg`, `visT`, `nx`) hide the difference so drawing,
  snapping, handles, layouts and measuring are shared.
- **One lap, then stop** — past one lap a non-closing trail would cross its
  own start and spiral; the closing condition is Kawasaki's theorem, so the
  tool reports it rather than silently overlapping lines.
- **Verticals are infinite lines** stored by their x at y=0 and y=H (which may
  lie outside the rectangle); the visible part is that line cropped to the
  rectangle. That is what lets radial verticals use any edge.

## Known limitations

- With angled/radial verticals reflected lines can diverge or never reach the
  next vertical; the trail then stops (also stops beyond ~30× the rectangle
  size).
- Hand-editing a vertical switches the layout to "free"; changing generator
  fields or "Reset verticals" regenerates it.
- The crossing check is skipped (shown "n/a") above ~700 visible segments.
- Randomize only places lines in section 1.
- Rays: a trail through a wedge wider than 180° usually can't reach the next
  ray and stops early. Keep flat-foldable's correction on switch-on can push
  rays past their neighbours if the layout is very uneven (Undo).

## Changelog

- **v1** — Single-page tool, red lines, trails stopped at the rectangle.
- **v2** — Split into linear/radial pages with shared engine; green, thinner
  lines; reflect through infinite mirrors then crop; dimensions + measure
  tool; click-to-draw with Lines/Verticals/Measure modes (Shift swap);
  random layouts avoid crossings and enforce a min vertex gap.
- **v3** — Add verticals by drawing edge-to-edge (and delete); first/last
  vertical reflect outward, cropped by the rectangle.
- **v4** — Radial: "Enforce radial from centre" toggle (existing + new verticals).
- **v5** — Radial: verticals may enter/exit through any edge (enforced and free
  modes); grey ghost lines for everything outside the rectangle.
- **v6** — Shared origami-tools features (see the top-level README): backlink,
  thinner lines, tooltips, time-stamped SVG/PNG/ZIP export, sheet presets +
  margin, grid (polar on radial), snapping (replaces the 45° checkbox),
  off-canvas line handles. Radial: centre may sit inside the sheet — verticals
  become rays, one-lap trails, flat-foldability check and keep option.
