import test from "node:test";
import assert from "node:assert/strict";
import { createDocument, createPairedCutUnit } from "../src/model.js";
import { createHistory, pushHistory, undo, redo, canUndo, canRedo } from "../src/history.js";

test("undo/redo round trip through several edits", () => {
  const doc = createDocument();
  let history = createHistory(doc);
  assert.equal(canUndo(history), false);

  const doc1 = JSON.parse(JSON.stringify(history.present));
  const unit = createPairedCutUnit(doc1);
  doc1.units.push(unit);
  history = pushHistory(history, doc1);
  assert.equal(history.present.units.length, 1);

  const doc2 = JSON.parse(JSON.stringify(history.present));
  doc2.units[0].creaseOffset = 5;
  history = pushHistory(history, doc2);
  assert.equal(history.present.units[0].creaseOffset, 5);

  history = undo(history);
  assert.equal(history.present.units[0].creaseOffset, 0);
  assert.equal(canRedo(history), true);

  history = undo(history);
  assert.equal(history.present.units.length, 0);
  assert.equal(canUndo(history), false);

  history = redo(history);
  history = redo(history);
  assert.equal(history.present.units[0].creaseOffset, 5);
  assert.equal(canRedo(history), false);
});

test("pushHistory is a no-op for an identical document", () => {
  const doc = createDocument();
  let history = createHistory(doc);
  const same = JSON.parse(JSON.stringify(history.present));
  history = pushHistory(history, same);
  assert.equal(history.past.length, 0);
});

test("a new edit after undo discards the stale future", () => {
  const doc = createDocument();
  let history = createHistory(doc);
  let d1 = JSON.parse(JSON.stringify(history.present));
  d1.sheet.width = 100;
  history = pushHistory(history, d1);
  let d2 = JSON.parse(JSON.stringify(history.present));
  d2.sheet.width = 200;
  history = pushHistory(history, d2);

  history = undo(history);
  assert.equal(history.present.sheet.width, 100);

  let d3 = JSON.parse(JSON.stringify(history.present));
  d3.sheet.width = 150;
  history = pushHistory(history, d3);
  assert.equal(canRedo(history), false);
  assert.equal(history.present.sheet.width, 150);
});
