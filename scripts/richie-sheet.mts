// Previews and checks Richie's sprites.
//
//   node scripts/richie-sheet.mts --out <dir> [--only prefix,prefix] [--scale 6]
//     lineup.png      every frame (and head part) on paper, ink and clouds
//     strips.png      each animation, one row per direction
//     actual-size.png frames at their on-screen size (64px) on a 2x screen
//   node scripts/richie-sheet.mts --out <dir> --gif [--only stroll,run]
//     <animation>_<direction>.gif
//   node scripts/richie-sheet.mts --check
//     lints the grids and the animation table; exits 1 on problems
//
// Importing the sprites also validates every grid (size and colour keys).
import { mkdirSync } from "node:fs";
import path from "node:path";
import sharp, { type OverlayOptions } from "sharp";
import { CELL, compose, rasterize, type Frame } from "../lib/richie/sprites/frame.ts";
import { grid } from "../lib/richie/sprites/grid.ts";
import { ANIMATIONS, FRAMES } from "../lib/richie/sprites/index.ts";
import { HEAD_PARTS } from "../lib/richie/sprites/parts.ts";
import {
  DRAWN_DIRECTIONS,
  PEEK_SIDE_LEDGE_X,
  PEEK_TOP_LEDGE_Y,
  type AnimationDef,
  type AnimationName,
} from "../lib/richie/types.ts";

const args = process.argv.slice(2);
const option = (name: string) => {
  const i = args.indexOf(`--${name}`);
  return i === -1 ? undefined : args[i + 1];
};
const flag = (name: string) => args.includes(`--${name}`);
const only = option("only")?.split(",");
const wanted = (name: string) => !only || only.some((prefix) => name.startsWith(prefix));

// ---------------------------------------------------------------------------
// Checks

const ALL_ANIMATIONS: AnimationName[] = [
  "sit", "sit_blink", "sit_look", "sit_mrrp", "sit_tail", "sit_side", "stroll", "run",
  "peek_side", "peek_top", "hop", "stalk", "bat", "loaf", "curl",
];
const GAITS: AnimationName[] = ["stroll", "run"];
// Frames whose paws may leave the ground row
const AIRBORNE: AnimationName[] = ["run", "hop", "peek_side", "peek_top"];

function artBounds(frame: Frame) {
  const keys = compose(frame);
  let top = CELL, bottom = -1, left = CELL, right = -1;
  keys.forEach((row, y) =>
    row.forEach((key, x) => {
      if (key === "." || key === "G") return;
      top = Math.min(top, y);
      bottom = Math.max(bottom, y);
      left = Math.min(left, x);
      right = Math.max(right, x);
    })
  );
  return { top, bottom, left, right, keys };
}

function check() {
  const problems: string[] = [];
  for (const [name, frame] of Object.entries(FRAMES)) {
    const b = artBounds(frame);
    if (b.bottom < 0) problems.push(`${name}: empty frame`);
    else if (b.left < 2 || b.right > 29 || b.top < 1 || b.bottom > 30) {
      problems.push(`${name}: art reaches the edge (x ${b.left}-${b.right}, y ${b.top}-${b.bottom}); keep it inside x 2-29, y 1-30 for the outline and halo`);
    }
  }
  for (const animation of ALL_ANIMATIONS) {
    const def = ANIMATIONS[animation];
    if (!def) {
      problems.push(`animation "${animation}" is missing`);
      continue;
    }
    for (const [direction, names] of Object.entries(def.frames)) {
      for (const name of names ?? []) {
        if (!FRAMES[name]) problems.push(`${animation} ${direction}: unknown frame "${name}"`);
      }
    }
    if (GAITS.includes(animation)) {
      if (!def.stride) problems.push(`${animation}: gaits need a stride`);
      for (const direction of DRAWN_DIRECTIONS) {
        const names = def.frames[direction] ?? [];
        if (names.length < 4) problems.push(`${animation} ${direction}: needs at least 4 frames, has ${names.length}`);
        const tops = names.filter((n) => FRAMES[n]).map((n) => artBounds(FRAMES[n]).top);
        tops.forEach((top, i) => {
          const next = tops[(i + 1) % tops.length];
          const limit = animation === "run" ? 3 : 2;
          if (Math.abs(top - next) > limit) problems.push(`${animation} ${direction}: head bobs ${Math.abs(top - next)}px between frames ${i + 1} and ${((i + 1) % tops.length) + 1} (max ${limit})`);
        });
      }
    } else if (!def.fps && def.loop !== false) {
      problems.push(`${animation}: looping animations need fps`);
    }
    for (const names of Object.values(def.frames)) {
      for (const name of names ?? []) {
        const frame = FRAMES[name];
        if (!frame) continue;
        const b = artBounds(frame);
        const grounded = b.bottom === 29 + 0 && !frame.lift;
        if (!AIRBORNE.includes(animation) && !grounded && !frame.lift) {
          problems.push(`${animation}: frame ${name} doesn't stand on the ground row (lowest art row ${b.bottom}, expected 29)`);
        }
        if (animation === "peek_side" && b.right < PEEK_SIDE_LEDGE_X) problems.push(`${name}: nothing shows past the ledge x=${PEEK_SIDE_LEDGE_X}`);
        if (animation === "peek_top" && b.top >= PEEK_TOP_LEDGE_Y) problems.push(`${name}: nothing shows above the ledge y=${PEEK_TOP_LEDGE_Y}`);
      }
    }
  }
  if (problems.length) {
    console.error(problems.map((p) => `✗ ${p}`).join("\n"));
    console.error(`\n${problems.length} problem(s)`);
    process.exit(1);
  }
  console.log(`✓ ${Object.keys(FRAMES).length} frames and ${Object.keys(ANIMATIONS).length} animations look fine`);
}

if (flag("check")) {
  check();
  process.exit(0);
}

// ---------------------------------------------------------------------------
// Pictures

const out = option("out");
if (!out) throw new Error("--out <dir> is required (or use --check)");
mkdirSync(out, { recursive: true });
const scale = Number(option("scale") ?? 6);
const size = CELL * scale;
const pad = 12;
const labelHeight = 22;
const cloud = path.join(import.meta.dirname, "../public/GalleryExcluded/cloud2.jpeg");

// Head parts shown on their own, centred in an empty frame
const empty = grid([Array.from({ length: CELL }, () => ".".repeat(CELL)).join("\n")] as unknown as TemplateStringsArray);
const PREVIEWS: Record<string, Frame> = { ...FRAMES };
for (const [name, part] of Object.entries(HEAD_PARTS)) {
  PREVIEWS[name] = {
    body: empty,
    stamps: [{ part, x: Math.floor((CELL - part.width) / 2), y: Math.floor((CELL - part.height) / 2) }],
  };
}

function mirrored(frame: Frame): Frame {
  const keys = compose(frame).map((row) => [...row].reverse().join(""));
  return { body: { width: CELL, height: CELL, rows: keys } };
}

async function sprite(frame: Frame, px = size) {
  const raw = Buffer.from(rasterize(frame));
  return sharp(raw, { raw: { width: CELL, height: CELL, channels: 4 } })
    .resize(px, px, { kernel: "nearest" })
    .png()
    .toBuffer();
}

async function background(kind: "paper" | "ink" | "cloud", px = size) {
  if (kind === "cloud") {
    return sharp(cloud).resize(px * 4, null).extract({ left: px, top: Math.floor(px / 2), width: px, height: px }).png().toBuffer();
  }
  const colour = kind === "paper" ? "#F4F2ED" : "#141414";
  return sharp({ create: { width: px, height: px, channels: 4, background: colour } }).png().toBuffer();
}

const label = (text: string, width: number) => ({
  input: Buffer.from(
    `<svg width="${width}" height="${labelHeight}"><text x="${pad}" y="16" font-family="Georgia, serif" font-size="15" fill="#141414">${text}</text></svg>`
  ),
});

async function canvas(width: number, height: number, layers: OverlayOptions[], file: string) {
  await sharp({ create: { width, height, channels: 4, background: "#ffffff" } }).composite(layers).png().toFile(file);
  console.log(`-> ${file}`);
}

// One frame per row on three backgrounds
async function lineup() {
  const names = Object.keys(PREVIEWS).filter(wanted);
  const bgs = await Promise.all((["paper", "ink", "cloud"] as const).map((k) => background(k)));
  const width = pad + bgs.length * (size + pad);
  const rowHeight = labelHeight + size + pad;
  const layers: OverlayOptions[] = [];
  for (const [row, name] of names.entries()) {
    const top = pad + row * rowHeight;
    const art = await sprite(PREVIEWS[name]);
    layers.push({ ...label(name, width), left: 0, top });
    bgs.forEach((bg, col) => {
      const left = pad + col * (size + pad);
      layers.push({ input: bg, left, top: top + labelHeight }, { input: art, left, top: top + labelHeight });
    });
  }
  await canvas(width, pad + names.length * rowHeight, layers, path.join(out!, "lineup.png"));
}

// Each animation and direction as a row of frames, mirrored directions included
function rows() {
  const result: { title: string; frames: Frame[]; def: AnimationDef }[] = [];
  for (const [animation, def] of Object.entries(ANIMATIONS)) {
    if (!def || !wanted(animation)) continue;
    for (const [direction, names] of Object.entries(def.frames)) {
      const frames = (names ?? []).filter((n) => FRAMES[n]).map((n) => FRAMES[n]);
      result.push({ title: `${animation} ${direction}`, frames, def });
      const mirror = { E: "W", NE: "NW", SE: "SW" }[direction];
      if (mirror && !def.frames[mirror as keyof typeof def.frames]) {
        result.push({ title: `${animation} ${mirror} (mirrored)`, frames: frames.map(mirrored), def });
      }
    }
  }
  return result;
}

async function strips() {
  const all = rows();
  const cell = CELL * 4;
  const longest = Math.max(1, ...all.map((r) => r.frames.length));
  const width = pad + longest * (cell + 4) + pad;
  const rowHeight = labelHeight + cell + pad;
  const paper = await background("paper", cell);
  const layers: OverlayOptions[] = [];
  for (const [i, row] of all.entries()) {
    const top = pad + i * rowHeight;
    layers.push({ ...label(row.title, width), left: 0, top });
    for (const [j, frame] of row.frames.entries()) {
      const left = pad + j * (cell + 4);
      layers.push({ input: paper, left, top: top + labelHeight }, { input: await sprite(frame, cell), left, top: top + labelHeight });
    }
  }
  await canvas(width, pad + all.length * rowHeight, layers, path.join(out!, "strips.png"));
}

async function actualSize() {
  const names = Object.keys(FRAMES).filter(wanted).slice(0, 8);
  const px = CELL * 4; // 2x on screen, on a 2x display
  const width = Math.max(600, 48 + names.length * (px + 32));
  const layers = await Promise.all(names.map(async (n, i) => ({ input: await sprite(FRAMES[n], px), left: 48 + i * (px + 32), top: 96 })));
  const file = path.join(out!, "actual-size.png");
  await sharp(cloud).resize(width, null).extract({ left: 0, top: 0, width, height: 320 }).composite(layers).png().toFile(file);
  console.log(`-> ${file}`);
}

async function gifs() {
  const cell = CELL * 6;
  const paper = await background("paper", cell);
  for (const row of rows()) {
    if (!row.frames.length) continue;
    // Gaits at a typical speed: stroll ~90, run ~480 CSS px/s, drawn at 2x
    const speed = row.title.startsWith("run") ? 480 : 90;
    const ms = row.def.stride ? (row.def.stride * 2 * 1000) / speed : 1000 / (row.def.fps ?? 6);
    const frames = await Promise.all(
      row.frames.map(async (f) => sharp(paper).composite([{ input: await sprite(f, cell) }]).png().toBuffer())
    );
    const file = path.join(out!, `${row.title.replace(/ \(mirrored\)/, "").replace(/ /g, "_")}.gif`);
    await sharp(frames, { join: { animated: true } })
      .gif({ delay: frames.map(() => Math.max(20, Math.round(ms))), loop: 0 })
      .toFile(file);
    console.log(`-> ${file}`);
  }
}

if (flag("gif")) await gifs();
else {
  await lineup();
  await strips();
  await actualSize();
}
