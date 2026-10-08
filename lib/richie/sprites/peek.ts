import { PEEK_SIDE_LEDGE_X, PEEK_TOP_LEDGE_Y, type AnimationDef, type AnimationName } from "../types.ts";
import { defineFrame, CELL, type Frame, type Stamp } from "./frame.ts";
import { grid, type Grid } from "./grid.ts";
import { HEAD_FRONT } from "./parts.ts";
import { EYES_CLOSED } from "./sit.ts";

// Peeking round things: his head (facing the visitor) slides out from behind
// an element. The engine hides everything on the element's side of the ledge,
// so only what has come round the edge shows.

const EMPTY: Grid = { width: CELL, height: CELL, rows: Array.from({ length: CELL }, () => ".".repeat(CELL)) };

const PAW = grid`
  .WWW.
  WWWWW
  WPWPW
`;

const HEAD_Y = 10;

// Past an element's right edge (pixels left of PEEK_SIDE_LEDGE_X are hidden):
// an ear and one eye, then both eyes, the whole head, a paw round the edge,
// and a blink
const side = (name: string, headX: number, extras: Stamp[] = []) =>
  defineFrame(name, { body: EMPTY, stamps: [{ part: HEAD_FRONT, x: headX, y: HEAD_Y }, ...extras] });

const LEDGE = PEEK_SIDE_LEDGE_X;
const PEEK_SIDE = {
  peek_side_1: side("peek_side_1", LEDGE - 10),
  peek_side_2: side("peek_side_2", LEDGE - 6),
  peek_side_3: side("peek_side_3", LEDGE),
  peek_side_4: side("peek_side_4", LEDGE, [{ part: PAW, x: LEDGE, y: HEAD_Y + 12 }]),
  peek_side_5: side("peek_side_5", LEDGE, [
    { part: PAW, x: LEDGE, y: HEAD_Y + 12 },
    { part: EYES_CLOSED, x: LEDGE + 2, y: HEAD_Y + 6 },
  ]),
};

// Over an element's top edge (pixels at or below PEEK_TOP_LEDGE_Y are hidden):
// ear tips, then ears and eyes, then the whole head with both paws on the edge
const top = (name: string, headY: number, extras: Stamp[] = []) =>
  defineFrame(name, { body: EMPTY, stamps: [{ part: HEAD_FRONT, x: 9, y: headY }, ...extras] });

const RIM = PEEK_TOP_LEDGE_Y;
const PEEK_TOP = {
  peek_top_1: top("peek_top_1", RIM - 3),
  peek_top_2: top("peek_top_2", RIM - 9),
  peek_top_3: top("peek_top_3", RIM - 13, [
    { part: PAW, x: 8, y: RIM - 3 },
    { part: PAW, x: 19, y: RIM - 3 },
  ]),
};

export const PEEK_FRAMES: Record<string, Frame> = { ...PEEK_SIDE, ...PEEK_TOP };

export const PEEK_ANIMATIONS: Partial<Record<AnimationName, AnimationDef>> = {
  peek_side: { frames: { E: Object.keys(PEEK_SIDE) }, fps: 4, loop: false },
  peek_top: { frames: { S: Object.keys(PEEK_TOP) }, fps: 4, loop: false },
};
