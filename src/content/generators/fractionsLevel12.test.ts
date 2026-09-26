/**
 * Independent checks on level 12 of Algebraic Fractions: turning points and
 * ranges of rational functions.
 *
 * The generators build each curve from its turning points and work the range
 * out through the discriminant in k. These never look at a discriminant.
 * They read the rule the learner is shown, evaluate it at every whole x across
 * a wide window, and take the range and turning points from the heights
 * themselves: every turning point is built at a whole x, so the highest point
 * of the left branch (or the lowest of the right) is one of those heights
 * exactly. Slant lines come from evaluating far out, crossings from the curve
 * meeting its level. Every stated answer is then held to those.
 *
 * Typed questions are also played through `startSession` and `submit`.
 */
import { describe, expect, it } from 'vitest';
import { math } from '../../engine/expression';
import { makeRng } from '../../engine/rng';
import { reduce, startSession } from '../../engine/session';
import { level12 } from '../courses/algebraicFractions/level12';
import { registry } from '../registry';
import type { Generator, Lesson, Slide } from '../types';
import { levelCheckLesson } from '../types';
import { fractionsLevel12Generators } from './fractionsLevel12';

const SEEDS = 150;

/** Learner-facing TeX as something mathjs evaluates. Handles what these generators write. */
function toMath(tex: string): string {
  let out = tex.replace(/\\text\{[^}]*\}/g, '');
  const fraction = /\\frac\{((?:[^{}]|\{[^{}]*\})*)\}\{((?:[^{}]|\{[^{}]*\})*)\}/;
  while (fraction.test(out)) out = out.replace(fraction, '(($1)/($2))');
  return out
    .replace(/\^\{(-?\d+)\}/g, '^($1)')
    .replace(/(\d)\s*([xk])/g, '$1*$2')
    .replace(/(\d)\s*\(/g, '$1*(')
    .replace(/\)\s*\(/g, ')*(')
    .replace(/\)\s*([xk])/g, ')*$1');
}

function compiled(tex: string): (scope: Record<string, number>) => number {
  const code = math.compile(toMath(tex));
  return (scope) => code.evaluate({ ...scope }) as number;
}

interface Shown {
  f: (x: number) => number;
  bottom: (x: number) => number;
  /** Degree of the bottom: 1 for x + d, 2 for a quadratic. */
  bottomDegree: number;
}

/** The rule y = \frac{top}{bottom}, read. */
function readRule(tex: string): Shown {
  const m = /^y = \\frac\{((?:[^{}]|\{[^{}]*\})*)\}\{((?:[^{}]|\{[^{}]*\})*)\}$/.exec(tex.trim());
  if (!m) throw new Error(`not a rule: ${tex}`);
  const top = compiled(m[1]);
  const bottom = compiled(m[2]);
  return {
    f: (x) => top({ x }) / bottom({ x }),
    bottom: (x) => bottom({ x }),
    bottomDegree: m[2].includes('x^{2}') ? 2 : 1,
  };
}

const WHOLE = Array.from({ length: 161 }, (_, i) => i - 80);

/** Whole roots of the bottom: its poles. */
const polesOf = (s: Shown): number[] => WHOLE.filter((x) => Math.abs(s.bottom(x)) < 1e-9);

interface Features {
  pole: number | null;
  lo: number;
  hi: number;
  xLo: number;
  xHi: number;
  bounded: boolean;
}

/**
 * The range and turning points from heights alone. With a pole: the top of the
 * left branch and the bottom of the right. Without: the lowest and highest.
 * Also confirms no height, whole or not, falls in the gap (or outside the band).
 */
function features(s: Shown, where: string): Features {
  const poles = polesOf(s);
  expect(poles.length, `${where}: poles`).toBeLessThanOrEqual(1);
  const pole = poles[0] ?? null;
  const at = WHOLE.filter((x) => x !== pole).map((x) => ({ x, y: s.f(x) }));
  let lo: { x: number; y: number };
  let hi: { x: number; y: number };
  if (pole === null) {
    lo = at.reduce((a, b) => (b.y < a.y ? b : a));
    hi = at.reduce((a, b) => (b.y > a.y ? b : a));
  } else {
    lo = at.filter((p) => p.x < pole).reduce((a, b) => (b.y > a.y ? b : a));
    hi = at.filter((p) => p.x > pole).reduce((a, b) => (b.y < a.y ? b : a));
  }
  const [loY, hiY] = [lo.y, hi.y].map((y) => Math.round(y));
  expect(Math.abs(lo.y - loY) + Math.abs(hi.y - hiY), `${where}: whole turning heights`).toBeLessThan(1e-9);
  for (let x = -40.13; x < 40; x += 0.37) {
    if (pole !== null && Math.abs(x - pole) < 1e-6) continue;
    const y = s.f(x);
    if (pole === null) expect(y >= loY - 1e-9 && y <= hiY + 1e-9, `${where}: y(${x}) = ${y} outside the band`).toBe(true);
    else expect(y <= loY + 1e-9 || y >= hiY - 1e-9, `${where}: y(${x}) = ${y} in the gap`).toBe(true);
  }
  return { pole, lo: loY, hi: hiY, xLo: lo.x, xHi: hi.x, bounded: pole === null };
}

function slides(id: string): { slide: Slide; where: string }[] {
  const generator = registry[id] as unknown as Generator<unknown>;
  return [1, 2].flatMap((difficulty) =>
    Array.from({ length: SEEDS }, (_, seed) => ({
      slide: generator.render(generator.sample(makeRng(seed), difficulty)),
      where: `${id} seed ${seed} d${difficulty}`,
    })),
  );
}

const proseOf = (slide: Slide): string =>
  'prompt' in slide ? slide.prompt.map((b) => ('text' in b ? b.text : '')).join(' ') : '';

function display(slide: Slide): string {
  if (!('prompt' in slide)) return '';
  const block = slide.prompt.find((b) => b.kind === 'display');
  return block && 'tex' in block ? block.tex : '';
}

/** The rule quoted in the prose as $y = \frac...$. */
const quoted = (slide: Slide): string => /\$(y = \\frac[^$]*)\$/.exec(proseOf(slide))![1];

const filled = (slide: Slide): string => {
  if (slide.kind !== 'tiles') throw new Error(`expected tiles, got ${slide.kind}`);
  return slide.template.replace(/\{(\d)\}/g, (_, i: string) => slide.answer[Number(i)]);
};

const rangeLabel = (ft: Features): string =>
  ft.bounded ? `${ft.lo} \\leq y \\leq ${ft.hi}` : `y \\leq ${ft.lo} \\text{ or } y \\geq ${ft.hi}`;

/** A number stated in prose as `$name = n$`. */
const stated = (text: string, name: string): number => Number(new RegExp(`\\$${name} = (-?\\d+)\\$`).exec(text)![1]);

const PROBES = [0.37, 1.61, -2.29, 3.73, -4.41, 5.17, 7.3];

describe('values a curve cannot take, from its heights', () => {
  it('places the quadratic in x that y = k gives', () => {
    for (const { slide, where } of slides('af12-k-quadratic')) {
      const s = readRule(display(slide));
      const lhs = compiled(filled(slide).replace(/ = 0$/, ''));
      for (const x of PROBES) {
        if (Math.abs(s.bottom(x)) < 1e-6) continue;
        for (const k of [-3.3, 0.7, 2.9]) {
          expect(lhs({ x, k }), where).toBeCloseTo(s.bottom(x) * (s.f(x) - k), 6);
        }
      }
    }
  });

  it('factorises the condition on k at the ends of the range', () => {
    for (const { slide, where } of slides('af12-k-disc')) {
      const ft = features(readRule(display(slide)), where);
      if (slide.kind !== 'tiles') throw new Error('expected tiles');
      const roots = slide.answer.map((t) => -Number(t.replace(/\s+/g, ''))).sort((a, b) => a - b);
      expect(roots, where).toEqual([ft.lo, ft.hi]);
    }
  });

  it('names, shades and bounds the range the heights show', () => {
    for (const { slide, where } of slides('af12-range-which')) {
      if (slide.kind !== 'choice') throw new Error('expected choice');
      const ft = features(readRule(display(slide)), where);
      const right = slide.options.find((o) => o.id === slide.correctId)!;
      expect(right.label, where).toBe(rangeLabel(ft));
      expect(slide.options.filter((o) => o.label === rangeLabel(ft)).length, where).toBe(1);
    }
    for (const { slide, where } of slides('af12-range-line')) {
      if (slide.kind !== 'numberLine') throw new Error('expected numberLine');
      const ft = features(readRule(display(slide)), where);
      expect(slide.answer, where).toBe(ft.bounded ? `[${ft.lo},${ft.hi}]` : `(-inf,${ft.lo}]|[${ft.hi},inf)`);
      expect(slide.min < ft.lo && ft.hi < slide.max, where).toBe(true);
    }
    for (const id of ['af12-range-edge', 'af12-range-edge+choice']) {
      for (const { slide, where } of slides(id)) {
        const rule = slide.kind === 'choice' ? (slide.prompt.find((b) => b.kind === 'display') as { tex: string }).tex : display(slide);
        const ft = features(readRule(rule), where);
        const upper = /larger|greatest/.test(proseOf(slide));
        const expected = String(upper ? ft.hi : ft.lo);
        const given = slide.kind === 'expression' ? slide.answer : slide.kind === 'choice' ? slide.options.find((o) => o.id === slide.correctId)!.label : '';
        expect(given, where).toBe(expected);
      }
    }
  });
});

describe('turning points, from the heights', () => {
  it('finds both turning points', () => {
    for (const { slide, where } of slides('af12-tp-tree')) {
      if (slide.kind !== 'tree') throw new Error('expected tree');
      const ft = features(readRule(slide.expression), where);
      expect(slide.answer, where).toEqual([ft.lo, ft.hi, ft.xLo, ft.xHi].map(String));
    }
  });

  it('puts a boundary value back and names the point and its kind', () => {
    for (const { slide, where } of slides('af12-tp-flow')) {
      if (slide.kind !== 'flow') throw new Error('expected flow');
      const s = readRule(slide.subject);
      const ft = features(s, where);
      const K = stated(proseOf(slide), 'k');
      expect([ft.lo, ft.hi], where).toContain(K);
      const x0 = K === ft.lo ? ft.xLo : ft.xHi;
      expect(s.f(x0), where).toBeCloseTo(K, 9);
      const square = x0 === 0 ? 'x^{2}' : `(x ${x0 > 0 ? '-' : '+'} ${Math.abs(x0)})^{2}`;
      expect(slide.answer[0], where).toBe(`$${square} = 0$`);
      expect(slide.answer[1], where).toBe(`$(${x0}, ${K})$`);
      const peak = s.f(x0 - 0.01) < K && s.f(x0 + 0.01) < K;
      const dip = s.f(x0 - 0.01) > K && s.f(x0 + 0.01) > K;
      expect(peak !== dip, where).toBe(true);
      expect(slide.answer[2], where).toBe(peak ? 'A maximum' : 'A minimum');
    }
    for (const id of ['af12-tp-point', 'af12-tp-point+choice']) {
      for (const { slide, where } of slides(id)) {
        const rule = (slide as { prompt: { kind: string; tex?: string }[] }).prompt.find((b) => b.kind === 'display')!.tex!;
        const s = readRule(rule);
        const ft = features(s, where);
        const K = stated(proseOf(slide), 'k');
        const x0 = K === ft.lo ? ft.xLo : ft.xHi;
        const given = slide.kind === 'expression' ? slide.answer : slide.kind === 'choice' ? slide.options.find((o) => o.id === slide.correctId)!.label : '';
        expect(given, where).toBe(String(x0));
      }
    }
  });

  it('slides to the maximum or minimum', () => {
    for (const { slide, where } of slides('af12-tp-slider')) {
      if (slide.kind !== 'slider') throw new Error('expected slider');
      const s = readRule(quoted(slide));
      const ft = features(s, where);
      const max = proseOf(slide).includes('maximum');
      const x0 = slide.answer;
      const K = s.f(x0);
      const peak = s.f(x0 - 0.01) < K && s.f(x0 + 0.01) < K;
      const dip = s.f(x0 - 0.01) > K && s.f(x0 + 0.01) > K;
      expect(max ? peak : dip, where).toBe(true);
      expect([ft.xLo, ft.xHi], where).toContain(x0);
      expect(slide.min <= x0 && x0 <= slide.max, where).toBe(true);
    }
  });
});

describe('oblique asymptotes, from far out', () => {
  /** The slant line y = mx + c read off the curve at two far points. */
  function slantOf(s: Shown): { m: number; c: number } {
    const X = 1e5;
    const m = Math.round((s.f(X) - s.f(-X)) / (2 * X));
    const c = Math.round((s.f(X) + s.f(-X)) / 2);
    return { m, c };
  }

  it('divides into the line and the leftover', () => {
    for (const { slide, where } of slides('af12-oblique-divide')) {
      const s = readRule(display(slide));
      const split = compiled(filled(slide).replace(/^y = /, ''));
      for (const x of PROBES) expect(split({ x }), where).toBeCloseTo(s.f(x), 9);
    }
  });

  it('picks the line the curve closes in on', () => {
    for (const { slide, where } of slides('af12-oblique-line')) {
      if (slide.kind !== 'choice') throw new Error('expected choice');
      const s = readRule(display(slide));
      for (const option of slide.options) {
        const line = compiled(option.label.replace(/^y = /, ''));
        const gap = Math.abs(s.f(1e6) - line({ x: 1e6 })) + Math.abs(s.f(-1e6) - line({ x: -1e6 }));
        expect(gap < 1e-3, `${where}: ${option.label}`).toBe(option.id === slide.correctId);
      }
    }
  });

  it('puts the curve on the right side of the line far out', () => {
    for (const { slide, where } of slides('af12-oblique-flow')) {
      if (slide.kind !== 'flow') throw new Error('expected flow');
      const subject = slide.subject.replace(/^y = /, '');
      const curve = compiled(subject);
      const f = (x: number) => curve({ x });
      const { m, c } = slantOf({ f, bottom: () => 1, bottomDegree: 1 });
      const lineText = /\$y = ([^$]*)\$/.exec(proseOf(slide))![1];
      const line = compiled(lineText);
      expect(line({ x: 3 }), where).toBeCloseTo(3 * m + c, 9);
      const side = (x: number) => (f(x) > line({ x }) ? 'Just above the line' : 'Just below the line');
      const n = slide.answer.length;
      expect(slide.answer[n - 2], where).toBe(side(1e4));
      expect(slide.answer[n - 1], where).toBe(side(-1e4));
      if (n === 4) {
        const leftover = compiled(slide.answer[0].replace(/\$/g, ''));
        for (const x of PROBES) expect(leftover({ x }) + line({ x }), where).toBeCloseTo(f(x), 9);
      }
    }
  });

  it('types the line’s number and the leftover’s top', () => {
    for (const { slide, where } of slides('af12-oblique-value')) {
      if (slide.kind !== 'expression') throw new Error('expected expression');
      const s = readRule(display(slide));
      const d = -polesOf(s)[0];
      const { m, c } = slantOf(s);
      const n = Number(slide.answer);
      if (slide.lead === 'c =') expect(n, where).toBe(c);
      else for (const x of PROBES) expect(m * x + c + n / (x + d), where).toBeCloseTo(s.f(x), 9);
    }
  });
});

describe('crossing an asymptote, from where the curve meets it', () => {
  /** The level far out. */
  const levelOf = (s: Shown): number => Math.round(s.f(1e7));

  /** Whole x where the curve meets its level, and whether anything else does. */
  function crossings(s: Shown, A: number): number[] {
    return WHOLE.filter((x) => Math.abs(s.bottom(x)) > 1e-9 && Math.abs(s.f(x) - A) < 1e-9);
  }

  it('types and trees the crossing', () => {
    for (const id of ['af12-cross-value', 'af12-cross-value+choice']) {
      for (const { slide, where } of slides(id)) {
        const rule = (slide as { prompt: { kind: string; tex?: string }[] }).prompt.find((b) => b.kind === 'display')!.tex!;
        const s = readRule(rule);
        const A = stated(proseOf(slide), 'y');
        expect(levelOf(s), where).toBe(A);
        const given = slide.kind === 'expression' ? slide.answer : slide.kind === 'choice' ? slide.options.find((o) => o.id === slide.correctId)!.label : '';
        expect(crossings(s, A), where).toEqual([Number(given)]);
      }
    }
    for (const { slide, where } of slides('af12-cross-tree')) {
      if (slide.kind !== 'tree') throw new Error('expected tree');
      const s = readRule(slide.expression);
      const A = stated(proseOf(slide), 'y');
      expect(levelOf(s), where).toBe(A);
      const [p, q, x] = slide.answer.map(Number);
      expect(crossings(s, A), where).toEqual([x]);
      for (const t of PROBES) expect(s.bottom(t) * (s.f(t) - A), where).toBeCloseTo(p * t - q, 9);
    }
  });

  it('slides to the crossing', () => {
    for (const { slide, where } of slides('af12-cross-slider')) {
      if (slide.kind !== 'slider') throw new Error('expected slider');
      const s = readRule(quoted(slide));
      const A = stated(proseOf(slide), 'y');
      expect(levelOf(s), where).toBe(A);
      expect(crossings(s, A), where).toEqual([slide.answer]);
    }
  });

  it('crosses only what it can', () => {
    for (const { slide, where } of slides('af12-cross-flow')) {
      if (slide.kind !== 'flow') throw new Error('expected flow');
      const s = readRule(slide.subject);
      const pole = Number(/\$x = (-?\d+)\$/.exec(slide.steps[0].ask)![1]);
      expect(Math.abs(s.bottom(pole)), where).toBeLessThan(1e-9);
      expect(slide.answer[0], where).toBe('No: the curve has no value there');
      const other = /\$y = ([^$]*)\$/.exec(slide.steps[1].ask)![1];
      const line = compiled(other);
      // The bottom times the gap to that asymptote is a polynomial: read it off
      // three points by finite differences and check it holds everywhere.
      const h = (t: number) => s.bottom(t) * (s.f(t) - line({ x: t }));
      const [h0, h1, h2] = [0.5, 1.5, 2.5].map(h);
      const second = h2 - 2 * h1 + h0;
      expect(Math.abs(second), `${where}: the x^2 terms cancel`).toBeLessThan(1e-6);
      const slope = h1 - h0;
      const at = (t: number) => h0 + slope * (t - 0.5);
      for (const t of PROBES) expect(h(t), where).toBeCloseTo(at(t), 6);
      const meets = Math.abs(slope) < 1e-9 ? [] : [0.5 - h0 / slope].filter((x) => Math.abs(s.bottom(x)) > 1e-9);
      if (slide.answer.length === 2) {
        expect(slide.answer[1], where).toBe('A statement that is never true');
        expect(meets, where).toEqual([]);
      } else {
        expect(slide.answer[1], where).toBe('An equation with one solution');
        const x = Number(/-?\d+/.exec(slide.answer[2])![0]);
        expect(meets.length, where).toBeGreaterThan(0);
        expect(meets[0], where).toBeCloseTo(x, 9);
      }
    }
  });
});

describe('putting it together', () => {
  it('fills every feature from the curve', () => {
    for (const { slide, where } of slides('af12-features-table')) {
      if (slide.kind !== 'table') throw new Error('expected table');
      const s = readRule(display(slide));
      const ft = features(s, where);
      const X = 1e5;
      const m = Math.round((s.f(X) - s.f(-X)) / (2 * X));
      const c = Math.round((s.f(X) + s.f(-X)) / 2);
      expect(slide.answer, where).toEqual([ft.pole, m, c, ft.xLo, ft.lo, ft.xHi, ft.hi].map(String));
    }
  });

  it('draws the rule it marks right, and no other option draws the same', () => {
    const WIDTH = 280;
    const PAD = 12;
    for (const { slide, where } of slides('af12-sketch-which')) {
      if (slide.kind !== 'choice') throw new Error('expected choice');
      const svg = (slide.prompt.find((b) => b.kind === 'diagram') as { svg: string }).svg;
      const [x0, x1, y0, y1] = /data-plot="([^"]+)"/.exec(svg)![1].split(' ').map(Number);
      const height = Number(/viewBox="0 0 \d+ (\d+)"/.exec(svg)![1]);
      const toX = (px: number) => x0 + ((px - PAD) / (WIDTH - 2 * PAD)) * (x1 - x0);
      const toY = (py: number) => y1 - ((py - PAD) / (height - 2 * PAD)) * (y1 - y0);
      const dots = [...svg.matchAll(/<circle cx="([\d.]+)" cy="([\d.]+)"/g)].map((g) => [Math.round(toX(Number(g[1]))), Math.round(toY(Number(g[2])))]);
      const dashed = [...svg.matchAll(/<line x1="([\d.]+)"[^>]*stroke-dasharray/g)].map((g) => Math.round(toX(Number(g[1]))));
      const drawn = (label: string): boolean => {
        const s = readRule(label);
        const poles = polesOf(s);
        if (poles.length !== 1 || !dashed.includes(poles[0])) return false;
        const turning = WHOLE.filter((x) => x !== poles[0] && Math.abs(s.f(x) - s.f(x - 0.01)) > 0 && (s.f(x) - s.f(x - 0.01)) * (s.f(x + 0.01) - s.f(x)) < 0);
        const points = turning.map((x) => [x, Math.round(s.f(x))]);
        return JSON.stringify(points) === JSON.stringify(dots);
      };
      for (const option of slide.options) {
        expect(drawn(option.label) || option.id !== slide.correctId, `${where}: right rule not drawn ${option.label}`).toBe(true);
      }
      const drawers = slide.options.filter((o) => drawn(o.label));
      expect(drawers.map((o) => o.id), where).toEqual([slide.correctId]);
    }
  });

  it('plans the sketch from the rule', () => {
    for (const { slide, where } of slides('af12-sketch-flow')) {
      if (slide.kind !== 'flow') throw new Error('expected flow');
      const s = readRule(slide.subject);
      const ft = features(s, where);
      expect(slide.answer[1], where).toBe(`$k = ${ft.lo}$ and $k = ${ft.hi}$`);
      expect(slide.answer[2], where).toBe(ft.bounded ? `$${ft.lo} \\leq y \\leq ${ft.hi}$` : `$y \\leq ${ft.lo}$ or $y \\geq ${ft.hi}$`);
      if (ft.bounded) {
        expect(slide.answer[0], where).toBe(`Only $y = ${Math.round(s.f(1e7))}$`);
      } else {
        const X = 1e5;
        const m = Math.round((s.f(X) - s.f(-X)) / (2 * X));
        const c = Math.round((s.f(X) + s.f(-X)) / 2);
        const [, pole, line] = /^\$x = (-?\d+)\$ and \$y = ([^$]*)\$$/.exec(slide.answer[0])!;
        expect(Number(pole), where).toBe(ft.pole);
        expect(compiled(line)({ x: 3 }), where).toBeCloseTo(3 * m + c, 9);
      }
    }
  });
});

describe('typed questions grade their own answer correct through a session', () => {
  const typed = fractionsLevel12Generators.filter((g) => g.render(g.sample(makeRng(1), 1)).kind === 'expression');

  it.each(typed.map((g) => [g.id]))('%s', (id) => {
    for (const difficulty of [1, 2]) {
      for (let seed = 0; seed < 60; seed += 1) {
        const lesson: Lesson = { id: `test-${id}-${difficulty}`, title: 'Typed', slides: [], skillCheck: [{ type: 'generated', generatorId: id, difficulty }] };
        const session = startSession(lesson, registry, seed);
        const slide = session.skillCheck[0].slide;
        if (slide.kind !== 'expression') throw new Error(`${id} rendered ${slide.kind}`);
        expect(reduce(session, { type: 'submit', answer: slide.answer }).feedback.kind, `seed ${seed} d${difficulty}`).toBe('correct');
        expect(reduce(session, { type: 'submit', answer: String(Number(slide.answer) + 1) }).feedback.kind, `seed ${seed} d${difficulty}`).toBe('incorrect');
      }
    }
  });
});

describe('the level resolves without repeating a question', () => {
  const decks = [...level12.lessons, levelCheckLesson(level12)!];

  it.each(decks.map((deck) => [deck.id, deck]))('%s', (_, deck) => {
    for (let seed = 0; seed < 40; seed += 1) {
      const session = startSession(deck as Lesson, registry, seed);
      for (const part of [session.guided, session.skillCheck]) {
        const seen = part.map(({ slide }) => JSON.stringify(slide));
        expect(new Set(seen).size, `${(deck as Lesson).id} seed ${seed}`).toBe(seen.length);
      }
    }
  });
});
