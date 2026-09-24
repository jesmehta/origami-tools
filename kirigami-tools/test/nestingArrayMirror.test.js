import test from "node:test";
import assert from "node:assert/strict";
import { createDocument, createPairedCutUnit, pairedCutGeometry } from "../src/model.js";
import { nestingValidity, arrayInstances, mirrorUnit, trySetCreaseOffset } from "../src/constraints.js";
import { distance } from "../src/geom.js";

test("child fully inside the parent's inner strip is valid", () => {
  const doc = createDocument();
  const parent = createPairedCutUnit(doc, { origin: { x: 100, y: 100 }, rotation: 0, cutLength: 80, spacing: 40 });
  const child = createPairedCutUnit(doc, {
    origin: { x: 100, y: 100 },
    rotation: Math.PI / 2, // rotated 90 deg so it fits inside the parent strip
    cutLength: 20,
    spacing: 10,
    parentId: parent.id,
  });
  const result = nestingValidity(child, parent);
  assert.equal(result.valid, true);
});

test("child that leaves the parent's surface is flagged", () => {
  const doc = createDocument();
  const parent = createPairedCutUnit(doc, { origin: { x: 100, y: 100 }, rotation: 0, cutLength: 80, spacing: 40 });
  const child = createPairedCutUnit(doc, {
    origin: { x: 500, y: 500 }, // far outside
    rotation: Math.PI / 2,
    cutLength: 20,
    spacing: 10,
    parentId: parent.id,
  });
  const result = nestingValidity(child, parent);
  assert.equal(result.valid, false);
  assert.ok(result.flags.some((f) => f.includes("leaves the supporting surface")));
});

test("degenerate child geometry is flagged independent of parent", () => {
  const doc = createDocument();
  const child = createPairedCutUnit(doc, { cutLength: 0.5, spacing: 5 }); // below 2x MIN_WIDTH
  const result = nestingValidity(child, null);
  assert.equal(result.valid, false);
});

test("array preserves each instance's internal parameters (conserved-length constraint holds for every copy)", () => {
  const doc = createDocument();
  const unit = createPairedCutUnit(doc, { origin: { x: 10, y: 10 }, cutLength: 30, creaseOffset: 6 });
  const instances = arrayInstances(unit, { x: 1, y: 0 }, 40, 4);
  assert.equal(instances.length, 4);
  instances.forEach((inst, k) => {
    assert.equal(inst.cutLength, unit.cutLength);
    assert.equal(inst.creaseOffset, unit.creaseOffset);
    assert.ok(Math.abs(inst.origin.x - (unit.origin.x + k * 40)) < 1e-9);
    // conserved-length identity still holds on every array instance
    const r = trySetCreaseOffset(inst, inst.creaseOffset);
    assert.equal(r.ok, true);
  });
});

test("mirroring reflects origin across the axis and inverts pop direction", () => {
  const doc = createDocument();
  const unit = createPairedCutUnit(doc, { origin: { x: 20, y: 5 }, rotation: 0, popDirection: 1 });
  // mirror across the vertical line x=0 (axis point (0,0), direction (0,1))
  const mirrored = mirrorUnit(unit, { x: 0, y: 0 }, { x: 0, y: 1 });
  assert.ok(Math.abs(mirrored.origin.x - -20) < 1e-9);
  assert.ok(Math.abs(mirrored.origin.y - 5) < 1e-9);
  assert.equal(mirrored.popDirection, -1);
});

test("mirrorUnit and arrayInstances share the source's id (callers must reassign before adding to a document)", () => {
  const doc = createDocument();
  const unit = createPairedCutUnit(doc, { origin: { x: 20, y: 5 } });
  const mirrored = mirrorUnit(unit, { x: 0, y: 0 }, { x: 0, y: 1 });
  assert.equal(mirrored.id, unit.id);
  const instances = arrayInstances(unit, { x: 1, y: 0 }, 30, 3);
  assert.ok(instances.every((inst) => inst.id === unit.id));
  // the fix belongs at the call site: reassigning via createPairedCutUnit
  const reassigned = createPairedCutUnit(doc, mirrored);
  assert.notEqual(reassigned.id, unit.id);
});

test("mirroring twice across the same axis returns to the original placement", () => {
  const doc = createDocument();
  const unit = createPairedCutUnit(doc, { origin: { x: 33, y: -7 }, rotation: 0.4, popDirection: 1 });
  const once = mirrorUnit(unit, { x: 5, y: 5 }, { x: 1, y: 1 });
  const twice = mirrorUnit(once, { x: 5, y: 5 }, { x: 1, y: 1 });
  assert.ok(distance(twice.origin, unit.origin) < 1e-9);
  assert.equal(twice.popDirection, unit.popDirection);
});
