# X Span Generator

Offline, dependency-free single-file HTML tool (`index.html`, open directly —
no build, no server). A lattice of rhombi inside a rectangle, where every
rhombus vertex lies on a vertical line and the vertical lines are the rhombi's
vertical diagonals. Four grid types:

| Type | Verticals | Height `h` |
|---|---|---|
| **Regular** | evenly spread | constant (straight lines) |
| **Const H · move W** | free (still vertical) | constant |
| **Const W · move H** | evenly spread | one per chain row |
| **Move both** | free | one per chain row |

Wherever the spacing or the height changes, the lines bend (refract) so the
tiling stays continuous.

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

v3 brief: a second family of irregular grids. Keep "constant H, movable W" (the
old Irregular mode), and add "constant W, movable H" (the height varies from chain
to chain while the verticals stay evenly spaced) and "movable both", as three
separate named modes, with the inputs (sliders etc.) they need. Heights are set by
dragging the levels on the canvas, per-chain sliders and a profile; the angle and
chain-count definitions still work; the chains stay anchored at the top and are
cropped at the bottom (no forced fill). Also: chains may be entered in 0.5 steps,
lines can be dragged to set the angle (pivot on the top of the 2nd vertical,
higher priority than the y-offset drag), and the y offset can be reset.

## The lattice

Everything is one construction. Chain row *j* runs between **touch levels**
`t_j` and `t_{j+1} = t_j + 2·h_j` (`t_0` = the y offset); `h_j` is its
half-height (vertical diagonal `2h_j`) and `c_j = t_j + h_j` is where its rhombi
cross. The **touch verticals** (V2, V4… or V1, V3…, see *Chains cross on*) carry
the vertices `t_j`; the other verticals carry the crossings `c_j`. Every crossing
`c_j` is joined to `t_j` and `t_{j+1}` on the neighbouring verticals.
- Chain rows stack and touch vertex to vertex; the **"1.5" rows** appear between
  them for free (their vertices are the crossings `c_{j-1}`, `c_j` with a touch
  level in between).
- Constant `h` and equal sections `d`: every line is straight at `tan θ = h/d`.
- Uneven sections: the section angle is `atan(h/dₖ)`, rhombi become kites, the
  tiling holds.
- Variable `h_j`: the 1.5 rows become kites whose top half is `h_{j-1}` and bottom
  half is `h_j`.

## Using it

**Rectangle** — W × H in mm.

**Regular · verticals** — pick what defines them: *number*, *distance*, or
*rhombus minor diagonal* (= 2 × distance; the horizontal diagonal spans two
sections). Only the chosen field is editable; the others show the derived value.
Number → first and last vertical on the rectangle edges. Distance / minor
diagonal → verticals from x = 0 every `d`; the count is derived and one vertical
just beyond the right edge is kept (grey) so the grid fills the rectangle.

**Free verticals** (Const H · move W, Move both) — start from an even spread (count / spacing / first
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

**Chain heights** (Const W · move H, Move both) — each chain row has its own
half-height `h_j` (top to bottom). Set them by
- dragging a circle on a touch vertex up/down: the chain above grows and the
  chain below shrinks by the same amount, everything else stays put (for the first
  chain the y offset moves too, so the chain below keeps its place);
- a slider + number per chain row now on the canvas;
- **Apply profile** (first h → last h over the rows now shown, linear / ease in /
  ease out / ease in-out), **Randomize**, **Fit to height** (scales all heights so
  the chains now shown, to the nearest half, end exactly at the bottom edge),
  **All equal**.

Rows past the last defined one repeat its height. Heights are stored as ratios of
the reference `h` (from *angle θ* or *number of chains*), so changing θ, the chain
count or dragging a line scales all heights together and keeps their proportions.
Smallest height 0.3 mm.

**Grid type switch** — Regular → a free-vertical type keeps the current verticals
(minus one beyond the edge). Going back to an evenly spread type regenerates from
the regular fields (undo gets hand edits back). Heights are remembered per
session, so switching to a variable-height type again restores them.

**Grid mode mouse** — *drag a line* to set the angle: θ follows the direction
from a fixed pivot, the top vertex of the 2nd vertical (its first vertex inside
the rectangle), to the pointer, so the grid rotates about that point and the
pivot stays a vertex (dragging switches the Rhombus definition to *angle*).
*Drag empty space* to shift the grid up/down (the y offset). Priority: height
circle (variable-height types) > line > empty space. With variable heights the
angle drag scales all heights together and the pivot stays a vertex.

**Edit modes** — **Grid** (angle / offset drag), **Verticals** (free-vertical types only; hold
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
- **Heights are per chain row, not per vertex.** The tiling condition only needs
  the levels on each vertical to interleave (touch, cross, touch…), so more
  freedom is possible, but per-row is what "chains" means, is easy to edit, and
  the 1.5 rows still fall out for free (as kites).
- **Ratios, not absolute heights.** Storing `h_j = h_ref × ratio_j` keeps the
  angle / chain-count definitions and the angle drag working unchanged.
- **Anchored at the top, no forced fill.** Changing one height shifts everything
  below it; "Fit to height" is the explicit way to fill H.
- **Four named types instead of two switches** (per the brief): Regular, Const H ·
  move W, Const W · move H, Move both; one lattice generator underneath.
- v1's "exact θ in each section" toggle and free-floating chains were dropped in
  v2: they can't tile.
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

- With free verticals, the reference `h` comes from the **first section** (V1–V2)
  when defined by angle. Move that vertical and every rhombus changes height.
  Define by number of chains for an `h` that doesn't depend on the verticals.
- With *number of chains* and variable heights, `2h_ref × chains` = H only while
  all heights are equal; use **Fit to height** afterwards.
- Free-vertical types have no verticals beyond the rectangle: if the layout
  doesn't reach the right edge, the grid stops at the last vertical.
- Only rows j ≥ 0 have height handles/sliders; rows above the y offset (when it is
  > 0) repeat row 1's height.
- Sliders exist for the rows on the canvas, so moving the grid down / shrinking
  heights adds rows and their sliders.
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
- **v3** — Grid types Regular / Const H · move W / Const W · move H / Move both.
  Variable heights: one h per chain row, height circles on the canvas, sliders,
  profile / randomize / fit to height / all equal. General touch-level lattice
  replaces the constant-h one (constant-h output unchanged).
- **v2.1** — Chains in 0.5 steps; drag a line to set the angle (pivot on the top
  of V2, wins over the y-offset drag); Reset y offset.
- **v2** — Rebuilt around one continuous lattice. Regular and Irregular modes;
  regular verticals by number / distance / minor diagonal, rhombus by angle or
  number of chains; irregular free verticals with refracting lines; y offset and
  chain parity; free chains, exact-θ toggle and chain randomize removed.
