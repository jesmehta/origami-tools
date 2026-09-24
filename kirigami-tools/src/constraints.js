// Constraint logic for paired-cut units (principle 1), plus nesting,
// array and mirror transforms. Pure functions: they read a unit/document
// and return either an updated copy or a rejection with a reason, they
// never mutate their arguments.
import { MIN_WIDTH_MM, cloneUnit, pairedCutInnerSurface, pairedCutGeometry } from "./model.js";
import { add, sub, scale, dot, length, closestPointOnSegment } from "./geom.js";

// ---- Principle 1: conserved-length section -----------------------------

// For a cut of length `cutLength`, the crease offset `d` must keep both
// subdivisions >= MIN_WIDTH_MM: h-d >= MIN and h+d >= MIN  =>  |d| <= h-MIN.
export function creaseOffsetBounds(cutLength) {
  const h = cutLength / 2;
  const bound = h - MIN_WIDTH_MM;
  return { min: -bound, max: bound, feasible: bound >= 0 };
}

export function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

// The section profile shown live in the UI: a+b on the inner (drawn) crease,
// b+a on the outer counterpart, both summing to the same total by
// construction (see README "Principle 1"). This is the thing the tool
// displays to make the conservation law visible, not something it "solves".
export function section(unit) {
  const h = unit.cutLength / 2;
  const d = unit.creaseOffset;
  const a = h - d;
  const b = h + d;
  return { h, a, b, total: a + b, innerOrder: [a, b], outerOrder: [b, a] };
}

export function isPairedCutValid(unit) {
  const bounds = creaseOffsetBounds(unit.cutLength);
  if (!bounds.feasible) return false;
  if (unit.cutLength <= 2 * MIN_WIDTH_MM) return false;
  if (unit.spacing < MIN_WIDTH_MM) return false;
  const { a, b } = section(unit);
  return a >= MIN_WIDTH_MM - 1e-9 && b >= MIN_WIDTH_MM - 1e-9;
}

// Attempt to set the crease offset. Rejects (returns {ok:false}) only when
// the crease is locked or the sheet-defined bound cannot admit the request;
// otherwise clamps to the nearest feasible value.
export function trySetCreaseOffset(unit, requestedD) {
  if (unit.locks.crease) {
    return { ok: false, reason: "The crease is locked and cannot be moved." };
  }
  const bounds = creaseOffsetBounds(unit.cutLength);
  if (!bounds.feasible) {
    return { ok: false, reason: "Cut is too short to admit a valid crease at the minimum width." };
  }
  const next = cloneUnit(unit);
  next.creaseOffset = clamp(requestedD, bounds.min, bounds.max);
  return { ok: true, unit: next, clamped: next.creaseOffset !== requestedD };
}

// Attempt to change cut length. If the crease is locked and the new length
// would make its offset infeasible, the whole change is rejected and the
// caller should retain the previous unit. If the crease is unlocked, its
// offset is auto-clamped to the new bound.
export function trySetCutLength(unit, newLength) {
  if (unit.locks.cuts) {
    return { ok: false, reason: "Cuts are locked and cannot be resized." };
  }
  if (newLength <= 2 * MIN_WIDTH_MM) {
    return { ok: false, reason: `Cut length must exceed ${2 * MIN_WIDTH_MM}mm (2x minimum width).` };
  }
  const bounds = creaseOffsetBounds(newLength);
  if (unit.locks.crease && (unit.creaseOffset < bounds.min || unit.creaseOffset > bounds.max)) {
    return {
      ok: false,
      reason: `The crease is locked at ${unit.creaseOffset.toFixed(2)}mm offset, which the new cut length (${newLength}mm) cannot admit.`,
    };
  }
  const next = cloneUnit(unit);
  next.cutLength = newLength;
  next.creaseOffset = clamp(unit.creaseOffset, bounds.min, bounds.max);
  return { ok: true, unit: next };
}

export function trySetSpacing(unit, newSpacing) {
  if (unit.locks.cuts) {
    return { ok: false, reason: "Cuts are locked and cannot be repositioned." };
  }
  if (newSpacing < MIN_WIDTH_MM) {
    return { ok: false, reason: `Spacing must be at least ${MIN_WIDTH_MM}mm.` };
  }
  const next = cloneUnit(unit);
  next.spacing = newSpacing;
  return { ok: true, unit: next };
}

export function resetToMidline(unit) {
  return trySetCreaseOffset(unit, 0);
}

// ---- Nesting -------------------------------------------------------------

function pointInPolygon(p, poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i].x, yi = poly[i].y;
    const xj = poly[j].x, yj = poly[j].y;
    const intersect =
      yi > p.y !== yj > p.y && p.x < ((xj - xi) * (p.y - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

// Validity flags for a child nested inside a parent paired-cut unit's
// inner (popped) surface. Does not attempt physical simulation; it checks
// containment, zero-width regions and offset feasibility.
export function nestingValidity(childUnit, parentUnit) {
  const flags = [];
  if (!isPairedCutValid(childUnit)) flags.push("child geometry is degenerate (zero-width region)");
  if (parentUnit) {
    const surface = pairedCutInnerSurface(parentUnit);
    const g = pairedCutGeometry(childUnit);
    const corners = [g.cut1.p0, g.cut1.p1, g.cut2.p0, g.cut2.p1];
    const outside = corners.some((c) => !pointInPolygon(c, surface));
    if (outside) flags.push("child leaves the supporting surface");
  }
  return { valid: flags.length === 0, flags };
}

// Propagates the source unit's shared parametric fields (everything except
// placement: origin/rotation) to every linked array instance. Called after
// any edit to a unit that other units reference via `arrayOf.sourceId`.
const ARRAY_LINKED_FIELDS = ["cutLength", "spacing", "creaseOffset", "flapLength", "mountainValley", "locks"];

export function syncArrayInstances(doc, sourceUnit) {
  return {
    ...doc,
    units: doc.units.map((u) => {
      if (!u.arrayOf || u.arrayOf.sourceId !== sourceUnit.id) return u;
      const next = cloneUnit(u);
      for (const key of ARRAY_LINKED_FIELDS) next[key] = cloneUnit({ v: sourceUnit[key] }).v;
      return next;
    }),
  };
}

export function detachArrayInstance(unit) {
  const next = cloneUnit(unit);
  next.arrayOf = null;
  return next;
}

// Runs syncArrayInstances for every unit that has linked followers, in one
// pass over the document. Safe to call after any edit.
export function syncAllArrayLinks(doc) {
  let next = doc;
  for (const unit of doc.units) {
    if (doc.units.some((u) => u.arrayOf && u.arrayOf.sourceId === unit.id)) {
      next = syncArrayInstances(next, unit);
    }
  }
  return next;
}

// ---- Array / mirror transforms -------------------------------------------

// Returns `count` transformed copies (including the original as index 0),
// each translated by k * (dx,dy) from a direction vector + spacing. Every
// copy shares the source's `id` (it's a geometry transform, not a document
// mutation) -- callers that add these to a document MUST assign fresh ids,
// e.g. via `createPairedCutUnit(doc, instance)` (see app.js call sites).
export function arrayInstances(unit, direction, spacing, count) {
  const dir = length(direction) > 1e-9 ? scale(direction, 1 / length(direction)) : { x: 1, y: 0 };
  const step = scale(dir, spacing);
  const out = [];
  for (let k = 0; k < count; k += 1) {
    const instance = cloneUnit(unit);
    instance.origin = add(unit.origin, scale(step, k));
    out.push(instance);
  }
  return out;
}

// Reflects a unit's origin and rotation across an axis line defined by
// point `axisPoint` and direction `axisDir`. Mirroring flips handedness,
// so pop direction is inverted to keep the physical fold sense consistent.
// Like arrayInstances, the result shares the source's `id` -- callers MUST
// assign a fresh id before adding it to a document (see app.js).
export function mirrorUnit(unit, axisPoint, axisDir) {
  const dir = length(axisDir) > 1e-9 ? scale(axisDir, 1 / length(axisDir)) : { x: 1, y: 0 };
  const reflectPoint = (p) => {
    const rel = sub(p, axisPoint);
    const along = scale(dir, dot(rel, dir));
    const across = sub(rel, along);
    return add(axisPoint, sub(along, across));
  };
  const next = cloneUnit(unit);
  next.origin = reflectPoint(unit.origin);
  const axisAngle = Math.atan2(dir.y, dir.x);
  next.rotation = 2 * axisAngle - unit.rotation;
  next.popDirection = -unit.popDirection;
  return next;
}

export { closestPointOnSegment };
