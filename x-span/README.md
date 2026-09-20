# X Span Generator

Offline, dependency-free single-file HTML tool (`index.html`, open directly —
no build, no server). Verticals across a rectangle; between them, pairs of
lines that fan up and down at the same angle and meet again only *on* a
vertical, forming chains of rhombi whose vertical diagonals lie on the
verticals.

## Initial need

Same interaction and output conventions as the other tools here
([mirror-pleats](../mirror-pleats/README.md), [hypar](../hypar/README.md)),
for this geometry:

- user-defined rectangle;
- user-defined number of verticals, always at 90°, distributed evenly or
  placed manually;
- user-defined number of "horizontal" lines;
- the user gives **one** angle; everything else is computed so that the two
  lines of a pair leave a point going up and down at the same angle and
  always cross each other on a vertical, never in mid-space.

## Using it

**Rectangle** — W × H in mm. Changing it rescales verticals and chains.

**Verticals** — count, spacing, first x (mm); "Fit edge to edge"; "Reset
verticals". Always exactly vertical. Drag one, use the ◀ ▶ nudge, or type its x
(select it first). They can't get closer than 1 mm to a neighbour.

**Rhombus** — angle θ (numeric only), and how heights are decided when the
verticals are *not* evenly spaced (with even spacing both give the same
picture):
- *Same height everywhere* — every vertical diagonal is `2·h`, `h = (x₂−x₁)·tanθ`
  (first section). Angles adapt to each section's width.
- *Exact θ in each first section* — the left half of every rhombus uses θ
  exactly, so `h` and the diagonal length vary; the right half's angle adapts.

**Chains** — a chain is one up/down pair. It crosses (at one y) on every
second vertical: crossing verticals `p, p+2, p+4…`, `p` being 0 or 1. Between
two crossings the lines bend on the vertical in between, which is the vertical
diagonal of a rhombus. A section left over at either end gets **half a
rhombus** (lines fan out from the crossing to the edge vertical).
- *Chains cross on* **the same verticals** — parallel bands, never touching
  unless they overlap. **Alternating verticals** — odd chains cross on the
  other verticals, so chains interlock into an X lattice. Changing it re-applies
  to every chain, top to bottom.
- Count + "Distribute evenly" (y = H·(i+½)/N), or place them by hand.
- Select a chain to type its y, flip which verticals it crosses on, and read its
  half-height.

**Edit modes** (buttons, or hold **Shift** for the other edit mode)
- **Chains** — click a vertical to add a chain crossing on it (its parity follows
  that vertical, its y is where you clicked). Drag a circle (crossing point) or
  any line of a chain up/down. Delete removes the selected chain.
- **Verticals** — drag a vertical or a square end handle left/right. Click a point
  on the top or bottom edge to add one. Delete removes the selected (min 2).
- **Measure** — *distance*: two points (snaps to corners, vertical ends, chain
  vertices); *angle*: two lines. Snapshots; "Clear measurements".

**Ghost lines** — parts of a chain outside the rectangle (large `h`, or a chain
near an edge) are drawn grey and dashed and cropped from the export. The status
bar counts segments that leave it.

**Status bar** — *Overlapping chains* (crossings between chains that cross on the
same verticals — a problem), *interlocking crossings* (between alternating
chains — by design, not flagged) and the smallest vertex gap on any vertical
(green OK / red violation, threshold = min vertex gap).

**Dimensions** — section widths, line angles, vertical diagonal lengths,
vertex gaps on verticals.

**Randomize** — verticals (jittered even spacing), chains (placed one at a time,
rejected if they overlap a same-parity chain or break the min vertex gap), or both.

**Export** — SVG (true mm, 1:1) and PNG (px/mm). One line colour, one rectangle
colour, stroke width in mm. Verticals lying on a rectangle edge are not exported
twice. Dimensions, measurements and ghosts are not exported.

Undo/redo: Ctrl+Z / Ctrl+Shift+Z (80 steps). Esc clears a pending measure and
the selection.

## Decisions

- **Zigzag, not straight lines.** Two straight lines at ±θ can only cross once.
  To meet again on a vertical they must bend, and they bend on the vertical in
  between: the rhombus is two sections wide, its vertical diagonal is the middle
  vertical, its left/right corners are on the neighbouring verticals.
- **One angle, computed rest.** With uneven spacing the same angle can't fit
  every section, so the tool offers both readings (constant height / exact θ)
  as a toggle until one is picked.
- **A chain is defined by one y, plus a parity.** All crossing points of a chain
  are at the same y; that is what makes the lines meet on verticals.
- **Chain parity follows the vertical you click** (and is a flip button / the
  global alternate toggle otherwise), instead of a separate field.
- **Same conventions as [mirror-pleats](../mirror-pleats/README.md)** — modes with
  Shift swap, ghost lines, dimensions, measure, randomize with a gap rule,
  single-colour SVG/PNG export, 80-step undo. Plain SVG, no libraries.
- Linear verticals only (no radial page), no ±45° cap: the angle here is the
  rhombus angle, not a constraint on the verticals.

## Known limitations / watch out for

- The height in both modes is taken from the **first section** (V1–V2). If that
  section is unusually narrow or wide, every rhombus changes.
- Adding/removing a vertical changes which verticals a chain crosses on (chains
  store a parity, not vertical indices).
- Chain y positions are absolute, so a chain whose rhombi are taller than the
  rectangle simply shows ghost lines; nothing stops it.
- The crossing check is skipped (shown "n/a") above ~700 visible segments.
- Chains' parity after dragging one chain past another is not re-alternated; use
  the "Chains cross on" dropdown to re-apply.
- No mountain/valley assignment (single colour).

## Changelog

- **v1** — Rectangle, even/manual verticals, chains of rhombi with constant-height
  / exact-θ toggle, same-verticals / alternating chains, half rhombi at leftover
  sections, Chains/Verticals/Measure modes, dimensions, randomize, SVG/PNG export.
