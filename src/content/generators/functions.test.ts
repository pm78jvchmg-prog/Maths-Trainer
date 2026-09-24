/**
 * The Functions & Transformations level 5 generators — transformations of
 * trigonometric graphs — checked against the waves themselves.
 *
 * The generic sweep in `generators.test.ts` proves each slide agrees with
 * itself: the bank holds the answer, the checker accepts it. It would pass a
 * quoted maximum that is wrong, a period one stretch off, or a shift with its
 * sign turned, so long as the generator made the same slip throughout. So
 * each check here reads the rule a slide shows, or the rule its answer
 * builds, back out of the TeX into a, b, c and d; samples that wave at every
 * whole degree (every five would miss a peak at 18°, which a sine with b = 5
 * has); and finds each amplitude, midline, period, shift, maximum and minimum
 * the slide quotes or expects from the samples, never from the generator's
 * own helpers. Moves described in words are parsed and applied to the
 * sampled $y = \sin x$ one at a time, in the order the words give them.
 *
 * The `transform` pairs (`fun-amp-*`, `fun-xstretch-*`) are graded by the
 * widget comparing curves, which `generators.test.ts` already checks.
 *
 * Level 6, functions in modelling, is checked the same way from the other
 * end: each story is read back into its numbers, the model is built here
 * from what the words say, and every quoted value, domain, inverse and
 * composite is held to it. Its section, at the bottom, opens with its rules.
 */
import { describe, it, expect } from 'vitest';
import { makeRng } from '../../engine/rng';
import { reduce, startSession } from '../../engine/session';
import type { Answer } from '../../engine/session';
import { registry } from '../registry';
import type { Block, Generator, Slide } from '../types';

const SEEDS = 150;
const DIFFICULTIES = [1, 2];

function draws(id: string) {
  const generator = registry[id] as unknown as Generator<unknown>;
  expect(generator, `no generator ${id}`).toBeDefined();
  return DIFFICULTIES.flatMap((difficulty) =>
    Array.from({ length: SEEDS }, (_, seed) => {
      const params = generator.sample(makeRng(seed), difficulty);
      return { slide: generator.render(params), where: `${id} seed ${seed} d${difficulty}` };
    }),
  );
}

/** The verdict the reducer gives an answer to this one slide. */
function verdict(slide: Slide, answer: Answer) {
  const lesson = { id: 'fn-test', title: 'Test', slides: [], skillCheck: [{ type: 'literal' as const, slide }] };
  return reduce(startSession(lesson, registry, 1), { type: 'submit', answer }).feedback.kind;
}

/* ---------- Waves, read and sampled ---------- */

type Fn = 'sin' | 'cos';
type Curve = (x: number) => number;

interface Wave {
  fn: Fn;
  a: number;
  b: number;
  c: number;
  d: number;
}

const RAD = Math.PI / 180;
const curveOf =
  ({ fn, a, b, c, d }: Wave): Curve =>
  (x) =>
    a * Math[fn]((b * x + c) * RAD) + d;

/**
 * Every quarter degree over two turns, so a period of 360 still shows twice
 * and a peak at 90/8 = 11.25 is sampled on.
 */
const XS = Array.from({ length: 2881 }, (_, i) => i / 4);
const near = (p: number, q: number) => Math.abs(p - q) < 1e-9;
const sameCurve = (f: Curve, g: Curve) => XS.every((x) => near(f(x), g(x)));

/** What a curve does, found from its samples alone. */
function features(f: Curve) {
  const ys = XS.map(f);
  const max = Math.max(...ys);
  const min = Math.min(...ys);
  const mid = (max + min) / 2;
  const period = XS.find((p) => p > 0 && XS.slice(0, 1441).every((x) => near(f(x + p), f(x))));
  const firstWhere = (test: (x: number) => boolean) => XS.find((x) => x > 0 && test(x));
  return {
    max: Math.round(max * 1e6) / 1e6,
    min: Math.round(min * 1e6) / 1e6,
    mid: Math.round(mid * 1e6) / 1e6,
    amplitude: Math.round(((max - min) / 2) * 1e6) / 1e6,
    period,
    firstMax: firstWhere((x) => near(f(x), max)),
    firstMin: firstWhere((x) => near(f(x), min)),
    /** Where it first rises through its midline after x = 0. */
    rise: firstWhere((x) => near(f(x), mid) && f(x + 0.25) > f(x)),
  };
}

/** The translation across that takes `from` onto `to`, smallest first, if there is one. */
function shiftBetween(from: Curve, to: Curve): number | undefined {
  for (let s = 0; s <= 360; s += 1) {
    for (const t of [s, -s]) if (sameCurve((x) => from(x - t), to)) return t;
  }
  return undefined;
}

/** A number in front: '', '-', '3', '- 3', '\tfrac{1}{2}', '- \tfrac{1}{3}'. */
function coefficient(text: string): number {
  const t = text.replace(/\s+/g, '');
  if (t === '') return 1;
  if (t === '-') return -1;
  const frac = t.match(/^(-?)\\tfrac\{(\d+)\}\{(\d+)\}$/);
  if (frac) return ((frac[1] ? -1 : 1) * Number(frac[2])) / Number(frac[3]);
  expect(t, `unreadable coefficient ${text}`).toMatch(/^-?\d+$/);
  return Number(t);
}

/**
 * A rule read back into a, b, c and d: `3\sin 2x - 1`, `-\cos(3x + 60) + 2`,
 * `\sin(2(x - 30))`, `\cos \tfrac{x}{2}`, with or without `y = ` in front.
 */
function parseWave(tex: string): Wave {
  const match = tex.trim().replace(/^y = /, '').match(/^(.*?)\\(sin|cos)(.*)$/);
  if (!match) throw new Error(`no wave in ${tex}`);
  const [, front, fn, rest] = match;
  let b = 1;
  let c = 0;
  let tail: string;
  let r: RegExpMatchArray | null;
  const sign = (s: string) => (s === '+' ? 1 : -1);
  if ((r = rest.match(/^ (\d*)x(.*)$/))) {
    b = r[1] ? Number(r[1]) : 1;
    tail = r[2];
  } else if ((r = rest.match(/^ \\tfrac\{x\}\{(\d+)\}(.*)$/))) {
    b = 1 / Number(r[1]);
    tail = r[2];
  } else if ((r = rest.match(/^\((\d+)\(x ([+-]) (\d+)\)\)(.*)$/))) {
    b = Number(r[1]);
    c = b * sign(r[2]) * Number(r[3]);
    tail = r[4];
  } else if ((r = rest.match(/^\((\d*)x ([+-]) (\d+)\)(.*)$/))) {
    b = r[1] ? Number(r[1]) : 1;
    c = sign(r[2]) * Number(r[3]);
    tail = r[4];
  } else {
    throw new Error(`unreadable bracket in ${tex}`);
  }
  const end = tail.trim();
  expect(end, `unreadable constant in ${tex}`).toMatch(/^([+-] \d+)?$/);
  const d = end === '' ? 0 : sign(end[0]) * Number(end.slice(1).trim());
  return { fn: fn as Fn, a: coefficient(front), b, c, d };
}

/** The prose of a prompt, one string. */
function proseOf(slide: Slide): string {
  if (slide.kind === 'teach') return '';
  return slide.prompt
    .filter((block): block is Extract<Block, { kind: 'prose' }> => block.kind === 'prose')
    .map((block) => block.text)
    .join(' ');
}

/** Every `$y = ...$` in a piece of prose, in order. */
function rulesIn(text: string): string[] {
  return [...text.matchAll(/\$y = ([^$]+)\$/g)].map((m) => m[1]);
}

/** A tiles answer written into its template. */
function filled(slide: Extract<Slide, { kind: 'tiles' }>, tokens: string[] = slide.answer): string {
  return slide.template.replace(/\{(\d+)\}/g, (_, i: string) => tokens[Number(i)]);
}

/* ---------- Moves, read from words and applied ---------- */

type Move =
  | { kind: 'up'; k: number }
  | { kind: 'across'; k: number }
  | { kind: 'flip' }
  | { kind: 'shift'; p: number; q: number };

function applied(f: Curve, moves: Move[]): Curve {
  return moves.reduce<Curve>((g, move) => {
    if (move.kind === 'up') return (x) => move.k * g(x);
    if (move.kind === 'across') return (x) => g(x / move.k);
    if (move.kind === 'flip') return (x) => -g(x);
    return (x) => g(x - move.p) + move.q;
  }, f);
}

/** The moves a prompt describes, in the order its words give them. */
function movesInProse(text: string): Move[] {
  const found: { at: number; move: Move }[] = [];
  for (const m of text.matchAll(/stretched parallel to the \$([xy])\$-axis with scale factor \$([^$]+)\$/g)) {
    found.push({ at: m.index!, move: { kind: m[1] === 'y' ? 'up' : 'across', k: coefficient(m[2]) } });
  }
  for (const m of text.matchAll(/reflected in the \$x\$-axis/g)) found.push({ at: m.index!, move: { kind: 'flip' } });
  for (const m of text.matchAll(/translated by \$\\begin\{pmatrix\} (-?\d+) \\\\ (-?\d+) \\end\{pmatrix\}\$/g)) {
    found.push({ at: m.index!, move: { kind: 'shift', p: Number(m[1]), q: Number(m[2]) } });
  }
  return found.sort((p, q) => p.at - q.at).map(({ move }) => move);
}

/** Moves from a plain-text option: "Stretch parallel to the y-axis by 3, then translate 2 up". */
function movesInLabel(label: string): Move[] {
  return label.split(', then ').map((part): Move => {
    let m = part.match(/^[Ss]tretch parallel to the ([xy])-axis(?:,| by)(?: scale factor)? (\d+)(?:\/(\d+))?$/);
    if (m) {
      const k = m[3] ? Number(m[2]) / Number(m[3]) : Number(m[2]);
      return { kind: m[1] === 'y' ? 'up' : 'across', k };
    }
    m = part.match(/^[Tt]ranslate (\d+) (up|down)$/);
    if (m) return { kind: 'shift', p: 0, q: (m[2] === 'up' ? 1 : -1) * Number(m[1]) };
    m = part.match(/^[Tt]ranslate (\d+)° to the (right|left)$/);
    if (m) return { kind: 'shift', p: (m[2] === 'right' ? 1 : -1) * Number(m[1]), q: 0 };
    throw new Error(`unreadable move ${part}`);
  });
}

const SIN: Curve = (x) => Math.sin(x * RAD);
const COS: Curve = (x) => Math.cos(x * RAD);
const baseOf = (fn: string): Curve => (fn === 'cos' ? COS : SIN);

/** The options a choice slide offers whose reading fits, by id. */
function fitting(slide: Extract<Slide, { kind: 'choice' }>, fits: (label: string) => boolean): string[] {
  return slide.options.filter((option) => fits(option.label)).map((option) => option.id);
}

/* ---------- Lesson 1 ---------- */

describe('fun-wave-extremes', () => {
  it('asks the greatest or least value the wave reaches, or the a or d that reach the quoted ones', () => {
    for (const { slide, where } of draws('fun-wave-extremes')) {
      if (slide.kind !== 'expression') throw new Error(where);
      const text = proseOf(slide);
      const rules = rulesIn(text);
      if (rules.length === 1 && /^Find the/.test(text)) {
        const f = features(curveOf(parseWave(rules[0])));
        const expected = text.includes('greatest') ? f.max : f.min;
        expect(verdict(slide, `${expected}`), where).toBe('correct');
        continue;
      }
      const quoted = text.match(/greatest value of \$(-?\d+)\$ and a least value of \$(-?\d+)\$/);
      const fn = text.match(/\\(sin|cos) x/);
      expect(quoted && fn, where).toBeTruthy();
      const [max, min] = [Number(quoted![1]), Number(quoted![2])];
      const given = Number(slide.answer);
      // The answer, with the other letter fixed by the maximum, has to reach the minimum too.
      const wave = slide.lead === 'a =' ? { a: given, d: max - given } : { a: max - given, d: given };
      expect(wave.a, where).toBeGreaterThan(0);
      const f = features(curveOf({ fn: fn![1] as Fn, b: 1, c: 0, ...wave }));
      expect([f.max, f.min], where).toEqual([max, min]);
    }
  });
});

describe('fun-amp-slider', () => {
  it('slides to the height the described moves take the feature to', () => {
    for (const { slide, where } of draws('fun-amp-slider')) {
      if (slide.kind !== 'slider') throw new Error(where);
      const text = proseOf(slide);
      const moves = movesInProse(text);
      expect(moves.length, where).toBeGreaterThanOrEqual(2);
      const f = features(applied(baseOf(text.match(/\\(sin|cos) x/)![1]), moves));
      const expected = text.includes('greatest') ? f.max : text.includes('least') ? f.min : f.mid;
      expect(slide.answer, where).toBe(expected);
      expect(verdict(slide, `${expected}`), where).toBe('correct');
    }
  });
});

describe('fun-amp-tiles', () => {
  it('builds the rule of the curve the described moves make', () => {
    for (const { slide, where } of draws('fun-amp-tiles')) {
      if (slide.kind !== 'tiles') throw new Error(where);
      const text = proseOf(slide);
      const target = applied(baseOf(text.match(/\\(sin|cos) x/)![1]), movesInProse(text));
      expect(sameCurve(curveOf(parseWave(filled(slide))), target), `${where}: ${filled(slide)}`).toBe(true);
    }
  });
});

describe('fun-amp-flow', () => {
  it('names the stretch and translation the rule makes, and the value they give', () => {
    for (const { slide, where } of draws('fun-amp-flow')) {
      if (slide.kind !== 'flow') throw new Error(where);
      const wave = parseWave(slide.subject);
      const f = features(curveOf(wave));
      const base = baseOf(wave.fn);
      // Turned over when the curve does the opposite of its base just after the start.
      const flipped = Math.sign(curveOf(wave)(10) - f.mid) !== Math.sign(base(10));
      const front = `Stretch parallel to the $y$-axis, scale factor $${f.amplitude}$${flipped ? ', and reflect in the $x$-axis' : ''}`;
      const end = `Translate by $\\begin{pmatrix} 0 \\\\ ${f.mid} \\end{pmatrix}$`;
      const value = slide.steps[2].ask.includes('greatest') ? f.max : f.min;
      expect(verdict(slide, [front, end, `$${value}$`]), where).toBe('correct');
    }
  });
});

/* ---------- Lesson 2 ---------- */

describe('fun-xstretch-choice', () => {
  it('offers exactly one option that is the stated stretch across', () => {
    for (const { slide, where } of draws('fun-xstretch-choice')) {
      if (slide.kind !== 'choice') throw new Error(where);
      const text = proseOf(slide);
      const rules = rulesIn(text);
      const start = curveOf(parseWave(rules[0]));
      let right: string[];
      if (rules.length === 1) {
        const [move] = movesInProse(text);
        const target = applied(start, [move]);
        right = fitting(slide, (label) => sameCurve(curveOf(parseWave(label)), target));
      } else {
        const target = curveOf(parseWave(rules[1]));
        right = fitting(slide, (label) => sameCurve(applied(start, movesInLabel(label)), target));
      }
      expect(right, where).toEqual([slide.correctId]);
    }
  });
});

describe('fun-period-tree', () => {
  it('fills in the period before and after the stretch, and the b that draws the new curve', () => {
    for (const { slide, where } of draws('fun-period-tree')) {
      if (slide.kind !== 'tree') throw new Error(where);
      const text = proseOf(slide);
      const old = curveOf(parseWave(rulesIn(text)[0]));
      const stretched = applied(old, movesInProse(text));
      const before = features(old).period!;
      const after = features(stretched).period!;
      const [, , b] = slide.answer.map(Number);
      expect(sameCurve(curveOf({ fn: parseWave(rulesIn(text)[0]).fn, a: 1, b, c: 0, d: 0 }), stretched), where).toBe(true);
      expect(verdict(slide, [`${before}`, `${after}`, `${b}`]), where).toBe('correct');
    }
  });
});

describe('fun-b-from-graph', () => {
  it('asks the b whose wave has the ringed points where the prompt says', () => {
    for (const { slide, where } of draws('fun-b-from-graph')) {
      if (slide.kind !== 'expression') throw new Error(where);
      const text = proseOf(slide);
      const rule = rulesIn(text)[0].replace('bx', `${slide.answer}x`);
      const f = curveOf(parseWave(rule));
      const { max, min } = features(f);
      const [x1, x2] = [...text.matchAll(/\$x = (\d+)\$/g)].map((m) => Number(m[1]));
      expect(near(f(x1), max), `${where}: x = ${x1} is not a maximum`).toBe(true);
      const peaks = text.includes('two neighbouring maxima');
      expect(near(f(x2), peaks ? max : min), `${where}: x = ${x2}`).toBe(true);
      // Neighbours: no other maximum between two peaks, and nothing at all between a peak and a trough.
      for (const x of XS.filter((x) => x > x1 && x < x2)) {
        const extreme = near(f(x), max) || (!peaks && near(f(x), min));
        expect(extreme, `${where}: another extreme at ${x}`).toBe(false);
      }
      expect(x1 > 0 && x2 <= 360, where).toBe(true);
    }
  });
});

/* ---------- Lesson 3 ---------- */

describe('fun-phase-choice', () => {
  it('offers exactly one translation that takes the curve onto the moved one', () => {
    for (const { slide, where } of draws('fun-phase-choice')) {
      if (slide.kind !== 'choice') throw new Error(where);
      const [from, to] = rulesIn(proseOf(slide)).map((rule) => curveOf(parseWave(rule)));
      const right = fitting(slide, (label) => sameCurve(applied(from, movesInLabel(label)), to));
      expect(right, where).toEqual([slide.correctId]);
    }
  });
});

describe('fun-phase-steps', () => {
  it('rewrites the rule as the same curve, then gives the translation that makes it', () => {
    for (const { slide, where } of draws('fun-phase-steps')) {
      if (slide.kind !== 'steps') throw new Error(where);
      const moved = curveOf(parseWave(slide.start[0]));
      const [factor, move] = slide.reductions;
      expect(sameCurve(curveOf(parseWave(factor.value)), moved), where).toBe(true);
      const unmoved = curveOf(parseWave(rulesIn(proseOf(slide))[0]));
      const shift = shiftBetween(unmoved, moved);
      expect(move.value, where).toBe(`\\begin{pmatrix} ${shift} \\\\ 0 \\end{pmatrix}`);
      // And no other rewriting in the bank is the same curve.
      const alike = factor.bank.filter((tex) => sameCurve(curveOf(parseWave(tex)), moved));
      expect(alike, where).toEqual([factor.value]);
    }
  });
});

describe('fun-phase-slider', () => {
  it('slides to the first peak or trough of the moved curve, from the one ringed on the unmoved', () => {
    for (const { slide, where } of draws('fun-phase-slider')) {
      if (slide.kind !== 'slider') throw new Error(where);
      const text = proseOf(slide);
      const [unmoved, moved] = rulesIn(text).map((rule) => features(curveOf(parseWave(rule))));
      const peak = text.includes('maximum');
      const ringed = Number(text.match(/ringed, at \$x = (\d+)\$/)![1]);
      expect(ringed, where).toBe(peak ? unmoved.firstMax : unmoved.firstMin);
      const expected = peak ? moved.firstMax : moved.firstMin;
      expect(slide.answer, where).toBe(expected);
      expect(verdict(slide, `${expected}`), where).toBe('correct');
    }
  });
});

describe('fun-phase-flow', () => {
  it('rewrites the rule as the same curve and names the move from the unmoved one', () => {
    for (const { slide, where } of draws('fun-phase-flow')) {
      if (slide.kind !== 'flow') throw new Error(where);
      const moved = curveOf(parseWave(slide.subject));
      const unmoved = curveOf(parseWave(rulesIn(proseOf(slide))[0]));
      const rewritten = slide.steps[0].branches.map((branch) => branch.label).filter((label) =>
        sameCurve(curveOf(parseWave(label.slice(1, -1))), moved),
      );
      expect(rewritten.length, where).toBe(1);
      const shift = shiftBetween(unmoved, moved)!;
      expect(shift, where).toBeDefined();
      const answer = [rewritten[0], shift > 0 ? 'Right' : 'Left', `$${Math.abs(shift)}°$`];
      expect(verdict(slide, answer), where).toBe('correct');
    }
  });
});

/* ---------- Lesson 4 ---------- */

/** Ringed points quoted as `(x, y)`, in order. */
function pointsIn(text: string): [number, number][] {
  return [...text.matchAll(/\$\((\d+), (-?\d+)\)\$/g)].map((m) => [Number(m[1]), Number(m[2])]);
}

describe('fun-wave-read', () => {
  it('builds the rule of a wave whose greatest and least values are the ringed points', () => {
    for (const { slide, where } of draws('fun-wave-read')) {
      if (slide.kind !== 'tiles') throw new Error(where);
      const f = curveOf(parseWave(filled(slide)));
      const { max, min, firstMax, firstMin } = features(f);
      const points = pointsIn(proseOf(slide));
      expect(points.length, where).toBe(2);
      const [top, bottom] = [...points].sort((p, q) => q[1] - p[1]);
      expect([top[1], bottom[1]], where).toEqual([max, min]);
      // They are the first of each after x = 0, so the reading of b and the sign is fixed.
      expect([top[0], bottom[0]], where).toEqual([firstMax, firstMin]);
    }
  });
});

describe('fun-wave-parts-tree', () => {
  it('fills in the difference, the sum, b, a and d of the wave the prompt describes', () => {
    for (const { slide, where } of draws('fun-wave-parts-tree')) {
      if (slide.kind !== 'tree') throw new Error(where);
      const text = proseOf(slide);
      const fn = slide.expression.includes('cos') ? 'cos' : 'sin';
      const [, , b, a, d] = slide.answer.map(Number);
      const f = features(curveOf({ fn, a, b, c: 0, d }));
      const stated = text.match(/greatest value of \$(-?\d+)\$, a least value of \$(-?\d+)\$ and a period of \$(\d+)°\$/);
      if (stated) {
        expect([f.max, f.min, f.period], where).toEqual(stated.slice(1).map(Number));
      } else {
        const [first, second] = pointsIn(text);
        const [top, bottom] = first[1] > second[1] ? [first, second] : [second, first];
        expect([top[0], top[1], bottom[0], bottom[1]], where).toEqual([f.firstMax, f.max, f.firstMin, f.min]);
      }
      expect(verdict(slide, [`${f.max - f.min}`, `${f.max + f.min}`, `${360 / f.period!}`, `${f.amplitude}`, `${f.mid}`]), where).toBe('correct');
    }
  });
});

describe('fun-graph-shift', () => {
  it('asks the c whose wave starts where the ringed point is', () => {
    for (const { slide, where } of draws('fun-graph-shift')) {
      if (slide.kind !== 'expression') throw new Error(where);
      const text = proseOf(slide);
      const f = features(curveOf(parseWave(rulesIn(text)[0].replace('c)', `${slide.answer})`))));
      const s = Number(text.match(/\$x = (\d+)\$/)![1]);
      expect(s, where).toBe(text.includes('\\sin') ? f.rise : f.firstMax);
      expect(Number(slide.answer), where).toBeGreaterThan(0);
      expect(Number(slide.answer), where).toBeLessThan(180);
    }
  });
});

describe('fun-wave-choice', () => {
  it('offers exactly one rule with the stated range and rise through the midline', () => {
    for (const { slide, where } of draws('fun-wave-choice')) {
      if (slide.kind !== 'choice') throw new Error(where);
      const text = proseOf(slide);
      const [min, max] = [...text.matchAll(/\$(-?\d+)\$/g)].slice(0, 2).map((m) => Number(m[1]));
      const s = Number(text.match(/\$x = (\d+)\$/)![1]);
      const right = fitting(slide, (label) => {
        const f = features(curveOf(parseWave(label)));
        return f.min === min && f.max === max && f.rise === s;
      });
      expect(right, where).toEqual([slide.correctId]);
    }
  });
});

/* ---------- Lesson 5 ---------- */

describe('fun-moves-tiles', () => {
  it('builds the rule of the curve the two moves make, in the order given', () => {
    for (const { slide, where } of draws('fun-moves-tiles')) {
      if (slide.kind !== 'tiles') throw new Error(where);
      const text = proseOf(slide);
      const moves = movesInProse(text);
      expect(moves.length, where).toBe(2);
      const target = applied(baseOf(text.match(/\\(sin|cos) x/)![1]), moves);
      expect(sameCurve(curveOf(parseWave(filled(slide))), target), `${where}: ${filled(slide)}`).toBe(true);
      // Made the other way round, the moves draw a different curve.
      const swapped = applied(baseOf(text.match(/\\(sin|cos) x/)![1]), [...moves].reverse());
      expect(sameCurve(swapped, target), `${where}: the order makes no difference`).toBe(false);
    }
  });
});

describe('fun-moves-choice', () => {
  it('offers exactly one pair of moves that, in its order, draws the rule', () => {
    for (const { slide, where } of draws('fun-moves-choice')) {
      if (slide.kind !== 'choice') throw new Error(where);
      const text = proseOf(slide);
      const [start, rule] = rulesIn(text);
      const target = curveOf(parseWave(rule));
      const right = fitting(slide, (label) => sameCurve(applied(curveOf(parseWave(start)), movesInLabel(label)), target));
      expect(right, where).toEqual([slide.correctId]);
    }
  });
});

/* ======================================================================
 * Level 6: Functions in Modelling, every model rebuilt from its story
 * ==================================================================== */

/*
 * Nothing below calls the generator's helpers. Each story is recognised by
 * the one word its setting always uses, its numbers are read in the order
 * the story states them, and the model is built here from what the words
 * say: a charge plus a rate, an amount less a rate, a fence of P making a
 * rectangle whose width and length add to P/2, a fixed amount divided, or an
 * amount multiplied every step. Every quoted value, domain end, inverse and
 * composite is then held to that model.
 */

type StoryKind = 'up' | 'down' | 'area' | 'recip' | 'grow';

const STORY_KINDS: Record<string, { kind: StoryKind; count?: boolean }> = {
  taxi: { kind: 'up' },
  bike: { kind: 'up' },
  plumber: { kind: 'up' },
  gym: { kind: 'up', count: true },
  'T-shirt': { kind: 'up', count: true },
  theatre: { kind: 'up', count: true },
  hall: { kind: 'up', count: true },
  gigabyte: { kind: 'up' },
  tank: { kind: 'down' },
  candle: { kind: 'down' },
  battery: { kind: 'down' },
  saved: { kind: 'down', count: true },
  snowman: { kind: 'down' },
  balloon: { kind: 'down' },
  fencing: { kind: 'area' },
  edging: { kind: 'area' },
  rope: { kind: 'area' },
  wire: { kind: 'area' },
  paddock: { kind: 'area' },
  sandpit: { kind: 'area' },
  journey: { kind: 'recip' },
  bill: { kind: 'recip', count: true },
  pool: { kind: 'recip' },
  card: { kind: 'recip' },
  sweets: { kind: 'recip', count: true },
  job: { kind: 'recip', count: true },
  bacteria: { kind: 'grow' },
  views: { kind: 'grow' },
  fish: { kind: 'grow' },
  car: { kind: 'grow' },
  medicine: { kind: 'grow' },
  interest: { kind: 'grow' },
};

/** What a growth story multiplies by each step, from its words. */
function growthRate(text: string): number {
  const rates: [RegExp, number][] = [
    [/doubles/, 2],
    [/triple/, 3],
    [/grows by half again/, 1.5],
    [/loses a quarter/, 0.75],
    [/halves/, 0.5],
    [/\$10\$% interest/, 1.1],
  ];
  const found = rates.filter(([pattern]) => pattern.test(text));
  expect(found.length, `no single growth rate in ${text}`).toBe(1);
  return found[0][1];
}

interface Story {
  key: string;
  kind: StoryKind;
  count: boolean;
  nums: number[];
  f: (x: number) => number;
  /** Width and length together, for a rectangle. */
  k?: number;
}

/** The model a story describes, built from its words and its numbers. */
function storyIn(text: string): Story {
  const keys = Object.keys(STORY_KINDS).filter((key) => new RegExp(`\\b${key}\\b`).test(text));
  expect(keys.length, `no single setting in ${text}`).toBe(1);
  const [key] = keys;
  const { kind, count = false } = STORY_KINDS[key];
  const nums = [...text.matchAll(/\$(\d+)\$/g)].map((m) => Number(m[1]));
  const [n0, n1] = nums;
  if (kind === 'up') return { key, kind, count, nums, f: (x) => n0 + n1 * x };
  if (kind === 'down') return { key, kind, count, nums, f: (x) => n0 - n1 * x };
  if (kind === 'area') return { key, kind, count, nums, k: n0 / 2, f: (x) => x * (n0 / 2 - x) };
  if (kind === 'recip') return { key, kind, count, nums, f: (x) => n0 / x };
  const r = growthRate(text);
  return { key, kind, count, nums, f: (x) => n0 * r ** x };
}

/** Every display block's TeX in a prompt, in order. */
function displaysOf(slide: Slide): string[] {
  if (slide.kind === 'teach') return [];
  return slide.prompt
    .filter((block): block is Extract<Block, { kind: 'display' }> => block.kind === 'display')
    .map((block) => block.tex);
}

/** A rule's right-hand side as a function: `15 + 4n`, `40 - 5t`, `x(10 - x)`, `\frac{120}{v}`. */
function ruleFn(tex: string, v: string): (x: number) => number {
  const t = tex.trim();
  let m: RegExpMatchArray | null;
  if ((m = t.match(new RegExp(`^(\\d+) ([+-]) (\\d+)${v}$`)))) {
    const [a, sign, b] = [Number(m[1]), m[2], Number(m[3])];
    return (x) => a + (sign === '+' ? b : -b) * x;
  }
  if ((m = t.match(new RegExp(`^${v}\\((\\d+) - ${v}\\)$`)))) {
    const k = Number(m[1]);
    return (x) => x * (k - x);
  }
  if ((m = t.match(new RegExp(`^\\\\frac\\{(\\d+)\\}\\{${v}\\}$`)))) {
    const K = Number(m[1]);
    return (x) => K / x;
  }
  throw new Error(`unreadable rule ${tex}`);
}

/** `C(n) = 15 + 4n`, possibly followed by `, \quad` and a domain. */
function ruleLineIn(tex: string): { out: string; v: string; f: (x: number) => number; rhs: string } {
  const m = tex.match(/^([A-Z])\(([a-z])\) = (.*?)(?:, \\quad .*)?$/);
  if (!m) throw new Error(`no rule in ${tex}`);
  return { out: m[1], v: m[2], rhs: m[3], f: ruleFn(m[3], m[2]) };
}

/** The same function, checked at the whole inputs 1 to 12. */
function agrees(f: (x: number) => number, g: (x: number) => number): boolean {
  return range(1, 12).every((x) => Math.abs(f(x) - g(x)) < 1e-9);
}

const range = (from: number, to: number): number[] => Array.from({ length: to - from + 1 }, (_, i) => from + i);

/** A number as TeX writes it here: `12`, `-4`, `\tfrac{3}{2}`. */
function texNumber(tex: string): number {
  const t = tex.replace(/\$/g, '').trim();
  const frac = t.match(/^\\tfrac\{(\d+)\}\{(\d+)\}$/);
  if (frac) return Number(frac[1]) / Number(frac[2]);
  expect(t, `unreadable number ${tex}`).toMatch(/^-?\d+(\.\d+)?$/);
  return Number(t);
}

/** A table slide with its blanks filled from its answer. */
function mergedRows(slide: Extract<Slide, { kind: 'table' }>): string[][] {
  let next = 0;
  return slide.rows.map((row) => row.map((cell) => (cell === null ? slide.answer[next++] : cell)));
}

/** The correct option's label. */
function correctLabel(slide: Extract<Slide, { kind: 'choice' }>): string {
  return slide.options.find((option) => option.id === slide.correctId)!.label;
}

const FAMILY_OF: Record<StoryKind, string> = {
  up: 'Linear',
  down: 'Linear',
  area: 'Quadratic',
  recip: 'Reciprocal',
  grow: 'Exponential',
};

/* ---------- Lesson 1 ---------- */

describe('fun-model-family', () => {
  it('names the family the story describes', () => {
    for (const { slide, where } of draws('fun-model-family')) {
      if (slide.kind !== 'choice') throw new Error(where);
      const story = storyIn(proseOf(slide).split(' Which kind')[0]);
      expect(correctLabel(slide), where).toBe(FAMILY_OF[story.kind]);
      expect(new Set(slide.options.map((o) => o.label)).size, where).toBe(4);
    }
  });
});

describe('fun-family-flow', () => {
  it('walks to the one pattern the table has, its number, and its family', () => {
    for (const { slide, where } of draws('fun-family-flow')) {
      if (slide.kind !== 'flow') throw new Error(where);
      const m = slide.subject.match(/x & (.*?) \\\\ \\hline y & (.*?) \\end/);
      const xs = m![1].split(' & ').map(Number);
      const ys = m![2].split(' & ').map(Number);
      expect(xs.slice(1).every((x, i) => x === xs[i] + 1), `${where}: x does not go up in ones`).toBe(true);
      const same = (values: number[]) => values.every((v) => Math.abs(v - values[0]) < 1e-9);
      const d1 = ys.slice(1).map((y, i) => y - ys[i]);
      const d2 = d1.slice(1).map((d, i) => d - d1[i]);
      const ratio = ys.slice(1).map((y, i) => y / ys[i]);
      const product = ys.map((y, i) => y * xs[i]);
      const patterns = [
        { holds: same(d1), label: 'It goes up or down by the same amount', value: d1[0], family: 'Linear' },
        { holds: same(ratio), label: 'It is multiplied by the same number', value: ratio[0], family: 'Exponential' },
        { holds: !same(d1) && same(d2), label: 'The change itself changes by the same amount', value: d2[0], family: 'Quadratic' },
        { holds: same(product), label: '$x \\times y$ stays the same', value: product[0], family: 'Reciprocal' },
      ].filter((p) => p.holds);
      expect(patterns.length, `${where}: ${patterns.length} patterns hold`).toBe(1);
      const [p] = patterns;
      expect(slide.answer[0], where).toBe(p.label);
      expect(texNumber(slide.answer[1]), where).toBeCloseTo(p.value, 9);
      expect(slide.answer[2], where).toBe(p.family);
    }
  });
});

describe('fun-family-next', () => {
  it('fills every row with the model the story describes', () => {
    for (const { slide, where } of draws('fun-family-next')) {
      if (slide.kind !== 'table') throw new Error(where);
      const story = storyIn(proseOf(slide).split(' In the table')[0]);
      for (const [x, y] of mergedRows(slide)) {
        expect(Number(y), `${where}: row ${x}`).toBeCloseTo(story.f(Number(x)), 9);
        expect(Number.isInteger(Number(y)), `${where}: ${y} is not whole`).toBe(true);
      }
    }
  });
});

/** The sketch's curve, in the plot's own units across and in pixels above the x-axis up. */
function sketchPoints(svg: string): [number, number][] {
  const axis = svg.match(/<line x1="12" y1="([\d.]+)" x2="268" y2="[\d.]+" stroke="currentColor" stroke-width="1" opacity="0.55"/);
  const path = svg.match(/<path class="plot-accent"[^>]* d="([^"]+)"/);
  if (!axis || !path) throw new Error('no axis or curve in the sketch');
  const zero = Number(axis[1]);
  return [...path[1].matchAll(/(-?[\d.]+),(-?[\d.]+)/g)]
    .map((m) => [Number(m[1]), Number(m[2])])
    .filter(([, py]) => py >= 12 && py <= 138)
    .map(([px, py]) => [((px - 12) / 256) * 10, zero - py]);
}

/** Least-squares residual of y against the given basis functions of x. */
function residual(points: [number, number][], basis: ((x: number) => number)[], value = (y: number) => y): number {
  const n = basis.length;
  const ata = Array.from({ length: n }, () => new Array(n).fill(0));
  const aty = new Array(n).fill(0);
  for (const [x, y] of points) {
    const row = basis.map((b) => b(x));
    for (let i = 0; i < n; i += 1) {
      aty[i] += row[i] * value(y);
      for (let j = 0; j < n; j += 1) ata[i][j] += row[i] * row[j];
    }
  }
  // Gaussian elimination: small systems, well conditioned enough here.
  for (let i = 0; i < n; i += 1) {
    for (let j = i + 1; j < n; j += 1) {
      const factor = ata[j][i] / ata[i][i];
      for (let k = i; k < n; k += 1) ata[j][k] -= factor * ata[i][k];
      aty[j] -= factor * aty[i];
    }
  }
  const c = new Array(n).fill(0);
  for (let i = n - 1; i >= 0; i -= 1) {
    c[i] = (aty[i] - ata[i].slice(i + 1).reduce((sum, a, j) => sum + a * c[i + 1 + j], 0)) / ata[i][i];
  }
  return Math.max(...points.map(([x, y]) => Math.abs(value(y) - basis.reduce((sum, b, i) => sum + c[i] * b(x), 0))));
}

describe('fun-family-sketch', () => {
  it('draws a curve only the named family fits', () => {
    for (const { slide, where } of draws('fun-family-sketch')) {
      if (slide.kind !== 'choice') throw new Error(where);
      const svg = slide.prompt.find((block): block is Extract<Block, { kind: 'diagram' }> => block.kind === 'diagram')!.svg;
      const points = sketchPoints(svg);
      expect(points.length, `${where}: too little of the curve is visible`).toBeGreaterThan(40);
      const positive = points.filter(([, y]) => y > 4);
      const fits = [
        { family: 'Linear', fits: residual(points, [() => 1, (x) => x]) < 0.3 },
        { family: 'Quadratic', fits: residual(points, [() => 1, (x) => x, (x) => x * x]) < 0.3 && residual(points, [() => 1, (x) => x]) >= 0.3 },
        { family: 'Exponential', fits: residual(positive, [() => 1, (x) => x], Math.log) < 0.02 && residual(points, [() => 1, (x) => x]) >= 0.3 },
        { family: 'Reciprocal', fits: residual(positive, [(x) => 1 / x]) < 0.3 },
      ].filter((row) => row.fits);
      expect(fits.map((row) => row.family), where).toEqual([correctLabel(slide)]);
    }
  });
});

/* ---------- Lesson 2 ---------- */

describe('fun-model-rule', () => {
  it('builds the rule the story describes, and no other bank tile would', () => {
    for (const { slide, where } of draws('fun-model-rule')) {
      if (slide.kind !== 'tiles') throw new Error(where);
      const story = storyIn(proseOf(slide).split(' Write the rule')[0]);
      const built = ruleLineIn(filled(slide));
      expect(agrees(built.f, story.f), `${where}: ${filled(slide)}`).toBe(true);
      // A distractor's rule may be one no story here has, such as `90 - v`;
      // one that cannot be read cannot fit either.
      const fits = (tokens: string[]) => {
        try {
          return agrees(ruleLineIn(filled(slide, tokens)).f, story.f);
        } catch {
          return false;
        }
      };
      if (slide.answer.length === 1) {
        for (const token of slide.bank.filter((t) => t !== slide.answer[0])) expect(fits([token]), `${where}: ${token} also fits`).toBe(false);
      } else {
        expect(fits([...slide.answer].reverse()), `${where}: swapped also fits`).toBe(false);
      }
    }
  });
});

describe('fun-model-value', () => {
  it('asks the story model at the input the lead names', () => {
    for (const id of ['fun-model-value', 'fun-model-value+choice']) {
      for (const { slide, where } of draws(id)) {
        const text = proseOf(slide);
        const story = storyIn(text.split(' The model is')[0].split(' Build the rule')[0]);
        const shown = displaysOf(slide).filter((tex) => tex.includes(' = '));
        if (shown.length > 0) expect(agrees(ruleLineIn(shown[0]).f, story.f), where).toBe(true);
        const lead = slide.kind === 'expression' ? slide.lead! : displaysOf(slide).slice(-1)[0];
        const x = Number(lead.match(/^[A-Z]\((\d+)\)/)![1]);
        const expected = story.f(x);
        expect(Number.isInteger(expected), `${where}: ${expected}`).toBe(true);
        if (slide.kind === 'expression') expect(verdict(slide, `${expected}`), where).toBe('correct');
        else if (slide.kind === 'choice') expect(Number(correctLabel(slide)), where).toBe(expected);
        else throw new Error(where);
      }
    }
  });
});

describe('fun-model-meaning', () => {
  it('names the part of the story the asked number stands for', () => {
    for (const { slide, where } of draws('fun-model-meaning')) {
      if (slide.kind !== 'choice') throw new Error(where);
      const text = proseOf(slide);
      const story = storyIn(text.split(' The model is')[0]);
      const rule = ruleLineIn(displaysOf(slide)[0]);
      expect(agrees(rule.f, story.f), where).toBe(true);
      const part = text.match(/What does (?:the )?\$([^$]+)\$ stand for\?/)![1];
      let role: RegExp;
      const line = rule.rhs.match(/^(\d+) [+-] (\d+)[a-z]$/);
      if (line) role = part === line[1] ? /fixed|at the start/ : part === line[2] ? /\beach\b/ : /^$/;
      else if (/\\frac/.test(rule.rhs)) role = /^The whole/;
      else role = part.includes(' - ') ? /^The length/ : /added together/;
      const matching = slide.options.filter((o) => role.test(o.label)).map((o) => o.id);
      expect(matching, `${where}: ${part} in ${rule.rhs}`).toEqual([slide.correctId]);
    }
  });
});

describe('fun-rule-machine', () => {
  it('fills in the story arithmetic in order', () => {
    for (const { slide, where } of draws('fun-rule-machine')) {
      if (slide.kind !== 'tree') throw new Error(where);
      const story = storyIn(proseOf(slide).split(' The model is')[0]);
      const x = Number(slide.expression.match(/\((\d+)\)/)![1]);
      const [inner, result] = slide.answer.map(Number);
      expect(result, where).toBe(story.f(x));
      expect(inner, where).toBe(story.kind === 'area' ? story.k! - x : story.nums[1] * x);
      expect(agrees(ruleLineIn(displaysOf(slide)[0]).f, story.f), where).toBe(true);
    }
  });
});

/* ---------- Lesson 3 ---------- */

interface Domain {
  whole: boolean;
  lo: number;
  loIn: boolean;
  hi: number;
  hiIn: boolean;
}

/** The inputs a story allows, from its words. */
function domainOf(story: Story): Domain {
  const [n0, n1] = story.nums;
  if (story.kind === 'up') return { whole: story.count, lo: 0, loIn: true, hi: Infinity, hiIn: false };
  if (story.kind === 'down') return { whole: story.count, lo: 0, loIn: true, hi: n0 / n1, hiIn: true };
  if (story.kind === 'area') return { whole: false, lo: 0, loIn: false, hi: story.k!, hiIn: false };
  return story.count
    ? { whole: true, lo: 1, loIn: true, hi: Infinity, hiIn: false }
    : { whole: false, lo: 0, loIn: false, hi: Infinity, hiIn: false };
}

/** A written domain read back: `n = 0, 1, 2, \ldots, 8`, `0 < x < 10`, `v \geq 0`. */
function readDomain(tex: string): Domain {
  let m: RegExpMatchArray | null;
  if ((m = tex.match(/^[a-z] = (\d), \d, \d, \\ldots(?:, (\d+))?$/))) {
    return { whole: true, lo: Number(m[1]), loIn: true, hi: m[2] ? Number(m[2]) : Infinity, hiIn: m[2] !== undefined };
  }
  if ((m = tex.match(/^(\d+) (<|\\leq) [a-z] (<|\\leq) (\d+)$/))) {
    return { whole: false, lo: Number(m[1]), loIn: m[2] !== '<', hi: Number(m[4]), hiIn: m[3] !== '<' };
  }
  if ((m = tex.match(/^[a-z] (>|\\geq) (\d+)$/))) {
    return { whole: false, lo: Number(m[2]), loIn: m[1] !== '>', hi: Infinity, hiIn: false };
  }
  throw new Error(`unreadable domain ${tex}`);
}

describe('fun-model-domain', () => {
  it('offers exactly one domain, the one the story allows', () => {
    for (const { slide, where } of draws('fun-model-domain')) {
      if (slide.kind !== 'choice') throw new Error(where);
      const expected = domainOf(storyIn(proseOf(slide).split(' The model is')[0]));
      const right = fitting(slide, (label) => JSON.stringify(readDomain(label)) === JSON.stringify(expected));
      expect(right, where).toEqual([slide.correctId]);
    }
  });
});

describe('fun-sense-flow', () => {
  it('walks to the domain the story allows', () => {
    for (const { slide, where } of draws('fun-sense-flow')) {
      if (slide.kind !== 'flow') throw new Error(where);
      const d = domainOf(storyIn(proseOf(slide)));
      const expected = [
        d.whole ? 'Whole numbers only: it counts things' : 'Any number: it measures something',
        d.lo === 1 ? 'At $1$, included' : d.loIn ? 'At $0$, included' : 'Just above $0$, not included',
        ...(Number.isFinite(d.hi)
          ? [d.hiIn ? 'At a largest value, included' : 'Just short of a value, not included', `$${d.hi}$`]
          : ['It never stops']),
      ];
      expect(slide.answer, where).toEqual(expected);
    }
  });
});

describe('fun-domain-line', () => {
  it('shades the domain the story allows, and the drawing of it is marked right', () => {
    for (const { slide, where } of draws('fun-domain-line')) {
      if (slide.kind !== 'numberLine') throw new Error(where);
      const d = domainOf(storyIn(proseOf(slide).split(' The model is')[0]));
      expect(d.whole, where).toBe(false);
      const hi = Number.isFinite(d.hi) ? `${d.hi}` : 'inf';
      expect(slide.answer, where).toBe(`${d.loIn ? '[' : '('}${d.lo},${hi}${d.hiIn ? ']' : ')'}`);
      const dots = [`${d.lo}${d.loIn ? 'c' : 'o'}`, ...(Number.isFinite(d.hi) ? [`${d.hi}${d.hiIn ? 'c' : 'o'}`] : [])];
      expect(verdict(slide, `${dots.join(',')}/${d.lo}:${hi}`), where).toBe('correct');
      expect(Number.isFinite(d.hi) ? d.hi : 0, where).toBeLessThan(slide.max);
    }
  });
});

describe('fun-model-range', () => {
  it('slides to the greatest or least value the model takes over the stated domain', () => {
    for (const { slide, where } of draws('fun-model-range')) {
      if (slide.kind !== 'slider') throw new Error(where);
      const text = proseOf(slide);
      const story = storyIn(text.split(' The model is')[0]);
      const display = displaysOf(slide)[0];
      expect(agrees(ruleLineIn(display).f, story.f), where).toBe(true);
      const ends = display.match(/(\d+) (<|\\leq) [a-z] (<|\\leq) (\d+)$/)!;
      const [lo, hi] = [Number(ends[1]), Number(ends[4])];
      const xs = Array.from({ length: 4001 }, (_, i) => lo + ((hi - lo) * i) / 4000).filter((x) =>
        ends[2] === '<' ? x > lo && x < hi : true,
      );
      const values = xs.map(story.f);
      const expected = text.includes('greatest') ? Math.max(...values) : Math.min(...values);
      expect(slide.answer, where).toBeCloseTo(expected, 6);
    }
  });
});

/* ---------- Lesson 4 ---------- */

describe('fun-model-inverse', () => {
  it('asks the one input the story model sends to the stated output', () => {
    for (const id of ['fun-model-inverse', 'fun-model-inverse+choice']) {
      for (const { slide, where } of draws(id)) {
        const text = proseOf(slide);
        const story = storyIn(text.split(' The model is')[0]);
        const y = Number(text.match(/\^\{-1\}\((\d+)\)/)![1]);
        const inputs = range(1, 400).filter((x) => Math.abs(story.f(x) - y) < 1e-9);
        expect(inputs.length, `${where}: ${inputs.length} inputs give ${y}`).toBe(1);
        if (slide.kind === 'expression') expect(verdict(slide, `${inputs[0]}`), where).toBe('correct');
        else if (slide.kind === 'choice') expect(Number(correctLabel(slide)), where).toBe(inputs[0]);
        else throw new Error(where);
      }
    }
  });
});

/** A conversion's display, `k = 1.6m` or `F = 1.8C + 32`, as a function. */
function conversionFn(tex: string): { from: string; to: string; f: (x: number) => number } {
  const m = tex.match(/^([A-Za-z]) = (\d+(?:\.\d+)?)([A-Za-z])(?: \+ (\d+))?$/);
  if (!m) throw new Error(`unreadable conversion ${tex}`);
  const [times, add] = [Number(m[2]), m[4] ? Number(m[4]) : 0];
  return { to: m[1], from: m[3], f: (x) => times * x + add };
}

describe('fun-convert-table', () => {
  it('fills both columns with values that convert into each other', () => {
    for (const { slide, where } of draws('fun-convert-table')) {
      if (slide.kind !== 'table') throw new Error(where);
      const conv = conversionFn(displaysOf(slide)[0]);
      expect(slide.columns, where).toEqual([conv.from, conv.to]);
      for (const [x, y] of mergedRows(slide)) expect(conv.f(Number(x)), `${where}: ${x} -> ${y}`).toBeCloseTo(Number(y), 9);
      expect(slide.rows.some((row) => row[0] === null), `${where}: nothing to run backwards`).toBe(true);
      expect(slide.rows.some((row) => row[1] === null), `${where}: nothing to run forwards`).toBe(true);
    }
  });
});

/** An inverse built from tiles: `n = (C - 15) \div 4`, `t = (80 - V) \div 5`. */
function inverseFn(tex: string, out: string): (y: number) => number {
  let m: RegExpMatchArray | null;
  if ((m = tex.match(new RegExp(`^[A-Za-z] = \\(${out} ([+-]) (\\d+(?:\\.\\d+)?)\\) \\\\div (-?\\d+(?:\\.\\d+)?)$`)))) {
    const [sign, a, b] = [m[1], Number(m[2]), Number(m[3])];
    return (y) => (y + (sign === '+' ? a : -a)) / b;
  }
  if ((m = tex.match(new RegExp(`^[A-Za-z] = \\((\\d+) - ${out}\\) \\\\div (\\d+)$`)))) {
    const [a, b] = [Number(m[1]), Number(m[2])];
    return (y) => (a - y) / b;
  }
  throw new Error(`unreadable inverse ${tex}`);
}

describe('fun-inverse-tiles', () => {
  it('builds the rule that undoes the model', () => {
    for (const { slide, where } of draws('fun-inverse-tiles')) {
      if (slide.kind !== 'tiles') throw new Error(where);
      const display = displaysOf(slide)[0];
      let forward: (x: number) => number;
      let out: string;
      if (/^[A-Z]\([a-z]\)/.test(display)) {
        const rule = ruleLineIn(display);
        expect(agrees(rule.f, storyIn(proseOf(slide).split(' The model is')[0]).f), where).toBe(true);
        [forward, out] = [rule.f, rule.out];
      } else {
        const conv = conversionFn(display);
        [forward, out] = [conv.f, conv.to];
      }
      const back = inverseFn(filled(slide), out);
      for (const x of range(1, 12)) expect(back(forward(x)), `${where}: ${filled(slide)} at ${x}`).toBeCloseTo(x, 9);
    }
  });
});

describe('fun-no-inverse-flow', () => {
  it('finds both widths, says there is no inverse, and keeps the one domain that has one', () => {
    for (const { slide, where } of draws('fun-no-inverse-flow')) {
      if (slide.kind !== 'flow') throw new Error(where);
      const story = storyIn(proseOf(slide));
      const k = story.k!;
      const area = Number(slide.subject.match(/A = (\d+)/)![1]);
      const widths = range(1, k - 1).filter((x) => story.f(x) === area);
      expect(widths.length, where).toBe(2);
      expect(slide.answer[0], where).toBe(`$x = ${widths[0]}$ or $x = ${widths[1]}$`);
      expect(slide.answer[1], where).toBe('No: one area comes from two widths');
      const oneToOne = (label: string) => {
        const d = readDomain(label.replace(/\$/g, ''));
        const xs = Array.from({ length: 2001 }, (_, i) => (k * i) / 2000).filter(
          (x) => x > 0 && x < k && (d.loIn ? x >= d.lo : x > d.lo) && (d.hiIn ? x <= d.hi : x < d.hi),
        );
        const ys = xs.map(story.f);
        return ys.every((y, i) => i === 0 || y > ys[i - 1]) || ys.every((y, i) => i === 0 || y < ys[i - 1]);
      };
      const restrict = slide.steps.find((step) => step.id === 'restrict')!;
      const good = restrict.branches.filter((branch) => oneToOne(branch.label)).map((branch) => branch.label);
      expect(good, where).toEqual([slide.answer[2]]);
    }
  });
});

/* ---------- Lesson 5 ---------- */

/** `x - 10`, `1.2x`, `1.2(x - 10)`, `1.2x - 10` as a function. */
function priceFn(tex: string): (x: number) => number {
  const t = tex.trim();
  let m: RegExpMatchArray | null;
  const signed = (sign: string, v: string) => (sign === '+' ? 1 : -1) * Number(v);
  if ((m = t.match(/^x ([+-]) (\d+)$/))) {
    const c = signed(m[1], m[2]);
    return (x) => x + c;
  }
  if ((m = t.match(/^(\d+(?:\.\d+)?)\(x ([+-]) (\d+)\)$/))) {
    const [k, c] = [Number(m[1]), signed(m[2], m[3])];
    return (x) => k * (x + c);
  }
  if ((m = t.match(/^(\d+(?:\.\d+)?)x(?: ([+-]) (\d+))?$/))) {
    const [k, c] = [Number(m[1]), m[2] ? signed(m[2], m[3]) : 0];
    return (x) => k * x + c;
  }
  throw new Error(`unreadable price rule ${tex}`);
}

interface PriceStory {
  p: number;
  fns: Record<string, (x: number) => number>;
  /** The letter of the change the question makes first, and of the other. */
  first: string;
  second: string;
}

/**
 * Two changes to a price, read from the prompt. The change made first is the
 * one named before "first": a percentage or a doubling is the multiplier, and
 * anything else is the fixed amount.
 */
function priceStory(slide: Slide): PriceStory {
  const text = proseOf(slide);
  const p = Number(text.match(/is £\$(\d+)\$ before two changes/)![1]);
  const pair = displaysOf(slide)[0].match(/f\(x\) &= (.*?) \\\\ g\(x\) &= (.*?) \\end/)!;
  const fns = { f: priceFn(pair[1]), g: priceFn(pair[2]) };
  const scaleLetter = /^[\d.]+x$/.test(pair[1]) ? 'f' : 'g';
  expect(/^[\d.]+x$/.test(scaleLetter === 'f' ? pair[1] : pair[2]), `no multiplier in ${pair[0]}`).toBe(true);
  const shiftLetter = scaleLetter === 'f' ? 'g' : 'f';
  const order = text.match(/(?:made|order:) (.*?) first, then/);
  if (!order) {
    // No order in words: the question names the composite, and that is the order.
    // Or it asks both orders, and neither is first.
    const named = text.match(/Find \$([fg])([fg])\(\d+\)\$/);
    return { p, fns, first: named?.[2] ?? '', second: named?.[1] ?? '' };
  }
  const scaleFirst = /%|doubled/.test(order[1]);
  return { p, fns, first: scaleFirst ? scaleLetter : shiftLetter, second: scaleFirst ? shiftLetter : scaleLetter };
}

/** A composite name and rule agree with the story: the first change nearest the x, and the rule its composite. */
function priceConsistent(story: PriceStory, name: string, rule: string): boolean {
  if (name !== `${story.second}${story.first}`) return false;
  const composite = (x: number) => story.fns[story.second](story.fns[story.first](x));
  return agrees(priceFn(rule), composite);
}

describe('fun-price-tree', () => {
  it('fills in each stage of the price in the order the question fixes', () => {
    for (const { slide, where } of draws('fun-price-tree')) {
      if (slide.kind !== 'tree') throw new Error(where);
      const story = priceStory(slide);
      const { f, g } = story.fns;
      const values = slide.answer.map(Number);
      const round = (v: number) => Math.round(v * 1e6) / 1e6;
      if (values.length === 2) {
        const first = story.fns[story.first](story.p);
        expect(values, where).toEqual([first, story.fns[story.second](first)].map(round));
        expect(slide.expression, where).toBe(`${story.second}${story.first}(${story.p})`);
      } else {
        const fg = f(g(story.p));
        const gf = g(f(story.p));
        const byName: Record<string, number[]> = { fg: [g(story.p), fg], gf: [f(story.p), gf] };
        const names = [...slide.expression.matchAll(/([fg]{2})\(/g)].map((m) => m[1]);
        expect(values.slice(0, 4), where).toEqual([...byName[names[0]], ...byName[names[1]]].map(round));
        expect(values[4], where).toBeCloseTo(Math.abs(fg - gf), 9);
        expect(values[4], `${where}: the orders agree`).toBeGreaterThan(0);
      }
      expect(values.every((v) => Number.isInteger(v)), `${where}: ${values}`).toBe(true);
    }
  });
});

describe('fun-order-choice', () => {
  it('offers exactly one composite whose letters and rule both follow the story', () => {
    for (const { slide, where } of draws('fun-order-choice')) {
      if (slide.kind !== 'choice') throw new Error(where);
      const story = priceStory(slide);
      const right = fitting(slide, (label) => {
        const m = label.match(/^([fg]{2})\(x\) = (.*)$/)!;
        return priceConsistent(story, m[1], m[2]);
      });
      expect(right, where).toEqual([slide.correctId]);
    }
  });
});

describe('fun-price-value', () => {
  it('asks the price after both changes, made in the order the question fixes', () => {
    for (const id of ['fun-price-value', 'fun-price-value+choice']) {
      for (const { slide, where } of draws(id)) {
        const story = priceStory(slide);
        const expected = Math.round(story.fns[story.second](story.fns[story.first](story.p)) * 1e6) / 1e6;
        expect(Number.isInteger(expected), `${where}: ${expected}`).toBe(true);
        if (slide.kind === 'expression') expect(verdict(slide, `${expected}`), where).toBe('correct');
        else if (slide.kind === 'choice') expect(Number(correctLabel(slide)), where).toBeCloseTo(expected, 9);
        else throw new Error(where);
      }
    }
  });
});

describe('fun-composite-tiles', () => {
  it('builds the composite the story fixes, and no other filling of the bank does', () => {
    for (const { slide, where } of draws('fun-composite-tiles')) {
      if (slide.kind !== 'tiles') throw new Error(where);
      const story = priceStory(slide);
      const read = (tex: string) => tex.match(/^([fg])([fg])\(x\) = (.*)$/);
      const m = read(filled(slide))!;
      expect(priceConsistent(story, `${m[1]}${m[2]}`, m[3]), `${where}: ${filled(slide)}`).toBe(true);
      const rules = slide.bank.filter((token) => token !== 'f' && token !== 'g');
      for (const rule of rules) {
        for (const letters of [['f', 'g'], ['g', 'f']]) {
          const tokens = [...letters, rule];
          if (tokens.join('|') === slide.answer.join('|')) continue;
          const other = read(filled(slide, tokens))!;
          expect(priceConsistent(story, `${other[1]}${other[2]}`, other[3]), `${where}: ${tokens.join(' ')} also fits`).toBe(false);
        }
      }
    }
  });
});
