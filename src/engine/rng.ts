/**
 * Seeded pseudo-random number generation.
 *
 * Determinism is a correctness requirement here, not a convenience. A practice
 * slide is resolved once per session and cached: pressing "Try again" must
 * re-present the *same* question, otherwise the learner answers a different
 * problem than the one they got wrong. Replaying a lesson draws a fresh seed,
 * so the numbers change between sittings but never mid-attempt.
 */

/** mulberry32 — small, fast, good enough statistically for question generation. */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** FNV-1a. Turns a stable string key (e.g. `${lessonId}:${slideIndex}`) into a seed. */
export function hashSeed(key: string): number {
  let h = 0x811c9dc5;
  for (let idx = 0; idx < key.length; idx++) {
    h ^= key.charCodeAt(idx);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

export interface Rng {
  /** Uniform in [0, 1). */
  next(): number;
  /** Uniform integer in [min, max] inclusive. */
  int(min: number, max: number): number;
  /** Uniform float in [min, max). */
  float(min: number, max: number): number;
  /** Uniform element of `items`. Throws on an empty array. */
  pick<T>(items: readonly T[]): T;
  /** `n` distinct elements of `items`, in random order. */
  sample<T>(items: readonly T[], n: number): T[];
  /** A fresh shuffled copy; the input is not mutated. */
  shuffle<T>(items: readonly T[]): T[];
  /** −1 or +1. */
  sign(): number;
  /** True with probability `p`. */
  chance(p: number): boolean;
}

export function makeRng(seed: number | string): Rng {
  const next = mulberry32(typeof seed === 'string' ? hashSeed(seed) : seed);

  const rng: Rng = {
    next,
    int: (min, max) => min + Math.floor(next() * (max - min + 1)),
    float: (min, max) => min + next() * (max - min),
    pick: (items) => {
      if (items.length === 0) throw new Error('rng.pick: empty array');
      return items[Math.floor(next() * items.length)];
    },
    shuffle: (items) => {
      const out = [...items];
      for (let idx = out.length - 1; idx > 0; idx--) {
        const j = Math.floor(next() * (idx + 1));
        [out[idx], out[j]] = [out[j], out[idx]];
      }
      return out;
    },
    sample: (items, n) => {
      if (n > items.length) {
        throw new Error(`rng.sample: asked for ${n} of ${items.length}`);
      }
      return rng.shuffle(items).slice(0, n);
    },
    sign: () => (next() < 0.5 ? -1 : 1),
    chance: (p) => next() < p,
  };

  return rng;
}
