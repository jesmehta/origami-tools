'use strict';
/* Mirror Pleats engine — shared by linear.html and radial.html (window.MODE). */
const MODE = window.MODE === 'radial' ? 'radial' : 'linear';
const GAP = 1;                                   // min mm between neighbouring vertical ends
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const fmt = n => +n.toFixed(4);
const DEG = Math.PI / 180;

/* ---------- sidebar ---------- */
const vertPanel = MODE === 'linear' ? `
  <fieldset><legend>Verticals · linear</legend>
    <div class="row">
      <label>Count <input type="number" id="gN" min="2" max="40" step="1"></label>
      <label>Spacing <input type="number" id="gSp" min="1" step="0.5"> mm</label>
      <label>First x <input type="number" id="gSt" step="0.5"> mm</label>
    </div>
    <div class="row">
      <button id="bFit">Fit edge to edge</button>
      <button id="bReset">Reset verticals</button>
    </div>
    <div class="row"><label><input type="checkbox" id="cap"> Cap verticals at ±45°</label></div>` : `
  <fieldset><legend>Verticals · radial</legend>
    <div class="row">
      <label>Count <input type="number" id="gN" min="2" max="40" step="1"></label>
      <label>Step <input type="number" id="gStep" min="0.5" step="0.5"> °</label>
      <label>Rotate <input type="number" id="gOff" step="1"> °</label>
    </div>
    <div class="row">
      <label>Centre x <input type="number" id="cx" step="1"></label>
      <label>y <input type="number" id="cy" step="1"></label>
    </div>
    <div class="row"><button id="bReset">Reset verticals</button></div>
    <p class="note">Centre must be above or below the rectangle. Lines that don't fit inside the rectangle are dropped. Drag the ◆ in Verticals mode.</p>`;

document.getElementById('app').innerHTML = `
<aside>
  <h1>Mirror Pleats · ${MODE === 'linear' ? 'Linear' : 'Radial'}</h1>
  <p class="sw">Switch: ${MODE === 'linear' ? '<b>Linear</b> · <a href="radial.html">Radial</a>' : '<a href="linear.html">Linear</a> · <b>Radial</b>'}</p>

  <fieldset><legend>Rectangle</legend>
    <div class="row">
      <label>W <input type="number" id="W" min="10" step="1"> mm</label>
      <label>H <input type="number" id="H" min="10" step="1"> mm</label>
    </div>
  </fieldset>

  ${vertPanel}
    <div class="row" id="selV" hidden>
      <b>V<span id="selVn"></span></b>
      <label>top x <input type="number" id="vxt" step="0.5"></label>
      <label>bottom x <input type="number" id="vxb" step="0.5"></label>
      <span>
        <button id="nudL" title="Move whole line left">◀</button>
        <button id="nudR" title="Move whole line right">▶</button>
        <input type="number" id="step" value="1" min="0.1" step="0.5" style="width:52px"> mm
      </span>
    </div>
  </fieldset>

  <fieldset><legend>Edit mode</legend>
    <div class="row">
      <button id="mLines" class="on">Lines</button>
      <button id="mVerts">Verticals</button>
      <button id="mMeas">Measure</button>
    </div>
    <p class="note" id="modeNote"></p>
    <div class="row"><label><input type="checkbox" id="snap45"> Snap lines to 45° while drawing/dragging</label></div>
    <div class="row">
      <button id="bDel">Delete selected</button>
      <button id="bClear">Clear lines</button>
    </div>
  </fieldset>

  <fieldset><legend>Ordered layout</legend>
    <div class="row">
      <label>Lines <input type="number" id="nH" min="1" max="60" step="1"></label>
      <label><input type="checkbox" id="alt"> alternate ↑↓</label>
    </div>
    <div class="row">
      <button id="oAll">Ordered ${MODE}</button>
      <button id="oHor">Re-order lines only</button>
    </div>
    <p class="note">Evenly distributed lines snapped to 45°.</p>
  </fieldset>

  <fieldset><legend>Randomize</legend>
    <div class="row">
      <button id="rV">Verticals</button>
      <button id="rH">Lines</button>
      <button id="rA">Both</button>
    </div>
    <div class="row"><label>Min vertex gap <input type="number" id="mg" min="0" step="0.5"> mm</label></div>
    <p class="note">Random lines are placed one at a time and rejected if they cross another trail or come closer than the gap on any vertical.</p>
  </fieldset>

  <fieldset><legend>Dimensions</legend>
    <div class="row"><label><input type="checkbox" id="dEdge"> Edge spacing (mm)</label></div>
    <div class="row"><label><input type="checkbox" id="dTilt"> Vertical tilt (°)</label></div>
    <div class="row"><label><input type="checkbox" id="dBase"> Drawn-line angle (°)</label></div>
    <div class="row"><label><input type="checkbox" id="dRefl"> Reflected-line angles (°)</label></div>
    <div class="row"><label><input type="checkbox" id="dVtx"> Vertex gaps on verticals (mm)</label></div>
    <div class="row">
      <label><input type="radio" name="mt" id="mtD" value="dist" checked> Measure distance (2 points)</label>
      <label><input type="radio" name="mt" value="angle"> Measure angle (2 lines)</label>
    </div>
    <div class="row"><button id="mClear">Clear measurements</button></div>
    <p class="note">Measurements are snapshots; they don't follow later edits.</p>
  </fieldset>

  <fieldset><legend>Export</legend>
    <div class="row">
      <label>Lines <input type="color" id="colLine" value="#2e8b57"></label>
      <label>Rectangle <input type="color" id="colRect" value="#111111"></label>
    </div>
    <div class="row">
      <label>Stroke <input type="number" id="sw" value="0.2" min="0.05" step="0.05"> mm</label>
      <label>PNG <input type="number" id="ppm" value="6" min="1" max="30" step="1"> px/mm</label>
    </div>
    <div class="row">
      <button id="xSvg" class="pri">Export SVG</button>
      <button id="xPng" class="pri">Export PNG</button>
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
  W: 200, H: 120,
  verts: [],            // {xt, xb}: x at top edge (y=0) and bottom edge (y=H)
  hors: [],             // {k, a, b}: line between V_k (at a) and V_k+1 (at b); a,b in 0..1 top→bottom
  layout: 'gen',        // 'gen' (generated from parameters) | 'free' (hand-edited)
  centre: { x: 100, y: -72 },
  cap: MODE === 'linear',
  minGap: 4,
  gen: MODE === 'linear' ? { n: 5, spacing: 40, start: 20 } : { n: 7, step: 8, offset: 0 },
};
const UI = {
  mode: 'lines', draw: null, selV: -1, selH: -1, viewLock: null,
  meas: [], mp: null, mcur: null, info: null, note: '',
  dim: { edge: false, tilt: false, base: false, refl: false, vtx: false },
};

/* ---------- undo ---------- */
const undoS = [], redoS = [];
const snap = () => JSON.stringify({ W: S.W, H: S.H, verts: S.verts, hors: S.hors, layout: S.layout, centre: S.centre, cap: S.cap, gen: S.gen, minGap: S.minGap });
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

// t on vertical v where a ±45° ray from P (x-direction dx, y-direction dy) lands
function ray45(P, dx, dy, v) {
  const q = dx * dy, D = v.xb - v.xt, den = S.H - q * D;
  if (Math.abs(den) < 1e-9) return null;
  const t = (P[1] + q * (v.xt - P[0])) / den;
  if (t < -1e-9 || t > 1 + 1e-9) return null;
  if (dx * (vp(v, t)[0] - P[0]) <= 0) return null;
  return clamp(t, 0, 1);
}

function projT(p, v) {
  const A = vp(v, 0), B = vp(v, 1), ex = B[0] - A[0], ey = B[1] - A[1];
  return clamp(((p.x - A[0]) * ex + (p.y - A[1]) * ey) / (ex * ex + ey * ey), 0, 1);
}
function distSeg(p, a, b) {
  const ex = b[0] - a[0], ey = b[1] - a[1], L = ex * ex + ey * ey || 1;
  const t = clamp(((p.x - a[0]) * ex + (p.y - a[1]) * ey) / L, 0, 1);
  return Math.hypot(p.x - a[0] - t * ex, p.y - a[1] - t * ey);
}

// Liang–Barsky crop to the rectangle
function clipRect(x1, y1, x2, y2) {
  let t0 = 0, t1 = 1; const dx = x2 - x1, dy = y2 - y1;
  const ps = [-dx, dx, -dy, dy], qs = [x1, S.W - x1, y1, S.H - y1];
  for (let i = 0; i < 4; i++) {
    if (Math.abs(ps[i]) < 1e-12) { if (qs[i] < 0) return null; continue; }
    const r = qs[i] / ps[i];
    if (ps[i] < 0) { if (r > t1) return null; if (r > t0) t0 = r; }
    else { if (r < t0) return null; if (r < t1) t1 = r; }
  }
  if ((t1 - t0) * Math.hypot(dx, dy) < 1e-6) return null;
  return [x1 + t0 * dx, y1 + t0 * dy, x1 + t1 * dx, y1 + t1 * dy];
}
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
  const n = S.verts.length;
  if (S.cap) S.verts.forEach(v => { v.xb = clamp(v.xb, v.xt - S.H, v.xt + S.H); });
  for (const k of ['xt', 'xb']) {
    for (let i = 0; i < n; i++) S.verts[i][k] = clamp(Math.max(S.verts[i][k], i ? S.verts[i - 1][k] + GAP : 0), 0, S.W);
    for (let i = n - 1; i >= 0; i--) S.verts[i][k] = Math.min(S.verts[i][k], i < n - 1 ? S.verts[i + 1][k] - GAP : S.W);
  }
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
  S.centre.x = clamp(S.centre.x, 0, S.W);
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
    const tn = Math.tan(th * DEG), xt = cx + tn * (0 - cy), xb = cx + tn * (S.H - cy);
    if (xt < -1e-6 || xt > S.W + 1e-6 || xb < -1e-6 || xb > S.W + 1e-6) { dropped++; continue; }
    out.push({ xt: clamp(xt, 0, S.W), xb: clamp(xb, 0, S.W) });
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
    const a = (i + 0.5) / m, P = vp(V1, a), first = alt && i % 2 ? -1 : 1;
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
  for (let i = 0; i < m && S.verts.length > 1; i++) {
    for (let t = 0; t < 250; t++) {
      const cand = { k: 0, a: Math.random(), b: Math.random() };
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
  const pad = Math.max(S.W, S.H) * 0.08;
  let x0 = -pad, y0 = -pad, x1 = S.W + pad, y1 = S.H + pad;
  if (MODE === 'radial') {
    x0 = Math.min(x0, S.centre.x - pad); x1 = Math.max(x1, S.centre.x + pad);
    y0 = Math.min(y0, S.centre.y - pad); y1 = Math.max(y1, S.centre.y + pad);
  }
  return { x0, y0, x1, y1 };
}
const edgeVert = v => (v.xt === 0 && v.xb === 0) || (v.xt === S.W && v.xb === S.W);
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
  let s = `<rect x="0" y="0" width="${S.W}" height="${S.H}" fill="none" stroke="${rc}" stroke-width="2" ${NS}/>`;

  if (MODE === 'radial' && S.layout === 'gen') {
    s += `<g stroke="#999" stroke-dasharray="4 4" stroke-width="1" ${NS} opacity=".55">`;
    const topFar = Math.abs(S.centre.y) > Math.abs(S.H - S.centre.y);
    V.forEach(v => { s += ln(S.centre.x, S.centre.y, topFar ? v.xt : v.xb, topFar ? 0 : S.H); });
    s += '</g>';
  }

  s += `<g stroke="${lc}" stroke-width="1.1" fill="none" stroke-linecap="round" ${NS}>`;
  V.forEach(v => { if (!edgeVert(v)) s += ln(v.xt, 0, v.xb, S.H); });
  lastAll.segs.forEach(g => { if (g.c) s += ln(...g.c); });
  s += '</g>';

  const hl = `stroke="#1976d2" stroke-width="5" opacity=".3" ${NS}`;
  if (UI.selV >= 0 && V[UI.selV]) s += ln(V[UI.selV].xt, 0, V[UI.selV].xb, S.H, hl);
  if (UI.selH >= 0 && S.hors[UI.selH]) {
    const h = S.hors[UI.selH];
    if (V[h.k] && V[h.k + 1]) { const A = vp(V[h.k], h.a), B = vp(V[h.k + 1], h.b); s += ln(A[0], A[1], B[0], B[1], hl); }
  }

  // dimensions
  const D = UI.dim, ink = '#555';
  if (D.edge && V.length) {
    ['xt', 'xb'].forEach(k => {
      const y = k === 'xt' ? -10 * px : S.H + 10 * px, arr = [0, ...V.map(v => v[k]), S.W];
      for (let i = 0; i < arr.length - 1; i++) {
        const a = arr[i], c = arr[i + 1];
        if (c - a < 0.05) continue;
        s += `<g stroke="${ink}" stroke-width="1" ${NS}>${ln(a, y, c, y)}${ln(a, y - 3 * px, a, y + 3 * px)}${ln(c, y - 3 * px, c, y + 3 * px)}</g>`;
        if ((c - a) / px > 26) s += T((a + c) / 2, k === 'xt' ? y - 4 * px : y + 13 * px, (c - a).toFixed(1));
      }
    });
  }
  if (D.tilt) V.forEach(v => { s += T(v.xt, 18 * px, ((Math.atan2(v.xb - v.xt, S.H) / DEG)).toFixed(1) + '°', { c: '#1976d2' }); });
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
      s += `<g stroke="${mc}" stroke-width="1.5" ${NS}>${ln(m.p[0], m.p[1], m.q[0], m.q[1])}</g>`;
      s += `<circle cx="${m.p[0]}" cy="${m.p[1]}" r="${3 * px}" fill="${mc}"/><circle cx="${m.q[0]}" cy="${m.q[1]}" r="${3 * px}" fill="${mc}"/>`;
      s += T((m.p[0] + m.q[0]) / 2, (m.p[1] + m.q[1]) / 2 - 5 * px, `${d.toFixed(2)} mm  (Δx ${Math.abs(m.q[0] - m.p[0]).toFixed(1)}, Δy ${Math.abs(m.q[1] - m.p[1]).toFixed(1)})`, { c: mc });
    } else {
      s += `<g stroke="${mc}" stroke-width="3" opacity=".65" ${NS}>${ln(...m.l1)}${ln(...m.l2)}</g>`;
      s += T(m.at[0], m.at[1] - 6 * px, `${m.acute.toFixed(2)}° / ${(180 - m.acute).toFixed(2)}°`, { c: mc });
    }
  });
  if (UI.mp) {
    if (UI.mp.pt) {
      s += `<circle cx="${UI.mp.pt[0]}" cy="${UI.mp.pt[1]}" r="${4 * px}" fill="${mc}"/>`;
      if (UI.mcur) s += ln(UI.mp.pt[0], UI.mp.pt[1], UI.mcur[0], UI.mcur[1], `stroke="${mc}" stroke-dasharray="5 4" stroke-width="1.2" ${NS}`);
    } else if (UI.mp.line) s += ln(...UI.mp.line, `stroke="${mc}" stroke-width="3" opacity=".65" ${NS}`);
  }

  // handles (verticals only editable in Verticals mode; lines only in Lines mode)
  const r = 5 * px, em = effMode(UI.shift);
  if (em === 'verts') {
    s += `<g fill="#fff" stroke="#1976d2" stroke-width="1.5" ${NS}>`;
    V.forEach((v, i) => [[v.xt, 0], [v.xb, S.H]].forEach(p => {
      s += `<rect x="${fmt(p[0] - r)}" y="${fmt(p[1] - r)}" width="${fmt(2 * r)}" height="${fmt(2 * r)}" ${i === UI.selV ? 'fill="#bbdefb"' : ''}/>`;
    }));
    s += '</g>';
  }
  if (em === 'lines') {
    s += `<g fill="#fff" stroke="#1976d2" stroke-width="1.5" ${NS}>`;
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
    if (UI.draw.cur) s += ln(P[0], P[1], UI.draw.cur[0], UI.draw.cur[1], `stroke="#1976d2" stroke-dasharray="5 4" stroke-width="1.5" ${NS}`);
  }
  if (UI.vdraw) {
    const f = UI.vdraw, x2 = UI.vdraw.cur === undefined ? f.x : UI.vdraw.cur;
    const [xt, xb] = f.edge === 't' ? [f.x, x2] : [x2, f.x];
    s += ln(xt, 0, xb, S.H, `stroke="#1976d2" stroke-dasharray="6 4" stroke-width="1.5" ${NS}`);
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
  else t = UI.vdraw ? 'Click a point on the opposite edge to finish the vertical (Esc cancels).'
    : 'VERTICALS: drag a body to move it whole, a square to move one end · click an edge point then the opposite edge to add one · Delete removes the selected · hold Shift to edit lines.';
  let info = '';
  const i = UI.info;
  if (i && S.hors.length) {
    const bad = i.cross > 0 || i.minGap < S.minGap;
    info = `<br><span class="${bad ? 'bad' : 'ok'}">Crossings: ${i.cross < 0 ? 'n/a' : i.cross} · min vertex gap: ${isFinite(i.minGap) ? i.minGap.toFixed(1) + ' mm' : '–'}</span>`;
  }
  if (UI.note) info += `<br>${UI.note}`;
  if (MODE === 'radial' && UI.dropped) info += `<br>${UI.dropped} radial line(s) don't fit in the rectangle and were dropped.`;
  $('status').innerHTML = t + info;
}

/* ---------- export ---------- */
function buildSVG(bg) {
  const sw = +$('sw').value || 0.2, m = sw / 2, W = S.W, H = S.H;
  let l = '';
  S.verts.forEach(v => { if (!edgeVert(v)) l += `<line x1="${fmt(v.xt)}" y1="0" x2="${fmt(v.xb)}" y2="${H}"/>`; });
  computeAll().segs.forEach(g => { if (g.c) l += `<line x1="${fmt(g.c[0])}" y1="${fmt(g.c[1])}" x2="${fmt(g.c[2])}" y2="${fmt(g.c[3])}"/>`; });
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${fmt(W + sw)}mm" height="${fmt(H + sw)}mm" viewBox="${-m} ${-m} ${fmt(W + sw)} ${fmt(H + sw)}">` +
    (bg ? `<rect x="${-m}" y="${-m}" width="${fmt(W + sw)}" height="${fmt(H + sw)}" fill="#fff"/>` : '') +
    `<rect x="0" y="0" width="${W}" height="${H}" fill="none" stroke="${$('colRect').value}" stroke-width="${sw}"/>` +
    `<g stroke="${$('colLine').value}" stroke-width="${sw}" fill="none" stroke-linecap="round">${l}</g></svg>`;
}
function download(blob, name) {
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name;
  document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}
$('xSvg').onclick = () => download(new Blob([buildSVG(false)], { type: 'image/svg+xml' }), `mirror-pleats-${MODE}.svg`);
$('xPng').onclick = () => {
  const ppm = +$('ppm').value || 6, sw = +$('sw').value || 0.2, img = new Image();
  img.onload = () => {
    const c = document.createElement('canvas');
    c.width = Math.round((S.W + sw) * ppm); c.height = Math.round((S.H + sw) * ppm);
    c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
    c.toBlob(b => download(b, `mirror-pleats-${MODE}.png`), 'image/png');
  };
  img.src = URL.createObjectURL(new Blob([buildSVG(true)], { type: 'image/svg+xml' }));
};

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
    const v = S.verts[i];
    if (Math.hypot(p.x - v.xt, p.y) < tol) return { type: 'vEnd', i, end: 't' };
    if (Math.hypot(p.x - v.xb, p.y - S.H) < tol) return { type: 'vEnd', i, end: 'b' };
  }
  for (let i = 0; i < S.verts.length; i++) {
    const v = S.verts[i];
    if (distSeg(p, [v.xt, 0], [v.xb, S.H]) < tol * 0.7) return { type: 'vBody', i };
  }
  return null;
}
function nearestVertical(p, tol, only) {
  let best = -1, bd = tol;
  S.verts.forEach((v, i) => {
    if (only && !only.includes(i)) return;
    const d = distSeg(p, [v.xt, 0], [v.xb, S.H]);
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
  S.verts.forEach(v => pts.push([v.xt, 0], [v.xb, S.H]));
  lastAll.segs.forEach(g => { if (g.c) pts.push([g.c[0], g.c[1]], [g.c[2], g.c[3]]); });
  if (MODE === 'radial') pts.push([S.centre.x, S.centre.y]);
  let best = null, bd = tol;
  pts.forEach(q => { const d = Math.hypot(q[0] - p.x, q[1] - p.y); if (d < bd) { bd = d; best = q; } });
  return best || [p.x, p.y];
}
function pickLine(p) {
  const tol = 9 * pxmm(), L = [[0, 0, S.W, 0], [S.W, 0, S.W, S.H], [S.W, S.H, 0, S.H], [0, S.H, 0, 0]];
  S.verts.forEach(v => L.push([v.xt, 0, v.xb, S.H]));
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

  if (UI.vdraw) {                                    // second click: finish the new vertical on the opposite edge
    const from = UI.vdraw, x2 = vdrawX(p.x);
    const j = snap();
    if (from.edge === 't' ? addVertical(from.x, x2) : addVertical(x2, from.x)) pushUndo(j);
    UI.vdraw = null; syncUI(); render(); return;
  }
  const h = hitVerts(p);                             // Verticals mode
  UI.selH = -1; UI.selV = h && h.type !== 'centre' ? h.i : -1;
  if (!h) {                                          // empty click near the top/bottom edge starts a new vertical
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
  if (UI.vdraw) { UI.vdraw.cur = vdrawX(p.x); render(); return; }
  if (!drag) {
    const em = effMode(e.shiftKey);
    const h = em === 'lines' ? hitLines(p) : em === 'verts' ? hitVerts(p) : null;
    cv.style.cursor = em === 'measure' ? 'crosshair' : h ? 'pointer'
      : em === 'lines' && nearestVertical(p, 14 * pxmm()) >= 0 ? 'crosshair'
      : em === 'verts' && edgeNear(p) ? 'crosshair' : 'default';
    return;
  }
  if (!drag.pushed) { pushUndo(drag.snapJ); drag.pushed = true; }
  const d = drag;
  if (d.type === 'vEnd') { setEnd(d.i, d.end, p.x); S.layout = 'free'; }
  else if (d.type === 'vBody') { moveBody(d.i, d.orig, p.x - d.start.x); S.layout = 'free'; }
  else if (d.type === 'centre') { S.centre = { x: p.x, y: p.y }; regen(false); }
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
  UI.mode = m; UI.draw = null; UI.vdraw = null; UI.mp = null;
  $('mLines').classList.toggle('on', m === 'lines');
  $('mVerts').classList.toggle('on', m === 'verts');
  $('mMeas').classList.toggle('on', m === 'measure');
  $('modeNote').textContent = m === 'lines'
    ? 'Click a vertical to start a line, click an adjacent one to finish. Drag circles/lines to move them. Hold Shift to move verticals.'
    : m === 'verts' ? 'Drag a vertical to move it whole, or a square end handle. To add a vertical, click a point on the top or bottom edge, then a point on the opposite edge. Delete removes the selected vertical. Hold Shift to edit lines.' : 'Use the Dimensions panel to choose distance or angle.';
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
// insert a vertical (top x, bottom x) in sorted position; lines it splits are trimmed to it
function addVertical(xt, xb) {
  const V = S.verts, i = V.filter(v => v.xt < xt).length;
  const fits = (k, x) => (i === 0 || x >= V[i - 1][k] + GAP) && (i === V.length || x <= V[i][k] - GAP);
  if (!fits('xt', xt) || !fits('xb', xb)) { UI.note = 'That vertical would cross or touch a neighbour (min gap ' + GAP + ' mm).'; return false; }
  if (S.cap && Math.abs(xb - xt) > S.H + 1e-9) { UI.note = 'Exceeds the ±45° cap.'; return false; }
  const nv = { xt, xb }, nh = [];
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
['W', 'H'].forEach(id => on(id, 'onchange', () => act(() => {
  const nw = Math.max(10, +$('W').value || S.W), nh = Math.max(10, +$('H').value || S.H), fx = nw / S.W, fy = nh / S.H;
  S.verts.forEach(v => { v.xt *= fx; v.xb *= fx; });
  S.centre = { x: S.centre.x * fx, y: S.centre.y * fy };
  if (MODE === 'linear') { S.gen.start *= fx; S.gen.spacing *= fx; }
  S.W = nw; S.H = nh;
  if (S.layout === 'gen') regen(false); else sanitize();
})));
on('vxt', 'onchange', () => { if (UI.selV >= 0) act(() => { setEnd(UI.selV, 't', +$('vxt').value); S.layout = 'free'; }); });
on('vxb', 'onchange', () => { if (UI.selV >= 0) act(() => { setEnd(UI.selV, 'b', +$('vxb').value); S.layout = 'free'; }); });
const nudge = sign => { if (UI.selV >= 0) act(() => { moveBody(UI.selV, { ...S.verts[UI.selV] }, sign * (+$('step').value || 1)); S.layout = 'free'; }); };
on('nudL', 'onclick', () => nudge(-1)); on('nudR', 'onclick', () => nudge(1));
['colLine', 'colRect'].forEach(id => on(id, 'oninput', render));
Object.keys(UI.dim).forEach(k => {
  const id = 'd' + k[0].toUpperCase() + k.slice(1);
  on(id, 'onchange', () => { UI.dim[k] = $(id).checked; render(); });
});
document.querySelectorAll('input[name=mt]').forEach(r => r.onchange = () => { UI.mp = null; render(); });

function syncUI() {
  const set = (id, v) => { const el = $(id); if (el && document.activeElement !== el) el.value = typeof v === 'number' ? +v.toFixed(2) : v; };
  set('W', S.W); set('H', S.H); set('gN', S.gen.n); set('mg', S.minGap);
  if (MODE === 'linear') { set('gSp', S.gen.spacing); set('gSt', S.gen.start); if ($('cap')) $('cap').checked = S.cap; }
  else { set('gStep', S.gen.step); set('gOff', S.gen.offset); set('cx', S.centre.x); set('cy', S.centre.y); }
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
