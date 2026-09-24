// Snapshot-based undo/redo. The document is small (a handful of
// parametric units, not thousands of strokes), so whole-document
// snapshots are simpler and more reliably correct than a command/delta
// stack, at the cost of memory that's irrelevant at this scale.
import { cloneDocument } from "./model.js";

const DEFAULT_LIMIT = 200;

export function createHistory(initialDoc, limit = DEFAULT_LIMIT) {
  return {
    past: [],
    present: cloneDocument(initialDoc),
    future: [],
    limit,
  };
}

// Call after every committed edit. Does NOT push if the document is
// structurally identical to the current present (avoids no-op history
// entries from e.g. clicking without dragging).
export function pushHistory(history, nextDoc) {
  const nextSerialized = JSON.stringify(nextDoc);
  if (nextSerialized === JSON.stringify(history.present)) return history;
  const past = [...history.past, history.present];
  while (past.length > history.limit) past.shift();
  return { past, present: JSON.parse(nextSerialized), future: [], limit: history.limit };
}

export function undo(history) {
  if (history.past.length === 0) return history;
  const previous = history.past[history.past.length - 1];
  const past = history.past.slice(0, -1);
  const future = [history.present, ...history.future];
  return { past, present: previous, future, limit: history.limit };
}

export function redo(history) {
  if (history.future.length === 0) return history;
  const next = history.future[0];
  const future = history.future.slice(1);
  const past = [...history.past, history.present];
  return { past, present: next, future, limit: history.limit };
}

export function canUndo(history) {
  return history.past.length > 0;
}

export function canRedo(history) {
  return history.future.length > 0;
}
