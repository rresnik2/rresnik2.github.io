// Where he can be stroked, in frame pixels (right and bottom exclusive), per
// resting pose: his head and back sitting up, the hump of his back loafing or
// curled up. All face the visitor, so they never mirror.
export const BACK = {
  sit: { left: 8, top: 1, right: 25, bottom: 22 },
  loaf: { left: 4, top: 8, right: 28, bottom: 24 },
  curl: { left: 3, top: 12, right: 28, bottom: 27 },
} as const;
