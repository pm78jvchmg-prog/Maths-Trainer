/**
 * Independent checks on the level 7 generators: rational equations in
 * context.
 *
 * The sweep proves each generator agrees with itself. These read the numbers
 * back out of the story the learner is shown — the distances and the
 * current, the two times, the resistances, the cost and the change — and
 * solve the problem from them by another route: the quadratic formula for a
 * journey or a shared cost, reciprocals added in floating point for work,
 * resistors and lenses. Every answer, tree node, filled quadratic and
 * correct option is then held to that. A slip in building a question outward
 * from its answer, or a sentence that tells a different story from the
 * numbers, fails here even when the generator is consistent with itself.
 */
import { describe, expect, it } from 'vitest';
import { math } from '../../engine/expression';
import { makeRng } from '../../engine/rng';
import { registry } from '../registry';
import type { Generator, Slide } from '../types';

const SEEDS = 150;

/** Learner-facing TeX as something mathjs evaluates. Handles only what these generators write. */
function toMath(tex: string): string {
  let out = tex.replace(/\\left|\\right/g, '').replace(/\\,/g, ' ');
  const fraction = /\\frac\{([^{}]*)\}\{([^{}]*)\}/;
  while (fraction.test(out)) out = out.replace(fraction, '(($1)/($2))');
  return out
    .replace(/\^\{(\d+)\}/g, '^($1)')
    .replace(/R_2/g, 'R2')
    .replace(/(\d)\s*([xv(])/g, '$1*$2')
    .replace(/\)\s*\(/g, ')*(')
    .replace(/([xv])\s*\(/g, '$1*(');
}

const valueOf = (tex: string, scope: Record<string, number> = {}): number => math.evaluate(toMath(tex), { ...scope }) as number;

/** Whether an equation `L = R` holds at the given scope. */
function holds(equation: string, scope: Record<string, number>): boolean {
  const [left, right] = equation.split('=');
  return Math.abs(valueOf(left, scope) - valueOf(right, scope)) < 1e-9;
}

function draws(id: string): { slide: Slide; difficulty: number }[] {
  const generator = registry[id] as unknown as Generator<unknown>;
  expect(generator, id).toBeDefined();
  return [1, 2].flatMap((difficulty) =>
    Array.from({ length: SEEDS }, (_, seed) => ({ slide: generator.render(generator.sample(makeRng(seed), difficulty)), difficulty })),
  );
}

/** Every prose block of the prompt, joined. */
function words(slide: Slide): string {
  if (!('prompt' in slide)) return '';
  return slide.prompt.map((b) => (b.kind === 'prose' ? b.text : '')).join(' ');
}

/** The whole numbers a story states, in order. Subscripts are not numbers. */
function numbers(text: string): number[] {
  return (text.replace(/R_\d/g, '').match(/\d+/g) ?? []).map(Number);
}

function display(slide: Slide): string {
  if (!('prompt' in slide)) return '';
  const block = slide.prompt.find((b) => b.kind === 'display');
  return block && 'tex' in block ? block.tex : '';
}

function correctLabel(slide: Slide): string {
  if (slide.kind !== 'choice') throw new Error(`expected choice, got ${slide.kind}`);
  return slide.options.find((o) => o.id === slide.correctId)!.label;
}

function wrongLabels(slide: Slide): string[] {
  if (slide.kind !== 'choice') throw new Error(`expected choice, got ${slide.kind}`);
  return slide.options.filter((o) => o.id !== slide.correctId).map((o) => o.label);
}

function typedAnswer(slide: Slide): number {
  if (slide.kind !== 'expression') throw new Error(`expected expression, got ${slide.kind}`);
  return Number(slide.answer);
}

function filled(slide: Slide): string {
  if (slide.kind !== 'tiles') throw new Error(`expected tiles, got ${slide.kind}`);
  return slide.template.replace(/\{(\d)\}/g, (_, i: string) => slide.answer[Number(i)]);
}

function lastStep(slide: Slide): string {
  if (slide.kind !== 'steps') throw new Error(`expected steps, got ${slide.kind}`);
  return slide.reductions[slide.reductions.length - 1].value;
}

/** Real roots of ax^2 + bx + c, larger first. */
function roots(a: number, b: number, c: number): [number, number] {
  const disc = Math.sqrt(b * b - 4 * a * c);
  return [(-b + disc) / (2 * a), (-b - disc) / (2 * a)];
}

/* ---------- the journeys ---------- */

interface Trip {
  d1: number;
  d2: number;
  T: number;
  c: number;
}

function tripOf(slide: Slide): Trip {
  // The tiles slide states no story, only the equation: d1, c, d2, c, T.
  if (slide.kind === 'tiles') {
    const e = numbers(display(slide));
    return { d1: e[0], c: e[1], d2: e[2], T: e[4] };
  }
  const text = words(slide);
  const n = numbers(text);
  if (text.includes('cyclist')) return { d1: n[0], c: n[1], d2: n[2], T: n[3] };
  return { d1: n[0], d2: n[1], T: n[2], c: n[3] };
}

/** d1/(v + c) + d2/(v - c) = T, cleared: T v^2 - (d1 + d2) v + (d1 - d2) c - T c^2 = 0. */
function tripRoots({ d1, d2, T, c }: Trip): { speed: number; other: number } {
  const [big, small] = roots(T, -(d1 + d2), (d1 - d2) * c - T * c * c);
  return { speed: big, other: small };
}

describe('level 7 journeys, solved from the story', () => {
  const ids = ['af7-journey-setup', 'af7-journey-check-tree', 'af7-journey-quad-tiles', 'af7-journey-reject-flow', 'af7-journey-solve'];

  it('has exactly one root faster than the current, and it is whole', () => {
    for (const id of ids) {
      for (const { slide } of draws(id)) {
        const trip = tripOf(slide);
        const { speed, other } = tripRoots(trip);
        expect(Number.isInteger(speed), id).toBe(true);
        expect(Number.isInteger(other), id).toBe(true);
        expect(speed).toBeGreaterThan(trip.c);
        expect(Math.abs(other)).toBeLessThan(trip.c);
        expect(other).not.toBe(0);
      }
    }
  });

  it('offers the equation the story gives, and no other that the speed satisfies', () => {
    for (const { slide } of draws('af7-journey-setup')) {
      const trip = tripOf(slide);
      const { speed } = tripRoots(trip);
      expect(holds(correctLabel(slide), { v: speed })).toBe(true);
      for (const label of wrongLabels(slide)) expect(holds(label, { v: speed }), label).toBe(false);
    }
  });

  it('checks the speed with the right times', () => {
    for (const { slide } of draws('af7-journey-check-tree')) {
      if (slide.kind !== 'tree') throw new Error('expected tree');
      const trip = tripOf(slide);
      const { speed } = tripRoots(trip);
      expect(words(slide)).toContain(`$v = ${speed}$`);
      expect(slide.answer.map(Number)).toEqual([trip.d1 / (speed + trip.c), trip.d2 / (speed - trip.c), trip.T]);
      expect(valueOf(slide.expression)).toBeCloseTo(trip.T, 9);
    }
  });

  it('fills in a quadratic whose roots are the two roots', () => {
    for (const { slide } of draws('af7-journey-quad-tiles')) {
      const { speed, other } = tripRoots(tripOf(slide));
      const quadratic = filled(slide);
      expect(holds(quadratic, { v: speed }), quadratic).toBe(true);
      expect(holds(quadratic, { v: other }), quadratic).toBe(true);
      expect(holds(quadratic, { v: speed + 1 }), quadratic).toBe(false);
    }
  });

  it('keeps the speed and rejects the other root for the right reason', () => {
    for (const { slide } of draws('af7-journey-reject-flow')) {
      if (slide.kind !== 'flow') throw new Error('expected flow');
      const trip = tripOf(slide);
      const { speed, other } = tripRoots(trip);
      expect(slide.answer[0]).toMatch(other < 0 ? /negative/ : /below/);
      expect(slide.answer[1]).toBe(`$v = ${speed}$ km/h`);
      expect(holds(slide.subject, { v: speed })).toBe(true);
      expect(holds(slide.subject, { v: other })).toBe(true);
    }
  });

  it('types the speed the story gives', () => {
    for (const { slide } of draws('af7-journey-solve')) {
      expect(typedAnswer(slide)).toBe(tripRoots(tripOf(slide)).speed);
    }
  });
});

/* ---------- working together, resistors and lenses ---------- */

/** t from 1/a + 1/b = 1/t, or 1/a - 1/b = 1/t with a drain. */
const combined = (a: number, b: number, drain = false): number => tidy(1 / (1 / a + (drain ? -1 : 1) / b));

/** Float noise off a whole number. */
const tidy = (n: number): number => (Math.abs(n - Math.round(n)) < 1e-9 ? Math.round(n) : n);

describe('level 7 reciprocals, added up again', () => {
  it('times two workers, or a tap and a drain', () => {
    for (const id of ['af7-together-tree', 'af7-together-time']) {
      for (const { slide } of draws(id)) {
        const text = words(slide);
        const [a, b] = numbers(text);
        const drain = /drain|leak/.test(text);
        const t = combined(a, b, drain);
        expect(Number.isInteger(t) && t > 0, `${id}: ${text}`).toBe(true);
        if (slide.kind === 'tree') {
          expect(valueOf(slide.expression)).toBeCloseTo(1 / t, 12);
          const [first, second, rate, time] = slide.answer;
          expect(valueOf(first)).toBeCloseTo(1 / a, 12);
          expect(valueOf(second)).toBeCloseTo(1 / b, 12);
          expect(valueOf(rate)).toBeCloseTo(1 / t, 12);
          expect(Number(time)).toBe(t);
        } else {
          expect(typedAnswer(slide)).toBe(t);
        }
      }
    }
  });

  it('finds the second worker from the time together', () => {
    for (const { slide } of draws('af7-alone-steps')) {
      if (slide.kind !== 'steps') throw new Error('expected steps');
      const [t, a] = numbers(words(slide));
      const b = 1 / (1 / t - 1 / a);
      expect(combined(a, Math.round(b))).toBeCloseTo(t, 9);
      expect(lastStep(slide)).toBe(`x = ${Math.round(b)}`);
      expect(valueOf(slide.reductions[0].value)).toBeCloseTo(1 / b, 12);
    }
  });

  it('solves a time given in terms of the other', () => {
    for (const { slide } of draws('af7-longer-solve')) {
      const [k, t] = numbers(words(slide));
      // 1/x + 1/(x + k) = 1/t  =>  x^2 + (k - 2t)x - kt = 0
      const [x, other] = roots(1, k - 2 * t, -k * t);
      expect(other).toBeLessThan(0);
      expect(typedAnswer(slide)).toBe(x);
      expect(combined(x, x + k)).toBeCloseTo(t, 9);
    }
  });

  it('offers the equation a working-together story gives', () => {
    for (const { slide, difficulty } of draws('af7-together-setup')) {
      const n = numbers(words(slide));
      const x = difficulty > 1 ? roots(1, n[0] - 2 * n[1], -n[0] * n[1])[0] : Math.round(1 / (1 / n[0] - 1 / n[1]));
      expect(holds(correctLabel(slide), { x }), correctLabel(slide)).toBe(true);
      for (const label of wrongLabels(slide)) expect(holds(label, { x }), label).toBe(false);
    }
  });

  it('adds resistors in parallel', () => {
    for (const { slide } of draws('af7-parallel-tree')) {
      if (slide.kind !== 'tree') throw new Error('expected tree');
      const rs = numbers(words(slide).split('.')[0]);
      const R = 1 / rs.reduce((s, r) => s + 1 / r, 0);
      expect(Number(slide.answer[slide.answer.length - 1])).toBeCloseTo(R, 9);
      expect(valueOf(slide.answer[slide.answer.length - 2])).toBeCloseTo(1 / R, 12);
      rs.forEach((r, i) => expect(valueOf(slide.answer[i])).toBeCloseTo(1 / r, 12));
    }
  });

  it('finds a missing resistor', () => {
    for (const { slide } of draws('af7-parallel-missing')) {
      const [R1, R] = numbers(words(slide));
      expect(combined(R1, typedAnswer(slide))).toBeCloseTo(R, 9);
    }
  });

  it('finds a focal length and an image distance', () => {
    for (const { slide } of draws('af7-lens-focal')) {
      const [u, v] = numbers(words(slide));
      expect(typedAnswer(slide)).toBeCloseTo(combined(u, v), 9);
    }
    for (const { slide } of draws('af7-lens-steps')) {
      const [f, u] = numbers(words(slide));
      // 1/f = 1/u + 1/v, so v is the one that brings 1/u up to 1/f.
      expect(Number(lastStep(slide).replace('v = ', ''))).toBeCloseTo(1 / (1 / f - 1 / u), 9);
    }
  });

  it('picks the line that gives the missing part', () => {
    for (const { slide } of draws('af7-formula-which')) {
      const [whole, part] = numbers(words(slide));
      const missing = 1 / (1 / whole - 1 / part);
      expect(Number.isInteger(Math.round(missing * 1e9) / 1e9)).toBe(true);
      const right = (label: string) => valueOf(label.split('=')[1]);
      expect(right(correctLabel(slide))).toBeCloseTo(1 / missing, 12);
      for (const label of wrongLabels(slide)) expect(Math.abs(right(label) - 1 / missing)).toBeGreaterThan(1e-9);
    }
  });
});

/* ---------- lesson 1 and lesson 5 ---------- */

describe('level 7 stories with one fraction, or a difference of two', () => {
  it('writes the expression the sentence describes', () => {
    for (const { slide } of draws('af7-word-expr')) {
      const text = words(slide);
      const n = numbers(text);
      const x = 7.3;
      // At difficulty 1 the only number is the total; at 2 the shift comes with a word saying which way.
      const expected = (() => {
        if (n.length === 1) return n[0] / x;
        const up = /faster|more|join/.test(text);
        const [size, total] = text.includes('bill') ? [n[1], n[0]] : [n[0], n[1]];
        return total / (x + (up ? size : -size));
      })();
      expect(valueOf(correctLabel(slide), { x }), text).toBeCloseTo(expected, 9);
      for (const label of wrongLabels(slide)) expect(Math.abs(valueOf(label, { x }) - expected)).toBeGreaterThan(1e-6);
    }
  });

  it('solves one fraction equal to a number', () => {
    for (const { slide } of draws('af7-word-value')) {
      const text = words(slide);
      const x = typedAnswer(slide);
      const n = numbers(text);
      // Whatever the story, one stated number over (x + shift) is another stated number.
      const shifts = n.length === 2 ? [0] : n.flatMap((v) => [v, -v]);
      const found = shifts.some((a) =>
        n.some((top) => n.some((result) => top !== result && x + a > 0 && top / (x + a) === result && (a === 0 || Math.abs(a) !== top))),
      );
      expect(found, text).toBe(true);
      expect(x).toBeGreaterThan(0);
    }
  });

  it('sets two equal fractions equal, and solves them', () => {
    for (const id of ['af7-equal-setup', 'af7-equal-steps']) {
      for (const { slide } of draws(id)) {
        const text = words(slide);
        const [A, B, size] = numbers(text);
        const up = /faster|more/.test(text.split('.').slice(1).join('.'));
        const a = up ? size : -size;
        // A/(x + a) = B/x  =>  x = Ba/(A - B)
        const x = (B * a) / (A - B);
        expect(Number.isInteger(x) && x > 0 && x + a > 0, text).toBe(true);
        if (slide.kind === 'choice') {
          expect(holds(correctLabel(slide), { x }), correctLabel(slide)).toBe(true);
          for (const label of wrongLabels(slide)) expect(holds(label, { x }), label).toBe(false);
        } else {
          if (slide.kind !== 'steps') throw new Error('expected steps');
          expect(holds(slide.start.join(' '), { x })).toBe(true);
          expect(lastStep(slide)).toBe(`x = ${x}`);
        }
      }
    }
  });

  /** C, k and d, in the order every story states them: C/x - C/(x + k) = d. */
  function shareRoots(slide: Slide): { C: number; k: number; d: number; x: number; other: number } {
    // The tiles slide states no story, only the equation: C, C, k, d.
    const e = numbers(display(slide));
    const [C, k, d] = slide.kind === 'tiles' ? [e[0], e[2], e[3]] : numbers(words(slide));
    const [x, other] = roots(d, d * k, -C * k);
    return { C, k, d, x, other };
  }

  it('solves a shared cost or a changed price', () => {
    for (const id of ['af7-share-setup', 'af7-share-quad-tiles', 'af7-share-solve', 'af7-share-check-tree']) {
      for (const { slide } of draws(id)) {
        const { C, k, d, x, other } = shareRoots(slide);
        expect(Number.isInteger(x) && x > 0, id).toBe(true);
        expect(other).toBeLessThan(0);
        expect(C / x - C / (x + k)).toBeCloseTo(d, 9);
        if (slide.kind === 'choice') {
          expect(holds(correctLabel(slide), { x })).toBe(true);
          for (const label of wrongLabels(slide)) expect(holds(label, { x }), label).toBe(false);
        } else if (slide.kind === 'tiles') {
          expect(holds(filled(slide), { x })).toBe(true);
          expect(holds(filled(slide), { x: other })).toBe(true);
        } else if (slide.kind === 'tree') {
          expect(words(slide)).toContain(`$x = ${x}$`);
          expect(slide.answer.map(Number)).toEqual([C / x, C / (x + k), d]);
        } else {
          expect(typedAnswer(slide)).toBe(x);
        }
      }
    }
  });
});
