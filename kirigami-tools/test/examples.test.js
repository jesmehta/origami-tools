import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { findUnit } from "../src/model.js";
import { isPairedCutValid, nestingValidity } from "../src/constraints.js";
import { loadDocument, saveDocument, exportSVG, verifyExportedSVG } from "../src/export.js";

const here = dirname(fileURLToPath(import.meta.url));
const load = (name) => loadDocument(readFileSync(join(here, "..", "examples", name), "utf8"));

test("basic-paired-cut-popout.json loads, is valid, and exports cleanly", () => {
  const doc = load("basic-paired-cut-popout.json");
  assert.equal(doc.units.length, 1);
  assert.ok(isPairedCutValid(doc.units[0]));
  const svg = exportSVG(doc, { includeCuts: true, includeMountain: true, includeValley: true });
  assert.equal(verifyExportedSVG(svg, doc).ok, true);
});

test("nested-construction.json: child is valid and fully contained in the parent's surface", () => {
  const doc = load("nested-construction.json");
  const child = doc.units.find((u) => u.parentId);
  const parent = findUnit(doc, child.parentId);
  assert.ok(child && parent);
  assert.ok(isPairedCutValid(child));
  const result = nestingValidity(child, parent);
  assert.equal(result.valid, true, JSON.stringify(result.flags));
});

test("array-example.json: instances share the source's shape parameters and step evenly", () => {
  const doc = load("array-example.json");
  const source = doc.units.find((u) => !u.arrayOf);
  const linked = doc.units.filter((u) => u.arrayOf);
  assert.equal(linked.length, 3);
  linked.forEach((u, k) => {
    assert.equal(u.cutLength, source.cutLength);
    assert.equal(u.creaseOffset, source.creaseOffset);
    assert.ok(Math.abs(u.origin.x - (source.origin.x + (k + 1) * 60)) < 1e-9);
  });
});

test("every example document round-trips through save/load byte-for-byte (as data)", () => {
  for (const name of ["basic-paired-cut-popout.json", "nested-construction.json", "array-example.json"]) {
    const doc = load(name);
    const reloaded = loadDocument(saveDocument(doc));
    assert.deepEqual(reloaded, doc);
  }
});
