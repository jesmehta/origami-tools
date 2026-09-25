# Architecture

## Layout

```text
origami-tools/
  index.html                 landing page (cards + thumbnails in assets/thumbnails/)
  common/
    common.js                shared helpers, one global: OT
    common.css               shared styles (backlink, tooltip, select)
    page-sizes.txt           sheet presets: "name, width, height" per line
  mirror-pleats/
    linear.html, radial.html set window.MODE, load common + core.js
    core.js, core.css        the whole engine (both modes)
  x-span/index.html          single file (HTML + CSS + script)
  hypar/index.html           single file
  vPleat-visualiser/index.html  single file, uses Paper.js + JSZip (cdnjs)
  kirigami-tools/            ES modules + tests; does NOT use common/ (not functional yet)
  docs/                      this folder
```

No build step, no package manager (except kirigami's tests). Every page is
plain HTML that opens from disk or from any static server (Live Server, GitHub
Pages). Anything that must `fetch` a file (`page-sizes.txt`) degrades to a
built-in default when opened from `file://`.

## `common/common.js` — the `OT` API

A classic script (not a module) so it works from `file://`; loaded in each
tool's `<head>`, before the tool's own script.

| Area | API | Notes |
|---|---|---|
| Tooltips | `data-tip="…"` on any element | One floating `<div>` on `<body>`; text read at hover time, so a tool can change a tip by setting `el.dataset.tip` (mirror-pleats/x-span do this per mode). Legends / h2 with a tip get a ⓘ via CSS. |
| Export | `OT.stamp()` → `YYYY_MMDD_HHMMSS` · `OT.download(blob, name)` · `OT.svgToPng(svg, wmm, hmm, ppm)` → Promise<Blob> · `OT.jszip()` (lazy-loads JSZip from cdnjs) · `OT.wireExport({ base, svg(bg), size() })` | `wireExport` binds `#xSvg`, `#xPng`, `#xZip`; PNG density from `#ppm`. The ZIP's two files share one stamp. |
| Sheet presets | `OT.pageSizes` (Promise of `[name, w, h][]`) · `OT.wireSheet({ get(), set(w, h) })` → `sync()` | Binds `#pgSel` + `#pgSwap`. `sync()` reselects the matching preset (either orientation) or "Custom"; tools call it from `syncUI()`. |
| Grid | `OT.gridFieldset(polar)` → HTML · `OT.gridCfg()` · `OT.wireGrid(render)` · `OT.gridSVG(pageBox, origin, polar)` | `gridSVG` also records `OT._grid = { origin, polar }` for snapping; clipped to the page with a `<clipPath>`. |
| Snapping | `OT.snapping(e)` · `OT.snapOnLine(p, A, d, o)` → s · `OT.snap2D(p, o)` → [x, y] · `OT.snapDir(C, p, tol)` → degrees · `OT.snap1D(v, values, tol)` · `OT.gridLines(axis, v)` · `OT.snapMark(px)` · `OT.SNAP_DEG` | `o = { tol, points, anchors, grid }`. See [MATH.md § Snapping](MATH.md#snapping). `OT.lastSnap` holds the snapped point for the orange marker. |

`OT.PAGE_DEFAULTS` mirrors the first lines of `page-sizes.txt` — keep them in step.

## Tool anatomy (mirror-pleats, x-span, hypar share this shape)

```text
S   = model state (plain JSON-able object)      UI = view state (mode, selection, drag, toggles)
snap() / restore() / pushUndo() / act(fn)       80-step undo of JSON snapshots of S
compute…()                                      geometry from S (pure)
render()                                        rebuilds the whole <svg id="cv"> innerHTML each time
updateStatus()                                  one-line hint + analysis under the canvas
syncUI()                                        S → sidebar fields (never overwrites the focused field)
pointerdown / pointermove / endDrag             hit-test → drag → mutate S → render
buildSVG(bg)                                    export string, true mm, page-sized
```

- **Full re-render** on every change: the drawings are small (hundreds of
  lines), so rebuilding SVG markup is simpler and fast enough.
- **`vector-effect="non-scaling-stroke"`** on screen, so on-screen line widths
  are in screen px regardless of zoom; export uses the mm stroke from `#sw`.
- **Coordinates are mm.** In mirror-pleats and x-span the origin is the
  top-left of the **area inside the margin** (`S.W × S.H`); the page is
  `(−m, −m)` to `(W + m, H + m)`. Hypar keeps page coordinates (origin at the
  page corner) and crops against `[m, W−m] × [m, H−m]`.
- **`UI.snap`** is set on every pointer event from `OT.snapping(e)` (checkbox
  on and Alt not held); the tool's snap helpers read it.

### mirror-pleats state

```js
S = { W, H, m,                 // area inside the margin, margin
      verts: [...],            // line mode: {xt, xb} (x at y=0 and y=H) · ray mode: {a} (degrees)
      hors: [{k, a, b}],       // line between vertical k and nx(k); a, b = fraction of H (lines) or mm from centre (rays)
      layout, centre, cap, enforce, rays, kaw, minGap, gen }
```

`RAYS()`, `nx(k)`, `vp(v, t)`, `reflectPt`, `rayVert`, `vSeg`, `visT`,
`vView`, `byAlong` hide the line/ray difference; everything above them
(trail, handles, snapping, layouts, measuring) is shared. `syncRayMode()` is
the only place that switches representation.

### x-span / hypar / vPleat

- x-span: `S.xs` (vertical x's), rhombus definition, per-row height ratios,
  y offset — see [x-span README § The lattice](../x-span/README.md#the-lattice).
- hypar: `S.pts` polygon (+ regular params `n, R, rot, c`), offset width,
  centre cut, sheet `W, H, m`.
- vPleat: a different shape — four tabs, Paper.js canvases for tabs 1–2,
  raw SVG for 3–4, global `state`. It uses `OT` for tooltips, stamp, sheet
  presets only. See its [README](../vPleat-visualiser/README.md).

## Export

- Mirror-pleats / x-span / hypar: `buildSVG` emits a document the size of the
  **page** (`width="…mm"`), viewBox offset so the margin rectangle sits in
  place, margin outline in the cut colour, pattern lines in the line/fold
  colour. PNG = the same SVG rasterised on a white background.
- vPleat: pattern only (no page), stroke styling baked in as attributes at
  export time (the preview styles by CSS class, which a saved file doesn't carry).

## Testing

No test harness for these tools (kirigami has its own). Changes were checked
with throw-away Playwright scripts: load every page, click every sidebar
button/checkbox, drag across the canvas, fail on any console/page error;
plus targeted checks (angle snapping lands on 30°/45°/22.5°, Alt bypasses it,
ray-mode Kawasaki status, exported file names and ZIP contents). The pattern
is in [conversations/2026-09-25-shared-features.md](conversations/2026-09-25-shared-features.md).
