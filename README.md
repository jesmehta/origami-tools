# Origami Tools

A collection of small, self-contained tools for origami/folding-based
design and fabrication.

Open **[index.html](index.html)** for a browsable landing page with a
thumbnail and link for each tool below.

## Tools

- **[V-Pleat Fold Pattern Visualiser](vPleat-visualiser/index.html)** —
  turns a hand-drawn curve into a flat, laser/CNC-ready V-pleat fold
  pattern. Single HTML file, no build step — open it directly in a
  browser. See [vPleat-visualiser/README.md](vPleat-visualiser/README.md)
  for how it works and the design decisions behind it.

- **[Mirror Pleats](mirror-pleats/index.html)** — draw verticals across a
  rectangle, draw lines between them, and each vertical mirrors those lines
  onward to build a trail of V-pleats. Separate
  [linear](mirror-pleats/linear.html) and
  [radial](mirror-pleats/radial.html) pages, ordered and random layouts,
  dimensions/measuring, SVG/PNG export. See
  [mirror-pleats/README.md](mirror-pleats/README.md).

- **[Hypar Generator](hypar/index.html)** — drag out a regular (or
  free-cornered convex) polygon, get concentric offset contours and corner
  diagonals to the centre, with an optional centre cut. SVG/PNG export. See
  [hypar/README.md](hypar/README.md).

- **[X Span Generator](x-span/index.html)** — a lattice of rhombi inside a
  rectangle whose vertices all lie on vertical lines (the vertical diagonals).
  Regular mode: evenly spread verticals, straight lines, defined by angle or
  number of chains. Irregular mode: free verticals, the lines bend at each one
  while the tiling stays continuous. Measure, dimensions, SVG/PNG export. See
  [x-span/README.md](x-span/README.md).

- **[Kirigami Design Tool](kirigami-tools/index.html)** — a 2D editor for
  cut/fold pop-up patterns: paired parallel cuts with a conserved-length
  sliding crease, plus a six-candidate-crease representation around a bent
  cut. Parametric document model, locks, nesting, array/mirror, undo/redo,
  true-scale SVG fabrication export, JSON save/load. See
  [kirigami-tools/README.md](kirigami-tools/README.md).

## Documentation

Architecture, interface conventions, the math, design decisions, TODO and
conversation logs: [docs/](docs/README.md).

## Shared code (`common/`)

Features common to the tools (backlink to this page, and more as they are
added) live in `common/common.js` + `common/common.css`, loaded by each tool
before its own code. It is a plain script that defines one global, `OT` — no
modules, no build — so the tools still open straight from disk. Kirigami does
not use it (yet).

### Shared-features changelog (all tools except kirigami)

- Backlink "← Origami tools" at the top of every tool page.
- On-screen strokes halved (pattern, sheet, ghost, dimension, measure and
  handle outlines). Export stroke width is unchanged — it is a fabrication
  setting with its own field.
- Sidebar explanations moved into hover tooltips (`data-tip`): sections with
  one show ⓘ after their heading; mode buttons carry their own how-to. The
  one-line hint in the status bar under the canvas stays.
- Export: SVG, PNG, and ZIP (both together). Every file name carries a
  local-time stamp, `<tool>_YYYY_MMDD_HHMMSS.svg|png|zip`; a ZIP's two files
  share its stamp. JSZip is loaded from cdnjs only when a ZIP is first
  requested. (vPleat already exported a ZIP; its names now carry the stamp.)
- Sheet size presets: a *Size* dropdown plus ⇄ (swap portrait/landscape) next
  to W × H. The list is read from `common/page-sizes.txt` — one
  `name, width, height` line per size; add your own there. Opened from disk
  (no server) the browser can't read that file, so the built-in copy in
  `common.js` is used. Hypar now has a sheet too (it had none).
- Margins, 5–15 mm (default 10): **↔** left & right and **↕** top & bottom,
  each symmetric, 🔗 to keep them equal (the default). *Fit to grid* and a
  *Margin* edit mode (drag the edges, snapping to grid lines) put the margin
  lines on the grid so the working area is a whole number of grid steps —
  one value can't usually do that on both axes, hence two. Radial (polar
  grid) and vPleat (no grid) have no fitting. The pattern is
  cropped at the margin line; the export is the whole page at true size with
  the margin outline as the cut line (plus the folds as before), and no page
  outline. On screen the page is white on a grey canvas. In mirror-pleats and
  x-span the model's rectangle *is* the area inside the margin, so all the
  geometry (fit edge to edge, layouts, tiling) fills that area; changing the
  margin keeps the page size and rescales the pattern. vPleat exports only the
  pattern, so there the margin shrinks the area the pattern must fit (status
  and auto-fit) and is drawn as an inner guide.
- Grid (screen only, never exported, clipped to the page): square, every
  *Spacing* mm through the sheet centre (every 5th line darker) in
  mirror-pleats linear, x-span and hypar; polar on the radial page — rings
  every *Rings* mm and spokes every *Spokes*° around the ◆ centre, following
  it (7.5° default, so every snap angle — see below — has a spoke; multiples
  of 45° darker). vPleat has no grid (its curve is drawn freehand).
- Snapping (*Snap* checkbox in the Grid & snap panel; hold **Alt** while
  dragging to place freely). Candidates within ~10 px, nearest wins:
  existing points (sheet corners/centre, vertical ends, trail vertices —
  weighted to win ties), rays at every multiple of 15° and 22.5° from the
  relevant anchor, grid crossings / ring×spoke points while the grid is shown,
  and only if none of those is in range, a single grid line. An orange ring
  marks the snap. **Moving a whole thing** (a line, a vertical, the hypar ◆)
  snaps whenever any of its end handles can: each end is tried and the whole
  thing shifts by the smallest correction. What snaps where:
  - mirror-pleats: line handles slide along their vertical and snap there
    (the line's angle from its other end, grid-line and ring crossings,
    vertices); dragging a line's body snaps whichever end can snap; linear
    vertical ends/bodies snap along the edge (tilt angle, grid, other
    verticals; a body by either end); a free radial vertical's body by an end
    on the top/bottom edge; radial verticals through the centre snap their
    direction (snap angles + polar spokes); free radial ends snap along the
    outline; the ◆ snaps to sheet/page corners, edge midpoints and centre.
    This replaces the old "Snap lines to 45°" checkbox.
  - x-span: vertical x, the lattice angle θ (drag), chain-height handles and
    the grid y offset (grid lines, sheet edges/centre).
  - hypar: new-polygon centre, ◆ (moving the polygon: the centre or any
    corner, whichever is nearest a target), corners — regular: rotation snaps to the
    snap angles about the centre; free: edge angles from both neighbours.
- Projects: a *Project* panel with **Save…** (`<tool>_<stamp>.json`),
  **Load…** (a .json, or an .svg these tools exported — the project is
  embedded in every exported SVG as `<metadata id="ot-project">`), a
  *Templates…* dropdown (when the tool has a `templates/` folder), and
  drag-and-drop of a .json/.svg onto the page. A project holds the geometry and
  the Grid & snap settings; colours, stroke width and PNG density come from the
  page's current settings. A load is one undo step. In mirror-pleats, x-span, hypar
  and vPleat.

## License

GPL-3.0 — see [LICENSE](LICENSE).
