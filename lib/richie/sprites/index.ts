import type { AnimationDef, AnimationName } from "../types.ts";
import type { Frame } from "./frame.ts";
import { PEEK_ANIMATIONS, PEEK_FRAMES } from "./peek.ts";
import { PLAY_ANIMATIONS, PLAY_FRAMES } from "./play.ts";
import { REST_ANIMATIONS, REST_FRAMES } from "./rest.ts";
import { RUN_ANIMATIONS, RUN_FRAMES } from "./run.ts";
import { SIT_ANIMATIONS, SIT_FRAMES } from "./sit.ts";
import { STROLL_ANIMATIONS, STROLL_FRAMES } from "./stroll.ts";

// Every frame by name
export const FRAMES: Record<string, Frame> = {
  ...SIT_FRAMES,
  ...STROLL_FRAMES,
  ...RUN_FRAMES,
  ...REST_FRAMES,
  ...PLAY_FRAMES,
  ...PEEK_FRAMES,
};

// Every animation by name (see AnimationName in ../types.ts)
export const ANIMATIONS: Partial<Record<AnimationName, AnimationDef>> = {
  ...SIT_ANIMATIONS,
  ...STROLL_ANIMATIONS,
  ...RUN_ANIMATIONS,
  ...REST_ANIMATIONS,
  ...PLAY_ANIMATIONS,
  ...PEEK_ANIMATIONS,
};
