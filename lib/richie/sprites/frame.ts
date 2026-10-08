import { checkGrid, pixel, type Grid } from "./grid.ts";
import { HALO, OUTLINE, PALETTE, UNOUTLINED } from "./palette.ts";

export const CELL = 32; // every frame is CELL x CELL
export const FEET: readonly [number, number] = [16, 29]; // ground contact point in a frame

// A small grid pressed onto a frame at (x, y); its "." pixels leave the frame alone
export type Stamp = { part: Grid; x: number; y: number };

// One drawable frame: a body (usually without its head) plus stamps for the
// shared head parts and overlays, so face markings stay identical everywhere.
// lift raises the art off the ground (hops), leaving the shadow behind.
export type Frame = { body: Grid; stamps?: Stamp[]; lift?: number };

export function defineFrame(name: string, frame: Frame): Frame {
  checkGrid(name, frame.body, { width: CELL, height: CELL });
  frame.stamps?.forEach((s, i) => checkGrid(`${name} stamp ${i}`, s.part));
  return frame;
}

// The frame's colour keys after stamping
export function compose(frame: Frame): string[][] {
  const keys = frame.body.rows.map((row) => [...row]);
  for (const { part, x, y } of frame.stamps ?? []) {
    for (let py = 0; py < part.height; py++) {
      for (let px = 0; px < part.width; px++) {
        const key = pixel(part, px, py);
        const ty = y + py;
        const tx = x + px;
        if (key !== "." && ty >= 0 && ty < CELL && tx >= 0 && tx < CELL) keys[ty][tx] = key;
      }
    }
  }
  return keys;
}

const NEIGHBOURS = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
] as const;

// RGBA pixels for a frame: the art, a 1px ink outline around it, and a faint
// paper halo outside that so his black and white fur both read on any backdrop
export function rasterize(frame: Frame): Uint8ClampedArray<ArrayBuffer> {
  const keys = compose(frame);
  const at = (x: number, y: number) => (x < 0 || y < 0 || x >= CELL || y >= CELL ? "." : keys[y][x]);
  const out = new Uint8ClampedArray(CELL * CELL * 4);
  const kind = new Uint8Array(CELL * CELL); // 0 empty, 1 art, 2 outline

  for (let y = 0; y < CELL; y++) {
    for (let x = 0; x < CELL; x++) {
      const colour = PALETTE[at(x, y)];
      if (!colour) continue;
      out.set([...colour, 255], (y * CELL + x) * 4);
      kind[y * CELL + x] = 1;
    }
  }
  for (let y = 0; y < CELL; y++) {
    for (let x = 0; x < CELL; x++) {
      if (kind[y * CELL + x]) continue;
      const touchesArt = NEIGHBOURS.some(([dx, dy]) => {
        const key = at(x + dx, y + dy);
        return key !== "." && !UNOUTLINED.has(key);
      });
      if (touchesArt) {
        out.set([...OUTLINE, 255], (y * CELL + x) * 4);
        kind[y * CELL + x] = 2;
      }
    }
  }
  for (let y = 0; y < CELL; y++) {
    for (let x = 0; x < CELL; x++) {
      if (kind[y * CELL + x]) continue;
      const touchesOutline = NEIGHBOURS.some(([dx, dy]) => {
        const nx = x + dx;
        const ny = y + dy;
        return nx >= 0 && ny >= 0 && nx < CELL && ny < CELL && kind[ny * CELL + nx] === 2;
      });
      if (touchesOutline) out.set(HALO, (y * CELL + x) * 4);
    }
  }
  return out;
}
