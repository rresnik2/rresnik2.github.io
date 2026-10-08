// Every colour Richie is drawn with, keyed by the single character used in the
// sprite grids. This is the only place colours live, so retouching him is one edit.
export const PALETTE: Record<string, readonly [number, number, number] | null> = {
  ".": null, // transparent
  K: [38, 38, 43], // black fur
  k: [74, 74, 84], // black fur sheen
  W: [250, 248, 242], // white fur
  w: [214, 209, 199], // white fur in shade
  P: [242, 160, 172], // pink: nose, inner ears, toe beans
  p: [214, 118, 136], // darker pink
  E: [205, 210, 72], // yellow-green iris
  e: [160, 168, 46], // iris, lower half
  I: [20, 20, 20], // pupil
  G: [232, 230, 224], // whiskers (never outlined)
  M: [122, 46, 58], // open mouth
  R: [228, 64, 43], // vermilion, reserved for accents
};

// Added by the rasteriser, never written in grids
export const OUTLINE: readonly [number, number, number] = [20, 20, 20]; // ink
export const HALO: readonly [number, number, number, number] = [244, 242, 237, 110]; // paper, ~43%

// Keys that don't get an outline around them
export const UNOUTLINED = new Set(["G"]);
