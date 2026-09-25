# Hypar Generator

Offline, dependency-free single-file HTML tool (`index.html`, open directly —
no build, no server) that turns a convex polygon into a hypar crease pattern:
concentric inward offsets ("contours") all the way to the centre, plus a
diagonal from every corner.

## Using it

- **Sheet** — the paper the polygon sits on (default 270 × 270 mm): a size
  preset, ⇄ to swap portrait/landscape, or W × H typed in. Resizing keeps the
  polygon where it was relative to the sheet centre. **Margins** (5–15 mm,
  ↔ left & right and ↕ top & bottom, 🔗 keeps them equal): the polygon,
  contours and diagonals are cropped at the margin line, which is exported as
  a cut. **Fit to grid** puts each margin line on the nearest grid line; the
  margin edges (blue bars) can also be dragged at any time — they snap to the
  grid (Alt = free) and the status bar shows the working area in grid steps.
  Changing a margin doesn't move the polygon. The export is the whole sheet at true size; the sheet
  outline itself is not exported. A closed outline stays one `<polygon>` while
  it is wholly inside the margin, and becomes its surviving edge pieces once
  cropped.
- **Define the polygon** — with *Regular polygon* on, drag on empty canvas:
  the press point is the centre, the drag sets radius and rotation. Sides,
  radius (mm) and rotation (°) are also numeric fields. Drag the ◆ to move
  the whole polygon, or any corner to resize/rotate it.
- **Regular polygon off** — corners become free; drag them to make an
  irregular polygon. Corners stop at the last position that keeps the polygon
  convex. Switching back on adopts the current centroid / mean radius so the
  shape doesn't jump (edits are lost; Undo restores them). Changing *Sides*
  resets to a regular shape.
- **Offset width** (mm) — spacing between contours.
- **Centre cut** — off: every contour is a fold and the diagonals run to the
  centre. On: the innermost contour becomes a cut line and the diagonals stop
  at it.
- **Ghost lines** (grey, screen only) — see below.
- Wheel zooms, right/middle-drag pans, *Fit view* re-frames. Ctrl+Z /
  Ctrl+Shift+Z undo/redo (80 steps).

**Export** — SVG (true mm, 1:1), PNG (px/mm), or a ZIP with both; file names
are time-stamped (`hypar_2026_0925_143012.svg`). Cut = black (outer boundary,
and the innermost contour when centre cut is on), fold = green (contours and
diagonals). Cut/fold colours and stroke width are settable. The SVG has two
layers, `<g id="fold">` and `<g id="cut">`. Ghost lines and handles are not
exported. Closed outlines are `<polygon>`s so laser software sees one closed
path.

**Project** — Save… / Load… a `.json` (sheet, polygon, contours settings, grid &
snap) or an exported `.svg` (it carries the same data), or drop either onto the
page; *Templates…* lists `templates/index.txt`. Loading is one undo step.

## How it works

- **Contours** — the polygon clipped (Sutherland–Hodgman) by every edge's
  half-plane pushed inward by *k·d*, for k = 1, 2, … until the result has no
  area. For a convex polygon this is exactly the offset wavefront, and edges
  that vanish as it shrinks simply drop out, so no straight-skeleton code is
  needed.
- **Diagonals** — each corner's interior angle bisector, as a full ray to the
  polygon boundary. It is drawn solid up to the **first** other bisector ray
  it crosses, and as a grey ghost from there to the **last** one it crosses
  (crossings outside the polygon are ignored). In a regular polygon all rays
  meet at the centre, so there is no ghost.
- **Centre cut** — the diagonal is additionally stopped where it enters the
  innermost contour (ghost too).

## Decisions

- **Convex only.** Offsetting a concave polygon needs a full straight
  skeleton (reflex vertices, split events). Hypars are convex anyway, so
  dragging is constrained instead. Collinear corners and self-winding stars
  are also rejected.
- **Regular is just a way of generating the corners** — regular and irregular
  share one geometry path.
- **Ghost = other bisectors' *full rays*, not their trimmed solid parts.**
- **All folds one colour** (no mountain/valley assignment yet).
- **Plain SVG, no libraries**, same conventions as [mirror-pleats](../mirror-pleats/README.md).

## Known limitations / watch out for

- Contours are capped at 400; a status line says so (raise the offset width).
- A contour smaller than 1e-4 mm² is treated as collapsed, so with centre cut
  the "innermost contour" can be a very small polygon if the offset width
  nearly divides the inradius.
- In an irregular polygon, contour vertices after an edge collapses no longer
  lie on the original diagonals; the diagonals are the *initial* bisectors
  only, as specified — not the full straight skeleton.
- No mountain/valley assignment, no dimensions/measure tool.

## Changelog

- **v1** — Regular/irregular convex polygon, contours, first/last-crossing
  diagonals with ghost, centre-cut toggle, SVG/PNG export.
- **v2** — Shared origami-tools features (see the top-level README): backlink,
  thinner lines, tooltips, time-stamped SVG/PNG/ZIP export. New: a sheet
  (presets, 270 × 270 default) with a margin that crops everything and is
  exported as a cut; export is now the whole sheet. Square grid; snapping of
  corners, ◆ and new-polygon centre (rotation / edge angles to 15°/22.5°).
