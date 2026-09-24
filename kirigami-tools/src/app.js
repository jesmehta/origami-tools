import {
  createDocument,
  createPairedCutUnit,
  pairedCutGeometry,
  findUnit,
  cloneUnit,
} from "./model.js";
import {
  section,
  trySetCreaseOffset,
  trySetCutLength,
  trySetSpacing,
  resetToMidline,
  nestingValidity,
  arrayInstances,
  mirrorUnit,
  isPairedCutValid,
  syncAllArrayLinks,
  detachArrayInstance,
} from "./constraints.js";
import {
  createSixCreaseCut,
  classifyDrawnCrease,
  setAssignment,
  setPattern,
} from "./pattern6.js";
import { createHistory, pushHistory, undo, redo, canUndo, canRedo } from "./history.js";
import { exportSVG, verifyExportedSVG, saveDocument, loadDocument } from "./export.js";
import { renderCanvas, renderSectionView, renderHierarchy, renderPatternPanel } from "./render.js";
import {
  add,
  sub,
  scale,
  dot,
  length,
  normalize,
  perp,
  fromAngle,
  closestPointOnSegment,
} from "./geom.js";

// ---------------------------------------------------------------------
// State
// ---------------------------------------------------------------------

const el = (id) => document.getElementById(id);

const state = {
  history: createHistory(createDocument()),
  view: {
    viewBox: { x: -10, y: -10, w: 230, h: 317 },
    selection: new Set(),
    hoverEdge: null,
    draft: null,
    invalidUnitIds: new Set(),
  },
  tool: "select",
  defaultSpacing: 20,
  defaultCutLength: 40,
  defaultFlapLength: 20,
  dragging: null, // { kind, unitId, handle, startUnit, pointerId }
  statusMessage: "",
};

function doc() {
  return state.history.present;
}

function commit(nextDoc) {
  state.history = pushHistory(state.history, syncAllArrayLinks(nextDoc));
  recomputeValidity();
  renderAll();
}

function replaceDocument(nextDoc) {
  state.history = createHistory(nextDoc);
  state.view.selection = new Set();
  recomputeValidity();
  renderAll();
}

function recomputeValidity() {
  const invalid = new Set();
  for (const u of doc().units) {
    if (u.type !== "pairedCut") continue;
    if (!isPairedCutValid(u)) invalid.add(u.id);
    const parent = u.parentId ? findUnit(doc(), u.parentId) : null;
    if (u.parentId && parent && parent.type === "pairedCut") {
      const result = nestingValidity(u, parent);
      if (!result.valid) invalid.add(u.id);
    }
  }
  state.view.invalidUnitIds = invalid;
}

function setStatus(msg) {
  state.statusMessage = msg;
  el("status-bar").textContent = msg;
}

function selectedUnit() {
  if (state.view.selection.size !== 1) return null;
  const id = [...state.view.selection][0];
  return findUnit(doc(), id);
}

// ---------------------------------------------------------------------
// Snapping
// ---------------------------------------------------------------------

function collectSnapCandidates() {
  const pts = [];
  const d = doc();
  if (d.grid.snap.center) {
    pts.push({ point: { x: d.sheet.width / 2, y: d.sheet.height / 2 }, type: "sheet centre" });
  }
  for (const u of d.units) {
    if (u.type !== "pairedCut") continue;
    const g = pairedCutGeometry(u);
    if (d.grid.snap.endpoint) {
      for (const p of [g.cut1.p0, g.cut1.p1, g.cut2.p0, g.cut2.p1]) pts.push({ point: p, type: "endpoint" });
    }
    if (d.grid.snap.midpoint) {
      pts.push({ point: g.cut1.center, type: "cut midpoint" });
      pts.push({ point: g.cut2.center, type: "cut midpoint" });
    }
    if (d.grid.snap.center) pts.push({ point: u.origin, type: "unit centre" });
    if (d.grid.snap.crease) {
      pts.push({ point: g.innerCrease.p0, type: "crease" });
      pts.push({ point: g.innerCrease.p1, type: "crease" });
    }
  }
  return pts;
}

function snap(rawPoint, toleranceMM) {
  const d = doc();
  let best = null;
  const consider = (point, type) => {
    const dist = length(sub(point, rawPoint));
    if (dist <= toleranceMM && (!best || dist < best.dist)) best = { point, type, dist };
  };
  if (d.grid.snap.grid && d.grid.visible) {
    const gs = d.grid.minorSpacing || d.grid.majorSpacing;
    if (gs > 0) {
      const gx = Math.round(rawPoint.x / gs) * gs;
      const gy = Math.round(rawPoint.y / gs) * gs;
      consider({ x: gx, y: gy }, "grid");
    }
  }
  for (const c of collectSnapCandidates()) consider(c.point, c.type);
  if (d.grid.snap.cut) {
    for (const u of d.units) {
      if (u.type !== "pairedCut") continue;
      const g = pairedCutGeometry(u);
      for (const seg of [g.cut1, g.cut2]) {
        const { point } = closestPointOnSegment(rawPoint, seg.p0, seg.p1);
        consider(point, "cut");
      }
    }
  }
  return best;
}

function currentSvg() {
  return el("canvas-host").querySelector("svg");
}

function pixelToleranceMM() {
  const svg = currentSvg();
  const rect = svg.getBoundingClientRect();
  const pxPerMM = rect.width / state.view.viewBox.w;
  return 8 / pxPerMM;
}

function screenToMM(clientX, clientY) {
  const svg = currentSvg();
  const pt = svg.createSVGPoint();
  pt.x = clientX;
  pt.y = clientY;
  const ctm = svg.getScreenCTM();
  if (!ctm) return { x: 0, y: 0 };
  const transformed = pt.matrixTransform(ctm.inverse());
  return { x: transformed.x, y: transformed.y };
}

// ---------------------------------------------------------------------
// Hit testing
// ---------------------------------------------------------------------

function hitTest(mm, toleranceMM) {
  const d = doc();
  for (const u of d.units) {
    if (u.type !== "pairedCut") continue;
    const g = pairedCutGeometry(u);
    const handles = [
      { type: "crease", end: 0, point: g.innerCrease.p0 },
      { type: "crease", end: 1, point: g.innerCrease.p1 },
      { type: "cutEnd", cut: 1, end: 0, point: g.cut1.p0 },
      { type: "cutEnd", cut: 1, end: 1, point: g.cut1.p1 },
      { type: "cutEnd", cut: 2, end: 0, point: g.cut2.p0 },
      { type: "cutEnd", cut: 2, end: 1, point: g.cut2.p1 },
      { type: "rotate", point: g.midline.p1 },
    ];
    for (const h of handles) {
      if (length(sub(mm, h.point)) <= toleranceMM) return { unitId: u.id, ...h };
    }
    const onCut1 = closestPointOnSegment(mm, g.cut1.p0, g.cut1.p1);
    if (length(sub(mm, onCut1.point)) <= toleranceMM) return { unitId: u.id, type: "body", cut: 1 };
    const onCut2 = closestPointOnSegment(mm, g.cut2.p0, g.cut2.p1);
    if (length(sub(mm, onCut2.point)) <= toleranceMM) return { unitId: u.id, type: "body", cut: 2 };
  }
  for (const u of d.units) {
    if (u.type !== "sixCreaseCut") continue;
    const onAB = closestPointOnSegment(mm, u.A, u.B);
    const onBC = closestPointOnSegment(mm, u.B, u.C);
    if (length(sub(mm, onAB.point)) <= toleranceMM || length(sub(mm, onBC.point)) <= toleranceMM) {
      return { unitId: u.id, type: "body" };
    }
  }
  return null;
}

function edgeHoverAt(mm, toleranceMM) {
  const hit = hitTest(mm, toleranceMM);
  if (hit && hit.type === "body" && findUnit(doc(), hit.unitId)?.type === "pairedCut") {
    return { unitId: hit.unitId, cutIndex: hit.cut };
  }
  if (hit && hit.type === "cutEnd") return { unitId: hit.unitId, cutIndex: hit.cut };
  return null;
}

// ---------------------------------------------------------------------
// Drag application
// ---------------------------------------------------------------------

function applyDrag(unit, handle, mm) {
  const { cutDir, crossDir } = { cutDir: fromAngle(unit.rotation), crossDir: perp(fromAngle(unit.rotation)) };
  if (handle.type === "crease") {
    const rel = sub(mm, unit.origin);
    const d = dot(rel, cutDir);
    const result = trySetCreaseOffset(unit, d);
    return result;
  }
  if (handle.type === "cutEnd") {
    const center = handle.cut === 1 ? add(unit.origin, scale(crossDir, -unit.spacing / 2)) : add(unit.origin, scale(crossDir, unit.spacing / 2));
    const rel = sub(mm, center);
    const h = Math.abs(dot(rel, cutDir));
    return trySetCutLength(unit, h * 2);
  }
  if (handle.type === "rotate") {
    const rel = sub(mm, unit.origin);
    if (length(rel) < 1e-6) return { ok: true, unit };
    const newCrossDir = normalize(rel);
    const newCutDir = { x: newCrossDir.y, y: -newCrossDir.x };
    const next = cloneUnit(unit);
    if (unit.locks.cuts) return { ok: false, reason: "Cuts are locked and cannot be rotated." };
    next.rotation = Math.atan2(newCutDir.y, newCutDir.x);
    return { ok: true, unit: next };
  }
  if (handle.type === "body" && handle.cut === 1) {
    if (unit.locks.cuts) return { ok: false, reason: "Cuts are locked and cannot be moved." };
    const next = cloneUnit(unit);
    next.origin = add(mm, state.dragging.offset || { x: 0, y: 0 });
    return { ok: true, unit: next };
  }
  if (handle.type === "body" && handle.cut === 2) {
    const rel = sub(mm, unit.origin);
    const halfSpacing = dot(rel, crossDir);
    return trySetSpacing(unit, Math.abs(halfSpacing) * 2);
  }
  return { ok: false, reason: "Unhandled handle type." };
}

// ---------------------------------------------------------------------
// Rendering
// ---------------------------------------------------------------------

function renderAll() {
  el("canvas-host").innerHTML = renderCanvas(doc(), state.view);
  el("hierarchy-panel").innerHTML = renderHierarchy(doc(), state.view);
  renderPropertiesPanel();
  el("sheet-width").value = doc().sheet.width;
  el("sheet-height").value = doc().sheet.height;
  el("grid-major").value = doc().grid.majorSpacing;
  el("grid-minor").value = doc().grid.minorSpacing;
  el("grid-visible").checked = doc().grid.visible;
  for (const key of ["grid", "endpoint", "midpoint", "intersection", "cut", "crease", "center"]) {
    const cb = el(`snap-${key}`);
    if (cb) cb.checked = !!doc().grid.snap[key];
  }
  el("undo-btn").disabled = !canUndo(state.history);
  el("redo-btn").disabled = !canRedo(state.history);
  bindCanvasHandlers();
  bindHierarchyHandlers();
  bindPropertyHandlers();
}

function renderPropertiesPanel() {
  const unit = selectedUnit();
  const host = el("properties-panel");
  if (!unit) {
    host.innerHTML = `<p class="hint">Select a unit to edit its properties.</p>`;
    el("section-view").innerHTML = renderSectionView(null);
    return;
  }
  if (unit.type === "pairedCut") {
    const s = section(unit);
    const invalid = state.view.invalidUnitIds.has(unit.id);
    host.innerHTML = `
      <h3>Paired cut ${unit.id}${invalid ? ' <span class="badge-invalid">invalid</span>' : ""}</h3>
      <label>Origin X <input type="number" step="0.1" id="p-origin-x" value="${unit.origin.x.toFixed(2)}"></label>
      <label>Origin Y <input type="number" step="0.1" id="p-origin-y" value="${unit.origin.y.toFixed(2)}"></label>
      <label>Rotation (deg) <input type="number" step="1" id="p-rotation" value="${((unit.rotation * 180) / Math.PI).toFixed(2)}"></label>
      <label>Cut length (mm) <input type="number" step="0.5" id="p-cutlength" value="${unit.cutLength.toFixed(2)}" ${unit.locks.cuts ? "disabled" : ""}></label>
      <label>Spacing (mm) <input type="number" step="0.5" id="p-spacing" value="${unit.spacing.toFixed(2)}" ${unit.locks.cuts ? "disabled" : ""}></label>
      <label>Crease offset d (mm) <input type="number" step="0.1" id="p-crease" value="${unit.creaseOffset.toFixed(2)}" ${unit.locks.crease ? "disabled" : ""}></label>
      <label>Flap length (mm) <input type="number" step="0.5" id="p-flap" value="${unit.flapLength.toFixed(2)}"></label>
      <label>Fold <select id="p-mv"><option value="mountain" ${unit.mountainValley === "mountain" ? "selected" : ""}>mountain</option><option value="valley" ${unit.mountainValley === "valley" ? "selected" : ""}>valley</option></select></label>
      <label><input type="checkbox" id="p-pop" ${unit.popDirection < 0 ? "checked" : ""}> invert pop direction</label>
      <label><input type="checkbox" id="p-lock-cuts" ${unit.locks.cuts ? "checked" : ""}> lock cuts</label>
      <label><input type="checkbox" id="p-lock-crease" ${unit.locks.crease ? "checked" : ""}> lock crease</label>
      <div class="btn-row">
        <button id="p-reset-midline">Reset crease to midline</button>
        <button id="p-duplicate">Duplicate</button>
        <button id="p-delete">Delete</button>
        ${unit.arrayOf ? `<button id="p-detach">Detach from array (linked to ${unit.arrayOf.sourceId})</button>` : ""}
      </div>
      <div class="section-readout">a=${s.a.toFixed(2)}mm b=${s.b.toFixed(2)}mm total=${s.total.toFixed(2)}mm</div>
    `;
    el("section-view").innerHTML = renderSectionView(unit);
  } else {
    host.innerHTML = `
      <h3>Six-crease cut ${unit.id}</h3>
      <p class="hint">A, B, C are set by drawing. Assign fold types below.</p>
      <div class="btn-row"><button id="p-delete">Delete</button></div>
      ${renderPatternPanel(unit)}
    `;
    el("section-view").innerHTML = renderSectionView(null);
  }
}

// ---------------------------------------------------------------------
// Canvas pointer handlers
// ---------------------------------------------------------------------

let handlersBound = false;

function onWheelZoom(e) {
  e.preventDefault();
  const mmBefore = screenToMM(e.clientX, e.clientY);
  const factor = e.deltaY > 0 ? 1.1 : 1 / 1.1;
  const vb = state.view.viewBox;
  const newW = Math.max(10, Math.min(2000, vb.w * factor));
  const newH = Math.max(10, Math.min(2000, vb.h * factor));
  const svg = currentSvg();
  const rect = svg.getBoundingClientRect();
  const fracX = (e.clientX - rect.left) / rect.width;
  const fracY = (e.clientY - rect.top) / rect.height;
  state.view.viewBox = {
    x: mmBefore.x - fracX * newW,
    y: mmBefore.y - fracY * newH,
    w: newW,
    h: newH,
  };
  renderAll();
}

function zoomToFit() {
  const { width, height } = doc().sheet;
  const margin = Math.max(width, height) * 0.05;
  state.view.viewBox = { x: -margin, y: -margin, w: width + margin * 2, h: height + margin * 2 };
  renderAll();
}

function bindCanvasHandlers() {
  if (handlersBound) return;
  handlersBound = true;
  const host = el("canvas-host");
  host.addEventListener("pointerdown", onPointerDown);
  host.addEventListener("pointermove", onPointerMove);
  host.addEventListener("wheel", onWheelZoom, { passive: false });
  host.addEventListener("click", (e) => {
    const draft = state.view.draft;
    if (state.tool === "pairedCut" && draft?.kind === "pairedCutCandidates" && draft.hoveredSide) {
      commitPairedCutCandidate(draft.hoveredSide);
    }
  });
  window.addEventListener("pointerup", onPointerUp);
  window.addEventListener("keydown", onKeyDown);
}

function onPointerDown(e) {
  const mm = screenToMM(e.clientX, e.clientY);
  const tol = pixelToleranceMM();

  if (state.tool === "pan" || e.button === 1) {
    e.preventDefault();
    state.dragging = { kind: "pan", startClientX: e.clientX, startClientY: e.clientY, startViewBox: { ...state.view.viewBox } };
    return;
  }

  if (state.tool === "pairedCut") {
    handlePairedCutToolDown(mm, tol);
    return;
  }
  if (state.tool === "sixCrease") {
    handleSixCreaseToolDown(mm, tol);
    return;
  }
  if (state.tool === "drawCrease") {
    handleDrawCreaseToolDown(mm, tol);
    return;
  }
  if (state.tool === "mirror") {
    handleMirrorToolDown(mm, tol);
    return;
  }

  // select tool
  const hit = hitTest(mm, tol);
  if (!hit) {
    state.view.selection = new Set();
    renderAll();
    return;
  }
  if (!e.shiftKey) state.view.selection = new Set();
  state.view.selection.add(hit.unitId);
  const unit = findUnit(doc(), hit.unitId);
  state.dragging = {
    unitId: hit.unitId,
    handle: hit,
    startUnit: cloneUnit(unit),
    offset: hit.type === "body" && hit.cut === 1 ? sub(unit.origin, mm) : null,
    pointerId: e.pointerId,
  };
  renderAll();
}

function onPointerMove(e) {
  if (state.dragging?.kind === "pan") {
    const svg = currentSvg();
    const rect = svg.getBoundingClientRect();
    const pxPerMM = rect.width / state.view.viewBox.w;
    const dxMM = (e.clientX - state.dragging.startClientX) / pxPerMM;
    const dyMM = (e.clientY - state.dragging.startClientY) / pxPerMM;
    state.view.viewBox = {
      ...state.dragging.startViewBox,
      x: state.dragging.startViewBox.x - dxMM,
      y: state.dragging.startViewBox.y - dyMM,
    };
    renderAll();
    return;
  }

  const mm = screenToMM(e.clientX, e.clientY);
  const tol = pixelToleranceMM();

  if (state.tool === "pairedCut" && state.view.draft?.kind === "drawingCut1") {
    const s = snap(mm, tol);
    state.view.draft.p1 = s ? s.point : mm;
    renderAll();
    return;
  }
  if (state.tool === "pairedCut" && state.view.draft?.kind === "pairedCutCandidates") {
    const draft = state.view.draft;
    let nearest = null;
    let nearestDist = Infinity;
    for (const c of draft.candidates) {
      const dpt = closestPointOnSegment(mm, c.p0, c.p1);
      const dist = length(sub(mm, dpt.point));
      if (dist < nearestDist) {
        nearestDist = dist;
        nearest = c.side;
      }
    }
    draft.hoveredSide = nearest;
    renderAll();
    return;
  }
  if (state.tool === "sixCrease" && state.view.draft?.kind === "sixCreaseDraft") {
    const s = snap(mm, tol);
    const p = s ? s.point : mm;
    const draft = state.view.draft;
    if (!draft.B) draft.previewB = p;
    else if (!draft.C) draft.previewC = p;
    renderAll();
    return;
  }
  if (
    (state.tool === "drawCrease" && state.view.draft?.kind === "drawCreaseDraft") ||
    (state.tool === "mirror" && state.view.draft?.kind === "mirrorAxis")
  ) {
    const s = snap(mm, tol);
    state.view.draft.previewP1 = s ? s.point : mm;
    renderAll();
    return;
  }

  if (!state.dragging) {
    const hover = edgeHoverAt(mm, tol);
    const changed = JSON.stringify(hover) !== JSON.stringify(state.view.hoverEdge);
    if (changed) {
      state.view.hoverEdge = hover;
      renderAll();
    }
    return;
  }

  const { unitId, handle, startUnit } = state.dragging;
  const s = doc().grid.snap.grid ? snap(mm, tol) : null;
  const target = s ? s.point : mm;
  const result = applyDrag(startUnit, handle, target);
  if (!result.ok) {
    setStatus(result.reason);
    return;
  }
  const next = { ...doc(), units: doc().units.map((u) => (u.id === unitId ? result.unit : u)) };
  state.history = { ...state.history, present: next };
  recomputeValidity();
  renderAll();
}

function onPointerUp() {
  if (state.dragging?.kind === "pan") {
    state.dragging = null;
    return;
  }
  if (state.dragging) {
    commit(doc());
    state.dragging = null;
  }
}

function onKeyDown(e) {
  if (e.key === "Escape") {
    state.view.draft = null;
    renderAll();
    return;
  }
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z" && !e.shiftKey) {
    e.preventDefault();
    state.history = undo(state.history);
    recomputeValidity();
    renderAll();
    return;
  }
  if ((e.ctrlKey || e.metaKey) && (e.key.toLowerCase() === "y" || (e.key.toLowerCase() === "z" && e.shiftKey))) {
    e.preventDefault();
    state.history = redo(state.history);
    recomputeValidity();
    renderAll();
    return;
  }
  if (e.key === "Delete" || e.key === "Backspace") {
    if (state.view.selection.size === 0) return;
    if (document.activeElement && ["INPUT", "SELECT"].includes(document.activeElement.tagName)) return;
    deleteSelection();
  }
}

function collectWithDescendants(units, rootIds) {
  const toDelete = new Set(rootIds);
  let grew = true;
  while (grew) {
    grew = false;
    for (const u of units) {
      if (u.parentId && toDelete.has(u.parentId) && !toDelete.has(u.id)) {
        toDelete.add(u.id);
        grew = true;
      }
    }
  }
  return toDelete;
}

function deleteSelection() {
  const toDelete = collectWithDescendants(doc().units, state.view.selection);
  const next = { ...doc(), units: doc().units.filter((u) => !toDelete.has(u.id)) };
  state.view.selection = new Set();
  commit(next);
}

// ---- Paired-cut draw tool ----

function handlePairedCutToolDown(mm, tol) {
  const draft = state.view.draft;
  if (draft?.kind === "pairedCutCandidates") return; // handled by the click commit handler
  const s = snap(mm, tol);
  const p = s ? s.point : mm;
  if (!draft || draft.kind !== "drawingCut1") {
    state.view.draft = { kind: "drawingCut1", p0: p, p1: p };
    renderAll();
    return;
  }
  // second click: commit cut1, present candidates
  const p0 = draft.p0;
  const p1 = p;
  const cutVec = sub(p1, p0);
  const len = length(cutVec);
  if (len < 1) {
    state.view.draft = null;
    renderAll();
    return;
  }
  const cutDir = normalize(cutVec);
  const crossDir = perp(cutDir);
  const center1 = { x: (p0.x + p1.x) / 2, y: (p0.y + p1.y) / 2 };
  const half = len / 2;
  const spacing = state.defaultSpacing;
  const makeCandidate = (side) => {
    const sign = side === "left" ? -1 : 1;
    const center2 = add(center1, scale(crossDir, sign * spacing));
    return {
      side,
      center: center2,
      p0: add(center2, scale(cutDir, -half)),
      p1: add(center2, scale(cutDir, half)),
    };
  };
  state.view.draft = {
    kind: "pairedCutCandidates",
    cut1: { p0, p1 },
    cutDir,
    crossDir,
    center1,
    half,
    candidates: [makeCandidate("left"), makeCandidate("right")],
    hoveredSide: null,
  };
  renderAll();
}

function commitPairedCutCandidate(side) {
  const draft = state.view.draft;
  const cand = draft.candidates.find((c) => c.side === side);
  if (!cand) return;
  const origin = { x: (draft.center1.x + cand.center.x) / 2, y: (draft.center1.y + cand.center.y) / 2 };
  const rotation = Math.atan2(draft.cutDir.y, draft.cutDir.x);
  const unit = createPairedCutUnit(doc(), {
    origin,
    rotation,
    cutLength: draft.half * 2,
    spacing: length(sub(cand.center, draft.center1)),
    creaseOffset: 0,
    flapLength: state.defaultFlapLength,
  });
  const next = { ...doc(), units: [...doc().units, unit] };
  state.view.draft = null;
  state.view.selection = new Set([unit.id]);
  state.tool = "select";
  setActiveTool("select");
  commit(next);
}

// ---- Six-crease draw tool ----

function handleSixCreaseToolDown(mm, tol) {
  const s = snap(mm, tol);
  const p = s ? s.point : mm;
  const draft = state.view.draft?.kind === "sixCreaseDraft" ? state.view.draft : { kind: "sixCreaseDraft" };
  if (!draft.A) draft.A = p;
  else if (!draft.B) draft.B = p;
  else if (!draft.C) {
    draft.C = p;
    const unit = createSixCreaseCut(doc(), { A: draft.A, B: draft.B, C: draft.C });
    const next = { ...doc(), units: [...doc().units, unit] };
    state.view.draft = null;
    state.view.selection = new Set([unit.id]);
    state.tool = "select";
    setActiveTool("select");
    commit(next);
    return;
  }
  state.view.draft = draft;
  renderAll();
}

// ---- Draw-crease sub-tool (six-crease roles) ----

function handleDrawCreaseToolDown(mm, tol) {
  const unit = selectedUnit();
  if (!unit || unit.type !== "sixCreaseCut") {
    setStatus("Select a six-crease cut first, then draw a crease near one of its endpoints.");
    return;
  }
  const s = snap(mm, tol);
  const p = s ? s.point : mm;
  const draft = state.view.draft?.kind === "drawCreaseDraft" ? state.view.draft : { kind: "drawCreaseDraft" };
  if (!draft.p0) {
    draft.p0 = p;
    state.view.draft = draft;
    renderAll();
    return;
  }
  const role = classifyDrawnCrease(unit, draft.p0, p);
  state.view.draft = null;
  if (!role) {
    setStatus("That line doesn't start near A, B or C — discarded.");
    renderAll();
    return;
  }
  const next = cloneUnit(unit);
  next.creaseRefs[role] = { p0: draft.p0, p1: p };
  const nextDoc = { ...doc(), units: doc().units.map((u) => (u.id === unit.id ? next : u)) };
  setStatus(`Crease drawn for role ${role}. Set its fold type in the properties panel.`);
  commit(nextDoc);
}

// ---- Mirror tool ----

function handleMirrorToolDown(mm, tol) {
  const s = snap(mm, tol);
  const p = s ? s.point : mm;
  const draft = state.view.draft?.kind === "mirrorAxis" ? state.view.draft : { kind: "mirrorAxis" };
  if (!draft.p0) {
    draft.p0 = p;
    state.view.draft = draft;
    renderAll();
    return;
  }
  const axisPoint = draft.p0;
  const axisDir = sub(p, draft.p0);
  if (length(axisDir) < 1e-6) {
    state.view.draft = null;
    renderAll();
    return;
  }
  const targets = [...state.view.selection].map((id) => findUnit(doc(), id)).filter((u) => u && u.type === "pairedCut");
  if (targets.length === 0) {
    setStatus("Select at least one paired-cut unit before using Mirror.");
    state.view.draft = null;
    renderAll();
    return;
  }
  const mirrored = targets.map((u) => createPairedCutUnit(doc(), mirrorUnit(u, axisPoint, axisDir)));
  const next = { ...doc(), units: [...doc().units, ...mirrored] };
  state.view.draft = null;
  state.view.selection = new Set(mirrored.map((u) => u.id));
  state.tool = "select";
  setActiveTool("select");
  commit(next);
}

// ---------------------------------------------------------------------
// Panel event binding (re-bound each render since innerHTML is replaced)
// ---------------------------------------------------------------------

function bindHierarchyHandlers() {
  el("hierarchy-panel").querySelectorAll(".hierarchy-node").forEach((node) => {
    node.addEventListener("click", (e) => {
      const id = node.dataset.unitId;
      if (!e.shiftKey) state.view.selection = new Set();
      state.view.selection.add(id);
      renderAll();
    });
  });
}

function numField(id, apply) {
  const input = el(id);
  if (!input) return;
  input.addEventListener("change", () => {
    const unit = selectedUnit();
    if (!unit) return;
    const result = apply(unit, parseFloat(input.value));
    if (!result || result.ok === false) {
      setStatus(result?.reason || "Edit rejected.");
      renderAll();
      return;
    }
    const nextUnit = result.unit || result;
    const next = { ...doc(), units: doc().units.map((u) => (u.id === unit.id ? nextUnit : u)) };
    commit(next);
  });
}

function bindPropertyHandlers() {
  const unit = selectedUnit();
  if (!unit) return;
  if (unit.type === "pairedCut") {
    numField("p-origin-x", (u, v) => ({ ok: true, unit: { ...u, origin: { ...u.origin, x: v } } }));
    numField("p-origin-y", (u, v) => ({ ok: true, unit: { ...u, origin: { ...u.origin, y: v } } }));
    numField("p-rotation", (u, v) => ({ ok: true, unit: { ...u, rotation: (v * Math.PI) / 180 } }));
    numField("p-cutlength", (u, v) => trySetCutLength(u, v));
    numField("p-spacing", (u, v) => trySetSpacing(u, v));
    numField("p-crease", (u, v) => trySetCreaseOffset(u, v));
    numField("p-flap", (u, v) => ({ ok: true, unit: { ...u, flapLength: v } }));
    el("p-mv").addEventListener("change", (e) => {
      const next = { ...unit, mountainValley: e.target.value };
      commit({ ...doc(), units: doc().units.map((u) => (u.id === unit.id ? next : u)) });
    });
    el("p-pop").addEventListener("change", (e) => {
      const next = { ...unit, popDirection: e.target.checked ? -1 : 1 };
      commit({ ...doc(), units: doc().units.map((u) => (u.id === unit.id ? next : u)) });
    });
    el("p-lock-cuts").addEventListener("change", (e) => {
      const next = { ...unit, locks: { ...unit.locks, cuts: e.target.checked } };
      commit({ ...doc(), units: doc().units.map((u) => (u.id === unit.id ? next : u)) });
    });
    el("p-lock-crease").addEventListener("change", (e) => {
      const next = { ...unit, locks: { ...unit.locks, crease: e.target.checked } };
      commit({ ...doc(), units: doc().units.map((u) => (u.id === unit.id ? next : u)) });
    });
    el("p-reset-midline").addEventListener("click", () => {
      const result = resetToMidline(unit);
      if (result.ok) commit({ ...doc(), units: doc().units.map((u) => (u.id === unit.id ? result.unit : u)) });
    });
    el("p-duplicate").addEventListener("click", () => {
      const copy = { ...cloneUnit(unit), id: undefined };
      const withId = createPairedCutUnit(doc(), { ...copy, origin: add(unit.origin, { x: 10, y: 10 }) });
      commit({ ...doc(), units: [...doc().units, withId] });
    });
    el("p-delete").addEventListener("click", deleteSelection);
    if (unit.arrayOf) {
      el("p-detach").addEventListener("click", () => {
        const next = detachArrayInstance(unit);
        commit({ ...doc(), units: doc().units.map((u) => (u.id === unit.id ? next : u)) });
      });
    }
  } else {
    el("p-delete").addEventListener("click", deleteSelection);
    const patternSelect = el("pattern-select");
    if (patternSelect) {
      patternSelect.addEventListener("change", (e) => {
        const next = setPattern(unit, e.target.value ? Number(e.target.value) : null);
        commit({ ...doc(), units: doc().units.map((u) => (u.id === unit.id ? next : u)) });
      });
    }
    document.querySelectorAll(".role-select").forEach((select) => {
      select.addEventListener("change", (e) => {
        const role = select.dataset.role;
        const next = setAssignment(unit, role, e.target.value || null);
        commit({ ...doc(), units: doc().units.map((u) => (u.id === unit.id ? next : u)) });
      });
    });
  }
}

// ---------------------------------------------------------------------
// Toolbar / sheet / grid / export / save-load wiring (bound once)
// ---------------------------------------------------------------------

function setActiveTool(tool) {
  state.tool = tool;
  state.view.draft = null;
  document.querySelectorAll(".tool-btn").forEach((b) => b.classList.toggle("active", b.dataset.tool === tool));
  el("canvas-host").classList.toggle("pan-tool", tool === "pan");
  renderAll();
}

function wireStaticControls() {
  document.querySelectorAll(".tool-btn").forEach((btn) => {
    btn.addEventListener("click", () => setActiveTool(btn.dataset.tool));
  });

  el("zoom-fit-btn").addEventListener("click", zoomToFit);

  el("undo-btn").addEventListener("click", () => {
    state.history = undo(state.history);
    recomputeValidity();
    renderAll();
  });
  el("redo-btn").addEventListener("click", () => {
    state.history = redo(state.history);
    recomputeValidity();
    renderAll();
  });

  el("sheet-width").addEventListener("change", (e) => {
    commit({ ...doc(), sheet: { ...doc().sheet, width: parseFloat(e.target.value) } });
  });
  el("sheet-height").addEventListener("change", (e) => {
    commit({ ...doc(), sheet: { ...doc().sheet, height: parseFloat(e.target.value) } });
  });
  el("sheet-preset").addEventListener("change", (e) => {
    const presets = {
      "a4-portrait": [210, 297],
      "a4-landscape": [297, 210],
      "a3-portrait": [297, 420],
      letter: [215.9, 279.4],
    };
    const preset = presets[e.target.value];
    if (preset) commit({ ...doc(), sheet: { ...doc().sheet, width: preset[0], height: preset[1] } });
  });

  el("grid-visible").addEventListener("change", (e) => {
    commit({ ...doc(), grid: { ...doc().grid, visible: e.target.checked } });
  });
  el("grid-major").addEventListener("change", (e) => {
    commit({ ...doc(), grid: { ...doc().grid, majorSpacing: parseFloat(e.target.value) } });
  });
  el("grid-minor").addEventListener("change", (e) => {
    commit({ ...doc(), grid: { ...doc().grid, minorSpacing: parseFloat(e.target.value) } });
  });
  for (const key of ["grid", "endpoint", "midpoint", "intersection", "cut", "crease", "center"]) {
    const cb = el(`snap-${key}`);
    if (!cb) continue;
    cb.addEventListener("change", (e) => {
      commit({ ...doc(), grid: { ...doc().grid, snap: { ...doc().grid.snap, [key]: e.target.checked } } });
    });
  }

  el("array-apply").addEventListener("click", () => {
    const unit = selectedUnit();
    if (!unit || unit.type !== "pairedCut") {
      setStatus("Select a single paired-cut unit first.");
      return;
    }
    const dx = parseFloat(el("array-dx").value);
    const dy = parseFloat(el("array-dy").value);
    const spacing = parseFloat(el("array-spacing").value);
    const count = Math.max(1, parseInt(el("array-count").value, 10));
    const instances = arrayInstances(unit, { x: dx, y: dy }, spacing, count);
    const newOnes = instances.slice(1).map((inst, k) => {
      const created = createPairedCutUnit(doc(), inst);
      created.arrayOf = { sourceId: unit.id, index: k + 1 };
      return created;
    });
    commit({ ...doc(), units: [...doc().units, ...newOnes] });
  });

  el("save-btn").addEventListener("click", () => {
    const text = saveDocument(doc());
    const blob = new Blob([text], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "kirigami-document.json";
    a.click();
  });
  el("load-input").addEventListener("change", async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const text = await file.text();
      const loaded = loadDocument(text);
      replaceDocument(loaded);
      setStatus(`Loaded ${file.name}`);
    } catch (err) {
      setStatus(`Load failed: ${err.message}`);
    }
    e.target.value = "";
  });

  el("export-btn").addEventListener("click", () => {
    const options = {
      includeCuts: el("export-cuts").checked,
      includeMountain: el("export-mountain").checked,
      includeValley: el("export-valley").checked,
      includeReference: el("export-reference").checked,
      includeBoundary: el("export-boundary").checked,
      includeRegistrationMarks: el("export-registration").checked,
    };
    const svg = exportSVG(doc(), options);
    const check = verifyExportedSVG(svg, doc());
    setStatus(check.ok ? "Export verified OK." : `Export check found issues: ${check.problems.join(", ")}`);
    const blob = new Blob([svg], { type: "image/svg+xml" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "kirigami-export.svg";
    a.click();
  });
}

// ---------------------------------------------------------------------
// Boot
// ---------------------------------------------------------------------

export function boot() {
  wireStaticControls();
  bindCanvasHandlers();
  setActiveTool("select");
  zoomToFit();
}
