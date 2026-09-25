# 2026-09-25 — shared features across the origami tools

Conversation log: one Claude Code session (VS Code), the user and Claude.
It records what was asked, how the request was clarified, what was built in
which order, what went wrong, and the user's own words where they set a
direction. Quotes are verbatim (typos kept).

Result: 14 commits on `main`, `0a0fffc` … `7a5a987`, pushed.

## 1. The request

> in common to all the origami tools, or atleast where applicable :
>
> - reduce line thickness, halve it atleast
> - all tools where applicable will have a grid
> - points/lines that are dragged will have a snap to grid, snap to nearby point, etc
> - all the explanatory long text in the side control panel to be hover tooltips.. The control panels need to be cleaner
> - in radial the grid is polar - radial + angular
> - export should have an option for both files together, and timestamp the files - svg/png/zip - in the filename itself
> - radial - allow circle centre to be within the page recctangle
> - for lines whose handles have been moved/reflected/dimensioned off teh rectnagle, move handle to nearest visible-on-canvas section
> - why does exporting svg reset the canvas - this is happenning in radial
> - all pages need linkback to origami tools homepage
> - Add dropdown for preset page sizes - A4, A3, 370 x 270, 270 squere, 550 x 760, 550 square, custom sizes addable directly in a text file in the repo
> - margin to the paper sheet - 5 to 15 mm
>
> Ask questions to clarify.
> DOnt work on Kirigami yet, its not functional.

## 2. Clarification round

Claude read the tools first (mirror-pleats `core.js`, x-span, hypar, vPleat)
and asked 17 numbered questions, each with a proposed default. The answers
that shaped the build:

| # | Question (short) | Answer |
|---|---|---|
| 1 | Shared `common/` module vs copy per tool | "Ok" (shared) |
| 2 | Opened from disk or a server? | "Live server" |
| 3 | vPleat: everything except grid/snap? | "yes" |
| 4 | Give hypar a sheet? | "yes" |
| 5 | Halve on-screen only, or export stroke too? | "only onscreen" |
| 6 | Grid origin at page corner or margin corner? | "no, page corner is fine - would centre of sheet be more useful ?" |
| 7 | Snap targets + Alt to bypass | "yes, lines snap to vertical at any angle. In radial, snapping is a to multiples of 15 - 15, 30, 45, 60, etc and divisions of 90 - 45 and 22.5. As much of the angles snapping as applicable to linear as well" |
| 8 | Polar grid follows the centre? | "yes" |
| 9 | Centre inside: (a) full lines through it or (b) rays? | "b, but i did not understand your caveat" |
| 10 | What did you do before the reset? | "just exported the svg - when i didnt save the file, it was fine, but on saving the file, it reset" |
| 11 | Off-canvas handles: display only or move the data? | "display only, i just need to adjust/select+delete the line" |
| 12 | Timestamp format | "timestamp can be YYYY_MMDD_HHMMSS" |
| 13 | Portrait/landscape swap; sizes W × H as written? | "yes, numbers also as written" |
| 14 | What does the margin do? | "pattern cropped to margin line, page outline isnt exported, margin outline is exported as cut + fold lines as usual" |
| 15–17 | Tooltip style, backlink, commit per logical unit | "ok" / "ok" / "yes" |

### The reset bug, found from answer 10

Claude checked the repo and `.vscode/settings.json`: the user was saving into
`origami-tools/downloads/`, inside the folder Live Server watches, and
`ignoreFiles` only excluded `*.json`, `*.tsv`, `*.log`. Saving the SVG
created a file there → Live Server reloaded → the unsaved drawing was gone.
Cancelling the save left nothing on disk, hence "it was fine". Claude
proposed ignore patterns + browser auto-save + gitignoring `downloads/`.

> I can just save things elsewhere

So nothing was built for it; it's recorded in [TODO.md](../TODO.md) as a watch-out.

### The Kawasaki caveat, explained

Claude's second message explained why rays might not close: a trail bounced
round the centre returns to its start ray, and only lines up if there's an
even number of rays whose alternate angles each sum to 180° (Kawasaki); it
proposed stopping after one lap, a status warning, and an optional "Keep
flat-foldable" checkbox, and switching to rays automatically by centre
position.

> 6 - centre, even the page margin can be adjusted accordingly
> 7 yes ok
> 9 - yes, stopping a ray at 360 if it isnt coincident is necessary. ok to the rest of the point as well

Claude then posted the 10-step plan (one commit each) and one stated
assumption — the working area is the rectangle inside the margin, so all
generators fill it. The user:

> ok, sounds goo, go ahead

## 3. Build log (commit order)

1. `0a0fffc` `common/` + backlink on every page.
2. `4b4c294` on-screen strokes halved (a perl pass halving every literal
   `stroke-width` in render code; `buildSVG` uses `${sw}` so export untouched).
3. `fb9cda1` tooltips (`data-tip`, one floating box; notes moved per tool;
   mode tips set dynamically).
4. `16e2cec` export: `OT.wireExport`, ZIP, stamps.
5. `ef74616` **found along the way:** vPleat's exported SVG lines had no
   stroke — the look came from page CSS classes the saved file didn't carry.
   Confirmed on the user's existing exports (`grep -c "stroke="` → 0), fixed
   by baking attributes in at export, committed separately.
6. `abfec8e` presets from `page-sizes.txt`, ⇄ swap; hypar gets a sheet.
7. `343a530` margin.
8. `ccb330e` grid (square / polar).
9. `9869133` snapping (see §4).
10. `734663f` off-canvas handles.
11. `8b88ff8` radial rays + Kawasaki (see §5).
12. `f808475` changelog entries; `92ea3b3` new thumbnails;
    `7a5a987` the user's own `index.html` text edit, committed on request.

Mid-way the user added:

> once done, update the thumbnails of each page on the landing page after all the updates are done.
> tell me the scope and cost of adding a load/save json for each diagram to be able to save projects and resume them, or use as templates, etc

> I have updated the thext in index.html as well, commit + push that after the rest too

## 4. Snapping — a test that looked like a bug

The first hypar test dragged a corner to 31° at radius 70 mm and expected
the rotation to snap to 30°; it didn't (30.842°). Claude first lowered the
priority of single grid lines (weight 1.5 → 2.5) — no change — then called
the snapper directly: the target point was (195.0017, 171.05), i.e.
0.002 mm from the grid line x = 195. The grid line *should* win there. The
test radius was changed to 67 mm → 30.000°. The weight change was kept
(an angle ray usually matters more than a lone grid line).

Checks that passed: mirror-pleats line end aimed at 31° → 30°, at 44° →
45°, at 23.5° → 22.5°, with Alt held at 31° → 31°; x-span θ → 30°.

## 5. Rays — checks and one fix

Scripted run on the radial page: centre typed to y = 95 → 7 rays, status
"Odd number of rays…"; count 8 + ordered → Kawasaki 180°/180°, 0 open
trails; drag ray 2 with *Keep flat-foldable* → sums stay 180°/180° (ray 4
turned the other way); drag without it (+11°) → 191°/169°, 4 trails open;
add a ray by clicking an edge → 9, delete → 8; centre back to y = −120 →
lines again.

Bug found in that run: every closed trail reported "min vertex gap 0.0 mm"
because the closing vertex was recorded again at the start point. Fixed by
not recording a closing vertex (gap then 9.1 mm).

## 6. A process slip

`git commit -a` for the snapping commit swept in the user's own uncommitted
edit to `index.html`. Caught by reading the commit's `--stat` before pushing;
undone with `git reset --soft HEAD~1`, `index.html` unstaged, recommitted.
From then on only explicit paths were staged. The user's edit was later
committed on its own, at their request.

## 7. Save/load JSON — scoped, not built

Answer given (full version in [TODO.md](../TODO.md)): cheap because every
tool already serialises its state for undo; shared helper ~60 lines,
~10–20 lines per tool, templates from a `templates/<tool>/` folder,
optionally JSON embedded in exported SVGs; ~half a day. Waiting on: include
view settings or geometry only? embed in SVG?

## 8. Documentation request

> also add documentation - technical, design decisions, interface, the math, as well as relevant snippets of the conversation itself - into a documentation folder/file.

→ this `docs/` folder (`196376a`). Claude also said it could not read other
sessions' transcripts (they live outside the workspace CLAUDE.md allows) but
could see live sessions, and gave a prompt to paste into them; the other
logs in this folder came from that.

## 9. Save/load — the two answers, then the build

> json scope -
> 1 - does a project need grid, colours, stroke width, etc ? Maybe grid settings, to convey snapping, and the geometry. The colours stroke etc can come form the current defaults
> 2 - yes, if its already there, sure

Built as scoped: `a9823e7` shared helper + mirror-pleats, `cdc6566` x-span +
hypar, `ad78abd` vPleat (buttons in its header — first attempt gave them the
tabs' `tab-btn` class, which the tab-switching code would have grabbed;
caught before running), `673ba7b` fix: template labels with commas were split
into a wrong file name (found by loading every template through the dropdown:
three 404s), `1c5b09e` 12 starter templates generated by the tools' own
`projectDoc()`.

Checks: for every tool, change the design and grid → Save JSON and Export
SVG → reload → Load each → state identical to what was saved; Ctrl+Z then
returns the defaults. A hypar file loaded into vPleat is refused by name.

## 10. Margins that snap to the grid

> while the margin is defined by a distance, can i have an edit margin that allows margins snapping to grid - this will allow full multiples of the folds to be placed, since the margin is an arbitrary value after all.
> Document this bit as well.

Claude pointed out that one margin can't sit on the grid on both axes (the
grid is centred: A4 at 10 mm needs 8.5 mm across and 5 mm down) and proposed
two symmetric margins with a lock, a Margin edit mode with snapping, a Fit to
grid button, the same for mirror-pleats / x-span / hypar, leaving out-of-range
cases to manual values, and loading old files as ↔ = ↕. Answers:

> 1 - yes … 4 - yes
> 5 - yes thats ok, the margins can still be manually managed to be whatever distances are needed
> 6 - yes
>
> Existing drawings - not many have been created, its fine as it goes, dont make special concessions

Built in one commit (plus this docs commit). First run: x-span's sidebar is
static HTML, so `${OT.marginRow()}` went in as literal text and every margin
control was missing (caught by the smoke test); fixed with a slot filled from
script, as hypar does. Test run on A4: Fit → ↔ 8.5, ↕ 15 (a tie between 5
and 15 — changed to prefer the smaller margin → ↕ 5, 280 × 200 = 28 × 20
steps); free drags gave 12.0000029 mm (now rounded to 0.1 mm); the "unlocked"
note stuck after later drags (now cleared). Also checked: drag snaps 8.9 →
8.5, Alt-drag stays at 9.2, lock/typed value/undo, hypar top edge → 15,
an old `m = 7` file → 7 / 7, radial's Fit disabled.
