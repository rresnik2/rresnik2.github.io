// Reading the cursor's recent path (Input.samples) for the games Richie
// plays: teasing him like a toy on a string, breaking away once he's
// crouched, stroking his back, jiggling and whipping past him. Plain functions of the samples, so
// they don't care how often the engine happens to tick.

export type Sample = { x: number; y: number; t: number }; // document px, ms
type Point = { x: number; y: number };
type Box = { left: number; top: number; right: number; bottom: number };

const distance = (a: Point, b: Point) => Math.hypot(b.x - a.x, b.y - a.y);

// Teasing: playing around near him like a toy on a string. Any wandering,
// lively path counts (circles, zigzags, wiggles); one just passing by doesn't.
export const TEASE = {
  window: 1200, // ms of path looked at
  reach: 240, // px from his chest
  minPath: 240, // px of path near him within the window
  meander: 2, // path at least this many times its start-to-end distance
  speed: [150, 3000], // px/s along the path
  minSpan: 500, // ms
  maxAge: 250, // ms since the newest sample (still moving)
};

// Breaking away from where it's been playing: fast, outward, and further out
// than it has been
export const BREAK = { speed: 350, clear: 25, minDistance: 60, before: 150, window: 1300 };

// Zipping past right in front of him
export const ZIP = { speed: 900, within: 110, window: 100 };

// Strokes: a smooth pass over his back
export const STROKE = { gap: 250, reverse: 6, minLength: 14, zoneShare: 0.4, duration: [60, 1500], speed: [40, 1200] };

// Jiggling: quick side to side, not round and round
export const JIGGLE = { window: 700, reversals: 3, leg: 5, maxSpread: 160, flatness: 0.6 };

// Whipping past him: a fling straight through him
export const WHIP = { window: 80, speed: 2000 };

const recent = (samples: Sample[], from: number) => samples.filter((p) => p.t > from);

// The cursor's velocity over the last span ms, px/s; null when it isn't
// moving right now
export function velocity(samples: Sample[], now: number, span = 90): Point | null {
  const last = samples.at(-1);
  if (!last || Math.max(now, last.t) - last.t > 80) return null;
  const window = samples.filter((p) => p.t >= last.t - span);
  const first = window[0];
  if (window.length < 2 || last.t - first.t < 8) return null;
  const dt = (last.t - first.t) / 1000;
  return { x: (last.x - first.x) / dt, y: (last.y - first.y) / dt };
}

// The cursor playing around near him, if it is: how much path there's been
export function teasing(samples: Sample[], now: number, chest: Point): { path: number } | null {
  const last = samples.at(-1);
  if (!last) return null;
  const ref = Math.max(now, last.t);
  if (ref - last.t > TEASE.maxAge) return null;
  const points = recent(samples, ref - TEASE.window).filter((p) => distance(p, chest) <= TEASE.reach);
  if (points.length < 6) return null;
  const first = points[0];
  const end = points[points.length - 1];
  const span = end.t - first.t;
  if (span < TEASE.minSpan) return null;
  let path = 0;
  for (let i = 1; i < points.length; i++) path += distance(points[i - 1], points[i]);
  const speed = path / (span / 1000);
  if (path < TEASE.minPath || path < TEASE.meander * distance(first, end)) return null;
  if (speed < TEASE.speed[0] || speed > TEASE.speed[1]) return null;
  return { path };
}

// The cursor making a break for it from `from` (him, or the spot he's
// eyeing): heading outward fast, beyond where it's been. Its velocity if so.
export function breakingAway(samples: Sample[], now: number, from: Point): Point | null {
  const v = velocity(samples, now);
  const last = samples.at(-1);
  if (!v || !last) return null;
  const out = { x: last.x - from.x, y: last.y - from.y };
  const d = Math.hypot(out.x, out.y);
  if (!d || (v.x * out.x + v.y * out.y) / d < BREAK.speed) return null;
  const ref = Math.max(now, last.t);
  let before = 0;
  for (const p of samples) {
    if (p.t > ref - BREAK.window && p.t <= ref - BREAK.before) before = Math.max(before, distance(p, from));
  }
  return d >= Math.max(BREAK.minDistance, before + BREAK.clear) ? v : null;
}

// The cursor zipping past close in front of him: its velocity if so
export function zippingPast(samples: Sample[], now: number, chest: Point): Point | null {
  const v = velocity(samples, now, ZIP.window);
  if (!v || Math.hypot(v.x, v.y) < ZIP.speed) return null;
  const last = samples.at(-1)!;
  const ref = Math.max(now, last.t);
  const close = recent(samples, ref - ZIP.window).some((p) => distance(p, chest) <= ZIP.within);
  return close ? v : null;
}

const inside = (box: Box, p: Point) => p.x >= box.left && p.x <= box.right && p.y >= box.top && p.y <= box.bottom;

// Strokes over a zone (his back) since `since`: when each finished, and
// whether one is under way now
export function strokes(samples: Sample[], zone: Box, since: number, now: number) {
  const ends: number[] = [];
  const minLength = Math.max(STROKE.minLength, STROKE.zoneShare * Math.max(zone.right - zone.left, zone.bottom - zone.top));
  type Run = { start: Sample; last: Sample; length: number; axis: "x" | "y" | null; dir: number; far: Sample };
  let run: Run | null = null;

  const close = (end: Sample) => {
    if (!run) return;
    const duration = end.t - run.start.t;
    const speed = run.length / Math.max(0.001, duration / 1000);
    if (
      run.length >= minLength &&
      duration >= STROKE.duration[0] &&
      duration <= STROKE.duration[1] &&
      speed >= STROKE.speed[0] &&
      speed <= STROKE.speed[1]
    ) {
      ends.push(end.t);
    }
    run = null;
  };
  const begin = (p: Sample, length = 0): Run => ({ start: p, last: p, length, axis: null, dir: 0, far: p });

  for (const p of samples) {
    if (p.t <= since) continue;
    if (!inside(zone, p)) {
      if (run) close(run.last);
      continue;
    }
    if (!run) {
      run = begin(p);
      continue;
    }
    if (p.t - run.last.t > STROKE.gap) {
      close(run.last);
      run = begin(p);
      continue;
    }
    run.length += Math.hypot(p.x - run.last.x, p.y - run.last.y);
    run.last = p;
    // Which way the stroke goes, once it's gone a little way
    if (!run.axis) {
      const dx = p.x - run.start.x;
      const dy = p.y - run.start.y;
      if (Math.max(Math.abs(dx), Math.abs(dy)) > STROKE.reverse) {
        run.axis = Math.abs(dx) >= Math.abs(dy) ? "x" : "y";
        run.dir = Math.sign(run.axis === "x" ? dx : dy);
        run.far = p;
      }
      continue;
    }
    const axis = run.axis;
    if ((p[axis] - run.far[axis]) * run.dir > 0) run.far = p;
    // Coming back the other way: that one's done, a new one starts
    if ((run.far[axis] - p[axis]) * run.dir > STROKE.reverse) {
      const turn = run.far;
      const back = Math.hypot(p.x - turn.x, p.y - turn.y);
      run.length -= back;
      close(turn);
      run = begin(turn, back);
      run.last = p;
    }
  }
  const active = !!run && Math.max(now, run.last.t) - run.last.t < 300;
  return { ends, active };
}

// Quick side-to-side jiggling (not circling) since `since`
export function jiggling(samples: Sample[], now: number, since = -Infinity) {
  const points = recent(samples, Math.max(since, now - JIGGLE.window));
  if (points.length < 4) return false;
  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);
  const spreadX = Math.max(...xs) - Math.min(...xs);
  const spreadY = Math.max(...ys) - Math.min(...ys);
  if (spreadX > JIGGLE.maxSpread || spreadY > spreadX * JIGGLE.flatness) return false;
  let reversals = 0;
  let dir = 0;
  let turn = points[0].x;
  for (let i = 1; i < points.length; i++) {
    const step = points[i].x - points[i - 1].x;
    if (!step) continue;
    const d = Math.sign(step);
    if (dir && d !== dir) {
      if (Math.abs(points[i - 1].x - turn) >= JIGGLE.leg) reversals++;
      turn = points[i - 1].x;
    }
    dir = d;
  }
  return reversals >= JIGGLE.reversals;
}

// A fling of the cursor straight through a box (him): its velocity if so
export function whipped(samples: Sample[], box: Box, now: number): Point | null {
  const ref = Math.max(now, samples.at(-1)?.t ?? now);
  const points = recent(samples, ref - WHIP.window);
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1];
    const b = points[i];
    const dt = (b.t - a.t) / 1000;
    if (dt <= 0) continue;
    const v = { x: (b.x - a.x) / dt, y: (b.y - a.y) / dt };
    if (Math.hypot(v.x, v.y) < WHIP.speed) continue;
    for (let k = 0; k <= 8; k++) {
      if (inside(box, { x: a.x + ((b.x - a.x) * k) / 8, y: a.y + ((b.y - a.y) * k) / 8 })) return v;
    }
  }
  return null;
}
