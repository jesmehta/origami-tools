// Save/load (document JSON) and fabrication SVG export.
import { DOC_VERSION, pairedCutGeometry } from "./model.js";
import { CREASE_ROLES } from "./pattern6.js";

// ---- Save / load ----------------------------------------------------------

export function saveDocument(doc) {
  return JSON.stringify(doc, null, 2);
}

export function loadDocument(text) {
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch (err) {
    throw new Error(`Not valid JSON: ${err.message}`);
  }
  if (typeof parsed !== "object" || parsed === null) throw new Error("Document must be an object.");
  if (parsed.version !== DOC_VERSION) {
    throw new Error(`Unsupported document version: ${parsed.version} (expected ${DOC_VERSION}).`);
  }
  if (!parsed.sheet || !Number.isFinite(parsed.sheet.width) || !Number.isFinite(parsed.sheet.height)) {
    throw new Error("Document is missing valid sheet dimensions.");
  }
  if (!Array.isArray(parsed.units)) throw new Error("Document is missing a units array.");
  if (parsed.topology3D === undefined) parsed.topology3D = null;
  return parsed;
}

// ---- Fabrication SVG export ------------------------------------------------

const DEFAULT_STYLE = {
  cut: { color: "#000000", width: 0.15, dash: "" },
  mountain: { color: "#d62728", width: 0.1, dash: "4,2" },
  valley: { color: "#1f6feb", width: 0.1, dash: "1,2" },
  reference: { color: "#999999", width: 0.08, dash: "0.5,1.5" },
  boundary: { color: "#cccccc", width: 0.1, dash: "" },
  registration: { color: "#000000", width: 0.1, dash: "" },
};

function line(p0, p1, style) {
  const dashAttr = style.dash ? ` stroke-dasharray="${style.dash}"` : "";
  return `<line x1="${fmt(p0.x)}" y1="${fmt(p0.y)}" x2="${fmt(p1.x)}" y2="${fmt(p1.y)}" stroke="${style.color}" stroke-width="${style.width}"${dashAttr} />`;
}

function fmt(n) {
  return Math.round(n * 1e6) / 1e6;
}

function oppositeFold(mv) {
  return mv === "mountain" ? "valley" : "mountain";
}

function pairedCutLines(unit) {
  const g = pairedCutGeometry(unit);
  const innerType = unit.popDirection >= 0 ? unit.mountainValley : oppositeFold(unit.mountainValley);
  const outerType = oppositeFold(innerType);
  return {
    cuts: [
      [g.cut1.p0, g.cut1.p1],
      [g.cut2.p0, g.cut2.p1],
    ],
    folds: [
      { p0: g.innerCrease.p0, p1: g.innerCrease.p1, type: innerType },
      { p0: g.outerCreaseLeft.p0, p1: g.outerCreaseLeft.p1, type: outerType },
      { p0: g.outerCreaseRight.p0, p1: g.outerCreaseRight.p1, type: outerType },
    ],
    reference: [[g.midline.p0, g.midline.p1]],
  };
}

function sixCreaseCutLines(cut) {
  const cutSegs = [
    [cut.A, cut.B],
    [cut.B, cut.C],
  ];
  const folds = [];
  for (const role of CREASE_ROLES) {
    const assignment = cut.assignments[role];
    const ref = cut.creaseRefs[role];
    if (!assignment || assignment === "flat" || !ref) continue;
    folds.push({ p0: ref.p0, p1: ref.p1, type: assignment });
  }
  return { cuts: cutSegs, folds, reference: [] };
}

export function collectLines(doc) {
  const cuts = [];
  const mountains = [];
  const valleys = [];
  const references = [];
  for (const unit of doc.units) {
    const parts =
      unit.type === "pairedCut" ? pairedCutLines(unit) : unit.type === "sixCreaseCut" ? sixCreaseCutLines(unit) : null;
    if (!parts) continue;
    for (const [p0, p1] of parts.cuts) cuts.push([p0, p1]);
    for (const f of parts.folds) (f.type === "mountain" ? mountains : valleys).push([f.p0, f.p1]);
    for (const [p0, p1] of parts.reference) references.push([p0, p1]);
  }
  return { cuts, mountains, valleys, references };
}

export function exportSVG(doc, options = {}) {
  const opts = {
    includeCuts: true,
    includeMountain: true,
    includeValley: true,
    includeReference: false,
    includeBoundary: false,
    includeRegistrationMarks: false,
    style: DEFAULT_STYLE,
    ...options,
  };
  const style = { ...DEFAULT_STYLE, ...(options.style || {}) };
  const { width, height } = doc.sheet;
  const { cuts, mountains, valleys, references } = collectLines(doc);

  const groups = [];
  if (opts.includeBoundary) {
    groups.push(
      `<g id="BOUNDARY">${line({ x: 0, y: 0 }, { x: width, y: 0 }, style.boundary)}${line(
        { x: width, y: 0 },
        { x: width, y: height },
        style.boundary
      )}${line({ x: width, y: height }, { x: 0, y: height }, style.boundary)}${line(
        { x: 0, y: height },
        { x: 0, y: 0 },
        style.boundary
      )}</g>`
    );
  }
  if (opts.includeRegistrationMarks) {
    const m = Math.min(width, height) * 0.02 + 2;
    const corners = [
      { x: 0, y: 0 },
      { x: width, y: 0 },
      { x: width, y: height },
      { x: 0, y: height },
    ];
    const marks = corners
      .map(
        (c) =>
          line({ x: c.x - m, y: c.y }, { x: c.x + m, y: c.y }, style.registration) +
          line({ x: c.x, y: c.y - m }, { x: c.x, y: c.y + m }, style.registration)
      )
      .join("");
    groups.push(`<g id="REGISTRATION">${marks}</g>`);
  }
  if (opts.includeReference) {
    groups.push(`<g id="REFERENCE">${references.map(([p0, p1]) => line(p0, p1, style.reference)).join("")}</g>`);
  }
  if (opts.includeCuts) {
    groups.push(`<g id="CUT">${cuts.map(([p0, p1]) => line(p0, p1, style.cut)).join("")}</g>`);
  }
  if (opts.includeMountain) {
    groups.push(`<g id="MOUNTAIN_FOLD">${mountains.map(([p0, p1]) => line(p0, p1, style.mountain)).join("")}</g>`);
  }
  if (opts.includeValley) {
    groups.push(`<g id="VALLEY_FOLD">${valleys.map(([p0, p1]) => line(p0, p1, style.valley)).join("")}</g>`);
  }

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}mm" height="${height}mm" viewBox="0 0 ${width} ${height}">`,
    ...groups,
    `</svg>`,
  ].join("\n");
}

// Lightweight export/reimport self-check: no XML dependency, just verifies
// the declared physical dimensions and viewBox round-trip exactly, and
// that the group line counts match what was fed in. Used by tests and can
// be run after every export.
export function verifyExportedSVG(svgText, doc) {
  const problems = [];
  const widthMatch = svgText.match(/width="([\d.]+)mm"/);
  const heightMatch = svgText.match(/height="([\d.]+)mm"/);
  const viewBoxMatch = svgText.match(/viewBox="0 0 ([\d.]+) ([\d.]+)"/);
  if (!widthMatch || Number(widthMatch[1]) !== doc.sheet.width) problems.push("width mismatch");
  if (!heightMatch || Number(heightMatch[1]) !== doc.sheet.height) problems.push("height mismatch");
  if (!viewBoxMatch || Number(viewBoxMatch[1]) !== doc.sheet.width || Number(viewBoxMatch[2]) !== doc.sheet.height) {
    problems.push("viewBox mismatch");
  }
  const countLines = (groupId) => {
    const groupMatch = svgText.match(new RegExp(`<g id="${groupId}">([\\s\\S]*?)</g>`));
    if (!groupMatch) return 0;
    return (groupMatch[1].match(/<line /g) || []).length;
  };
  const { cuts, mountains, valleys } = collectLines(doc);
  const cutCount = countLines("CUT");
  const mountainCount = countLines("MOUNTAIN_FOLD");
  const valleyCount = countLines("VALLEY_FOLD");
  if (svgText.includes('id="CUT"') && cutCount !== cuts.length) problems.push(`CUT line count mismatch: ${cutCount} vs ${cuts.length}`);
  if (svgText.includes('id="MOUNTAIN_FOLD"') && mountainCount !== mountains.length) {
    problems.push(`MOUNTAIN_FOLD line count mismatch: ${mountainCount} vs ${mountains.length}`);
  }
  if (svgText.includes('id="VALLEY_FOLD"') && valleyCount !== valleys.length) {
    problems.push(`VALLEY_FOLD line count mismatch: ${valleyCount} vs ${valleys.length}`);
  }
  return { ok: problems.length === 0, problems };
}
