// Rendering: pure functions from (document, view state) to SVG/HTML
// strings. Never mutates the document; never the source of truth for
// geometry (see model.js / constraints.js).
import { pairedCutGeometry, pairedCutInnerSurface } from "./model.js";
import { section } from "./constraints.js";
import { CREASE_ROLES, sixCreaseStatus } from "./pattern6.js";

const COLORS = {
  cut: "#111111",
  mountain: "#d62728",
  valley: "#1f6feb",
  reference: "#9aa0a6",
  grid_major: "#c9ccd1",
  grid_minor: "#e6e8eb",
  sheet: "#ffffff",
  sheetStroke: "#3a3f44",
  selection: "#ff8c00",
  hover: "#2ecc71",
  ghost: "#b9bec5",
  handle: "#333333",
  invalid: "#e74c3c",
};

function fmt(n) {
  return Math.round(n * 1000) / 1000;
}

function lineEl(p0, p1, { color, width = 1, dash = null, cls = "", nonScaling = true }) {
  const dashAttr = dash ? ` stroke-dasharray="${dash}"` : "";
  const veAttr = nonScaling ? ' vector-effect="non-scaling-stroke"' : "";
  return `<line class="${cls}" x1="${fmt(p0.x)}" y1="${fmt(p0.y)}" x2="${fmt(p1.x)}" y2="${fmt(p1.y)}" stroke="${color}" stroke-width="${width}"${dashAttr}${veAttr} />`;
}

function circleEl(p, r, { color, cls = "", filled = true }) {
  const fill = filled ? color : "white";
  return `<circle class="${cls}" cx="${fmt(p.x)}" cy="${fmt(p.y)}" r="${r}" fill="${fill}" stroke="${color}" stroke-width="1.5" vector-effect="non-scaling-stroke" />`;
}

// ---- Grid ------------------------------------------------------------

function renderGrid(doc) {
  if (!doc.grid.visible) return "";
  const { width, height } = doc.sheet;
  const parts = [];
  const drawSet = (spacing, color, clsSuffix) => {
    if (spacing <= 0) return;
    for (let x = 0; x <= width + 1e-6; x += spacing) {
      parts.push(lineEl({ x, y: 0 }, { x, y: height }, { color, width: 1, cls: `grid grid-${clsSuffix}` }));
    }
    for (let y = 0; y <= height + 1e-6; y += spacing) {
      parts.push(lineEl({ x: 0, y }, { x: width, y }, { color, width: 1, cls: `grid grid-${clsSuffix}` }));
    }
  };
  drawSet(doc.grid.minorSpacing, COLORS.grid_minor, "minor");
  drawSet(doc.grid.majorSpacing, COLORS.grid_major, "major");
  return `<g id="grid-layer">${parts.join("")}</g>`;
}

// ---- Paired-cut unit ---------------------------------------------------

function renderPairedCutUnit(unit, viewState) {
  const g = pairedCutGeometry(unit);
  const selected = viewState.selection.has(unit.id);
  const invalid = viewState.invalidUnitIds?.has(unit.id);
  const haloColor = invalid ? COLORS.invalid : selected ? COLORS.selection : null;
  const parts = [];

  if (haloColor) {
    parts.push(lineEl(g.cut1.p0, g.cut1.p1, { color: haloColor, width: 5, cls: "halo" }));
    parts.push(lineEl(g.cut2.p0, g.cut2.p1, { color: haloColor, width: 5, cls: "halo" }));
    parts.push(lineEl(g.innerCrease.p0, g.innerCrease.p1, { color: haloColor, width: 4, cls: "halo" }));
  }

  const cut1Hover = viewState.hoverEdge?.unitId === unit.id && viewState.hoverEdge.cutIndex === 1;
  const cut2Hover = viewState.hoverEdge?.unitId === unit.id && viewState.hoverEdge.cutIndex === 2;
  parts.push(
    lineEl(g.cut1.p0, g.cut1.p1, {
      color: cut1Hover ? COLORS.hover : COLORS.cut,
      width: cut1Hover ? 2.5 : 1.5,
      cls: `cut-line ${cut1Hover ? "hover" : ""}`,
    })
  );
  parts.push(
    lineEl(g.cut2.p0, g.cut2.p1, {
      color: cut2Hover ? COLORS.hover : COLORS.cut,
      width: cut2Hover ? 2.5 : 1.5,
      cls: `cut-line ${cut2Hover ? "hover" : ""}`,
    })
  );

  parts.push(lineEl(g.midline.p0, g.midline.p1, { color: COLORS.reference, width: 1, dash: "1,2" }));
  parts.push(
    lineEl(g.innerCrease.p0, g.innerCrease.p1, {
      color: unit.mountainValley === "mountain" ? COLORS.mountain : COLORS.valley,
      width: 2,
      cls: "crease-line",
    })
  );
  parts.push(lineEl(g.outerCreaseLeft.p0, g.outerCreaseLeft.p1, { color: COLORS.reference, width: 1.5, dash: "3,2" }));
  parts.push(lineEl(g.outerCreaseRight.p0, g.outerCreaseRight.p1, { color: COLORS.reference, width: 1.5, dash: "3,2" }));

  if (selected) {
    parts.push(circleEl(g.innerCrease.p0, 4, { color: COLORS.selection, cls: "handle handle-crease" }));
    parts.push(circleEl(g.innerCrease.p1, 4, { color: COLORS.selection, cls: "handle handle-crease" }));
  }

  return `<g class="unit paired-cut" data-unit-id="${unit.id}">${parts.join("")}</g>`;
}

// ---- Six-crease cut ------------------------------------------------------

function renderSixCreaseCut(cut, viewState) {
  const selected = viewState.selection.has(cut.id);
  const parts = [];
  const color = selected ? COLORS.selection : COLORS.cut;
  parts.push(lineEl(cut.A, cut.B, { color, width: selected ? 2.5 : 1.5, cls: "cut-line" }));
  parts.push(lineEl(cut.B, cut.C, { color, width: selected ? 2.5 : 1.5, cls: "cut-line" }));
  for (const v of [cut.A, cut.B, cut.C]) {
    parts.push(circleEl(v, 2.5, { color: COLORS.cut, filled: true }));
  }
  for (const role of CREASE_ROLES) {
    const ref = cut.creaseRefs[role];
    const assignment = cut.assignments[role];
    if (!ref) continue;
    const col = assignment === "mountain" ? COLORS.mountain : assignment === "valley" ? COLORS.valley : COLORS.reference;
    parts.push(lineEl(ref.p0, ref.p1, { color: col, width: 2, dash: assignment === "flat" ? "1,2" : null }));
  }
  return `<g class="unit six-crease-cut" data-unit-id="${cut.id}">${parts.join("")}</g>`;
}

// ---- Draft / ghost overlays for in-progress tool actions -----------------

function renderDraft(draft) {
  if (!draft) return "";
  const parts = [];
  if (draft.kind === "drawingCut1") {
    parts.push(lineEl(draft.p0, draft.p1, { color: COLORS.hover, width: 1.5, dash: "3,2" }));
    parts.push(circleEl(draft.p0, 3, { color: COLORS.hover }));
  } else if (draft.kind === "pairedCutCandidates") {
    for (const cand of draft.candidates) {
      const active = draft.hoveredSide === cand.side;
      parts.push(
        lineEl(cand.p0, cand.p1, {
          color: active ? COLORS.hover : COLORS.ghost,
          width: active ? 2 : 1.5,
          dash: "4,3",
          cls: `ghost-candidate side-${cand.side}`,
        })
      );
    }
    if (draft.cut1) parts.push(lineEl(draft.cut1.p0, draft.cut1.p1, { color: COLORS.cut, width: 1.5 }));
  } else if (draft.kind === "sixCreaseDraft") {
    if (draft.A) parts.push(circleEl(draft.A, 3, { color: COLORS.hover }));
    if (draft.A && draft.B) parts.push(lineEl(draft.A, draft.B, { color: COLORS.hover, width: 1.5, dash: "3,2" }));
    else if (draft.A && draft.previewB) parts.push(lineEl(draft.A, draft.previewB, { color: COLORS.ghost, width: 1, dash: "2,3" }));
    if (draft.B) parts.push(circleEl(draft.B, 3, { color: COLORS.hover }));
    if (draft.B && draft.C) parts.push(lineEl(draft.B, draft.C, { color: COLORS.hover, width: 1.5, dash: "3,2" }));
    else if (draft.B && draft.previewC) parts.push(lineEl(draft.B, draft.previewC, { color: COLORS.ghost, width: 1, dash: "2,3" }));
    if (draft.C) parts.push(circleEl(draft.C, 3, { color: COLORS.hover }));
  } else if (draft.kind === "drawCreaseDraft" || draft.kind === "mirrorAxis") {
    const color = draft.kind === "mirrorAxis" ? COLORS.selection : COLORS.hover;
    if (draft.p0) parts.push(circleEl(draft.p0, 3, { color }));
    if (draft.p0 && draft.previewP1) parts.push(lineEl(draft.p0, draft.previewP1, { color, width: 1, dash: "2,3" }));
  } else if (draft.kind === "arrayPreview") {
    for (const p of draft.previewUnits) {
      parts.push(renderPairedCutUnit({ ...p, id: "__preview__" }, { selection: new Set() }));
    }
  }
  if (draft.snap) {
    parts.push(circleEl(draft.snap.point, 3.5, { color: COLORS.hover, filled: false, cls: "snap-indicator" }));
  }
  return `<g id="draft-layer">${parts.join("")}</g>`;
}

// ---- Main canvas ----------------------------------------------------------

export function renderCanvas(doc, viewState) {
  const { width, height } = doc.sheet;
  const sheet = `<rect x="0" y="0" width="${width}" height="${height}" fill="${COLORS.sheet}" stroke="${COLORS.sheetStroke}" stroke-width="1" vector-effect="non-scaling-stroke" />`;
  const grid = renderGrid(doc);
  const units = doc.units
    .map((u) => (u.type === "pairedCut" ? renderPairedCutUnit(u, viewState) : renderSixCreaseCut(u, viewState)))
    .join("");
  const draft = renderDraft(viewState.draft);
  const vb = viewState.viewBox;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${fmt(vb.x)} ${fmt(vb.y)} ${fmt(vb.w)} ${fmt(vb.h)}" preserveAspectRatio="xMidYMid meet">${sheet}${grid}${units}${draft}</svg>`;
}

// ---- Section view (a|b vs b|a, the conserved-length display) -------------

export function renderSectionView(unit) {
  if (!unit || unit.type !== "pairedCut") {
    return `<div class="section-empty">Select a paired-cut unit to see its section profile.</div>`;
  }
  const s = section(unit);
  const barWidth = 220;
  const scale = barWidth / s.total;
  const aInner = s.innerOrder[0] * scale;
  const bInner = s.innerOrder[1] * scale;
  const bOuter = s.outerOrder[0] * scale;
  const aOuter = s.outerOrder[1] * scale;
  return `
    <div class="section-diagram">
      <div class="section-row">
        <span class="section-label">inner (a, b)</span>
        <svg width="${barWidth}" height="24" class="section-bar">
          <rect x="0" y="4" width="${fmt(aInner)}" height="16" fill="${COLORS.mountain}" opacity="0.35" />
          <rect x="${fmt(aInner)}" y="4" width="${fmt(bInner)}" height="16" fill="${COLORS.valley}" opacity="0.35" />
          <line x1="${fmt(aInner)}" y1="0" x2="${fmt(aInner)}" y2="24" stroke="#333" stroke-width="1" />
        </svg>
        <span class="section-values">a=${s.a.toFixed(2)}mm, b=${s.b.toFixed(2)}mm</span>
      </div>
      <div class="section-row">
        <span class="section-label">outer (b, a)</span>
        <svg width="${barWidth}" height="24" class="section-bar">
          <rect x="0" y="4" width="${fmt(bOuter)}" height="16" fill="${COLORS.valley}" opacity="0.35" />
          <rect x="${fmt(bOuter)}" y="4" width="${fmt(aOuter)}" height="16" fill="${COLORS.mountain}" opacity="0.35" />
          <line x1="${fmt(bOuter)}" y1="0" x2="${fmt(bOuter)}" y2="24" stroke="#333" stroke-width="1" />
        </svg>
        <span class="section-values">b=${s.b.toFixed(2)}mm, a=${s.a.toFixed(2)}mm</span>
      </div>
      <div class="section-total">total conserved: ${s.total.toFixed(2)}mm (cut length)</div>
    </div>`;
}

// ---- Hierarchy panel -------------------------------------------------------

export function renderHierarchy(doc, viewState) {
  const roots = doc.units.filter((u) => !u.parentId);
  const renderNode = (unit, depth) => {
    const kids = doc.units.filter((u) => u.parentId === unit.id);
    const selected = viewState.selection.has(unit.id) ? "selected" : "";
    const invalid = viewState.invalidUnitIds?.has(unit.id) ? "invalid" : "";
    const label = unit.name || (unit.type === "pairedCut" ? "Paired cut" : "Six-crease cut");
    const li = `<li class="hierarchy-node ${selected} ${invalid}" data-unit-id="${unit.id}" style="padding-left:${depth * 14}px">
      <span class="hierarchy-icon">${unit.type === "pairedCut" ? "▤" : "▽"}</span>
      <span class="hierarchy-label">${label}</span>
      <span class="hierarchy-id">${unit.id}</span>
    </li>`;
    return li + kids.map((k) => renderNode(k, depth + 1)).join("");
  };
  if (roots.length === 0) return `<div class="hierarchy-empty">No units yet.</div>`;
  return `<ul class="hierarchy-tree">${roots.map((r) => renderNode(r, 0)).join("")}</ul>`;
}

// ---- Six-crease pattern panel ----------------------------------------------

export function renderPatternPanel(cut) {
  if (!cut) return "";
  const status = sixCreaseStatus(cut);
  const roleRows = CREASE_ROLES.map((role) => {
    const val = cut.assignments[role] ?? "";
    const opts = ["", "flat", "mountain", "valley"]
      .map((t) => `<option value="${t}" ${val === t ? "selected" : ""}>${t || "(unset)"}</option>`)
      .join("");
    return `<div class="role-row"><label>${role}</label><select class="role-select" data-role="${role}">${opts}</select></div>`;
  }).join("");
  const statusClass = status.state.startsWith("conflict")
    ? "status-conflict"
    : status.autoCompletionAvailable
    ? "status-unique"
    : "status-ambiguous";
  const acceptButton = status.autoCompletionAvailable
    ? `<button id="pattern-accept-suggestion">Fill in remaining creases (pattern #${status.matchIndices[0] + 1})</button>`
    : "";
  return `
    <div class="pattern-panel">
      <div class="pattern-status ${statusClass}">${status.assignedCount}/6 assigned — ${status.state}</div>
      ${acceptButton}
      <div class="role-list">${roleRows}</div>
    </div>`;
}

export { COLORS, pairedCutInnerSurface };
