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

## License

GPL-3.0 — see [LICENSE](LICENSE).
