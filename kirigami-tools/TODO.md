# TODO / open items

## Resolved: the six-crease M/V rule table (principle 2)

~~Blocking~~ — the eight-row table was supplied by the requester on
2026-09-24 (`src/pattern6.js: SIX_CREASE_RULE_TABLE`), after one
back-and-forth to fix a transcription error (row 8 originally duplicated
row 3; the requester resent the correct row). Before accepting it, it was
cross-checked for two structural invariants any real flat-fold family
sharing this shape should have: every row has exactly 4 active
(mountain/valley) roles and 2 flat, and the 8 rows pair up into 4 exact
mountain<->valley inversions of each other. Both hold — see
`test/pattern6.test.js`.

The UI is inference-first, not selection-first, per explicit direction
from the requester: there's no "pick a pattern" dropdown. The user assigns
whatever six-role data they know; `matchPatterns()` narrows the 8 rows to
the ones still consistent; once exactly one remains, a "fill in remaining
creases" action appears (`ghostSuggestions` / `acceptGhostSuggestion`,
never auto-applied). A fully-manual assignment that matches none of the 8
rows is reported as a conflict, not silently accepted.

Verified live in-browser (2026-09-24, Playwright walkthrough): drawing a
six-crease cut, assigning roles one at a time via the Properties panel
narrows the live "N patterns still consistent" count correctly (8 -> 2 ->
1), the "Fill in remaining creases" button appears only once unique and
correctly fills the rest, and a contradictory pair (e.g. AP:mountain +
AQ:mountain) shows the conflict state with the accept button correctly
absent. Not yet exercised live: attaching real crease *geometry* to a role
via the Draw Crease tool for all six roles on one cut (only assignment via
the Properties panel dropdowns has been walked through end to end).

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
