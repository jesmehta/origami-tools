'use strict';
/* Mirror Pleats engine — shared by linear.html and radial.html (window.MODE). */
const MODE = window.MODE === 'radial' ? 'radial' : 'linear';
const GAP = 1;                                   // min mm between neighbouring vertical ends
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const fmt = n => +n.toFixed(4);
const DEG = Math.PI / 180;

/* ---------- sidebar ---------- */
const vertPanel = MODE === 'linear' ? `
  <fieldset><legend data-tip="Verticals are the mirrors. Count, spacing and first x generate an even set; hand edits make the layout free.">Verticals · linear</legend>
    <div class="row">
      <label>Count <input type="number" id="gN" min="2" max="40" step="1"></label>
      <label>Spacing <input type="number" id="gSp" min="1" step="0.5"> mm</label>
      <label>First x <input type="number" id="gSt" step="0.5"> mm</label>
    </div>
    <div class="row">
      <button id="bFit" data-tip="Spread the verticals so the first and last sit on the left and right edges.">Fit edge to edge</button>
      <button id="bReset">Reset verticals</button>
    </div>
    <div class="row"><label data-tip="Limit each vertical's tilt to 45° either side of upright."><input type="checkbox" id="cap"> Cap verticals at ±45°</label></div>` : `
  <fieldset><legend data-tip="Verticals fanned from the ◆ centre, spaced by Step degrees and turned by Rotate. Verticals may enter and exit through any edge; ones that miss the rectangle are drawn grey. Drag the ◆ in Verticals mode.">Verticals · radial</legend>
    <div class="row">
      <label>Count <input type="number" id="gN" min="2" max="40" step="1"></label>
      <label>Step <input type="number" id="gStep" min="0.5" step="0.5"> °</label>
      <label>Rotate <input type="number" id="gOff" step="1"> °</label>
    </div>
    <div class="row">
      <label>Centre x <input type="number" id="cx" step="1"></label>
      <label>y <input type="number" id="cy" step="1"></label>
    </div>
    <div class="row"><label data-tip="On: existing and new verticals all pass through the centre (a new one is a single click on an edge; dragging rotates about the centre). Off: free edge-to-edge lines. The centre must be above or below the rectangle."><input type="checkbox" id="enf"> Enforce radial from centre</label></div>
    <div class="row"><button id="bReset">Reset verticals</button></div>`;

document.getElementById('app').innerHTML = `
<aside>
  <a class="ot-back" href="../index.html">← Origami tools</a>
  <h1>Mirror Pleats · ${MODE === 'linear' ? 'Linear' : 'Radial'}</h1>
  <p class="sw">Switch: ${MODE === 'linear' ? '<b>Linear</b> · <a href="radial.html">Radial</a>' : '<a href="linear.html">Linear</a> · <b>Radial</b>'}</p>

  <fieldset><legend>Sheet</legend>
    <div class="row">
      <label>Size <select id="pgSel"></select></label>
      <button id="pgSwap" data-tip="Swap portrait / landscape">⇄</button>
    </div>
    <div class="row">
      <label>W <input type="number" id="W" min="10" step="1"> mm</label>
      <label>H <input type="number" id="H" min="10" step="1"> mm</label>
    </div>
    <div class="row"><label data-tip="Inset on every side (5–15 mm). The pattern is cropped at the margin line, which is exported as the cut line; the page outline is not exported. Changing it keeps the page size and rescales the pattern.">Margin <input type="number" id="marg" min="5" max="15" step="1"> mm</label></div>
  </fieldset>

  ${vertPanel}
    <div class="row" id="selV" hidden>
      <b>V<span id="selVn"></span></b>
      <label>top x <input type="number" id="vxt" step="0.5"></label>
      <label>bottom x <input type="number" id="vxb" step="0.5"></label>
      <span>
        <button id="nudL" data-tip="Move the whole line left by the step">◀</button>
        <button id="nudR" data-tip="Move the whole line right by the step">▶</button>
        <input type="number" id="step" value="1" min="0.1" step="0.5" style="width:52px"> mm
      </span>
    </div>
  </fieldset>

  <fieldset><legend>Edit mode</legend>
    <div class="row">
      <button id="mLines" class="on">Lines</button>
      <button id="mVerts">Verticals</button>
      <button id="mMeas" data-tip="Click two points (distance) or two lines (angle); pick which in Dimensions.">Measure</button>
    </div>
    <div class="row"><label><input type="checkbox" id="snap45"> Snap lines to 45° while drawing/dragging</label></div>
    <div class="row">
      <button id="bDel" data-tip="Delete / Backspace">Delete selected</button>
      <button id="bClear">Clear lines</button>
    </div>
  </fieldset>

  <fieldset><legend data-tip="Evenly distributed lines snapped to 45°, optionally alternating up/down.">Ordered layout</legend>
    <div class="row">
      <label>Lines <input type="number" id="nH" min="1" max="60" step="1"></label>
      <label><input type="checkbox" id="alt"> alternate ↑↓</label>
    </div>
    <div class="row">
      <button id="oAll">Ordered ${MODE}</button>
      <button id="oHor">Re-order lines only</button>
    </div>
  </fieldset>

  <fieldset><legend data-tip="Random lines are placed one at a time and rejected if they cross another trail or come closer than the min vertex gap on any vertical.">Randomize</legend>
    <div class="row">
      <button id="rV">Verticals</button>
      <button id="rH">Lines</button>
      <button id="rA">Both</button>
    </div>
    <div class="row"><label>Min vertex gap <input type="number" id="mg" min="0" step="0.5"> mm</label></div>
  </fieldset>

  <fieldset><legend>Dimensions</legend>
    <div class="row"><label><input type="checkbox" id="gh" checked> Show off-rectangle ghost lines (grey)</label></div>
    <div class="row"><label><input type="checkbox" id="dEdge"> Edge spacing (mm)</label></div>
    <div class="row"><label><input type="checkbox" id="dTilt"> Vertical tilt (°)</label></div>
    <div class="row"><label><input type="checkbox" id="dBase"> Drawn-line angle (°)</label></div>
    <div class="row"><label><input type="checkbox" id="dRefl"> Reflected-line angles (°)</label></div>
    <div class="row"><label><input type="checkbox" id="dVtx"> Vertex gaps on verticals (mm)</label></div>
    <div class="row">
      <label><input type="radio" name="mt" id="mtD" value="dist" checked> Measure distance (2 points)</label>
      <label><input type="radio" name="mt" value="angle"> Measure angle (2 lines)</label>
    </div>
    <div class="row"><button id="mClear" data-tip="Measurements are snapshots; they don't follow later edits.">Clear measurements</button></div>
  </fieldset>

  <fieldset><legend>Export</legend>
    <div class="row">
      <label>Lines <input type="color" id="colLine" value="#2e8b57"></label>
      <label>Margin (cut) <input type="color" id="colRect" value="#111111"></label>
    </div>
    <div class="row">
      <label>Stroke <input type="number" id="sw" value="0.2" min="0.05" step="0.05"> mm</label>
      <label>PNG <input type="number" id="ppm" value="6" min="1" max="30" step="1"> px/mm</label>
    </div>
    <div class="row">
      <button id="xSvg" class="pri">Export SVG</button>
      <button id="xPng" class="pri">Export PNG</button>
      <button id="xZip" class="pri" data-tip="SVG + PNG together in one .zip (same time-stamped name).">Export ZIP</button>
    </div>
  </fieldset>

  <div class="row"><button id="bUndo">Undo</button><button id="bRedo">Redo</button></div>
</aside>
<main>
  <svg id="cv" xmlns="http://www.w3.org/2000/svg"></svg>
  <div id="status"></div>
</main>`;

const $ = id => document.getElementById(id);
const on = (id, ev, fn) => { const el = $(id); if (el) el[ev] = fn; };
const cv = $('cv');

/* ---------- state ---------- */
const S = {
  W: 277, H: 190, m: 10, // W × H: the area inside the margin m (origin at its top-left); the page is W + 2m × H + 2m
  verts: [],            // {xt, xb}: x at top edge (y=0) and bottom edge (y=H)
  hors: [],             // {k, a, b}: line between V_k (at a) and V_k+1 (at b); a,b in 0..1 top→bottom
  layout: 'gen',        // 'gen' (generated from parameters) | 'free' (hand-edited)
  centre: { x: 138.5, y: -126 },
  cap: MODE === 'linear',
  enforce: MODE === 'radial',
  minGap: 4,
  gen: MODE === 'linear' ? { n: 7, spacing: 40, start: 20 } : { n: 7, step: 8, offset: 0 },
};
const UI = {
  mode: 'lines', draw: null, selV: -1, selH: -1, viewLock: null,
  meas: [], mp: null, mcur: null, info: null, note: '',
  ghost: true,
  dim: { edge: false, tilt: false, base: false, refl: false, vtx: false },
};

/* ---------- undo ---------- */
const undoS = [], redoS = [];
const snap = () => JSON.stringify({ W: S.W, H: S.H, m: S.m, verts: S.verts, hors: S.hors, layout: S.layout, centre: S.centre, cap: S.cap, enforce: S.enforce, gen: S.gen, minGap: S.minGap });
function restore(j) { Object.assign(S, JSON.parse(j)); UI.selV = UI.selH = -1; UI.draw = null; UI.vdraw = null; syncUI(); render(); }
function pushUndo(j) { undoS.push(j || snap()); if (undoS.length > 80) undoS.shift(); redoS.length = 0; }
function act(fn) { pushUndo(); UI.note = ''; fn(); syncUI(); render(); }
function undo() { if (!undoS.length) return; redoS.push(snap()); restore(undoS.pop()); }
function redo() { if (!redoS.length) return; undoS.push(snap()); restore(redoS.pop()); }

/* ---------- geometry ---------- */
const vp = (v, t) => [v.xt + (v.xb - v.xt) * t, S.H * t];

function reflectPt(p, v) {
  const dx = v.xb - v.xt, dy = S.H, L = dx * dx + dy * dy;
  const k = ((p[0] - v.xt) * dx + p[1] * dy) / L;
  return [2 * (v.xt + k * dx) - p[0], 2 * k * dy - p[1]];
}

// ray o + s*d against the INFINITE line of vertical v
function rayVert(o, d, v) {
  const ex = v.xb - v.xt, ey = S.H;
  const den = d[0] * ey - d[1] * ex;
  if (Math.abs(den) < 1e-12) return null;
  const s = ((v.xt - o[0]) * ey - (0 - o[1]) * ex) / den;
  return { s };
}

// visible part of a vertical (an infinite line given by its x at y=0 and y=H); null if it misses the rectangle
const vSeg = v => clipBox(v.xt, 0, v.xb, S.H);
const vEnds = v => { const c = vSeg(v); return c ? [[c[0], c[1]], [c[2], c[3]]] : null; };
const visT = v => { const c = vSeg(v); return c ? [c[1] / S.H, c[3] / S.H] : null; };
// the whole line clipped to the current view (for ghosts and hit-testing)
const vView = v => { const b = bounds(), d = v.xb - v.xt; return clipBox(v.xt - d * 100, -S.H * 100, v.xt + d * 100, S.H * 100, b.x0, b.y0, b.x1, b.y1); };

// t on vertical v where a ±45° ray from P (x-direction dx, y-direction dy) lands
function ray45(P, dx, dy, v) {
  const q = dx * dy, D = v.xb - v.xt, den = S.H - q * D, r = visT(v);
  if (Math.abs(den) < 1e-9 || !r) return null;
  const t = (P[1] + q * (v.xt - P[0])) / den;
  if (t < r[0] - 1e-9 || t > r[1] + 1e-9) return null;
  if (dx * (vp(v, t)[0] - P[0]) <= 0) return null;
  return clamp(t, r[0], r[1]);
}

function projT(p, v) {
  const A = vp(v, 0), B = vp(v, 1), ex = B[0] - A[0], ey = B[1] - A[1], r = visT(v) || [0, 1];
  return clamp(((p.x - A[0]) * ex + (p.y - A[1]) * ey) / (ex * ex + ey * ey), r[0], r[1]);
}
function distSeg(p, a, b) {
  const ex = b[0] - a[0], ey = b[1] - a[1], L = ex * ex + ey * ey || 1;
  const t = clamp(((p.x - a[0]) * ex + (p.y - a[1]) * ey) / L, 0, 1);
  return Math.hypot(p.x - a[0] - t * ex, p.y - a[1] - t * ey);
}

// Liang–Barsky crop to a box (default: the rectangle)
function clipBox(x1, y1, x2, y2, bx0 = 0, by0 = 0, bx1 = S.W, by1 = S.H) {
  let t0 = 0, t1 = 1; const dx = x2 - x1, dy = y2 - y1;
  const ps = [-dx, dx, -dy, dy], qs = [x1 - bx0, bx1 - x1, y1 - by0, by1 - y1];
  for (let i = 0; i < 4; i++) {
    if (Math.abs(ps[i]) < 1e-12) { if (qs[i] < 0) return null; continue; }
    const r = qs[i] / ps[i];
    if (ps[i] < 0) { if (r > t1) return null; if (r > t0) t0 = r; }
    else { if (r < t0) return null; if (r < t1) t1 = r; }
  }
  if ((t1 - t0) * Math.hypot(dx, dy) < 1e-6) return null;
  return [x1 + t0 * dx, y1 + t0 * dy, x1 + t1 * dx, y1 + t1 * dy];
}
const clipRect = (x1, y1, x2, y2) => clipBox(x1, y1, x2, y2);
const inRect = p => p[0] >= -1e-6 && p[0] <= S.W + 1e-6 && p[1] >= -1e-6 && p[1] <= S.H + 1e-6;

// Everything for one drawn line: the base segment and its reflection chain in
// both directions across the INFINITE verticals; cropped to the rectangle
// only afterwards, so a trail may leave and re-enter.
function computeOne(h, hi) {
  const V = S.verts, n = V.length, segs = [], vtx = [];
  if (!V[h.k] || !V[h.k + 1]) return { segs, vtx };
  const LIM = (S.W + S.H) * 30;
  const mk = (a, b, base) => segs.push({ s: [a[0], a[1], b[0], b[1]], c: clipRect(a[0], a[1], b[0], b[1]), base, hi });
  const addV = (vi, p) => { if (inRect(p)) vtx.push({ v: vi, p }); };
  const P = vp(V[h.k], h.a), Q = vp(V[h.k + 1], h.b);
  mk(P, Q, true); addV(h.k, P); addV(h.k + 1, Q);
  for (const dir of [1, -1]) {
    let A = dir > 0 ? P : Q, B = dir > 0 ? Q : P, ai = dir > 0 ? h.k + 1 : h.k;
    let atEnd = false;
    for (;;) {
      if (ai + dir < 0 || ai + dir >= n) { atEnd = true; break; }
      const Ap = reflectPt(A, V[ai]);
      const d = [Ap[0] - B[0], Ap[1] - B[1]];
      if (Math.hypot(d[0], d[1]) < 1e-9) break;
      const hit = rayVert(B, d, V[ai + dir]);
      if (!hit || hit.s <= 1e-9 || hit.s * Math.hypot(d[0], d[1]) > LIM) break;
      const C = [B[0] + hit.s * d[0], B[1] + hit.s * d[1]];
      mk(B, C, false); addV(ai + dir, C);
      A = B; B = C; ai += dir;
    }
    if (atEnd) {                       // first/last vertical also mirrors outward; the ray is cropped by the rectangle
      const Ap = reflectPt(A, V[ai]), d = [Ap[0] - B[0], Ap[1] - B[1]], len = Math.hypot(d[0], d[1]);
      if (len > 1e-9) mk(B, [B[0] + d[0] * LIM / len, B[1] + d[1] * LIM / len], false);
    }
  }
  return { segs, vtx };
}
function computeAll(hors = S.hors) {
  const segs = [], vtx = [];
  hors.forEach((h, i) => { const r = computeOne(h, i); segs.push(...r.segs); vtx.push(...r.vtx); });
  return { segs, vtx };
}

function segsCross(a, b) {
  const o = (px, py, qx, qy, rx, ry) => (qx - px) * (ry - py) - (qy - py) * (rx - px);
  const d1 = o(a[0], a[1], a[2], a[3], b[0], b[1]), d2 = o(a[0], a[1], a[2], a[3], b[2], b[3]);
  const d3 = o(b[0], b[1], b[2], b[3], a[0], a[1]), d4 = o(b[0], b[1], b[2], b[3], a[2], a[3]);
  if (Math.abs(d1) < 1e-9 && Math.abs(d2) < 1e-9) {          // collinear: overlap test on the bounding boxes
    return Math.max(Math.min(a[0], a[2]), Math.min(b[0], b[2])) <= Math.min(Math.max(a[0], a[2]), Math.max(b[0], b[2])) + 1e-9 &&
           Math.max(Math.min(a[1], a[3]), Math.min(b[1], b[3])) <= Math.min(Math.max(a[1], a[3]), Math.max(b[1], b[3])) + 1e-9;
  }
  return d1 * d2 <= 1e-9 && d3 * d4 <= 1e-9;
}
function analyze(all) {
  let cross = 0;
  const cs = all.segs.filter(g => g.c);
  if (cs.length <= 700) {
    for (let i = 0; i < cs.length; i++) for (let j = i + 1; j < cs.length; j++)
      if (cs[i].hi !== cs[j].hi && segsCross(cs[i].c, cs[j].c)) cross++;
  } else cross = -1;
  let minGap = Infinity;
  const by = {};
  all.vtx.forEach(q => (by[q.v] = by[q.v] || []).push(q.p));
  Object.values(by).forEach(l => {
    l.sort((a, b) => a[1] - b[1]);
    for (let i = 1; i < l.length; i++) minGap = Math.min(minGap, Math.hypot(l[i][0] - l[i - 1][0], l[i][1] - l[i - 1][1]));
  });
  return { cross, minGap };
}

/* ---------- vertical constraints ---------- */
function ordRange(i, k) {
  let lo = 0, hi = S.W;
  if (i > 0) lo = Math.max(lo, S.verts[i - 1][k] + GAP);
  if (i < S.verts.length - 1) hi = Math.min(hi, S.verts[i + 1][k] - GAP);
  return { lo, hi };
}
function setEnd(i, end, x) {
  const k = end === 't' ? 'xt' : 'xb', o = end === 't' ? 'xb' : 'xt';
  let { lo, hi } = ordRange(i, k);
  if (S.cap) {
    const l2 = Math.max(lo, S.verts[i][o] - S.H), h2 = Math.min(hi, S.verts[i][o] + S.H);
    if (l2 <= h2) { lo = l2; hi = h2; }
  }
  if (lo > hi) return;
  S.verts[i][k] = clamp(x, lo, hi);
}
function moveBody(i, orig, dx) {
  const rT = ordRange(i, 'xt'), rB = ordRange(i, 'xb');
  const mn = Math.max(rT.lo - orig.xt, rB.lo - orig.xb), mx = Math.min(rT.hi - orig.xt, rB.hi - orig.xb);
  if (mn > mx) return;
  dx = clamp(dx, mn, mx);
  S.verts[i].xt = orig.xt + dx; S.verts[i].xb = orig.xb + dx;
}
function sanitize() {
  if (MODE === 'radial') { if (S.enforce) gapRadial(); return; }
  const n = S.verts.length;
  if (S.cap) S.verts.forEach(v => { v.xb = clamp(v.xb, v.xt - S.H, v.xt + S.H); });
  for (const k of ['xt', 'xb']) {
    for (let i = 0; i < n; i++) S.verts[i][k] = clamp(Math.max(S.verts[i][k], i ? S.verts[i - 1][k] + GAP : 0), 0, S.W);
    for (let i = n - 1; i >= 0; i--) S.verts[i][k] = Math.min(S.verts[i][k], i < n - 1 ? S.verts[i + 1][k] - GAP : S.W);
  }
}
// --- radial helpers. Verticals are infinite lines; they may cross the rectangle through any edge. ---
const wideY = () => Math.abs(S.H - S.centre.y) > Math.abs(S.centre.y) ? S.H : 0;
const radialAt = k => ({ xt: S.centre.x + k * (0 - S.centre.y), xb: S.centre.x + k * (S.H - S.centre.y) });
const kOf = (x, y) => (x - S.centre.x) / (y - S.centre.y);
const uOf = k => (S.centre.y < 0 ? 1 : -1) * Math.atan(k);       // increases along the verticals array
const GAPU = 0.2 * DEG;                                           // min angle between centre-lines
// keep centre-lines at least GAPU apart, in array order
function gapRadial() {
  const sg = S.centre.y < 0 ? 1 : -1;
  let prev = -Infinity;
  S.verts.forEach(v => {
    let u = sg * Math.atan(kOf(v.xt, 0)); if (u < prev + GAPU) u = prev + GAPU;
    prev = u; Object.assign(v, radialAt(Math.tan(sg * u)));
  });
}
// snap every existing vertical onto a line through the centre (via the midpoint of its span)
function enforceRadial() {
  fixCentre();
  S.verts.forEach(v => Object.assign(v, radialAt(kOf((v.xt + v.xb) / 2, S.H / 2))));
  gapRadial();
}
// rotate vertical i about the centre toward slope k1, stopping at the last valid position
function setRadialK(i, k1) {
  if (!isFinite(k1)) return;
  const V = S.verts, kk = j => kOf(V[j].xt, 0);
  const lo = i > 0 ? uOf(kk(i - 1)) + GAPU : -Infinity, hi = i < V.length - 1 ? uOf(kk(i + 1)) - GAPU : Infinity;
  const ok = k => { const u = uOf(k); return u >= lo - 1e-12 && u <= hi + 1e-12 && Math.abs(Math.atan(k)) <= 89 * DEG; };
  let k = k1;
  if (!ok(k1)) {
    let a = kk(i), b = k1;
    if (!ok(a)) return;
    for (let n = 0; n < 24; n++) { const m = (a + b) / 2; if (ok(m)) a = m; else b = m; }
    k = a;
  }
  Object.assign(V[i], radialAt(k));
}
// --- free (not through the centre) radial-page verticals: edge-to-edge lines, kept apart inside the rectangle ---
function segDist(a, b) {
  if (segsCross(a, b)) return 0;
  const d = (x, y, sg) => distSeg({ x, y }, [sg[0], sg[1]], [sg[2], sg[3]]);
  return Math.min(d(a[0], a[1], b), d(a[2], a[3], b), d(b[0], b[1], a), d(b[2], b[3], a));
}
function freeOK(i, cand) {
  const c = vSeg(cand); if (!c) return false;
  return S.verts.every((v, j) => { if (j === i) return true; const o = vSeg(v); return !o || segDist(c, o) >= GAP; });
}
function nearestOnRect(p) {
  const x = clamp(p.x, 0, S.W), y = clamp(p.y, 0, S.H);
  if (p.x >= 0 && p.x <= S.W && p.y >= 0 && p.y <= S.H) {
    const d = [x, S.W - x, y, S.H - y], m = Math.min(...d);
    return m === d[0] ? [0, y] : m === d[1] ? [S.W, y] : m === d[2] ? [x, 0] : [x, S.H];
  }
  return [x, y];
}
function lineFrom(A, B) {                                        // infinite line through two points, as intercepts at y=0 / y=H
  const dy = B[1] - A[1]; if (Math.abs(dy) < 1e-6) return null;
  const k = (B[0] - A[0]) / dy;
  return { xt: A[0] + (0 - A[1]) * k, xb: A[0] + (S.H - A[1]) * k };
}
function setEndFree(i, end, p) {                                 // drag one visible end along the rectangle outline
  const e = vEnds(S.verts[i]); if (!e) return;
  const cand = lineFrom(nearestOnRect(p), e[end === 't' ? 1 : 0]);
  if (cand && freeOK(i, cand)) Object.assign(S.verts[i], cand);
}
function moveBodyFree(i, orig, dx) {
  const at = d => ({ xt: orig.xt + d, xb: orig.xb + d });
  if (freeOK(i, at(dx))) { Object.assign(S.verts[i], at(dx)); return; }
  let a = 0, b = dx;
  for (let n = 0; n < 16; n++) { const m = (a + b) / 2; if (freeOK(i, at(m))) a = m; else b = m; }
  Object.assign(S.verts[i], at(a));
}
const fixHors = () => { S.hors = S.hors.filter(h => h.k >= 0 && h.k + 1 < S.verts.length); };

/* ---------- generators ---------- */
function genLinear() {
  const g = S.gen, n = g.n;
  g.start = clamp(g.start, 0, S.W - (n - 1) * GAP);
  g.spacing = Math.min(g.spacing, (S.W - g.start) / (n - 1));
  return Array.from({ length: n }, (_, i) => { const x = g.start + i * g.spacing; return { xt: x, xb: x }; });
}
function fixCentre() {
  S.centre.x = clamp(S.centre.x, -2 * S.W, 3 * S.W);
  if (S.centre.y >= 0 && S.centre.y <= S.H) S.centre.y = S.centre.y < S.H / 2 ? -1 : S.H + 1;
}
function genRadial(jitter) {
  fixCentre();
  const { x: cx, y: cy } = S.centre, g = S.gen, out = [];
  let dropped = 0;
  for (let i = 0; i < g.n; i++) {
    let th = (i - (g.n - 1) / 2) * g.step + g.offset;
    if (jitter) th += (Math.random() - 0.5) * g.step * 0.7;
    if (Math.abs(th) >= 89) { dropped++; continue; }
    out.push(radialAt(Math.tan(th * DEG)));
  }
  out.sort((a, b) => a.xt - b.xt);
  UI.dropped = dropped;
  return out;
}
function regen(jitter) {
  S.verts = MODE === 'linear' ? genLinear() : genRadial(jitter);
  S.layout = jitter ? 'free' : 'gen';
  S.cap = MODE === 'linear' ? S.cap : false;
  fixHors(); sanitize();
}

function orderedHors(m, alt) {
  const out = [];
  if (S.verts.length < 2) { S.hors = out; return; }
  const V1 = S.verts[0], V2 = S.verts[1];
  for (let i = 0; i < m; i++) {
    const r = visT(V1) || [0, 1], a = r[0] + (r[1] - r[0]) * (i + 0.5) / m, P = vp(V1, a), first = alt && i % 2 ? -1 : 1;
    let b = ray45(P, 1, first, V2);
    if (b === null) b = ray45(P, 1, -first, V2);
    if (b === null) b = a;
    out.push({ k: 0, a, b });
  }
  S.hors = out;
}

function randomVerts() {
  if (MODE === 'radial') { regen(true); return; }
  const n = S.verts.length, sp = S.W / (n - 1), j = sp * 0.45, lean = (Math.random() - 0.5) * S.H * 0.5;
  S.verts = Array.from({ length: n }, (_, i) => ({
    xt: clamp(i * sp + (Math.random() - 0.5) * 2 * j, 0, S.W),
    xb: clamp(i * sp + lean + (Math.random() - 0.5) * 2 * j, 0, S.W),
  }));
  S.layout = 'free'; sanitize();
}
// place lines one by one; each must not cross any kept trail and must keep
// the minimum vertex gap on every vertical
function randomHors(m) {
  const keep = [], keptSegs = [], keptVtx = [];
  const r0 = S.verts.length > 1 && visT(S.verts[0]), r1 = S.verts.length > 1 && visT(S.verts[1]);
  for (let i = 0; i < m && r0 && r1; i++) {
    for (let t = 0; t < 250; t++) {
      const cand = { k: 0, a: r0[0] + Math.random() * (r0[1] - r0[0]), b: r1[0] + Math.random() * (r1[1] - r1[0]) };
      const r = computeOne(cand, keep.length);
      const cs = r.segs.filter(g => g.c);
      if (cs.some(g => keptSegs.some(o => segsCross(g.c, o.c)))) continue;
      if (r.vtx.some(q => keptVtx.some(o => o.v === q.v && Math.hypot(o.p[0] - q.p[0], o.p[1] - q.p[1]) < S.minGap))) continue;
      keep.push(cand); keptSegs.push(...cs); keptVtx.push(...r.vtx);
      break;
    }
  }
  S.hors = keep;
  UI.note = keep.length < m ? `Placed ${keep.length} of ${m} lines (no room for more with the ${S.minGap} mm gap).` : '';
}

/* ---------- view ---------- */
function bounds() {
  if (UI.viewLock) return UI.viewLock;
  const pad = Math.max(S.W, S.H) * 0.08, e = S.m + pad;
  let x0 = -e, y0 = -e, x1 = S.W + e, y1 = S.H + e;
  if (MODE === 'radial') {
    x0 = Math.min(x0, S.centre.x - pad); x1 = Math.max(x1, S.centre.x + pad);
    y0 = Math.min(y0, S.centre.y - pad); y1 = Math.max(y1, S.centre.y + pad);
  }
  return { x0, y0, x1, y1 };
}
// invisible verticals, or ones lying exactly on a rectangle edge, are not drawn/exported as lines
const edgeVert = v => { const c = vSeg(v); return !c || (Math.abs(c[0] - c[2]) < 1e-6 && (c[0] < 1e-6 || c[0] > S.W - 1e-6)); };
let lastAll = { segs: [], vtx: [] };

function render() {
  const b = bounds();
  cv.setAttribute('viewBox', `${b.x0} ${b.y0} ${b.x1 - b.x0} ${b.y1 - b.y0}`);
  const ctm = cv.getScreenCTM();
  const px = ctm && ctm.a ? 1 / ctm.a : 1;
  const lc = $('colLine').value, rc = $('colRect').value;
  const NS = 'vector-effect="non-scaling-stroke"';
  const ln = (a, b2, c, d, extra = '') => `<line x1="${fmt(a)}" y1="${fmt(b2)}" x2="${fmt(c)}" y2="${fmt(d)}" ${extra}/>`;
  const T = (x, y, txt, o = {}) => `<text x="${fmt(x)}" y="${fmt(y)}" font-size="${fmt(11 * px)}" text-anchor="${o.a || 'middle'}" fill="${o.c || '#333'}" stroke="#fff" stroke-width="${fmt(3 * px)}" paint-order="stroke" stroke-linejoin="round" font-family="system-ui,sans-serif">${txt}</text>`;
  const V = S.verts;
  lastAll = computeAll();
  if (!drag) UI.info = analyze(lastAll);
  let s = `<rect x="${-S.m}" y="${-S.m}" width="${S.W + 2 * S.m}" height="${S.H + 2 * S.m}" fill="#fff" stroke="#b5b2a8" stroke-width="0.5" ${NS}/>`;
  s += `<rect x="0" y="0" width="${S.W}" height="${S.H}" fill="none" stroke="${rc}" stroke-width="1" ${NS}/>`;

  UI.hiddenV = V.filter(v => !vSeg(v)).length;
  UI.hiddenS = lastAll.segs.filter(g => !g.c).length;
  if (UI.ghost) {                                   // grey ghosts: whatever is cropped away by the rectangle
    let g = '';
    if (MODE === 'radial') V.forEach(v => {
      let c;
      if (S.enforce) { const C = S.centre, M = [(v.xt + v.xb) / 2, S.H / 2]; c = clipBox(C.x, C.y, C.x + (M[0] - C.x) * 200, C.y + (M[1] - C.y) * 200, b.x0, b.y0, b.x1, b.y1); }
      else c = vView(v);
      if (c) g += ln(...c);
    });
    lastAll.segs.forEach(sg => {
      if (sg.base) return;
      const c = clipBox(sg.s[0], sg.s[1], sg.s[2], sg.s[3], b.x0, b.y0, b.x1, b.y1);
      if (c) g += ln(...c);
    });
    s += `<g stroke="#9e9e9e" stroke-width="0.5" stroke-dasharray="4 3" opacity=".85" ${NS}>${g}</g>`;
  }

  s += `<g stroke="${lc}" stroke-width="0.55" fill="none" stroke-linecap="round" ${NS}>`;
  V.forEach(v => { if (!edgeVert(v)) s += ln(...vSeg(v)); });
  lastAll.segs.forEach(g => { if (g.c) s += ln(...g.c); });
  s += '</g>';

  const hl = `stroke="#1976d2" stroke-width="2.5" opacity=".3" ${NS}`;
  if (UI.selV >= 0 && V[UI.selV]) { const sc = vSeg(V[UI.selV]) || vView(V[UI.selV]); if (sc) s += ln(...sc, hl); }
  if (UI.selH >= 0 && S.hors[UI.selH]) {
    const h = S.hors[UI.selH];
    if (V[h.k] && V[h.k + 1]) { const A = vp(V[h.k], h.a), B = vp(V[h.k + 1], h.b); s += ln(A[0], A[1], B[0], B[1], hl); }
  }

  // dimensions
  const D = UI.dim, ink = '#555';
  if (D.edge && V.length) {
    const tops = [], bots = [];
    V.forEach(v => { const c = vSeg(v); if (!c) return; if (c[1] < 1e-6) tops.push(c[0]); if (c[3] > S.H - 1e-6) bots.push(c[2]); });
    [[tops, true], [bots, false]].forEach(([xs, top]) => {
      const y = top ? -10 * px : S.H + 10 * px, arr = [0, ...xs.sort((a, c) => a - c), S.W];
      for (let i = 0; i < arr.length - 1; i++) {
        const a = arr[i], c = arr[i + 1];
        if (c - a < 0.05) continue;
        s += `<g stroke="${ink}" stroke-width="0.5" ${NS}>${ln(a, y, c, y)}${ln(a, y - 3 * px, a, y + 3 * px)}${ln(c, y - 3 * px, c, y + 3 * px)}</g>`;
        if ((c - a) / px > 26) s += T((a + c) / 2, top ? y - 4 * px : y + 13 * px, (c - a).toFixed(1));
      }
    });
  }
  if (D.tilt) V.forEach(v => { const c = vSeg(v); if (c) s += T(c[0], c[1] + 18 * px, ((Math.atan2(v.xb - v.xt, S.H) / DEG)).toFixed(1) + '°', { c: '#1976d2' }); });
  if (D.base || D.refl) lastAll.segs.forEach(g => {
    if (!g.c || (g.base ? !D.base : !D.refl)) return;
    const dx = g.c[2] - g.c[0], dy = g.c[3] - g.c[1];
    let a = Math.abs(Math.atan2(dy, dx) / DEG); if (a > 90) a = 180 - a;
    s += T((g.c[0] + g.c[2]) / 2, (g.c[1] + g.c[3]) / 2 - 3 * px, a.toFixed(1) + '°', { c: g.base ? '#1976d2' : '#6a1b9a' });
  });
  if (D.vtx) {
    const by = {};
    lastAll.vtx.forEach(q => (by[q.v] = by[q.v] || []).push(q.p));
    Object.values(by).forEach(l => {
      l.sort((a, b2) => a[1] - b2[1]);
      for (let i = 1; i < l.length; i++) {
        const a = l[i - 1], c = l[i], d = Math.hypot(c[0] - a[0], c[1] - a[1]);
        if (d / px > 14) s += T((a[0] + c[0]) / 2 + 5 * px, (a[1] + c[1]) / 2 + 3 * px, d.toFixed(1), { a: 'start', c: '#e65100' });
      }
    });
  }

  // measurements
  const mc = '#e65100';
  UI.meas.forEach(m => {
    if (m.type === 'dist') {
      const d = Math.hypot(m.q[0] - m.p[0], m.q[1] - m.p[1]);
      s += `<g stroke="${mc}" stroke-width="0.75" ${NS}>${ln(m.p[0], m.p[1], m.q[0], m.q[1])}</g>`;
      s += `<circle cx="${m.p[0]}" cy="${m.p[1]}" r="${3 * px}" fill="${mc}"/><circle cx="${m.q[0]}" cy="${m.q[1]}" r="${3 * px}" fill="${mc}"/>`;
      s += T((m.p[0] + m.q[0]) / 2, (m.p[1] + m.q[1]) / 2 - 5 * px, `${d.toFixed(2)} mm  (Δx ${Math.abs(m.q[0] - m.p[0]).toFixed(1)}, Δy ${Math.abs(m.q[1] - m.p[1]).toFixed(1)})`, { c: mc });
    } else {
      s += `<g stroke="${mc}" stroke-width="1.5" opacity=".65" ${NS}>${ln(...m.l1)}${ln(...m.l2)}</g>`;
      s += T(m.at[0], m.at[1] - 6 * px, `${m.acute.toFixed(2)}° / ${(180 - m.acute).toFixed(2)}°`, { c: mc });
    }
  });
  if (UI.mp) {
    if (UI.mp.pt) {
      s += `<circle cx="${UI.mp.pt[0]}" cy="${UI.mp.pt[1]}" r="${4 * px}" fill="${mc}"/>`;
      if (UI.mcur) s += ln(UI.mp.pt[0], UI.mp.pt[1], UI.mcur[0], UI.mcur[1], `stroke="${mc}" stroke-dasharray="5 4" stroke-width="0.6" ${NS}`);
    } else if (UI.mp.line) s += ln(...UI.mp.line, `stroke="${mc}" stroke-width="1.5" opacity=".65" ${NS}`);
  }

  // handles (verticals only editable in Verticals mode; lines only in Lines mode)
  const r = 5 * px, em = effMode(UI.shift);
  if (em === 'verts') {
    s += `<g fill="#fff" stroke="#1976d2" stroke-width="0.75" ${NS}>`;
    V.forEach((v, i) => (vEnds(v) || []).forEach(p => {
      s += `<rect x="${fmt(p[0] - r)}" y="${fmt(p[1] - r)}" width="${fmt(2 * r)}" height="${fmt(2 * r)}" ${i === UI.selV ? 'fill="#bbdefb"' : ''}/>`;
    }));
    s += '</g>';
  }
  if (em === 'lines') {
    s += `<g fill="#fff" stroke="#1976d2" stroke-width="0.75" ${NS}>`;
    S.hors.forEach((h, i) => {
      if (!V[h.k] || !V[h.k + 1]) return;
      [vp(V[h.k], h.a), vp(V[h.k + 1], h.b)].forEach(p => {
        s += `<circle cx="${fmt(p[0])}" cy="${fmt(p[1])}" r="${fmt(r)}" ${i === UI.selH ? 'fill="#bbdefb"' : ''}/>`;
      });
    });
    s += '</g>';
  }
  if (MODE === 'radial') {
    const c = S.centre, d = r * 1.4;
    s += `<polygon points="${c.x},${c.y - d} ${c.x + d},${c.y} ${c.x},${c.y + d} ${c.x - d},${c.y}" fill="#ffe082" stroke="#e65100"/>`;
  }

  if (UI.draw && V[UI.draw.vi]) {
    const P = vp(V[UI.draw.vi], UI.draw.t);
    s += `<circle cx="${P[0]}" cy="${P[1]}" r="${fmt(r * 1.2)}" fill="#1976d2" opacity=".7"/>`;
    if (UI.draw.cur) s += ln(P[0], P[1], UI.draw.cur[0], UI.draw.cur[1], `stroke="#1976d2" stroke-dasharray="5 4" stroke-width="0.75" ${NS}`);
  }
  if (UI.vghost) { const gc = vSeg(UI.vghost); if (gc) s += ln(...gc, `stroke="#1976d2" stroke-dasharray="6 4" stroke-width="0.75" ${NS}`); }
  if (UI.vdraw && UI.vdraw.pt) {
    const f = UI.vdraw, q = f.cur || f.pt;
    s += ln(f.pt[0], f.pt[1], q[0], q[1], `stroke="#1976d2" stroke-dasharray="6 4" stroke-width="0.75" ${NS}`);
    s += `<circle cx="${f.pt[0]}" cy="${f.pt[1]}" r="${fmt(r * 1.2)}" fill="#1976d2" opacity=".8"/>`;
  } else if (UI.vdraw) {
    const f = UI.vdraw, x2 = UI.vdraw.cur === undefined ? f.x : UI.vdraw.cur;
    const [xt, xb] = f.edge === 't' ? [f.x, x2] : [x2, f.x];
    s += ln(xt, 0, xb, S.H, `stroke="#1976d2" stroke-dasharray="6 4" stroke-width="0.75" ${NS}`);
    s += `<circle cx="${f.x}" cy="${f.edge === 't' ? 0 : S.H}" r="${fmt(r * 1.2)}" fill="#1976d2" opacity=".8"/>`;
  }
  cv.innerHTML = s;
  updateStatus();
}

function effMode(shift) {
  if (UI.mode === 'measure') return 'measure';
  return shift ? (UI.mode === 'lines' ? 'verts' : 'lines') : UI.mode;
}
function updateStatus() {
  const em = effMode(UI.shift);
  let t;
  if (S.verts.length < 2) t = 'Need at least 2 verticals.';
  else if (em === 'measure') t = UI.mp ? 'Pick the second ' + (UI.mp.pt ? 'point.' : 'line.') : ($('mtD').checked ? 'Measure distance: click two points (snaps to corners, ends and vertices).' : 'Measure angle: click two lines.');
  else if (em === 'lines') t = UI.draw ? 'Click an adjacent vertical to finish the line (Esc cancels).' : 'LINES: click a vertical to start a line · drag a circle or a line to move it · hold Shift to edit verticals.';
  else t = UI.vdraw ? 'Click a point on another edge to finish the vertical (Esc cancels).'
    : MODE === 'radial' ? (S.enforce ? 'VERTICALS: drag to rotate about the centre · click any edge point to add a line through the centre · Delete removes the selected · hold Shift to edit lines.' : 'VERTICALS: drag a body or an end (slides along the outline) · click an edge point then another edge point to add one · Delete removes the selected · hold Shift to edit lines.')
    : 'VERTICALS: drag a body to move it whole, a square to move one end · click an edge point then the opposite edge to add one · Delete removes the selected · hold Shift to edit lines.';
  let info = '';
  const i = UI.info;
  if (i && S.hors.length) {
    const bad = i.cross > 0 || i.minGap < S.minGap;
    info = `<br><span class="${bad ? 'bad' : 'ok'}">Crossings: ${i.cross < 0 ? 'n/a' : i.cross} · min vertex gap: ${isFinite(i.minGap) ? i.minGap.toFixed(1) + ' mm' : '–'}</span>`;
  }
  if (UI.note) info += `<br>${UI.note}`;
  if (UI.ghost && (UI.hiddenV || UI.hiddenS)) info += `<br>Grey = outside the rectangle: ${UI.hiddenV} vertical(s) miss it, ${UI.hiddenS} reflected segment(s) fall wholly outside.`;
  if (MODE === 'radial' && UI.dropped) info += `<br>${UI.dropped} radial line(s) were dropped (angle beyond ±89°).`;
  $('status').innerHTML = t + info;
}

/* ---------- export ---------- */
function buildSVG(bg) {
  const sw = +$('sw').value || 0.2, m = sw / 2, W = S.W, H = S.H;
  let l = '';
  S.verts.forEach(v => { if (!edgeVert(v)) { const c = vSeg(v); l += `<line x1="${fmt(c[0])}" y1="${fmt(c[1])}" x2="${fmt(c[2])}" y2="${fmt(c[3])}"/>`; } });
  computeAll().segs.forEach(g => { if (g.c) l += `<line x1="${fmt(g.c[0])}" y1="${fmt(g.c[1])}" x2="${fmt(g.c[2])}" y2="${fmt(g.c[3])}"/>`; });
  const PW = W + 2 * S.m, PH = H + 2 * S.m;                // the whole page at true size; its outline is not drawn
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${fmt(PW)}mm" height="${fmt(PH)}mm" viewBox="${-S.m} ${-S.m} ${fmt(PW)} ${fmt(PH)}">` +
    (bg ? `<rect x="${-S.m}" y="${-S.m}" width="${fmt(PW)}" height="${fmt(PH)}" fill="#fff"/>` : '') +
    `<rect x="0" y="0" width="${W}" height="${H}" fill="none" stroke="${$('colRect').value}" stroke-width="${sw}"/>` +
    `<g stroke="${$('colLine').value}" stroke-width="${sw}" fill="none" stroke-linecap="round">${l}</g></svg>`;
}
OT.wireExport({ base: `mirror-pleats-${MODE}`, svg: buildSVG, size: () => [S.W + 2 * S.m, S.H + 2 * S.m] });

/* ---------- pointer interaction ---------- */
function ptr(e) {
  const pt = cv.createSVGPoint(); pt.x = e.clientX; pt.y = e.clientY;
  const q = pt.matrixTransform(cv.getScreenCTM().inverse()); return { x: q.x, y: q.y };
}
const pxmm = () => 1 / cv.getScreenCTM().a;

function hitLines(p) {
  const tol = 9 * pxmm(), V = S.verts;
  for (let i = S.hors.length - 1; i >= 0; i--) {
    const h = S.hors[i]; if (!V[h.k] || !V[h.k + 1]) continue;
    const A = vp(V[h.k], h.a), B = vp(V[h.k + 1], h.b);
    if (Math.hypot(p.x - A[0], p.y - A[1]) < tol) return { type: 'hEnd', i, which: 'a' };
    if (Math.hypot(p.x - B[0], p.y - B[1]) < tol) return { type: 'hEnd', i, which: 'b' };
  }
  for (let i = S.hors.length - 1; i >= 0; i--) {
    const h = S.hors[i]; if (!V[h.k] || !V[h.k + 1]) continue;
    if (distSeg(p, vp(V[h.k], h.a), vp(V[h.k + 1], h.b)) < tol * 0.7) return { type: 'hBody', i };
  }
  return null;
}
function hitVerts(p) {
  const tol = 9 * pxmm();
  if (MODE === 'radial' && Math.hypot(p.x - S.centre.x, p.y - S.centre.y) < tol * 1.3) return { type: 'centre' };
  for (let i = 0; i < S.verts.length; i++) {
    const e = vEnds(S.verts[i]); if (!e) continue;
    if (Math.hypot(p.x - e[0][0], p.y - e[0][1]) < tol) return { type: 'vEnd', i, end: 't' };
    if (Math.hypot(p.x - e[1][0], p.y - e[1][1]) < tol) return { type: 'vEnd', i, end: 'b' };
  }
  for (let i = 0; i < S.verts.length; i++) {
    const c = MODE === 'radial' ? vView(S.verts[i]) : vSeg(S.verts[i]);   // radial: the ghost extension is grabbable too
    if (c && distSeg(p, [c[0], c[1]], [c[2], c[3]]) < tol * 0.7) return { type: 'vBody', i };
  }
  return null;
}
function nearestVertical(p, tol, only) {
  let best = -1, bd = tol;
  S.verts.forEach((v, i) => {
    if (only && !only.includes(i)) return;
    const c = vSeg(v); if (!c) return;
    const d = distSeg(p, [c[0], c[1]], [c[2], c[3]]);
    if (d < bd) { bd = d; best = i; }
  });
  return best;
}
function snapT(fixedPt, fixedIsLeft, movV, rawT) {
  const dx = fixedIsLeft ? 1 : -1;
  const c = [ray45(fixedPt, dx, 1, movV), ray45(fixedPt, dx, -1, movV)].filter(x => x !== null);
  return c.length ? c.reduce((b, t) => Math.abs(t - rawT) < Math.abs(b - rawT) ? t : b) : rawT;
}
// adjacent vertical + t for the second click of a new line
function drawTarget(p) {
  const d = UI.draw, adj = [d.vi - 1, d.vi + 1].filter(i => i >= 0 && i < S.verts.length);
  const ai = nearestVertical(p, Infinity, adj);
  let t = projT(p, S.verts[ai]);
  if ($('snap45').checked) t = snapT(vp(S.verts[d.vi], d.t), ai > d.vi, S.verts[ai], t);
  return { ai, t };
}

// measure helpers
function snapPoint(p) {
  const tol = 12 * pxmm(), pts = [[0, 0], [S.W, 0], [0, S.H], [S.W, S.H]];
  S.verts.forEach(v => { const e = vEnds(v); if (e) pts.push(e[0], e[1]); });
  lastAll.segs.forEach(g => { if (g.c) pts.push([g.c[0], g.c[1]], [g.c[2], g.c[3]]); });
  if (MODE === 'radial') pts.push([S.centre.x, S.centre.y]);
  let best = null, bd = tol;
  pts.forEach(q => { const d = Math.hypot(q[0] - p.x, q[1] - p.y); if (d < bd) { bd = d; best = q; } });
  return best || [p.x, p.y];
}
function pickLine(p) {
  const tol = 9 * pxmm(), L = [[0, 0, S.W, 0], [S.W, 0, S.W, S.H], [S.W, S.H, 0, S.H], [0, S.H, 0, 0]];
  S.verts.forEach(v => { const c = vSeg(v); if (c) L.push(c); });
  lastAll.segs.forEach(g => { if (g.c) L.push(g.c); });
  let best = null, bd = tol;
  L.forEach(l => { const d = distSeg(p, [l[0], l[1]], [l[2], l[3]]); if (d < bd) { bd = d; best = l; } });
  return best;
}
function measurePress(p) {
  if ($('mtD').checked) {
    const pt = snapPoint(p);
    if (!UI.mp) UI.mp = { pt };
    else { UI.meas.push({ type: 'dist', p: UI.mp.pt, q: pt }); UI.mp = null; UI.mcur = null; }
  } else {
    const l = pickLine(p); if (!l) return;
    if (!UI.mp) UI.mp = { line: l };
    else {
      const l1 = UI.mp.line, d1 = [l1[2] - l1[0], l1[3] - l1[1]], d2 = [l[2] - l[0], l[3] - l[1]];
      const cr = d1[0] * d2[1] - d1[1] * d2[0], dt = d1[0] * d2[0] + d1[1] * d2[1];
      const acute = Math.atan2(Math.abs(cr), Math.abs(dt)) / DEG;
      let at = [(l1[0] + l1[2]) / 2, (l1[1] + l1[3]) / 2];
      if (Math.abs(cr) > 1e-9) {
        const s = ((l[0] - l1[0]) * d2[1] - (l[1] - l1[1]) * d2[0]) / cr;
        at = [l1[0] + s * d1[0], l1[1] + s * d1[1]];
        const b = bounds(); if (at[0] < b.x0 || at[0] > b.x1 || at[1] < b.y0 || at[1] > b.y1) at = [p.x, p.y];
      }
      UI.meas.push({ type: 'angle', l1, l2: l, acute, at }); UI.mp = null;
    }
  }
}

let drag = null;
cv.addEventListener('pointerdown', e => {
  if (e.button !== 0 || S.verts.length < 2) return;
  const p = ptr(e), em = effMode(e.shiftKey);
  UI.shift = e.shiftKey;
  if (em === 'measure') { measurePress(p); render(); return; }

  if (em === 'lines') {
    if (UI.draw) {                                   // second click: finish the line
      const { ai, t } = drawTarget(p), from = UI.draw;
      pushUndo();
      S.hors.push(ai > from.vi ? { k: from.vi, a: from.t, b: t } : { k: ai, a: t, b: from.t });
      UI.selH = S.hors.length - 1; UI.selV = -1; UI.draw = null;
      syncUI(); render(); return;
    }
    const h = hitLines(p);
    UI.selV = -1; UI.selH = h ? h.i : -1;
    if (h) {
      drag = { ...h, start: p, snapJ: snap(), pushed: false };
      drag.orig = { ...S.hors[h.i] };
      cv.setPointerCapture(e.pointerId);
    } else {                                         // empty space or a vertical: start a new line
      const vi = nearestVertical(p, 14 * pxmm());
      if (vi >= 0) UI.draw = { vi, t: projT(p, S.verts[vi]), cur: [p.x, p.y] };
    }
    syncUI(); render(); return;
  }

  if (MODE === 'radial') {                           // radial: verticals may enter/exit through any edge
    if (UI.vdraw) {                                  // free mode, second click
      const nv = lineFrom(UI.vdraw.pt, nearestOnRect(p)), j = snap();
      if (nv ? addVerticalFree(nv) : (UI.note = 'That line would be horizontal.', false)) pushUndo(j);
      UI.vdraw = null; syncUI(); render(); return;
    }
    if (!hitVerts(p)) {
      const pn = perimNear(p);
      if (pn) {
        UI.selH = -1;
        if (S.enforce) { const j = snap(); if (addVerticalEnforced(kOf(pn[0], pn[1]))) pushUndo(j); UI.vghost = null; }
        else { UI.vdraw = { pt: pn }; UI.note = ''; }
        syncUI(); render(); return;
      }
    }
  } else if (UI.vdraw) {                             // linear: second click on the opposite edge
    const from = UI.vdraw, x2 = vdrawX(p.x);
    const j = snap();
    if (from.edge === 't' ? addVertical(from.x, x2) : addVertical(x2, from.x)) pushUndo(j);
    UI.vdraw = null; syncUI(); render(); return;
  }
  const h = hitVerts(p);                             // Verticals mode
  UI.selH = -1; UI.selV = h && h.type !== 'centre' ? h.i : -1;
  if (!h && MODE === 'linear') {                     // empty click near the top/bottom edge starts a new vertical
    const edge = edgeNear(p);
    if (edge) { UI.vdraw = { edge, x: clamp(p.x, 0, S.W) }; UI.note = ''; }
  }
  if (h) {
    drag = { ...h, start: p, snapJ: snap(), pushed: false };
    if (h.type === 'vBody') drag.orig = { ...S.verts[h.i] };
    UI.viewLock = bounds();
    cv.setPointerCapture(e.pointerId);
  }
  syncUI(); render();
});

cv.addEventListener('pointermove', e => {
  if (S.verts.length < 2) return;
  const p = ptr(e);
  UI.shift = e.shiftKey;
  if (UI.mp && UI.mp.pt) { UI.mcur = snapPoint(p); render(); return; }
  if (UI.draw) {
    const { ai, t } = drawTarget(p);
    UI.draw.cur = vp(S.verts[ai], t); render(); return;
  }
  if (UI.vdraw) { UI.vdraw.cur = MODE === 'radial' ? nearestOnRect(p) : vdrawX(p.x); render(); return; }
  if (!drag && S.enforce && MODE === 'radial' && effMode(e.shiftKey) === 'verts') {
    const pn = hitVerts(p) ? null : perimNear(p);
    UI.vghost = pn ? radialAt(kOf(pn[0], pn[1])) : null; render();
  }
  if (!drag) {
    const em = effMode(e.shiftKey);
    const h = em === 'lines' ? hitLines(p) : em === 'verts' ? hitVerts(p) : null;
    cv.style.cursor = em === 'measure' ? 'crosshair' : h ? 'pointer'
      : em === 'lines' && nearestVertical(p, 14 * pxmm()) >= 0 ? 'crosshair'
      : em === 'verts' && (MODE === 'radial' ? perimNear(p) : edgeNear(p)) ? 'crosshair' : 'default';
    return;
  }
  if (!drag.pushed) { pushUndo(drag.snapJ); drag.pushed = true; }
  const d = drag;
  if (d.type === 'vEnd') {
    if (MODE === 'radial') { if (S.enforce) setRadialK(d.i, kOf(p.x, p.y)); else setEndFree(d.i, d.end, p); } else setEnd(d.i, d.end, p.x);
    S.layout = 'free';
  } else if (d.type === 'vBody') {
    if (MODE === 'radial') { if (S.enforce) setRadialK(d.i, kOf(p.x, p.y)); else moveBodyFree(d.i, d.orig, p.x - d.start.x); } else moveBody(d.i, d.orig, p.x - d.start.x);
    S.layout = 'free';
  } else if (d.type === 'centre') {
    S.centre = { x: p.x, y: p.y };
    if (S.layout === 'gen') regen(false); else if (S.enforce) enforceRadial(); else fixCentre();
  }
  else if (d.type === 'hEnd') {
    const h = S.hors[d.i], movA = d.which === 'a';
    const mv = S.verts[movA ? h.k : h.k + 1], fx = S.verts[movA ? h.k + 1 : h.k];
    let t = projT(p, mv);
    if ($('snap45').checked) t = snapT(vp(fx, movA ? h.b : h.a), !movA, mv, t);
    h[d.which] = t;
  } else if (d.type === 'hBody') {
    const dt = clamp((p.y - d.start.y) / S.H, -Math.min(d.orig.a, d.orig.b), 1 - Math.max(d.orig.a, d.orig.b));
    S.hors[d.i].a = d.orig.a + dt; S.hors[d.i].b = d.orig.b + dt;
  }
  syncUI(); render();
});
const endDrag = () => { if (drag) { drag = null; UI.viewLock = null; syncUI(); render(); } };
cv.addEventListener('pointerup', endDrag);
cv.addEventListener('pointercancel', endDrag);

window.addEventListener('keydown', e => {
  if (e.key === 'Shift' && !UI.shift) { UI.shift = true; render(); return; }
  if (/INPUT|TEXTAREA/.test(document.activeElement.tagName) && document.activeElement.type !== 'checkbox' && document.activeElement.type !== 'radio') return;
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') { e.preventDefault(); e.shiftKey ? redo() : undo(); }
  else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') { e.preventDefault(); redo(); }
  else if (e.key === 'Escape') { UI.draw = null; UI.vdraw = null; UI.mp = null; render(); }
  else if (e.key === 'Delete' || e.key === 'Backspace') delSel();
});
window.addEventListener('keyup', e => { if (e.key === 'Shift') { UI.shift = false; render(); } });

/* ---------- controls ---------- */
function setMode(m) {
  UI.mode = m; UI.draw = null; UI.vdraw = null; UI.vghost = null; UI.mp = null;
  $('mLines').classList.toggle('on', m === 'lines');
  $('mVerts').classList.toggle('on', m === 'verts');
  $('mMeas').classList.toggle('on', m === 'measure');
  render();
}
function delSel() {
  if (UI.selH >= 0) act(() => { S.hors.splice(UI.selH, 1); UI.selH = -1; });
  else if (UI.selV >= 0) {
    if (S.verts.length <= 2) { UI.note = 'At least 2 verticals are needed.'; render(); return; }
    act(() => delVertical(UI.selV));
  }
}

// x on the opposite edge for a new vertical (kept inside the rectangle, and inside the 45° cap if on)
function vdrawX(x) {
  let lo = 0, hi = S.W;
  if (S.cap) { lo = Math.max(lo, UI.vdraw.x - S.H); hi = Math.min(hi, UI.vdraw.x + S.H); }
  return clamp(x, lo, hi);
}
function edgeNear(p) {
  const tol = 14 * pxmm(), pad = tol;
  if (p.x < -pad || p.x > S.W + pad) return null;
  if (Math.abs(p.y) < tol) return 't';
  if (Math.abs(p.y - S.H) < tol) return 'b';
  return null;
}
function perimNear(p) {
  const q = nearestOnRect(p);
  return Math.hypot(p.x - q[0], p.y - q[1]) < 14 * pxmm() ? q : null;
}
function addVerticalEnforced(k) {
  const V = S.verts, u = uOf(k), us = V.map(v => uOf(kOf(v.xt, 0))), i = us.filter(x => x < u).length;
  if ((i > 0 && u - us[i - 1] < GAPU) || (i < V.length && us[i] - u < GAPU)) { UI.note = 'Too close to an existing vertical.'; return false; }
  return insertVertical(radialAt(k), i);
}
function addVerticalFree(nv) {
  const c = vSeg(nv);
  if (!c) { UI.note = 'That line misses the rectangle.'; return false; }
  if (S.verts.some(v => { const o = vSeg(v); return o && segDist(c, o) < GAP; })) { UI.note = 'That vertical would cross or touch another (min gap ' + GAP + ' mm).'; return false; }
  const mid = v => (v.xt + v.xb) / 2;
  return insertVertical(nv, S.verts.filter(v => mid(v) < mid(nv)).length);
}
// insert a vertical (top x, bottom x) in sorted position; lines it splits are trimmed to it
function addVertical(xt, xb) {
  const V = S.verts, i = V.filter(v => v.xt < xt).length;
  const fits = (k, x) => (i === 0 || x >= V[i - 1][k] + GAP) && (i === V.length || x <= V[i][k] - GAP);
  if (!fits('xt', xt) || !fits('xb', xb)) { UI.note = 'That vertical would cross or touch a neighbour (min gap ' + GAP + ' mm).'; return false; }
  if (S.cap && Math.abs(xb - xt) > S.H + 1e-9) { UI.note = 'Exceeds the ±45° cap.'; return false; }
  return insertVertical({ xt, xb }, i);
}
function insertVertical(nv, i) {
  const V = S.verts, nh = [];
  S.hors.forEach(h => {
    if (h.k >= i) nh.push({ ...h, k: h.k + 1 });
    else if (h.k === i - 1) {                        // this line spans the new vertical: trim it to the new one
      const P = vp(V[h.k], h.a), Q = vp(V[h.k + 1], h.b);
      const hit = rayVert(P, [Q[0] - P[0], Q[1] - P[1]], nv);
      if (hit && hit.s > 0 && hit.s < 1) nh.push({ k: h.k, a: h.a, b: (P[1] + hit.s * (Q[1] - P[1])) / S.H });
    } else nh.push(h);
  });
  V.splice(i, 0, nv); S.hors = nh; S.layout = 'free'; S.gen.n = V.length; UI.selV = i; UI.selH = -1; UI.note = '';
  return true;
}
function delVertical(j) {
  S.hors = S.hors.filter(h => h.k !== j && h.k !== j - 1).map(h => h.k > j ? { ...h, k: h.k - 1 } : h);
  S.verts.splice(j, 1); S.layout = 'free'; S.gen.n = S.verts.length; UI.selV = -1;
}
const nH = () => clamp(Math.round(+$('nH').value) || 5, 1, 60);

on('mLines', 'onclick', () => setMode('lines'));
on('mVerts', 'onclick', () => setMode('verts'));
on('mMeas', 'onclick', () => setMode('measure'));
on('bDel', 'onclick', delSel);
on('bClear', 'onclick', () => act(() => { S.hors = []; UI.selH = -1; }));
on('bReset', 'onclick', () => act(() => regen(false)));
on('bFit', 'onclick', () => act(() => { S.gen.start = 0; S.gen.spacing = S.W / (S.gen.n - 1); regen(false); }));
on('oAll', 'onclick', () => act(() => { regen(false); orderedHors(nH(), $('alt').checked); }));
on('oHor', 'onclick', () => act(() => orderedHors(nH(), $('alt').checked)));
on('rV', 'onclick', () => act(() => { randomVerts(); fixHors(); }));
on('rH', 'onclick', () => act(() => randomHors(nH())));
on('rA', 'onclick', () => act(() => { randomVerts(); randomHors(nH()); }));
on('bUndo', 'onclick', undo); on('bRedo', 'onclick', redo);
on('mClear', 'onclick', () => { UI.meas = []; UI.mp = null; render(); });
on('mg', 'onchange', () => { S.minGap = Math.max(0, +$('mg').value || 0); render(); });
on('enf', 'onchange', () => act(() => { S.enforce = $('enf').checked; if (S.enforce) enforceRadial(); }));
on('gh', 'onchange', () => { UI.ghost = $('gh').checked; render(); });
on('cap', 'onchange', () => act(() => { S.cap = $('cap').checked; if (S.cap) sanitize(); }));

const genField = (id, key, min, max, round) => on(id, 'onchange', () => act(() => {
  let v = +$(id).value; if (!isFinite(v)) return;
  v = clamp(round ? Math.round(v) : v, min, max);
  S.gen[key] = v; regen(false);
}));
genField('gN', 'n', 2, 40, true);
if (MODE === 'linear') { genField('gSp', 'spacing', 1, 1e4); genField('gSt', 'start', 0, 1e4); }
else { genField('gStep', 'step', 0.5, 90); genField('gOff', 'offset', -89, 89); }
['cx', 'cy'].forEach(id => on(id, 'onchange', () => act(() => { S.centre = { x: +$('cx').value, y: +$('cy').value }; regen(false); })));
function resize(nw, nh) {                               // new area inside the margin; the pattern scales with it
  const fx = nw / S.W, fy = nh / S.H;
  S.verts.forEach(v => { v.xt *= fx; v.xb *= fx; });
  S.centre = { x: S.centre.x * fx, y: S.centre.y * fy };
  if (MODE === 'linear') { S.gen.start *= fx; S.gen.spacing *= fx; }
  S.W = nw; S.H = nh;
  if (S.layout === 'gen') regen(false); else sanitize();
}
['W', 'H'].forEach(id => on(id, 'onchange', () => act(() => {
  resize(Math.max(10, (+$('W').value || S.W + 2 * S.m) - 2 * S.m), Math.max(10, (+$('H').value || S.H + 2 * S.m) - 2 * S.m));
})));
on('marg', 'onchange', () => act(() => {                // the page keeps its size; the area inside the margin changes
  const m = clamp(Math.round(+$('marg').value) || S.m, 5, 15), d = 2 * (S.m - m);
  S.m = m; resize(S.W + d, S.H + d);
}));
const setX = (which, x) => {
  const i = UI.selV, y = which === 'xt' ? 0 : S.H;
  if (MODE === 'radial') {
    if (S.enforce) setRadialK(i, kOf(x, y));
    else { const cand = { xt: S.verts[i].xt, xb: S.verts[i].xb, [which]: x }; if (freeOK(i, cand)) Object.assign(S.verts[i], cand); else UI.note = 'That would cross or touch a neighbour.'; }
  } else setEnd(i, which === 'xt' ? 't' : 'b', x);
  S.layout = 'free';
};
on('vxt', 'onchange', () => { if (UI.selV >= 0) act(() => setX('xt', +$('vxt').value)); });
on('vxb', 'onchange', () => { if (UI.selV >= 0) act(() => setX('xb', +$('vxb').value)); });
const nudge = sign => {
  if (UI.selV < 0) return;
  act(() => {
    const st = sign * (+$('step').value || 1), v = S.verts[UI.selV];
    if (MODE === 'radial') {
      if (S.enforce) { const yw = wideY(); setRadialK(UI.selV, kOf((yw === 0 ? v.xt : v.xb) + st, yw)); }
      else moveBodyFree(UI.selV, { ...v }, st);
    } else moveBody(UI.selV, { ...v }, st);
    S.layout = 'free';
  });
};
on('nudL', 'onclick', () => nudge(-1)); on('nudR', 'onclick', () => nudge(1));
['colLine', 'colRect'].forEach(id => on(id, 'oninput', render));
Object.keys(UI.dim).forEach(k => {
  const id = 'd' + k[0].toUpperCase() + k.slice(1);
  on(id, 'onchange', () => { UI.dim[k] = $(id).checked; render(); });
});
document.querySelectorAll('input[name=mt]').forEach(r => r.onchange = () => { UI.mp = null; render(); });

const syncSheet = OT.wireSheet({ get: () => [S.W + 2 * S.m, S.H + 2 * S.m], set: (w, h) => { $('W').value = w; $('H').value = h; $('W').onchange(); } });
function modeTips() {
  $('mLines').dataset.tip = 'Click a vertical to start a line, click an adjacent one to finish. Drag circles/lines to move them. Hold Shift to move verticals.';
  $('mVerts').dataset.tip = MODE === 'radial'
    ? 'Drag a vertical (or a square end handle). To add one, click a point on any edge' + (S.enforce ? ' (it passes through the centre).' : ', then a point on another edge.') + ' Delete removes the selected vertical. Hold Shift to edit lines.'
    : 'Drag a vertical to move it whole, or a square end handle. To add a vertical, click a point on the top or bottom edge, then a point on the opposite edge. Delete removes the selected vertical. Hold Shift to edit lines.';
}
function syncUI() {
  modeTips();
  const set = (id, v) => { const el = $(id); if (el && document.activeElement !== el) el.value = typeof v === 'number' ? +v.toFixed(2) : v; };
  set('W', S.W + 2 * S.m); set('H', S.H + 2 * S.m); set('marg', S.m); syncSheet(); set('gN', S.gen.n); set('mg', S.minGap);
  if (MODE === 'linear') { set('gSp', S.gen.spacing); set('gSt', S.gen.start); if ($('cap')) $('cap').checked = S.cap; }
  else { if ($('enf')) $('enf').checked = S.enforce; set('gStep', S.gen.step); set('gOff', S.gen.offset); set('cx', S.centre.x); set('cy', S.centre.y); }
  const sv = UI.selV >= 0 ? S.verts[UI.selV] : null;
  $('selV').hidden = !sv;
  if (sv) { $('selVn').textContent = UI.selV + 1; set('vxt', sv.xt); set('vxb', sv.xb); }
}

/* ---------- init ---------- */
$('nH').value = 4;
regen(false);
orderedHors(4, false);
syncUI();
setMode('lines');
new ResizeObserver(render).observe(cv);
