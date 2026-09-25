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
   (bg = white background for the PNG); opts.size(): [w, h] of that SVG in mm. PNG density from #ppm. */
OT.wireExport = opts => {
  const $ = id => document.getElementById(id);
  const png = () => { const [w, h] = opts.size(); return OT.svgToPng(opts.svg(true), w, h, +$('ppm').value || 6); };
  const svgBlob = () => new Blob([opts.svg(false)], { type: 'image/svg+xml' });
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
