import test from "node:test";
import assert from "node:assert/strict";
import { createDocument, createPairedCutUnit } from "../src/model.js";
import { createSixCreaseCut, setAssignment } from "../src/pattern6.js";
import { exportSVG, verifyExportedSVG, saveDocument, loadDocument, collectLines } from "../src/export.js";

function docWithOneUnit() {
  const doc = createDocument({ width: 210, height: 297 });
  const unit = createPairedCutUnit(doc, { origin: { x: 100, y: 100 }, cutLength: 40, spacing: 20, creaseOffset: 5 });
  doc.units.push(unit);
  return doc;
}

test("exported SVG carries true mm physical scale matching the sheet", () => {
  const doc = docWithOneUnit();
  const svg = exportSVG(doc, { includeCuts: true, includeMountain: true, includeValley: true });
  assert.match(svg, /width="210mm"/);
  assert.match(svg, /height="297mm"/);
  assert.match(svg, /viewBox="0 0 210 297"/);
});

test("export/reimport self-check passes for a well-formed export", () => {
  const doc = docWithOneUnit();
  const svg = exportSVG(doc, { includeCuts: true, includeMountain: true, includeValley: true });
  const result = verifyExportedSVG(svg, doc);
  assert.equal(result.ok, true, JSON.stringify(result.problems));
});

test("named groups CUT / MOUNTAIN_FOLD / VALLEY_FOLD / REFERENCE are separate", () => {
  const doc = docWithOneUnit();
  const svg = exportSVG(doc, {
    includeCuts: true,
    includeMountain: true,
    includeValley: true,
    includeReference: true,
  });
  for (const id of ["CUT", "MOUNTAIN_FOLD", "VALLEY_FOLD", "REFERENCE"]) {
    assert.match(svg, new RegExp(`<g id="${id}">`));
  }
});

test("reference lines are excluded by default (opt-in checkbox)", () => {
  const doc = docWithOneUnit();
  const svg = exportSVG(doc);
  assert.doesNotMatch(svg, /id="REFERENCE"/);
});

test("a paired-cut unit contributes 2 cut lines and 3 fold lines (inner + 2 outer counterparts)", () => {
  const doc = docWithOneUnit();
  const { cuts, mountains, valleys } = collectLines(doc);
  assert.equal(cuts.length, 2);
  assert.equal(mountains.length + valleys.length, 3);
});

test("six-crease cut only exports roles that are assigned, non-flat, and have geometry", () => {
  const doc = createDocument();
  let cut = createSixCreaseCut(doc, { A: { x: 0, y: 0 }, B: { x: 20, y: 0 }, C: { x: 40, y: 0 } });
  cut = setAssignment(cut, "AP", "mountain");
  cut.creaseRefs.AP = { p0: { x: 0, y: 0 }, p1: { x: 0, y: -10 } };
  cut = setAssignment(cut, "AQ", "valley"); // no creaseRef -> excluded
  cut = setAssignment(cut, "BP", "flat"); // flat -> excluded
  doc.units.push(cut);
  const { cuts, mountains, valleys } = collectLines(doc);
  assert.equal(cuts.length, 2); // A-B and B-C
  assert.equal(mountains.length, 1);
  assert.equal(valleys.length, 0);
});

test("save/load document round trip preserves sheet, geometry, locks, arrays, hierarchy and topology3D placeholder", () => {
  const doc = docWithOneUnit();
  doc.units[0].locks.crease = true;
  doc.units[0].arrayOf = { sourceId: "u1", index: 2 };
  const parent = createPairedCutUnit(doc, { cutLength: 60, spacing: 30 });
  doc.units.push(parent);
  doc.units[0].parentId = parent.id;

  const text = saveDocument(doc);
  const loaded = loadDocument(text);
  assert.deepEqual(loaded, JSON.parse(JSON.stringify(doc)));
  assert.equal(loaded.topology3D, null);
});

test("loadDocument rejects malformed or wrong-version input with a clear reason", () => {
  assert.throws(() => loadDocument("{not json"), /valid JSON/);
  assert.throws(() => loadDocument(JSON.stringify({ version: 999, sheet: { width: 1, height: 1 }, units: [] })), /version/);
  assert.throws(() => loadDocument(JSON.stringify({ version: 1, sheet: {}, units: [] })), /sheet dimensions/);
});
