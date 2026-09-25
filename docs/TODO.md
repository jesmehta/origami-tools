# TODO and watch-outs

## Open / proposed

- ~~Save / load projects as JSON~~ — **done 2026-09-25** (`a9823e7` …
  `1c5b09e`); see DECISIONS § Projects. Possible follow-ups: more templates;
  a version-migration function the first time a tool's state shape changes
  (files carry `version: 1`); vPleat undo only covers the curve, so undoing a
  load there is partial.
- **Kirigami** — not functional; not on `common/`. When it is, give it the
  backlink, tooltips, export naming, sheet/margin, grid/snap.
- Tool ideas from `scratchNodes_oritools.md`: helix generator, whirlpool;
  kirigami multiplier/array controls.
- Mountain/valley assignment (hypar has none; mirror-pleats all one colour).

## Watch out for

- **Changing a tool's state shape breaks nothing silently only if** new
  fields have start-up defaults — a load merges the file over the defaults
  (`Object.assign(S, defaults, file)`). Renaming or re-meaning a field needs a
  `version` bump and a migration in the tool's `set`. The template JSONs in
  `*/templates/` are real project files and must be regenerated (or migrated)
  too.
- **Project files are checked by `tool` name** — `mirror-pleats-linear` and
  `mirror-pleats-radial` are different tools on purpose.

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
