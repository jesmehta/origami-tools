'use strict';
/* Shared helpers for the origami tools. Plain script (no modules) so every tool keeps working
   straight from disk as well as from a server; everything hangs off one global, OT. */
window.OT = window.OT || {};

/* ---------- tooltips ----------
   Any element with data-tip="…" shows that text in a floating box on hover. The text is read at hover time,
   so a tool can change a tip (e.g. per mode) just by setting el.dataset.tip. One box on <body>, so the
   sidebar's scroll clipping never cuts it off. */
(function () {
  let box = null, cur = null;
  function show(el) {
    if (!box) { box = document.createElement('div'); box.className = 'ot-tip'; document.body.appendChild(box); }
    box.textContent = el.dataset.tip; box.hidden = false;
    const r = el.getBoundingClientRect(), bw = box.offsetWidth, bh = box.offsetHeight;
    let x = r.left, y = r.bottom + 6;
    if (x + bw > innerWidth - 8) x = innerWidth - 8 - bw;
    if (y + bh > innerHeight - 8) y = r.top - 6 - bh;
    box.style.left = Math.max(8, x) + 'px'; box.style.top = Math.max(8, y) + 'px';
  }
  const hide = () => { cur = null; if (box) box.hidden = true; };
  document.addEventListener('mouseover', e => {
    const el = e.target.closest ? e.target.closest('[data-tip]') : null;
    if (el === cur) return;
    cur = el;
    if (el && el.dataset.tip) show(el); else hide();
  });
  document.addEventListener('scroll', hide, true);
  document.addEventListener('pointerdown', hide, true);
})();

/* ---------- collapsible sidebar sections ----------
   Click a section heading to fold it away: a fieldset's <legend>, or (vPleat) an <h2> in a .sidebar, which folds
   everything after it up to the next <h2>. Delegated, so sidebars built by script work too. Which sections are
   shut is remembered per page in localStorage (a convenience only; it falls back to all open). A sidebar with three
   or more sections also gets Expand all / Collapse all above its first section. */
(function () {
  const KEY = 'ot-shut:' + location.pathname;
  const heads = () => [...document.querySelectorAll('aside fieldset > legend, .sidebar > h2')];
  const name = h => h.textContent.trim();
  const load = () => { try { return JSON.parse(localStorage.getItem(KEY)) || []; } catch (e) { return []; } };
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(heads().filter(isShut).map(name))); } catch (e) {} };
  const isShut = h => h.classList.contains('ot-shut');
  function setShut(h, shut) {
    h.classList.toggle('ot-shut', shut); h.setAttribute('aria-expanded', !shut);
    if (h.tagName === 'LEGEND') { h.parentElement.classList.toggle('ot-shut', shut); return; }
    for (let el = h.nextElementSibling; el && el.tagName !== 'H2'; el = el.nextElementSibling) el.classList.toggle('ot-folded', shut);
  }
  const headOf = t => t.closest && t.closest('aside fieldset > legend, .sidebar > h2');
  document.addEventListener('click', e => { const h = headOf(e.target); if (h) { setShut(h, !isShut(h)); save(); } });
  document.addEventListener('keydown', e => {
    const h = (e.key === 'Enter' || e.key === ' ') && headOf(e.target);
    if (h) { e.preventDefault(); setShut(h, !isShut(h)); save(); }
  });
  addEventListener('load', () => {
    const shut = new Set(load());
    heads().forEach(h => { h.classList.add('ot-head'); h.tabIndex = 0; setShut(h, shut.has(name(h))); });
    document.querySelectorAll('aside, .sidebar').forEach(box => {
      const hs = heads().filter(h => box.contains(h));
      if (hs.length < 3) return;
      const bar = document.createElement('div'); bar.className = 'ot-foldall';
      bar.innerHTML = '<button type="button" data-shut="0">Expand all</button><button type="button" data-shut="1">Collapse all</button>';
      bar.addEventListener('click', e => {
        const b = e.target.closest('button'); if (!b) return;
        hs.forEach(h => setShut(h, b.dataset.shut === '1')); save();
      });
      const first = hs[0].tagName === 'LEGEND' ? hs[0].parentElement : hs[0];
      first.before(bar);
    });
  });
})();

/* ---------- export ---------- */
// Local-time stamp for file names: YYYY_MMDD_HHMMSS
OT.stamp = (d = new Date()) => {
  const p = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}_${p(d.getMonth() + 1)}${p(d.getDate())}_${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
};
OT.download = (blob, name) => {
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name;
  document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 2000);
};
// Rasterise an SVG string (w × h mm) at ppm px/mm
OT.svgToPng = (svg, wmm, hmm, ppm) => new Promise((resolve, reject) => {
  const img = new Image(), url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));
  img.onload = () => {
    const c = document.createElement('canvas');
    c.width = Math.round(wmm * ppm); c.height = Math.round(hmm * ppm);
    c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
    URL.revokeObjectURL(url);
    c.toBlob(resolve, 'image/png');
  };
  img.onerror = reject;
  img.src = url;
});
// JSZip is only fetched the first time a ZIP is asked for
OT.jszip = () => window.JSZip ? Promise.resolve(window.JSZip) : new Promise((resolve, reject) => {
  const s = document.createElement('script');
  s.src = 'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.2/jszip.min.js';
  s.onload = () => resolve(window.JSZip); s.onerror = () => reject(new Error('Could not load JSZip'));
  document.head.appendChild(s);
});
/* Wire the #xSvg / #xPng / #xZip buttons. opts.base: file-name prefix; opts.svg(bg): the SVG string
   (bg = white background for the PNG); opts.size(): [w, h] of that SVG in mm; opts.project(): optional project
   doc embedded in the SVG (see OT.wireProject). PNG density from #ppm. */
OT.wireExport = opts => {
  const $ = id => document.getElementById(id);
  const png = () => { const [w, h] = opts.size(); return OT.svgToPng(opts.svg(true), w, h, +$('ppm').value || 6); };
  const svgBlob = () => new Blob([OT.embedProject(opts.svg(false), opts.project && opts.project())], { type: 'image/svg+xml' });
  $('xSvg').onclick = () => OT.download(svgBlob(), `${opts.base}_${OT.stamp()}.svg`);
  $('xPng').onclick = async () => { const st = OT.stamp(); OT.download(await png(), `${opts.base}_${st}.png`); };
  $('xZip').onclick = async () => {
    const st = OT.stamp(), name = `${opts.base}_${st}`;
    try {
      const [Z, p] = await Promise.all([OT.jszip(), png()]), zip = new Z();
      zip.file(name + '.svg', svgBlob()); zip.file(name + '.png', p);
      OT.download(await zip.generateAsync({ type: 'blob' }), name + '.zip');
    } catch (e) { alert(e.message); }
  };
};

/* ---------- sheet size presets ---------- */
// Fallback when page-sizes.txt can't be read (e.g. opened from file://). Keep in step with that file.
OT.PAGE_DEFAULTS = [['A4', 297, 210], ['A3', 420, 297], ['370 × 270', 370, 270], ['270 square', 270, 270], ['550 × 760', 550, 760], ['550 square', 550, 550]];
OT.pageSizes = (function () {
  const here = document.currentScript && document.currentScript.src;
  return (async () => {
    try {
      const r = await fetch(new URL('page-sizes.txt', here));
      if (!r.ok) throw new Error(r.status);
      const out = [];
      (await r.text()).split(/\r?\n/).forEach(line => {
        const f = line.replace(/#.*/, '').split(',').map(x => x.trim());
        if (f.length >= 3 && f[0] && +f[1] > 0 && +f[2] > 0) out.push([f[0], +f[1], +f[2]]);
      });
      if (out.length) return out;
    } catch (e) { /* fall through */ }
    return OT.PAGE_DEFAULTS;
  })();
})();
/* Fill the size <select> (#pgSel) and wire the swap button (#pgSwap). o.get(): current [w, h] of the sheet;
   o.set(w, h): apply a new sheet size. Returns sync(), which re-selects the matching preset (either
   orientation) or "Custom" — call it whenever the size may have changed. */
OT.wireSheet = o => {
  const sel = document.getElementById(o.sel || 'pgSel'), swap = document.getElementById(o.swap || 'pgSwap');
  let sizes = [];
  const same = (a, b) => Math.abs(a - b) < 1e-6;
  const sync = () => {
    const [w, h] = o.get(), i = sizes.findIndex(([, a, b]) => (same(a, w) && same(b, h)) || (same(a, h) && same(b, w)));
    sel.value = i >= 0 ? String(i) : 'custom';
  };
  OT.pageSizes.then(list => {
    sizes = list;
    sel.innerHTML = list.map(([n, w, h], i) => `<option value="${i}">${n.includes(String(w)) ? n : `${n} (${w} × ${h})`}</option>`).join('') +
      '<option value="custom">Custom</option>';
    sync();
  });
  sel.onchange = () => { if (sel.value !== 'custom') { const [, w, h] = sizes[+sel.value]; o.set(w, h); } };
  swap.onclick = () => { const [w, h] = o.get(); o.set(h, w); };
  return sync;
};

/* ---------- grid ----------
   Screen-only guide, never exported. Square: lines every `step` mm through the sheet centre. Polar (radial
   pages): rings every `ring` mm and spokes every `spoke`° around a given centre. Settings live in the
   #grOn / #grStep / #grRing / #grSpoke inputs that OT.gridFieldset() writes. */
OT.gridFieldset = polar => `
  <fieldset><legend data-tip="Grid: screen only, never exported; drawn on the sheet. ${polar ? 'Polar: rings and spokes around the ◆ centre, following it when it moves.' : 'Square, with its origin at the sheet centre.'}">Grid &amp; snap</legend>
    <div class="row">
      <label><input type="checkbox" id="grOn" checked> Show</label>
      ${polar
        ? '<label>Rings <input type="number" id="grRing" value="10" min="1" step="1"> mm</label><label>Spokes <input type="number" id="grSpoke" value="7.5" min="1" step="0.5"> °</label>'
        : '<label>Spacing <input type="number" id="grStep" value="10" min="1" step="1"> mm</label>'}
    </div>
    <div class="row"><label data-tip="Dragged points snap to nearby points, to rays at multiples of 15° and 22.5°, and to the grid while it is shown. Hold Alt while dragging to place a point freely."><input type="checkbox" id="snapOn" checked> Snap (Alt = off)</label></div>
  </fieldset>`;
OT.gridCfg = () => {
  const v = (id, d) => { const el = document.getElementById(id); return el ? Math.max(0.5, +el.value || d) : d; };
  const on = document.getElementById('grOn');
  return { on: !on || on.checked, step: v('grStep', 10), ring: v('grRing', 10), spoke: v('grSpoke', 7.5) };
};
OT.wireGrid = render => ['grOn', 'grStep', 'grRing', 'grSpoke'].forEach(id => {
  const el = document.getElementById(id); if (el) el.addEventListener(el.type === 'checkbox' ? 'change' : 'input', render);
});
/* SVG for the grid. page: [x0, y0, x1, y1] (grid is clipped to it); origin: [x, y]; polar: bool.
   Lines through the origin are a shade darker; so is every 5th line / ring. */
OT.gridSVG = (page, origin, polar) => {
  OT._grid = { origin, polar };                         // remembered for snapping
  const g = OT.gridCfg(); if (!g.on) return '';
  const [x0, y0, x1, y1] = page, [ox, oy] = origin, f = n => +n.toFixed(3), NS = 'vector-effect="non-scaling-stroke"';
  let minor = '', major = '';
  const add = (s, k) => { if (k % 5 === 0) major += s; else minor += s; };
  if (!polar) {
    const st = g.step; if ((x1 - x0) / st > 1500 || (y1 - y0) / st > 1500) return '';
    for (let k = Math.ceil((x0 - ox) / st); ox + k * st <= x1; k++) add(`<line x1="${f(ox + k * st)}" y1="${f(y0)}" x2="${f(ox + k * st)}" y2="${f(y1)}"/>`, k);
    for (let k = Math.ceil((y0 - oy) / st); oy + k * st <= y1; k++) add(`<line x1="${f(x0)}" y1="${f(oy + k * st)}" x2="${f(x1)}" y2="${f(oy + k * st)}"/>`, k);
  } else {
    const dx = Math.max(x0 - ox, 0, ox - x1), dy = Math.max(y0 - oy, 0, oy - y1);
    const rMin = Math.hypot(dx, dy), rMax = Math.max(...[[x0, y0], [x1, y0], [x0, y1], [x1, y1]].map(([x, y]) => Math.hypot(x - ox, y - oy)));
    if ((rMax - rMin) / g.ring > 1500) return '';
    for (let k = Math.max(1, Math.ceil(rMin / g.ring)); k * g.ring <= rMax; k++) add(`<circle cx="${f(ox)}" cy="${f(oy)}" r="${f(k * g.ring)}"/>`, k);
    const n = Math.round(360 / g.spoke);
    if (n <= 1440) for (let k = 0; k < n; k++) {
      const a = k * g.spoke * Math.PI / 180;
      add(`<line x1="${f(ox)}" y1="${f(oy)}" x2="${f(ox + rMax * Math.cos(a))}" y2="${f(oy + rMax * Math.sin(a))}"/>`, (k * g.spoke) % 45 === 0 ? 0 : 1);
    }
  }
  return `<clipPath id="otGridClip"><rect x="${f(x0)}" y="${f(y0)}" width="${f(x1 - x0)}" height="${f(y1 - y0)}"/></clipPath>` +
    `<g clip-path="url(#otGridClip)" fill="none" stroke-width="0.5" ${NS}><g stroke="#ebe8e0">${minor}</g><g stroke="#d6d2c6">${major}</g></g>`;
};

/* ---------- snapping ----------
   Candidates, nearest wins within a pixel tolerance (tools pass it in mm): existing points (weighted ×0.5,
   so they win ties), rays at the snap angles from anchor points, grid crossings / rings / spokes (only while
   the grid is shown), then — only if none of those is in range — a single grid line. #snapOn turns it all off; holding Alt
   bypasses it for one drag. OT.lastSnap is the snapped point (or null), for drawing a marker. */
OT.SNAP_DEG = (() => {                                  // multiples of 15° and of 22.5°, over a full turn
  const a = new Set();
  for (let d = 0; d < 360; d += 15) a.add(d);
  for (let d = 0; d < 360; d += 22.5) a.add(d);
  return [...a].sort((x, y) => x - y);
})();
OT.lastSnap = null;
OT.snapping = e => { const c = document.getElementById('snapOn'); OT.lastSnap = null; return (!c || c.checked) && !(e && e.altKey); };
addEventListener('keydown', e => { if (e.key === 'Alt') e.preventDefault(); });   // keep Alt from opening the browser menu
const P2 = p => Array.isArray(p) ? p : [p.x, p.y];
const RAD = Math.PI / 180;
const gridCtx = () => { const g = OT.gridCfg(); return g.on && OT._grid ? { ...g, ...OT._grid } : null; };

/* Snap a point that is constrained to the line A + s·d. Returns s (unchanged projection if nothing is near).
   o: { tol (mm), points: [[x,y]…], anchors: [[x,y]…] (angle rays), grid: false to skip the grid } */
OT.snapOnLine = (p, A, d, o = {}) => {
  p = P2(p);
  const L2 = d[0] * d[0] + d[1] * d[1], tol = o.tol || 1;
  const s0 = ((p[0] - A[0]) * d[0] + (p[1] - A[1]) * d[1]) / L2;
  if (L2 < 1e-12) return s0;
  const at = s => [A[0] + s * d[0], A[1] + s * d[1]], P = at(s0), L = Math.sqrt(L2);
  let best = s0, bd = tol, hit = null;
  const cand = (s, w) => { if (!isFinite(s)) return; const q = at(s), dd = Math.hypot(q[0] - P[0], q[1] - P[1]) * w; if (dd < bd) { bd = dd; best = s; hit = q; } };
  const crs = (a, b) => a[0] * b[1] - a[1] * b[0];
  const rayHit = (F, u) => { const den = crs(d, u); if (Math.abs(den) > 1e-9) cand(crs([F[0] - A[0], F[1] - A[1]], u) / den, 1); };
  (o.points || []).forEach(q => { if (Math.abs(crs(d, [q[0] - A[0], q[1] - A[1]])) / L < tol) cand(((q[0] - A[0]) * d[0] + (q[1] - A[1]) * d[1]) / L2, 0.5); });
  (o.anchors || []).forEach(F => OT.SNAP_DEG.forEach(a => { if (a < 180) rayHit(F, [Math.cos(a * RAD), Math.sin(a * RAD)]); }));
  const g = o.grid === false ? null : gridCtx();
  if (g && !g.polar) {
    const [ox, oy] = g.origin, st = g.step;
    if (Math.abs(d[0]) > 1e-9) for (let k = Math.round((P[0] - ox) / st) - 1, e = k + 2; k <= e; k++) cand((ox + k * st - A[0]) / d[0], 1);
    if (Math.abs(d[1]) > 1e-9) for (let k = Math.round((P[1] - oy) / st) - 1, e = k + 2; k <= e; k++) cand((oy + k * st - A[1]) / d[1], 1);
  } else if (g) {
    const O = g.origin, r0 = Math.hypot(P[0] - O[0], P[1] - O[1]), a0 = Math.atan2(P[1] - O[1], P[0] - O[0]) / RAD;
    // rings: |A + s·d − O| = r
    const fx = A[0] - O[0], fy = A[1] - O[1], b = 2 * (fx * d[0] + fy * d[1]), c0 = fx * fx + fy * fy;
    for (let k = Math.max(1, Math.round(r0 / g.ring) - 1), e = k + 2; k <= e; k++) {
      const disc = b * b - 4 * L2 * (c0 - (k * g.ring) ** 2);
      if (disc >= 0) { cand((-b + Math.sqrt(disc)) / (2 * L2), 1); cand((-b - Math.sqrt(disc)) / (2 * L2), 1); }
    }
    for (let k = Math.round(a0 / g.spoke) - 1, e = k + 2; k <= e; k++) rayHit(O, [Math.cos(k * g.spoke * RAD), Math.sin(k * g.spoke * RAD)]);
  }
  OT.lastSnap = hit;
  return best;
};

/* Snap a free point. o: { tol, points, anchors (angle rays from each), grid: false to skip }. Returns [x, y]. */
OT.snap2D = (p, o = {}) => {
  p = P2(p);
  const tol = o.tol || 1;
  let best = p, bd = tol, hit = null;
  const cand = (q, w) => { const dd = Math.hypot(q[0] - p[0], q[1] - p[1]) * w; if (dd < bd) { bd = dd; best = q; hit = q; } };
  (o.points || []).forEach(q => cand(q, 0.5));
  (o.anchors || []).forEach(F => {
    const r = Math.hypot(p[0] - F[0], p[1] - F[1]); if (r < 1e-9) return;
    OT.SNAP_DEG.forEach(t => {
      const u = [Math.cos(t * RAD), Math.sin(t * RAD)], s = (p[0] - F[0]) * u[0] + (p[1] - F[1]) * u[1];
      if (s > 0) cand([F[0] + s * u[0], F[1] + s * u[1]], 1);
    });
  });
  const g = o.grid === false ? null : gridCtx(), lines = [];   // single grid lines: only if nothing above is in range
  if (g && !g.polar) {
    const [ox, oy] = g.origin, st = g.step, gx = ox + Math.round((p[0] - ox) / st) * st, gy = oy + Math.round((p[1] - oy) / st) * st;
    cand([gx, gy], 1); lines.push([gx, p[1]], [p[0], gy]);
  } else if (g) {
    const O = g.origin, r = Math.hypot(p[0] - O[0], p[1] - O[1]), a = Math.atan2(p[1] - O[1], p[0] - O[0]);
    const rr = Math.max(g.ring, Math.round(r / g.ring) * g.ring), aa = Math.round(a / RAD / g.spoke) * g.spoke * RAD;
    cand([O[0] + rr * Math.cos(aa), O[1] + rr * Math.sin(aa)], 1);
    lines.push([O[0] + rr * Math.cos(a), O[1] + rr * Math.sin(a)], [O[0] + r * Math.cos(aa), O[1] + r * Math.sin(aa)]);
  }
  if (!hit) lines.forEach(q => cand(q, 1));
  OT.lastSnap = hit;
  return best;
};

/* Snap the direction of p as seen from centre C to the snap angles (and the polar grid's spokes when that grid
   is centred on C). Returns the snapped angle in degrees, or the raw one. tol in mm, measured at p. */
OT.snapDir = (C, p, tol) => {
  p = P2(p);
  const r = Math.hypot(p[0] - C[0], p[1] - C[1]), a = Math.atan2(p[1] - C[1], p[0] - C[0]) / RAD;
  if (r < 1e-9) return a;
  const g = gridCtx(), list = OT.SNAP_DEG.slice();
  if (g && g.polar && Math.hypot(g.origin[0] - C[0], g.origin[1] - C[1]) < 1e-6) {
    const k = Math.round(a / g.spoke); list.push((k - 1) * g.spoke, k * g.spoke, (k + 1) * g.spoke);
  }
  let best = a, bd = tol;
  list.forEach(t => {
    const dt = ((t - a) % 360 + 540) % 360 - 180, dd = r * Math.abs(Math.sin(dt * RAD));
    if (Math.abs(dt) < 90 && dd < bd) { bd = dd; best = a + dt; }
  });
  OT.lastSnap = best !== a ? [C[0] + r * Math.cos(best * RAD), C[1] + r * Math.sin(best * RAD)] : null;
  return best;
};
// Snap a scalar to the nearest of some values within tol
OT.snap1D = (v, values, tol) => { let best = v, bd = tol; values.forEach(x => { if (Math.abs(x - v) < bd) { bd = Math.abs(x - v); best = x; } }); return best; };
// Grid lines as plain coordinates near v (square grid only), for 1-D snapping
OT.gridLines = (axis, v) => { const g = gridCtx(); if (!g || g.polar) return []; const o = g.origin[axis], k = Math.round((v - o) / g.step); return [o + (k - 1) * g.step, o + k * g.step, o + (k + 1) * g.step]; };
// Small orange ring at OT.lastSnap (px = mm per screen pixel)
OT.snapMark = px => OT.lastSnap ? `<circle cx="${+OT.lastSnap[0].toFixed(3)}" cy="${+OT.lastSnap[1].toFixed(3)}" r="${7 * px}" fill="none" stroke="#e65100" stroke-width="1.2" vector-effect="non-scaling-stroke"/>` : '';

/* ---------- projects: save / load / templates ----------
   A project file is JSON: { format, tool, version, savedAt, grid, state }. `state` is the tool's model (geometry
   and layout — the same object undo snapshots); `grid` is the Grid & snap panel. Colours, stroke width and PNG
   density are deliberately not saved: they come from the page's current settings. Exported SVGs carry the same
   JSON in <metadata id="ot-project">, so an exported .svg loads back as a project. */
OT.PROJECT_FORMAT = 1;
OT.projectFieldset = () => `
  <fieldset><legend data-tip="Save the drawing — its geometry plus the grid &amp; snap settings — as a .json to load later or reuse as a starting point. Colours and stroke width are not saved; they come from the current settings. Exported SVGs carry the same data, so an exported .svg can be loaded too. You can also drop a .json / .svg onto the page.">Project</legend>
    <div class="row">
      <button id="pjSave">Save…</button>
      <button id="pjLoad">Load…</button>
      <select id="pjTpl" hidden><option value="">Templates…</option></select>
    </div>
    <input type="file" id="pjFile" accept=".json,.svg,application/json,image/svg+xml" hidden>
  </fieldset>`;
OT.gridState = () => {
  const g = OT.gridCfg(), snap = document.getElementById('snapOn');
  return { on: g.on, step: g.step, ring: g.ring, spoke: g.spoke, snap: !snap || snap.checked };
};
OT.setGridState = g => {
  if (!g) return;
  const put = (id, v) => { const el = document.getElementById(id); if (el && v !== undefined) { if (el.type === 'checkbox') el.checked = !!v; else el.value = v; } };
  put('grOn', g.on); put('grStep', g.step); put('grRing', g.ring); put('grSpoke', g.spoke); put('snapOn', g.snap);
};
// Pull a project out of file text: plain JSON, or an SVG exported by these tools
OT.parseProject = text => {
  text = text.trim();
  if (text.startsWith('<')) {
    const m = text.match(/<metadata id="ot-project"><!\[CDATA\[([\s\S]*?)\]\]><\/metadata>/);
    if (!m) throw new Error('This SVG has no project data (it was not exported by these tools, or predates project saving).');
    text = m[1];
  }
  const doc = JSON.parse(text);
  if (!doc || typeof doc !== 'object' || !doc.state) throw new Error('Not a project file.');
  return doc;
};
// Insert the project JSON into an exported SVG string
OT.embedProject = (svg, doc) => doc ? svg.replace(/(<svg[^>]*>)/, `$1<metadata id="ot-project"><![CDATA[${JSON.stringify(doc)}]]></metadata>`) : svg;
/* Wire the Project panel. o: { tool (e.g. 'x-span'), version, base (file-name prefix), get() → state,
   set(state, doc) (apply it; the tool makes it one undo step), templates: URL of an index file whose lines are
   "label, file.json" (file after the last comma, relative to the index; optional) }. Returns doc() for embedding in exports. */
OT.wireProject = o => {
  const $ = id => document.getElementById(id);
  const doc = () => ({ format: OT.PROJECT_FORMAT, tool: o.tool, version: o.version || 1, savedAt: new Date().toISOString(), grid: OT.gridState(), state: o.get() });
  const apply = (text, from) => {
    let d;
    try { d = OT.parseProject(text); } catch (e) { alert(`${from}: ${e.message}`); return; }
    if (d.tool !== o.tool) { alert(`${from} is a "${d.tool}" project; this page is "${o.tool}".`); return; }
    if ((d.version || 1) > (o.version || 1)) alert(`${from} was saved by a newer version of this tool; loading what can be understood.`);
    OT.setGridState(d.grid);
    o.set(JSON.parse(JSON.stringify(d.state)), d);
  };
  const readFile = f => { const r = new FileReader(); r.onload = () => apply(String(r.result), f.name); r.readAsText(f); };
  $('pjSave').onclick = () => OT.download(new Blob([JSON.stringify(doc(), null, 1)], { type: 'application/json' }), `${o.base || o.tool}_${OT.stamp()}.json`);
  $('pjLoad').onclick = () => $('pjFile').click();
  $('pjFile').onchange = e => { const f = e.target.files[0]; if (f) readFile(f); e.target.value = ''; };
  addEventListener('dragover', e => { if ([...e.dataTransfer.types].includes('Files')) e.preventDefault(); });
  addEventListener('drop', e => { const f = e.dataTransfer.files[0]; if (!f || !/\.(json|svg)$/i.test(f.name)) return; e.preventDefault(); readFile(f); });
  if (o.templates) (async () => {
    try {
      const url = new URL(o.templates, location.href), r = await fetch(url); if (!r.ok) return;
      // "label, file": the file is after the last comma, so labels may contain commas
      const list = (await r.text()).split(/\r?\n/).map(l => { l = l.replace(/#.*/, ''); const i = l.lastIndexOf(','); return [l.slice(0, i).trim(), l.slice(i + 1).trim()]; })
        .filter(([label, file]) => label && file);
      if (!list.length) return;
      const sel = $('pjTpl');
      list.forEach(([label, file]) => { const op = document.createElement('option'); op.value = new URL(file, url).href; op.textContent = label; sel.appendChild(op); });
      sel.hidden = false;
      sel.onchange = async () => {
        const href = sel.value; sel.value = ''; if (!href) return;
        try { const t = await fetch(href); if (!t.ok) throw new Error(t.status); apply(await t.text(), 'Template'); } catch (e) { alert('Could not load the template: ' + e.message); }
      };
    } catch (e) { /* no templates (e.g. opened from file://) */ }
  })();
  return doc;
};

/* ---------- margins ----------
   Two margins, each applied symmetrically: mx (left & right) and my (top & bottom), 5–15 mm, optionally locked
   equal. The square grid runs through the page centre, so a margin line sits on a grid line when
   (page length / 2 − margin) is a whole number of grid steps — usually a different margin per axis. */
OT.MARGIN = [5, 15];
OT.marginRow = () => `
    <div class="row">
      <label data-tip="Left &amp; right margin (5–15 mm). The pattern is cropped at the margin line, which is exported as the cut line; the page outline is not exported. Changing a margin keeps the page size and rescales the pattern.">Margin ↔ <input type="number" id="margX" min="5" max="15" step="0.5"></label>
      <label data-tip="Top &amp; bottom margin (5–15 mm).">↕ <input type="number" id="margY" min="5" max="15" step="0.5"> mm</label>
      <button id="margLock" data-tip="Keep the two margins equal">🔗</button>
      <button id="margFit" data-tip="Move each margin line onto the nearest grid line (within 5–15 mm), so the area inside holds a whole number of grid steps. Or drag the margin edges in Margin mode.">Fit to grid</button>
    </div>`;
const clampM = v => Math.min(OT.MARGIN[1], Math.max(OT.MARGIN[0], v));
// All margins in range that put the margin line on the grid, for page length L and step st
OT.gridMargins = (L, st) => {
  const out = [];
  for (let k = Math.ceil((L / 2 - OT.MARGIN[1]) / st - 1e-9); L / 2 - k * st >= OT.MARGIN[0] - 1e-9; k++) out.push(L / 2 - k * st);
  return out;
};
// nearest to v; on a tie the smaller margin (the larger working area)
const nearest = (list, v) => list.reduce((b, x) => b === null || Math.abs(x - v) < Math.abs(b - v) - 1e-9 || (Math.abs(Math.abs(x - v) - Math.abs(b - v)) <= 1e-9 && x < b) ? x : b, null);
// While dragging a margin edge: d = its distance from the page edge; snapped to the square grid if one is shown
OT.snapMargin = (L, d, tol) => {
  const g = gridCtx(); OT.lastSnap = null;
  if (!g || g.polar) return d;
  const k = Math.round((L / 2 - d) / g.step), v = L / 2 - k * g.step;
  return Math.abs(v - d) < tol ? v : Math.round(d * 10) / 10;   // off the grid: whole tenths of a mm
};
// "working area 260 × 190 mm = 26 × 19 grid steps", flagging an axis whose margin line is off the grid
OT.marginInfo = (PW, PH, mx, my) => {
  const w = PW - 2 * mx, h = PH - 2 * my, g = OT.gridCfg(), f = v => +v.toFixed(2);
  let s = `working area ${f(w)} × ${f(h)} mm`;
  if (OT._grid && !OT._grid.polar) {
    const on = (L, m) => Math.abs(((L / 2 - m) / g.step) - Math.round((L / 2 - m) / g.step)) < 1e-6;
    s += ` = ${f(w / g.step)} × ${f(h / g.step)} grid steps`;
    const off = [on(PW, mx) ? '' : '↔', on(PH, my) ? '' : '↕'].filter(Boolean);
    if (off.length) s += ` (${off.join(' and ')} not on the grid)`;
  }
  return s;
};
/* Wire #margX, #margY, #margLock, #margFit. o: { get() → [mx, my, lock], set(mx, my, lock) (one undo step),
   page() → [PW, PH], polar (bool: this page's grid is polar — Fit is disabled), note(msg) }. Returns sync(). */
OT.wireMargins = o => {
  const $ = id => document.getElementById(id);
  $('margX').onchange = () => { const [mx, my, lock] = o.get(), v = clampM(+$('margX').value || mx); o.set(v, lock ? v : my, lock); };
  $('margY').onchange = () => { const [mx, my, lock] = o.get(), v = clampM(+$('margY').value || my); o.set(lock ? v : mx, v, lock); };
  $('margLock').onclick = () => { const [mx, my, lock] = o.get(); o.set(mx, lock ? my : mx, !lock); };
  $('margFit').onclick = () => {
    const [mx, my, lock] = o.get(), [PW, PH] = o.page(), st = OT.gridCfg().step;
    const xs = OT.gridMargins(PW, st), ys = OT.gridMargins(PH, st);
    if (lock) {                                    // one margin on the grid on both axes, if there is one
      const both = xs.filter(x => ys.some(y => Math.abs(x - y) < 1e-6)), v = nearest(both, mx);
      if (v !== null) { o.set(v, v, true); return; }
    }
    const fx = nearest(xs, mx), fy = nearest(ys, my);
    o.set(fx === null ? mx : fx, fy === null ? my : fy, false);
    const miss = [fx === null ? '↔' : '', fy === null ? '↕' : ''].filter(Boolean).join(' and ');
    o.note((lock ? 'No single margin fits the grid on both axes, so the margins were unlocked. ' : '') +
      (miss ? `No grid line lies within 5–15 mm for ${miss} with a ${st} mm grid; left as it was.` : ''));
  };
  return () => {
    const [mx, my, lock] = o.get(), put = (id, v) => { if (document.activeElement !== $(id)) $(id).value = +v.toFixed(2); };
    put('margX', mx); put('margY', my);
    $('margY').disabled = lock; $('margLock').classList.toggle('on', lock);
    $('margFit').disabled = !!o.polar;
    if (o.polar) $('margFit').dataset.tip = 'This page\'s grid is polar, so there are no grid lines to fit the margins to; set them by value.';
  };
};
