import { CELL, compose, rasterize } from "./sprites/frame.ts";
import { ANIMATIONS, FRAMES } from "./sprites/index.ts";
import { DIRECTIONS, MIRRORED, type AnimationDef, type AnimationName, type Direction } from "./types.ts";

// Every frame rasterised once into a single canvas, one 32x32 cell each
export type Atlas = { image: HTMLCanvasElement; cells: Map<string, { sx: number; sy: number; lift: number }> };

export function buildAtlas(): Atlas {
  const names = Object.keys(FRAMES);
  const columns = 16;
  const image = document.createElement("canvas");
  image.width = columns * CELL;
  image.height = Math.ceil(names.length / columns) * CELL;
  const context = image.getContext("2d")!;
  const cells = new Map<string, { sx: number; sy: number; lift: number }>();
  names.forEach((name, i) => {
    const sx = (i % columns) * CELL;
    const sy = Math.floor(i / columns) * CELL;
    context.putImageData(new ImageData(rasterize(FRAMES[name]), CELL, CELL), sx, sy);
    cells.set(name, { sx, sy, lift: FRAMES[name].lift ?? 0 });
  });
  return { image, cells };
}

export type Clip = { frames: string[]; mirror: boolean; def: AnimationDef };

const angleOf = (direction: Direction) => DIRECTIONS.indexOf(direction) * 45;
const angularDistance = (a: Direction, b: Direction) => {
  const d = Math.abs(angleOf(a) - angleOf(b)) % 360;
  return d > 180 ? 360 - d : d;
};

// The frames for an animation in a direction. Missing directions fall back to
// a mirrored one, then to the nearest drawn one; missing animations to "sit".
export function clipFor(animation: AnimationName, direction: Direction): Clip {
  const def = ANIMATIONS[animation] ?? ANIMATIONS.sit!;
  const available = (d: Direction) => def.frames[d]?.length;
  const westward = direction === "W" || direction === "NW" || direction === "SW";

  // Poses that only face one way: facing the visitor (S) never mirrors;
  // side poses (E) mirror when heading west
  if (!available("N") && !available("NE") && !available("SE")) {
    if (available("S") && !available("E")) return { frames: def.frames.S!, mirror: false, def };
    if (available("E")) return { frames: def.frames.E!, mirror: westward, def };
  }
  const candidates = [...DIRECTIONS].sort((a, b) => angularDistance(direction, a) - angularDistance(direction, b));
  for (const candidate of candidates) {
    if (available(candidate)) return { frames: def.frames[candidate]!, mirror: false, def };
    const source = MIRRORED[candidate];
    if (source && available(source)) return { frames: def.frames[source]!, mirror: true, def };
  }
  return { frames: ANIMATIONS.sit!.frames.S!, mirror: false, def: ANIMATIONS.sit! };
}

export type ArtBox = { left: number; top: number; right: number; bottom: number };
const bounds = new Map<string, ArtBox>();

// The box round a frame's art, in frame pixels (right and bottom exclusive),
// raised by its lift; for telling whether the cursor is on him
export function frameBounds(name: string): ArtBox {
  let box = bounds.get(name);
  if (box) return box;
  const frame = FRAMES[name];
  box = { left: CELL, top: CELL, right: 0, bottom: 0 };
  if (frame) {
    compose(frame).forEach((row, y) =>
      row.forEach((key, x) => {
        if (key === ".") return;
        box!.left = Math.min(box!.left, x);
        box!.right = Math.max(box!.right, x + 1);
        box!.top = Math.min(box!.top, y);
        box!.bottom = Math.max(box!.bottom, y + 1);
      })
    );
    const lift = frame.lift ?? 0;
    box.top -= lift;
    box.bottom -= lift;
  }
  bounds.set(name, box);
  return box;
}
