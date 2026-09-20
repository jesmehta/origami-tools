# Mirror Pleats

A single-file, offline HTML tool (no dependencies, no build step) for
designing reflected crease patterns: draw verticals across a rectangle, draw
lines in the first section, and every following vertical acts as a mirror,
producing a trail of V-pleats.

**Location:** `index.html` — open directly in a browser.

## How it works

1. **Rectangle** — width/height in mm. Changing it rescales the verticals.
2. **Verticals** — each runs from the top edge to the bottom edge; only the
   x-position of each end is free. Ends can never cross a neighbour (min gap
   1 mm), so verticals never intersect. A ±45° cap applies to non-radial
   layouts (checkbox; the Radial preset turns it off).
   - Drag the body to move the whole line in ±x, drag a square handle to move
     just one end, or use the numeric fields / ◀ ▶ nudge on the selected one.
   - **Parallel** preset: evenly spaced, vertical. **Radial** preset: lines
     through a centre (draggable ◆ or numeric) that must sit above or below the
     rectangle, otherwise the lines would cross. Equal angular spacing.
3. **Section-1 lines** — *Draw line* mode: click a point on V1 (or V2), then a
   point on the other. Stored as positions along each vertical, so they follow
   when the verticals move. Drag circles to slide an end along its vertical;
   drag the line body to slide it. Optional 45° snap.
4. **Reflection** — for a line ending on vertical *k*, the whole line is
   mirrored across *k*, then extended/trimmed to meet vertical *k+1*; that
   result is mirrored across *k+1*, and so on. If the mirrored line leaves the
   rectangle (top/bottom) before reaching the next vertical, it is clipped at
   the edge and that trail ends (the status bar counts these).
5. **Ordered layouts** — evenly distributed lines snapped to 45°
   (optionally alternating up/down), on parallel or radial verticals.
6. **Randomize** — verticals (jittered, ordering/cap respected), lines, or both.
7. **Export** — SVG (true mm, 1:1) and PNG (px/mm setting). All lines share one
   colour, the outer rectangle another (both pickable). Verticals lying exactly
   on the rectangle edge are not exported twice.

Undo/redo: Ctrl+Z / Ctrl+Shift+Z (80 steps). Delete removes the selected line.

## Decisions

- **No libraries.** All geometry is a few dozen lines of plain JS and the view
  is a plain SVG, so Paper.js/JSZip would only add a CDN dependency.
- **Mirror, not billiard.** Line *k+1* is the mirror image of line *k* across
  the shared vertical (zig-zag), not a physical ray bounce.
- **Linear and radial share one engine**; radial is just a generator for the
  vertical end positions, so a single page handles both.
- **45° in radial mode** means 45° to the horizontal, not to the radial lines.

## Known limitations

- With angled/radial verticals, reflected lines rotate a little more at every
  mirror and may leave the rectangle early; trails then stop.
- Manually dragging a radial vertical switches the layout to "free" (the
  centre handle disappears until Radial is applied again).
- Ordered layouts need at least V1 and V2 and skip the flip only when neither
  45° direction reaches V2.

## Changelog

- **v1** — Initial tool.
