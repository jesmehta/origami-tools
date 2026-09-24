# TODO / open items

## Blocking: the six-crease M/V rule table (principle 2)

`src/pattern6.js` implements the six-crease data model (AP, AQ, BP, BQ, CP,
CQ around a cut A-B-C) and the eight-pattern *selector* (1-3 / 2-2
distribution x P/Q orientation x M/V inversion), but `SIX_CREASE_RULE_TABLE`
is intentionally left `null`. The source prompt's principle 2 names the
eight configurations without enumerating which mountain/valley/flat
assignment across the six roles actually produces each one, and doesn't
prove any of them flat-foldable — see the "Mathematical specification gate"
paragraph in `kirigami_design_tool_codex_prompt.md`.

Per agreement with the requester (2026-09-23): leave this as an honest gap
for now. The UI lets a user manually assign each of the six roles
(flat/mountain/valley) and shows a "pattern needs definition" status when a
pattern is selected; ghost-suggestion/auto-completion stays disabled.

**When the eight assignments are supplied:**
1. Populate `SIX_CREASE_RULE_TABLE` in `src/pattern6.js` (pattern id ->
   `{AP, AQ, BP, BQ, CP, CQ}`).
2. Wire `ghostSuggestions()` into the canvas so selecting a pattern ghosts
   the five unassigned roles once one is drawn, matching principle 1's
   "infer ghosted crease suggestions" requirement.
3. Add test cases per pattern (flat-foldability sanity: Kawasaki/Maekawa-
   style checks if applicable) to `test/pattern6.test.js`.
4. Also worth confirming at that point: whether our P/Q side convention
   (`sideOfPoint` in `pattern6.js`, left/right of A->B->C) matches what the
   requester has in mind, since the source principle didn't pin this down
   either — it's currently *our* assumption, not given.

## Other known gaps (see also README "Known limitations")

- No generic arbitrary-constraint system (coincident/equal-distance between
  freely chosen elements). Paired-cut units are parametric by construction,
  which enforces the *required* kirigami rules automatically, but there's
  no removable "ordinary constraint" object model beyond alignment/
  distribution one-shot operations and snapping.
- Nesting containment (`nestingValidity`) only understands a `pairedCut`
  parent's inner-strip surface. A `sixCreaseCut` parent has no defined
  "surface" polygon yet, so children nested under one aren't checked for
  containment.
- 3D preview is explicitly out of scope for v1 per the prompt; `topology3D`
  is reserved in the document schema but unused.
- Six-crease crease geometry (`creaseRefs`) is attached to a role by
  proximity classification (`classifyDrawnCrease`) with a fixed mm
  tolerance; there's no drag-editing of an already-attached crease segment
  yet (delete and redraw instead).
- Rotation/length/spacing dragging exists via canvas handles (see README
  "Interaction model"), but there's no drag handle for `flapLength` — it's
  numeric-field-only.
