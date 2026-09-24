import test from "node:test";
import assert from "node:assert/strict";
import { createDocument, createPairedCutUnit, pairedCutGeometry } from "../src/model.js";
import {
  section,
  trySetCreaseOffset,
  trySetCutLength,
  creaseOffsetBounds,
  isPairedCutValid,
  resetToMidline,
} from "../src/constraints.js";
import { distance, dot, sub } from "../src/geom.js";

function makeUnit(overrides) {
  const doc = createDocument();
  return createPairedCutUnit(doc, { cutLength: 40, spacing: 20, creaseOffset: 0, ...overrides });
}

test("initial crease lies exactly on the midline (d=0)", () => {
  const unit = makeUnit();
  const g = pairedCutGeometry(unit);
  // midline passes through both cut centres
  assert.ok(distance(g.midline.p0, g.cut1.center) >= 0);
  const onLine = (p) => Math.abs(dot(sub(p, g.midline.p0), { x: g.midline.p1.y - g.midline.p0.y, y: -(g.midline.p1.x - g.midline.p0.x) })) < 1e-9;
  assert.ok(onLine(g.innerCrease.p0));
  assert.ok(onLine(g.innerCrease.p1));
  assert.equal(unit.creaseOffset, 0);
});

test("crease is perpendicular to both cuts for any offset", () => {
  for (const d of [-15, -5, 0, 7.5, 15]) {
    const unit = makeUnit({ creaseOffset: d });
    const g = pairedCutGeometry(unit);
    const cutVec = sub(g.cut1.p1, g.cut1.p0);
    const creaseVec = sub(g.innerCrease.p1, g.innerCrease.p0);
    assert.ok(Math.abs(dot(cutVec, creaseVec)) < 1e-9, `not perpendicular at d=${d}`);
  }
});

test("conserved length: a+b on inner crease equals b+a on outer counterpart", () => {
  for (const d of [-18, -10, 0, 12.3, 18]) {
    const unit = makeUnit({ creaseOffset: d });
    const s = section(unit);
    assert.equal(s.a + s.b, s.total);
    assert.equal(s.innerOrder[0] + s.innerOrder[1], s.outerOrder[0] + s.outerOrder[1]);
    assert.ok(Math.abs(s.total - unit.cutLength) < 1e-9);
  }
});

test("outer counterpart attaches at -d, mirrored across the midline", () => {
  const unit = makeUnit({ creaseOffset: 9 });
  const g = pairedCutGeometry(unit);
  // outer creases start at the -d attachment point on each cut
  const expectedAt1 = { x: g.cut1.center.x - g.cutDir.x * 9, y: g.cut1.center.y - g.cutDir.y * 9 };
  assert.ok(distance(g.outerCreaseLeft.p0, expectedAt1) < 1e-9);
});

test("dragging the crease clamps at the min-width bound instead of exceeding it", () => {
  const unit = makeUnit({ cutLength: 20 }); // h=10, MIN=1 => bound = 9
  const bounds = creaseOffsetBounds(20);
  assert.equal(bounds.max, 9);
  const result = trySetCreaseOffset(unit, 50);
  assert.equal(result.ok, true);
  assert.equal(result.clamped, true);
  assert.equal(result.unit.creaseOffset, 9);
  assert.ok(isPairedCutValid(result.unit));
});

test("locked crease rejects a move and the caller keeps the last valid state", () => {
  const unit = makeUnit({ creaseOffset: 5, locks: { cuts: false, crease: true } });
  const result = trySetCreaseOffset(unit, 12);
  assert.equal(result.ok, false);
  assert.match(result.reason, /locked/i);
});

test("locked crease blocks a cut-length change that would violate its offset", () => {
  const unit = makeUnit({ cutLength: 40, creaseOffset: 18, locks: { cuts: false, crease: true } });
  // bound at length 40 is 19, so 18 is fine; shrinking to 20 (bound 9) must be rejected
  const result = trySetCutLength(unit, 20);
  assert.equal(result.ok, false);
  assert.match(result.reason, /locked/i);
});

test("unlocked crease auto-clamps when cut length shrinks", () => {
  const unit = makeUnit({ cutLength: 40, creaseOffset: 18, locks: { cuts: false, crease: false } });
  const result = trySetCutLength(unit, 20);
  assert.equal(result.ok, true);
  assert.equal(result.unit.creaseOffset, 9);
});

test("locked cuts reject length/spacing edits", () => {
  const unit = makeUnit({ locks: { cuts: true, crease: false } });
  assert.equal(trySetCutLength(unit, 60).ok, false);
});

test("reset to midline sets creaseOffset back to 0", () => {
  const unit = makeUnit({ creaseOffset: 12 });
  const result = resetToMidline(unit);
  assert.equal(result.ok, true);
  assert.equal(result.unit.creaseOffset, 0);
});

test("cut length below twice the minimum width is infeasible", () => {
  const bounds = creaseOffsetBounds(1.5);
  assert.equal(bounds.feasible, false);
});
