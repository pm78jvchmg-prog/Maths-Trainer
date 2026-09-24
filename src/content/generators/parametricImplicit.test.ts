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
  conicRhs,
  conicTerms,
  curveSources,
  linearD2Curve,
  lowestCurve,
  quadraticXCurve,
  stationaryPoints,
  taylorCurve,
  trigD2Sources,
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
  type ConcaveParams,
  type ConicParams,
  type GeneralD2Params,
  type LinearD2Params,
  type LowestParams,
  type QuadraticXParams,
  type TaylorParams,
  type TrigD2Params,
  type TurningKindParams,
  type TurningParams,
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
  generalSources,
  inTSources,
  type AgainParams,
  type AtKParams,
  type CrossParams,
  type GeneralParams,
  type InTParams,
  type ParallelParams,
  type SlopePointsParams,
  arctanWhereTarget,
  chainSource,
  expSource,
  inverseSineSource,
  inverseSineX,
  logDiffAtCurve,
  logDiffSource,
  powerPowerSource,
  type ArctanAtParams,
  type ArctanParams,
  type ArctanWhereParams,
  type ExpAtParams,
  type ExpParams,
  type InverseChainParams,
  type InversePointParams,
  type InverseSineParams,
  type LogDiffAtParams,
  type LogDiffParams,
  type PowerPowerParams,
  crossingCurve,
  type CrossingParams,
  type MotionParams,
  type QuantityParams,
  type RateParams,
  type SlowParams,
  type StillParams,
  trigAreaSources,
  type AreaParams,
  type LimitParams,
  type TrigAreaParams,
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

/**
 * A tile, bank entry or label written in TeX, read back for mathjs: fractions,
 * braced powers and the trigonometric functions this level writes.
 */
function texToMath(tex: string): string {
  let s = tex
    .replace(/\\left|\\right/g, '')
    .replace(/\^\{([^{}]+)\}/g, '^($1)')
    .replace(/\\(sin|cos|tan|cot)\^\((\d+)\) t/g, '$1(t)^($2)')
    .replace(/\\(sin|cos|tan|cot) t/g, '$1(t)');
  for (let i = 0; i < 4; i += 1) s = s.replace(/\\frac\{([^{}]*)\}\{([^{}]*)\}/g, '(($1)/($2))');
  return s.replaceAll('$', '');
}

const valueOfTex = (tex: string, scope: Scope = {}): number => fn(texToMath(tex)).at(scope);

/** x(t), y(t), and d²y/dx² = (y''x' - y'x'')/x'^3, all from mathjs. */
function parametric2(x: string, y: string) {
  const X = math.parse(x);
  const Y = math.parse(y);
  const dX = math.derivative(X, 't');
  const dY = math.derivative(Y, 't');
  const ddX = math.derivative(dX, 't');
  const ddY = math.derivative(dY, 't');
  const gradient = math.parse(`(${dY.toString()})/(${dX.toString()})`);
  const rate = math.derivative(gradient, 't');
  const at = (node: { evaluate(scope: Scope): unknown }) => (t: number) => node.evaluate({ t }) as number;
  const text = `((${ddY.toString()})*(${dX.toString()}) - (${dY.toString()})*(${ddX.toString()}))/(${dX.toString()})^3`;
  return { x: at(X), y: at(Y), dx: at(dX), dy: at(dY), rate: at(rate), d2: at(math.parse(text)), text };
}

/** F(x, y) with the implicit first and second derivatives, from mathjs's partials. */
function implicit2(source: string) {
  const F = math.parse(source);
  const Fx = math.derivative(F, 'x');
  const Fy = math.derivative(F, 'y');
  const Fxx = math.derivative(Fx, 'x');
  const Fxy = math.derivative(Fx, 'y');
  const Fyy = math.derivative(Fy, 'y');
  const at = (node: { evaluate(scope: Scope): unknown }) => (x: number, y: number) => node.evaluate({ x, y }) as number;
  const [f, fx, fy, fxx, fxy, fyy] = [F, Fx, Fy, Fxx, Fxy, Fyy].map(at);
  const slope = (x: number, y: number) => -fx(x, y) / fy(x, y);
  const second = (x: number, y: number) => {
    const s = slope(x, y);
    return -(fxx(x, y) + 2 * fxy(x, y) * s + fyy(x, y) * s * s) / fy(x, y);
  };
  return { F: f, Fx: fx, Fy: fy, slope, second };
}

const correctAnswer = <P>(generator: Generator<P>, params: P): string => {
  const right = generator.choices!(params).find((option) => option.correct)!;
  return right.answer!;
};

const lastValue = (slide: Slide): string => {
  if (slide.kind === 'tree') return slide.answer[slide.answer.length - 1];
  if (slide.kind === 'steps') return slide.reductions[slide.reductions.length - 1].value;
  throw new Error(`no last value on a ${slide.kind} slide`);
};


// Symbolic differentiation twice per draw across ten generators: the slowest
// block here, so it has a budget of its own rather than fewer seeds.
describe('second derivatives, checked against mathjs', { timeout: 180_000 }, () => {
  it('param-d2 types (and offers) y\'\'x\' - y\'x\'\' over x\'^3', () => {
    for (const { params, slide, seed } of draws(g.paramD2 as Generator<LinearD2Params>)) {
      const { x, y } = curveSources(linearD2Curve(params));
      const oracle = parametric2(x, y).text;
      expect(checkAnswer(typed(slide), oracle, { seed }).status, `${oracle} vs ${typed(slide)}`).toBe('correct');
      expect(checkAnswer(correctAnswer(g.paramD2 as Generator<LinearD2Params>, params), oracle, { seed }).status).toBe('correct');
    }
  });

  it('param-d2-tiles places d/dt(dy/dx), then dx/dt, and their quotient is d2y/dx2', () => {
    for (const { params, slide } of draws(g.paramD2Tiles as Generator<LinearD2Params>)) {
      if (slide.kind !== 'tiles') throw new Error('expected tiles');
      const { x, y } = curveSources(linearD2Curve(params));
      const c = parametric2(x, y);
      const [rate, divisor] = slide.answer;
      for (const t of T_SAMPLES) {
        expect(close(valueOfTex(rate, { t }), c.rate(t)), `${rate} at ${t}`).toBe(true);
        expect(close(valueOfTex(divisor), c.dx(t))).toBe(true);
        expect(close(valueOfTex(rate, { t }) / valueOfTex(divisor), c.d2(t))).toBe(true);
      }
    }
  });

  it('param-d2-flow ends on d2y/dx2', () => {
    for (const { params, slide } of draws(g.paramD2Flow as Generator<LinearD2Params>)) {
      if (slide.kind !== 'flow') throw new Error('expected flow');
      const { x, y } = curveSources(linearD2Curve(params));
      const c = parametric2(x, y);
      for (const t of T_SAMPLES) expect(close(valueOfTex(slide.answer[2], { t }), c.d2(t)), slide.answer[2]).toBe(true);
    }
  });

  it('param-d2-trig and param-d2-general type (and offer) d2y/dx2 in t', () => {
    for (const { params, slide, seed } of draws(g.paramD2Trig as Generator<TrigD2Params>)) {
      const { x, y } = trigD2Sources(params);
      const oracle = parametric2(x, y).text;
      expect(checkAnswer(typed(slide), oracle, { seed }).status, `${oracle} vs ${typed(slide)}`).toBe('correct');
      expect(checkAnswer(correctAnswer(g.paramD2Trig as Generator<TrigD2Params>, params), oracle, { seed }).status).toBe('correct');
    }
    for (const { params, slide, seed } of draws(g.paramD2General as Generator<QuadraticXParams>)) {
      const { x, y } = curveSources(quadraticXCurve(params));
      const oracle = parametric2(x, y).text;
      expect(checkAnswer(typed(slide), oracle, { seed }).status, `${oracle} vs ${typed(slide)}`).toBe('correct');
      expect(checkAnswer(correctAnswer(g.paramD2General as Generator<QuadraticXParams>, params), oracle, { seed }).status).toBe('correct');
    }
  });

  it('the value at t = k agrees with mathjs, however it is asked', () => {
    const want = ({ curve }: GeneralD2Params) => {
      const { x, y } = curveSources(curve);
      return parametric2(x, y);
    };
    for (const { params, slide } of draws(g.paramD2RatesTree as Generator<GeneralD2Params>)) {
      if (slide.kind !== 'tree') throw new Error('expected tree');
      const c = want(params);
      const [rate, dx, v] = slide.answer.map((tex) => valueOfTex(tex));
      expect(close(rate, c.rate(params.k)), `${slide.answer}`).toBe(true);
      expect(close(dx, c.dx(params.k))).toBe(true);
      expect(close(v, c.d2(params.k))).toBe(true);
    }
    for (const { params, slide } of draws(g.paramD2QuotientSteps as Generator<GeneralD2Params>)) {
      expect(close(valueOfTex(lastValue(slide)), want(params).d2(params.k)), lastValue(slide)).toBe(true);
    }
    for (const { params, slide } of draws(g.paramD2At as Generator<GeneralD2Params>)) {
      const d2 = want(params).d2(params.k);
      expect(close(fn(typed(slide)).at({}), d2)).toBe(true);
      expect(close(fn(correctAnswer(g.paramD2At as Generator<GeneralD2Params>, params)).at({}), d2)).toBe(true);
    }
  });

  it('param-concave-choice reads the sign of d2y/dx2 at t = k', () => {
    for (const { params, slide } of draws(g.paramConcaveChoice as Generator<ConcaveParams>)) {
      if (slide.kind !== 'choice') throw new Error('expected choice');
      const { x, y } = curveSources(taylorCurve(params));
      const d2 = parametric2(x, y).d2(params.k);
      expect(slide.correctId).toBe(d2 > 1e-12 ? 'up' : d2 < -1e-12 ? 'down' : 'neither');
    }
  });

  it('param-turning-tree and param-nature-flow sit on a horizontal tangent and read d2y/dx2 there', () => {
    const at = (params: TaylorParams) => {
      const { x, y } = curveSources(taylorCurve(params));
      const c = parametric2(x, y);
      expect(c.dy(params.k) === 0, 'dy/dt is zero at t = k').toBe(true);
      expect(c.dx(params.k)).not.toBe(0);
      return c.d2(params.k);
    };
    for (const { params, slide } of draws(g.paramTurningTree as Generator<TaylorParams>)) {
      expect(close(valueOfTex(lastValue(slide)), at(params))).toBe(true);
    }
    for (const { params, slide } of draws(g.paramNatureFlow as Generator<TaylorParams>)) {
      if (slide.kind !== 'flow') throw new Error('expected flow');
      const d2 = at(params);
      expect(close(valueOfTex(slide.answer[1].split('=')[1]), d2), slide.answer[1]).toBe(true);
      expect(slide.answer[2]).toBe(d2 < 0 ? 'A maximum' : 'A minimum');
    }
  });

  it('param-lowest-slider slides to the height where dy/dt = 0 and d2y/dx2 has the asked sign', () => {
    for (const { params, slide } of draws(g.paramLowestSlider as Generator<LowestParams>)) {
      if (slide.kind !== 'slider') throw new Error('expected slider');
      const { x, y } = curveSources(lowestCurve(params));
      const c = parametric2(x, y);
      const flat = [];
      for (let t = -12; t <= 12; t += 1) if (c.dy(t) === 0) flat.push(t);
      expect(flat.length, 'two horizontal tangents').toBe(2);
      const wanted = flat.filter((t) => (params.max ? c.d2(t) < 0 : c.d2(t) > 0));
      expect(wanted.length).toBe(1);
      expect(slide.answer).toBe(c.y(wanted[0]));
    }
  });

  it('the implicit second derivative agrees with mathjs, however it is asked', () => {
    const on = (params: ConicParams) => {
      const F = implicit2(xyAnswer(conicTerms(params)));
      expect(F.F(params.p, params.q)).toBe(conicRhs(params));
      return F;
    };
    for (const { params, slide, seed } of draws(g.implD2At as Generator<ConicParams>)) {
      const want = on(params).second(params.p, params.q);
      expect(close(fn(typed(slide)).at({}), want)).toBe(true);
      expect(close(fn(correctAnswer(g.implD2At as Generator<ConicParams>, params)).at({}), want), `seed ${seed}`).toBe(true);
    }
    for (const { params, slide } of draws(g.implD2Tiles as Generator<ConicParams>)) {
      const [k, quotient] = (slide.kind === 'tiles' ? slide.answer : []) as string[];
      expect(quotient).toBe('y - x\\frac{dy}{dx}');
      const F = on(params);
      const { p, q } = params;
      expect(close((valueOfTex(k) * (q - p * F.slope(p, q))) / (q * q), F.second(p, q))).toBe(true);
    }
    for (const { params, slide } of draws(g.implD2SubSteps as Generator<ConicParams>)) {
      const F = on(params);
      const { p, q } = params;
      // The curve is symmetric in both axes, so all four of these are on it.
      for (const [X, Y] of [[p, q], [-p, q], [p, -q], [-p, -q]]) {
        expect(close(valueOfTex(lastValue(slide), { y: Y }), F.second(X, Y)), lastValue(slide)).toBe(true);
      }
    }
    for (const { params, slide } of draws(g.implD2PointTree as Generator<ConicParams>)) {
      if (slide.kind !== 'tree') throw new Error('expected tree');
      const F = on(params);
      expect(close(valueOfTex(slide.answer[0]), F.slope(params.p, params.q))).toBe(true);
      expect(close(valueOfTex(lastValue(slide)), F.second(params.p, params.q))).toBe(true);
    }
  });

  it('implicit turning points are flat, on the curve, and read the sign of d2y/dx2', () => {
    const at = ({ curve }: TurningParams) => {
      const F = implicit2(implicitSource(curve));
      expect(F.F(curve.p, curve.q)).toBe(curve.rhs);
      expect(F.Fx(curve.p, curve.q) === 0, 'the tangent is horizontal').toBe(true);
      expect(F.Fy(curve.p, curve.q)).not.toBe(0);
      return F.second(curve.p, curve.q);
    };
    for (const { params, slide } of draws(g.implTurningTree as Generator<TurningParams>)) {
      expect(close(valueOfTex(lastValue(slide)), at(params))).toBe(true);
    }
    for (const { params, slide } of draws(g.implTurningValue as Generator<TurningParams>)) {
      const want = at(params);
      expect(close(fn(typed(slide)).at({}), want)).toBe(true);
      expect(close(fn(correctAnswer(g.implTurningValue as Generator<TurningParams>, params)).at({}), want)).toBe(true);
    }
    for (const { params, slide } of draws(g.implTurningFlow as Generator<TurningParams>)) {
      if (slide.kind !== 'flow') throw new Error('expected flow');
      const want = at(params);
      expect(close(valueOfTex(slide.answer[1].split('=')[1]), want)).toBe(true);
      expect(slide.answer[2]).toBe(want < 0 ? 'A local maximum' : 'A local minimum');
    }
    for (const { params, slide } of draws(g.implTurningKind as Generator<TurningKindParams>)) {
      if (slide.kind !== 'choice') throw new Error('expected choice');
      const F = implicit2(xyAnswer(stationaryTerms(params)));
      const seconds = stationaryPoints(params).map(([x, y]) => {
        expect(F.F(x, y) === stationaryRhs(params)).toBe(true);
        expect(F.Fx(x, y) === 0).toBe(true);
        return F.second(x, y);
      });
      const pick = seconds.findIndex((s) => (params.max ? s < 0 : s > 0));
      expect(seconds.filter((s) => (params.max ? s < 0 : s > 0)).length).toBe(1);
      expect(slide.correctId).toBe(pick === 0 ? 'first' : 'second');
    }
  });
});

/* ---------- Level 4: tangents and normals ---------- */

/** The template with the answer's tiles put in, as the learner builds it. */
const filled = (slide: Slide): string => {
  if (slide.kind !== 'tiles') throw new Error(`expected a tiles slide, got ${slide.kind}`);
  return slide.template.replace(/\{(\d+)\}/g, (_, i: string) => slide.answer[Number(i)]);
};

/**
 * A line the learner reads, such as `x + 3y = 22`, `ty = x + 3t^2` or
 * `y = 4x - 22`, as F(x, y, t) = left - right, with mathjs's own gradient
 * -F_x / F_y.
 */
function line(tex: string) {
  const [left, right] = texToMath(tex.replaceAll('$', ''))
    .replace(/\\text\{[^}]*\}/g, '')
    .replace(/([0-9a-z)])\s*(?=[a-z(])/g, '$1 ')
    .split('=');
  const F = math.parse(`(${left}) - (${right})`);
  const Fx = math.derivative(F, 'x');
  const Fy = math.derivative(F, 'y');
  const at = (node: { evaluate(scope: Scope): unknown }) => (x: number, y: number, t = 0) => node.evaluate({ x, y, t }) as number;
  const [f, fx, fy] = [F, Fx, Fy].map(at);
  return { F: f, slope: (x: number, y: number, t = 0) => -fx(x, y, t) / fy(x, y, t) };
}

/** The line a prompt says the tangent is parallel or perpendicular to. */
const givenLine = (slide: Slide): string => /(?:parallel|perpendicular) to (\$[^$]+\$)/.exec(proseOf(slide))![1];

describe('tangents and normals, checked against mathjs', { timeout: 120_000 }, () => {
  it('the parametric normal is at right angles to the tangent and through the point, however it is asked', () => {
    const at = (params: SlopeAtParams) => {
      const { x, y } = curveSources(params.curve);
      const c = parametric(x, y);
      return { x0: c.x(params.k), y0: c.y(params.k), dx: c.dx(params.k), dy: c.dy(params.k), m: c.dy(params.k) / c.dx(params.k) };
    };
    for (const { params, slide } of draws(g.paramNormalTree as Generator<SlopeAtParams>)) {
      if (slide.kind !== 'tree') throw new Error('expected tree');
      const want = at(params);
      expect(same(slide.answer.slice(0, 2).map(Number), [want.dy, want.dx])).toBe(true);
      expect(close(valueOfTex(slide.answer[2]), want.m)).toBe(true);
      expect(close(valueOfTex(slide.answer[3]) * want.m, -1), slide.answer[3]).toBe(true);
    }
    for (const { params, slide } of draws(g.paramNormalGrad as Generator<SlopeAtParams>)) {
      const want = at(params);
      expect(close(fn(typed(slide)).at({}) * want.m, -1)).toBe(true);
      expect(close(fn(correctAnswer(g.paramNormalGrad as Generator<SlopeAtParams>, params)).at({}) * want.m, -1)).toBe(true);
    }
    const isNormal = (tex: string, want: ReturnType<typeof at>) => {
      const L = line(tex);
      return close(L.F(want.x0, want.y0), 0) && close(L.slope(want.x0, want.y0) * want.m, -1);
    };
    for (const { params, slide } of draws(g.paramNormalTiles as Generator<SlopeAtParams>)) {
      expect(isNormal(filled(slide), at(params)), filled(slide)).toBe(true);
    }
    for (const { params, slide } of draws(g.paramNormalFlow as Generator<SlopeAtParams>)) {
      if (slide.kind !== 'flow') throw new Error('expected flow');
      const want = at(params);
      expect(close(valueOfTex(slide.answer[0]), want.m)).toBe(true);
      expect(close(valueOfTex(slide.answer[1]) * want.m, -1)).toBe(true);
      expect(isNormal(slide.answer[2], want), slide.answer[2]).toBe(true);
      // Every other line on offer is not the normal.
      for (const branch of slide.steps[2].branches) {
        if (branch.label !== slide.answer[2]) expect(isNormal(branch.label, want), branch.label).toBe(false);
      }
    }
  });

  it('the implicit normal is F_y / F_x at the point, however it is asked', () => {
    const at = (curve: CurveParams['curve']) => {
      const F = implicit(implicitSource(curve));
      return { x0: curve.p, y0: curve.q, m: -F.Fx(curve.p, curve.q) / F.Fy(curve.p, curve.q) };
    };
    for (const { params, slide } of draws(g.implNormalGrad as Generator<CurveParams>)) {
      const want = at(params.curve);
      expect(close(fn(typed(slide)).at({}) * want.m, -1)).toBe(true);
      expect(close(fn(correctAnswer(g.implNormalGrad as Generator<CurveParams>, params)).at({}) * want.m, -1)).toBe(true);
    }
    for (const { params, slide } of draws(g.implNormalSteps as Generator<CurveParams>)) {
      expect(close(valueOfTex(lastValue(slide).split('=')[1]) * at(params.curve).m, -1), lastValue(slide)).toBe(true);
    }
    const isNormal = (tex: string, want: ReturnType<typeof at>) => {
      const L = line(tex);
      return close(L.F(want.x0, want.y0), 0) && close(L.slope(want.x0, want.y0) * want.m, -1);
    };
    for (const { params, slide } of draws(g.implNormalTiles as Generator<CurveParams>)) {
      expect(isNormal(filled(slide), at(params.curve)), filled(slide)).toBe(true);
    }
    for (const { params, slide } of draws(g.implNormalLine as Generator<CurveParams>)) {
      if (slide.kind !== 'choice') throw new Error('expected choice');
      for (const option of slide.options) {
        expect(isNormal(option.label, at(params.curve)), option.label).toBe(option.id === slide.correctId);
      }
    }
  });

  it('the lines at a general point touch (or cross at right angles) at every t', () => {
    const check = (params: GeneralParams, tex: string) => {
      const { x, y } = generalSources(params);
      const c = parametric(x, y);
      const L = line(tex);
      for (const t of T_SAMPLES) {
        const [x0, y0] = [c.x(t), c.y(t)];
        expect(close(L.F(x0, y0, t), 0), `${tex} at t = ${t}`).toBe(true);
        const m = c.dy(t) / c.dx(t);
        expect(close(params.normal ? L.slope(x0, y0, t) * m : L.slope(x0, y0, t), params.normal ? -1 : m), `${tex} at t = ${t}`).toBe(true);
      }
    };
    for (const { params, slide } of draws(g.paramLineInT as Generator<GeneralParams>)) check(params, filled(slide));
    for (const { params, slide } of draws(g.paramTangentTSteps as Generator<GeneralParams>)) {
      if (slide.kind !== 'steps') throw new Error('expected steps');
      check(params, lastValue(slide));
      const { x, y } = generalSources(params);
      const c = parametric(x, y);
      for (const t of T_SAMPLES) {
        const m = c.dy(t) / c.dx(t);
        expect(close(valueOfTex(slide.reductions[0].value, { t }), params.normal ? -1 / m : m)).toBe(true);
      }
    }
    for (const { params, slide, seed } of draws(g.paramNormalInT as Generator<InTParams>)) {
      const { x, y } = inTSources(params);
      const X = fn(x).by('t');
      const Y = fn(y).by('t');
      const oracle = `-(${X.text})/(${Y.text})`;
      expect(checkAnswer(typed(slide), oracle, { seed }).status, `${oracle} vs ${typed(slide)}`).toBe('correct');
      const right = correctAnswer(g.paramNormalInT as Generator<InTParams>, params);
      expect(checkAnswer(right, oracle, { seed }).status).toBe('correct');
    }
    for (const { params, slide } of draws(g.paramAtKTree as Generator<AtKParams>)) {
      if (slide.kind !== 'tree') throw new Error('expected tree');
      const { x, y } = generalSources(params);
      const c = parametric(x, y);
      const { k } = params;
      const tangent = c.dy(k) / c.dx(k);
      const m = params.normal ? -1 / tangent : tangent;
      expect(close(Number(slide.answer[2]), c.y(k) - m * c.x(k)), slide.answer.join()).toBe(true);
    }
  });

  it('where the tangent or normal meets the axes and the curve again', () => {
    const lineAt = (params: CrossParams | AgainParams) => {
      const { x, y } = curveSources(params.curve);
      const c = parametric(x, y);
      const { k } = params;
      const tangent = c.dy(k) / c.dx(k);
      const m = 'normal' in params && params.normal ? -1 / tangent : tangent;
      return { c, x0: c.x(k), y0: c.y(k), m };
    };
    for (const { params, slide } of draws(g.paramCrossSlider as Generator<CrossParams>)) {
      if (slide.kind !== 'slider') throw new Error('expected slider');
      const { x0, y0, m } = lineAt(params);
      expect(close(0 - y0, m * (slide.answer - x0)), `${slide.answer}`).toBe(true);
    }
    for (const { params, slide } of draws(g.paramTriangleArea as Generator<CrossParams>)) {
      const { x0, y0, m } = lineAt(params);
      const area = Math.abs((x0 - y0 / m) * (y0 - m * x0)) / 2;
      expect(close(fn(typed(slide)).at({}), area)).toBe(true);
      expect(close(fn(correctAnswer(g.paramTriangleArea as Generator<CrossParams>, params)).at({}), area)).toBe(true);
    }
    // The other root: back on the normal, and not the point it started from.
    const meetsAgain = (params: AgainParams, s: number) => {
      const { c, x0, y0 } = lineAt(params);
      const { k } = params;
      expect(s).not.toBe(k);
      expect(close((c.x(s) - x0) * c.dx(k) + (c.y(s) - y0) * c.dy(k), 0), `t = ${s}`).toBe(true);
    };
    for (const { params, slide } of draws(g.paramAgainTree as Generator<AgainParams>)) {
      if (slide.kind !== 'tree') throw new Error('expected tree');
      const [p, q, sum, other] = slide.answer.map(Number);
      meetsAgain(params, other);
      expect(p).toBeGreaterThan(0);
      expect(close(sum, -q / p) && close(sum, params.k + other)).toBe(true);
    }
    for (const { params, slide } of draws(g.paramMeetFlow as Generator<AgainParams>)) {
      if (slide.kind !== 'flow') throw new Error('expected flow');
      const other = Number(/t = (-?\d+)/.exec(slide.answer[2])![1]);
      meetsAgain(params, other);
      const quadratic = fn(texToMath(slide.answer[1].replaceAll('$', '').replace(' = 0', '')));
      expect(close(quadratic.at({ t: params.k }), 0) && close(quadratic.at({ t: other }), 0), slide.answer[1]).toBe(true);
    }
  });

  it('a tangent with a given gradient has it, read off the line in the prompt', () => {
    const needed = (slide: Slide) => {
      const L = line(givenLine(slide));
      const slope = L.slope(0, 0);
      return proseOf(slide).includes('perpendicular') ? -1 / slope : slope;
    };
    const slopeAt = (params: ParallelParams, t: number) => {
      const { x, y } = curveSources(params.curve);
      const c = parametric(x, y);
      return { m: c.dy(t) / c.dx(t), x0: c.x(t), y0: c.y(t) };
    };
    for (const { params, slide } of draws(g.paramParallelT as Generator<ParallelParams>)) {
      expect(close(slopeAt(params, Number(typed(slide))).m, needed(slide))).toBe(true);
      expect(close(slopeAt(params, Number(correctAnswer(g.paramParallelT as Generator<ParallelParams>, params))).m, needed(slide))).toBe(true);
    }
    for (const { params, slide } of draws(g.paramParallelSteps as Generator<ParallelParams>)) {
      const t = Number(/t = (-?\d+)/.exec(lastValue(slide))![1]);
      expect(close(slopeAt(params, t).m, needed(slide))).toBe(true);
    }
    for (const { params, slide } of draws(g.paramGivenTiles as Generator<ParallelParams>)) {
      const [m, c] = placed(slide);
      const want = slopeAt(params, params.t0);
      expect(close(want.m, needed(slide)) && close(m, want.m)).toBe(true);
      expect(close(want.y0, m * want.x0 + c), 'the tangent passes through the point').toBe(true);
      // Not the given line itself.
      expect(close(line(givenLine(slide)).F(0, c), 0) && close(line(givenLine(slide)).F(1, m + c), 0)).toBe(false);
    }
    for (const { params, slide } of draws(g.implSlopePoints as Generator<SlopePointsParams>)) {
      if (slide.kind !== 'choice') throw new Error('expected choice');
      const F = implicit(xyAnswer(conicTerms(params)));
      const want = needed(slide);
      const right = (x: number, y: number) => F.F(x, y) === conicRhs(params) && close(-F.Fx(x, y) / F.Fy(x, y), want);
      for (const option of slide.options) {
        const points = pointsIn(option.label);
        expect(points.length).toBe(2);
        expect(points.every(([x, y]) => right(x, y)), option.label).toBe(option.id === slide.correctId);
      }
    }
  });
});

/*
 * Level 5. Everything is read off the rendered slide and checked against
 * mathjs's own derivative of y, never against the generator's hand-worked
 * coefficients. `rhsOf` reads the TeX this level writes: logarithms, roots,
 * times signs and powers in braces.
 */

/** Level 5's TeX for mathjs: the part after the last `=`, with `y(...)` read as y times the bracket. */
function rhsOf(tex: string, y?: string): string {
  let s = tex.replaceAll('$', '').split('=').pop()!;
  s = s.replace(/\\left|\\right/g, '').replace(/\\,/g, ' ').replace(/\\times/g, '*');
  for (let i = 0; i < 5; i += 1) {
    s = s
      .replace(/\^\{([^{}]+)\}/g, '^($1)')
      .replace(/\\sqrt\{([^{}]*)\}/g, 'sqrt($1)')
      .replace(/\\frac\{([^{}]*)\}\{([^{}]*)\}/g, '(($1)/($2))');
  }
  // A space before each log, or mathjs reads `x log` written together as one function name.
  s = s.replace(/\\ln\s*\(/g, ' log(').replace(/\\ln\s*(\d+|x)/g, ' log($1)');
  if (y !== undefined) s = s.replace(/^\s*y\s*\(/, `(${y}) * (`);
  return s;
}

const valueOf5 = (tex: string, scope: Scope = {}): number => fn(rhsOf(tex)).at(scope);

describe('exponentials and inverses, checked against mathjs', { timeout: 300_000 }, () => {
  const X_SAMPLES = [-1.3, -0.4, 0.3, 0.9, 1.6];

  it('a^x differentiates to ln a times a^x, however it is asked', () => {
    for (const generator of [g.implAxLogSteps, g.implAxTiles, g.implAxGrad]) {
      for (const { params, slide } of draws(generator as Generator<ExpParams>)) {
        const d = fn(expSource(params)).by('x');
        const answer = slide.kind === 'tiles' ? rhsOf(filled(slide)) : slide.kind === 'steps' ? rhsOf(lastValue(slide)) : typed(slide);
        for (const x of X_SAMPLES) expect(close(fn(answer).at({ x }), d.at({ x })), `${generator.id}: ${answer} at ${x}`).toBe(true);
      }
    }
    for (const { params } of draws(g.implAxGrad as Generator<ExpParams>)) {
      const d = fn(expSource(params)).by('x');
      const right = correctAnswer(g.implAxGrad as Generator<ExpParams>, params);
      for (const x of X_SAMPLES) expect(close(fn(right).at({ x }), d.at({ x })), right).toBe(true);
    }
    for (const { params, slide } of draws(g.implAxAtTree as Generator<ExpAtParams>)) {
      if (slide.kind !== 'tree') throw new Error('expected tree');
      const source = `${params.a}^((${params.k}) * x)`;
      const x = Number(/x = (-?\d+)/.exec(proseOf(slide))![1]);
      const [y, rate, gradient] = slide.answer.map((tex) => valueOf5(tex));
      expect(close(y, fn(source).at({ x })), slide.answer[0]).toBe(true);
      expect(close(gradient, fn(source).by('x').at({ x })), slide.answer[2]).toBe(true);
      expect(close(rate * y, gradient)).toBe(true);
    }
  });

  it('the inverse sine and cosine have gradient ±1 over the root of 1 - x^2, however it is asked', () => {
    const want = (params: InverseSineParams) => fn(inverseSineSource(params)).by('x').at({ x: inverseSineX(params) });
    for (const { params, slide } of draws(g.implArcsinDeriveSteps as Generator<InverseSineParams>)) {
      expect(close(valueOf5(lastValue(slide)), want(params)), lastValue(slide)).toBe(true);
    }
    for (const { params, slide } of draws(g.implArcsinAtTree as Generator<InverseSineParams>)) {
      if (slide.kind !== 'tree') throw new Error('expected tree');
      const x = inverseSineX(params);
      const [square, less, root, gradient] = slide.answer.map((tex) => valueOf5(tex));
      expect(close(square, x * x) && close(less, 1 - x * x) && close(root, Math.sqrt(1 - x * x))).toBe(true);
      expect(close(gradient, want(params)), slide.answer[3]).toBe(true);
    }
    for (const { params, slide } of draws(g.implArcsinGrad as Generator<InverseSineParams>)) {
      expect(close(fn(typed(slide)).at({}), want(params))).toBe(true);
      expect(close(fn(correctAnswer(g.implArcsinGrad as Generator<InverseSineParams>, params)).at({}), want(params))).toBe(true);
    }
    for (const { params, slide } of draws(g.implInverseSignFlow as Generator<InverseSineParams>)) {
      if (slide.kind !== 'flow') throw new Error('expected flow');
      expect(close(valueOf5(slide.answer[2]), want(params)), slide.answer[2]).toBe(true);
      // No other value on offer is the gradient.
      for (const branch of slide.steps[2].branches) {
        if (branch.label !== slide.answer[2]) expect(close(valueOf5(branch.label), want(params)), branch.label).toBe(false);
      }
    }
  });

  it('the inverse tangent has gradient k over 1 + x^2, however it is asked', () => {
    const want = (k: number, x: number) => fn(`${k} * atan(x)`).by('x').at({ x });
    for (const { params, slide } of draws(g.implArctanGrad as Generator<ArctanParams>)) {
      expect(close(fn(typed(slide)).at({}), want(params.k, params.x0))).toBe(true);
      expect(close(fn(correctAnswer(g.implArctanGrad as Generator<ArctanParams>, params)).at({}), want(params.k, params.x0))).toBe(true);
    }
    for (const { params, slide } of draws(g.implArctanSecTiles as Generator<ArctanParams>)) {
      if (slide.kind !== 'tiles') throw new Error('expected tiles');
      // tan y = kx is y = atan(kx).
      const { k, x0 } = params;
      expect(close(valueOf5(slide.answer[0]), 1 + Math.tan(Math.atan(k * x0)) ** 2)).toBe(true);
      expect(close(valueOf5(slide.answer[1]), fn(`atan(${k} * x)`).by('x').at({ x: x0 })), slide.answer[1]).toBe(true);
    }
    for (const { params, slide } of draws(g.implArctanAtTree as Generator<ArctanAtParams>)) {
      if (slide.kind !== 'tree') throw new Error('expected tree');
      const x = (params.s * params.p) / params.q;
      expect(close(valueOf5(slide.answer[1]), 1 + x * x)).toBe(true);
      expect(close(valueOf5(slide.answer[2]), want(params.k, x)), slide.answer[2]).toBe(true);
    }
    // The set of x an option names, against where the gradient really is the one asked.
    const named = (label: string): number[] => {
      if (label.includes('no such')) return [];
      const root = /\\sqrt\{(\d+)\}/.exec(label);
      const size = root ? Math.sqrt(Number(root[1])) : Number(/(\d+)$/.exec(label)![1]);
      return label.includes('\\pm') ? [size, -size] : [size];
    };
    for (const { params, slide } of draws(g.implArctanWhere as Generator<ArctanWhereParams>)) {
      if (slide.kind !== 'choice') throw new Error('expected choice');
      const [top, bottom] = arctanWhereTarget(params);
      const target = top / bottom;
      const onCurve = (x: number) => close(want(params.k, x), target);
      const square = params.k / target - 1;
      const truth = square < 0 ? 0 : square === 0 ? 1 : 2;
      for (const option of slide.options) {
        const xs = named(option.label);
        const right = xs.length === truth && new Set(xs).size === xs.length && xs.every(onCurve);
        expect(right, option.label).toBe(option.id === slide.correctId);
      }
    }
  });

  it('logarithmic differentiation agrees with mathjs on y itself, however it is asked', () => {
    // Far enough right that every bracket is positive, so ln y is real.
    const FAR = [7.5, 9.2, 11.3];
    for (const { params, slide } of draws(g.implLogdiffLnTiles as Generator<LogDiffParams>)) {
      const y = fn(logDiffSource(params));
      for (const x of FAR) expect(close(valueOf5(filled(slide), { x }), Math.log(y.at({ x }))), filled(slide)).toBe(true);
    }
    for (const { params, slide } of draws(g.implLogdiffRateSteps as Generator<LogDiffParams>)) {
      const source = logDiffSource(params);
      const gradient = fn(rhsOf(lastValue(slide), source));
      for (const x of FAR) expect(close(gradient.at({ x }), fn(source).by('x').at({ x })), lastValue(slide)).toBe(true);
    }
    for (const { params, slide } of draws(g.implLogdiffAtTree as Generator<LogDiffAtParams>)) {
      if (slide.kind !== 'tree') throw new Error('expected tree');
      const source = fn(logDiffSource(logDiffAtCurve(params)));
      const x = params.x0;
      const [, , rate, y, gradient] = slide.answer.map((tex) => valueOf5(tex));
      expect(close(y, source.at({ x })), slide.answer[3]).toBe(true);
      expect(close(gradient, source.by('x').at({ x })), slide.answer[4]).toBe(true);
      expect(close(rate * y, gradient)).toBe(true);
    }
    for (const { params, slide } of draws(g.implLogdiffFlow as Generator<PowerPowerParams>)) {
      if (slide.kind !== 'flow') throw new Error('expected flow');
      const y = fn(powerPowerSource(params));
      const lnRight = (label: string, x: number) => valueOf5(label.replace(/^\$\\ln y =/, ''), { x });
      for (const x of FAR) {
        expect(close(lnRight(slide.answer[1], x), Math.log(y.at({ x }))), slide.answer[1]).toBe(true);
        expect(close(valueOf5(slide.answer[2], { x }), y.by('x').at({ x }) / y.at({ x })), slide.answer[2]).toBe(true);
      }
      // No other offer at either fork is right.
      for (const branch of slide.steps[1].branches) {
        if (branch.label !== slide.answer[1]) expect(close(lnRight(branch.label, FAR[0]), Math.log(y.at({ x: FAR[0] }))), branch.label).toBe(false);
      }
      for (const branch of slide.steps[2].branches) {
        if (branch.label !== slide.answer[2]) {
          expect(close(valueOf5(branch.label, { x: FAR[0] }), y.by('x').at({ x: FAR[0] }) / y.at({ x: FAR[0] })), branch.label).toBe(false);
        }
      }
    }
  });

  it('an inverse inside a chain agrees with mathjs, however it is asked', () => {
    // Small enough that u stays inside the inverse sine's domain.
    const NEAR = [-0.08, 0.03, 0.07];
    for (const { params, slide } of draws(g.implInverseChainTiles as Generator<InverseChainParams>)) {
      if (slide.kind !== 'tiles') throw new Error('expected tiles');
      const d = fn(chainSource(params)).by('x');
      const u = (x: number) => (params.over ? x / params.n : params.n * x);
      const [outer, inner, whole] = slide.answer;
      for (const x of NEAR) {
        expect(close(valueOf5(whole, { x }), d.at({ x })), `${whole} at ${x}`).toBe(true);
        expect(close(valueOf5(outer, { u: u(x) }) * valueOf5(inner), d.at({ x })), `${outer} times ${inner}`).toBe(true);
      }
    }
    for (const { params } of draws(g.implArctanChainGrad as Generator<InverseChainParams>)) {
      const d = fn(chainSource(params)).by('x');
      const right = correctAnswer(g.implArctanChainGrad as Generator<InverseChainParams>, params);
      for (const x of X_SAMPLES) expect(close(fn(right).at({ x }), d.at({ x })), right).toBe(true);
    }
    for (const { params, slide } of draws(g.implInverseOrigin as Generator<InverseChainParams>)) {
      const d = fn(chainSource(params)).by('x').at({ x: 0 });
      expect(close(fn(typed(slide)).at({}), d)).toBe(true);
      expect(close(fn(correctAnswer(g.implInverseOrigin as Generator<InverseChainParams>, params)).at({}), d)).toBe(true);
    }
    for (const { params, slide } of draws(g.implInversePointTree as Generator<InversePointParams>)) {
      if (slide.kind !== 'tree') throw new Error('expected tree');
      const x = params.x[0] / params.x[1];
      const [u, , , gradient] = slide.answer.map((tex) => valueOf5(tex));
      expect(close(u, params.over ? x / params.n : params.n * x), slide.answer[0]).toBe(true);
      expect(close(gradient, fn(chainSource(params)).by('x').at({ x })), slide.answer[3]).toBe(true);
    }
  });
});

/* ---------- Level 6: related rates and motion along a curve ---------- */

/** A polynomial in x and y as the learner reads it (`2xy + 4`, `x^{2} - 3y`), for mathjs. */
const xyMath = (tex: string): string => texToMath(tex).replace(/([0-9a-z)])\s*(?=[a-z(])/g, '$1 ');

/** The point a prompt names first. */
const pointOf = (slide: Slide): [number, number] => pointsIn(proseOf(slide))[0];

/** The rate a prompt gives: `\frac{dx}{dt} = 3` or `\frac{dy}{dt} = -4`. */
function givenRate(slide: Slide): { given: 'x' | 'y'; r: number } {
  const m = /\\frac\{d([xy])\}\{dt\} = (-?\d+)/.exec(proseOf(slide))!;
  return { given: m[1] as 'x' | 'y', r: Number(m[2]) };
}

/** The value of t a prompt names: `at $t = 2$`. */
const tOf = (slide: Slide): number => Number(/t = (-?\d+)\$/.exec(proseOf(slide))![1]);

/** A `$(a, b)$` label as a pair. */
const pairOf = (label: string): [number, number] => pointsIn(label)[0];

/** What a crossing prompt says is reached: the axis or line, as the coordinate and its value. */
function reached(slide: Slide): { pin: 'x' | 'y'; target: number } {
  const text = proseOf(slide);
  const line = /the line \$([xy]) = (-?\d+)\$/.exec(text);
  if (line) return { pin: line[1] as 'x' | 'y', target: Number(line[2]) };
  const axis = /the \$([xy])\$-axis/.exec(text)!;
  return { pin: axis[1] === 'x' ? 'y' : 'x', target: 0 };
}

describe('related rates and motion, checked against mathjs', { timeout: 180_000 }, () => {
  /** The rate the prompt asks for, from mathjs's partials of F at the point the prompt names. */
  function wantRate(params: RateParams, slide: Slide) {
    const F = implicit(implicitSource(params.curve));
    const [x, y] = pointOf(slide);
    expect(F.F(x, y), 'the point is on the curve').toBe(params.curve.rhs);
    const { given, r } = givenRate(slide);
    const fx = F.Fx(x, y);
    const fy = F.Fy(x, y);
    return { x, y, r, fx, fy, value: given === 'x' ? (-fx * r) / fy : (-fy * r) / fx };
  }

  it('implicit related rates find the other rate, however they are asked', () => {
    for (const { params, slide } of draws(g.implRateTSteps as Generator<RateParams>)) {
      expect(close(valueOf5(lastValue(slide)), wantRate(params, slide).value), lastValue(slide)).toBe(true);
    }
    for (const { params, slide } of draws(g.implRateTree as Generator<RateParams>)) {
      if (slide.kind !== 'tree') throw new Error('expected tree');
      const want = wantRate(params, slide);
      expect(slide.answer.map(Number)).toEqual([want.fx, want.fx * want.r, want.fy, want.value]);
    }
    for (const generator of [g.implRateValue, g.implRateReverse]) {
      for (const { params, slide } of draws(generator as Generator<RateParams>)) {
        const want = wantRate(params, slide).value;
        expect(close(fn(typed(slide)).at({}), want), `${generator.id}: ${typed(slide)}`).toBe(true);
        expect(close(fn(correctAnswer(generator as Generator<RateParams>, params)).at({}), want)).toBe(true);
      }
    }
    for (const { params, slide } of draws(g.implRateSignFlow as Generator<RateParams>)) {
      if (slide.kind !== 'flow') throw new Error('expected flow');
      const want = wantRate(params, slide);
      const m = /^\$(-?\d*)\\frac\{dx\}\{dt\} ([+-]) (\d*)\\frac\{dy\}\{dt\} = 0\$$/.exec(slide.answer[0])!;
      const coefficient = (text: string) => (text === '' ? 1 : text === '-' ? -1 : Number(text));
      expect([coefficient(m[1]), (m[2] === '-' ? -1 : 1) * coefficient(m[3])]).toEqual([want.fx, want.fy]);
      expect(close(valueOf5(slide.answer[1]), want.value), slide.answer[1]).toBe(true);
      expect(slide.answer[2]).toBe(want.value > 0 ? 'Increasing' : 'Decreasing');
    }
    for (const { params, slide } of draws(g.implQuantityRateTree as Generator<QuantityParams>)) {
      if (slide.kind !== 'tree') throw new Error('expected tree');
      const want = wantRate(params, slide);
      const Q = fn(slide.expression.startsWith('\\frac{d}{dt}(xy)') ? 'x * y' : 'x^2 + y^2');
      const rate = Q.by('x').at({ x: want.x, y: want.y }) * want.r + Q.by('y').at({ x: want.x, y: want.y }) * want.value;
      const [v, , , total] = slide.answer.map(Number);
      expect(close(v, want.value)).toBe(true);
      expect(close(total, rate), `${total} vs ${rate}`).toBe(true);
    }
    const XY = [
      [1.3, -0.7],
      [-2.1, 1.6],
      [0.4, 2.9],
    ];
    for (const { params, slide } of draws(g.implRateTiles as Generator<RateParams>)) {
      if (slide.kind !== 'tiles') throw new Error('expected tiles');
      const F = implicit(implicitSource(params.curve));
      const [A, B] = slide.answer.map((tex) => fn(xyMath(tex)));
      for (const [x, y] of XY) {
        expect(close(A.at({ x, y }), F.Fx(x, y)), slide.answer[0]).toBe(true);
        expect(close(B.at({ x, y }), F.Fy(x, y)), slide.answer[1]).toBe(true);
      }
    }
  });

  it('impl-rate-still offers exactly one point where y stands still', () => {
    for (const { params, slide } of draws(g.implRateStill as Generator<StillParams>)) {
      if (slide.kind !== 'choice') throw new Error('expected choice');
      const F = implicit(xyAnswer(stationaryTerms(params)));
      const rhs = stationaryRhs(params);
      for (const option of slide.options) {
        const [x, y] = pairOf(option.label);
        const still = F.F(x, y) === rhs && F.Fx(x, y) === 0 && F.Fy(x, y) !== 0;
        expect(still, option.label).toBe(option.id === slide.correctId);
      }
    }
  });

  it('velocity, direction and speed come from the rates at the time the prompt names', () => {
    for (const { params, slide } of draws(g.paramVelocityTiles as Generator<MotionParams>)) {
      const c = parametric(curveSources(params.curve).x, curveSources(params.curve).y);
      const t = tOf(slide);
      expect(same(placed(slide), [c.dx(t), c.dy(t)])).toBe(true);
    }
    for (const { params, slide } of draws(g.paramDirection as Generator<MotionParams>)) {
      if (slide.kind !== 'choice') throw new Error('expected choice');
      const c = parametric(curveSources(params.curve).x, curveSources(params.curve).y);
      const t = tOf(slide);
      const label = slide.options.find((option) => option.id === slide.correctId)!.label;
      expect(label).toBe(`${c.dx(t) > 0 ? 'Right' : 'Left'} and ${c.dy(t) > 0 ? 'up' : 'down'}`);
    }
    for (const { params, slide } of draws(g.paramDirectionGradient as Generator<MotionParams>)) {
      const c = parametric(curveSources(params.curve).x, curveSources(params.curve).y);
      const t = tOf(slide);
      expect(close(fn(typed(slide)).at({}), c.dy(t) / c.dx(t))).toBe(true);
      expect(close(fn(correctAnswer(g.paramDirectionGradient as Generator<MotionParams>, params)).at({}), c.dy(t) / c.dx(t))).toBe(true);
    }
    for (const { params, slide } of draws(g.paramUprightFlow as Generator<FlatParams>)) {
      if (slide.kind !== 'flow') throw new Error('expected flow');
      const { x, y } = curveSources(flatCurve(params));
      const c = parametric(x, y);
      const across = proseOf(slide).includes('straight across');
      const still = across ? c.dy : c.dx;
      const zeros = [];
      for (let t = -12; t <= 12; t += 1) if (still(t) === 0) zeros.push(t);
      expect(zeros.length, 'one moment moving that way').toBe(1);
      expect(slide.answer[1]).toBe(`$t = ${zeros[0]}$`);
      expect(same(pairOf(slide.answer[2]), [c.dx(zeros[0]), c.dy(zeros[0])])).toBe(true);
    }
    for (const { params, slide } of draws(g.paramSpeedPartsTree as Generator<MotionParams>)) {
      if (slide.kind !== 'tree') throw new Error('expected tree');
      const c = parametric(curveSources(params.curve).x, curveSources(params.curve).y);
      const t = tOf(slide);
      const [dx, dy, square, speed] = slide.answer.map(Number);
      expect(same([dx, dy], [c.dx(t), c.dy(t)])).toBe(true);
      expect(square).toBe(dx * dx + dy * dy);
      expect(speed * speed, 'a whole speed').toBe(square);
    }
    for (const { params, slide } of draws(g.paramSpeed as Generator<MotionParams>)) {
      const c = parametric(curveSources(params.curve).x, curveSources(params.curve).y);
      const t = tOf(slide);
      const speed = Math.hypot(c.dx(t), c.dy(t));
      expect(Number(typed(slide))).toBe(speed);
      expect(Number(correctAnswer(g.paramSpeed as Generator<MotionParams>, params))).toBe(speed);
    }
  });

  it('the slowest moment and the square of the speed agree with the rates', () => {
    const STEP = 1 / 64;
    for (const { params, slide } of draws(g.paramSlowestSlider as Generator<SlowParams>)) {
      if (slide.kind !== 'slider') throw new Error('expected slider');
      const c = parametric(curveSources(params.curve).x, curveSources(params.curve).y);
      const square = (t: number) => c.dx(t) ** 2 + c.dy(t) ** 2;
      let best = -12;
      for (let t = -12; t <= 12; t += STEP) if (square(t) < square(best)) best = t;
      expect(square(best - STEP) > square(best) && square(best + STEP) > square(best), 'a strict minimum').toBe(true);
      expect(slide.answer).toBe(slide.readout.startsWith('x') ? c.x(best) : c.y(best));
    }
    for (const { params, slide } of draws(g.paramSpeedSquaredTiles as Generator<SlowParams>)) {
      const c = parametric(curveSources(params.curve).x, curveSources(params.curve).y);
      const [A, B, C] = placed(slide);
      for (const t of T_SAMPLES) expect(close(A * t * t + B * t + C, c.dx(t) ** 2 + c.dy(t) ** 2), `t = ${t}`).toBe(true);
    }
  });

  it('crossings find the one time after t = 0 and the motion then', () => {
    /** The whole times from 1 to 20 at which the prompt's coordinate hits its target. */
    const timesOf = (params: CrossingParams, slide: Slide) => {
      const { x, y } = curveSources(crossingCurve(params));
      const c = parametric(x, y);
      const { pin, target } = reached(slide);
      const coordinate = pin === 'x' ? c.x : c.y;
      const times = [];
      for (let t = 1; t <= 20; t += 1) if (coordinate(t) === target) times.push(t);
      expect(times.length, 'one time after the start').toBe(1);
      return { c, t: times[0] };
    };
    for (const { params, slide } of draws(g.paramCrossingTree as Generator<CrossingParams>)) {
      if (slide.kind !== 'tree') throw new Error('expected tree');
      const { c, t } = timesOf(params, slide);
      expect(slide.answer.map(Number)).toEqual([t, c.dx(t), c.dy(t)]);
    }
    for (const { params, slide } of draws(g.paramReachTiles as Generator<CrossingParams>)) {
      const { c, t } = timesOf(params, slide);
      expect(same(placed(slide), [t, c.x(t), c.y(t)])).toBe(true);
    }
    for (const { params, slide } of draws(g.paramCrossingFlow as Generator<CrossingParams>)) {
      if (slide.kind !== 'flow') throw new Error('expected flow');
      const { c, t } = timesOf(params, slide);
      const { pin, target } = reached(slide);
      expect(slide.answer[0]).toBe(`Solve $${pin} = ${target}$`);
      expect(slide.answer[1]).toBe(`$t = ${t}$`);
      expect(same(pairOf(slide.answer[2]), [c.dx(t), c.dy(t)])).toBe(true);
    }
    for (const { params, slide } of draws(g.paramCrossingSpeed as Generator<CrossingParams>)) {
      const { c, t } = timesOf(params, slide);
      const speed = Math.hypot(c.dx(t), c.dy(t));
      expect(Number(typed(slide))).toBe(speed);
      expect(Number(correctAnswer(g.paramCrossingSpeed as Generator<CrossingParams>, params))).toBe(speed);
    }
  });
});

// Integration by Simpson's rule, several times per draw across twenty
// generators, so this block has a budget of its own rather than fewer seeds.
describe('area under a parametric curve, checked against mathjs', { timeout: 180_000 }, () => {
  /** Simpson's rule, independent of the generators' exact antiderivatives. */
  function simpson(f: (t: number) => number, a: number, b: number, n = 600): number {
    const h = (b - a) / n;
    let total = f(a) + f(b);
    for (let i = 1; i < n; i += 1) total += f(a + i * h) * (i % 2 === 1 ? 4 : 2);
    return (total * h) / 3;
  }

  /** Agreement to quadrature's accuracy. */
  const near = (a: number, b: number, tolerance = 1e-6) => Math.abs(a - b) < tolerance * Math.max(1, Math.abs(a), Math.abs(b));

  /**
   * A mathjs expression in t, compiled: quadrature evaluates each one
   * hundreds of times per draw, and walking the parse tree every time is
   * most of this block's cost.
   */
  const compiled = (node: { compile(): { evaluate(scope: Scope): unknown } }) => {
    const code = node.compile();
    return (t: number) => code.evaluate({ t }) as number;
  };

  /** x(t), y(t) and dx/dt from mathjs, and y dx/dt, for a curve given as mathjs sources. */
  const curveOf = ({ x, y }: { x: string; y: string }) => {
    const X = math.parse(x);
    const c = { x: compiled(X), y: compiled(math.parse(y)), dx: compiled(math.derivative(X, 't')) };
    return { c, f: (t: number) => c.y(t) * c.dx(t) };
  };

  const rateOf = (params: AreaParams) => curveOf(curveSources(params.curve));

  /** A polynomial in t written in TeX, as a function. */
  const inT = (tex: string) => compiled(math.parse(texToMath(tex)));

  /** Two functions of t agree at every sample. */
  const sameFn = (a: (t: number) => number, b: (t: number) => number) => T_SAMPLES.every((t) => near(a(t), b(t), 1e-9));

  /** `\int_{lo}^{hi} (p) \, dt`, with or without a minus in front, as its value. */
  function integralValue(tex: string): { sign: number; lo: number; hi: number; f: (t: number) => number; value: number } {
    const m = /^(-?)\\int_\{(-?\d+)\}\^\{(-?\d+)\} \((.+)\) \\, dt$/.exec(tex.replaceAll('$', ''));
    if (!m) throw new Error(`not an integral: ${tex}`);
    const [sign, lo, hi, f] = [m[1] === '-' ? -1 : 1, Number(m[2]), Number(m[3]), inT(m[4])];
    return { sign, lo, hi, f, value: sign * simpson(f, lo, hi) };
  }

  /** The sweep the prompt names: from t = lo to t = hi. */
  function sweepOf(slide: Slide): [number, number] {
    const m = /from \$(?:t = )?(-?\d+)\$ to \$(?:t = )?(-?\d+)\$/.exec(proseOf(slide));
    if (!m) throw new Error(`no sweep in ${proseOf(slide)}`);
    return [Number(m[1]), Number(m[2])];
  }

  /** The region the prompt names, between x = a and x = b, and the one t at each end. */
  function endsOf(params: AreaParams, slide: Slide) {
    const m = /between \$x = (-?\d+)\$ and \$x = (-?\d+)\$/.exec(proseOf(slide));
    if (!m) throw new Error(`no region in ${proseOf(slide)}`);
    const [a, b] = [Number(m[1]), Number(m[2])];
    const { c, f } = rateOf(params);
    const from = proseOf(slide).includes('t \\ge 0') ? 0 : -12;
    const at = (x: number) => {
      const ts = [];
      for (let t = from; t <= 12; t += 1) if (c.x(t) === x) ts.push(t);
      expect(ts.length, `one t where x = ${x}`).toBe(1);
      return ts[0];
    };
    const [ta, tb] = [at(a), at(b)];
    // The region is above the axis all the way along.
    for (let i = 1; i < 20; i += 1) expect(c.y(ta + ((tb - ta) * i) / 20)).toBeGreaterThan(0);
    const area = simpson(f, ta, tb);
    expect(area).toBeGreaterThan(0);
    return { a, b, ta, tb, area, f };
  }

  it('the integrand is y times dx/dt, however it is asked', () => {
    for (const { params, slide } of draws(g.paramAreaIntegrandTiles as Generator<AreaParams>)) {
      if (slide.kind !== 'tiles') throw new Error('expected tiles');
      const [p, q] = slide.answer.map(inT);
      expect(sameFn((t) => p(t) * q(t), rateOf(params).f), slide.answer.join(' x ')).toBe(true);
    }
    for (const { params, slide } of draws(g.paramAreaIntegrand as Generator<AreaParams>)) {
      const f = rateOf(params).f;
      expect(sameFn((t) => fn(typed(slide)).at({ t }), f)).toBe(true);
      expect(sameFn((t) => fn(correctAnswer(g.paramAreaIntegrand as Generator<AreaParams>, params)).at({ t }), f)).toBe(true);
    }
    for (const { params, slide } of draws(g.paramAreaDxFlow as Generator<AreaParams>)) {
      if (slide.kind !== 'flow') throw new Error('expected flow');
      const { c, f } = rateOf(params);
      expect(slide.answer[0]).toBe('$\\frac{dx}{dt} \\, dt$');
      expect(sameFn(inT(slide.answer[1]), c.dx)).toBe(true);
      const m = /^\$\\int \((.+)\) \\, dt\$$/.exec(slide.answer[2])!;
      expect(sameFn(inT(m[1]), f), slide.answer[2]).toBe(true);
    }
    for (const { params, slide } of draws(g.paramAreaSubstituteSteps as Generator<AreaParams>)) {
      const m = /^\\int \((.+)\) \\, dt$/.exec(lastValue(slide))!;
      expect(sameFn(inT(m[1]), rateOf(params).f), lastValue(slide)).toBe(true);
    }
  });

  it('the limits are the values of t at the left and right ends, however they are asked', () => {
    for (const { params, slide } of draws(g.paramAreaLimitsTiles as Generator<AreaParams>)) {
      const { ta, tb } = endsOf(params, slide);
      expect(same(placed(slide), [ta, tb])).toBe(true);
    }
    for (const { params, slide } of draws(g.paramAreaLimitsFlow as Generator<AreaParams>)) {
      if (slide.kind !== 'flow') throw new Error('expected flow');
      const { ta, tb } = endsOf(params, slide);
      expect(slide.answer).toEqual([`$t = ${ta}$`, `$t = ${tb}$`, `$\\int_{${ta}}^{${tb}}$`]);
    }
    for (const { params, slide } of draws(g.paramAreaLimitT as Generator<LimitParams>)) {
      if (slide.kind !== 'expression') throw new Error('expected expression');
      const { ta, tb } = endsOf(params, slide);
      const want = slide.lead === 't_2 =' ? tb : ta;
      expect(Number(typed(slide))).toBe(want);
      expect(Number(correctAnswer(g.paramAreaLimitT as Generator<LimitParams>, params))).toBe(want);
    }
    for (const { params, slide } of draws(g.paramAreaLimitsChoice as Generator<AreaParams>)) {
      if (slide.kind !== 'choice') throw new Error('expected choice');
      const { area } = endsOf(params, slide);
      for (const option of slide.options) {
        expect(near(integralValue(option.label).value, area), option.label).toBe(option.id === slide.correctId);
      }
    }
  });

  it('the area agrees with Simpson\'s rule, however it is worked', () => {
    for (const { params, slide } of draws(g.paramAreaTermsTiles as Generator<AreaParams>)) {
      if (slide.kind !== 'tiles') throw new Error('expected tiles');
      // The terms placed make an antiderivative: mathjs differentiates it back to y dx/dt.
      const anti = fn(texToMath(slide.answer.join(' '))).by('t');
      expect(sameFn((t) => anti.at({ t }), rateOf(params).f), slide.answer.join(' ')).toBe(true);
    }
    for (const generator of [g.paramArea, g.paramAreaValueTree, g.paramAreaWorkingSteps]) {
      for (const { params, slide } of draws(generator as Generator<AreaParams>)) {
        const [lo, hi] = sweepOf(slide);
        const { c, f } = rateOf(params as AreaParams);
        for (let i = 1; i < 20; i += 1) {
          const t = lo + ((hi - lo) * i) / 20;
          expect(c.y(t) > 0 && c.dx(t) >= 0, 'rightwards above the axis').toBe(true);
        }
        const area = simpson(f, lo, hi);
        if (slide.kind === 'expression') {
          expect(near(fn(typed(slide)).at({}), area)).toBe(true);
          expect(near(fn(correctAnswer(g.paramArea as Generator<AreaParams>, params as AreaParams)).at({}), area)).toBe(true);
        } else if (slide.kind === 'tree') {
          // An antiderivative with no constant is the integral from 0.
          const [top, bottom, value] = slide.answer.map((tex) => valueOfTex(tex));
          expect(near(top, simpson(f, 0, hi)) && near(bottom, simpson(f, 0, lo)), slide.answer.join(', ')).toBe(true);
          expect(near(value, area)).toBe(true);
        } else if (slide.kind === 'steps') {
          const [product, bracket, difference, value] = slide.reductions.map((r) => r.value);
          expect(sameFn(inT(product), f), product).toBe(true);
          const m = /^\\left\[(.+)\\right\]_\{(-?\d+)\}\^\{(-?\d+)\}$/.exec(bracket)!;
          expect([Number(m[2]), Number(m[3])]).toEqual([lo, hi]);
          const anti = inT(m[1]);
          expect(near(anti(hi) - anti(lo), area) && near(anti(0), 0), bracket).toBe(true);
          expect(near(valueOfTex(difference), area), difference).toBe(true);
          expect(near(valueOfTex(value), area), value).toBe(true);
        } else throw new Error(`unexpected ${slide.kind}`);
      }
    }
  });

  it('a region swept leftwards or below the axis gives a negative integral, and the area is its size', () => {
    for (const { params, slide } of draws(g.paramAreaSignFlow as Generator<AreaParams>)) {
      if (slide.kind !== 'flow') throw new Error('expected flow');
      const m = /^\\int_\{(-?\d+)\}\^\{(-?\d+)\} y \\frac\{dx\}\{dt\} \\, dt$/.exec(slide.subject)!;
      const [lo, hi] = [Number(m[1]), Number(m[2])];
      const { c, f } = rateOf(params);
      const inside = Array.from({ length: 19 }, (_, i) => lo + ((hi - lo) * (i + 1)) / 20);
      const rising = inside.every((t) => c.dx(t) >= 0);
      const above = inside.every((t) => c.y(t) > 0);
      expect(rising || inside.every((t) => c.dx(t) <= 0), 'x moves one way').toBe(true);
      expect(above || inside.every((t) => c.y(t) < 0), 'one side of the axis').toBe(true);
      expect(slide.answer).toEqual([
        rising ? 'Increases' : 'Decreases',
        above ? 'Above the $x$-axis' : 'Below the $x$-axis',
        simpson(f, lo, hi) > 0 ? 'Positive' : 'Negative',
      ]);
    }
    for (const generator of [g.paramAreaSize, g.paramAreaSignTree, g.paramAreaDirectionChoice]) {
      for (const { params, slide } of draws(generator as Generator<AreaParams>)) {
        const [lo, hi] = sweepOf(slide);
        const { f } = rateOf(params as AreaParams);
        const integral = simpson(f, lo, hi);
        expect(integral, 'a negative integral').toBeLessThan(0);
        if (slide.kind === 'expression') {
          expect(near(fn(typed(slide)).at({}), -integral)).toBe(true);
          expect(near(fn(correctAnswer(g.paramAreaSize as Generator<AreaParams>, params as AreaParams)).at({}), -integral)).toBe(true);
        } else if (slide.kind === 'tree') {
          const [top, bottom, value, area] = slide.answer.map((tex) => valueOfTex(tex));
          expect(near(top, simpson(f, 0, hi)) && near(bottom, simpson(f, 0, lo))).toBe(true);
          expect(near(value, integral) && near(area, -integral), slide.answer.join(', ')).toBe(true);
        } else if (slide.kind === 'choice') {
          for (const option of slide.options) {
            expect(near(integralValue(option.label).value, -integral), option.label).toBe(option.id === slide.correctId);
          }
        } else throw new Error(`unexpected ${slide.kind}`);
      }
    }
  });

  describe('trigonometric curves', () => {
    const ANGLE: Record<string, number> = { '0': 0, '\\frac{\\pi}{2}': Math.PI / 2, '-\\frac{\\pi}{2}': -Math.PI / 2, '\\pi': Math.PI };

    /** Trigonometric TeX as mathjs reads it: squares, double angles and pi. */
    const trigMath = (tex: string) =>
      texToMath(
        tex
          .replace(/\\(sin|cos)\^2 t/g, '$1(t)^2')
          .replace(/\\(sin|cos) 2t/g, '$1(2t)')
          .replace(/\\pi/g, 'pi'),
      );
    const trigFn = (tex: string) => compiled(math.parse(trigMath(tex)));

    /**
     * The area of the region, worked in x alone: the top half of the ellipse
     * is y = b sqrt(1 - x^2 / a^2). No t anywhere, so it checks the limits
     * and signs rather than agreeing with them.
     */
    function regionArea(params: TrigAreaParams, slide: Slide): number {
      const { a, b } = params;
      const quarter = proseOf(slide).includes(`between $x = 0$ and $x = ${a}$`);
      expect(quarter || proseOf(slide).includes('above the axis')).toBe(true);
      return simpson((x) => b * Math.sqrt(Math.max(0, 1 - (x / a) ** 2)), quarter ? 0 : -a, a, 20_000);
    }

    const piValue = (tex: string) => fn(trigMath(tex)).at({});

    it('the ellipse area agrees with the area worked in x, however it is asked', () => {
      for (const { params, slide } of draws(g.paramTrigAreaTiles as Generator<TrigAreaParams>)) {
        if (slide.kind !== 'tiles') throw new Error('expected tiles');
        const { c } = curveOf(trigAreaSources(params));
        const [k, square, left, right] = slide.answer;
        const integrand = (t: number) => Number(k) * trigFn(square)(t);
        expect(sameFn(integrand, (t) => c.y(t) * c.dx(t)), `${k} ${square}`).toBe(true);
        expect(near(simpson(integrand, ANGLE[left], ANGLE[right]), regionArea(params, slide), 1e-4), `${left} to ${right}`).toBe(true);
      }
      for (const { params, slide } of draws(g.paramTrigDoubleSteps as Generator<TrigAreaParams>)) {
        if (slide.kind !== 'steps') throw new Error('expected steps');
        const area = regionArea(params, slide);
        const lead = /^(-?\d*)\\int_\{(.+)\}\^\{(.+)\}$/.exec(slide.start[0])!;
        const k = lead[1] === '-' ? -1 : lead[1] === '' ? 1 : Number(lead[1]);
        const [left, right] = [ANGLE[lead[2]], ANGLE[lead[3]]];
        expect(near(simpson((t) => k * trigFn(slide.start[1])(t), left, right), area, 1e-4), slide.start.join(' ')).toBe(true);
        const [form, bracket, value] = slide.reductions.map((r) => r.value);
        expect(sameFn(trigFn(form), trigFn(slide.start[1])), form).toBe(true);
        const m = /^(-?\d*)\\left\[(.+)\\right\]_\{(.+)\}\^\{(.+)\}$/.exec(bracket)!;
        const inside = trigFn(m[2]);
        expect(near(k * (inside(ANGLE[m[4]]) - inside(ANGLE[m[3]])), area, 1e-4), bracket).toBe(true);
        expect(near(piValue(value), area, 1e-4), value).toBe(true);
      }
      for (const { params, slide } of draws(g.paramTrigArea as Generator<TrigAreaParams>)) {
        const area = regionArea(params, slide);
        expect(near(fn(typed(slide)).at({}) * Math.PI, area, 1e-4)).toBe(true);
        expect(near(fn(correctAnswer(g.paramTrigArea as Generator<TrigAreaParams>, params)).at({}) * Math.PI, area, 1e-4)).toBe(true);
      }
      for (const { params, slide } of draws(g.paramTrigAreaFlow as Generator<TrigAreaParams>)) {
        if (slide.kind !== 'flow') throw new Error('expected flow');
        const { c } = curveOf(trigAreaSources(params));
        const [rate, limits, form] = slide.answer.map((label) => label.replaceAll('$', ''));
        expect(sameFn(trigFn(rate), c.dx), rate).toBe(true);
        const m = /^From t = (.+) to t = (.+)$/.exec(limits)!;
        expect(near(simpson((t) => c.y(t) * c.dx(t), ANGLE[m[1]], ANGLE[m[2]]), regionArea(params, slide), 1e-4), limits).toBe(true);
        // The form is the square in y dx/dt: their ratio is the same everywhere.
        const ratio = T_SAMPLES.map((t) => (c.y(t) * c.dx(t)) / trigFn(form)(t));
        expect(ratio.every((r) => near(r, ratio[0], 1e-9)), form).toBe(true);
      }
    });
  });
});
