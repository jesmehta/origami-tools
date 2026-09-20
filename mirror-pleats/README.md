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

**Rectangle** — W × H in mm. Changing it rescales verticals.

**Verticals**
- Linear: count, spacing (mm), first x (mm); "Fit edge to edge"; ±45° cap.
- Radial: count, step (°) between subsequent verticals, rotation (°), centre
  (x, y). The centre must sit above or below the rectangle; lines that don't
  fit inside the rectangle are dropped (status bar says how many).
- Radial has an **Enforce radial from centre** toggle (on by default). On: all
  verticals pass through the centre. Switching it on snaps existing verticals
  (each keeps its end on the edge farther from the centre and swings the other
  end onto the centre line); a new vertical is a single click on an edge;
  dragging an end or body, the numeric fields and ◀ ▶ rotate about the centre;
  moving the centre carries the verticals with it. Off: verticals are free
  lines, added with the two-click edge-to-edge method.
- Ends can never cross a neighbour (min 1 mm), so verticals never intersect.

**Edit modes** (buttons, or hold **Shift** for the other edit mode)
- **Lines** — click a vertical to start a line, click an adjacent vertical to
  finish. Click a circle/line to select and drag it (circles slide along their
  vertical; the line body slides both ends). Delete removes the selected line.
  Lines can be drawn in any section, not only the first; they reflect in both
  directions.
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

**Reflection** — verticals are treated as infinite mirrors. Each line is
mirrored across the next vertical and extended/trimmed to the one after, and
so on to the last, *without* regard to the rectangle; the result is cropped to
the rectangle only at the end. A trail that leaves the rectangle and re-enters
is therefore drawn where it's inside. The first and last verticals also
mirror **outward**: the trail continues as a ray past them, cropped by the
rectangle (one step; there is no further virtual mirror beyond).

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

**Export** — SVG (true mm, 1:1) and PNG (px/mm). One colour for all lines
(default green), another for the rectangle; stroke width in mm. Verticals lying
exactly on a rectangle edge are not exported twice. Dimensions/measurements are
not exported.

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

## Known limitations

- With angled/radial verticals reflected lines can diverge or never reach the
  next vertical; the trail then stops (also stops beyond ~30× the rectangle
  size).
- Hand-editing a vertical switches the layout to "free"; changing generator
  fields or "Reset verticals" regenerates it.
- The crossing check is skipped (shown "n/a") above ~700 visible segments.
- Randomize only places lines in section 1.

## Changelog

- **v1** — Single-page tool, red lines, trails stopped at the rectangle.
- **v2** — Split into linear/radial pages with shared engine; green, thinner
  lines; reflect through infinite mirrors then crop; dimensions + measure
  tool; click-to-draw with Lines/Verticals/Measure modes (Shift swap);
  random layouts avoid crossings and enforce a min vertex gap.
- **v3** — Add verticals by drawing edge-to-edge (and delete); first/last
  vertical reflect outward, cropped by the rectangle.
- **v4** — Radial: "Enforce radial from centre" toggle (existing + new verticals).
