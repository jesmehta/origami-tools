# Design decisions

Cross-tool decisions, what was rejected, and why. Per-tool decisions are in
each tool's README (e.g. mirror-pleats § Decisions).

## Shared code

- **One shared `common/` script, not copies per tool.** Chosen 2026-09-25
  over duplicating the grid/snap/tooltip/export code into four files. Cost:
  a tool is no longer one self-contained file you can copy away on its own.
  It still opens from disk (relative `<script src>` works on `file://`).
- **A classic script defining one global `OT`, not ES modules** — modules
  are blocked on `file://`, and the tools had always worked from disk.
- **Kirigami left out** — explicitly: "Dont work on Kirigami yet, its not
  functional."

## Mirror pleats (first build, 2026-09-19/20)

- **Linear and radial are two pages on one engine** (`core.js`, `window.MODE`)
  — user: "do separate the linear from the radial - the radial needs degrees
  between subsequent verticals, the linear needs mm". Only the Verticals
  panel and the generator differ; everything after "generate verticals" is
  shared.
- **Lines / Verticals / Measure modes, Shift as a momentary swap** — a click
  on a vertical was ambiguous between "start a line" and "move the vertical";
  the user offered "a adjust verticals vs adjust horiz toggle mode, or maybe
  a keyboard keypress + drag". Both were kept.
- **A line may join any adjacent pair of verticals and reflects both ways** —
  Claude's reading of "or indeed any verticals", not confirmed by the user;
  it avoids special-casing V1/V2.
- **Verticals never intersect: ends can't cross a neighbour (min 1 mm)** —
  the user's spec "Lines may not intersect". Ordering both ends is enough
  inside a rectangle, so it is cheap to enforce while dragging.
- **±45° cap on the linear page only** — "in case of radial line the 45
  degree cap may not apply".
- **One colour for all lines, another for the rectangle; no mountain/valley
  styling** — the user chose it over alternating M/V; lines default to green
  and thinner ("too red too thick").
- **Random layouts place lines one at a time and reject** any that cross
  another trail or leave less than the min vertex gap (default 4 mm) on a
  vertical (up to 250 tries each) — the user asked for the check; retry keeps
  every result valid, and if not all fit it places fewer and says so instead
  of breaking the rule.
- **Dimensions are toggles plus a Measure tool** (distance = two snapped
  points, angle = two lines). Measurements are snapshots: not exported, not
  updated by edits — tying them to geometry would need stable identities for
  every vertex.
- **Enforce radial from centre is a toggle (default on)** — the user's ask.
  Switching it on snaps each existing vertical onto the line through the
  centre and the midpoint of its span (keeps its rough place and the order);
  a new one is a single click on an edge; off, verticals are free lines added
  by two clicks on the outline.
- **Off-rectangle geometry is kept and drawn as grey ghosts, with counts in
  the status bar** — the user: "so I dont have to be confused why the count
  says 8 but i can see only 4 lines". Only radial lines beyond ±89° are
  dropped. Toggleable.
- **No libraries in the first build** despite "any and all libraries you deem
  fit": the geometry is small and plain SVG is enough, so there is no CDN
  dependency (JSZip is only loaded later, lazily, for ZIP export).

## X span (2026-09-20)

Per-tool detail is in [x-span README § Decisions](../x-span/README.md#decisions).

- **Lines bend at the verticals (refract), not straight.** Two straight lines at
  ±θ cross only once; to meet again on a vertical they must bend, and they bend
  on the vertical in between. User: "The verticals again dont mirror so much as
  refract the lines to be able to meet the next point."
- **One lattice for all four grid types**, so Regular is just the equal-spacing,
  constant-height case. The tiling condition (rhombi touch vertex to vertex, all
  vertices on verticals) fixes every y once the heights are chosen; only x is free.
- **Four named grid types** (Regular, Const H · move W, Const W · move H, Move
  both) rather than two switches. User: "Three separate named modes".
- **Height is per chain row**, not per vertex. User: "One h per chain row".
  Per-vertex levels would also tile but stop being "chains" and are hard to edit.
- **Heights stored as ratios of a reference `h`**, so the angle / chain-count
  definitions and the angle drag scale all rows together. Claude's choice; the
  user only asked that they "still work".
- **Angle = side to the horizontal**, either diagonal may be the longer one.
  User: "Either; angle = side to horizontal".
- **Anchored at the top, cropped at the bottom**; no forced fill. Chosen twice
  (constant and variable heights). "Fit to height" is the explicit way to fill.
- **Chains in 0.5 steps** so the last row can be half a rhombus. User: "allow
  chains to round to 0.5 to allow half rhombs along the bottom".
- **Angle drag pivots on the top vertex of the 2nd vertical** and outranks the
  y-offset drag (circle > line > empty space). User: "Angle set is a bigger
  mouse priority than y offset". A reset button undoes accidental offsets.
- **Distance / minor-diagonal verticals keep one extra vertical past the right
  edge** (grey) so the cropped grid reaches the edge; count-defined verticals go
  edge to edge.
- **Free-chain editing and the "exact θ" toggle from v1 were dropped**: with
  constant or per-row heights and a continuous tiling they cannot exist.

## Look

- **Halve on-screen strokes only; leave export stroke alone.** The export
  stroke width is a fabrication setting with its own field.
- **Long explanations → tooltips**, the status-bar mode hint kept. Chosen
  over a separate ⓘ icon per control; headings with an explanation get ⓘ.
- **White page on grey canvas**, margin rectangle as the dark line — so the
  page, the working area and the cut line read as three different things.

## Sheet and margin

- **The model's rectangle *is* the area inside the margin** (mirror-pleats,
  x-span). "Fit edge to edge", ordered/random layouts and tiling all fill the
  working area with no geometry changes; the page is just `W + 2m`. Changing
  the margin keeps the page size and rescales the pattern.
- **Margin crops the pattern; margin outline exported as the cut; page
  outline not exported** — the user's spec ("pattern cropped to margin line,
  page outline isnt exported, margin outline is exported as cut + fold lines
  as usual").
- **vPleat is the exception**: it exports only the pattern, not the page, so
  its margin shrinks the fit area and is drawn as a guide.
- **Presets in a text file** (`common/page-sizes.txt`), as the user asked,
  with a built-in fallback copy for `file://`. The user runs Live Server, so
  the text file is what's normally read.
- **Presets apply as written** (W × H); ⇄ swaps. Keeping the current
  orientation automatically was considered and dropped — "numbers also as
  written".

### Two margins, snapped to the grid (added later the same day)

- **Why:** user: "while the margin is defined by a distance, can i have an
  edit margin that allows margins snapping to grid - this will allow full
  multiples of the folds to be placed, since the margin is an arbitrary value
  after all."
- **One margin → two (↔, ↕), each symmetric.** A single margin can't usually
  sit on the grid on both axes: the grid runs through the page centre, so the
  margin must be L/2 − k·step, which differs per axis (A4, 10 mm: 8.5 vs 5).
  Symmetric per axis keeps the pattern centred and the grid origin meaningful.
  Per-side (four) margins were not needed.
- **🔗 lock, default on** — behaves like the old single margin until you ask
  for more. *Fit to grid* with the lock on tries a common value, else unlocks
  and says so.
- **Edit mode + Fit button, not either alone** — dragging shows and snaps;
  the button is one click. Hypar has no modes, so its edges are always
  draggable (after corners and the ◆), marked by small bars.
- **Out of range is fine:** user: "the margins can still be manually managed
  to be whatever distances are needed" — no grid line in 5–15 mm → left as is.
- **Radial page: no fitting** (its grid is polar); vPleat keeps one margin (no
  grid).
- **Old project files** (single `m`) load as ↔ = ↕ = m. No other allowance
  for existing drawings — user: "not many have been created, its fine as it
  goes, dont make special concessions". The starter templates were
  regenerated with the new fields.

## Grid

- **Origin at the sheet centre**, not a corner — the user asked "would centre
  of sheet be more useful?"; yes: with symmetric patterns the centre line is
  always on a grid line, and the margin is symmetric about it too.
- **Polar grid follows the ◆** on radial; spokes default to 7.5° (not the 5°
  first proposed) so every snap angle has a spoke.
- **Screen only**, clipped to the page.

## Snapping

- **One nearest-candidate engine** for every tool rather than per-feature
  snaps. Weights make points win ties and make a lone grid line lose to an
  angle ray.
- **Angles = multiples of 15° and 22.5°** in both linear and radial — the
  user's spec ("15, 30, 45, 60 … and divisions of 90 – 45 and 22.5 … as much
  of the angle snapping as applicable to linear as well").
- **Alt bypasses** for one drag; the checkbox turns it off. Alt's default
  (focusing the browser menu) is suppressed.
- **Replaced the old "Snap lines to 45°" checkbox** — 45° is in the new set.
- **Line ends snap *along their vertical*** — the user: "lines snap to vertical
  at any angle"; a line end never leaves its vertical, so every candidate is
  turned into a position on that vertical.

## Radial rays

- **Rays when the centre is level with the sheet (0 ≤ y ≤ H)**, not only when
  strictly inside: a centre beside the sheet has the same problem (lines
  through it would be near-horizontal, which `{xt, xb}` can't store).
- **Switch is automatic** on centre move; rays start as a full circle;
  lines are re-hung by projecting their ends; *Enforce radial* locked on.
- **(b) rays, not (a) full lines through an inside centre** — user's choice.
- **Stop after exactly one lap**; report non-closure rather than spiral.
  User: "stopping a ray at 360 if it isnt coincident is necessary".
- **Keep flat-foldable turns ray i+2 the other way** (not i+1 the same way):
  it lets every individual wedge change, and for 4 rays it looks symmetric.
- **Correction on switch-on** turns all odd rays equally — simple, and
  exact for the sums.

## Off-canvas handles

- **Display only** — the stored line end doesn't move. User: "display only,
  i just need to adjust/select+delete the line".

## Export

- **SVG, PNG and ZIP buttons**; ZIP because browsers block several downloads
  from one click (vPleat had already hit this).
- **Stamp `YYYY_MMDD_HHMMSS`** local time — user's format.
- **JSZip loaded lazily** from cdnjs on first ZIP.

## Projects (save / load / templates)

- **A project = geometry + Grid & snap settings.** User: "does a project need
  grid, colours, stroke width, etc ? Maybe grid settings, to convey snapping,
  and the geometry. The colours stroke etc can come form the current
  defaults". So colours, stroke width and PNG density are not saved.
- **The saved state is exactly the undo snapshot** (`S` / vPleat's `state`) —
  no second serialisation to keep in step.
- **Embedded in every exported SVG** (`<metadata id="ot-project">`, CDATA
  JSON), so an export is also a project — user: "yes, if its already there,
  sure". Load accepts .json or .svg; drop onto the page works too.
- **A load merges over the start-up defaults and is one undo step**, so an
  older file with fewer fields still loads, and a bad load is Ctrl+Z away
  (vPleat: its undo only covers the curve).
- **Wrong-tool files are refused** by name, including linear vs radial.
- **Templates are plain project files** in `<tool>/templates/`, listed in an
  index (`label, file` — file after the last comma, so labels can contain
  commas; the first version split on every comma and broke on
  "Alternating pleats, edge to edge"). Needs a server, like the page sizes.

## Bug: "exporting SVG resets the canvas" (radial)

Not a code bug. The user was saving exports into `origami-tools/downloads/`,
which Live Server watches; a new file there reloads the page and the
unsaved drawing is lost ("when i didnt save the file, it was fine, but on
saving the file, it reset"). Options offered: ignore those paths in Live
Server settings, auto-save state to the browser, gitignore `downloads/`.
User's decision: "I can just save things elsewhere" — so none were built.
