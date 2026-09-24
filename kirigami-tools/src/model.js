// Document model. Plain JSON-serializable objects; SVG/canvas are a view,
// never the source of truth. All lengths in millimetres.
import { add, scale, rotate, fromAngle, perp } from "./geom.js";

export const DOC_VERSION = 1;
export const MIN_WIDTH_MM = 1; // smallest allowed a/b subdivision, cut length, spacing

export function createDocument({ width = 210, height = 297 } = {}) {
  return {
    version: DOC_VERSION,
    sheet: { width, height, units: "mm" },
    grid: {
      majorSpacing: 10,
      minorSpacing: 2,
      visible: true,
      snap: {
        grid: true,
        endpoint: true,
        midpoint: true,
        intersection: true,
        cut: true,
        crease: true,
        center: true,
      },
    },
    units: [],
    nextId: 1,
    // Reserved for a future kinematic 3D view (face adjacency, hinge
    // angles, parent transforms). Untouched by the current 2D editor, but
    // carried through save/load so a future version can populate it
    // without breaking existing documents.
    topology3D: null,
  };
}

export function makeId(doc, prefix) {
  const id = `${prefix}${doc.nextId}`;
  doc.nextId += 1;
  return id;
}

export function findUnit(doc, id) {
  return doc.units.find((u) => u.id === id) || null;
}

export function childrenOf(doc, parentId) {
  return doc.units.filter((u) => u.parentId === parentId);
}

export function rootUnits(doc) {
  return doc.units.filter((u) => u.parentId === null);
}

// ---- Paired-cut unit (principle 1) ----------------------------------

export function createPairedCutUnit(
  doc,
  {
    origin = { x: 0, y: 0 },
    rotation = 0, // radians; direction the two cuts run in
    cutLength = 40,
    spacing = 20, // distance between the two cuts
    creaseOffset = 0, // signed mm offset of the inner crease from the midline
    flapLength = 20, // how far the outer counterpart creases extend past each cut
    mountainValley = "mountain", // fold sense of the inner crease
    popDirection = 1, // +1 / -1, inverts which way the unit pops
    locks = { cuts: false, crease: false },
    parentId = null,
  } = {}
) {
  return {
    id: makeId(doc, "u"),
    type: "pairedCut",
    parentId,
    origin: { ...origin },
    rotation,
    cutLength,
    spacing,
    creaseOffset,
    flapLength,
    mountainValley,
    popDirection,
    locks: { cuts: !!locks.cuts, crease: !!locks.crease },
    arrayOf: null, // { sourceId, index } when this is a linked array instance
    name: null,
  };
}

// Local axes: cutDir runs along the two cuts, crossDir is the midline direction.
export function unitAxes(unit) {
  const cutDir = fromAngle(unit.rotation);
  const crossDir = perp(cutDir);
  return { cutDir, crossDir };
}

// Derived geometry for a paired-cut unit: cut endpoints, midline span,
// inner crease, and the two outer counterpart crease segments.
export function pairedCutGeometry(unit) {
  const { cutDir, crossDir } = unitAxes(unit);
  const h = unit.cutLength / 2;
  const halfSpacing = unit.spacing / 2;

  const center1 = add(unit.origin, scale(crossDir, -halfSpacing));
  const center2 = add(unit.origin, scale(crossDir, halfSpacing));

  const cut1 = {
    p0: add(center1, scale(cutDir, -h)),
    p1: add(center1, scale(cutDir, h)),
    center: center1,
  };
  const cut2 = {
    p0: add(center2, scale(cutDir, -h)),
    p1: add(center2, scale(cutDir, h)),
    center: center2,
  };

  // The crease itself runs perpendicular to the cuts, i.e. along crossDir.
  // `d` slides its attachment point along each cut (along cutDir).
  const d = unit.creaseOffset;
  const innerAt1 = add(center1, scale(cutDir, d));
  const innerAt2 = add(center2, scale(cutDir, d));
  const innerCrease = { p0: innerAt1, p1: innerAt2 };

  // Counterpart creases attach at the mirrored offset -d on the SAME cuts,
  // then continue outward past that cut (away from the other cut) along
  // crossDir — the fold line that runs across the rest of the sheet.
  const outerAt1 = add(center1, scale(cutDir, -d));
  const outerAt2 = add(center2, scale(cutDir, -d));
  const flap = unit.flapLength;
  const outerCreaseLeft = {
    p0: outerAt1,
    p1: add(outerAt1, scale(crossDir, -flap)),
  };
  const outerCreaseRight = {
    p0: outerAt2,
    p1: add(outerAt2, scale(crossDir, flap)),
  };

  const midline = {
    p0: add(unit.origin, scale(crossDir, -(halfSpacing + flap))),
    p1: add(unit.origin, scale(crossDir, halfSpacing + flap)),
  };

  return { cut1, cut2, innerCrease, outerCreaseLeft, outerCreaseRight, midline, cutDir, crossDir, h, d };
}

// The quadrilateral strip between the two cuts (the face that pops up),
// used as the "supporting surface" children can be nested inside.
export function pairedCutInnerSurface(unit) {
  const g = pairedCutGeometry(unit);
  return [g.cut1.p0, g.cut1.p1, g.cut2.p1, g.cut2.p0];
}

export function cloneUnit(unit) {
  return JSON.parse(JSON.stringify(unit));
}

export function cloneDocument(doc) {
  return JSON.parse(JSON.stringify(doc));
}
