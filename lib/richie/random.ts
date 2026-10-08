// Seeded randomness, so a ?richie-seed= run behaves the same every time while
// normal visits get a fresh seed (and so fresh paths) on every load.

export type Random = {
  next(): number; // [0, 1)
  range(min: number, max: number): number;
  chance(probability: number): boolean;
  pick<T>(items: readonly T[]): T;
  sign(): 1 | -1;
};

export function createRandom(seed?: number): Random {
  let state = (seed ?? crypto.getRandomValues(new Uint32Array(1))[0]) >>> 0;
  // mulberry32
  const next = () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return {
    next,
    range: (min, max) => min + (max - min) * next(),
    chance: (probability) => next() < probability,
    pick: (items) => items[Math.floor(next() * items.length)],
    sign: () => (next() < 0.5 ? -1 : 1),
  };
}

// Smooth 1D value noise in [-1, 1]: a wobble that never repeats exactly
export function valueNoise(random: Random) {
  const table = Float32Array.from({ length: 256 }, () => random.next() * 2 - 1);
  return (t: number) => {
    const i = Math.floor(t);
    const f = t - i;
    const a = table[i & 255];
    const b = table[(i + 1) & 255];
    const s = f * f * (3 - 2 * f);
    return a + (b - a) * s;
  };
}
