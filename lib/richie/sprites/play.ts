import type { AnimationDef, AnimationName } from "../types.ts";
import { TAIL_UP, TORSO_SIDE } from "./bodies.ts";
import type { Frame } from "./frame.ts";
import { buildPose, tilt } from "./gait.ts";
import { grid, type Grid } from "./grid.ts";
import { EYE_SIDE_CLOSED, HEAD_SIDE, MOUTH_SIDE_OPEN } from "./parts.ts";
import { TAIL_STREAM } from "./run.ts";
import { SIT_SIDE_BODY } from "./sit.ts";

// Play, all facing east: hopping (the greeting hop-out and pounces), stalking
// the cursor, and batting at it.

const HEAD = { part: HEAD_SIDE, x: 17, y: 8 };

// Crouch, launch, air, land. Launch and air lift the whole frame so the
// shadow stays on the ground.
const HOP = {
  hop_1: buildPose("hop_1", {
    torso: TORSO_SIDE,
    dy: 2,
    head: HEAD,
    tail: TAIL_UP[0],
    legs: [
      { hip: [7, 27], paw: [6, 29], near: false },
      { hip: [17, 27], paw: [18, 29], near: false },
      { hip: [9, 27], paw: [8, 29], near: true },
      { hip: [19, 27], paw: [20, 29], near: true },
    ],
  }),
  hop_2: buildPose("hop_2", {
    torso: TORSO_SIDE,
    dy: -1,
    head: HEAD,
    tail: TAIL_UP[2],
    legs: [
      { hip: [7, 24], paw: [4, 29], near: false },
      { hip: [17, 24], paw: [20, 27], near: false },
      { hip: [9, 24], paw: [6, 29], near: true },
      { hip: [19, 24], paw: [22, 27], near: true },
    ],
    lift: 3,
  }),
  hop_3: buildPose("hop_3", {
    torso: TORSO_SIDE,
    dy: -1,
    head: HEAD,
    tail: TAIL_UP[1],
    legs: [
      { hip: [7, 24], paw: [5, 28], near: false },
      { hip: [17, 24], paw: [21, 28], near: false },
      { hip: [9, 24], paw: [7, 28], near: true },
      { hip: [19, 24], paw: [23, 28], near: true },
    ],
    lift: 6,
  }),
  hop_4: buildPose("hop_4", {
    torso: TORSO_SIDE,
    dy: 1,
    head: HEAD,
    tail: TAIL_UP[0],
    legs: [
      { hip: [7, 26], paw: [5, 28], near: false },
      { hip: [17, 26], paw: [19, 29], near: false },
      { hip: [9, 26], paw: [7, 28], near: true },
      { hip: [19, 26], paw: [21, 29], near: true },
    ],
  }),
};

// Stalking: low to the ground, eyes locked forward, tail twitching behind
const stalkTail = (tipRow: number) => {
  const rows = Array.from({ length: 32 }, () => ".".repeat(32));
  rows[22] = "..KKKK" + ".".repeat(26);
  rows[21] = ".".repeat(2) + "K" + ".".repeat(29);
  rows[tipRow] = ".".repeat(2) + "K" + ".".repeat(29);
  return { width: 32, height: 32, rows } satisfies Grid;
};

const stalk = (name: string, tipRow: number, rump: number) =>
  buildPose(name, {
    torso: TORSO_SIDE,
    dy: 2,
    head: { part: HEAD_SIDE, x: 17, y: 8 },
    tail: stalkTail(tipRow),
    legs: [
      { hip: [7 + rump, 29], paw: [6 + rump, 29], near: false },
      { hip: [17, 29], paw: [18, 29], near: false },
      { hip: [9 + rump, 29], paw: [8 + rump, 29], near: true },
      { hip: [19, 29], paw: [20, 29], near: true },
    ],
  });

const STALK = {
  stalk_1: stalk("stalk_1", 20, 0),
  stalk_2: stalk("stalk_2", 19, 1),
  stalk_3: stalk("stalk_3", 20, -1),
};

// The wind-up: his rump swinging hard side to side, tail tip flicking
const STALK_WIGGLE = {
  stalk_w1: stalk("stalk_w1", 19, 2),
  stalk_w2: stalk("stalk_w2", 20, -2),
};

// Forelegs stretched out ahead, reaching for it
const REACH = grid`
  WWW....
  .WWWWW.
  ...WWWW
`;

// The big pounce: pushing off, stretched out flying, reaching down, then
// landing on it (the pin's first frame). Lifted, so the shadow stays behind.
const POUNCE = {
  pounce_1: buildPose("pounce_1", {
    torso: tilt(TORSO_SIDE, -0.12),
    dy: -1,
    head: { part: HEAD_SIDE, x: 17, y: 7 },
    tail: TAIL_UP[2],
    legs: [
      { hip: [7, 24], paw: [4, 29], near: false },
      { hip: [9, 24], paw: [6, 29], near: true },
      { hip: [17, 23], paw: [20, 27], near: false },
    ],
    extras: [{ part: REACH, x: 20, y: 19 }],
    lift: 2,
  }),
  pounce_2: buildPose("pounce_2", {
    torso: TORSO_SIDE,
    dy: -1,
    head: { part: HEAD_SIDE, x: 17, y: 8 },
    tail: TAIL_STREAM[0],
    legs: [
      { hip: [7, 24], paw: [3, 27], near: false },
      { hip: [9, 24], paw: [4, 28], near: true },
    ],
    extras: [{ part: REACH, x: 21, y: 21 }],
    lift: 6,
  }),
  pounce_3: buildPose("pounce_3", {
    torso: tilt(TORSO_SIDE, 0.12),
    head: { part: HEAD_SIDE, x: 17, y: 10 },
    tail: TAIL_UP[1],
    legs: [
      { hip: [7, 24], paw: [8, 28], near: false },
      { hip: [9, 24], paw: [10, 28], near: true },
      { hip: [18, 25], paw: [22, 29], near: false },
      { hip: [20, 25], paw: [24, 29], near: true },
    ],
    lift: 3,
  }),
};

// Got it: front paws together on it, rump up, looking down at it, tail wagging
const pin = (name: string, tail: Grid) =>
  buildPose(name, {
    torso: tilt(TORSO_SIDE, 0.25),
    dy: -1,
    head: { part: HEAD_SIDE, x: 17, y: 14 },
    tail: tilt(tail, 0.25),
    legs: [
      { hip: [7, 23], paw: [7, 29], near: false },
      { hip: [9, 23], paw: [9, 29], near: true },
      { hip: [18, 25], paw: [22, 29], near: false },
      { hip: [20, 25], paw: [24, 29], near: true },
    ],
  });

const PIN = {
  pin_1: pin("pin_1", TAIL_UP[0]),
  pin_2: pin("pin_2", TAIL_UP[2]),
};

// Stretching after a nap: a deep bow with a yawn, then up on straight legs
// with a hind leg pushed out behind
const STRETCH = {
  stretch_1: buildPose("stretch_1", {
    torso: tilt(TORSO_SIDE, 0.3),
    dy: -2,
    head: { part: HEAD_SIDE, x: 18, y: 14 },
    tail: tilt(TAIL_UP[1], 0.3),
    legs: [
      { hip: [7, 22], paw: [7, 29], near: false },
      { hip: [9, 22], paw: [9, 29], near: true },
      { hip: [19, 26], paw: [25, 29], near: false },
      { hip: [21, 26], paw: [27, 29], near: true },
    ],
    extras: [
      { part: EYE_SIDE_CLOSED, x: 25, y: 18 },
      { part: MOUTH_SIDE_OPEN, x: 28, y: 22 },
    ],
  }),
  stretch_2: buildPose("stretch_2", {
    torso: TORSO_SIDE,
    dy: -1,
    head: { part: HEAD_SIDE, x: 17, y: 6 },
    tail: TAIL_UP[0],
    legs: [
      { hip: [7, 24], paw: [7, 29], near: false },
      { hip: [9, 24], paw: [4, 28], near: true },
      { hip: [17, 24], paw: [17, 29], near: false },
      { hip: [19, 24], paw: [19, 29], near: true },
    ],
    extras: [{ part: EYE_SIDE_CLOSED, x: 24, y: 10 }],
  }),
};

// Batting: sitting up in profile, the near front paw raised, swiped forward,
// then coming back down. The near leg is cleared from the sitting body and
// redrawn in each position.
const SIT_SIDE_NO_PAW: Grid = {
  ...SIT_SIDE_BODY,
  rows: SIT_SIDE_BODY.rows.map((row, y) =>
    y >= 21 ? row.slice(0, 23) + row.slice(23, 28).replace(/[Ww]/g, ".") + row.slice(28) : row
  ),
};

const SIDE_TAIL = grid`
  ........
  ........
  ........
  KK......
  KK......
  .KK.....
  .KKKKKKK
  ..KKKKKK
`;

const bat = (name: string, paw: readonly [number, number]) =>
  buildPose(name, {
    torso: SIT_SIDE_NO_PAW,
    head: { part: HEAD_SIDE, x: 16, y: 4 },
    legs: [{ hip: [23, 20], paw, near: true }],
    extras: [{ part: SIDE_TAIL, x: 2, y: 22 }],
  });

const BAT = {
  bat_1: bat("bat_1", [25, 14]),
  bat_2: bat("bat_2", [27, 18]),
  bat_3: bat("bat_3", [25, 24]),
};

export const PLAY_FRAMES: Record<string, Frame> = { ...HOP, ...STALK, ...STALK_WIGGLE, ...POUNCE, ...PIN, ...STRETCH, ...BAT };

export const PLAY_ANIMATIONS: Partial<Record<AnimationName, AnimationDef>> = {
  hop: { frames: { E: Object.keys(HOP) }, fps: 10, loop: false },
  stalk: { frames: { E: Object.keys(STALK) }, fps: 6 },
  stalk_wiggle: { frames: { E: Object.keys(STALK_WIGGLE) }, fps: 12 },
  pounce: { frames: { E: [...Object.keys(POUNCE), "pin_1"] }, loop: false },
  pin: { frames: { E: Object.keys(PIN) }, fps: 4 },
  stretch: { frames: { E: Object.keys(STRETCH) }, fps: 1.25, loop: false },
  bat: { frames: { E: Object.keys(BAT) }, fps: 10, loop: false },
};
