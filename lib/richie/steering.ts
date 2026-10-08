import { valueNoise, type Random } from "./random.ts";
import type { Box } from "./world.ts";

export type Gait = "stroll" | "run";
type Point = { x: number; y: number };

// Speeds in CSS px/s, accelerations in px/s^2, turning in rad/s. Speeds are
// matched to his legs (sprites/gait.ts noSkateStride): a walk of about 2.5-3
// steps a second and a gallop of about 4 bounds; he picks up speed and slows
// down gradually, as a cat that heavy would
const SPEED: Record<Gait, readonly [number, number]> = { stroll: [55, 75], run: [220, 280] };
const ACCEL: Record<Gait, number> = { stroll: 160, run: 650 };
const BRAKE = 900;
const TURN: Record<Gait, number> = { stroll: 3, run: 6 };
const LOOKAHEAD: Record<Gait, number> = { stroll: 30, run: 60 };
const WANDER: Record<Gait, number> = { stroll: (14 * Math.PI) / 180, run: (5 * Math.PI) / 180 };
const ARRIVED = 8; // px from the end that counts as there
const PASSED = { within: 24, angle: (100 * Math.PI) / 180 }; // just past the end: stop rather than loop back
const CRAWL = 15; // px/s, the slowest he goes while turning to face the end
const EDGE_ROOM = 8; // px past his bounds he may brake into

// The fastest he can go and still stop within d px
export const stoppingSpeed = (d: number) => Math.sqrt(2 * BRAKE * 0.4 * Math.max(0, d)) + 12;

type Trip = {
  points: readonly [Point, Point, Point, Point];
  lengths: number[]; // arc length at each of SAMPLES + 1 points
  length: number;
  s: number; // how far along he is, px
  gait: Gait;
  maxSpeed: number;
  target: Point;
  bounds: Box;
  // When it started and how long it may take before he gives up on reaching
  // the exact spot (seconds, on his clock)
  started: number;
  patience: number;
  // A pause to sniff something partway along
  sniff?: { at: number; duration: number; until?: number };
};

const SAMPLES = 16;

function bezier([p0, c1, c2, p3]: readonly [Point, Point, Point, Point], t: number): Point {
  const u = 1 - t;
  const a = u * u * u;
  const b = 3 * u * u * t;
  const c = 3 * u * t * t;
  const d = t * t * t;
  return { x: a * p0.x + b * c1.x + c * c2.x + d * p3.x, y: a * p0.y + b * c1.y + c * c2.y + d * p3.y };
}

const distance = (a: Point, b: Point) => Math.hypot(b.x - a.x, b.y - a.y);
const wrapAngle = (a: number) => Math.atan2(Math.sin(a), Math.cos(a));

// Moves Richie along curved trips. Each trip is a cubic Bezier that starts in
// the direction he's already heading and bends a random amount to a random
// side, and he follows a point a little ahead on it with a capped turning
// rate, a noisy wander and noisy speed, so no two trips look the same.
export class Mover {
  x = 0;
  y = 0;
  heading = Math.PI / 2; // radians, screen space (y down): facing down the page
  speed = 0;
  travelled = 0; // total px walked, which drives the gait frames
  speedScale = 1; // slower on touch screens
  trip: Trip | null = null;
  private lastPlan = -Infinity;
  private lastSide: 1 | -1 = 1;
  private recent: string[] = [];
  private readonly noise: (t: number) => number;
  private clock = 0;

  constructor(private readonly random: Random) {
    this.noise = valueNoise(random);
  }

  get moving() {
    return !!this.trip || this.speed > 1;
  }

  get sniffing() {
    return !!this.trip?.sniff?.until;
  }

  get gait(): Gait | null {
    return this.trip?.gait ?? null;
  }

  stop() {
    this.trip = null;
    this.speed = 0;
  }

  // Plans a fresh trip to target
  goTo(target: Point, gait: Gait, bounds: Box, now: number, sniffs = true) {
    const from = { x: this.x, y: this.y };
    const d = distance(from, target);
    if (d < 3) {
      this.trip = null;
      return;
    }
    const toward = { x: (target.x - from.x) / d, y: (target.y - from.y) / d };
    // From a standstill he turns toward the target first; on the move the
    // curve continues his current heading
    const heading = this.speed > 30 ? { x: Math.cos(this.heading), y: Math.sin(this.heading) } : toward;
    const clampPoint = (p: Point) => ({
      x: Math.min(bounds.right, Math.max(bounds.left, p.x)),
      y: Math.min(bounds.bottom, Math.max(bounds.top, p.y)),
    });

    let points: [Point, Point, Point, Point] = [from, from, target, target];
    for (let attempt = 0; attempt < 4; attempt++) {
      // Bend to the side opposite the last trip's, most of the time
      const side: 1 | -1 = this.random.chance(0.7) ? (-this.lastSide as 1 | -1) : this.lastSide;
      const bend = this.random.range(0.08, 0.32) * d * side;
      const lead = Math.min(0.35 * d, 120);
      const c1 = clampPoint({ x: from.x + heading.x * lead, y: from.y + heading.y * lead });
      const c2 = clampPoint({
        x: from.x + toward.x * 0.7 * d - toward.y * bend,
        y: from.y + toward.y * 0.7 * d + toward.x * bend,
      });
      points = [from, c1, c2, target];
      // Never the same path twice: re-roll a trip shaped like a recent one
      const key = Array.from({ length: 8 }, (_, i) => {
        const p = bezier(points, (i + 1) / 8);
        return `${Math.round((p.x - from.x) / 16)},${Math.round((p.y - from.y) / 16)}`;
      }).join(" ");
      if (!this.recent.includes(key) || attempt === 3) {
        this.recent = [key, ...this.recent].slice(0, 20);
        this.lastSide = side;
        break;
      }
    }

    const lengths = [0];
    let previous = points[0];
    for (let i = 1; i <= SAMPLES; i++) {
      const p = bezier(points, i / SAMPLES);
      lengths.push(lengths[i - 1] + distance(previous, p));
      previous = p;
    }
    const length = lengths[SAMPLES];
    const [low, high] = SPEED[gait];
    const maxSpeed = this.random.range(low, high) * this.speedScale;
    const sniff =
      sniffs && gait === "stroll" && length > 350 && this.random.chance(0.3)
        ? { at: this.random.range(0.3, 0.7) * length, duration: this.random.range(600, 1400) }
        : undefined;
    this.trip = {
      points,
      lengths,
      length,
      s: 0,
      gait,
      maxSpeed,
      target,
      bounds,
      started: this.clock,
      patience: (2.5 * length) / maxSpeed + 1.5 + (sniff ? sniff.duration / 1000 : 0),
      sniff,
    };
    this.lastPlan = now;
  }

  // Keeps a trip heading for a moving target, replanning only when it has
  // moved enough (and not too often), always starting from where he's heading.
  // It never starts a trip itself: once he's arrived, he's arrived.
  follow(target: Point, gait: Gait, bounds: Box, now: number) {
    const trip = this.trip;
    if (!trip) return;
    const remaining = trip.length - trip.s;
    if (distance(trip.target, target) > Math.max(40, remaining * 0.25) && now - this.lastPlan > 180) {
      this.goTo(target, gait, bounds, now, false);
    } else if (trip.gait !== gait) {
      const [low, high] = SPEED[gait];
      trip.gait = gait;
      trip.maxSpeed = this.random.range(low, high) * this.speedScale;
      trip.patience = Math.max(trip.patience, this.clock - trip.started + (2.5 * (trip.length - trip.s)) / trip.maxSpeed + 1.5);
    }
  }

  private pointAt(s: number): Point {
    const trip = this.trip!;
    const clamped = Math.min(trip.length, Math.max(0, s));
    let i = 1;
    while (i < SAMPLES && trip.lengths[i] < clamped) i++;
    const span = trip.lengths[i] - trip.lengths[i - 1] || 1;
    const t = (i - 1 + (clamped - trip.lengths[i - 1]) / span) / SAMPLES;
    return bezier(trip.points, t);
  }

  // How far he can go on his heading before leaving bounds (plus a little
  // give): none if he's already out and heading further out, unlimited if
  // he's out and coming back in
  private roomAhead(bounds: Box) {
    const b = { left: bounds.left - EDGE_ROOM, right: bounds.right + EDGE_ROOM, top: bounds.top - EDGE_ROOM, bottom: bounds.bottom + EDGE_ROOM };
    const dx = Math.cos(this.heading);
    const dy = Math.sin(this.heading);
    if ((this.x > b.right && dx > 0) || (this.x < b.left && dx < 0) || (this.y > b.bottom && dy > 0) || (this.y < b.top && dy < 0)) return 0;
    if (this.x < b.left || this.x > b.right || this.y < b.top || this.y > b.bottom) return Infinity;
    const tx = dx > 1e-6 ? (b.right - this.x) / dx : dx < -1e-6 ? (b.left - this.x) / dx : Infinity;
    const ty = dy > 1e-6 ? (b.bottom - this.y) / dy : dy < -1e-6 ? (b.top - this.y) / dy : Infinity;
    return Math.min(tx, ty);
  }

  update(dt: number, now: number) {
    this.clock += dt;
    const trip = this.trip;
    if (!trip) {
      this.speed = Math.max(0, this.speed - BRAKE * dt);
      return;
    }

    // Sniffing: stand still for a moment partway along
    if (trip.sniff && trip.s >= trip.sniff.at) {
      trip.sniff.until ??= now + trip.sniff.duration;
      if (now < trip.sniff.until) {
        this.speed = Math.max(0, this.speed - BRAKE * dt);
        return;
      }
      trip.sniff = undefined;
    }

    const end = trip.points[3];
    const toEnd = distance(this, end);
    const off = Math.abs(wrapAngle(Math.atan2(end.y - this.y, end.x - this.x) - this.heading));
    // There, or just past it (looping back round looks like chasing his tail),
    // or taking far too long about it
    if (toEnd < ARRIVED || (toEnd < PASSED.within && off > PASSED.angle) || this.clock - trip.started > trip.patience) {
      this.trip = null;
      this.speed = 0;
      return;
    }

    const carrot = trip.s >= trip.length ? end : this.pointAt(trip.s + LOOKAHEAD[trip.gait]);
    const nearEnd = Math.min(1, toEnd / 80);
    const wander = this.noise(this.clock * 1.3) * WANDER[trip.gait] * nearEnd;
    const desired = Math.atan2(carrot.y - this.y, carrot.x - this.x) + wander;
    const maxTurn = TURN[trip.gait] * dt * (this.speed < 40 ? 4 : 1);
    this.heading += Math.max(-maxTurn, Math.min(maxTurn, wrapAngle(desired - this.heading)));

    let target = trip.maxSpeed * (1 + 0.12 * this.noise(this.clock * 0.7 + 50));
    // Arrive: brake smoothly over the last stretch
    target = Math.min(target, stoppingSpeed(toEnd));
    // Close to the end but not facing it: slow enough that his turning circle
    // passes through it (radius d / 2sin(off)), so he turns onto it instead of
    // circling round it forever. Facing away, he slows to a crawl and pivots.
    if (toEnd < 80 && off > 0.05) {
      const bend = off <= Math.PI / 2 ? Math.sin(off) : 1 + (off - Math.PI / 2) / (Math.PI / 2);
      target = Math.min(target, Math.max(CRAWL, (TURN[trip.gait] * toEnd) / (2 * bend)));
    }
    // Never so fast he can't stop before the edge of where he's allowed
    target = Math.min(target, stoppingSpeed(this.roomAhead(trip.bounds)));
    // Turning sharply: slow down first (right down to a crawl, where he turns
    // on the spot) rather than skidding round a wide arc at speed
    const turn = Math.abs(wrapAngle(desired - this.heading));
    target = Math.min(target, Math.max(CRAWL, trip.maxSpeed * Math.max(0, Math.cos(turn))));
    this.speed = this.speed < target ? Math.min(target, this.speed + ACCEL[trip.gait] * dt) : Math.max(target, this.speed - BRAKE * dt);

    const step = this.speed * dt;
    this.x += Math.cos(this.heading) * step;
    this.y += Math.sin(this.heading) * step;
    this.travelled += step;
    trip.s = Math.min(trip.length + 200, trip.s + step);
  }
}
