/**
 * An independent check on Parametrising a Curve (`paramBuild.ts`).
 *
 * The sweep only proves each generator agrees with itself. Here every answer
 * is read back off the rendered slide — the tiles placed into the template,
 * the option marked correct, the path through a flow, the value slid to — and
 * turned from TeX into mathjs by a small converter of this file's own. The
 * Cartesian equation the learner is shown is parsed the same way, and the
 * parametrisation is substituted into it at a spread of values of t: the
 * right answer must satisfy it everywhere, and every wrong option must fail it
 * somewhere. None of the generator's own coefficients are trusted.
 *
 * Slider points on circles and ellipses are checked without any
 * parametrisation at all: t = 0 is the curve's rightmost point, pi/2 its top,
 * pi its leftmost and 3pi/2 its bottom, found by scanning the equation.
 */
import { describe, expect, it } from 'vitest';
import { makeRng } from '../../engine/rng';
import { math } from '../../engine/expression';
import { choiceVariant } from '../choiceVariant';
import type { Block, Generator, Slide } from '../types';
import { paramBuildGenerators } from './paramBuild';

const SEEDS = 300;
const byId = (id: string): Generator<unknown> => {
  const base = paramBuildGenerators.find((g) => g.id === id.replace('+choice', '')) as Generator<unknown> | undefined;
  if (!base) throw new Error(`no generator ${id}`);
  if (!id.endsWith('+choice')) return base;
  const derived = choiceVariant(base);
  if (!derived) throw new Error(`${id} has no choices`);
  return derived;
};

/** Every slide a generator renders over the seeds, at both difficulties. */
type Asked = Exclude<Slide, { kind: 'teach' }>;

function slides(id: string): Asked[] {
  const g = byId(id);
  const out: Asked[] = [];
  for (const difficulty of [1, 2]) {
    for (let seed = 0; seed < SEEDS; seed += 1) {
      const slide = g.render(g.sample(makeRng(seed), difficulty));
      if (slide.kind === 'teach') throw new Error(`${id} rendered a teach slide`);
      out.push(slide);
    }
  }
  return out;
}

/* ---------- TeX to mathjs ---------- */

/** The index just past the brace group opening at `open`. */
function groupEnd(tex: string, open: number): number {
  let depth = 0;
  for (let i = open; i < tex.length; i += 1) {
    if (tex[i] === '{') depth += 1;
    if (tex[i] === '}') depth -= 1;
    if (depth === 0) return i + 1;
  }
  throw new Error(`unbalanced braces in ${tex}`);
}

function toMath(tex: string): string {
  let s = tex.replace(/\$/g, '').replace(/\\tfrac/g, '\\frac');
  for (let at = s.indexOf('\\frac{'); at >= 0; at = s.indexOf('\\frac{')) {
    const topEnd = groupEnd(s, at + 5);
    const bottomEnd = groupEnd(s, topEnd);
    const top = s.slice(at + 6, topEnd - 1);
    const bottom = s.slice(topEnd + 1, bottomEnd - 1);
    s = `${s.slice(0, at)}((${top})/(${bottom}))${s.slice(bottomEnd)}`;
  }
  return s
    .replace(/\\(cos|sin) t/g, '$1(t)')
    .replace(/\\(cos|sin)\s*/g, '$1 ')
    .replace(/\\pi/g, 'pi')
    .replace(/\\q?quad/g, ' ')
    .replace(/\{/g, '(')
    .replace(/\}/g, ')');
}

type Scope = Record<string, number>;
const evaluate = (expr: string, scope: Scope): number => Number(math.evaluate(expr, scope));

/** `lhs = rhs` as a residual in x and y. */
function residual(equationTex: string): (x: number, y: number) => number {
  const [lhs, rhs] = equationTex.split('=').map(toMath);
  const code = math.compile(`(${lhs}) - (${rhs})`);
  return (x, y) => Number(code.evaluate({ x, y }));
}

/** `x = ..., y = ...` (joined by a comma, \quad or \qquad) as two functions of t. */
function traced(tex: string): (t: number) => [number, number] {
  const body = tex.replace(/\$/g, '');
  const match = /x\s*=\s*(.+?)(?:,|\\qquad|\\quad)\s*(?:\\quad\s*)?y\s*=\s*(.+)$/.exec(body);
  if (!match) throw new Error(`not a parametrisation: ${tex}`);
  const x = math.compile(toMath(match[1]));
  const y = math.compile(toMath(match[2]));
  // `+ 0` turns the -0 of `-2t` at t = 0 into 0, which toEqual tells apart.
  return (t) => [Number(x.evaluate({ t })) + 0, Number(y.evaluate({ t })) + 0];
}

/** Tiles placed into their template. */
const filled = (slide: Extract<Slide, { kind: 'tiles' }>): string =>
  slide.template.replace(/\{(\d+)\}/g, (_, i: string) => slide.answer[Number(i)]);

const T_VALUES = [-2.3, -1.1, -0.4, 0.3, 0.9, 1.7, 2.6, 4.1];

/** Whether a parametrisation satisfies an equation at every sampled t. */
function traces(equation: (x: number, y: number) => number, f: (t: number) => [number, number]): boolean {
  return T_VALUES.every((t) => {
    const [x, y] = f(t);
    return Math.abs(equation(x, y)) < 1e-6 * (1 + Math.abs(x * x) + Math.abs(y * y));
  });
}

const texts = (blocks: Block[]): string[] => blocks.map((b) => (b.kind === 'prose' ? b.text : b.kind === 'display' ? b.tex : ''));
const displays = (blocks: Block[]): string[] => blocks.flatMap((b) => (b.kind === 'display' ? [b.tex] : []));
const points = (text: string): [number, number][] =>
  [...text.matchAll(/\((-?\d+), (-?\d+)\)/g)].map((m) => [Number(m[1]), Number(m[2])]);

function correctLabel(slide: Slide): string {
  if (slide.kind !== 'choice') throw new Error('not a choice');
  return slide.options.find((o) => o.id === slide.correctId)!.label;
}

function lastFlowStep(slide: Slide): { right: string; wrong: string[] } {
  if (slide.kind !== 'flow') throw new Error('not a flow');
  const label = slide.answer[slide.answer.length - 1];
  const step = slide.steps.find((s) => s.branches.some((b) => b.label === label))!;
  return { right: label, wrong: step.branches.map((b) => b.label).filter((l) => l !== label) };
}

/* ---------- Graphs ---------- */

function graphParts(slide: Asked): { f: string; g: string } {
  const [yTex, xTex] = displays(slide.prompt);
  return { f: toMath(yTex.split('=')[1]), g: toMath(xTex.split('=')[1]) };
}

/** y in t, the composition worked by mathjs: f evaluated at x = g(t). */
const composedAt = ({ f, g }: { f: string; g: string }, t: number): number => evaluate(f, { x: evaluate(g, { t }) });

describe('graphs as parametric curves', () => {
  it('ppar-graph: the typed answer is f(g(t))', () => {
    for (const slide of slides('ppar-graph')) {
      if (slide.kind !== 'expression') throw new Error('kind');
      const parts = graphParts(slide);
      for (const t of T_VALUES) expect(evaluate(slide.answer, { t })).toBeCloseTo(composedAt(parts, t), 6);
    }
  });

  it('ppar-graph+choice: exactly the marked option is f(g(t))', () => {
    for (const slide of slides('ppar-graph+choice')) {
      if (slide.kind !== 'choice') throw new Error('kind');
      const parts = graphParts(slide);
      const right = slide.options.filter((o) =>
        T_VALUES.every((t) => Math.abs(evaluate(toMath(o.label.split('=')[1]), { t }) - composedAt(parts, t)) < 1e-6),
      );
      expect(right.map((o) => o.id)).toEqual([slide.correctId]);
    }
  });

  it('ppar-graph-tiles: the placed tiles expand f(g(t))', () => {
    for (const slide of slides('ppar-graph-tiles')) {
      if (slide.kind !== 'tiles') throw new Error('kind');
      const parts = graphParts(slide);
      const rhs = toMath(filled(slide).split('=')[1]);
      for (const t of T_VALUES) expect(evaluate(rhs, { t })).toBeCloseTo(composedAt(parts, t), 6);
    }
  });

  it('ppar-graph-t: the only whole t on the track that reaches the point', () => {
    for (const id of ['ppar-graph-t', 'ppar-graph-t+choice']) {
      for (const slide of slides(id)) {
        const parts = graphParts(slide);
        const [[X, Y]] = points(texts(slide.prompt).join(' '));
        expect(evaluate(parts.f, { x: X })).toBeCloseTo(Y, 9);
        const found = Array.from({ length: 13 }, (_, i) => i - 6).filter((t) => Math.abs(evaluate(parts.g, { t }) - X) < 1e-9);
        expect(found).toHaveLength(1);
        const given = slide.kind === 'slider' ? slide.answer : Number(correctLabel(slide));
        expect(given).toBe(found[0]);
      }
    }
  });
});

/* ---------- Lines ---------- */

describe('lines through two points', () => {
  it('ppar-line-tiles: the placed line is at A when t = 0 and at B when t = 1', () => {
    for (const slide of slides('ppar-line-tiles')) {
      if (slide.kind !== 'tiles') throw new Error('kind');
      const [A, B] = points(texts(slide.prompt).join(' '));
      const f = traced(filled(slide));
      expect(f(0)).toEqual(A);
      expect(f(1)).toEqual(B);
    }
  });

  it('ppar-line-tiles+choice: exactly the marked option runs from A to B', () => {
    for (const slide of slides('ppar-line-tiles+choice')) {
      if (slide.kind !== 'choice') throw new Error('kind');
      const [A, B] = points(texts(slide.prompt).join(' '));
      const good = slide.options.filter((o) => {
        const f = traced(o.label);
        const [p0, p1] = [f(0), f(1)];
        return p0[0] === A[0] && p0[1] === A[1] && p1[0] === B[0] && p1[1] === B[1];
      });
      expect(good.map((o) => o.id)).toEqual([slide.correctId]);
    }
  });

  it('ppar-line-ends: A and B are the points at t = 0 and t = 1', () => {
    for (const slide of slides('ppar-line-ends')) {
      if (slide.kind !== 'tiles') throw new Error('kind');
      const f = traced(displays(slide.prompt)[0]);
      expect(slide.answer.map(Number)).toEqual([...f(0), ...f(1)]);
    }
  });

  it('ppar-line-point: the steps are B - A and the point is (1 - t)A + tB', () => {
    for (const slide of slides('ppar-line-point')) {
      if (slide.kind !== 'tree') throw new Error('kind');
      const [A, B] = points(texts(slide.prompt).join(' '));
      const k = evaluate(toMath(slide.expression.split('=')[1]), {});
      const expected = [B[0] - A[0], B[1] - A[1], (1 - k) * A[0] + k * B[0], (1 - k) * A[1] + k * B[1]];
      expect(slide.answer.map(Number)).toEqual(expected);
    }
  });

  it('ppar-line-where-flow: the t that reaches P, and where that t puts it', () => {
    for (const slide of slides('ppar-line-where-flow')) {
      if (slide.kind !== 'flow') throw new Error('kind');
      const f = traced(displays(slide.prompt)[0]);
      const [[X, Y]] = points(slide.subject);
      // Every half from -6 to 6, searched by brute force.
      const found = Array.from({ length: 25 }, (_, i) => (i - 12) / 2).filter((t) => {
        const [x, y] = f(t);
        return x === X && y === Y;
      });
      expect(found).toHaveLength(1);
      const t = found[0];
      expect(evaluate(toMath(slide.answer[0].split('=')[1]), {})).toBe(t);
      expect(slide.answer[1]).toBe(t < 0 ? 'Before $A$' : t < 1 ? 'Between $A$ and $B$' : 'Beyond $B$');
    }
  });
});

/* ---------- Circles, ellipses and parabolas ---------- */

describe('parametrising circles, ellipses and parabolas', () => {
  for (const id of ['ppar-circle-tiles', 'ppar-ellipse-tiles', 'ppar-parabola-tiles']) {
    it(`${id}: the placed parametrisation satisfies the equation shown`, () => {
      for (const slide of slides(id)) {
        if (slide.kind !== 'tiles') throw new Error('kind');
        const equation = residual(displays(slide.prompt)[0]);
        expect(traces(equation, traced(filled(slide))), filled(slide)).toBe(true);
      }
    });
  }

  for (const id of ['ppar-circle-flow', 'ppar-ellipse-flow']) {
    it(`${id}: the path ends on a parametrisation that works, and every other ending fails`, () => {
      for (const slide of slides(id)) {
        if (slide.kind !== 'flow') throw new Error('kind');
        const equation = residual(slide.subject);
        const { right, wrong } = lastFlowStep(slide);
        expect(traces(equation, traced(right)), right).toBe(true);
        for (const label of wrong) expect(traces(equation, traced(label)), label).toBe(false);
      }
    });
  }

  it('ppar-circle-flow: the centre and radius on the path fit the equation', () => {
    for (const slide of slides('ppar-circle-flow')) {
      if (slide.kind !== 'flow') throw new Error('kind');
      const equation = residual(slide.subject);
      const [[a, b]] = points(slide.answer[0]);
      const r = Number(slide.answer[1].replace(/\$/g, ''));
      expect(equation(a, b)).toBeCloseTo(-r * r, 9);
      expect(equation(a + r, b)).toBeCloseTo(0, 9);
      expect(equation(a, b - r)).toBeCloseTo(0, 9);
    }
  });

  it('ppar-ellipse-flow: dividing by the chosen number leaves 1 on the right', () => {
    for (const slide of slides('ppar-ellipse-flow')) {
      if (slide.kind !== 'flow') throw new Error('kind');
      const rhs = Number(slide.subject.split('=')[1]);
      expect(rhs / Number(slide.answer[0].replace(/\$/g, ''))).toBe(1);
      const form = residual(slide.answer[1]);
      const whole = residual(slide.subject);
      for (const [x, y] of [[1.3, 0.4], [-2.1, 1.7], [0.2, -3.3]]) expect(form(x, y) * rhs).toBeCloseTo(whole(x, y), 6);
    }
  });

  it('ppar-parabola-k: k is y^2 / x at any t', () => {
    for (const slide of slides('ppar-parabola-k')) {
      if (slide.kind !== 'expression') throw new Error('kind');
      const f = traced(displays(slide.prompt)[0]);
      for (const t of T_VALUES) {
        const [x, y] = f(t);
        expect(Number(slide.answer)).toBeCloseTo((y * y) / x, 9);
      }
    }
  });
});

/* ---------- Where a quarter turn puts the point ---------- */

/**
 * The extreme of a closed curve F <= 0 along one axis, found by scanning: the
 * largest (or smallest) x (or y) at which some point of the other coordinate
 * lies on or inside the curve.
 */
function extreme(equation: (x: number, y: number) => number, axis: 'x' | 'y', sign: 1 | -1): number {
  const inside = (u: number) => {
    for (let i = -48; i <= 48; i += 1) {
      const v = i / 4;
      const value = axis === 'x' ? equation(u, v) : equation(v, u);
      if (value <= 1e-9) return true;
    }
    return false;
  };
  let best = -Infinity;
  for (let i = -24; i <= 24; i += 1) if (inside(i / 2)) best = Math.max(best, sign * (i / 2));
  return sign * best;
}

describe('where t puts the point', () => {
  for (const id of ['ppar-circle-slider', 'ppar-ellipse-slider', 'ppar-circle-slider+choice', 'ppar-ellipse-slider+choice']) {
    it(`${id}: t = 0, pi/2, pi, 3pi/2 are the right, top, left and bottom`, () => {
      const every = slides(id);
      for (const slide of every.slice(0, 120).concat(every.slice(SEEDS, SEEDS + 120))) {
        const equation = residual(displays(slide.prompt)[0]);
        const last = texts(slide.prompt).pop()!;
        const axis = /\$(x|y)\$-coordinate/.exec(last)![1] as 'x' | 'y';
        const t = evaluate(toMath(/t = ([^$]+)\$/.exec(last)![1]), {});
        const quarter = Math.round(t / (Math.PI / 2));
        expect(axis).toBe(quarter % 2 === 0 ? 'x' : 'y');
        const want = extreme(equation, axis, quarter < 2 ? 1 : -1);
        const given = slide.kind === 'slider' ? slide.answer : Number(correctLabel(slide));
        expect(given).toBe(want);
      }
    });
  }
});

/* ---------- Checking a parametrisation ---------- */

describe('checking a parametrisation', () => {
  it('ppar-verify-flow: the verdict is what substitution says, and so are the values on the path', () => {
    let yes = 0;
    for (const slide of slides('ppar-verify-flow')) {
      if (slide.kind !== 'flow') throw new Error('kind');
      const equation = residual(slide.subject);
      const f = traced(displays(slide.prompt)[0]);
      const works = traces(equation, f);
      if (works) yes += 1;
      expect(slide.answer[2]).toBe(works ? 'Yes' : 'No');
      const k = Number(slide.subject.split('=')[1].replace('x', ''));
      for (const t of [0.7, 1.9]) {
        const [x, y] = f(t);
        expect(evaluate(toMath(slide.answer[0]), { t })).toBeCloseTo(y * y, 6);
        expect(evaluate(toMath(slide.answer[1]), { t })).toBeCloseTo(k * x, 6);
      }
    }
    // Both verdicts are asked.
    expect(yes).toBeGreaterThan(SEEDS / 2);
    expect(yes).toBeLessThan((3 * SEEDS) / 2);
  });

  it('ppar-which: exactly the marked option satisfies the equation', () => {
    for (const slide of slides('ppar-which')) {
      if (slide.kind !== 'choice') throw new Error('kind');
      expect(slide.options.length).toBeGreaterThanOrEqual(3);
      const equation = residual(displays(slide.prompt)[0]);
      const good = slide.options.filter((o) => traces(equation, traced(o.label)));
      expect(good.map((o) => o.id), slide.options.map((o) => o.label).join(' | ')).toEqual([slide.correctId]);
    }
  });
});
