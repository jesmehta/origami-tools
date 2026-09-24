import test from "node:test";
import assert from "node:assert/strict";
import { createDocument } from "../src/model.js";
import {
  createSixCreaseCut,
  sideOfPoint,
  classifyDrawnCrease,
  setAssignment,
  matchPatterns,
  sixCreaseStatus,
  ghostSuggestions,
  acceptGhostSuggestion,
  SIX_CREASE_RULE_TABLE,
  CREASE_ROLES,
} from "../src/pattern6.js";

function makeCut() {
  const doc = createDocument();
  return createSixCreaseCut(doc, { A: { x: 0, y: 0 }, B: { x: 20, y: 0 }, C: { x: 40, y: 0 } });
}

// Canonical key order for comparison -- object literals in the rule table
// and values built by CREASE_ROLES.map() don't necessarily share the same
// insertion order, which would make JSON.stringify comparisons unreliable.
const canonical = (row) => CREASE_ROLES.map((r) => row[r]).join(",");

test("the rule table has 8 distinct rows, each with exactly 4 active + 2 flat roles", () => {
  assert.equal(SIX_CREASE_RULE_TABLE.length, 8);
  const seen = new Set(SIX_CREASE_RULE_TABLE.map(canonical));
  assert.equal(seen.size, 8, "rows must be pairwise distinct");
  for (const row of SIX_CREASE_RULE_TABLE) {
    const values = CREASE_ROLES.map((r) => row[r]);
    const flats = values.filter((v) => v === "flat").length;
    const actives = values.filter((v) => v !== "flat").length;
    assert.equal(flats, 2);
    assert.equal(actives, 4);
  }
});

test("the 8 rows form 4 exact mountain<->valley inverted pairs", () => {
  const invert = (row) =>
    Object.fromEntries(CREASE_ROLES.map((r) => [r, row[r] === "mountain" ? "valley" : row[r] === "valley" ? "mountain" : "flat"]));
  const remaining = [...SIX_CREASE_RULE_TABLE];
  let pairs = 0;
  while (remaining.length) {
    const row = remaining.shift();
    const invertedKey = canonical(invert(row));
    const idx = remaining.findIndex((r) => canonical(r) === invertedKey);
    assert.ok(idx !== -1, `no inverted partner found for ${canonical(row)}`);
    remaining.splice(idx, 1);
    pairs += 1;
  }
  assert.equal(pairs, 4);
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

test("with nothing assigned, all 8 patterns are possible", () => {
  const cut = makeCut();
  const status = sixCreaseStatus(cut);
  assert.equal(status.matchCount, 8);
  assert.equal(status.autoCompletionAvailable, false);
  assert.match(status.state, /unconstrained/);
});

test("assigning one role narrows but does not always uniquely determine the pattern", () => {
  let cut = makeCut();
  cut = setAssignment(cut, "AP", "flat");
  const matches = matchPatterns(cut);
  // rows 1,3,7,8 all have AP: flat
  assert.equal(matches.length, 4);
});

test("two well-chosen assignments uniquely determine a pattern and ghost-suggest the rest", () => {
  let cut = makeCut();
  // row 1 is the only row with AP:flat AND BP:valley AND CP:flat (rows 1,7 have AP flat+BP valley; CP disambiguates)
  cut = setAssignment(cut, "AP", "flat");
  cut = setAssignment(cut, "BP", "valley");
  cut = setAssignment(cut, "CP", "flat");
  const status = sixCreaseStatus(cut);
  assert.equal(status.matchCount, 1);
  assert.equal(status.autoCompletionAvailable, true);
  const ghosts = ghostSuggestions(cut);
  assert.deepEqual(ghosts.suggested, SIX_CREASE_RULE_TABLE[0]);
});

test("acceptGhostSuggestion fills remaining roles only once the match is unique", () => {
  let cut = makeCut();
  cut = setAssignment(cut, "AP", "flat");
  cut = setAssignment(cut, "BP", "valley");
  cut = setAssignment(cut, "CP", "flat");
  const result = acceptGhostSuggestion(cut);
  assert.equal(result.ok, true);
  assert.equal(result.cut.assignments.AQ, "valley");
  assert.equal(result.cut.assignments.BQ, "mountain");
  assert.equal(result.cut.assignments.CQ, "valley");
});

test("acceptGhostSuggestion refuses while ambiguous", () => {
  let cut = makeCut();
  cut = setAssignment(cut, "AP", "flat"); // 4 rows still match
  const result = acceptGhostSuggestion(cut);
  assert.equal(result.ok, false);
  assert.match(result.reason, /still consistent/);
});

test("a contradictory assignment is reported as a conflict, not silently accepted", () => {
  let cut = makeCut();
  // No row has AP:mountain AND AQ:mountain simultaneously (every row's AP/AQ pair differs)
  cut = setAssignment(cut, "AP", "mountain");
  cut = setAssignment(cut, "AQ", "mountain");
  const status = sixCreaseStatus(cut);
  assert.equal(status.matchCount, 0);
  assert.match(status.state, /^conflict/);
  const result = acceptGhostSuggestion(cut);
  assert.equal(result.ok, false);
});

test("a fully manual assignment matching a known row is recognized, not just partial ones", () => {
  let cut = makeCut();
  const row = SIX_CREASE_RULE_TABLE[4];
  for (const role of CREASE_ROLES) cut = setAssignment(cut, role, row[role]);
  const status = sixCreaseStatus(cut);
  assert.equal(status.matchCount, 1);
  assert.equal(status.assignedCount, 6);
  assert.match(status.state, /fully assigned/);
});
