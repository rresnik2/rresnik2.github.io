import { CELL, defineFrame, type Frame, type Stamp } from "./frame.ts";
import { type Grid } from "./grid.ts";

// Walk and run cycles are built from a rig rather than drawn frame by frame:
// one torso per view, the shared head, and legs posed by the cycle. Every
// frame stays on-model, and changing a torso fixes the whole cycle.

export type Leg = {
  // Where the leg leaves the body, in frame pixels
  hip: readonly [number, number];
  // Near-side legs are white, far-side legs in shade and drawn behind the body
  near: boolean;
  // Where in the cycle this leg is, 0-1
  phase: number;
  // Sideways offset of the paw from under the hip, px (splayed feet)
  foot?: number;
  // This leg's paw row, if not the rig's (far legs a row up, further away)
  ground?: number;
};

export type Rig = {
  name: string; // frames are named `${name}_1` ...
  torso: Grid; // 32x32: body and tail, no legs, no head
  head: Stamp;
  legs: Leg[];
  frames: number;
  // Side views swing the paws forward and back; front and back views lift
  // them instead (the legs swing toward and away from the viewer)
  swing: "x" | "y";
  reach: number; // furthest a paw travels from under its hip, px
  lift: number; // how high a paw rises mid-swing, px
  // Share of the cycle each paw spends on the ground (default 0.5): a walk
  // keeps paws down longer than a gallop
  duty?: number;
  // Per-frame vertical shift of the torso and head (body bob), px, negative is up
  bob?: number[];
  // Optional overlays cycled over the frames (tail positions), drawn on top of the torso
  tails?: Grid[];
  // Draw the tail over the head too (walking away, the tail is nearest the viewer)
  tailOverHead?: boolean;
  // Paint the head under the torso (walking away, his rump hides his chin)
  headBehind?: boolean;
  // Per-frame sideways shift of the torso, tail, head and hips (a waddle), px;
  // the paws stay planted
  sway?: number[];
  // A raised near paw shows its pink pad (seen from behind)
  soles?: boolean;
  // Frame-level lift (all four paws off the ground), per frame
  airborne?: number[];
  ground?: number; // paw row, default 29
};

type Keys = string[][];

const emptyKeys = (): Keys => Array.from({ length: CELL }, () => Array<string>(CELL).fill("."));

function paint(target: Keys, source: Grid, dx = 0, dy = 0) {
  source.rows.forEach((row, y) =>
    [...row].forEach((key, x) => {
      const ty = y + dy;
      const tx = x + dx;
      if (key !== "." && ty >= 0 && ty < CELL && tx >= 0 && tx < CELL) target[ty][tx] = key;
    })
  );
}

function set(target: Keys, x: number, y: number, key: string) {
  if (y >= 0 && y < CELL && x >= 0 && x < CELL) target[y][x] = key;
}

// A 2px-wide leg from the hip to the paw, with a 3px paw on the ground row
function drawLeg(target: Keys, hip: readonly [number, number], paw: readonly [number, number], key: string) {
  const [hx, hy] = hip;
  const [px, py] = paw;
  const rows = Math.max(1, py - hy);
  for (let y = hy; y <= py; y++) {
    const t = (y - hy) / rows;
    const x = Math.round(hx + (px - hx) * t);
    set(target, x, y, key);
    set(target, x + 1, y, key);
  }
  set(target, px - (px < hx ? 1 : 0), py, key);
  set(target, px + 2 - (px < hx ? 1 : 0), py, key);
}

function toGrid(keys: Keys): Grid {
  return { width: CELL, height: CELL, rows: keys.map((row) => row.join("")) };
}

export function buildGait(rig: Rig): Record<string, Frame> {
  const frames: Record<string, Frame> = {};
  const ground = rig.ground ?? 29;
  for (let i = 0; i < rig.frames; i++) {
    const t = i / rig.frames;
    const bob = rig.bob?.[i] ?? 0;
    const sway = rig.sway?.[i] ?? 0;
    const air = rig.airborne?.[i] ?? 0;
    const keys = emptyKeys();
    const duty = rig.duty ?? 0.5;
    const legs = rig.legs.map((leg) => {
      // On the ground the paw sweeps steadily backwards, from `reach` in
      // front of the hip to `reach` behind, exactly as far as the body moves
      // (see noSkateStride), so it stays planted; then it lifts and swings
      // forward through the air in an arc
      const p = (t + leg.phase) % 1;
      const planted = p < duty;
      const q = planted ? p / duty : (p - duty) / (1 - duty);
      const offset = Math.round(planted ? rig.reach * (1 - 2 * q) : rig.reach * (2 * q - 1));
      const raised = (planted ? 0 : Math.max(1, Math.round(rig.lift * Math.sin(Math.PI * q)))) + air;
      const floor = leg.ground ?? ground;
      const hip = [leg.hip[0] + sway, leg.hip[1] + bob] as const;
      const paw =
        rig.swing === "x"
          ? ([leg.hip[0] + offset, floor - raised] as const)
          : ([leg.hip[0] + (leg.foot ?? 0), floor - raised - (offset > 0 ? 1 : 0)] as const);
      return { leg, hip, paw, raised: raised > 0 };
    });
    for (const { leg, hip, paw } of legs) if (!leg.near) drawLeg(keys, hip, paw, "w");
    const head = rig.headBehind ? stampInto(keys, rig.head.part, rig.head.x + sway, rig.head.y + bob) : null;
    paint(keys, rig.torso, sway, bob);
    for (const { leg, hip, paw, raised } of legs) {
      if (!leg.near) continue;
      drawLeg(keys, hip, paw, "W");
      if (rig.soles && raised) set(keys, paw[0] < hip[0] ? paw[0] : paw[0] + 1, paw[1], "P");
    }
    const tail = rig.tails?.length ? shift(rig.tails[i % rig.tails.length], sway, bob) : null;
    if (tail && !rig.tailOverHead) paint(keys, tail);
    if (tail && rig.tailOverHead && head) paint(keys, tail);
    const name = `${rig.name}_${i + 1}`;
    const stamps: Stamp[] = head ? [] : [{ ...rig.head, x: rig.head.x + sway, y: rig.head.y + bob }];
    if (tail && rig.tailOverHead && !head) stamps.push({ part: tail, x: 0, y: 0 });
    frames[name] = defineFrame(name, { body: toGrid(keys), stamps });
  }
  return frames;
}

// Paints a part straight into a frame (rather than stamping it on top
// later), returning which pixels it covered
function stampInto(target: Keys, part: Grid, dx: number, dy: number) {
  const covered = new Set<number>();
  part.rows.forEach((row, y) =>
    [...row].forEach((key, x) => {
      const tx = x + dx;
      const ty = y + dy;
      if (key === "." || tx < 0 || ty < 0 || tx >= CELL || ty >= CELL) return;
      target[ty][tx] = key;
      covered.add(ty * CELL + tx);
    })
  );
  return covered;
}

// How far the body moves per frame so planted paws don't slide (art px):
// a paw sweeps 2·reach while on the ground for duty·frames frames
export function noSkateStride(rig: Pick<Rig, "reach" | "frames" | "duty">) {
  return (2 * rig.reach) / ((rig.duty ?? 0.5) * rig.frames);
}

// Narrows a grid by removing `count` columns starting at `from`, closing the
// gap (side views foreshortened for diagonal directions)
export function squeeze(source: Grid, from: number, count: number): Grid {
  return {
    ...source,
    rows: source.rows.map((row) => (row.slice(0, from) + row.slice(from + count) + ".".repeat(count)).slice(0, source.width)),
  };
}

// Tips a grid about column `pivot`: column x moves down by (x - pivot) * slope
// rows (a positive slope dips the front, facing east, and raises the rear)
export function tilt(source: Grid, slope: number, pivot = 14): Grid {
  const keys = emptyKeys();
  source.rows.forEach((row, y) =>
    [...row].forEach((key, x) => {
      if (key !== ".") set(keys, x, y + Math.round((x - pivot) * slope), key);
    })
  );
  return toGrid(keys);
}

// Shifts every row above `above` sideways by dx (the top of a tail lagging
// behind a waddle)
export function leanTop(source: Grid, dx: number, above: number): Grid {
  const keys = emptyKeys();
  paint(keys, { ...source, rows: source.rows.map((row, y) => (y < above ? row : ".".repeat(row.length))) }, dx, 0);
  paint(keys, { ...source, rows: source.rows.map((row, y) => (y < above ? ".".repeat(row.length) : row)) });
  return toGrid(keys);
}

// Moves a grid's content by (dx, dy) inside the same size
export function shift(source: Grid, dx: number, dy: number): Grid {
  const keys = emptyKeys();
  paint(keys, source, dx, dy);
  return toGrid(keys);
}

// A single held pose (hops, stalking, swats) from the same parts as the gaits
export type Pose = {
  torso: Grid;
  // Moves the torso, tail and head together, px
  dx?: number;
  dy?: number;
  head: Stamp;
  tail?: Grid;
  legs: { hip: readonly [number, number]; paw: readonly [number, number]; near: boolean }[];
  // Extra stamps drawn last (a raised paw)
  extras?: Stamp[];
  // Draws the whole frame higher, leaving the shadow on the ground
  lift?: number;
};

export function buildPose(name: string, pose: Pose): Frame {
  const keys = emptyKeys();
  const dx = pose.dx ?? 0;
  const dy = pose.dy ?? 0;
  for (const leg of pose.legs) if (!leg.near) drawLeg(keys, leg.hip, leg.paw, "w");
  paint(keys, pose.torso, dx, dy);
  for (const leg of pose.legs) if (leg.near) drawLeg(keys, leg.hip, leg.paw, "W");
  if (pose.tail) paint(keys, pose.tail, dx, dy);
  return defineFrame(name, {
    body: toGrid(keys),
    stamps: [{ ...pose.head, x: pose.head.x + dx, y: pose.head.y + dy }, ...(pose.extras ?? [])],
    lift: pose.lift,
  });
}
