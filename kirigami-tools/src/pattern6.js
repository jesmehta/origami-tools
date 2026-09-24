// Principle 2: six candidate creases around a cut A-B-C, and the eight-
// pattern selector.
//
// MATHEMATICAL SPECIFICATION GATE (see kirigami_design_tool_codex_prompt.md):
// the source principle names eight flat-fold configurations (1-3 / 2-2
// distribution x P/Q orientation x M/V inversion) but does not enumerate
// which of the 3^6 mountain/valley/flat assignments across {AP,AQ,BP,BQ,
// CP,CQ} actually produces each one, nor prove any of them flat-foldable.
// SIX_CREASE_RULE_TABLE is therefore intentionally left unpopulated below.
// Do not fill it in by guessing. See TODO.md.
import { makeId, cloneUnit } from "./model.js";
import { sub, dot, length } from "./geom.js";

export const CREASE_ROLES = ["AP", "AQ", "BP", "BQ", "CP", "CQ"];
export const FOLD_TYPES = ["flat", "mountain", "valley"];

// Structural metadata for the eight configurations (distribution x
// orientation x inversion = 2x2x2). This is *shape* bookkeeping only --
// it does not imply the M/V assignment is known.
export const SIX_CREASE_PATTERNS = [
  { id: 1, distribution: "1-3", orientation: "P", inverted: false },
  { id: 2, distribution: "1-3", orientation: "P", inverted: true },
  { id: 3, distribution: "1-3", orientation: "Q", inverted: false },
  { id: 4, distribution: "1-3", orientation: "Q", inverted: true },
  { id: 5, distribution: "2-2", orientation: "P", inverted: false },
  { id: 6, distribution: "2-2", orientation: "P", inverted: true },
  { id: 7, distribution: "2-2", orientation: "Q", inverted: false },
  { id: 8, distribution: "2-2", orientation: "Q", inverted: true },
].map((p) => ({
  ...p,
  label: `${p.distribution} split, ${p.orientation}-side primary${p.inverted ? " (inverted)" : ""}`,
}));

// Rule table: pattern id -> { AP: 'mountain'|'valley'|'flat', ... }.
// INTENTIONALLY NULL. Populate only from a verified derivation, not a guess.
export const SIX_CREASE_RULE_TABLE = null;

export function createSixCreaseCut(doc, { A, B, C, parentId = null } = {}) {
  return {
    id: makeId(doc, "s"),
    type: "sixCreaseCut",
    parentId,
    A: { ...A },
    B: { ...B },
    C: { ...C },
    patternId: null,
    assignments: Object.fromEntries(CREASE_ROLES.map((r) => [r, null])),
    creaseRefs: Object.fromEntries(CREASE_ROLES.map((r) => [r, null])),
  };
}

// Which side (P or Q) a point falls on, relative to the cut polyline A-B-C.
// Convention (ours, not given by the source principle): P is the left-hand
// side when walking A -> B -> C, Q is the right-hand side, decided by the
// segment nearest to the point.
export function sideOfPoint(cut, p) {
  const segs = [
    [cut.A, cut.B],
    [cut.B, cut.C],
  ];
  let best = null;
  for (const [p0, p1] of segs) {
    const seg = sub(p1, p0);
    const segLen = length(seg);
    if (segLen < 1e-9) continue;
    const toP = sub(p, p0);
    const t = Math.max(0, Math.min(1, dot(toP, seg) / (segLen * segLen)));
    const proj = { x: p0.x + seg.x * t, y: p0.y + seg.y * t };
    const dist = length(sub(p, proj));
    const cross = seg.x * toP.y - seg.y * toP.x;
    if (!best || dist < best.dist) best = { dist, cross };
  }
  if (!best) return null;
  return best.cross >= 0 ? "P" : "Q";
}

// Which vertex (A, B or C) a point is closest to.
export function nearestVertex(cut, p) {
  const options = [
    ["A", cut.A],
    ["B", cut.B],
    ["C", cut.C],
  ];
  let best = options[0];
  let bestDist = length(sub(p, options[0][1]));
  for (const opt of options.slice(1)) {
    const d = length(sub(p, opt[1]));
    if (d < bestDist) {
      bestDist = d;
      best = opt;
    }
  }
  return { vertex: best[0], distance: bestDist };
}

// Classifies a user-drawn line (p0 -> p1) as fulfilling one of the six
// roles: nearest cut vertex to whichever endpoint is closer to the cut,
// combined with which side the far endpoint falls on. Returns null if
// neither endpoint is close enough (tolerance in mm).
export function classifyDrawnCrease(cut, p0, p1, tolerance = 3) {
  const d0 = Math.min(...["A", "B", "C"].map((k) => length(sub(p0, cut[k]))));
  const d1 = Math.min(...["A", "B", "C"].map((k) => length(sub(p1, cut[k]))));
  const [anchor, far] = d0 <= d1 ? [p0, p1] : [p1, p0];
  const { vertex, distance } = nearestVertex(cut, anchor);
  if (distance > tolerance) return null;
  const side = sideOfPoint(cut, far);
  if (!side) return null;
  return `${vertex}${side}`;
}

export function setAssignment(cut, role, foldType) {
  if (!CREASE_ROLES.includes(role)) throw new Error(`Unknown crease role: ${role}`);
  if (foldType !== null && !FOLD_TYPES.includes(foldType)) {
    throw new Error(`Unknown fold type: ${foldType}`);
  }
  const next = cloneUnit(cut);
  next.assignments[role] = foldType;
  return next;
}

export function setPattern(cut, patternId) {
  const next = cloneUnit(cut);
  next.patternId = patternId;
  return next;
}

// Honest status: never auto-completes. Reports what's been manually
// assigned and flags that ghost-suggestion is disabled pending the rule
// table (see SIX_CREASE_RULE_TABLE above).
export function sixCreaseStatus(cut) {
  const assignedRoles = CREASE_ROLES.filter((r) => cut.assignments[r] !== null);
  const pattern = cut.patternId ? SIX_CREASE_PATTERNS.find((p) => p.id === cut.patternId) : null;
  return {
    assignedCount: assignedRoles.length,
    assignedRoles,
    pattern,
    autoCompletionAvailable: false,
    state:
      cut.patternId && SIX_CREASE_RULE_TABLE === null
        ? "pattern needs definition"
        : assignedRoles.length === 6
        ? "fully assigned (manual)"
        : "partial (manual)",
  };
}

// Ghost suggestion hook. Deliberately inert until SIX_CREASE_RULE_TABLE is
// supplied and verified -- see the prompt's "Mathematical specification
// gate" and TODO.md.
export function ghostSuggestions(cut) {
  if (SIX_CREASE_RULE_TABLE === null) {
    return {
      suggested: null,
      reason: "Pattern rule table not yet defined; auto-completion is disabled. See TODO.md.",
    };
  }
  const rule = SIX_CREASE_RULE_TABLE[cut.patternId];
  return { suggested: rule ?? null, reason: rule ? null : "No rule for this pattern id." };
}
