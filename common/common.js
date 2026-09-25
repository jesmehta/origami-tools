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
