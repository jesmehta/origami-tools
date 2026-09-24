// Regenerates the example documents in this folder from the model/
// constraints modules, so they stay valid as the schema evolves. Run with:
//   node examples/generate-examples.mjs
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { createDocument, createPairedCutUnit } from "../src/model.js";
import { arrayInstances } from "../src/constraints.js";
import { saveDocument } from "../src/export.js";

const here = dirname(fileURLToPath(import.meta.url));
const write = (name, doc) => writeFileSync(join(here, name), saveDocument(doc) + "\n");

// 1. Basic paired-cut pop-out, centred on an A4 sheet.
{
  const doc = createDocument({ width: 210, height: 297 });
  const unit = createPairedCutUnit(doc, {
    origin: { x: 105, y: 148.5 },
    rotation: 0,
    cutLength: 60,
    spacing: 30,
    creaseOffset: 12,
    flapLength: 25,
    mountainValley: "mountain",
  });
  doc.units.push(unit);
  write("basic-paired-cut-popout.json", doc);
}

// 2. A child paired-cut unit nested inside a parent's inner (popped) strip.
{
  const doc = createDocument({ width: 210, height: 297 });
  const parent = createPairedCutUnit(doc, {
    origin: { x: 105, y: 148.5 },
    rotation: 0,
    cutLength: 100,
    spacing: 50,
    creaseOffset: 0,
    flapLength: 30,
  });
  doc.units.push(parent);
  const child = createPairedCutUnit(doc, {
    origin: { x: 105, y: 148.5 },
    rotation: Math.PI / 2, // rotated so its cuts run across the parent's strip
    cutLength: 30,
    spacing: 15,
    creaseOffset: -5,
    flapLength: 10,
    mountainValley: "valley",
    parentId: parent.id,
  });
  doc.units.push(child);
  write("nested-construction.json", doc);
}

// 3. A source unit plus three linked array instances.
{
  const doc = createDocument({ width: 297, height: 210 });
  const source = createPairedCutUnit(doc, {
    origin: { x: 60, y: 105 },
    rotation: 0,
    cutLength: 40,
    spacing: 20,
    creaseOffset: 6,
    flapLength: 15,
  });
  doc.units.push(source);
  const instances = arrayInstances(source, { x: 1, y: 0 }, 60, 4);
  instances.slice(1).forEach((inst, k) => {
    const created = createPairedCutUnit(doc, inst);
    created.arrayOf = { sourceId: source.id, index: k + 1 };
    doc.units.push(created);
  });
  write("array-example.json", doc);
}

console.log("Wrote basic-paired-cut-popout.json, nested-construction.json, array-example.json");
