# Codex prompt: browser-based kirigami design tool

Build a working HTML-based kirigami design tool. Start with a reliable constrained 2D editor and a data model that can later drive a kinematic 3D view. Implement and verify the app; do not merely produce a design proposal. Keep the geometry in millimetres and separate the document model, constraint logic, rendering, and export. Provide a short README explaining how to run it and what the mathematical model supports.

## The two guiding mathematical principles

### 1. Paired parallel cuts and conserved material length

A user draws a straight cut. Display candidate second cuts, parallel to the first, on either side; clicking one commits that candidate and removes the other. Permit numeric positioning as well as dragging. A fixed reference midline crosses the two cuts perpendicularly through their centres and continues over the sheet. The initial crease lies on this midline.

The crease segment between the cuts can be dragged along the cuts, remaining perpendicular to them. Its counterpart segments outside the cuts move the same distance in the opposite direction relative to the fixed midline. These changes must preserve corresponding material path lengths: the subdivisions are `a + b` and `b + a`, with equal totals. Display the measured lengths and the corresponding section profile as the geometry changes. Do not conflate the fixed reference midline with the movable crease segments.

Support fold-first construction too: drawing a valid crease derives and displays its corresponding crease; editing either updates the other while satisfying material length and locks. Show a prospective solution during dragging. If locked elements make a requested change impossible, retain the last valid state and explain which constraint conflicts.

### 2. Six potential creases around a cut

For a cut from endpoint A through an interior point B to endpoint C, and two opposed sheet sides P and Q, model the six candidate crease connections AP, AQ, BP, BQ, CP, CQ. Each candidate can be mountain, valley, or flat/no crease. The intended flat-fold pattern family has eight configurations: distribution 1–3 or 2–2 across the cut; orientation on either side; and mountain/valley inversion (2 × 2 × 2). Provide a selector for the eight patterns and infer ghosted crease suggestions from user-drawn or snapped lines and assigned fold types when the pattern is determined.

**Mathematical specification gate:** The description above identifies the eight patterns but does not enumerate the six M/V/flat assignments for each pattern, precisely define P/Q for arbitrary cut orientation, or prove flat foldability. Do not invent this table or treat all `3^6` assignments as valid. Put the eight patterns behind an explicit, inspectable rule table with diagrams and validation cases. If the assignments cannot be rigorously derived from the given principle, implement the six-crease representation and an honest “pattern needs definition” state, document the unresolved assignments, and keep automatic completion disabled until that table is supplied or verified. Preserve useful functionality from principle 1.

## Editor and interactions

- Sheet defaults to A4, 210 × 297 mm. Offer portrait/landscape, standard sizes, and custom width and height. All geometry and export dimensions use mm; zoom affects display only.
- Show a configurable major/minor grid. Grid visibility and snapping are independent switches. Snap to grid points, endpoints, midpoints, intersections, cuts, creases, and sheet centre where applicable. Give clear snap feedback.
- Infer and display constraints while drawing/snapping (parallel, perpendicular, coincident, equal distances, etc.). Also let users apply and remove ordinary constraints explicitly. Distinguish required kirigami rules from removable user constraints.
- Select individual cuts and crease segments; numerically edit positions, lengths, angles, and offsets. Provide lock/unlock for cuts and folds independently, including reference elements that remain fixed while connected unlocked geometry updates.
- Use distinct semantic and visual types: cut, mountain crease, valley crease, and construction/reference line. Permit mountain/valley reversal and inversion of a unit's pop direction. Show constraint icons and indicate why invalid constructions are invalid.
- Permit nested pop-outs in either creation order: build a child inside an existing parent surface, or enclose an existing unit with a new parent. Track parent/child relations and surface ownership, not merely intersecting SVG lines. Flag children that leave the supporting surface, conflicting cuts, zero-width regions, and impossible crease offsets.
- Let users array a completed unit using a defined direction vector, count, and spacing. Preserve internal constraints. Support linked instances and detaching one instance. Mirror about a selected axis.
- Provide undo/redo, duplicate, delete, multiselect, grouping, alignment/distribution, and reset of displaced folds to the reference midline. Operations must preserve or report geometric validity.
- Provide a hierarchy panel for the sheet and nested units. A section view of the selected unit updates live, showing `a | b` against `b | a` and their conserved sum. Hover/select either edge of a cut to highlight its corresponding edge; link those highlights with the section diagram.
- Use a clear 2D design canvas with pan and zoom. Store model objects and relationships rather than treating SVG strokes as the source of truth.

## Export and saving

- Export SVG at true physical scale in mm with separate named groups for CUT, MOUNTAIN FOLD, VALLEY FOLD, and REFERENCE. Give each type a distinct configurable colour/style.
- Provide export checkboxes for which line sets are included, especially reference lines; optionally include sheet boundary and registration marks. Grid is an editing aid and excluded from fabrication output by default.
- Include a document save/load format that preserves sheet dimensions, geometry, locks, constraints, arrays, hierarchy, line types, and future 3D topology. A reloaded document should behave like the original.
- Avoid duplicated overlapping strokes and decorative artifacts in fabrication SVG. Verify SVG dimensions and coordinate integrity with an export/reimport check.

## 3D preview: architectural provision, deferred implementation

Do **not** make 3D preview a V1 delivery requirement. Design the model to retain face adjacency, cut boundaries, crease hinges, mountain/valley direction, nested surface ownership, and parent transforms. Document how a future live 2D/3D view could use a single fold-angle control, orbit/pan/zoom, and selection highlighting. A credible future preview must solve joined faces and nested transformations; simply extruding 2D strokes is insufficient. Physical paper thickness, bending, and collision simulation are outside this brief. Fold angle/state may be added when needed for this preview; mountain/valley classification is enough for the initial 2D editor.

## Implementation and acceptance

Use a maintainable browser stack appropriate to a standalone HTML app; choose SVG or canvas for interaction and SVG for fabrication export. Document coordinate conventions and the assumptions behind the paired-cut construction. Include meaningful tests for conserved length under drag and numeric edits, opposite fold movement, locks, array/mirror transformations, nesting validity, undo/redo, saved-file round trips, and physical-scale SVG export. Add a few example documents that demonstrate a basic paired-cut pop-out, a nested construction, and an array. Make invalid and under-specified cases visible instead of silently “fixing” geometry.

Start by inspecting the current project if one exists. Implement iteratively, run the available checks, and report completed behavior, known limitations, and any missing mathematical definition needed to enable the eight-pattern auto-generator.
