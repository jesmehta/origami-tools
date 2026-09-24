// Plain 2D vector/geometry helpers. All coordinates are in millimetres,
// y increasing downward (SVG convention). No dependencies.

export function vec(x, y) {
  return { x, y };
}

export function add(a, b) {
  return { x: a.x + b.x, y: a.y + b.y };
}

export function sub(a, b) {
  return { x: a.x - b.x, y: a.y - b.y };
}

export function scale(a, s) {
  return { x: a.x * s, y: a.y * s };
}

export function dot(a, b) {
  return a.x * b.x + a.y * b.y;
}

export function length(a) {
  return Math.hypot(a.x, a.y);
}

export function distance(a, b) {
  return length(sub(b, a));
}

export function normalize(a) {
  const len = length(a);
  if (len < 1e-12) return { x: 0, y: 0 };
  return { x: a.x / len, y: a.y / len };
}

// 90 degree counter-clockwise rotation (in the y-down plane this appears
// clockwise on screen; it is only ever used as "the other axis").
export function perp(a) {
  return { x: -a.y, y: a.x };
}

export function lerp(a, b, t) {
  return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
}

export function midpoint(a, b) {
  return lerp(a, b, 0.5);
}

export function angleOf(a) {
  return Math.atan2(a.y, a.x);
}

export function rotate(a, radians) {
  const c = Math.cos(radians);
  const s = Math.sin(radians);
  return { x: a.x * c - a.y * s, y: a.x * s + a.y * c };
}

export function fromAngle(radians) {
  return { x: Math.cos(radians), y: Math.sin(radians) };
}

// Closest point on segment [p0,p1] to point p, plus the parametric t in [0,1].
export function closestPointOnSegment(p, p0, p1) {
  const d = sub(p1, p0);
  const len2 = dot(d, d);
  if (len2 < 1e-12) return { point: { ...p0 }, t: 0 };
  let t = dot(sub(p, p0), d) / len2;
  t = Math.max(0, Math.min(1, t));
  return { point: add(p0, scale(d, t)), t };
}

export function isFinitePoint(p) {
  return p && Number.isFinite(p.x) && Number.isFinite(p.y);
}

export const EPS = 1e-6;

export function approxEqual(a, b, eps = EPS) {
  return Math.abs(a - b) <= eps;
}
