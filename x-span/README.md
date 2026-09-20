# X Span Generator

Offline, dependency-free single-file HTML tool (`index.html`, open directly —
no build, no server). A lattice of rhombi inside a rectangle, where every
rhombus vertex lies on a vertical line and the vertical lines are the rhombi's
vertical diagonals. **Regular**: verticals evenly spread, straight lines.
**Irregular**: verticals free (still vertical), the lines bend at each one.

## Initial need

Same interaction and output conventions as the other tools here
([mirror-pleats](../mirror-pleats/README.md), [hypar](../hypar/README.md)).

v1 brief: user-defined rectangle, verticals (always 90°, even or manual),
horizontal lines; the user gives **one** angle and the rest is computed so that
the two lines of a pair leave a point going up and down at the same angle and
cross each other only on a vertical, never in mid-space.

v2 brief (current): split into two modes.
- **Regular** — verticals evenly distributed (by number or by distance);
  rhombus defined by angle or by number of chains. The rhombi tile contiguously,
  so the angle is the angle of a whole grid. The verticals are not mirrors, only
  intersection points for the grid. Alternative input: rhombus angle + minor
  diagonal length (= 2 × the vertical spacing).
- **Irregular** — verticals movable but vertical; the rhombi may differ from each
  other but must still tile continuously (bottom vertex of a chain-1 rhombus =
  top vertex of a chain-2 rhombus, with a "chain 1.5" row between, offset by half
  a width). The lines refract at the verticals to reach the next point. Height
  of the rhombi stays constant.

## The lattice

Everything is one construction. `h` is the half-height of every rhombus (vertical
diagonal `2h`). Vertical *k* carries vertices at `y = yoff + h·(a_k + 2m)`, with
`a_k = 1` on the verticals the **chains** cross on (V1, V3, V5… or V2, V4, V6…)
and `a_k = 0` on the others, which carry the offset **"1.5" rows**. Every vertex
is joined to the two vertices of the next vertical at `y ± h`.
- Chain rows are stacked `2h` apart and touch vertex to vertex; the 1.5 rows sit
  between them.
- Regular: all sections equal `d`, so every line is straight at `tan θ = h/d`.
- Irregular: only the x positions change, so the section angle is `atan(h/dₖ)`.
  The rhombi become kites, but they still tile.

## Using it

**Rectangle** — W × H in mm.

**Regular · verticals** — pick what defines them: *number*, *distance*, or
*rhombus minor diagonal* (= 2 × distance; the horizontal diagonal spans two
sections). Only the chosen field is editable; the others show the derived value.
Number → first and last vertical on the rectangle edges. Distance / minor
diagonal → verticals from x = 0 every `d`; the count is derived and one vertical
just beyond the right edge is kept (grey) so the grid fills the rectangle.

**Irregular · verticals** — starts from an even spread (count / spacing / first
x, "Fit edge to edge", "Reset") or from the regular layout you switched from.
Then Verticals mode: drag a vertical or a square end handle left/right, click a
point on the top/bottom edge to add one, Delete removes the selected (min 2),
type an x, or ◀ ▶ nudge. Verticals stay ≥ 1 mm apart. "Randomize" jitters the
spread. Changing the fields or "Reset" regenerates and discards hand edits.

**Rhombus** — define by *angle θ* (angle of a side to the horizontal; `h =
first section × tan θ`) or by *number of chains* (`2h = H ÷ chains`, so the
vertical diagonals fill the height exactly; θ follows). Chains go in steps of
0.5, so the last row can be half a rhombus. Either way `h` is one
value for the whole grid. θ < 45° gives wide rhombi (vertical is the minor
diagonal), θ > 45° tall ones. Switching what defines it keeps the picture unchanged.

**Grid position** — *y offset* (0 = the first chain's top vertex is on the top
edge; the grid is periodic, so it wraps at `2h`) and *chains cross on* V1,V3… /
V2,V4…. **Reset** sets the offset back to 0. With an angle, the
number of chains that fit is rarely whole; the grid is anchored by the offset and
cropped at the bottom (the status bar shows the fractional count).

**Grid type switch** — Regular → Irregular keeps the current verticals (minus one
beyond the edge). Irregular → Regular regenerates from the regular fields (undo
gets the hand edits back).

**Grid mode mouse** — *drag a line* to set the angle: θ follows the direction
from a fixed pivot, the top vertex of the 2nd vertical (its first vertex inside
the rectangle), to the pointer, so the grid rotates about that point and the
pivot stays a vertex (dragging switches the Rhombus definition to *angle*).
*Drag empty space* to shift the grid up/down (the y offset). Lines take
priority over empty space.

**Edit modes** — **Grid** (angle / offset drag), **Verticals** (irregular only; hold
**Shift** for the other of Grid/Verticals), **Measure** (distance between two
points, snapping to corners / vertical ends / vertices; angle between two lines).

**Ghost lines** — everything the rectangle crops off is drawn grey and dashed
and not exported. The status bar counts segments that leave it.

**Dimensions** — section widths, line angles, vertical diagonal lengths.

**Export** — SVG (true mm, 1:1) and PNG (px/mm). One line colour, one rectangle
colour, stroke width in mm. Verticals lying on a rectangle edge are not exported
twice. Dimensions, measurements and ghosts are not exported.

Undo/redo: Ctrl+Z / Ctrl+Shift+Z (80 steps). Esc clears a pending measure and
the selection.

## Decisions

- **One lattice, two ways of placing verticals.** The tiling condition (touching
  vertex to vertex, all vertices on verticals) fixes every y once `h` is chosen;
  only x is free. Regular is the equal-spacing case, so both modes share one
  generator.
- **Constant `h`.** Required by the brief for irregular; also what makes the
  1.5 rows fall out for free. So v1's "exact θ in each section" toggle and
  free-floating chains were dropped: they can't tile.
- **Verticals refract, not mirror.** Mathematically the bend is the same, but
  nothing is mirrored; a vertical is just where a vertex must lie.
- **Angle = side to the horizontal**, either orientation allowed (no restriction
  to "vertical is the major diagonal").
- **Angle drag pivots on the top of V2** (the far end of the first section), so
  the pointer position reads as "where the neighbouring vertex on V1 goes"; the
  yoff is recomputed so the pivot doesn't move.
- **Grid anchored at the top, cropped at the bottom** rather than snapping θ, so
  the angle you type is the angle you get. "Number of chains" is the way to fill
  the height exactly.
- **Grid ends at the first/last vertical** (they normally sit on the rectangle
  edges). The one extra vertical past the right edge in regular distance mode
  exists only so the cropped grid reaches the edge.
- **Same conventions as [mirror-pleats](../mirror-pleats/README.md)** — modes,
  ghost lines, dimensions, measure, single-colour SVG/PNG export, 80-step undo.
  Plain SVG, no libraries.

## Known limitations / watch out for

- In irregular mode `h` comes from the **first section** (V1–V2) when defined by
  angle. Move that vertical and every rhombus changes height. Define by number of
  chains for an `h` that doesn't depend on the verticals.
- Irregular mode has no verticals beyond the rectangle: if the layout doesn't
  reach the right edge, the grid stops at the last vertical.
- Adding/removing a vertical changes which verticals carry the chains (parity is
  by position).
- Segment count is capped (30 000). Tiny θ or spacing shows a warning instead.
- A very small θ or a chains count much larger than the height allows gives
  extremely dense lines; nothing stops it.
- No mountain/valley assignment (single colour).

## Changelog

- **v1** — Rectangle, even/manual verticals, free chains of rhombi (crossings on
  every second vertical), constant-height / exact-θ toggle, same / alternating
  chains, half rhombi at leftover sections, Chains/Verticals/Measure modes,
  dimensions, randomize, SVG/PNG export.
- **v2.1** — Chains in 0.5 steps; drag a line to set the angle (pivot on the top
  of V2, wins over the y-offset drag); Reset y offset.
- **v2** — Rebuilt around one continuous lattice. Regular and Irregular modes;
  regular verticals by number / distance / minor diagonal, rhombus by angle or
  number of chains; irregular free verticals with refracting lines; y offset and
  chain parity; free chains, exact-θ toggle and chain randomize removed.
