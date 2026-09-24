import test from "node:test";
import assert from "node:assert/strict";
import { createDocument } from "../src/model.js";
import {
  createSixCreaseCut,
  sideOfPoint,
  classifyDrawnCrease,
  setAssignment,
  setPattern,
  sixCreaseStatus,
  ghostSuggestions,
  SIX_CREASE_RULE_TABLE,
  SIX_CREASE_PATTERNS,
} from "../src/pattern6.js";

function makeCut() {
  const doc = createDocument();
  return createSixCreaseCut(doc, { A: { x: 0, y: 0 }, B: { x: 20, y: 0 }, C: { x: 40, y: 0 } });
}

test("rule table is intentionally unpopulated", () => {
  assert.equal(SIX_CREASE_RULE_TABLE, null);
});

test("eight patterns are exactly the 2x2x2 combinations", () => {
  assert.equal(SIX_CREASE_PATTERNS.length, 8);
  const seen = new Set(SIX_CREASE_PATTERNS.map((p) => `${p.distribution}|${p.orientation}|${p.inverted}`));
  assert.equal(seen.size, 8);
});

test("sideOfPoint classifies above/below the A-B-C line consistently", () => {
  const cut = makeCut();
  const above = sideOfPoint(cut, { x: 10, y: -10 });
  const below = sideOfPoint(cut, { x: 10, y: 10 });
  assert.notEqual(above, below);
  assert.ok(["P", "Q"].includes(above));
});

test("classifyDrawnCrease identifies role from nearest vertex + side", () => {
  const cut = makeCut();
  const role = classifyDrawnCrease(cut, { x: 0, y: 0 }, { x: 0, y: -15 });
  assert.match(role, /^A[PQ]$/);
});

test("classifyDrawnCrease returns null when neither endpoint is near a vertex", () => {
  const cut = makeCut();
  const role = classifyDrawnCrease(cut, { x: 10, y: -20 }, { x: 10, y: 20 });
  assert.equal(role, null);
});

test("assignments are manual only; ghost suggestions stay disabled", () => {
  let cut = makeCut();
  cut = setAssignment(cut, "AP", "mountain");
  cut = setAssignment(cut, "BQ", "valley");
  cut = setPattern(cut, 5);
  const status = sixCreaseStatus(cut);
  assert.equal(status.assignedCount, 2);
  assert.equal(status.autoCompletionAvailable, false);
  assert.equal(status.state, "pattern needs definition");
  const ghosts = ghostSuggestions(cut);
  assert.equal(ghosts.suggested, null);
  assert.match(ghosts.reason, /not yet defined/i);
});

test("fully manual assignment with no pattern reports plain manual state", () => {
  let cut = makeCut();
  for (const role of ["AP", "AQ", "BP", "BQ", "CP", "CQ"]) {
    cut = setAssignment(cut, role, "flat");
  }
  const status = sixCreaseStatus(cut);
  assert.equal(status.assignedCount, 6);
  assert.equal(status.state, "fully assigned (manual)");
});
