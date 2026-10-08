import { PALETTE } from "./palette.ts";

export type Grid = { width: number; height: number; rows: string[] };

// Pixel art written as text, one character per pixel (see palette.ts):
//
//   grid`
//     ..KK..
//     .KWWK.
//   `
//
// Indentation and blank lines are ignored. Every row must be the same width.
export function grid(strings: TemplateStringsArray, ...values: unknown[]): Grid {
  const text = strings.reduce((out, part, i) => out + part + (i < values.length ? String(values[i]) : ""), "");
  const rows = text
    .split("\n")
    .map((row) => row.trim())
    .filter((row) => row.length > 0);
  return { width: rows[0]?.length ?? 0, height: rows.length, rows };
}

// Throws with the sprite name and row if a grid is malformed
export function checkGrid(name: string, g: Grid, size?: { width: number; height: number }) {
  if (size && (g.width !== size.width || g.height !== size.height)) {
    throw new Error(`${name}: expected ${size.width}x${size.height}, got ${g.width}x${g.height}`);
  }
  g.rows.forEach((row, y) => {
    if (row.length !== g.width) throw new Error(`${name} row ${y}: ${row.length} wide, expected ${g.width}`);
    for (const [x, key] of [...row].entries()) {
      if (!(key in PALETTE)) throw new Error(`${name} row ${y} col ${x}: unknown colour "${key}"`);
    }
  });
}

export function pixel(g: Grid, x: number, y: number) {
  return g.rows[y]?.[x] ?? ".";
}

// Mirror left-right (W-facing frames come from E-facing ones)
export function flipX(g: Grid): Grid {
  return { ...g, rows: g.rows.map((row) => [...row].reverse().join("")) };
}
