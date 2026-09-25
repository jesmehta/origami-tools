# Interface conventions

What a user can expect to work the same way in every tool (kirigami excepted).

## Page layout

- **Sidebar left, canvas right, status bar under the canvas.** (vPleat: tabs
  across the top, a sidebar per tab.)
- Top of the sidebar: **← Origami tools** backlink, tool title.
- Sidebar order: **Sheet → Grid & snap → tool controls → Edit mode →
  layouts → Dimensions → Export → Undo/Redo.**
- The canvas background is grey; the **page is white**, its outline light
  grey (screen only); the **margin rectangle** is the dark cut line.

## Tooltips instead of paragraphs

- Explanations live in hover tooltips (`data-tip`), not in the sidebar.
- A section heading with an explanation shows **ⓘ**; hover it.
- Mode buttons carry their own how-to, which changes with the mode (for
  example, radial Verticals says different things for lines and rays).
- The **status bar** keeps a one-line hint for the current mode plus live
  analysis (crossings, min vertex gap, flat-foldability, what's grey).

## Sheet

- **Size** preset dropdown + **⇄** (swap portrait/landscape) + W × H typed.
  Presets come from `common/page-sizes.txt`.
- **Margin** 5–15 mm. The pattern is cropped at the margin line; the margin
  outline is exported as the cut; the page outline is never exported.
- Mirror-pleats / x-span: changing page or margin rescales the pattern (the
  page stays the size you asked for). Hypar: the polygon keeps its position
  relative to the sheet centre.

## Grid & snap

- Grid is screen-only. Square: origin at the **sheet centre**, every 5th line
  darker. Radial: **polar** around the ◆ (rings in mm, spokes in °, multiples
  of 45° darker), moving with it.
- **Snap** checkbox; hold **Alt** while dragging to place freely.
- An **orange ring** shows where a drag snapped.
- Snap angles: every multiple of **15°** and **22.5°**.

## Handles

- Squares: vertical ends / polygon corners. Circles: line ends. ◆: a centre.
- Filled light blue = selected. **Dashed circle** = a line end that is off
  the canvas, drawn at the nearest visible point of its line (grab it to
  adjust, or select + Delete).
- **Shift** momentarily swaps between the two edit modes (Lines ↔ Verticals,
  Grid ↔ Verticals). **Esc** cancels a half-drawn line/measure.
  **Delete/Backspace** removes the selection. **Ctrl+Z / Ctrl+Shift+Z / Ctrl+Y**
  undo/redo.

## Export

- **Export SVG / Export PNG / Export ZIP** (both). Names:
  `<tool>_YYYY_MMDD_HHMMSS.svg|png|zip`, local time; a ZIP's contents share
  its stamp. vPleat: `vpleat-export_<stamp>.zip` with stamped contents.
- SVG is true size in mm (1:1); PNG density is set in px/mm.
- Not exported: grid, ghosts, handles, dimensions, measurements, page outline.
- **Saving an export into the repo folder while Live Server is running
  reloads the page and loses unsaved work** — save elsewhere (see TODO).
