// Contracts shared by Richie's sprites, his runtime engine and the site
// integration. Keep this file free of DOM and React so the /richie game can
// reuse it.

// Compass directions on screen: E is right, N is up the screen
export type Direction = "E" | "NE" | "N" | "NW" | "W" | "SW" | "S" | "SE";

// Counter-clockwise from east, 45 degrees apart (index * 45deg, y pointing up)
export const DIRECTIONS: Direction[] = ["E", "NE", "N", "NW", "W", "SW", "S", "SE"];

// Directions drawn by hand; the rest are mirror images of these
export const DRAWN_DIRECTIONS: Direction[] = ["E", "NE", "N", "SE", "S"];
export const MIRRORED: Partial<Record<Direction, Direction>> = { W: "E", NW: "NE", SW: "SE" };

// An animation is a list of frame names (keys of FRAMES in sprites/index.ts),
// per direction for directional ones. W, NW and SW may be left out: they are
// drawn as mirrors of E, NE and SE. Non-directional animations use "E" (or
// "S" for poses facing the visitor) and are mirrored for the other side.
export type AnimationDef = {
  frames: Partial<Record<Direction, string[]>>;
  // Time-based playback, frames per second
  fps?: number;
  // Distance-based playback for gaits: pixels (in sprite pixels, 1 = one art
  // pixel) travelled per frame, so his feet don't skate
  stride?: number;
  // Defaults to true; false holds the last frame
  loop?: boolean;
};

// Peeking: the engine hides every sprite pixel on the far side of the ledge,
// so he looks like he's behind the element he's peeking around.
// peek_side frames face E and peek out past an element's RIGHT edge: pixels
// with x < PEEK_SIDE_LEDGE_X are hidden. Mirrored to peek past a left edge.
export const PEEK_SIDE_LEDGE_X = 14;
// peek_top frames face S and peek up over an element's TOP edge: pixels with
// y >= PEEK_TOP_LEDGE_Y are hidden.
export const PEEK_TOP_LEDGE_Y = 20;

// Animation names the engine asks for. Sprite modules must provide all of them.
export type AnimationName =
  | "sit" // sitting, facing the visitor (S); idle base pose
  | "sit_blink" // blink while sitting: half, closed, half
  | "sit_look" // glance: look left, look right (non-looping, 2 frames)
  | "sit_mrrp" // greeting: open mouth
  | "sit_tail" // tail flick while sitting
  | "sit_side" // sitting in profile facing E (pausing mid-walk, watching)
  | "stroll" // walking, all 8 directions, distance-based
  | "run" // running, all 8 directions, distance-based
  | "peek_side" // ears, eyes, head, head + paw, blink (past a right edge)
  | "peek_top" // ears, eyes, head (over a top edge)
  | "hop" // crouch, launch, air, land (facing E); greeting hop-out and little pounces
  | "stalk" // crouched, eyes on the cursor, tail twitching (facing E)
  | "stalk_wiggle" // crouched, butt wiggling hard: about to pounce (facing E)
  | "pounce" // launch, stretched out in the air, reaching, landing (facing E); frame by frame
  | "pin" // landed on it: front paws together, rump up, tail wagging (facing E)
  | "bat" // paw swipe at the cursor (facing E)
  | "glare" // sitting in profile, ears back, eye narrowed, tail lashing (facing E)
  | "stretch" // a bow (front stretched out, rump up, yawning), then a back-leg stretch (facing E)
  | "pet" // sitting, eyes shut, leaning into a stroking hand: left, middle, right (facing S); frame by frame
  | "loaf" // lying loaf, idle (facing S)
  | "loaf_pet" // loafing, eyes shut, purring (facing S)
  | "curl" // curled up asleep, breathing (facing S); naps and the hide toggle
  | "curl_pet"; // curled up, eyes shut, purring (facing S)

// ---------------------------------------------------------------------------
// Page transitions (implemented in lib/page-transition.ts)
//
// Listeners run synchronously, in order, during the transition:
// - start: before the old page is captured (no animation yet)
// - rendered: the new route has rendered and its images are ready, before the
//   new page is captured; DOM changes made now appear in the new state
// - animating: the slide has started
// - end: done; animated is false when there was no slide (reduced motion, no
//   view transition support, a skipped or interrupted transition)
export type NavDirection = "forward" | "back";
export type PageTransitionEvent =
  | { phase: "start"; id: number; direction: NavDirection; href: string }
  | { phase: "rendered"; id: number }
  | { phase: "animating"; id: number }
  | { phase: "end"; id: number; animated: boolean };

// ---------------------------------------------------------------------------
// The runtime (implemented in lib/richie/engine.ts)

export type RichieOptions = {
  // Sitting still near the paw button, no movement or loop
  reducedMotion: boolean;
  // How he arrives: "auto" peeks from a perch or strolls in; "wake" starts
  // curled up by the paw button, stretches and greets
  entrance: "auto" | "wake";
  // Where the paw button is, in viewport coordinates (for napping and waking)
  pawRect: () => DOMRect | null;
  // Seed for reproducible behaviour in tests (?richie-seed=); random otherwise
  seed?: number;
  // Expose window.__richie and data-richie-* attributes
  debug?: boolean;
};

export type RichieController = {
  // Walks to the paw, curls up and fades; resolves when he's gone
  nap(): Promise<void>;
  setReducedMotion(reduced: boolean): void;
  destroy(): void;
};

// Elements he can peek from or hide behind carry data-richie-perch:
// "hi" (the Home greeting, his first entrance), "heading" (a page heading),
// "card" (a card or framed image)
export type PerchKind = "hi" | "heading" | "card";
