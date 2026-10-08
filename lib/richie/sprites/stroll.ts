import type { AnimationDef, AnimationName } from "../types.ts";
import type { Frame } from "./frame.ts";
import { frontLegs, rumpLegs, sideLegs, TAIL_HOOK, TAIL_FRONT, TAIL_UP, TORSO_DIAGONAL_AWAY, TORSO_RUMP, TORSO_DIAGONAL, TORSO_FRONT, TORSO_SIDE, WALK } from "./bodies.ts";
import { buildGait, noSkateStride, type Rig } from "./gait.ts";
import { HEAD_BACK_SMALL, HEAD_BACK_THREE_QUARTER, HEAD_FRONT, HEAD_SIDE, HEAD_THREE_QUARTER } from "./parts.ts";

// Strolling: a relaxed four-beat walk built from rigs (see gait.ts). Legs move
// in the order near hind, near fore, far hind, far fore, a quarter cycle apart.

const RIGS: Rig[] = [
  { name: "stroll_E", torso: TORSO_SIDE, head: { part: HEAD_SIDE, x: 17, y: 8 }, legs: sideLegs(), tails: TAIL_UP, ...WALK },
  {
    name: "stroll_SE",
    torso: TORSO_DIAGONAL,
    head: { part: HEAD_THREE_QUARTER, x: 13, y: 7 },
    legs: sideLegs(3),
    tails: TAIL_UP,
    ...WALK,
  },
  {
    name: "stroll_NE",
    torso: TORSO_DIAGONAL_AWAY,
    head: { part: HEAD_BACK_THREE_QUARTER, x: 14, y: 8 },
    legs: sideLegs(3),
    tails: TAIL_UP,
    ...WALK,
  },
  // Walking away: a bow-legged waddle, rump swaying, the tail tip lagging
  // behind the sway and a raised hind paw showing its pink pad
  {
    name: "stroll_N",
    torso: TORSO_RUMP,
    head: { part: HEAD_BACK_SMALL, x: 10, y: 11 },
    headBehind: true,
    legs: rumpLegs(),
    tails: [TAIL_HOOK[0], TAIL_HOOK[1], TAIL_HOOK[1], TAIL_HOOK[0], TAIL_HOOK[0], TAIL_HOOK[2], TAIL_HOOK[2], TAIL_HOOK[0]],
    tailOverHead: true,
    soles: true,
    frames: 8,
    swing: "y",
    reach: 1,
    lift: 1,
    duty: WALK.duty,
    bob: WALK.bob,
    sway: [0, 1, 1, 0, 0, -1, -1, 0],
  },
  {
    name: "stroll_S",
    torso: TORSO_FRONT,
    head: { part: HEAD_FRONT, x: 9, y: 4 },
    legs: frontLegs,
    tails: TAIL_FRONT,
    frames: 8,
    swing: "y",
    reach: 1,
    lift: 1,
    duty: WALK.duty,
    bob: WALK.bob,
  },
];

export const STROLL_FRAMES: Record<string, Frame> = Object.assign({}, ...RIGS.map(buildGait));

const names = (rig: string, count: number) => Array.from({ length: count }, (_, i) => `${rig}_${i + 1}`);

export const STROLL_ANIMATIONS: Partial<Record<AnimationName, AnimationDef>> = {
  stroll: {
    frames: {
      E: names("stroll_E", 8),
      SE: names("stroll_SE", 8),
      NE: names("stroll_NE", 8),
      N: names("stroll_N", 8),
      S: names("stroll_S", 8),
    },
    // Body travel per frame that keeps planted paws planted, from the walk rig
    stride: noSkateStride(WALK),
  },
};
