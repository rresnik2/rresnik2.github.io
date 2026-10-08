import { clipFor, frameBounds } from "./atlas.ts";
import { breakingAway, jiggling, strokes, teasing, velocity, whipped, zippingPast } from "./gestures.ts";
import type { Input } from "./input.ts";
import type { Random } from "./random.ts";
import type { Inset } from "./render.ts";
import { stoppingSpeed, type Gait, type Mover } from "./steering.ts";
import { DIRECTIONS, PEEK_SIDE_LEDGE_X, PEEK_TOP_LEDGE_Y, type AnimationName, type Direction, type PageTransitionEvent } from "./types.ts";
import { BACK } from "./sprites/zones.ts";
import type { Box, Perch, World } from "./world.ts";

type Point = { x: number; y: number };

export type Mode =
  | "boot" // waiting for the page to settle before his entrance
  | "peek" // peeking out from behind something
  | "hop" // hopping (out of a peek, or pouncing)
  | "greet" // saying hello
  | "idle" // sitting (or loafing, or asleep)
  | "travel" // walking or running somewhere
  | "stalk" // crouched, about to pounce on the cursor
  | "bat" // swatting at the cursor
  | "slide" // a page slide is running
  | "waiting" // off screen after a slide, about to stroll back in
  | "nap" // curling up to hide (the paw button)
  | "pet" // being stroked
  | "act"; // a short moment of his own: pinning, glaring, stretching, chirping

// What the engine draws this frame
export type Output = {
  x: number;
  y: number; // feet, document coordinates
  frame: string;
  mirror: boolean;
  clip: Inset | null;
  bubble: { text: string; side: "left" | "right" } | null;
  transitionName: boolean;
  opacity: number;
  hidden: boolean;
};

type PeekStep = { frame: number | null; duration: number; dy?: number };

const GREETED = "richie:v1:greeted";
const SPRITE_HEIGHT_ABOVE_FEET = 29; // sprite px from the top of a frame to his feet
const RUN_ROOM = 140; // px he keeps clear ahead of him during a slide, to run on into
// His legs during a slide go at the pace of a proper run (px/s), as they
// would on the ground, rather than a slow fixed frame rate while he flies along
const SLIDE_RUN = 260;
const MAX_LEAP = 220; // px, his longest pounce
const POUNCE_BREAKS = [0.1, 0.5, 0.82]; // launch, flying, reaching, landing
const HOP_BREAKS = [0.25, 0.5, 0.75];
// Victory laps after a catch and the odd mad dash on his own
const ZOOMIES = true;

type Pose = "sit" | "loaf" | "curl";

const distance = (a: Point, b: Point) => Math.hypot(b.x - a.x, b.y - a.y);

// Where he was when he last left (a trip to /richie, or hiding), so coming
// back he strolls in instead of peeking again
let lastVisit: { leftAt: number } | null = null;

export type BrainOptions = {
  world: World;
  input: Input;
  mover: Mover;
  random: Random;
  scale: number; // CSS px per sprite pixel
  size: { width: number; height: number }; // his box, CSS px
  entrance: "auto" | "wake";
  pawRect: () => DOMRect | null;
};

// Richie's behaviour. Decides what he's doing and where, one tick at a time;
// the engine draws whatever it says.
export class Brain {
  mode: Mode = "boot";
  private readonly o: BrainOptions;
  private now = 0;

  // Animation
  private anim: { name: AnimationName; dir: Direction; start: number; base: number } = {
    name: "sit",
    dir: "S",
    start: 0,
    base: 0,
  };
  private frameIndex: number | null = null;
  private facing: Direction = "S";
  private facingCandidate: { dir: Direction; since: number } | null = null;

  // Presentation
  private clip: Inset | null = null;
  private bubbleText: { text: string; until: number } | null = null;
  private transitionName = false;
  private opacity = 1;
  // Explicit position while not walking (peeks, hops, slides)
  private pinned: Point | null = null;

  // Timers and state
  private modeStart = 0;
  private bootUntil = 0;
  private idleSince = 0;
  private pose: "sit" | "loaf" | "curl" = "sit";
  private poseSince = 0;
  private loafAfter = 0;
  private sleepAfter = 0;
  private fidget: AnimationName | null = null;
  private nextBlink = 0;
  private nextTail = 0;
  private nextLook = 0;
  private energy = 1;
  private cooldownUntil = 0;
  private stillThreshold = 1000;
  private reactionUntil = 0;
  private personal = { dx: 50, dy: 18, anchor: { x: 0, y: 0 } };
  private running = false;
  private handledScroll = -Infinity;
  private handledTap = -Infinity;
  private then: (() => void) | null = null;
  // A trip of his own (running on after a slide): following mustn't re-target it
  private errand = false;

  // Scripted moves
  private peek: { steps: PeekStep[]; start: number; baseX: number; baseY: number; lean: number; done: () => void } | null = null;
  private hop: {
    from: Point;
    to: Point;
    start: number;
    duration: number;
    height: number;
    breaks: readonly number[];
    done: () => void;
  } | null = null;
  private batsLeft = 0;
  private stalkTarget: Point = { x: 0, y: 0 };
  private slide: { id: number; forward: boolean; inView: boolean; vx: number; vy: number } | null = null;
  private waitUntil = 0;
  private napResolve: (() => void) | null = null;
  private napStage: { curlUntil: number; fadeUntil: number } | null = null;

  // Play
  // Eyes on the cursor: at a spot it's holding still ("still"), or teased by
  // it playing about near him, first watching ("watch") then crouched
  // ("taunt"), waiting for it to make a break for it
  private stalkState: {
    armed: "still" | "watch" | "taunt";
    since: number;
    lastTease: number;
    closeSince: number;
    launchAt: number;
    windupUntil: number;
    lead: boolean;
    nextFlurry: number;
    flurryUntil: number;
    lastFlip: number;
    pounces: number;
  } | null = null;
  private petting: {
    pose: Pose;
    since: number;
    counted: number;
    strokes: number;
    limit: number;
    until: number;
    lastStroke: number;
    nextPurr: number;
  } | null = null;
  private act: { until: number; then: () => void; track: boolean } | null = null;
  private batThen: (() => void) | null = null;
  private aloofUntil = 0; // sulking: no following, no games
  private petCooldownUntil = 0;
  private startleAfter = 0;
  private jiggledAt = -Infinity;
  private nearSince = 0; // the cursor close by (maybe about to stroke him)
  private clickTimes: number[] = [];
  private zoomiesAt = Infinity;
  private zoomedAt = -Infinity;
  private teaseCache = { key: "", value: false };
  private stoppedSince = 0;
  private galloping = false;
  // What he last looked like, for telling whether the cursor is on him
  private shown = { frame: "sit_front", mirror: false };

  constructor(options: BrainOptions, now: number) {
    this.o = options;
    this.now = now;
    // Until ready() says the page has settled
    this.bootUntil = Infinity;
    this.modeStart = now;
    this.zoomiesAt = now + options.random.range(120000, 300000);
  }

  // ---------------------------------------------------------------- helpers

  private get mover() {
    return this.o.mover;
  }

  private get pos(): Point {
    return this.pinned ?? { x: this.mover.x, y: this.mover.y };
  }

  private setMode(mode: Mode) {
    this.mode = mode;
    this.modeStart = this.now;
  }

  private play(name: AnimationName, dir: Direction = this.facing, restart = false) {
    if (!restart && this.anim.name === name && this.anim.dir === dir) return;
    this.anim = { name, dir, start: this.now, base: this.mover.travelled };
  }

  private animDone() {
    const clip = clipFor(this.anim.name, this.anim.dir);
    const fps = clip.def.fps ?? 8;
    return ((this.now - this.anim.start) / 1000) * fps >= clip.frames.length;
  }

  // The box his sprite covers, document coordinates
  private box(at: Point = this.pos): Box {
    const { width, height } = this.o.size;
    const s = this.o.scale;
    const top = at.y - (SPRITE_HEIGHT_ABOVE_FEET + 4) * s;
    return { left: at.x - 16 * s, right: at.x - 16 * s + width, top, bottom: top + height - 4 * s };
  }

  private inView(at?: Point) {
    return this.o.world.visibleFraction(this.box(at)) >= 0.4;
  }

  private faceToward(target: Point): Direction {
    return target.x >= this.pos.x ? "E" : "W";
  }

  // 8-way facing from his heading, with hysteresis and a short dwell so he
  // doesn't flicker between two directions. Turning on the spot (barely
  // moving), he faces straight round, so a pivot reads as a turn.
  private updateFacing() {
    if (!this.mover.moving || this.mover.speed < 2) return;
    const degrees = (-this.mover.heading * 180) / Math.PI;
    const sector = ((Math.round(degrees / 45) % 8) + 8) % 8;
    const wanted = DIRECTIONS[sector];
    if (this.mover.speed < 40) {
      this.facing = wanted;
      this.facingCandidate = null;
      return;
    }
    if (wanted === this.facing) {
      this.facingCandidate = null;
      return;
    }
    const current = DIRECTIONS.indexOf(this.facing) * 45;
    const off = Math.abs((((degrees - current) % 360) + 540) % 360 - 180);
    if (off < 22.5 + 12) return;
    if (!this.facingCandidate || this.facingCandidate.dir !== wanted) {
      this.facingCandidate = { dir: wanted, since: this.now };
      return;
    }
    if (this.now - this.facingCandidate.since < 60) return;
    // Big turns pass through the directions in between, one at a time
    const from = DIRECTIONS.indexOf(this.facing);
    const to = sector;
    const steps = (to - from + 8) % 8;
    const next = steps <= 4 ? from + (steps > 2 ? 1 : steps) : from - (8 - steps > 2 ? 1 : 8 - steps);
    this.facing = DIRECTIONS[(next + 8) % 8];
    this.facingCandidate = steps > 2 && steps < 6 ? { dir: wanted, since: this.now - 60 } : null;
  }

  private gaitFor(d: number, urgent = false): Gait {
    // Hysteresis so he doesn't flip between running and walking
    this.running = this.running ? d > 100 || urgent : d > 180 || urgent;
    return this.running ? "run" : "stroll";
  }

  private travel(target: Point, gait: Gait, then: (() => void) | null = null) {
    const clamped = this.o.world.clamp(target.x, target.y);
    this.unpin();
    this.mover.goTo(clamped, gait, this.o.world.bounds(), this.now);
    this.then = then;
    this.errand = false;
    this.setMode("travel");
  }

  private unpin() {
    if (this.pinned) {
      this.mover.x = this.pinned.x;
      this.mover.y = this.pinned.y;
      this.pinned = null;
    }
  }

  private say(text: string, ms: number) {
    this.bubbleText = { text, until: this.now + ms };
  }

  // Ends any game or moment he's in the middle of
  private clearPlay() {
    this.stalkState = null;
    this.petting = null;
    this.act = null;
    this.batThen = null;
    this.errand = false;
    this.frameIndex = null;
  }

  private get cursor(): Point {
    return { x: this.o.input.mouseX, y: this.o.input.mouseY };
  }

  // The box round what he looks like right now, document coordinates
  private artBox(pad = 0): Box {
    const b = frameBounds(this.shown.frame);
    const s = this.o.scale;
    const at = this.pos;
    const left = this.shown.mirror ? 32 - b.right : b.left;
    const right = this.shown.mirror ? 32 - b.left : b.right;
    return {
      left: at.x + (left - 16) * s - pad,
      right: at.x + (right - 16) * s + pad,
      top: at.y + (b.top - SPRITE_HEIGHT_ABOVE_FEET) * s - pad,
      bottom: at.y + (b.bottom - SPRITE_HEIGHT_ABOVE_FEET) * s + pad,
    };
  }

  private cursorOn(p: Point, pad = 0) {
    const b = this.artBox(pad);
    return p.x >= b.left && p.x <= b.right && p.y >= b.top && p.y <= b.bottom;
  }

  // Where stroking him counts, document coordinates
  private backZone(pose: Pose): Box {
    const z = BACK[pose];
    const s = this.o.scale;
    const pad = 3 * s;
    const at = this.pos;
    return {
      left: at.x + (z.left - 16) * s - pad,
      right: at.x + (z.right - 16) * s + pad,
      top: at.y + (z.top - SPRITE_HEIGHT_ABOVE_FEET) * s - pad,
      bottom: at.y + (z.bottom - SPRITE_HEIGHT_ABOVE_FEET) * s + pad,
    };
  }

  // His chest, which the cursor plays around and the pounces aim from
  private get chest(): Point {
    return { x: this.pos.x, y: this.pos.y - 12 * this.o.scale };
  }

  // The cursor playing about near him like a toy on a string, worked out
  // once per new bit of path
  private teased(): boolean {
    const { input } = this.o;
    const key = `${input.samples.at(-1)?.t}|${Math.round(this.pos.x)}|${Math.round(this.pos.y)}`;
    if (this.teaseCache.key !== key) this.teaseCache = { key, value: !!teasing(input.samples, this.now, this.chest) };
    return this.teaseCache.value;
  }

  // A short moment of his own: an animation for a while, then `then`.
  // track keeps him facing the cursor.
  private startAct(name: AnimationName, dir: Direction, ms: number, then: () => void, track = false) {
    this.unpin();
    this.mover.stop();
    this.frameIndex = null;
    this.fidget = null;
    this.facing = dir;
    this.play(name, dir, true);
    this.act = { until: this.now + ms, then, track };
    this.setMode("act");
  }

  private updateAct() {
    const act = this.act!;
    if (act.track) {
      const dir = this.faceToward(this.cursor);
      if (dir !== this.anim.dir) this.play(this.anim.name, dir);
    }
    if (this.now < act.until) return;
    this.act = null;
    act.then();
  }

  private blink() {
    this.fidget = "sit_blink";
    this.play("sit_blink", "S", true);
  }

  private sit() {
    this.clearPlay();
    this.mover.stop();
    this.setMode("idle");
    this.pose = "sit";
    this.poseSince = this.now;
    this.idleSince = this.now;
    this.fidget = null;
    this.frameIndex = null;
    this.clip = null;
    this.play("sit", "S");
    this.scheduleIdle();
  }

  private scheduleIdle() {
    const r = this.o.random;
    this.nextBlink = this.now + r.range(2500, 6000);
    this.nextTail = this.now + r.range(4000, 9000);
    this.nextLook = this.now + r.range(6000, 12000);
    this.loafAfter = r.range(20000, 35000);
    this.sleepAfter = r.range(45000, 80000);
  }

  // ------------------------------------------------------------- entrances

  private enter() {
    const { world, random } = this.o;
    world.refresh();
    if (this.o.entrance === "wake") return this.wake();
    if (lastVisit) return this.strollIn();
    const visible = world.perches.filter((p) => world.visibleFraction(p.box) >= 0.6);
    const perch =
      visible.find((p) => p.kind === "hi") ??
      (random.chance(0.7) ? visible.find((p) => p.kind === "heading") : undefined) ??
      visible.find((p) => p.kind === "card");
    if (perch) this.startPeek(perch);
    else this.strollIn();
  }

  // From just off the nearest side of the screen, strolling to a nice spot
  private strollIn() {
    const view = this.o.world.view();
    const fromLeft = this.mover.x < (view.left + view.right) / 2;
    const y = view.top + (view.bottom - view.top) * this.o.random.range(0.6, 0.8);
    this.pinned = null;
    this.mover.x = fromLeft ? view.left - 40 : view.right + 40;
    this.mover.y = this.o.world.clamp(0, y).y;
    this.mover.heading = fromLeft ? 0 : Math.PI;
    this.facing = fromLeft ? "E" : "W";
    this.travel(this.comfortSpot(fromLeft ? "left" : "right"), "stroll", () => this.greet());
  }

  // From wherever he is (just off screen after a slide) to a nice spot in view
  private strollInFromHere() {
    const view = this.o.world.view();
    const side = this.pos.x < (view.left + view.right) / 2 ? "left" : "right";
    this.travel(this.comfortSpot(side), "stroll", () => this.sit());
  }

  private startPeek(perch: Perch) {
    const { random, world } = this.o;
    const s = this.o.scale;
    const b = perch.box;
    const view = world.view();
    const steps: PeekStep[] = [];
    let lean = 0; // the ledge's slant (an italic letter), sprite px per row
    let landing: Point;
    let hopDir: Direction;

    if (perch.kind === "card") {
      // Over the top edge: ear tips, ears and eyes, then the whole head
      const x = random.range(b.left + 40, Math.max(b.left + 41, b.right - 40));
      this.pinned = { x, y: b.top + (SPRITE_HEIGHT_ABOVE_FEET - PEEK_TOP_LEDGE_Y) * s };
      this.clip = { bottom: 32 - PEEK_TOP_LEDGE_Y };
      this.play("peek_top", "S");
      steps.push({ frame: 0, duration: 700 }, { frame: 1, duration: 1000 }, { frame: 2, duration: 900 });
      landing = { x: x + random.range(-30, 30), y: b.top - 1 };
      hopDir = landing.x >= x ? "E" : "W";
    } else {
      // Round a side edge: from the right unless that's off screen. From
      // "Hi!" always the right, tucked in behind the slanted stroke of the "!"
      const roomRight = b.right + 80 < view.right;
      const hi = perch.kind === "hi" && !!perch.inkRight && roomRight;
      const right = hi || (roomRight ? random.chance(0.5) || b.left - 80 < view.left : false);
      const centre = b.top + (b.bottom - b.top) * (hi ? random.range(0.3, 0.5) : random.range(0.35, 0.65));
      let ledge = right ? b.right : b.left;
      if (hi) {
        // Where the "!" ends at his head's middle, top and bottom (his head
        // spans 6 sprite rows either side of `centre`)
        const edge = (y: number) => {
          const x = perch.inkRight!(y);
          return x !== null && x > b.right - (b.right - b.left) * 0.3 ? x : null;
        };
        const middle = edge(centre);
        const top = edge(centre - 6 * s);
        const bottom = edge(centre + 6 * s);
        if (middle !== null) ledge = middle - 1;
        if (top !== null && bottom !== null) lean = (top - bottom) / s / 12;
      }
      this.pinned = {
        x: right ? ledge + (16 - PEEK_SIDE_LEDGE_X) * s : ledge - (16 - PEEK_SIDE_LEDGE_X) * s,
        y: centre + 13 * s,
      };
      this.clip = right ? { left: PEEK_SIDE_LEDGE_X, lean } : { right: PEEK_SIDE_LEDGE_X };
      this.play("peek_side", right ? "E" : "W");
      steps.push({ frame: 0, duration: random.range(600, 900) }, { frame: 1, duration: random.range(900, 1500) });
      if (random.chance(0.4)) {
        // Ducks back and peeks again a little higher or lower
        const dy = random.range(12, 30) * random.sign();
        steps.push({ frame: 0, duration: 300 }, { frame: null, duration: 450 }, { frame: 0, duration: 500, dy }, { frame: 1, duration: 800, dy });
      }
      const dy = steps.at(-1)?.dy ?? 0;
      steps.push(
        { frame: 2, duration: 700, dy },
        { frame: 3, duration: 500, dy },
        { frame: 4, duration: 150, dy },
        { frame: 3, duration: 300, dy }
      );
      landing = {
        x: right ? b.right + random.range(60, 110) : b.left - random.range(60, 110),
        y: b.bottom + random.range(10, 30),
      };
      hopDir = right ? "E" : "W";
    }

    this.facing = hopDir;
    this.setMode("peek");
    const start = this.pinned!;
    this.peek = {
      steps,
      start: this.now,
      baseX: start.x,
      baseY: start.y,
      lean,
      done: () => {
        this.clip = null;
        const from = { ...this.pinned! };
        const to = world.clamp(landing.x, landing.y);
        this.startHop(from, to, 380, 26, hopDir, () => this.greet());
      },
    };
  }

  private updatePeek() {
    const peek = this.peek!;
    let elapsed = this.now - peek.start;
    for (const step of peek.steps) {
      if (elapsed < step.duration) {
        this.frameIndex = step.frame;
        // Peeking again higher or lower: along the slant of a slanted ledge
        this.pinned = { x: peek.baseX - peek.lean * (step.dy ?? 0), y: peek.baseY + (step.dy ?? 0) };
        if (step.frame === null) this.frameIndex = 0;
        // A hidden step: duck fully behind the element
        if (step.frame === null) this.clipAll(true);
        else this.clipAll(false);
        return;
      }
      elapsed -= step.duration;
    }
    this.clipAll(false);
    this.peek = null;
    peek.done();
  }

  private clipFull: Inset | null = null;
  private clipAll(hidden: boolean) {
    if (hidden && !this.clipFull) {
      this.clipFull = this.clip;
      this.clip = { left: 32 };
    } else if (!hidden && this.clipFull) {
      this.clip = this.clipFull;
      this.clipFull = null;
    }
  }

  private startHop(
    from: Point,
    to: Point,
    duration: number,
    height: number,
    dir: Direction,
    done: () => void,
    anim: "hop" | "pounce" = "hop",
    breaks: readonly number[] = HOP_BREAKS
  ) {
    this.pinned = { ...from };
    this.facing = dir;
    this.play(anim, dir, true);
    this.hop = { from, to, start: this.now, duration, height, breaks, done };
    this.setMode("hop");
  }

  private updateHop() {
    const hop = this.hop!;
    const p = Math.min(1, (this.now - hop.start) / hop.duration);
    const i = hop.breaks.findIndex((b) => p < b);
    this.frameIndex = i < 0 ? hop.breaks.length : i;
    this.pinned = {
      x: hop.from.x + (hop.to.x - hop.from.x) * p,
      y: hop.from.y + (hop.to.y - hop.from.y) * p - Math.sin(Math.PI * p) * hop.height,
    };
    if (p >= 1) {
      this.hop = null;
      this.frameIndex = null;
      this.unpin();
      hop.done();
    }
  }

  private greet() {
    this.sit();
    this.setMode("greet");
    let first = false;
    try {
      first = !sessionStorage.getItem(GREETED);
      sessionStorage.setItem(GREETED, "1");
    } catch {
      first = true;
    }
    if (first || this.o.entrance === "wake") {
      this.say("mrrp!", 1300);
      this.play("sit_mrrp", "S");
    }
  }

  private updateGreet() {
    const t = this.now - this.modeStart;
    if (t > 450 && this.anim.name === "sit_mrrp") this.play("sit", "S");
    if (t > 700 && t < 1100 && this.fidget === null && this.anim.name === "sit") {
      this.fidget = "sit_blink";
      this.play("sit_blink", "S", true);
    }
    if (this.fidget && this.animDone()) {
      this.fidget = null;
      this.play("sit", "S");
    }
    if (t > 1600) this.sit();
  }

  // Waking after being hidden: curled by the paw button, then up and hello
  private wake() {
    const paw = this.o.pawRect();
    if (!paw) return this.strollIn();
    this.pinned = this.o.world.clamp(paw.left + window.scrollX - 28, paw.bottom + window.scrollY - 6);
    this.unpin();
    this.mover.stop();
    this.setMode("idle");
    this.pose = "curl";
    this.play("curl", "S");
    this.then = () => this.startAct("stretch", this.o.random.chance(0.5) ? "E" : "W", 1600, () => this.greet());
    this.waitUntil = this.now + 1200;
  }

  // ----------------------------------------------------------- free will

  private updateFree() {
    const { input, random } = this.o;
    // Waking up (the curled-up entrance): nothing else until he's up
    if (this.mode === "idle" && this.then) return this.idleTimers();

    // Taps (touch): go and see, or a purr if the tap was on him
    if (input.taps.length) {
      const tap = input.taps[input.taps.length - 1];
      input.taps.length = 0;
      if (tap.time !== this.handledTap) {
        this.handledTap = tap.time;
        this.wakeUp();
        if (distance(tap, { x: this.pos.x, y: this.pos.y - 14 * this.o.scale }) < 44) {
          this.sit();
          this.say("prrr", 1200);
          this.fidget = "sit_blink";
          this.play("sit_blink", "S", true);
          return;
        }
        const side = tap.x > this.pos.x ? -1 : 1;
        const target = { x: tap.x + side * random.range(20, 40), y: tap.y + 24 };
        this.travel(target, this.gaitFor(distance(this.pos, target)), () => this.sit());
        return;
      }
    }

    const mouse = input.kind === "mouse" && this.now - input.lastMouseMove < 10000;
    if (mouse) this.mousePolicy();
    else this.viewportPolicy();

    // Arrived (or, belt and braces, stood still with nowhere to go for a
    // moment): on to whatever's next, or sit
    const stopped = this.mode === "travel" && !this.mover.trip && this.mover.speed < 5;
    if (!stopped) this.stoppedSince = 0;
    else this.stoppedSince ||= this.now;
    if (this.mode === "travel" && (!this.mover.moving || (this.stoppedSince && this.now - this.stoppedSince > 250))) {
      const then = this.then;
      this.then = null;
      this.stoppedSince = 0;
      if (then) then();
      else this.sit();
    }
    if (this.mode === "idle") this.idleTimers();
  }

  private mousePolicy() {
    const { input, random, world } = this.o;
    const cursor = this.cursor;
    const here = this.pos;

    if (!input.mouseInside) {
      this.nearSince = 0;
      // The cursor left: walk to where it went and wait there
      if (this.mode === "idle" && distance(here, cursor) > 80) this.travel(cursor, "stroll", () => this.sit());
      return;
    }

    const polite = input.overInteractive || input.buttonDown;
    const dCursor = distance(here, cursor);
    const idle = this.mode === "idle";
    const on = this.cursorOn(cursor, 6);
    const near = on || distance(cursor, { x: here.x, y: here.y - 12 * this.o.scale }) < 60;
    if (near) this.nearSince ||= this.now;
    else this.nearSince = 0;

    // Clicked on: a chirp (or, clicked on and on, a huff)
    if (this.handleClicks()) return;

    // Stroked: purring (stroking doesn't move him, so links nearby don't matter)
    if (idle && !this.then && this.now >= this.petCooldownUntil && this.stroked(this.pose)) return this.startPet();

    // Sulking after being pestered: no games, no following
    if (this.now < this.aloofUntil) return;

    // The cursor whipped straight through him: a fright
    if (idle && this.pose === "sit" && !this.fidget && !polite && this.now >= this.startleAfter) {
      const v = whipped(input.samples, this.artBox(), this.now);
      if (v) return this.startle();
    }

    // Played about near him like a toy: he stops to watch it, then crouches
    const teased = !polite && this.teased();
    const free = (idle && !this.then) || (this.mode === "travel" && !this.errand);
    if (teased && free && this.energy >= 0.2 && this.now >= this.cooldownUntil) {
      this.wakeUp();
      return this.startStalk("watch");
    }

    // Jiggling the cursor right at his face: swat at it
    const dChest = distance(cursor, this.chest);
    if (!polite && idle && this.energy >= 0.2 && dChest < 70 && jiggling(input.samples, this.now, this.jiggledAt)) {
      this.jiggledAt = this.now;
      this.energy -= 0.15;
      this.wakeUp();
      return this.startBat(cursor, random.chance(0.5) ? 1 : 2);
    }
    // The cursor holding still near him (not on him): stalk it, then pounce
    if (
      !polite &&
      !on &&
      idle &&
      this.pose === "sit" &&
      this.energy >= 0.2 &&
      this.now >= this.cooldownUntil &&
      dCursor < 150 &&
      dCursor > 30 &&
      this.now - input.lastMouseMove >= this.stillThreshold &&
      this.now - input.lastMouseMove < 8000
    ) {
      this.stillThreshold = random.range(700, 1600);
      return this.startStalk("still");
    }
    // Now and then, out of nowhere, a mad dash
    if (ZOOMIES && idle && this.pose === "sit" && !this.fidget && this.energy >= 0.9 && this.now >= this.zoomiesAt && this.inView()) {
      return this.zoomies();
    }

    // Not while he's busy with a trip of his own, or while it's being played
    // about near him (he watches rather than trotting after it), or lying down
    // with a hand coming to stroke him
    if (this.errand || teased) return;
    if (dChest < 200 && this.now - input.lastMouseMove < 300 && input.mouseSpeed > 120 && this.mode === "idle") return;
    if (this.pose !== "sit" && near && this.now - this.nearSince < 1500) return;
    // A hand resting on him keeps him where he is (he might be about to get
    // stroked)
    if (on && !polite) {
      if (this.mode === "travel" && this.now - this.nearSince > 250) this.sit();
      return;
    }

    // Following: to a spot of his own beside the cursor
    if (distance(cursor, this.personal.anchor) > 200) {
      this.personal = {
        dx: random.range(36, 80) * random.sign(),
        dy: random.range(10, 30),
        anchor: cursor,
      };
    }
    let { dx, dy } = this.personal;
    const reach = Math.hypot(dx, dy);
    if (polite && reach < 110) {
      dx = (dx / reach) * 110;
      dy = (dy / reach) * 110;
    }
    const target = world.clamp(cursor.x + dx, cursor.y + dy);
    const d = distance(here, target);
    const urgent = input.mouseSpeed > 700;

    if (idle) {
      if (d > 40) {
        if (!this.reactionUntil) this.reactionUntil = this.now + random.range(150, 500);
        if (this.now >= this.reactionUntil) {
          this.reactionUntil = 0;
          this.wakeUp();
          this.travel(target, this.gaitFor(d, urgent && d > 200), () => this.sit());
        }
      } else {
        this.reactionUntil = 0;
      }
    } else if (this.mode === "travel" && this.mover.trip) {
      this.mover.follow(world.clamp(target.x, target.y), this.gaitFor(d, urgent && d > 200), world.bounds(), this.now);
    }
  }

  // Touch screens and keyboards: after scrolling, catch up to a comfortable
  // spot in the lower part of the screen
  private viewportPolicy() {
    const { input, world, random } = this.o;
    if (input.zoomed || !input.scrollSettled || input.lastScroll === this.handledScroll) return;
    if (this.mode !== "idle" && this.mode !== "travel") return;
    this.handledScroll = input.lastScroll;
    const view = world.view();
    const height = view.bottom - view.top;
    const here = this.pos;
    const visible = world.visibleFraction(this.box());
    const bandTop = view.top + height * 0.45;
    const bandBottom = view.bottom - height * 0.04;
    const outside = visible < 0.4 || here.y < bandTop - height * 0.35 || here.y > bandBottom + height * 0.35;
    if (!outside) return;
    const side = here.x < (view.left + view.right) / 2 ? "left" : "right";
    const target = this.comfortSpot(side);
    this.wakeUp();
    if (visible === 0) {
      // Far off: appear just outside the screen edge he'd come from, then run in
      const fromBelow = here.y > view.bottom;
      this.pinned = null;
      this.mover.x = target.x + random.range(-30, 30);
      this.mover.y = fromBelow ? view.bottom + 30 : view.top - 10;
      this.mover.stop();
    }
    this.travel(target, this.gaitFor(distance(this.pos, target), visible === 0), () => this.sit());
  }

  private comfortSpot(side: "left" | "right"): Point {
    const { world, random } = this.o;
    const view = world.view();
    const w = view.right - view.left;
    const h = view.bottom - view.top;
    const fx = side === "left" ? random.range(0.12, 0.3) : random.range(0.7, 0.88);
    return world.clamp(view.left + w * fx, view.top + h * random.range(0.62, 0.82));
  }

  private wakeUp() {
    if (this.pose !== "sit") {
      this.pose = "sit";
      this.poseSince = this.now;
    }
    this.idleSince = this.now;
  }

  private idleTimers() {
    const { input, random } = this.o;
    const quietSince = Math.max(this.idleSince, input.lastActivity);
    const quiet = this.now - quietSince;

    // Woken by the visitor (but a hand coming to rest on him gets a moment to
    // start stroking first). After a proper sleep he has a good stretch.
    const settling = this.nearSince && this.now - this.nearSince < 1500;
    if (this.pose !== "sit" && input.lastActivity > this.poseSince + 50 && !this.then && !settling) {
      const slept = this.now - this.poseSince;
      const stretch = (this.pose === "curl" && slept > 15000) || (this.pose === "loaf" && slept > 20000 && random.chance(0.5));
      this.pose = "sit";
      this.poseSince = this.now;
      if (stretch) {
        return this.startAct("stretch", random.chance(0.5) ? "E" : "W", 1600, () => {
          this.sit();
          this.blink();
        });
      }
      this.blink();
      return;
    }
    // A delayed follow-up (waking from the curled-up entrance)
    if (this.then && this.now >= this.waitUntil) {
      const then = this.then;
      this.then = null;
      return then();
    }
    if (this.pose === "sit" && quiet > this.sleepAfter) {
      this.pose = "curl";
      this.poseSince = this.now;
      this.fidget = null;
      return this.play("curl", "S");
    }
    if (this.pose === "sit" && quiet > this.loafAfter) {
      this.pose = "loaf";
      this.poseSince = this.now;
      this.fidget = null;
      return this.play("loaf", "S");
    }
    if (this.pose === "loaf" && quiet > this.sleepAfter) {
      this.pose = "curl";
      this.poseSince = this.now;
      return this.play("curl", "S");
    }
    if (this.pose !== "sit") return;

    if (this.fidget) {
      if (this.animDone()) {
        this.fidget = null;
        this.play("sit", "S");
      }
      return;
    }
    if (this.now >= this.nextBlink) {
      this.fidget = "sit_blink";
      this.play("sit_blink", "S", true);
      // Sometimes a double blink
      this.nextBlink = this.now + (random.chance(0.2) ? 350 : random.range(2500, 6000));
    } else if (this.now >= this.nextTail) {
      this.fidget = "sit_tail";
      this.play("sit_tail", "S", true);
      this.nextTail = this.now + random.range(4000, 9000);
    } else if (this.now >= this.nextLook) {
      this.fidget = "sit_look";
      this.play("sit_look", "S", true);
      this.nextLook = this.now + random.range(6000, 12000);
    }
  }

  // ----------------------------------------------------------------- play

  // Eyes on the cursor. "still": it's holding still near him, and he pounces
  // in a moment. "watch": it's being played about near him, and he sits up
  // and follows it with his eyes; kept up, he drops into a crouch ("taunt"),
  // butt wiggling, waiting for it to make a break for it.
  private startStalk(armed: "still" | "watch") {
    const { random } = this.o;
    const cursor = this.cursor;
    this.unpin();
    this.mover.stop();
    this.fidget = null;
    this.facing = this.faceToward(cursor);
    this.play(armed === "watch" ? "sit_side" : "stalk", this.facing, true);
    this.stalkTarget = cursor;
    this.stalkState = {
      armed,
      since: this.now,
      lastTease: this.now,
      closeSince: 0,
      launchAt: armed === "still" ? this.now + random.range(500, 1100) : Infinity,
      windupUntil: 0,
      lead: true,
      nextFlurry: this.now + random.range(900, 1800),
      flurryUntil: 0,
      lastFlip: this.now,
      pounces: 0,
    };
    this.setMode("stalk");
  }

  private updateStalk() {
    const { input, random, world } = this.o;
    const st = this.stalkState!;
    const cursor = this.cursor;
    if (input.overInteractive || input.buttonDown || !input.mouseInside) return this.sit();

    // Keep facing it, without flip-flopping
    const dx = cursor.x - this.pos.x;
    const want: Direction = dx > 12 ? "E" : dx < -12 ? "W" : this.facing;
    if (want !== this.facing && this.now - st.lastFlip > 350) {
      this.facing = want;
      st.lastFlip = this.now;
    }

    // The wind-up: a hard butt wiggle, then he goes
    if (st.windupUntil) {
      this.play("stalk_wiggle", this.facing);
      if (this.now >= st.windupUntil) this.startPounce(st.lead);
      return;
    }

    if (st.armed === "still") {
      this.play("stalk", this.facing);
      // It made a break for it: after it
      if (breakingAway(input.samples, this.now, this.stalkTarget)) {
        st.windupUntil = this.now + random.range(110, 200);
        return;
      }
      // The cursor got away: forget it and follow instead
      if (distance(cursor, this.stalkTarget) > 60) return this.sit();
      if (this.now < st.launchAt) return;
      // A little hop onto it, then swats
      const from = this.pos;
      const dir = cursor.x >= from.x ? 1 : -1;
      const to = world.clamp(cursor.x - dir * 10, cursor.y + 10);
      this.stalkState = null;
      this.energy -= 0.2;
      this.cooldownUntil = this.now + random.range(2000, 4000);
      this.startHop(from, to, random.range(280, 380), 18, dir > 0 ? "E" : "W", () =>
        this.startBat(cursor, Math.floor(random.range(1, 4)))
      );
      return;
    }

    // Teased: watching it, then crouched
    const chest = this.chest;
    const d = distance(cursor, chest);
    if (this.teased()) st.lastTease = this.now;
    if (st.armed === "watch" && this.now - st.since >= 700 && this.now - st.lastTease < 300) {
      st.armed = "taunt";
      if (random.chance(0.3)) this.say("ek ek", 900);
    }

    // It made a break for it, or zipped right past his nose: pounce
    if (breakingAway(input.samples, this.now, chest)) {
      st.windupUntil = this.now + (st.armed === "watch" ? 200 : random.range(110, 180));
      st.lead = true;
      return;
    }
    if (zippingPast(input.samples, this.now, chest)) {
      st.windupUntil = this.now + 100;
      st.lead = true;
      return;
    }
    // It crept up close and slowed down: get it
    const v = velocity(input.samples, this.now, 150);
    if (d < 70 && (!v || Math.hypot(v.x, v.y) < 150)) {
      st.closeSince ||= this.now;
      if (this.now - st.closeSince >= 150) {
        st.windupUntil = this.now + 250;
        st.lead = false;
        return;
      }
    } else {
      st.closeSince = 0;
    }

    if (st.armed === "watch") {
      this.play("sit_side", this.facing);
    } else {
      // Butt wiggles, more of them the closer it gets
      if (this.now >= st.nextFlurry) {
        st.flurryUntil = this.now + 400;
        st.nextFlurry = this.now + (d < 120 ? random.range(500, 900) : random.range(1200, 2400));
      }
      this.play(this.now < st.flurryUntil || d < 90 ? "stalk_wiggle" : "stalk", this.facing);
    }

    // It's stopped, within reach: crouch (if he was only watching) and get it
    const still = this.now - input.lastMouseMove;
    if (still > 600 && d < 200) {
      st.armed = "taunt";
      st.windupUntil = this.now + 300;
      st.lead = false;
      return;
    }
    // Lost interest: it's gone still a way off, wandered off, or stopped playing
    if ((still > 2000 && d > 150) || d > 380 || this.now - st.lastTease > 2500) {
      this.sit();
      this.fidget = "sit_tail";
      this.play("sit_tail", "S", true);
      return;
    }
    // He can't hold out forever
    if (st.armed === "taunt" && this.now - st.since > 10000) {
      st.windupUntil = this.now + 150;
      st.lead = true;
    }
  }

  // The big leap: to where the cursor is heading (lead), or where it is
  private startPounce(lead: boolean) {
    const { input, random, world } = this.o;
    const st = this.stalkState!;
    const s = this.o.scale;
    const cursor = this.cursor;
    const from = this.pos;
    let v = (lead && velocity(input.samples, this.now, 100)) || { x: 0, y: 0 };
    const speed = Math.hypot(v.x, v.y);
    if (speed > 1100) v = { x: (v.x / speed) * 1100, y: (v.y / speed) * 1100 };
    const flight = (length: number) => Math.min(560, Math.max(300, 240 + 1.1 * length));
    let aim = cursor;
    for (let i = 0, ms = 380; i < 2; i++) {
      aim = { x: cursor.x + (v.x * 0.85 * ms) / 1000, y: cursor.y + (v.y * 0.85 * ms) / 1000 };
      ms = flight(distance(from, aim));
    }
    const dir = aim.x >= from.x ? 1 : -1;
    // His front paws come down on it, so his feet land a little short
    let to = { x: aim.x - dir * 8 * s, y: aim.y + 3 * s };
    const length = distance(from, to);
    if (length > MAX_LEAP) to = { x: from.x + ((to.x - from.x) * MAX_LEAP) / length, y: from.y + ((to.y - from.y) * MAX_LEAP) / length };
    const view = world.view();
    to = world.clamp(Math.min(view.right - 40, Math.max(view.left + 40, to.x)), Math.min(view.bottom - 12, Math.max(view.top + 50, to.y)));
    const leap = distance(from, to);
    this.energy -= st.pounces ? 0.1 : 0.15;
    this.cooldownUntil = this.now + random.range(2000, 4000);
    this.startHop(
      from,
      to,
      flight(leap),
      Math.min(46, Math.max(12, 10 + 0.16 * leap)),
      dir > 0 ? "E" : "W",
      () => this.land(to, dir),
      "pounce",
      POUNCE_BREAKS
    );
  }

  private land(at: Point, dir: number) {
    const { input, random } = this.o;
    const s = this.o.scale;
    const st = this.stalkState;
    const paws = { x: at.x + dir * 8 * s, y: at.y - 2 * s };
    const recent = [this.cursor, ...input.samples.filter((p) => this.now - p.t < 140)];
    const caught = input.mouseInside && Math.min(...recent.map((p) => distance(p, paws))) < 26;
    const facing: Direction = dir > 0 ? "E" : "W";
    if (caught) {
      this.stalkState = null;
      this.say("mrrp!", 1100);
      this.startAct("pin", facing, random.range(900, 1300), () => this.afterCatch());
      return;
    }
    // Missed: sometimes straight after it again
    if (st && st.pounces < 2 && this.energy >= 0.15 && distance(this.cursor, this.pos) < 240 && random.chance(0.55)) {
      st.pounces++;
      st.windupUntil = this.now + 150;
      st.lead = true;
      this.facing = this.faceToward(this.cursor);
      this.play("stalk_wiggle", this.facing, true);
      this.setMode("stalk");
      return;
    }
    // Otherwise he meant to do that
    this.stalkState = null;
    this.startAct("sit_side", this.faceToward(this.cursor), random.range(1200, 1800), () => this.sit(), true);
  }

  private afterCatch() {
    if (ZOOMIES && this.energy >= 0.4 && this.now - this.zoomedAt > 60000 && this.o.random.chance(0.25)) return this.zoomies();
    this.sit();
    this.blink();
  }

  // A mad dash up the screen and back, then sitting as if nothing happened
  private zoomies() {
    const { random, world } = this.o;
    const view = world.view();
    const here = this.pos;
    const h = view.bottom - view.top;
    this.zoomedAt = this.now;
    this.zoomiesAt = this.now + random.range(180000, 360000);
    this.wakeUp();
    this.fidget = null;
    const up = world.clamp(here.x + random.range(-80, 80), Math.max(view.top + h * 0.2, here.y - random.range(160, 240)));
    this.running = true;
    this.travel(up, "run", () => {
      const cursor = this.o.input.mouseInside ? this.cursor : here;
      const back = world.clamp(cursor.x + random.range(50, 90) * random.sign(), Math.min(view.bottom - 40, cursor.y + random.range(10, 30)));
      this.running = true;
      this.travel(back, "run", () => {
        this.sit();
        this.blink();
      });
      this.errand = true;
    });
    this.errand = true;
  }

  private startBat(cursor: Point, count: number) {
    this.unpin();
    this.mover.stop();
    this.facing = this.faceToward(cursor);
    this.batsLeft = count;
    this.play("bat", this.facing, true);
    this.setMode("bat");
  }

  private updateBat() {
    if (!this.animDone()) return;
    this.batsLeft--;
    if (this.batsLeft > 0) return this.play("bat", this.facing, true);
    const then = this.batThen;
    this.batThen = null;
    if (then) then();
    else this.sit();
  }

  // Whipped past: a jump back, a "!", and a glare
  private startle() {
    const { random, world } = this.o;
    const from = this.pos;
    const cursor = this.cursor;
    const away = cursor.x > from.x ? -1 : 1;
    const to = world.clamp(from.x + away * random.range(16, 26), from.y + random.range(-4, 4));
    const face: Direction = away > 0 ? "W" : "E";
    this.startleAfter = this.now + 30000;
    this.say("!", 900);
    this.startHop(from, to, 260, 22, face, () => this.startAct("glare", this.faceToward(this.cursor), random.range(1100, 1600), () => this.sit(), true));
  }

  // ------------------------------------------------------------- clicks

  // Clicked on: a chirp. Clicked on and on: ears back, a huff, and off he goes.
  private handleClicks(): boolean {
    const { input } = this.o;
    const clicks = input.clicks.splice(0).filter((c) => this.now - c.time < 300 && this.cursorOn(c, 4));
    if (!clicks.length || (this.mode !== "idle" && this.mode !== "travel")) return false;
    this.clickTimes = [...this.clickTimes.filter((t) => this.now - t < 3000), ...clicks.map((c) => c.time)];
    this.wakeUp();
    this.sit();
    if (this.clickTimes.length >= 4) {
      this.clickTimes = [];
      this.say("mrrow.", 1100);
      this.startAct("glare", this.faceToward(this.cursor), 1300, () => this.walkOff(), true);
      return true;
    }
    this.say(this.clickTimes.length === 1 ? "mrrp?" : "mrrp", 900);
    this.startAct("sit_mrrp", "S", 450, () => {
      this.sit();
      this.blink();
    });
    return true;
  }

  // Off a little way from the cursor, to sit with his back to it for a bit
  private walkOff() {
    const { random, world } = this.o;
    const here = this.pos;
    let side = this.cursor.x > here.x ? -1 : 1;
    let to = world.clamp(here.x + side * random.range(70, 130), here.y + random.range(-20, 20));
    if (Math.abs(to.x - here.x) < 40) {
      side = -side;
      to = world.clamp(here.x + side * random.range(70, 130), here.y + random.range(-20, 20));
    }
    this.travel(to, "stroll", () => {
      this.sit();
      this.fidget = "sit_tail";
      this.play("sit_tail", "S", true);
      this.aloofUntil = this.now + random.range(4000, 7000);
    });
    this.errand = true;
  }

  // -------------------------------------------------------------- petting

  // Two or more strokes over his back just now
  private stroked(pose: Pose) {
    const { ends, active } = strokes(this.o.input.samples, this.backZone(pose), this.now - 2500, this.now);
    return ends.length >= 2 && (active || this.now - ends[ends.length - 1] < 300);
  }

  private startPet() {
    const { random, input } = this.o;
    const pose = this.pose;
    const { ends } = strokes(input.samples, this.backZone(pose), this.now - 2500, this.now);
    this.mover.stop();
    this.fidget = null;
    this.reactionUntil = 0;
    this.setMode("pet");
    this.petting = {
      pose,
      since: this.now,
      counted: ends.at(-1) ?? this.now,
      strokes: ends.length,
      limit: Math.floor(random.range(7, 14)),
      until: this.now + random.range(6000, 10000),
      lastStroke: this.now,
      nextPurr: this.now + random.range(2600, 4200),
    };
    this.say("prrr", 1400);
    this.showPet();
  }

  private showPet() {
    const pose = this.petting!.pose;
    if (pose === "sit") {
      this.play("pet", "S");
      this.frameIndex ??= 1;
    } else {
      this.frameIndex = null;
      this.play(pose === "loaf" ? "loaf_pet" : "curl_pet", "S");
    }
  }

  private updatePet() {
    const { input, random } = this.o;
    const p = this.petting!;
    if (!input.mouseInside) return this.endPet();
    const { ends, active } = strokes(input.samples, this.backZone(p.pose), Math.max(p.since - 600, this.now - 3000), this.now);
    for (const end of ends) {
      if (end <= p.counted) continue;
      p.counted = end;
      p.strokes++;
      p.lastStroke = this.now;
    }
    if (active) p.lastStroke = this.now;
    // Stroked awake from a curl, he comes up to a loaf
    if (p.pose === "curl" && p.strokes >= 5) {
      p.pose = this.pose = "loaf";
      this.poseSince = this.now;
      this.showPet();
    }
    // Sitting, he leans his head into the hand
    if (p.pose === "sit") {
      const dx = this.cursor.x - this.pos.x;
      const edge = 5 * this.o.scale;
      const lean = this.frameIndex ?? 1;
      if (dx < -edge - (lean === 0 ? 0 : 4)) this.frameIndex = 0;
      else if (dx > edge + (lean === 2 ? 0 : 4)) this.frameIndex = 2;
      else if (Math.abs(dx) < edge - 4) this.frameIndex = 1;
    }
    if (this.now >= p.nextPurr) {
      this.say(random.chance(0.5) ? "prrr" : "prrrr", 1400);
      p.nextPurr = this.now + random.range(2600, 4200);
    }
    if (p.strokes >= p.limit || this.now > p.until) return this.loveNip();
    if (this.now - p.lastStroke > 1800) this.endPet();
  }

  private endPet() {
    const pose = this.petting!.pose;
    this.petting = null;
    this.frameIndex = null;
    this.setMode("idle");
    this.pose = pose;
    this.idleSince = this.poseSince = this.now;
    if (pose === "sit") {
      this.play("sit", "S");
      this.blink();
    } else {
      this.play(pose, "S");
    }
  }

  // Enough is enough: a swat at the hand, a hop away and a flick of the tail
  private loveNip() {
    const { random, world } = this.o;
    this.petting = null;
    this.frameIndex = null;
    this.petCooldownUntil = this.now + random.range(10000, 15000);
    this.wakeUp();
    this.say("mrr!", 800);
    this.startBat(this.cursor, 1);
    this.batThen = () => {
      const from = this.pos;
      const away = this.cursor.x > from.x ? -1 : 1;
      const to = world.clamp(from.x + away * random.range(40, 70), from.y + random.range(-10, 10));
      this.startHop(from, to, 320, 16, away > 0 ? "E" : "W", () => {
        this.sit();
        this.fidget = "sit_tail";
        this.play("sit_tail", "S", true);
        this.aloofUntil = this.now + random.range(4000, 7000);
      });
    };
  }

  // ---------------------------------------------------------- page slides

  transition(event: PageTransitionEvent) {
    const { world, random } = this.o;
    if (event.phase === "start") {
      this.peek = null;
      this.hop = null;
      this.clearPlay();
      // The cursor's path so far was over the old page
      this.o.input.samples = [];
      this.bubbleText = null;
      const here = this.pos;
      const inView = this.mode !== "boot" && this.inView();
      this.slide = { id: event.id, forward: event.direction === "forward", inView, vx: here.x - window.scrollX, vy: here.y - window.scrollY };
      this.pinned = { ...here };
      this.mover.stop();
      this.clip = null;
      this.transitionName = inView;
      if (inView) {
        this.facing = this.slide.forward ? "E" : "W";
        this.play("run", this.facing, true);
      }
      this.setMode("slide");
      return;
    }
    const slide = this.slide;
    if (!slide || slide.id !== event.id) return;

    if (event.phase === "rendered") {
      world.refresh();
      const view = world.view();
      const vw = view.right - view.left;
      const vh = view.bottom - view.top;
      const dir = slide.forward ? 1 : -1;
      if (slide.inView) {
        // He runs a little way in the direction of travel while the pages
        // swap underneath; the slide CSS animates him from the old spot. He
        // stays inside his bounds, keeping room ahead to run on into once
        // the slide ends
        const headerBottom = world.headerBottom - view.top;
        const bounds = world.bounds();
        const left = bounds.left - view.left;
        const right = Math.min(vw, bounds.right - view.left);
        const ahead = dir > 0 ? right - RUN_ROOM - slide.vx : slide.vx - (left + RUN_ROOM);
        const run = Math.max(0, Math.min(random.range(40, Math.max(41, vw * 0.25)), ahead));
        const nvx = Math.min(right, Math.max(left, slide.vx + dir * run));
        const nvy = Math.min(vh - 12, Math.max(headerBottom + 60, slide.vy + random.range(-10, 10)));
        this.pinned = { x: view.left + nvx, y: view.top + nvy };
        const root = document.documentElement;
        root.style.setProperty("--richie-dx", `${slide.vx - nvx}px`);
        root.style.setProperty("--richie-dy", `${slide.vy - nvy}px`);
        root.dataset.richieRun = "";
      } else {
        // He "rode away" with the old page: start just outside the nearest edge
        let vx = slide.vx - dir * vw;
        let vy = slide.vy;
        vx = Math.min(vw + 80, Math.max(-80, vx));
        vy = Math.min(vh + 80, Math.max(-80, vy));
        if (vx > -40 && vx < vw + 40 && vy > -40 && vy < vh + 40) {
          const edges = [
            { d: vx + 40, x: -40, y: vy },
            { d: vw + 40 - vx, x: vw + 40, y: vy },
            { d: vy + 40, x: vx, y: -40 },
            { d: vh + 40 - vy, x: vx, y: vh + 40 },
          ].sort((a, b) => a.d - b.d);
          vx = edges[0].x;
          vy = edges[0].y;
        }
        this.pinned = { x: view.left + vx, y: Math.max(world.headerBottom + 40, view.top + vy) };
      }
      return;
    }

    if (event.phase === "end") {
      const root = document.documentElement;
      root.style.removeProperty("--richie-dx");
      root.style.removeProperty("--richie-dy");
      delete root.dataset.richieRun;
      this.transitionName = false;
      this.slide = null;
      world.refresh();
      if (slide.inView && event.animated) {
        // Runs on a little, as far as there's room, slows and sits. Following
        // the cursor waits until he's stopped, or he'd swerve off toward the
        // menu at full speed.
        const dir = slide.forward ? 1 : -1;
        const here = this.pinned ?? this.pos;
        const bounds = world.bounds();
        const room = dir > 0 ? bounds.right - here.x : here.x - bounds.left;
        const runout = Math.min(random.range(120, 260), room - 20);
        this.unpin();
        if (runout < 50) {
          this.sit();
        } else {
          this.mover.heading = slide.forward ? 0 : Math.PI;
          this.mover.speed = Math.min(260, stoppingSpeed(runout));
          this.running = true;
          this.travel({ x: here.x + dir * runout, y: here.y + random.range(-20, 20) }, "run", () => this.sit());
          this.errand = true;
        }
      } else if (slide.inView) {
        // No slide (reduced motion): he simply comes along
        this.pinned = { x: slide.vx + window.scrollX, y: Math.max(world.headerBottom + 40, slide.vy + window.scrollY) };
        this.unpin();
        this.sit();
      } else {
        this.unpin();
        this.waitUntil = this.now + random.range(400, 1400);
        this.setMode("waiting");
      }
    }
  }

  // Back/forward, or any navigation he wasn't told about
  unannouncedNavigation(previousScroll: Point) {
    const { world } = this.o;
    const here = this.pos;
    const wasInView = this.lastInView;
    world.refresh();
    this.peek = null;
    this.hop = null;
    this.clearPlay();
    this.o.input.samples = [];
    this.clip = null;
    if (this.mode === "boot" || this.mode === "nap") return;
    if (wasInView) {
      this.pinned = {
        x: here.x - previousScroll.x + window.scrollX,
        y: Math.max(world.headerBottom + 40, here.y - previousScroll.y + window.scrollY),
      };
      this.unpin();
      this.sit();
    } else {
      this.strollIn();
    }
  }

  // ------------------------------------------------------------------ nap

  nap(): Promise<void> {
    return new Promise((resolve) => {
      const paw = this.o.pawRect();
      if (!paw || this.mode === "boot" || !this.inView()) return resolve();
      this.napResolve = resolve;
      this.hop = null;
      this.clearPlay();
      const target = { x: paw.left + window.scrollX - 28, y: paw.bottom + window.scrollY - 6 };
      const d = distance(this.pos, target);
      this.wakeUp();
      this.travel(target, d > 500 ? "run" : "stroll", () => {
        this.mover.stop();
        this.setMode("nap");
        this.play("curl", "S");
        this.napStage = { curlUntil: this.now + 1200, fadeUntil: this.now + 1500 };
      });
      // While walking there, nothing distracts him
      this.napping = true;
    });
  }

  private napping = false;
  private lastInView = false;

  // The page is ready (fonts loaded, browser idle): start the entrance soon
  ready(now: number) {
    this.bootUntil = now + this.o.random.range(400, 900);
  }

  private updateNap() {
    const stage = this.napStage!;
    if (this.now >= stage.curlUntil) this.opacity = 0;
    if (this.now >= stage.fadeUntil + 50) {
      this.napStage = null;
      this.napResolve?.();
      this.napResolve = null;
    }
  }

  // ----------------------------------------------------------------- tick

  update(now: number, dt: number): Output {
    this.now = now;
    const { input } = this.o;
    this.energy = Math.min(1, this.energy + 0.15 * dt);

    const hidden = input.dialogOpen;
    if (!hidden && !input.hidden) {
      switch (this.mode) {
        case "boot":
          if (now >= this.bootUntil) this.enter();
          break;
        case "peek":
          this.updatePeek();
          break;
        case "hop":
          this.updateHop();
          break;
        case "greet":
          this.updateGreet();
          break;
        case "stalk":
          this.updateStalk();
          break;
        case "bat":
          this.updateBat();
          break;
        case "waiting":
          if (now >= this.waitUntil) this.strollInFromHere();
          break;
        case "nap":
          this.updateNap();
          break;
        case "pet":
          this.updatePet();
          break;
        case "act":
          this.updateAct();
          break;
        case "slide":
          break;
        case "travel":
        case "idle":
          if (this.napping && this.mode === "travel") {
            if (!this.mover.moving) {
              this.napping = false;
              const then = this.then;
              this.then = null;
              then?.();
            }
          } else {
            this.updateFree();
          }
          break;
      }
      if (!this.pinned && this.mode !== "slide") this.mover.update(dt, now);
    }

    // Walking animations follow his gait and heading
    if (this.mode === "travel") {
      this.updateFacing();
      // Legs to suit how fast he's actually going (with a little hysteresis),
      // whatever kind of trip it is: speeding up from a stop starts with
      // walking legs, slowing from a run keeps galloping until he's slow
      const moving = this.mover.speed > 4 || this.mover.sniffing;
      this.galloping = this.galloping ? this.mover.speed > 90 : this.mover.speed > 110;
      if (moving) this.play(this.galloping ? "run" : "stroll", this.facing);
    }

    if (this.bubbleText && now > this.bubbleText.until) this.bubbleText = null;
    this.lastInView = this.mode !== "boot" && this.inView();

    const here = this.pos;
    const { frame, mirror } = this.resolveFrame();
    this.shown = { frame, mirror };
    const view = this.o.world.view();
    return {
      x: here.x,
      y: here.y,
      frame,
      mirror,
      clip: this.clip,
      bubble: this.bubbleText
        ? { text: this.bubbleText.text, side: here.x > (view.left + view.right) / 2 + (view.right - view.left) * 0.25 ? "left" : "right" }
        : null,
      transitionName: this.transitionName,
      opacity: this.opacity,
      hidden,
    };
  }

  private resolveFrame() {
    const clip = clipFor(this.anim.name, this.anim.dir);
    const n = clip.frames.length;
    let i = 0;
    if (this.frameIndex !== null) {
      i = Math.min(n - 1, this.frameIndex);
    } else if (clip.def.stride) {
      i =
        this.mode === "slide"
          ? Math.floor((((this.now - this.anim.start) / 1000) * SLIDE_RUN) / (clip.def.stride * this.o.scale)) % n
          : Math.floor((this.mover.travelled - this.anim.base) / (clip.def.stride * this.o.scale)) % n;
    } else if (clip.def.fps) {
      const k = Math.floor(((this.now - this.anim.start) / 1000) * clip.def.fps);
      i = clip.def.loop === false ? Math.min(n - 1, k) : k % n;
    }
    return { frame: clip.frames[Math.max(0, i)], mirror: clip.mirror };
  }

  // Whether he needs every frame right now (otherwise the engine sleeps)
  busy() {
    if (this.o.input.dialogOpen || this.o.input.hidden) return false;
    if (this.mode === "slide") return !!this.slide?.inView;
    if (["peek", "hop", "greet", "stalk", "bat", "nap", "pet", "act"].includes(this.mode)) return true;
    if (this.mover.moving || this.mode === "travel") return true;
    if (this.fidget) return true;
    return false;
  }

  // How long the engine may sleep before something happens on its own, ms
  nextEventIn(): number {
    const now = this.now;
    const times: number[] = [];
    if (this.mode === "boot") times.push(this.bootUntil);
    if (this.mode === "waiting") times.push(this.waitUntil);
    if (this.mode === "idle") {
      if (this.then) times.push(this.waitUntil);
      if (this.pose === "sit") times.push(this.nextBlink, this.nextTail, this.nextLook);
      const quietSince = Math.max(this.idleSince, this.o.input.lastActivity);
      times.push(quietSince + this.loafAfter, quietSince + this.sleepAfter);
      if (this.reactionUntil) times.push(this.reactionUntil);
      // A hand resting near him while he's lying down: he wakes if it doesn't stroke
      if (this.nearSince && this.pose !== "sit") times.push(this.nearSince + 1500);
      if (this.aloofUntil > now) times.push(this.aloofUntil);
      // Pouncing waits for the cursor to hold still near him (checked as soon
      // as that's due, even if it already is)
      const input = this.o.input;
      if (
        input.kind === "mouse" &&
        now - input.lastMouseMove < 8000 &&
        distance(this.pos, { x: input.mouseX, y: input.mouseY }) < 150
      ) {
        times.push(Math.max(input.lastMouseMove + this.stillThreshold, this.cooldownUntil, now + 16));
      }
      // Slow looping poses (breathing)
      const clip = clipFor(this.anim.name, this.anim.dir);
      if (clip.def.fps && clip.def.loop !== false && clip.frames.length > 1) {
        const period = 1000 / clip.def.fps;
        times.push(this.anim.start + Math.ceil((now - this.anim.start + 1) / period) * period);
      }
    }
    if (this.bubbleText) times.push(this.bubbleText.until);
    const next = Math.min(...times.filter((t) => t > now));
    return Number.isFinite(next) ? Math.max(16, next - now) : 60000;
  }

  // Remember he was here, so the next visit (after /richie, or hiding)
  // strolls in instead of peeking
  remember() {
    // Not when he never got going (React's development double-mount, or
    // leaving before his entrance)
    if (this.mode !== "boot") lastVisit = { leftAt: this.now };
  }

  debug() {
    return {
      state: this.mode,
      pose: this.pose,
      gait: this.mover.gait,
      dir: this.facing,
      anim: this.anim.name,
      pos: { ...this.pos },
      energy: Number(this.energy.toFixed(2)),
      play: {
        armed: this.stalkState?.armed ?? null,
        pet: this.petting ? `${this.petting.strokes}/${this.petting.limit}` : null,
        aloof: this.now < this.aloofUntil,
        errand: this.errand,
      },
      input: {
        kind: this.o.input.kind,
        inside: this.o.input.mouseInside,
        sinceMove: Math.round(this.now - this.o.input.lastMouseMove),
        polite: this.o.input.overInteractive,
        samples: this.o.input.samples.length,
      },
    };
  }
}
