# The math

Units are mm; screen y points **down**, so angles measured with `atan2(y, x)`
run **clockwise** on screen. `DEG = π/180`.

## 1. Mirror pleats — reflection across verticals

A **vertical** is a mirror line. A **line** joins two neighbouring verticals;
its **trail** is built by repeatedly reflecting across the next vertical:

```text
given the current segment A→B, with B on vertical V_i:
  A' = reflect(A, V_i)                 // mirror the previous point
  d  = A' − B                          // direction of the next segment
  C  = intersection of ray B + s·d (s > 0) with the infinite line of V_{i±1}
  emit segment B→C; continue with A=B, B=C
```

This is the "mirror, not billiard" rule: segment k+1 is the mirror image of
segment k across their shared vertical, so each vertical sees a V (a pleat).

Reflection of p across the line through point O with unit direction u:

```text
k  = (p − O)·u          foot = O + k·u          p' = 2·foot − p
```

Line mode stores a vertical as `{xt, xb}` (its x at y=0 and y=H), so
O = (xt, 0), direction (xb−xt, H). Ray intersection (`rayVert`) solves
`o + s·d = O + t·u` by 2-D cross products:
`s = ((O−o) × u) / (d × u)`, `t = ((o + s·d − O)·u)` for unit u.

Trails are computed against **infinite** mirrors and only then cropped to
the margin rectangle (Liang–Barsky, §4), so a trail may leave and re-enter.
In line mode the first and last verticals also mirror once outward.

**Params.** A line end is a parameter along its vertical: `t ∈ [0,1]` as a
fraction of H (line mode), or **distance from the centre in mm** (ray mode).
`vp(v, t)` turns a param into a point; `projT(p, v)` projects back and
clamps to the visible part.

### Radial, lines through the centre

For centre C = (cx, cy) above/below the sheet, a vertical through C with
slope `k = dx/dy` is `{xt: cx + k(0 − cy), xb: cx + k(H − cy)}`. Order is kept
by the angle `u = ±atan(k)`; neighbours stay at least 0.2° apart; |angle| ≤ 89°.
That representation cannot hold a horizontal line — the reason for rays.

## 2. Rays and flat-foldability (Kawasaki)

When `0 ≤ cy ≤ H` the verticals are **rays** `{a}` from C, direction
`u = (cos a, sin a)`, kept in cyclic order; `nx(k) = (k+1) mod n`, so the
last ray neighbours the first. **Wedge** j is the angle from ray j to ray
nx(j): `w_j = (a_{j+1} − a_j) mod 360` (a lone wedge = 360).

The trail is the same reflection rule, with the hit required to lie on the
ray (`t ≥ 0`, not behind the centre), and run for **exactly one lap**:
starting in wedge k, n−1 reflections visit every other wedge and land back
on ray k.

**Why it may not close.** Two reflections across lines through C at angles
α then β compose to a rotation about C by 2(β−α). Going once round, the
trail is carried through all n mirrors. For even n, pair them up —
(ray 0, ray 1), (ray 2, ray 3), … — and the lap is a rotation by
`2(w_0 + w_2 + … + w_{n−2})`. That is the identity (every trail returns to
its start, for any line) iff the even wedges sum to 180° — and since all
wedges sum to 360°, so do the odd ones:

```text
n even   and   w_0 + w_2 + … = w_1 + w_3 + … = 180°
```

This is **Kawasaki's theorem** for a flat-foldable vertex. For odd n the lap
is a rotation followed by one more reflection — a reflection, never the
identity — so a trail can't close (except by coincidence of one line). The tool shows both alternate sums and
flags per-trail mismatch (end point ≠ start point by > 1e-3 mm).

**Keep flat-foldable.** Turning ray i by δ changes `w_{i−1} += δ`,
`w_i −= δ` — opposite parities, so the alternate sums change by ±δ. Turning
ray i+2 by −δ changes `w_{i+1} −= δ`, `w_{i+2} += δ`, which cancels it
exactly (i−1 and i+1 share a parity, as do i and i+2). The drag is clamped
so all four wedges stay ≥ 0.2°. With 2 rays both turn together.
Switching it on corrects an existing layout: turning every odd ray by
`δ = (S_odd − 180)/(n/2)` moves δ from each odd wedge to the even one before
it, so the odd sum drops by exactly `S_odd − 180`.

**Evenly spread rays** (Step = 360/n, n even) satisfy it automatically;
a fan of n rays with step s satisfies it only when s = 360/n (the odd sum is
`360 − (n/2)·s`).

## 3. x-span, hypar, vPleat (summaries)

- **x-span** — a lattice of rhombi whose vertices all lie on vertical lines.
  Half-height `h = spacing × tan θ` (or `H / (2·chains)`); touch levels
  `t_{j+1} = t_j + 2·h_j`, crossings at `t_j + h_j`, alternating by vertical.
  Free verticals keep vertices on verticals, so lines bend ("refract").
  Full derivation: [x-span README § The lattice](../x-span/README.md#the-lattice).
- **hypar** — contours = the convex polygon clipped (Sutherland–Hodgman) by
  every edge half-plane pushed inward k·d, until no area remains; diagonals =
  corner bisectors, solid to the first other bisector crossed, ghost to the
  last. [hypar README § How it works](../hypar/README.md#how-it-works).
- **vPleat** — Catmull-Rom curve → straight segments (breakpoints fitted by
  minimising perpendicular error) → offset strip with mitred corners →
  straightened: each bend of turn φ becomes a fold line offset
  `δ = (w/2)·tan(φ/2)`, fold angle `2·atan(δ / (w/2))`; mirrored into V/Λ
  units and arrayed. [vPleat README](../vPleat-visualiser/README.md#straightening-math-tab-3).

## 4. Clipping

- **Segments** (Liang–Barsky): for `P + t(Q−P)`, each box side gives
  `p_i·t ≤ q_i`; tighten `[t0, t1]` from 0..1; empty ⇒ outside. Used for
  cropping to the margin, to the view (ghosts, off-canvas handles), and for
  vertical/ray visibility.
- **Polygons** (hypar): kept as one `<polygon>` while all corners are inside
  the margin; otherwise each edge is clipped as a segment.
- **Off-canvas handles**: clip the line's base segment to the view inset by
  8 px; an end outside is drawn at the clipped end; if none of the line is
  visible, the end is clamped into the view box.

## 5. Snapping

All snapping is "nearest candidate within a tolerance" (≈10 screen px,
converted to mm). Candidate distance is multiplied by a weight so that some
kinds win ties:

| Candidate | Weight |
|---|---|
| existing points (corners, sheet centre, vertical ends, trail vertices — minus the dragged line's own) | 0.5 |
| rays at every snap angle from an anchor (e.g. the line's other end) | 1 |
| square-grid crossings / polar ring × spoke points | 1 |
| a single grid line (x only, y only, ring only, spoke only) | 2.5 |

Snap angles `OT.SNAP_DEG` = multiples of 15° ∪ multiples of 22.5° =
0, 15, 22.5, 30, 45, 60, 67.5, 75, 90, … (the polar grid default of 7.5°
spokes contains all of them).

- **Constrained** (`snapOnLine`: a point that must stay on `A + s·d`, e.g. a
  line end on its vertical): candidates become parameters s — projection of
  nearby points; `s` where each anchor ray crosses the line
  (`s = ((F−A) × u)/(d × u)`); crossings with grid lines; with rings
  (`|A + s·d − O| = r`, a quadratic); with spokes. The result is clamped to the
  visible part afterwards.
- **Free** (`snap2D`, hypar corners / centres): points; the projection onto
  each anchor ray; grid crossing; single grid lines.
- **Direction** (`snapDir`, rays / radial lines / x-span θ): the pointer's
  angle about a centre is snapped when the perpendicular distance at the
  pointer, `r·|sin Δ|`, is within tolerance — so it gets stricter near the
  centre and looser far out, which matches what the eye sees.

Worked failure worth remembering: a test aimed at a 31° corner at radius
70 mm from (135,135) landed 0.002 mm from the grid line x = 195, so the grid
line correctly won. Not a bug — but it's why grid lines got the heavier weight.
