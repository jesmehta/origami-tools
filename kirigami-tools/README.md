# Kirigami Design Tool

A browser-based 2D editor for kirigami (cut + fold) pop-up patterns, built
around two constructions: **paired parallel cuts** with a conserved-length
sliding crease, and a **six-candidate-crease** representation around a
bent cut (`A-B-C`). Document model, constraint math, rendering and export
are separate modules; the SVG canvas and the fabrication export are both
views over the same plain-JSON document — neither is the source of truth.

Built from [kirigami_design_tool_codex_prompt.md](kirigami_design_tool_codex_prompt.md);
see that file for the original brief, and [TODO.md](TODO.md) for the one
deliberately unresolved piece (the six-crease mountain/valley rule table).

## Running it

- **The editor**: open [index.html](index.html) directly in a browser (or
  serve the folder over any static file server — plain `<script
  type="module">`, no build step, no install). Loading it via `file://`
  works in most browsers; if your browser blocks module scripts over
  `file://`, run e.g. `python -m http.server` in this folder instead.
- **Unit tests** (document model, constraint math, pattern/export logic —
  no DOM needed): `npm test` (just `node --test`, zero dependencies, no
  `npm install` required).
- **Rendering sanity checks** (the render.js layer, which needs a real
  DOM): open [tests.html](tests.html) directly in a browser.
- **Regenerate the example documents**: `node examples/generate-examples.mjs`.

## Coordinate conventions

All geometry is in millimetres. Y increases downward (SVG convention). The
sheet origin `(0,0)` is its top-left corner. Zoom/pan are display-only —
they change the canvas `viewBox`, never the stored coordinates. Canvas
line strokes use `vector-effect="non-scaling-stroke"` so they stay visible
at any zoom level; this is an editing-display convenience only — exported
fabrication SVG uses true physical stroke widths in mm and is otherwise at
1:1 scale (`viewBox="0 0 <width> <height>"`, `width="<width>mm"`).

## Principle 1: paired parallel cuts and conserved length

A **paired-cut unit** (`src/model.js: createPairedCutUnit`) is stored
*parametrically*, not as four free endpoints:

- `origin`, `rotation` — placement and the direction the two cuts run in
  (`cutDir`); `crossDir = perp(cutDir)` is the midline direction.
- `cutLength` — shared by both cuts (equal-length and parallelism are
  enforced by construction: there's no way to represent a state that
  violates them).
- `spacing` — distance between the two cuts along `crossDir`.
- `creaseOffset` (`d`) — signed distance the crease attachment point sits
  from each cut's centre, along the cut (`cutDir`).

With `h = cutLength / 2`, the inner crease (between the cuts) attaches at
offset `+d` on both cuts, splitting each cut into `a = h - d` and
`b = h + d` (summing to `cutLength`). Its **counterpart** creases —
"outside the cuts", i.e. the fold lines continuing across the rest of the
sheet — attach at the mirrored offset `-d` on the *same* cuts, splitting
them `b, a` (swapped order), summing to the same total. That identity
(`a+b == b+a == cutLength`, always, for any `d`) is the "conserved
material length" the brief describes: it isn't something the tool solves,
it falls straight out of the `+d` / `-d` construction. What the tool
*does* do is display it live (Properties panel + Section profile) and
enforce the physical bound: dragging or setting `d` is clamped to
`|d| <= h - MIN_WIDTH_MM` (`MIN_WIDTH_MM = 1`) so neither subdivision, nor
the cut itself, can collapse to zero width.

Locks are independent per the brief: `locks.cuts` freezes cut
length/spacing/rotation/position; `locks.crease` freezes `d`. An edit that
would violate a *locked* element is rejected outright with a reason
(`constraints.js: trySetCreaseOffset` / `trySetCutLength` / `trySetSpacing`)
and the caller keeps the last valid state, per the brief. An edit that
only affects *unlocked* geometry (e.g. shrinking `cutLength` while `d` is
unlocked) auto-clamps `d` to the new bound instead of rejecting.

Both cut-first (draw a cut, pick one of two parallel candidates for the
second) and fold-first (drag the crease handle, or use the Draw Crease
flow once cuts exist) end up setting the same `d` parameter, so "editing
either updates the other" is automatic.

## Principle 2: six candidate creases, and pattern inference

A **six-crease cut** (`src/pattern6.js`) stores a bent cut `A -> B -> C`
and six roles — `AP, AQ, BP, BQ, CP, CQ` — each independently
`flat | mountain | valley | (unset)`. `P`/`Q` are left/right of the
`A->B->C` polyline by signed cross product (`sideOfPoint`), confirmed with
the requester as the intended convention.

The brief's own "Mathematical specification gate" said not to invent the
six-role assignment for each of the eight flat-fold configurations it
names — that table has since been supplied by the requester (2026-09-24)
and lives in `SIX_CREASE_RULE_TABLE`. Before accepting it, it was
cross-checked for two invariants it should have if it's a real flat-fold
family: every row has exactly 4 active (M/V) roles and 2 flat ones, and the
8 rows pair up into 4 exact mountain<->valley inversions of each other —
both hold (see `test/pattern6.test.js`; one row was corrected in a
back-and-forth with the requester before it did).

There is **no pattern-selector dropdown** — the requester's intent is
inference from partial input, not pre-selection: assign as many of the six
roles as you know (Properties panel, or draw a line near `A`/`B`/`C` with
the Draw Crease tool — `classifyDrawnCrease`, 3mm tolerance, links geometry
to a role without implying a fold type). `matchPatterns()` narrows the 8
known rows down to the ones still consistent with what's assigned; the
Properties panel shows the live count. Once exactly one row remains
consistent, a "Fill in remaining creases" button appears
(`ghostSuggestions` / `acceptGhostSuggestion`) — it's never applied
automatically, per "make invalid state visible, don't silently fix it": if
assignments are contradictory (zero rows match) that's reported as a
conflict, not corrected.

## Interaction model

Tools (left panel): **Select**, **Paired Cut**, **Six-Crease Cut**, **Draw
Crease** (attaches a line to a role on the selected six-crease cut),
**Mirror**, **Pan**. Mouse wheel zooms (to-cursor) in any tool.

For a selected paired-cut unit, canvas drag handles cover: the two crease
endpoints (`d`), all four cut endpoints (`cutLength`, symmetric about each
centre), the cut-1 body (translate the whole unit), the cut-2 body
(`spacing`), and a handle on the midline's far end (`rotation`). Origin,
rotation, cut length, spacing, `d` and flap length are also numeric fields
in the Properties panel — every geometric parameter is editable both ways
except flap length, which is numeric-only (see Known limitations).

Hovering a cut edge highlights it and its handle in green; selecting a
unit halos it in orange; a geometrically invalid unit (via
`isPairedCutValid` or `nestingValidity`) halos red and is flagged in the
hierarchy panel, per "make invalid cases visible instead of silently
fixing geometry."

## Files

| File | Purpose |
|---|---|
| `index.html`, `style.css`, `src/main.js` | App shell |
| `src/geom.js` | Vector/geometry primitives |
| `src/model.js` | Document schema, factories, derived geometry |
| `src/constraints.js` | Paired-cut math, nesting validity, array/mirror transforms, array linking |
| `src/pattern6.js` | Six-crease cut model, the 8-row rule table, pattern-matching/inference |
| `src/history.js` | Snapshot-based undo/redo |
| `src/export.js` | Save/load JSON, fabrication SVG export + self-check |
| `src/render.js` | Pure document+view -> SVG/HTML string rendering |
| `src/app.js` | State, interaction, DOM wiring |
| `tests.html` | Zero-dependency browser rendering sanity checks |
| `test/*.test.js` | `node --test` unit tests (model/constraints/pattern6/export/history/examples) |
| `examples/*.json` | Example documents (see below); `generate-examples.mjs` regenerates them |

## Decisions

- **Paired-cut units are parametric** (origin/rotation/length/spacing/`d`),
  not free endpoints + a constraint solver. This makes the required
  kirigami rules (equal length, parallel, perpendicular crease) impossible
  to violate by construction instead of something to check, at the cost of
  a from-scratch drag-to-parameter mapping for each handle (see
  `app.js: applyDrag`).
- **Undo/redo is whole-document snapshots**, not a command/delta stack.
  The document is small (a handful of units, not thousands of strokes), so
  this is simpler and more reliably correct than tracking inverses per
  operation.
- **Tests run on Node's built-in `node:test`**, zero npm dependencies —
  chosen over a browser-only test page or a real npm test framework as the
  middle ground: real assertion/failure ergonomics without adding a
  dependency or lockfile to an otherwise zero-dependency static-site repo.
  DOM-dependent rendering is covered separately by `tests.html`.
- **Mirror creates a copy**, it doesn't transform the selection in place —
  consistent with Array also creating copies, and it's the more common
  meaning of "mirror" as a CAD operation.
- **Array instances are linked by default** (`arrayOf: {sourceId, index}`):
  editing the source's shape parameters (not placement) propagates to
  every linked instance (`constraints.js: syncAllArrayLinks`, run after
  every commit). "Detach" (Properties panel, when an instance is selected)
  clears the link, making it independent.
- **Canvas strokes are non-scaling** (constant pixel width regardless of
  zoom) for editability at any zoom level; fabrication SVG export uses
  true mm stroke widths and is a fully separate render path
  (`export.js`), so this choice never touches exported geometry.

## Known limitations

See [TODO.md](TODO.md) for the principle-2 rule table gap (the main one)
and the full list. Summary:

- No generic arbitrary-constraint system (coincident/equal-distance between
  freely chosen elements) — only the kirigami-required rules (enforced by
  construction) and snapping/alignment/distribution as one-shot operations.
- Nesting containment checks only understand a `pairedCut` parent's inner
  strip; a `sixCreaseCut` parent has no defined surface polygon yet.
- 3D preview is out of scope for v1 by design (see the brief); a
  `topology3D` field is reserved in the document schema but unused.
- Flap length has no drag handle (numeric field only).
- A six-crease role's attached line can't be drag-edited once placed;
  delete and redraw.

## Example documents

Generated by `examples/generate-examples.mjs` (and covered by
`test/examples.test.js`, which checks each one loads, is geometrically
valid, and round-trips through save/load):

- `basic-paired-cut-popout.json` — a single paired-cut unit, off-midline
  crease, centred on an A4 sheet.
- `nested-construction.json` — a large paired-cut unit with a second,
  rotated paired-cut unit nested inside its inner (popped) strip.
- `array-example.json` — a source unit plus three linked array instances.

## Changelog

- **v1** — Initial implementation: paired-cut editor (draw, drag, lock,
  numeric edit, section view, nesting, array, mirror, undo/redo), the
  six-crease data model with the eight-pattern rule table left unpopulated
  pending verified data, SVG fabrication export with an export/reimport
  self-check, JSON save/load, pan/zoom.
- **v1.1** — The eight-pattern M/V rule table supplied and verified
  (4-active/2-flat and mountain<->valley-inversion-pairing invariants both
  hold); replaced the pattern-selector dropdown with live inference —
  `matchPatterns()` narrows the 8 rows by whatever's been assigned so far,
  and a "fill in remaining creases" action appears once exactly one row is
  still consistent. Fixed a pan/zoom gap (spec required it, initial pass
  missed it) and a mirror-tool bug where the mirrored copy silently shared
  the original's id instead of getting its own.
