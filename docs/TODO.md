# TODO and watch-outs

## Open / proposed

- **Save / load projects as JSON** (scoped 2026-09-25, not started). Every
  tool already serialises its state for undo, so: a shared
  `OT.wireProject({ tool, version, get, set })` — Save downloads
  `<tool>_<stamp>.json` `{ tool, version, savedAt, state }`; Load checks the
  tool, fills missing fields with defaults, applies as one undoable step.
  Per tool ~10–20 lines (vPleat more: some state lives outside `state`).
  Templates: `templates/<tool>/` listed in a text file → "Start from
  template" dropdown. Optional: embed the JSON in exported SVGs so an export
  can be reopened. Estimate ~half a day. Open questions for the user:
  include view settings (grid, colours, stroke, dimension toggles) or
  geometry only? embed in SVG?
- **Kirigami** — not functional; not on `common/`. When it is, give it the
  backlink, tooltips, export naming, sheet/margin, grid/snap.
- Tool ideas from `scratchNodes_oritools.md`: helix generator, whirlpool;
  kirigami multiplier/array controls.
- Mountain/valley assignment (hypar has none; mirror-pleats all one colour).

## Watch out for

- **Live Server + saving exports inside the repo = page reload, work lost.**
  Save exports outside the served folder (or add them to
  `liveServer.settings.ignoreFiles` in `.vscode/settings.json`).
- **`OT.PAGE_DEFAULTS` in `common.js` duplicates `common/page-sizes.txt`**
  for `file://` use — edit both, or the dropdown differs between Live Server
  and opening from disk.
- **Mirror-pleats line params mean different things by mode**: a fraction of
  H (lines) vs mm from the centre (rays). Only `syncRayMode()` converts; any
  new code that edits `S.hors` must go through `vp`/`projT`, never assume
  `t ∈ [0,1]`.
- **Use `nx(k)`, never `k + 1`,** for "the next vertical" in mirror-pleats —
  rays wrap round. The two remaining `k + 1` uses (the linear trail loop and
  the index shift on insert) are intentional.
- **Keep flat-foldable switch-on** can push rays past neighbours on a very
  uneven layout (Undo).
- **A lone grid line deliberately loses** to points and angle rays (weight 2.5) — if snapping feels
  "sticky" or "weak", tune the weights / 10 px tolerance in `common.js`, not
  per tool.
- **vPleat export look is set in two places**: page CSS (preview) and the
  `LOOK` table in the download handler (file). Change both.
- Commit hygiene: stage explicit paths (`git add <files>`), not `commit -a` —
  the user edits files (e.g. `index.html`) in parallel.
