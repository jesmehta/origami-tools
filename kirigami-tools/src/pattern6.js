// Principle 2: six candidate creases around a cut A-B-C, and inference of
// the full six-role assignment from a partial one via the verified rule
// table (see notes.md / TODO.md for provenance).
//
// The UX this implements (per the requester, 2026-09-24): there is no
// "pick a pattern first" step. The user assigns as many of the six roles
// (AP, AQ, BP, BQ, CP, CQ) as they know; matchPatterns() narrows the 8
// known patterns down to the ones still consistent with what's assigned so
// far, and once exactly one remains, its remaining roles can be accepted
// as a suggestion (acceptGhostSuggestion) -- never silently auto-applied.
import { makeId, cloneUnit } from "./model.js";
import { sub, dot, length } from "./geom.js";

export const CREASE_ROLES = ["AP", "AQ", "BP", "BQ", "CP", "CQ"];
export const FOLD_TYPES = ["flat", "mountain", "valley"];

// The eight verified six-role assignments. Provenance: supplied by the
// requester 2026-09-24, cross-checked here (before it was accepted) for
// two invariants that all eight satisfy: exactly 4 of the 6 roles are
// active (mountain/valley) and 2 are flat, and the eight rows pair up
// into four exact mountain<->valley inversions of each other:
// (1,3), (2,4), (5,6), (7,8). See notes.md for the original table.
export const SIX_CREASE_RULE_TABLE = [
  { AP: "flat", BP: "valley", CP: "flat", AQ: "valley", BQ: "mountain", CQ: "valley" },
  { AP: "mountain", BP: "valley", CP: "flat", AQ: "flat", BQ: "mountain", CQ: "valley" },
  { AP: "flat", BP: "mountain", CP: "flat", AQ: "mountain", BQ: "valley", CQ: "mountain" },
  { AP: "valley", BP: "mountain", CP: "flat", AQ: "flat", BQ: "valley", CQ: "mountain" },
  { AP: "valley", BP: "mountain", CP: "valley", AQ: "flat", BQ: "valley", CQ: "flat" },
  { AP: "mountain", BP: "valley", CP: "mountain", AQ: "flat", BQ: "mountain", CQ: "flat" },
  { AP: "flat", BP: "valley", CP: "mountain", AQ: "valley", BQ: "mountain", CQ: "flat" },
  { AP: "flat", BP: "mountain", CP: "valley", AQ: "mountain", BQ: "valley", CQ: "flat" },
];

export function createSixCreaseCut(doc, { A, B, C, parentId = null } = {}) {
  return {
    id: makeId(doc, "s"),
    type: "sixCreaseCut",
    parentId,
    A: { ...A },
    B: { ...B },
    C: { ...C },
    assignments: Object.fromEntries(CREASE_ROLES.map((r) => [r, null])),
    creaseRefs: Object.fromEntries(CREASE_ROLES.map((r) => [r, null])),
  };
}

// Which side (P or Q) a point falls on, relative to the cut polyline A-B-C.
// Convention (confirmed with the requester): P is the left-hand side when
// walking A -> B -> C, Q is the right-hand side, decided by the segment
// nearest to the point.
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

// Which of the 8 known patterns are still consistent with the roles
// assigned so far (null = unconstrained). Returns [{index, row}], index
// 0-based into SIX_CREASE_RULE_TABLE.
export function matchPatterns(cut) {
  return SIX_CREASE_RULE_TABLE.map((row, index) => ({ index, row })).filter(({ row }) =>
    CREASE_ROLES.every((role) => {
      const assigned = cut.assignments[role];
      return assigned === null || assigned === row[role];
    })
  );
}

// Honest status: reports how many of the 8 known patterns remain
// consistent with what's been assigned, not a pre-selected pattern.
export function sixCreaseStatus(cut) {
  const assignedRoles = CREASE_ROLES.filter((r) => cut.assignments[r] !== null);
  const matches = matchPatterns(cut);
  let state;
  if (matches.length === 0) {
    state = "conflict: no known pattern matches the assigned creases";
  } else if (assignedRoles.length === 0) {
    state = `unconstrained (${matches.length} patterns possible)`;
  } else if (matches.length === 1 && assignedRoles.length < CREASE_ROLES.length) {
    state = "unique match — remaining creases can be filled in";
  } else if (matches.length === 1) {
    state = "fully assigned, matches a known pattern";
  } else {
    state = `ambiguous: ${matches.length} patterns still consistent`;
  }
  return {
    assignedCount: assignedRoles.length,
    assignedRoles,
    matchCount: matches.length,
    matchIndices: matches.map((m) => m.index),
    autoCompletionAvailable: matches.length === 1 && assignedRoles.length < CREASE_ROLES.length,
    state,
  };
}

// Suggests the remaining roles when assignments narrow the rule table down
// to exactly one consistent pattern. Never applied automatically -- see
// acceptGhostSuggestion, which the caller must invoke explicitly.
export function ghostSuggestions(cut) {
  const matches = matchPatterns(cut);
  if (matches.length === 0) {
    return { suggested: null, matches, reason: "No known pattern is consistent with the assigned creases (conflict)." };
  }
  if (matches.length > 1) {
    return { suggested: null, matches, reason: `${matches.length} patterns still consistent — assign another crease to narrow it down.` };
  }
  return { suggested: matches[0].row, matches, reason: null };
}

// Fills every unassigned role from the uniquely-matched pattern. Rejects
// if the match isn't unique yet (ambiguous or conflicting), so it never
// silently guesses.
export function acceptGhostSuggestion(cut) {
  const { suggested, reason } = ghostSuggestions(cut);
  if (!suggested) return { ok: false, reason: reason || "No unique pattern to accept." };
  let next = cut;
  for (const role of CREASE_ROLES) {
    if (next.assignments[role] === null) next = setAssignment(next, role, suggested[role]);
  }
  return { ok: true, cut: next };
}
