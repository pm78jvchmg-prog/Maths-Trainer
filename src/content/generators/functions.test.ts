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
