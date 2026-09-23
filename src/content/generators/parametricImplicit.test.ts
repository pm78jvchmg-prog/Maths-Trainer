/**
 * An independent check on the calculus behind Parametric & Implicit
 * Differentiation.
 *
 * The oracle in `generators.test.ts` differentiates a `source` in $x$ only,
 * and nothing in this course is a plain function of $x$: a parametric
 * gradient is written in $t$, an implicit one in $x$ and $y$. So here mathjs
 * differentiates $x(t)$, $y(t)$ and $F(x, y)$ itself, and every answer is read
 * back off the rendered slide — the value typed, the tiles placed, the option
 * marked correct, the path through a flow — and checked against that, never
 * against the generator's own hand-worked coefficients, which would only prove
 * it agrees with itself. Every implicit point is also checked to be on its
 * curve.
 */
import { describe, expect, it } from 'vitest';
import { makeRng } from '../../engine/rng';
import { checkAnswer } from '../../engine/equivalence';
import { math } from '../../engine/expression';
import type { Generator, Slide } from '../types';
import {
  ANGLES,
  axisCurve,
  curveSources,
  eliminateSources,
  flatCurve,
  implicitSource,
  piGenerators as g,
  stationaryRhs,
  stationaryTerms,
  termTreeValues,
  trigSlopeSources,
  trigSources,
  xyAnswer,
  type AxisParams,
  type CircleParams,
  type CurveParams,
  type EliminateFlowParams,
  type EliminateParams,
  type EllipseParams,
  type FindTParams,
  type FlatParams,
  type GradientParams,
  type ImplicitKindParams,
  type KindParams,
  type OnCurveParams,
  type PointParams,
  type SlopeAtParams,
  type StationaryParams,
  type TermTreeParams,
  type TrigGradientParams,
  type TrigSlopeParams,
} from './parametricImplicit';

const SEEDS = 200;

function draws<P>(generator: Generator<P>): { params: P; slide: Slide; seed: number }[] {
  return [1, 2].flatMap((difficulty) =>
    Array.from({ length: SEEDS }, (_, seed) => {
      const params = generator.sample(makeRng(seed), difficulty);
      return { params, slide: generator.render(params), seed };
    }),
  );
}

type Scope = Record<string, number>;

/** A mathjs expression and its derivatives, evaluated. */
function fn(source: string) {
  const node = math.parse(source);
  return {
    at: (scope: Scope) => node.evaluate({ ...scope }) as number,
    by: (variable: string) => {
      const first = math.derivative(node, variable);
      return { at: (scope: Scope) => first.evaluate({ ...scope }) as number, text: first.toString() };
    },
  };
}

/** Numeric equality, so a mathjs -0 matches a generator's 0. */
const same = (a: number[], b: number[]) => a.length === b.length && a.every((v, i) => v === b[i]);

const close = (a: number, b: number) => Math.abs(a - b) < 1e-9 * Math.max(1, Math.abs(a), Math.abs(b));

const typed = (slide: Slide): string => {
  if (slide.kind !== 'expression') throw new Error(`expected an expression slide, got ${slide.kind}`);
  return slide.answer;
};

/** A tile or label such as `- 3`, `+ 3` or `-3` as a number. */
const number = (token: string): number => Number(token.replace(/\s/g, ''));

const placed = (slide: Slide): number[] => {
  if (slide.kind !== 'tiles') throw new Error(`expected a tiles slide, got ${slide.kind}`);
  return slide.answer.map(number);
};

/** Every point written as (a, b) in a string. */
const pointsIn = (text: string): [number, number][] =>
  [...text.matchAll(/\((-?\d+), (-?\d+)\)/g)].map((m) => [Number(m[1]), Number(m[2])]);

const proseOf = (slide: Slide): string =>
  slide.kind === 'teach'
    ? ''
    : slide.prompt.map((block) => (block.kind === 'prose' ? block.text : block.kind === 'display' ? block.tex : '')).join(' ');

/** x(t), y(t) and their derivatives, from mathjs. */
function parametric(x: string, y: string) {
  const X = fn(x);
  const Y = fn(y);
  const dX = X.by('t');
  const dY = Y.by('t');
  return {
    x: (t: number) => X.at({ t }),
    y: (t: number) => Y.at({ t }),
    dx: (t: number) => dX.at({ t }),
    dy: (t: number) => dY.at({ t }),
    gradientText: `(${dY.text})/(${dX.text})`,
  };
}

/** F(x, y) and its two partial derivatives, from mathjs. */
function implicit(source: string) {
  const F = fn(source);
  const Fx = F.by('x');
  const Fy = F.by('y');
  return {
    F: (x: number, y: number) => F.at({ x, y }),
    Fx: (x: number, y: number) => Fx.at({ x, y }),
    Fy: (x: number, y: number) => Fy.at({ x, y }),
    gradientText: `-(${Fx.text})/(${Fy.text})`,
    coefficientText: Fy.text,
  };
}

const T_SAMPLES = [-2.5, -1.3, -0.4, 0.7, 1.9, 3.1];

describe('parametric curves, checked against mathjs', { timeout: 60_000 }, () => {
  it('param-point places x(k) then y(k)', () => {
    for (const { params, slide } of draws(g.paramPoint as Generator<PointParams>)) {
      const { x, y } = curveSources(params.curve);
      const c = parametric(x, y);
      expect(placed(slide)).toEqual([c.x(params.k), c.y(params.k)]);
    }
  });

  it('param-find-t types a t that lands on the point the prompt names', () => {
    for (const { params, slide } of draws(g.paramFindT as Generator<FindTParams>)) {
      const curve = params.linear === 'x' ? { x: [params.a, params.b], y: params.other } : { x: params.other, y: [params.a, params.b] };
      const { x, y } = curveSources(curve);
      const c = parametric(x, y);
      const t = Number(typed(slide));
      const [[X, Y]] = pointsIn(proseOf(slide));
      expect([c.x(t), c.y(t)]).toEqual([X, Y]);
    }
  });

  it('param-on-curve says yes exactly when some t reaches the point', () => {
    for (const { params, slide } of draws(g.paramOnCurve as Generator<OnCurveParams>)) {
      if (slide.kind !== 'flow') throw new Error('expected flow');
      const curve = params.linear === 'x' ? { x: [params.a, params.b], y: params.other } : { x: params.other, y: [params.a, params.b] };
      const { x, y } = curveSources(curve);
      const c = parametric(x, y);
      const [[X, Y]] = pointsIn(slide.subject);
      // The linear coordinate pins t, and every t in play is a small integer.
      let reached = false;
      for (let t = -30; t <= 30; t += 1) if (c.x(t) === X && c.y(t) === Y) reached = true;
      expect(slide.answer[2]).toBe(reached ? 'Yes' : 'No');
    }
  });

  it('param-axis-tree finds the t that zeroes one coordinate and the other there', () => {
    for (const { params, slide } of draws(g.paramAxisTree as Generator<AxisParams>)) {
      if (slide.kind !== 'tree') throw new Error('expected tree');
      const { x, y } = curveSources(axisCurve(params));
      const c = parametric(x, y);
      const [t, value] = slide.answer.map(Number);
      const zeroed = params.axis === 'y' ? c.x(t) : c.y(t);
      const kept = params.axis === 'y' ? c.y(t) : c.x(t);
      expect(zeroed).toBe(0);
      expect(kept).toBe(value);
    }
  });

  it('param-eliminate gives a y(x) that every point of the curve satisfies', () => {
    for (const { params, slide } of draws(g.paramEliminate as Generator<EliminateParams>)) {
      const { x, y } = eliminateSources(params);
      const c = parametric(x, y);
      const answer = fn(typed(slide));
      for (const t of T_SAMPLES) expect(close(answer.at({ x: c.x(t) }), c.y(t)), `t = ${t}`).toBe(true);
    }
  });

  it('param-eliminate-flow picks the equation the curve satisfies', () => {
    for (const { params, slide } of draws(g.paramEliminateFlow as Generator<EliminateFlowParams>)) {
      if (slide.kind !== 'flow') throw new Error('expected flow');
      const label = slide.answer[1].replaceAll('$', '');
      let holds: (x: number, y: number) => boolean;
      let sources: { x: string; y: string };
      if (params.form === 'linear') {
        sources = { x: `t + (${params.b})`, y: `t^2 + (${params.c})` };
        const m = /^y = \(x ([+-]) (\d+)\)\^\{2\} ([+-]) (\d+)$/.exec(label)!;
        const shift = (m[1] === '-' ? -1 : 1) * Number(m[2]);
        const lift = (m[3] === '-' ? -1 : 1) * Number(m[4]);
        holds = (x, y) => close(y, (x + shift) ** 2 + lift);
      } else if (params.form === 'circle') {
        const r = params.r;
        sources = params.swap ? { x: `${r}*sin(t)`, y: `${r}*cos(t)` } : { x: `${r}*cos(t)`, y: `${r}*sin(t)` };
        const m = /^x\^\{2\} \+ y\^\{2\} = (\d+)$/.exec(label)!;
        holds = (x, y) => close(x * x + y * y, Number(m[1]));
      } else {
        const { a, b } = params;
        sources = params.swap ? { x: `${a}*sin(t)`, y: `${b}*cos(t)` } : { x: `${a}*cos(t)`, y: `${b}*sin(t)` };
        const m = /^\\frac\{x\^\{2\}\}\{(\d+)\} \+ \\frac\{y\^\{2\}\}\{(\d+)\} = 1$/.exec(label)!;
        holds = (x, y) => close(x * x / Number(m[1]) + y * y / Number(m[2]), 1);
      }
      const c = parametric(sources.x, sources.y);
      for (const t of T_SAMPLES) expect(holds(c.x(t), c.y(t)), `${label} at t = ${t}`).toBe(true);
    }
  });

  it('param-circle-tiles completes an equation every point of the circle satisfies', () => {
    for (const { params, slide } of draws(g.paramCircleTiles as Generator<CircleParams>)) {
      const { p, q, r, swap } = params;
      const c = parametric(`${r}*${swap ? 'sin' : 'cos'}(t) + (${p})`, `${r}*${swap ? 'cos' : 'sin'}(t) + (${q})`);
      const [h, k, rr] = placed(slide);
      for (const t of T_SAMPLES) expect(close((c.x(t) + h) ** 2 + (c.y(t) + k) ** 2, rr)).toBe(true);
    }
  });

  it('param-ellipse-tiles completes an equation every point of the ellipse satisfies', () => {
    for (const { params, slide } of draws(g.paramEllipseTiles as Generator<EllipseParams>)) {
      const { a, b, swap } = params;
      const c = parametric(`${a}*${swap ? 'sin' : 'cos'}(t)`, `${b}*${swap ? 'cos' : 'sin'}(t)`);
      const [A, B, C] = placed(slide);
      for (const t of T_SAMPLES) expect(close(A * c.x(t) ** 2 + B * c.y(t) ** 2, C)).toBe(true);
    }
  });

  it('param-gradient and param-gradient-trig type dy/dt divided by dx/dt', () => {
    for (const { params, slide, seed } of draws(g.paramGradient as Generator<GradientParams>)) {
      const { x, y } = curveSources(params.curve);
      const oracle = parametric(x, y).gradientText;
      expect(checkAnswer(typed(slide), oracle, { seed }).status, `${oracle} vs ${typed(slide)}`).toBe('correct');
    }
    for (const { params, slide, seed } of draws(g.paramGradientTrig as Generator<TrigGradientParams>)) {
      const { x, y } = trigSources(params);
      const oracle = parametric(x, y).gradientText;
      expect(checkAnswer(typed(slide), oracle, { seed }).status, `${oracle} vs ${typed(slide)}`).toBe('correct');
    }
  });

  it('param-slope-tree and param-tangent use the rates at t = k', () => {
    for (const { params, slide } of draws(g.paramSlopeTree as Generator<SlopeAtParams>)) {
      if (slide.kind !== 'tree') throw new Error('expected tree');
      const { x, y } = curveSources(params.curve);
      const c = parametric(x, y);
      const [dy, dx, m] = slide.answer.map(Number);
      expect(same([dy, dx], [c.dy(params.k), c.dx(params.k)]), `${[dy, dx]}`).toBe(true);
      expect(close(m, c.dy(params.k) / c.dx(params.k))).toBe(true);
    }
    for (const { params, slide } of draws(g.paramTangent as Generator<SlopeAtParams>)) {
      const { x, y } = curveSources(params.curve);
      const c = parametric(x, y);
      const [m, intercept] = placed(slide);
      const { k } = params;
      expect(close(m, c.dy(k) / c.dx(k))).toBe(true);
      expect(close(c.y(k), m * c.x(k) + intercept), 'the tangent passes through the point').toBe(true);
    }
  });

  it('param-trig-slope types the gradient at the angle', () => {
    for (const { params, slide } of draws(g.paramTrigSlope as Generator<TrigSlopeParams>)) {
      const { x, y } = trigSlopeSources(params);
      const c = parametric(x, y);
      const t = ANGLES[params.angle].value;
      expect(Math.abs(fn(typed(slide)).at({}) - c.dy(t) / c.dx(t))).toBeLessThan(1e-9);
    }
  });

  it('param-tangent-kind reads which rate is zero at t = k', () => {
    for (const { params, slide } of draws(g.paramTangentKind as Generator<KindParams>)) {
      if (slide.kind !== 'choice') throw new Error('expected choice');
      const { x, y } = curveSources(params.curve);
      const c = parametric(x, y);
      const dx = c.dx(params.k);
      const dy = c.dy(params.k);
      expect(dx === 0 && dy === 0, 'both rates zero').toBe(false);
      expect(slide.correctId).toBe(dy === 0 ? 'horizontal' : dx === 0 ? 'vertical' : 'neither');
      expect(slide.correctId).toBe(params.kind);
    }
  });

  it('param-flat-t, -slider and -flow find where the right rate is zero', () => {
    const zeroOf = (params: FlatParams) => {
      const { x, y } = curveSources(flatCurve(params));
      const c = parametric(x, y);
      const rate = params.horizontal ? c.dy : c.dx;
      const zeros = [];
      for (let t = -10; t <= 10; t += 1) if (rate(t) === 0) zeros.push(t);
      expect(zeros.length, 'exactly one turning t').toBe(1);
      const t = zeros[0];
      expect((params.horizontal ? c.dx : c.dy)(t), 'the other rate is not zero there').not.toBe(0);
      return { t, x: c.x(t), y: c.y(t) };
    };
    for (const { params, slide } of draws(g.paramFlatT as Generator<FlatParams>)) {
      expect(Number(typed(slide)) === zeroOf(params).t).toBe(true);
    }
    for (const { params, slide } of draws(g.paramFlatSlider as Generator<FlatParams>)) {
      if (slide.kind !== 'slider') throw new Error('expected slider');
      const at = zeroOf(params);
      expect(slide.answer === (params.horizontal ? at.y : at.x)).toBe(true);
    }
    for (const { params, slide } of draws(g.paramFlatFlow as Generator<FlatParams>)) {
      if (slide.kind !== 'flow') throw new Error('expected flow');
      const at = zeroOf(params);
      expect(slide.answer[1]).toBe(`$t = ${at.t + 0}$`);
      expect(same(pointsIn(slide.answer[2])[0], [at.x, at.y])).toBe(true);
    }
  });
});

describe('implicit curves, checked against mathjs', { timeout: 60_000 }, () => {
  it('puts every whole point on its curve', () => {
    for (const generator of [g.implSlopeTree, g.implAtSteps, g.implGrad, g.implTangentTiles, g.implDiff]) {
      for (const { params } of draws(generator as Generator<CurveParams>)) {
        const { curve } = params;
        expect(implicit(implicitSource(curve)).F(curve.p, curve.q)).toBe(curve.rhs);
      }
    }
  });

  it('impl-diff types -F_x / F_y, and impl-coefficient types F_y', () => {
    for (const { params, slide, seed } of draws(g.implDiff as Generator<CurveParams>)) {
      const oracle = implicit(implicitSource(params.curve)).gradientText;
      expect(checkAnswer(typed(slide), oracle, { seed }).status, `${oracle} vs ${typed(slide)}`).toBe('correct');
    }
    for (const { params, slide, seed } of draws(g.implCoefficient as Generator<CurveParams>)) {
      const oracle = implicit(implicitSource(params.curve)).coefficientText;
      expect(checkAnswer(typed(slide), oracle, { seed }).status, `${oracle} vs ${typed(slide)}`).toBe('correct');
    }
  });

  it('the gradient at a point is -F_x / F_y there, however it is asked', () => {
    const at = (curve: CurveParams['curve']) => {
      const F = implicit(implicitSource(curve));
      return { n: F.Fx(curve.p, curve.q), d: F.Fy(curve.p, curve.q), g: -F.Fx(curve.p, curve.q) / F.Fy(curve.p, curve.q) };
    };
    for (const { params, slide } of draws(g.implSlopeTree as Generator<CurveParams>)) {
      if (slide.kind !== 'tree') throw new Error('expected tree');
      const want = at(params.curve);
      expect(same(slide.answer.map(Number), [want.n, want.d, want.g]), slide.answer.join()).toBe(true);
    }
    for (const { params, slide } of draws(g.implAtSteps as Generator<CurveParams>)) {
      if (slide.kind !== 'steps') throw new Error('expected steps');
      const last = slide.reductions[slide.reductions.length - 1].value;
      expect(Number(/= (-?\d+)$/.exec(last)![1]) === at(params.curve).g, last).toBe(true);
    }
    for (const { params, slide } of draws(g.implGrad as Generator<CurveParams>)) {
      expect(Number(typed(slide)) === at(params.curve).g).toBe(true);
    }
    for (const { params, slide } of draws(g.implTangentTiles as Generator<CurveParams>)) {
      const [m, c] = placed(slide);
      expect(m === at(params.curve).g).toBe(true);
      expect(params.curve.q).toBe(m * params.curve.p + c);
    }
  });

  it('impl-term-tree totals the term differentiated with x and y both moving', () => {
    for (const { params, slide } of draws(g.implTermTree as Generator<TermTreeParams>)) {
      if (slide.kind !== 'tree') throw new Error('expected tree');
      const { k, m, n, p, q, g: slope } = params;
      const T = implicit(`${k} * x^${m} * y^${n}`);
      const total = T.Fx(p, q) + T.Fy(p, q) * slope;
      expect(Number(slide.answer[slide.answer.length - 1]) === total).toBe(true);
      expect(termTreeValues(params)[3] === total).toBe(true);
    }
  });

  it('horizontal tangents are where F_x is zero, on the curve, with F_y not zero', () => {
    const check = (params: StationaryParams, points: [number, number][]) => {
      const F = implicit(xyAnswer(stationaryTerms(params)));
      for (const [x, y] of points) {
        expect(F.F(x, y) === stationaryRhs(params), `(${x}, ${y}) on the curve`).toBe(true);
        expect(F.Fx(x, y) === 0).toBe(true);
        expect(F.Fy(x, y) !== 0).toBe(true);
      }
    };
    for (const { params, slide } of draws(g.implFlatPoint as Generator<StationaryParams>)) {
      const [x, y] = placed(slide);
      expect(x).toBeGreaterThan(0);
      check(params, [[x, y]]);
    }
    for (const { params, slide } of draws(g.implStationaryFlow as Generator<StationaryParams>)) {
      if (slide.kind !== 'flow') throw new Error('expected flow');
      const points = pointsIn(slide.answer[2]);
      expect(points.length).toBe(2);
      check(params, points);
    }
    for (const { params, slide } of draws(g.implFlatLine as Generator<StationaryParams>)) {
      const F = implicit(xyAnswer(stationaryTerms(params)));
      const line = fn(typed(slide));
      for (const x of [-2.5, 0.5, 1.7]) expect(close(F.Fx(x, line.at({ x })), 0)).toBe(true);
    }
  });

  it('impl-tangent-kind reads which of F_x and F_y is zero at the point', () => {
    for (const { params, slide } of draws(g.implTangentKind as Generator<ImplicitKindParams>)) {
      if (slide.kind !== 'choice') throw new Error('expected choice');
      const { curve } = params;
      const F = implicit(implicitSource(curve));
      expect(F.F(curve.p, curve.q)).toBe(curve.rhs);
      const n = F.Fx(curve.p, curve.q);
      const d = F.Fy(curve.p, curve.q);
      expect(slide.correctId).toBe(n === 0 ? 'horizontal' : d === 0 ? 'vertical' : 'neither');
    }
  });
});
