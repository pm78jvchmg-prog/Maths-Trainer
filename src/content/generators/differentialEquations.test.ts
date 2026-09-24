/**
 * An independent check on the mathematics behind Differential Equations.
 *
 * The oracle in `generators.test.ts` differentiates a `source` in x only, and
 * nothing in this course is a plain derivative in x: a solution is a function
 * of t that has to satisfy an equation in t and itself. So here mathjs
 * differentiates each solution and the test checks it satisfies its
 * equation, meets its condition, and gives the number the slide asks for —
 * the value typed, the tile placed, the option marked correct — at every seed
 * and both difficulties. Where a slide's answer is a form rather than a
 * value, the form is turned back into mathjs and checked the same way.
 */
import { describe, expect, it, vi } from 'vitest';
import { makeRng } from '../../engine/rng';
import { checkAnswer } from '../../engine/equivalence';
import { math } from '../../engine/expression';
import type { Generator, Slide } from '../types';
import {
  IMPLICIT,
  Y_INTEGRAL,
  Y_PART,
  bigFAnswer,
  candidates,
  chosen,
  conicPoints,
  constantAnswer,
  coolReadings,
  deGenerators as g,
  exponentAnswer,
  expSolutionAnswer,
  fAnswer,
  generalRhsAnswer,
  growthK,
  growthSolutionAnswer,
  isStable,
  limitSolutionAnswer,
  lnAnswer,
  longRhsAnswer,
  longTex,
  matchOptions,
  outTex,
  sepIntegrand,
  sepRhsAnswer,
  signOfK,
  tankLimit,
  verifyDeAnswer,
  verifyNumbers,
  whichOptions,
  factorAnswer,
  factorDeTex,
  factorOfAnswer,
  factorPAnswer,
  generalAnswer,
  linearTex,
  qAnswer,
  yAt,
  type FactorParams,
  type PartParams,
  type RepCheckParams,
  type RootParams,
  type SecondDe,
  type SecondIvp,
  type WhichSecond,
  type DampGraphParams,
  type LeastKParams,
  type PeriodParams,
  type PhaseParams,
  type ReleaseParams,
  type SpeedParams,
  type WaveParams,
  type WhichDampParams,
  type LinearDe,
  type NonHomDe,
  type NonHomIvp,
  type ParticularDe,
  type ProductParams,
  type ConstantParams,
  type CoolFitParams,
  type CoolParams,
  type CoolValueParams,
  type ExpModelParams,
  type FormParams,
  type GeneralParams,
  type GrowthParams,
  type ImplicitParams,
  type LimitParams,
  type LimitSliderParams,
  type LongParams,
  type LongSliderParams,
  type ParticularStepsParams,
  type RateParams,
  type SepIntegrateParams,
  type SepParams,
  type SignParams,
  type TankNowParams,
  type TankParams,
  type TankWhenParams,
  type ValueParams,
  type VerifyParams,
  type WhichParams,
} from './differentialEquations';

const SEEDS = 200;

// Symbolic differentiation across 400 draws a family overruns vitest's 5s default
// once other files compete for the CPU, as the oracle in generators.test.ts does.
vi.setConfig({ testTimeout: 60_000 });

function draws<P>(generator: Generator<P>): { params: P; slide: Slide; seed: number }[] {
  return [1, 2].flatMap((difficulty) =>
    Array.from({ length: SEEDS }, (_, seed) => {
      const params = generator.sample(makeRng(seed), difficulty);
      return { params, slide: generator.render(params), seed };
    }),
  );
}

type Scope = Record<string, number>;

/** Compiled expressions and derivatives, cached: symbolic differentiation is the slow part. */
const compiled = new Map<string, { evaluate: (scope: Scope) => unknown }>();

function compile(source: string, variable?: string) {
  const key = `${variable ?? ''}|${source}`;
  let hit = compiled.get(key);
  if (!hit) {
    hit = variable ? math.derivative(source, variable).compile() : math.compile(source);
    compiled.set(key, hit);
  }
  return hit;
}

const evalAt = (source: string, scope: Scope): number => compile(source).evaluate({ ...scope }) as number;

const derivativeAt = (source: string, variable: string, scope: Scope): number =>
  compile(source, variable).evaluate({ ...scope }) as number;

const close = (a: number, b: number) => Math.abs(a - b) < 1e-7 * Math.max(1, Math.abs(a), Math.abs(b));

/** Points to probe a solution at. */
const TIMES = [-0.7, 0.3, 1.1, 2.4];

/**
 * A solution y(t) satisfies dy/dt = rhs(t, y) at every probe: mathjs
 * differentiates the solution, and the right-hand side is evaluated with y
 * set to the solution's value there.
 */
function satisfies(solution: string, rhs: string, variable = 't', extra: Scope = {}): boolean {
  return TIMES.every((at) => {
    const scope = { ...extra, [variable]: at };
    const y = evalAt(solution, scope);
    return close(derivativeAt(solution, variable, scope), evalAt(rhs, { ...scope, y }));
  });
}

const typed = (slide: Slide): string => {
  if (slide.kind !== 'expression') throw new Error(`expected an expression slide, got ${slide.kind}`);
  return slide.answer;
};

const correctLabel = (slide: Slide): string => {
  if (slide.kind !== 'choice') throw new Error(`expected a choice slide, got ${slide.kind}`);
  return slide.options.find((option) => option.id === slide.correctId)!.label;
};

const answerOf = (slide: Slide): string[] => {
  if (slide.kind === 'tiles' || slide.kind === 'tree' || slide.kind === 'flow') return slide.answer;
  throw new Error(`expected tiles, a tree or a flow, got ${slide.kind}`);
};

const lastStep = (slide: Slide): string => {
  if (slide.kind !== 'steps') throw new Error(`expected a steps slide, got ${slide.kind}`);
  return slide.reductions[slide.reductions.length - 1].value;
};

const proseOf = (slide: Slide): string =>
  slide.kind === 'teach'
    ? ''
    : slide.prompt.map((block) => (block.kind === 'prose' ? block.text : block.kind === 'display' ? block.tex : '')).join(' ');

/**
 * A simple piece of TeX as mathjs: `\frac{a}{b}` to `(a)/(b)`, `\sqrt{x}` to
 * `sqrt(x)`, braces to brackets. Enough for the forms these tiles place.
 */
function texToMath(tex: string): string {
  let out = tex
    .replace(/\\(sin|cos) ([a-z])/g, '$1($2)')
    .replace(/\\ln ?/g, 'log')
    .replace(/\\,/g, ' ')
    .replace(/\\theta/g, 'theta');
  for (let i = 0; i < 4; i += 1) {
    out = out
      .replace(/\^\{([^{}]*)\}/g, '^($1)')
      .replace(/\\frac\{([^{}]*)\}\{([^{}]*)\}/g, '(($1)/($2))')
      .replace(/\\sqrt\{([^{}]*)\}/g, 'sqrt($1)');
  }
  return out.replace(/\{/g, '(').replace(/\}/g, ')');
}

describe('forming an equation', () => {
  it('places a sign and a form that make the rate move the stated way', () => {
    for (const { params, slide } of draws(g.deFormTiles as Generator<FormParams>)) {
      if (slide.kind !== 'tiles') throw new Error('expected tiles');
      const sym = /\\frac\{d(\w)\}/.exec(slide.template)![1];
      const [sign, form] = answerOf(slide);
      // The quantity renamed q, so a letter inside sqrt cannot be caught by the renaming.
      const asMath = texToMath(form === `${sym}t` ? `${sym} t` : form)
        .split(/\b/)
        .map((part) => (part === sym ? 'q' : part))
        .join('')
        .replace(/q t/, 'q*t');
      const rateAt = evalAt(`${sign.replace('k', '2')} * (${asMath})`, { q: 3, t: 2 });
      expect(Math.sign(rateAt)).toBe(params.down ? -1 : 1);
    }
  });

  it('marks the sign of k that moves the quantity the stated way', () => {
    for (const { params, slide } of draws(g.deFormSign as Generator<SignParams>)) {
      const k = signOfK(params);
      expect(correctLabel(slide)).toBe(k > 0 ? 'k > 0' : 'k < 0');
      if (params.form !== 'gap') continue;
      // Take k of that sign and a start just off the level: y must move the way the prompt says.
      const y0 = params.level + (params.above ? 1 : -1);
      const bracket = params.flipped ? params.level - y0 : y0 - params.level;
      const moving = Math.sign(k * bracket);
      const towards = Math.sign(params.level - y0);
      expect(moving).toBe(params.towards ? towards : -towards);
    }
  });

  it('reads the rate off the equation', () => {
    for (const { params, slide } of draws(g.deFormRate as Generator<RateParams>)) {
      const { form, top, bottom, sign, value } = params;
      const f = { self: value, root: Math.sqrt(value), square: value * value, inverse: 1 / value }[form];
      const c = form === 'root' || form === 'inverse' ? top : top / bottom;
      expect(close(Number(typed(slide)), sign * c * f)).toBe(true);
    }
  });
});

describe('separating the variables', () => {
  const X = [0.4, 1.3, 2.2];
  const Y = [0.6, 1.7, 2.9];

  it('puts a y factor with dy and an x factor with dx whose product is the right-hand side', () => {
    for (const { params, slide } of draws(g.deSepTiles as Generator<SepParams>)) {
      const [yPart, xPart] = answerOf(slide).map(texToMath);
      const rhs = sepRhsAnswer(params.f, params.g);
      for (const x of X) {
        for (const y of Y) {
          // dy/dx = rhs separates as yPart dy = xPart dx exactly when xPart / yPart = rhs.
          const product = evalAt(`(${xPart}) / (${yPart.replace(/\bx\b/g, 'X')})`, { x, y, X: x });
          expect(close(product, evalAt(rhs, { x, y }))).toBe(true);
        }
      }
    }
  });

  it('offers exactly one odd one out, and it is separable exactly when the question asks for that', () => {
    const products = (source: string) => {
      // A function of x times a function of y has f(a, c) f(b, d) = f(a, d) f(b, c).
      const f = (x: number, y: number) => evalAt(source, { x, y });
      return [
        [0.7, 1.9, 0.4, 2.3],
        [1.3, 2.7, 1.1, 0.6],
      ].every(([a, b, c, d]) => close(f(a, c) * f(b, d), f(a, d) * f(b, c)));
    };
    for (const { params, slide } of draws(g.deSepWhich as Generator<WhichParams>)) {
      const opts = whichOptions(params);
      for (const opt of opts) expect(products(opt.answer), opt.answer).toBe(opt.separable);
      expect(opts[0].separable).toBe(params.can);
      expect(opts.slice(1).every((opt) => opt.separable !== params.can)).toBe(true);
      expect(correctLabel(slide)).toContain(opts[0].tex);
    }
  });

  it('integrates the side it asks for', () => {
    for (const { params, slide, seed } of draws(g.deSepIntegrate as Generator<SepIntegrateParams>)) {
      const { variable, integrand } = sepIntegrand(params);
      const answer = typed(slide);
      for (const at of [0.5, 1.2, 2.6]) {
        expect(close(derivativeAt(answer, variable, { [variable]: at }), evalAt(integrand, { [variable]: at }))).toBe(true);
      }
      // And the integrand is the right one: the y factor is 1/g(y), the x factor is f.
      if (variable === 'y') {
        expect(close(evalAt(`(${integrand}) * (${sepRhsAnswer(params.f, params.g)})`, { x: 1.3, y: 0.7 }), evalAt(fAnswer(params.f), { x: 1.3 }))).toBe(true);
      }
      expect(checkAnswer(`${answer} + C`, answer, { mode: 'upToConstant', seed }).status).toBe('correct');
    }
  });

  it('integrates each factor correctly in the table the steps are built from', () => {
    for (const { params } of draws(g.deSepSteps as Generator<SepParams>)) {
      const { f, g: gy } = params;
      for (const x of X) expect(close(derivativeAt(bigFAnswer(f), 'x', { x }), evalAt(fAnswer(f), { x }))).toBe(true);
      const integral = Y_INTEGRAL[gy].answer;
      if (integral) for (const y of Y) expect(close(derivativeAt(integral, 'y', { y }), evalAt(Y_PART[gy].answer, { y }))).toBe(true);
    }
  });
});

describe('general solutions', () => {
  it('builds y = Ae^(...) that satisfies the equation for any A', () => {
    for (const { params, slide } of draws(g.deGeneralTiles as Generator<GeneralParams>)) {
      const [A, exp] = answerOf(slide);
      expect(A).toBe('A');
      const solution = `A * ${texToMath(exp)}`;
      expect(satisfies(solution, generalRhsAnswer(params.rhs), 't', { A: 3.7 })).toBe(true);
      expect(satisfies(`A * e^(${exponentAnswer(params.rhs)})`, generalRhsAnswer(params.rhs), 't', { A: -1.4 })).toBe(true);
    }
  });

  it('integrates each side of the separated power equation', () => {
    for (const { params, slide } of draws(g.deGeneralTree)) {
      const [yp, yc, xp, xc] = answerOf(slide).map(Number);
      const { m, n, alpha, beta } = params as { m: number; n: number; alpha: number; beta: number };
      expect(close(derivativeAt(`${yc} * y^${yp}`, 'y', { y: 1.7 }), beta * (m + 1) * 1.7 ** m)).toBe(true);
      expect(close(derivativeAt(`${xc} * x^${xp}`, 'x', { x: 1.3 }), alpha * (n + 1) * 1.3 ** n)).toBe(true);
    }
  });

  it('writes a power of y whose derivative matches the equation, by implicit differentiation', () => {
    for (const { params, slide } of draws(g.deGeneralImplicit as Generator<ImplicitParams>)) {
      const { lhs, g: gy } = IMPLICIT[params.form];
      const answer = typed(slide);
      for (const [x, y] of [
        [0.4, 1.3],
        [1.6, 0.8],
        [2.3, 2.1],
      ]) {
        // d/dx L(y) = L'(y) dy/dx, with dy/dx from the equation.
        const along = derivativeAt(lhs, 'y', { y }) * evalAt(sepRhsAnswer(params.f, gy), { x, y });
        expect(close(derivativeAt(answer, 'x', { x }), along)).toBe(true);
      }
    }
  });
});

describe('particular solutions', () => {
  /** Every `sym(t) = value` stated in a prompt. */
  const conditions = (text: string): [number, number][] =>
    [...text.matchAll(/[A-Za-z]\((-?\d+)\) = (-?\d+)/g)].map((m) => [Number(m[1]), Number(m[2])]);

  it('meets its condition and gives the value asked for', () => {
    for (const { params, slide } of draws(g.deParticularValue as Generator<ValueParams>)) {
      const answer = Number(typed(slide));
      if (params.form === 'exp') {
        const solution = expSolutionAnswer(params);
        expect(satisfies(solution, `${lnAnswer(params.k)} * y`)).toBe(true);
        const [[t1, y1]] = conditions(proseOf(slide));
        expect(close(evalAt(solution, { t: t1 }), y1)).toBe(true);
        expect(close(evalAt(solution, { t: params.to * params.k.h }), answer)).toBe(true);
      } else {
        const [x1, y1, x2] = conicPoints(params);
        // The curve through the condition is a level set of F, and dy/dx = -F_x / F_y is the equation asked.
        const F = params.form === 'hyperbola' ? 'y^2 - x^2' : 'x^2 + y^2';
        const rhs = params.form === 'hyperbola' ? 'x / y' : '-x / y';
        for (const [x, y] of [
          [0.5, 1.5],
          [1.2, 2.2],
        ]) {
          const slope = -derivativeAt(F, 'x', { x, y }) / derivativeAt(F, 'y', { x, y });
          expect(close(slope, evalAt(rhs, { x, y }))).toBe(true);
        }
        expect(evalAt(F, { x: x1, y: y1 })).toBe(evalAt(F, { x: x2, y: answer }));
        expect(answer).toBeGreaterThan(0);
      }
    }
  });

  it('finds A and the later value through the tree', () => {
    for (const { params, slide } of draws(g.deParticularTree as Generator<ExpModelParams>)) {
      const values = answerOf(slide).map(Number);
      const solution = expSolutionAnswer(params);
      expect(satisfies(solution, `${lnAnswer(params.k)} * y`)).toBe(true);
      const A = params.at === 0 ? values[0] : values[1];
      expect(close(evalAt(solution, { t: 0 }), A)).toBe(true);
      expect(close(evalAt(solution, { t: params.to * params.k.h }), values[values.length - 1])).toBe(true);
      const [[t1, y1]] = conditions(proseOf(slide));
      expect(close(evalAt(solution, { t: t1 }), y1)).toBe(true);
    }
  });

  it('slides to the A whose solution passes through the marked point', () => {
    for (const { params, slide } of draws(g.deParticularSlider as Generator<ExpModelParams>)) {
      if (slide.kind !== 'slider') throw new Error('expected a slider');
      const [t1, y1] = [...proseOf(slide).matchAll(/\((\d+), (\d+)\)/g)].map((m) => [Number(m[1]), Number(m[2])])[0];
      const through = `${slide.answer} * e^(${lnAnswer(params.k)} * t)`;
      expect(close(evalAt(through, { t: t1 }), y1)).toBe(true);
    }
  });

  it('writes a particular solution that meets its condition', () => {
    for (const { params, slide } of draws(g.deParticularSteps as Generator<ParticularStepsParams>)) {
      const line = texToMath(lastStep(slide)).replace(/e\^/g, 'e^');
      if (params.form === 'poly') {
        const rhs = line.replace('y^(2) = ', '').replace(/(\d)x/g, '$1*x');
        expect(close(evalAt(rhs, { x: params.x1 }), params.y1 ** 2)).toBe(true);
      } else {
        const rhs = line.replace('y = ', '').replace(/(\d)e/g, '$1*e').replace(/(\d)t/g, '$1*t');
        const t0 = params.form === 'exp' ? params.t1 : 0;
        const expected = params.form === 'exp' ? params.a * Math.exp(params.k * t0) : params.y0;
        expect(close(evalAt(rhs, { t: t0 }), expected)).toBe(true);
        const k = params.k;
        expect(satisfies(rhs, params.form === 'exp' ? `${k} * y` : `-${k} * (y - ${params.L})`)).toBe(true);
      }
    }
  });
});

describe('growth and decay', () => {
  it('types a solution of the equation with the right start', () => {
    for (const { params, slide, seed } of draws(g.deGrowthSolution as Generator<GrowthParams & { words: boolean }>)) {
      const solution = growthSolutionAnswer(params);
      expect(satisfies(solution, `${growthK(params)} * y`)).toBe(true);
      expect(close(evalAt(solution, { t: 0 }), params.A)).toBe(true);
      expect(checkAnswer(solution, typed(slide), { seed }).status).toBe('correct');
    }
  });

  it('marks the one equation and start the solution satisfies', () => {
    for (const { params, slide } of draws(g.deGrowthMatch as Generator<GrowthParams>)) {
      const solution = growthSolutionAnswer(params);
      const fits = matchOptions(params).filter(
        (opt) => satisfies(solution, opt.rhs) && close(evalAt(solution, { t: 0 }), opt.start),
      );
      expect(fits.length).toBe(1);
      expect(correctLabel(slide)).toBe(fits[0].tex);
    }
  });

  it('ends the steps on the solution', () => {
    for (const { params, slide } of draws(g.deGrowthSteps as Generator<GrowthParams>)) {
      const rhs = texToMath(lastStep(slide)).replace(/^[A-Z] = /, '').replace(/(\d)e/g, '$1*e').replace(/([\d.])t/g, '$1*t');
      expect(satisfies(rhs, `${growthK(params)} * y`)).toBe(true);
      expect(close(evalAt(rhs, { t: 0 }), params.A)).toBe(true);
    }
  });
});

describe("Newton's law of cooling", () => {
  const coolRhs = (room: number) => `-k * (y - (${room}))`;

  it('builds an equation that pulls the temperature towards its surroundings', () => {
    for (const { params, slide } of draws(g.deCoolTiles as Generator<CoolParams>)) {
      const [sign, shift] = answerOf(slide);
      const rhs = `${sign.replace('k', '(0.3)')} * (T ${shift})`;
      // Positive k: the rate has the sign of room - T, both above and below the room.
      for (const T of [params.room - 5, params.room + 5]) {
        expect(Math.sign(evalAt(rhs, { T }))).toBe(Math.sign(params.room - T));
      }
    }
  });

  it('solves to a temperature that meets the equation and the start', () => {
    for (const { params, slide } of draws(g.deCoolSteps as Generator<CoolParams>)) {
      const rhs = texToMath(lastStep(slide)).replace(/^(T|theta) = /, '').replace(/e\^\(-kt\)/, 'e^(-k*t)');
      expect(satisfies(rhs, coolRhs(params.room), 't', { k: 0.37 })).toBe(true);
      expect(close(evalAt(rhs, { t: 0, k: 0.37 }), params.start)).toBe(true);
    }
  });

  it('finds k from the two readings', () => {
    for (const { params, slide } of draws(g.deCoolTree as Generator<CoolFitParams>)) {
      const [T0, T1] = coolReadings(params);
      const answer = answerOf(slide);
      const k = evalAt(texToMath(answer[3]).replace('\\ln ', 'log').replace(/log(\d+)/, 'log($1)'), {});
      // T - room = B e^(-kt) through both readings.
      expect(close(Math.log((T0 - params.room) / (T1 - params.room)) / params.h, k)).toBe(true);
      expect(Number(answer[0])).toBe(Math.abs(T0 - params.room));
      expect(Number(answer[1])).toBe(Math.abs(T1 - params.room));
    }
  });

  it('gives the temperature at the time asked', () => {
    for (const { params, slide } of draws(g.deCoolValue as Generator<CoolValueParams>)) {
      const solution = `${params.room} + (${params.start - params.room}) * e^(${lnAnswer(params.k)} * t)`;
      expect(satisfies(solution, `${lnAnswer(params.k)} * (y - (${params.room}))`)).toBe(true);
      expect(close(evalAt(solution, { t: 0 }), params.start)).toBe(true);
      expect(close(evalAt(solution, { t: params.m * params.k.h }), Number(typed(slide)))).toBe(true);
    }
  });
});

describe('growth towards a limit', () => {
  it('builds k times what is left', () => {
    for (const { params, slide } of draws(g.deLimitTiles)) {
      const { L, start } = params as LimitParams;
      if (slide.kind !== 'tiles') throw new Error('expected tiles');
      const sym = /\\frac\{d(\w)\}/.exec(slide.template)![1];
      const [sign, level, letter] = answerOf(slide);
      if (letter !== undefined) expect(letter).toBe(sym);
      const at = (P: number) => evalAt(`${sign.replace('k', '0.2')} * (${level} - P)`, { P });
      expect(close(at(L), 0)).toBe(true);
      expect(at(start)).toBeGreaterThan(0);
    }
  });

  it('solves to a curve that meets the equation and the start', () => {
    for (const { params, slide } of draws(g.deLimitSteps as Generator<LimitParams>)) {
      const k = params.top / params.bottom;
      const solution = limitSolutionAnswer(params);
      expect(satisfies(solution, `${k} * (${params.L} - y)`)).toBe(true);
      expect(close(evalAt(solution, { t: 0 }), params.start)).toBe(true);
      const shown = texToMath(lastStep(slide)).replace(/^[A-Za-z] = /, '').replace(/(\d)e/g, '$1*e').replace(/([\d.])t/g, '$1*t');
      expect(close(evalAt(shown, { t: 1.3 }), evalAt(solution, { t: 1.3 }))).toBe(true);
    }
  });

  it('slides to the value of the solution at the dashed line', () => {
    for (const { params, slide } of draws(g.deLimitSlider as Generator<LimitSliderParams>)) {
      if (slide.kind !== 'slider') throw new Error('expected a slider');
      const start = Number(/P\(0\) = (\d+)/.exec(proseOf(slide))![1]);
      const solution = `${params.L} + (${start - params.L}) * e^(-log(2) / ${params.h} * t)`;
      expect(satisfies(solution, `log(2) / ${params.h} * (${params.L} - y)`)).toBe(true);
      expect(close(evalAt(solution, { t: params.m * params.h }), slide.answer)).toBe(true);
    }
  });

  it('walks to the level the equation settles at', () => {
    for (const { params, slide } of draws(g.deLimitFlow)) {
      const { L, start } = params as LimitParams;
      if (slide.kind !== 'flow') throw new Error('expected a flow');
      const rhs = texToMath(slide.subject.replace(/^.*= /, '')).replace(/(\d)P/g, '$1*P').replace(/(\d)\(/g, '$1*(');
      expect(close(evalAt(rhs, { P: L }), 0)).toBe(true);
      const rising = evalAt(rhs, { P: start }) > 0;
      expect(slide.answer).toContain(rising ? 'Positive' : 'Negative');
    }
  });
});

describe('mixing tanks', () => {
  /** Rate in minus rate out, straight from the story's numbers. */
  const net = ({ V, r, c, fresh }: TankParams, S: number) => r * c - ((r + fresh) * S) / V;

  it('builds rate in minus rate out', () => {
    for (const { params, slide } of draws(g.deMixTiles as Generator<TankParams>)) {
      const [inTok, outTok] = answerOf(slide).map((tok) => texToMath(tok).replace(/(\d)S/g, '$1*S'));
      for (const S of [0, 37, 250]) expect(close(evalAt(`${inTok} - (${outTok})`, { S }), net(params, S))).toBe(true);
    }
  });

  it('settles where the rates balance', () => {
    for (const { params, slide } of draws(g.deMixLimit as Generator<TankParams>)) {
      const limit = Number(correctLabel(slide).replace('\\text{ g}', ''));
      expect(close(net(params, limit), 0)).toBe(true);
      expect(limit).toBe(tankLimit(params));
      expect(outTex(params)).toContain('S');
    }
  });

  it('fills in the rates at the moment given', () => {
    for (const { params, slide } of draws(g.deMixTree as Generator<TankNowParams>)) {
      const values = answerOf(slide).map(Number);
      expect(values[3]).toBe(net(params, params.q * params.V));
      expect(values[0] - values[2]).toBe(values[3]);
    }
  });

  it('finds the amount at which the rate is as stated', () => {
    for (const { params, slide } of draws(g.deMixWhen as Generator<TankWhenParams>)) {
      const m = /(rising|falling) at (\d+) g/.exec(proseOf(slide))!;
      const stated = (m[1] === 'rising' ? 1 : -1) * Number(m[2]);
      expect(close(net(params, Number(typed(slide))), stated)).toBe(true);
    }
  });
});

describe('long-term behaviour', () => {
  /** The displayed right-hand side as mathjs. */
  const shown = (params: LongParams) =>
    texToMath(longTex(params).replace(/^.*= /, ''))
      .replace(/(\d)y/g, '$1*y')
      .replace(/(\d)\(/g, '$1*(');

  it('has its equilibrium where the displayed equation says, and is stable when it pulls back', () => {
    for (const { params, slide } of draws(g.deLongEquilibrium as Generator<LongParams>)) {
      const rhs = shown(params);
      expect(close(evalAt(rhs, { y: params.L }), 0)).toBe(true);
      expect(close(evalAt(rhs, { y: 3.3 }), evalAt(longRhsAnswer(params), { y: 3.3 }))).toBe(true);
      const slope = derivativeAt(rhs, 'y', { y: params.L });
      expect(slope < 0).toBe(isStable(params));
      const label = correctLabel(slide);
      if (isStable(params)) expect(label).toBe(`y \\to ${params.L}`);
      else expect(label).toBe(params.y0 > params.L ? 'It grows without limit' : 'It falls without limit');
    }
  });

  it('slides to the root of the displayed equation', () => {
    for (const { params, slide } of draws(g.deLongSlider as Generator<LongSliderParams>)) {
      if (slide.kind !== 'slider') throw new Error('expected a slider');
      const k = params.top / params.bottom;
      const tex = proseOf(slide);
      const moved = /\+ ([\d.]*)y = (\d+)/.exec(tex);
      const zero = moved ? Number(moved[2]) / k : evalAt(shown(params), { y: 0 }) / k;
      expect(close(zero, slide.answer)).toBe(true);
    }
  });

  it('walks to the right verdict', () => {
    for (const { params, slide } of draws(g.deLongFlow as Generator<LongParams>)) {
      if (slide.kind !== 'flow') throw new Error('expected a flow');
      const slope = derivativeAt(shown(params), 'y', { y: params.L });
      expect(slide.answer[2].startsWith(slope < 0 ? 'Stable' : 'Unstable')).toBe(true);
    }
  });
});

describe('checking a solution', () => {
  /** Whether y(x) satisfies the family's equation, by mathjs's own derivative. */
  const solves = (params: VerifyParams, y: string) => {
    const { lhs, rhs } = verifyDeAnswer(params);
    return [0.4, 1.3, 2.1].every((x) => {
      const scope = { x, y: evalAt(y, { x }), dy: derivativeAt(y, 'x', { x }) };
      return close(evalAt(lhs, scope), evalAt(rhs, scope));
    });
  };

  it('flags exactly the candidate that solves the equation', () => {
    for (const { params, slide } of draws(g.deVerifyWhich as Generator<VerifyParams>)) {
      const all = candidates(params);
      for (const cand of all) expect(solves(params, cand.answer), cand.answer).toBe(cand.good);
      expect(correctLabel(slide)).toBe(all.find((cand) => cand.good)!.tex);
    }
  });

  it('ends the substitution on the right verdict', () => {
    for (const { params, slide } of draws(g.deVerifySteps as Generator<VerifyParams>)) {
      const cand = chosen(params);
      expect(lastStep(slide)).toBe(solves(params, cand.answer) ? '\\text{a solution}' : '\\text{not a solution}');
    }
  });

  it('fills the tree with the candidate at one point', () => {
    for (const { params } of draws(g.deVerifyTree as Generator<VerifyParams>)) {
      const cand = chosen(params);
      const [y, dy] = verifyNumbers(params);
      expect(close(evalAt(cand.answer, { x: params.x0 }), y)).toBe(true);
      expect(close(derivativeAt(cand.answer, 'x', { x: params.x0 }), dy)).toBe(true);
    }
  });

  it('finds the constant that makes the candidate a solution', () => {
    for (const { params, slide } of draws(g.deVerifyConstant as Generator<ConstantParams>)) {
      const value = Number(typed(slide));
      expect(value).toBe(constantAnswer(params));
      const [y, lhs, rhs] =
        params.type === 'shift'
          ? [`${params.A} * e^(${params.k} * x) + ${value}`, 'dy', `${params.k} * y - ${params.k * params.c}`]
          : params.type === 'power'
            ? [`${params.A} * x^${value}`, 'x * dy', `${params.n} * y`]
            : [`${value} * x + ${value}`, 'dy', `y + ${params.a} * x`];
      for (const x of [0.4, 1.3, 2.1]) {
        const scope = { x, y: evalAt(y, { x }), dy: derivativeAt(y, 'x', { x }) };
        expect(close(evalAt(lhs, scope), evalAt(rhs, scope))).toBe(true);
      }
    }
  });
});

describe('the integrating factor', () => {
  /** Positive probes: the power equations are solved for x > 0. */
  const XS = [0.4, 1.3, 2.1, 2.9];

  /** A piece of TeX from these slides as mathjs, with dy/dx as `D` and the products spelled out. */
  const toMath = (tex: string): string =>
    texToMath(tex.replace(/\\frac\{dy\}\{dx\}/g, ' D ').replace(/\\ln x/g, '\\ln(x)'))
      .replace(/(\d)\s*([a-zA-Z(])/g, '$1*$2')
      .replace(/\by(?=e\^)/g, 'y*')
      .replace(/\bxy\b/g, 'x*y')
      .replace(/C(?=[ex])/g, 'C*')
      .replace(/([\w)])\s+D\b/g, '$1 * D');

  const stripDollars = (label: string): string => label.replace(/^\$|\$$/g, '');

  /** Whether y = Y(x) satisfies an equation shown as TeX, at every probe. */
  function holds(equation: string, Y: string, scope: Scope = {}): boolean {
    const [lhs, rhs] = equation.split('=').map(toMath);
    return XS.every((x) => {
      const at = { ...scope, x, y: evalAt(Y, { ...scope, x }), D: derivativeAt(Y, 'x', { ...scope, x }) };
      return close(evalAt(lhs, at), evalAt(rhs, at));
    });
  }

  /** Whether two expressions in x (and C) agree at every probe. */
  const same = (a: string, b: string, scope: Scope = {}): boolean =>
    XS.every((x) => close(evalAt(a, { ...scope, x }), evalAt(b, { ...scope, x })));

  /** Whether I' = P I at every probe. */
  const factorWorks = (I: string, P: string): boolean =>
    XS.every((x) => close(derivativeAt(I, 'x', { x }), evalAt(P, { x }) * evalAt(I, { x })));

  /** P read off a shown equation: the y term's coefficient over dy/dx's. */
  function pFromShown(equation: string): string {
    const [lhs, rhs] = equation.split('=').map(toMath);
    // Everything moved to the left: a D + b y - Q, and P = b / a.
    const side = `(${lhs}) - (${rhs})`;
    const at = (D: number, y: number) => side.replace(/\bD\b/g, `(${D})`).replace(/\by\b/g, `(${y})`);
    return `((${at(0, 1)}) - (${at(0, 0)})) / ((${at(1, 0)}) - (${at(0, 0)}))`;
  }

  /** Tiles that render alike, as TeX ignores spaces. */
  const lookAlikes = (bank: string[]): string[] => {
    const squeezed = bank.map((token) => token.replace(/\s+/g, ''));
    return bank.filter((_, i) => squeezed.indexOf(squeezed[i]) !== i);
  };

  const tilesOf = (slide: Slide): { answer: string[]; bank: string[] } => {
    if (slide.kind !== 'tiles') throw new Error(`expected tiles, got ${slide.kind}`);
    return slide;
  };

  const stepsOf = (slide: Slide) => {
    if (slide.kind !== 'steps') throw new Error(`expected steps, got ${slide.kind}`);
    return slide;
  };

  const shown = (slide: Slide): string => {
    if (slide.kind === 'teach') return '';
    const tex = slide.prompt.filter((block) => block.kind === 'display').map((block) => (block.kind === 'display' ? block.tex : ''));
    if (slide.kind === 'flow') tex.push(slide.subject);
    if (slide.kind === 'tree') tex.push(slide.expression.split(', \\quad')[0]);
    return tex.find((t) => t.includes('\\frac{dy}{dx}')) ?? '';
  };

  it('reads P and Q off every way the equation is written', () => {
    for (const { params, slide } of draws(g.deIfRead as Generator<LinearDe>)) {
      const [P, Q] = answerOf(slide).map(toMath);
      const equation = linearTex(params);
      expect(shown(slide)).toBe(equation);
      for (const C of [1.7, -0.6]) {
        const Y = generalAnswer(params, C);
        expect(holds(equation, Y)).toBe(true);
        expect(holds(`\\frac{dy}{dx} + (${answerOf(slide)[0]})y = ${answerOf(slide)[1]}`, Y)).toBe(true);
      }
      expect(same(P, pFromShown(equation))).toBe(true);
      expect(factorWorks(factorAnswer(params), P)).toBe(true);
      expect(same(Q, qAnswer(params))).toBe(true);
      expect(lookAlikes(tilesOf(slide).bank)).toEqual([]);
    }
  });

  it('walks to the standard form, dividing only when dy/dx carries something', () => {
    for (const { params, slide } of draws(g.deIfDivide as Generator<LinearDe>)) {
      if (slide.kind !== 'flow') throw new Error('expected a flow');
      const [first, P, Q] = slide.answer;
      expect(first.startsWith(params.written === 'standard' ? 'Nothing' : 'Divide')).toBe(true);
      expect(same(toMath(stripDollars(P)), pFromShown(slide.subject))).toBe(true);
      expect(holds(`\\frac{dy}{dx} + (${stripDollars(P)})y = ${stripDollars(Q)}`, generalAnswer(params, 1.7))).toBe(true);
      expect(holds(slide.subject, generalAnswer(params, 1.7))).toBe(true);
      // No wrong branch is secretly right.
      for (const step of slide.steps.slice(1)) {
        const right = step.branches.filter((branch) => branch.to || branch.outcome?.startsWith('So the equation'));
        expect(right.length).toBe(1);
        for (const branch of step.branches) {
          if (right.includes(branch)) continue;
          expect(same(toMath(stripDollars(branch.label)), toMath(stripDollars(right[0].label)))).toBe(false);
        }
      }
    }
  });

  it('marks the one product whose derivative is the left side', () => {
    const Y = 'sin(x) + x^2';
    const dY = 'cos(x) + 2*x';
    const valueAt = (tex: string, x: number): number => {
      const inner = tex.match(/^\\frac\{d\}\{dx\}\((.*)\)$/);
      if (inner) {
        const product = toMath(inner[1]).replace(/\by\b/g, `(${Y})`).replace(/\bD\b/g, `(${dY})`);
        return derivativeAt(product, 'x', { x });
      }
      return evalAt(toMath(tex), { x, y: evalAt(Y, { x }), D: derivativeAt(Y, 'x', { x }) });
    };
    for (const { params, slide } of draws(g.deIfProduct as Generator<ProductParams>)) {
      if (slide.kind !== 'choice') throw new Error('expected a choice');
      const target = shown(slide) || (slide.prompt.find((block) => block.kind === 'display') as { tex: string }).tex;
      const matching = slide.options.filter((opt) => XS.every((x) => close(valueAt(opt.label, x), valueAt(target, x))));
      expect(matching.length, JSON.stringify(slide.options)).toBe(1);
      expect(matching[0].id).toBe(slide.correctId);
      expect(slide.options.length).toBe(4);
      void params;
    }
  });

  it('multiplies through by the factor: its power, its derivative, the right side', () => {
    for (const { params, slide } of draws(g.deIfMultiplyTree as Generator<LinearDe>)) {
      const values = answerOf(slide).map(Number);
      const q = Number(proseOf(slide).match(/right side into \$(-?\d*)(?:e\^\{cx\}|x\^\{d\})/)![1].replace(/^-?$/, (sign) => `${sign}1`));
      const P = pFromShown(shown(slide));
      if (params.kind === 'exp') {
        const [a, b, c] = values;
        expect(factorWorks(`e^(${a}*x)`, P)).toBe(true);
        expect(XS.every((x) => close(derivativeAt(`e^(${a}*x)`, 'x', { x }), b * Math.exp(a * x)))).toBe(true);
        expect(same(`${q}*e^(${c}*x)`, `e^(${a}*x) * (${qAnswer(params)})`)).toBe(true);
      } else {
        const [a, b, c, d] = values;
        expect(factorWorks(`x^(${a})`, P)).toBe(true);
        expect(XS.every((x) => close(derivativeAt(`x^(${a})`, 'x', { x }), b * x ** c))).toBe(true);
        expect(same(`${q}*x^(${d})`, `x^(${a}) * (${qAnswer(params)})`)).toBe(true);
      }
      expect(holds(shown(slide), generalAnswer(params, 1.7))).toBe(true);
    }
  });

  it('types a factor whose derivative is P times itself', () => {
    for (const { params, slide } of draws(g.deIfFactor as Generator<FactorParams>)) {
      const I = typed(slide);
      const P = pFromShown(factorDeTex(params));
      expect(same(P, factorPAnswer(params.P))).toBe(true);
      expect(factorWorks(I, P)).toBe(true);
      expect(same(I, factorOfAnswer(params.P))).toBe(true);
    }
  });

  it('tidies a logarithm into the factor, and offers no slip that equals it', () => {
    for (const { params, slide } of draws(g.deIfExponentSteps as Generator<FactorParams>)) {
      const { reductions } = stepsOf(slide);
      const last = reductions[reductions.length - 1];
      const I = toMath(last.value.replace(/^I = /, ''));
      expect(factorWorks(I, factorPAnswer(params.P))).toBe(true);
      for (const slip of last.bank) {
        if (slip === last.value) continue;
        expect(same(toMath(slip.replace(/^I = /, '')), I), slip).toBe(false);
      }
    }
  });

  it('walks from P to its integral to the factor, with every slip really wrong', () => {
    for (const { params, slide } of draws(g.deIfShape as Generator<FactorParams>)) {
      if (slide.kind !== 'flow') throw new Error('expected a flow');
      const [P, F, I] = slide.answer.map((label) => toMath(stripDollars(label)));
      expect(same(P, pFromShown(slide.subject))).toBe(true);
      expect(XS.every((x) => close(derivativeAt(F, 'x', { x }), evalAt(P, { x })))).toBe(true);
      expect(factorWorks(I, P)).toBe(true);
      const [pStep, fStep, iStep] = slide.steps;
      for (const branch of pStep.branches) if (!branch.to) expect(same(toMath(stripDollars(branch.label)), P)).toBe(false);
      for (const branch of fStep.branches) {
        if (branch.to) continue;
        expect(XS.every((x) => close(derivativeAt(toMath(stripDollars(branch.label)), 'x', { x }), evalAt(P, { x })))).toBe(false);
      }
      for (const branch of iStep.branches) {
        if (branch.label === slide.answer[2]) continue;
        expect(same(toMath(stripDollars(branch.label)), I, { C: 0.7 }), branch.label).toBe(false);
      }
      void params;
    }
  });

  it('writes the left side as the derivative of the factor times y', () => {
    for (const { params, slide } of draws(g.deIfLhs as Generator<LinearDe>)) {
      const [product, right] = answerOf(slide);
      const Y = generalAnswer(params, 1.7);
      expect(holds(shown(slide), Y)).toBe(true);
      const withY = toMath(product).replace(/\by\b/g, `(${Y})`);
      expect(XS.every((x) => close(derivativeAt(withY, 'x', { x }), evalAt(toMath(right), { x })))).toBe(true);
      expect(lookAlikes(tilesOf(slide).bank)).toEqual([]);
    }
  });

  /** Each line of a solving slide, checked against the solution it should lead to. */
  function checkSolvingSteps(slide: Slide, equation: string) {
    const [product, integrated, general] = stepsOf(slide).reductions;
    const Y = (line: string, C: number) => toMath(line.replace(/^y = /, '')).replace(/\bC\b/g, `(${C})`);
    // The last line solves the equation for every C, and no slip beside it does.
    const passes = (line: string) => [1.7, -0.6].every((C) => holds(equation, Y(line, C)));
    expect(passes(general.value)).toBe(true);
    for (const slip of general.bank) if (slip !== general.value) expect(passes(slip), slip).toBe(false);
    // The product line: the derivative of the product, with a real solution put in, is the right side.
    const productOk = (line: string) => {
      const [, inner, right] = line.match(/^\\frac\{d\}\{dx\}\((.*)\) = (.*)$/)!;
      const withY = toMath(inner).replace(/\by\b/g, `(${Y(general.value, 1.7)})`);
      return XS.every((x) => close(derivativeAt(withY, 'x', { x }), evalAt(toMath(right), { x })));
    };
    expect(productOk(product.value)).toBe(true);
    for (const slip of product.bank) if (slip !== product.value) expect(productOk(slip), slip).toBe(false);
    // The integrated line: the two sides differ by the same C everywhere.
    const integratedOk = (line: string) => {
      const [left, right] = line.split(' = ');
      const withY = toMath(left).replace(/\by\b/g, `(${Y(general.value, 1.7)})`);
      return same(withY, toMath(right).replace(/\bC\b/g, '(1.7)'));
    };
    expect(integratedOk(integrated.value)).toBe(true);
    for (const slip of integrated.bank) if (slip !== integrated.value) expect(integratedOk(slip), slip).toBe(false);
  }

  it('solves a constant-P equation line by line, and every slip fails', () => {
    for (const { params, slide } of draws(g.deIfConstpSteps as Generator<LinearDe>)) {
      checkSolvingSteps(slide, linearTex(params));
      expect(stepsOf(slide).start[0]).toBe(linearTex(params));
    }
  });

  it('solves a P = k/x equation line by line, and every slip fails', () => {
    for (const { params, slide } of draws(g.deIfPowerSteps as Generator<LinearDe>)) {
      checkSolvingSteps(slide, linearTex(params));
      expect(stepsOf(slide).start[0]).toBe(linearTex(params));
    }
  });

  it('fills the exponents of the constant-P method', () => {
    for (const { params, slide } of draws(g.deIfExponentsTree as Generator<LinearDe>)) {
      const [a, b, r, s] = answerOf(slide).map(Number);
      const equation = shown(slide);
      expect(factorWorks(`e^(${a}*x)`, pFromShown(equation))).toBe(true);
      expect(same(`${qCoefOf(params)}*e^(${b}*x)`, `e^(${a}*x) * (${qAnswer(params)})`)).toBe(true);
      expect(holds(equation, `${r}*e^(${params.m}*x) + 1.7*e^(${s}*x)`)).toBe(true);
    }
  });

  /** Q's coefficient, from Q at x = 0 (exp) or x = 1 (power). */
  const qCoefOf = (de: LinearDe): number => evalAt(qAnswer(de), { x: de.kind === 'exp' ? 0 : 1 });

  it('builds the general solution for a constant P, and no other tile fits', () => {
    for (const { slide } of draws(g.deIfGeneral as Generator<LinearDe>)) {
      const { answer, bank } = tilesOf(slide);
      const equation = shown(slide);
      const solves = (part: string, factor: string) =>
        [1.7, -0.6].every((C) => holds(equation, `${toMath(part)} + (${C})*${toMath(factor)}`));
      expect(solves(answer[0], answer[1])).toBe(true);
      for (const token of bank) {
        if (token !== answer[0]) expect(solves(token, answer[1]), token).toBe(false);
        if (token !== answer[1]) expect(solves(answer[0], token), token).toBe(false);
      }
      expect(lookAlikes(bank)).toEqual([]);
    }
  });

  it('integrates the multiplied right side of the equation it shows', () => {
    for (const { params, slide, seed } of draws(g.deIfIntegrate as Generator<LinearDe>)) {
      if (slide.kind !== 'expression') throw new Error('expected an expression');
      const equation = shown(slide);
      const Y = generalAnswer(params, 1.7);
      expect(holds(equation, Y)).toBe(true);
      // The lead with a real solution in it differs from the answer by a constant.
      const lead = toMath(slide.lead!.replace(/ =$/, '')).replace(/\by\b/g, `(${Y})`);
      expect(same(lead, `(${slide.answer}) + 1.7`)).toBe(true);
      expect(checkAnswer(`${slide.answer} + C`, slide.answer, { seed, mode: 'upToConstant' }).status).toBe('correct');
    }
  });

  it('builds the general solution for P = k/x, and no other tile fits', () => {
    for (const { slide } of draws(g.deIfPowerTiles as Generator<LinearDe>)) {
      const { answer, bank } = tilesOf(slide);
      const equation = shown(slide);
      const solves = (part: string, cTerm: string) =>
        [1.7, -0.6].every((C) => holds(equation, `${toMath(part)} + ${toMath(cTerm).replace(/\bC\b/g, `(${C})`)}`));
      expect(solves(answer[0], answer[1])).toBe(true);
      for (const token of bank) {
        if (token !== answer[0] && !token.includes('C')) expect(solves(token, answer[1]), token).toBe(false);
        if (token !== answer[1] && token.includes('C')) expect(solves(answer[0], token), token).toBe(false);
      }
      expect(lookAlikes(bank)).toEqual([]);
    }
  });

  it('fills the powers of the P = k/x method', () => {
    for (const { params, slide } of draws(g.deIfPowersTree as Generator<LinearDe>)) {
      const [a, b, n, r] = answerOf(slide).map(Number);
      const equation = shown(slide);
      expect(factorWorks(`x^(${a})`, pFromShown(equation))).toBe(true);
      expect(same(`${qCoefOf(params)}*x^(${b})`, `x^(${a}) * (${qAnswer(params)})`)).toBe(true);
      // x^a y, with a real solution in it, is r x^n plus a constant.
      expect(same(`x^(${a}) * (${generalAnswer(params, 1.7)})`, `${r}*x^(${n}) + 1.7`)).toBe(true);
    }
  });

  /** The one option that solves the equation shown (and meets the condition, where there is one). */
  function solvingOptions(slide: Slide, condition?: [number, number]) {
    if (slide.kind !== 'choice') throw new Error('expected a choice');
    const equation = shown(slide);
    return slide.options.filter((opt) => {
      const rhs = toMath(opt.label.replace(/^y = /, ''));
      const Cs = rhs.includes('C') ? [1.7, -0.6] : [0];
      const solves = Cs.every((C) => holds(equation, rhs, { C }));
      const meets = !condition || close(evalAt(rhs, { x: condition[0] }), condition[1]);
      return solves && meets;
    });
  }

  it('marks the one form of the C term that solves the equation', () => {
    for (const { slide } of draws(g.deIfCterm as Generator<LinearDe>)) {
      if (slide.kind !== 'choice') throw new Error('expected a choice');
      const right = solvingOptions(slide);
      expect(right.length).toBe(1);
      expect(right[0].id).toBe(slide.correctId);
      expect(slide.options.length).toBe(4);
    }
  });

  /** The condition `y(a) = b` a prompt or a line states. */
  const conditionIn = (text: string): [number, number] => {
    const [, a, b] = text.match(/y\((\d+)\) = (-?\d+)/)!;
    return [Number(a), Number(b)];
  };

  it('finds the C a condition fixes', () => {
    for (const { params, slide } of draws(g.deIfConstant as Generator<ParticularDe>)) {
      const C = Number(typed(slide));
      const [x0, y0] = conditionIn(proseOf(slide));
      const Y = generalAnswer(params, C);
      expect(holds(linearTex(params), Y)).toBe(true);
      expect(proseOf(slide)).toContain(linearTex(params));
      expect(close(evalAt(Y, { x: x0 }), y0)).toBe(true);
      expect(Number.isInteger(C) && C !== 0).toBe(true);
    }
  });

  it('puts the condition in and ends on a solution that meets it', () => {
    for (const { params, slide } of draws(g.deIfConditionSteps as Generator<ParticularDe>)) {
      const { start, reductions } = stepsOf(slide);
      const [x0, y0] = conditionIn(start[2]);
      const last = reductions[reductions.length - 1];
      const fits = (line: string) => {
        const Y = toMath(line.replace(/^y = /, ''));
        return holds(linearTex(params), Y) && close(evalAt(Y, { x: x0 }), y0);
      };
      expect(fits(last.value)).toBe(true);
      for (const slip of last.bank) if (slip !== last.value) expect(fits(slip), slip).toBe(false);
      // The general solution it starts from solves the equation for any C.
      expect([1.7, -0.6].every((C) => holds(linearTex(params), toMath(start[0].replace(/^y = /, '')), { C }))).toBe(true);
      expect(reductions[1].value).toBe(`C = ${params.C}`);
    }
  });

  it('marks the one solution that meets both the equation and the condition', () => {
    for (const { slide } of draws(g.deIfFit as Generator<ParticularDe>)) {
      if (slide.kind !== 'choice') throw new Error('expected a choice');
      const right = solvingOptions(slide, conditionIn(proseOf(slide)));
      expect(right.length).toBe(1);
      expect(right[0].id).toBe(slide.correctId);
      expect(slide.options.length).toBe(4);
    }
  });

  it('fills the coefficient, then C, then y at the other point', () => {
    for (const { params, slide } of draws(g.deIfValueTree as Generator<ParticularDe>)) {
      const [r, C, y1] = answerOf(slide).map(Number);
      const form = proseOf(slide).match(/\$y = (.*?)\$/)![1];
      const Y = toMath(form.replace(/^r/, `(${r})`)).replace(/\bC\b/g, `(${C})`);
      expect(holds(shown(slide), Y)).toBe(true);
      const [x0, y0] = conditionIn(proseOf(slide));
      expect(close(evalAt(Y, { x: x0 }), y0)).toBe(true);
      expect(close(evalAt(Y, { x: params.x1 }), y1)).toBe(true);
      expect(yAt(params, params.x1)).toBe(y1);
    }
  });
});

describe('second-order equations', () => {
  /** Probes, kept small enough that e^{6x} does not swamp the cancellation. */
  const XS = [-0.6, 0.3, 0.9, 1.4];

  /** A shown equation in y'', y' and y as mathjs, with E for y'' and D for y'. */
  const equationToMath = (tex: string): [string, string] =>
    tex
      .replace(/\\frac\{d\^2y\}\{dx\^2\}/g, ' E ')
      .replace(/\\frac\{dy\}\{dx\}/g, ' D ')
      .replace(/y''/g, ' E ')
      .replace(/y'/g, ' D ')
      .replace(/(\d)\s*(?=[EDy])/g, '$1 * ')
      .split('=') as [string, string];

  /**
   * y'' + by' + cy = 0 read off a shown equation: everything moved left,
   * then divided by what multiplies y''. Nothing is left over on its own.
   */
  function coefficientsOf(tex: string): { b: number; c: number } {
    const [lhs, rhs] = equationToMath(tex);
    const L = (E: number, D: number, y: number) => evalAt(`(${lhs}) - (${rhs})`, { E, D, y });
    const k0 = L(0, 0, 0);
    expect(close(k0, 0), tex).toBe(true);
    const kE = L(1, 0, 0) - k0;
    return { b: (L(0, 1, 0) - k0) / kE, c: (L(0, 0, 1) - k0) / kE };
  }

  /** A solution's TeX as mathjs, keeping A and B as letters. */
  function solutionToMath(tex: string): string {
    return tex
      .replace(/^y = /, '')
      .replace(/\\(cos|sin) (\d*)x/g, (_, fn: string, n: string) => ` ${fn}(${n || 1}*x) `)
      .replace(/e\^\{(-?)(\d*)x\}/g, (_, sign: string, n: string) => ` exp(${sign}${n || 1}*x) `)
      .replace(/([0-9ABx)])\s*(?=[ABx(]|exp|cos|sin)/g, '$1 * ');
  }

  /** An expression in m (and x, through e^{mx}) as mathjs. */
  const inM = (tex: string): string =>
    tex
      .replace(/e\^\{(\d*)mx\}/g, (_, n: string) => ` exp(${n || 1}*m*x) `)
      .replace(/([0-9m)])\s*(?=[m(]|exp)/g, '$1 * ');

  const compiledSecond = new Map<string, { evaluate: (scope: Scope) => unknown }>();
  function secondAt(source: string, scope: Scope): number {
    let hit = compiledSecond.get(source);
    if (!hit) {
      hit = math.derivative(math.derivative(source, 'x'), 'x').compile();
      compiledSecond.set(source, hit);
    }
    return hit.evaluate({ ...scope }) as number;
  }

  /** Whether Y (in x, with A and B set in scope) satisfies y'' + by' + cy = 0 at every probe. */
  function solves(Y: string, { b, c }: { b: number; c: number }, scope: Scope = {}): boolean {
    return XS.every((x) => {
      const at = { ...scope, x };
      const [ypp, yp, y] = [secondAt(Y, at), derivativeAt(Y, 'x', at), evalAt(Y, at)];
      const size = Math.max(1, Math.abs(ypp), Math.abs(b * yp), Math.abs(c * y));
      return Math.abs(ypp + b * yp + c * y) < 1e-9 * size;
    });
  }

  /** A general solution: A's part and B's part each solve it, and they are independent. */
  function isGeneral(Y: string, coefficients: { b: number; c: number }): boolean {
    const partA = { A: 1, B: 0 };
    const partB = { A: 0, B: 1 };
    if (!solves(Y, coefficients, partA) || !solves(Y, coefficients, partB)) return false;
    const x = 0.3;
    const [fa, fb] = [evalAt(Y, { ...partA, x }), evalAt(Y, { ...partB, x })];
    const [da, db] = [derivativeAt(Y, 'x', { ...partA, x }), derivativeAt(Y, 'x', { ...partB, x })];
    return Math.abs(fa * db - fb * da) > 1e-6 * (Math.abs(fa * db) + Math.abs(fb * da));
  }

  /** y(0) and y'(0) of a particular solution. */
  const conditionsOf = (Y: string): [number, number] => [evalAt(Y, { x: 0 }), derivativeAt(Y, 'x', { x: 0 })];

  /** The conditions a prompt or a line states. */
  function statedConditions(text: string): [number, number] {
    const [, y0, v0] = text.match(/y\(0\) = (-?\d+), \\; y'\(0\) = (-?\d+)/)!;
    return [Number(y0), Number(v0)];
  }

  const meets = (Y: string, [y0, v0]: [number, number]): boolean => {
    const [a, b] = conditionsOf(Y);
    return close(a, y0) && close(b, v0);
  };

  /** The equation a slide shows, wherever it shows it. */
  function shownEquation(slide: Slide): string {
    if (slide.kind === 'teach') throw new Error('a teach slide shows no equation');
    const candidates = slide.prompt.filter((block) => block.kind === 'display').map((block) => (block.kind === 'display' ? block.tex : ''));
    if (slide.kind === 'flow') candidates.push(slide.subject);
    if (slide.kind === 'tree') candidates.push(slide.expression);
    if (slide.kind === 'steps') candidates.push(slide.start[0]);
    for (const block of slide.prompt) if (block.kind === 'prose') candidates.push(...[...block.text.matchAll(/\$([^$]*)\$/g)].map((m) => m[1]));
    const found = candidates.find((tex) => tex.includes('\\frac{d^2y}{dx^2}'));
    if (!found) throw new Error('no second-order equation shown');
    return found;
  }

  const stepsOf = (slide: Slide) => {
    if (slide.kind !== 'steps') throw new Error(`expected steps, got ${slide.kind}`);
    return slide;
  };

  const tilesOf = (slide: Slide) => {
    if (slide.kind !== 'tiles') throw new Error(`expected tiles, got ${slide.kind}`);
    return slide;
  };

  /** The template filled with tokens, as TeX. */
  const fill = (template: string, tokens: string[]): string => template.replace(/\{(\d)\}/g, (_, i: string) => tokens[Number(i)]);

  /** Every filling that differs from the answer in one blank. */
  function oneOff(answer: string[], bank: string[]): string[][] {
    return answer.flatMap((_, i) => bank.filter((token) => token !== answer[i]).map((token) => answer.map((a, j) => (j === i ? token : a))));
  }

  const lookAlikes = (bank: string[]): string[] => {
    const squeezed = bank.map((token) => token.replace(/\s+/g, ''));
    return bank.filter((_, i) => squeezed.indexOf(squeezed[i]) !== i);
  };

  /** The polynomial in m on the left of `... = 0`, as a function to compare. */
  const samePoly = (lineA: string, lineB: string): boolean =>
    [-1.3, 0.4, 2.2].every((m) => {
      const value = (line: string) => {
        const [l, r] = line.split('=').map(inM);
        return evalAt(`(${l}) - (${r})`, { m, x: 0.7 });
      };
      return close(value(lineA), value(lineB));
    });

  const auxLine = ({ b, c }: { b: number; c: number }): string => `m^2 + (${b})m + (${c}) = 0`;

  it('substitutes e^{mx}, takes it out, and drops it, with every slip wrong', () => {
    for (const { slide } of draws(g.deAuxSubSteps as Generator<SecondDe>)) {
      const { start, reductions } = stepsOf(slide);
      const [lhs, rhs] = equationToMath(start[0]);
      // The shown equation with y = e^{mx} put in, as a function of m and x.
      const applied = (m: number, x: number) =>
        evalAt(`(${lhs}) - (${rhs})`, { E: m * m * Math.exp(m * x), D: m * Math.exp(m * x), y: Math.exp(m * x) });
      const agrees = (line: string, divided: boolean) =>
        [[-1.3, 0.7], [0.4, -0.2], [2.2, 0.5]].every(([m, x]) => {
          const [l, r] = line.split('=').map(inM);
          return close(evalAt(`(${l}) - (${r})`, { m, x }), applied(m, x) / (divided ? Math.exp(m * x) : 1));
        });
      reductions.forEach((step, idx) => {
        const divided = idx === 2;
        expect(agrees(step.value, divided), step.value).toBe(true);
        for (const slip of step.bank) if (slip !== step.value) expect(agrees(slip, divided), slip).toBe(false);
      });
    }
  });

  it('reads the auxiliary equation off every way the equation is written, and no other tile fits', () => {
    for (const { slide } of draws(g.deAuxTiles as Generator<SecondDe>)) {
      const { template, answer, bank } = tilesOf(slide);
      const want = auxLine(coefficientsOf(shownEquation(slide)));
      expect(samePoly(fill(template, answer), want)).toBe(true);
      for (const other of oneOff(answer, bank)) expect(samePoly(fill(template, other), want), other.join(' ')).toBe(false);
      expect(lookAlikes(bank)).toEqual([]);
    }
  });

  it('types the root the question asks for', () => {
    for (const { slide } of draws(g.deAuxRoot as Generator<RootParams>)) {
      const r = Number(typed(slide));
      const { b, c } = coefficientsOf(shownEquation(slide));
      expect(close(r * r + b * r + c, 0)).toBe(true);
      const other = -b - r;
      const asked = proseOf(slide);
      if (asked.includes('repeated')) expect(close(other, r)).toBe(true);
      else if (asked.includes('larger')) expect(r).toBeGreaterThan(other);
      else expect(r).toBeLessThan(other);
    }
  });

  it('walks to the auxiliary equation, its discriminant and the right kind of root', () => {
    for (const { slide } of draws(g.deAuxCase as Generator<SecondDe>)) {
      if (slide.kind !== 'flow') throw new Error('expected a flow');
      const coefficients = coefficientsOf(slide.subject);
      const [aux, disc, kind] = slide.answer;
      const strip = (label: string) => label.replace(/^\$|\$$/g, '');
      expect(samePoly(strip(aux), auxLine(coefficients))).toBe(true);
      for (const branch of slide.steps[0].branches) if (branch.label !== aux) expect(samePoly(strip(branch.label), auxLine(coefficients))).toBe(false);
      const D = coefficients.b ** 2 - 4 * coefficients.c;
      expect(close(Number(strip(disc)), D)).toBe(true);
      for (const branch of slide.steps[1].branches) if (branch.label !== disc) expect(close(Number(strip(branch.label)), D)).toBe(false);
      expect(kind).toBe(D > 0 ? 'Two different real roots' : D === 0 ? 'One repeated root' : 'Two complex roots');
    }
  });

  /** The tiles place a general solution, and a tile swapped for any other does not. */
  function checkGeneralTiles(slide: Slide) {
    const { template, answer, bank } = tilesOf(slide);
    const coefficients = coefficientsOf(shownEquation(slide));
    expect(isGeneral(solutionToMath(fill(template, answer)), coefficients)).toBe(true);
    for (const other of oneOff(answer, bank)) {
      expect(isGeneral(solutionToMath(fill(template, other)), coefficients), other.join(' ')).toBe(false);
    }
    expect(lookAlikes(bank)).toEqual([]);
  }

  it('builds the general solution for two real roots, and no other tile fits', () => {
    for (const { slide } of draws(g.deRealGeneral as Generator<SecondDe>)) checkGeneralTiles(slide);
  });

  it('builds the general solution for a repeated root, and no other tile fits', () => {
    for (const { slide } of draws(g.deRepGeneral as Generator<SecondDe>)) checkGeneralTiles(slide);
  });

  it('builds the general solution for complex roots, and no other tile fits', () => {
    for (const { slide } of draws(g.deCxGeneral as Generator<SecondDe>)) checkGeneralTiles(slide);
  });

  it('fills the roots from their sum and product', () => {
    for (const { slide } of draws(g.deRealRootsTree as Generator<SecondDe>)) {
      const [s, t, p, q] = answerOf(slide).map(Number);
      const { b, c } = coefficientsOf(shownEquation(slide));
      expect(p + q).toBe(s);
      expect(p * q).toBe(t);
      expect(p).toBeLessThan(q);
      for (const r of [p, q]) expect(close(r * r + b * r + c, 0)).toBe(true);
    }
  });

  /** Exactly one option of a which-question is right, in whichever direction it asks. */
  function checkWhich(slide: Slide) {
    if (slide.kind !== 'choice') throw new Error('expected a choice');
    expect(slide.options.length).toBe(4);
    const display = slide.prompt.find((block) => block.kind === 'display');
    const shown = display?.kind === 'display' ? display.tex : '';
    const right = slide.options.filter((option) =>
      shown.startsWith('y =')
        ? isGeneral(solutionToMath(shown), coefficientsOf(option.label))
        : isGeneral(solutionToMath(option.label), coefficientsOf(shown)),
    );
    expect(right.map((option) => option.id)).toEqual([slide.correctId]);
  }

  it('marks the one general solution or equation that goes with two real roots', () => {
    for (const { slide } of draws(g.deRealWhich as Generator<WhichSecond>)) checkWhich(slide);
  });

  it('marks the one general solution or equation that goes with a repeated root', () => {
    for (const { slide } of draws(g.deRepWhich as Generator<WhichSecond>)) checkWhich(slide);
  });

  it('marks the one general solution or equation that goes with complex roots', () => {
    for (const { slide } of draws(g.deCxWhich as Generator<WhichSecond>)) checkWhich(slide);
  });

  it('solves a real-roots equation line by line, and every slip fails', () => {
    for (const { slide } of draws(g.deRealSolveSteps as Generator<SecondDe>)) {
      const { start, reductions } = stepsOf(slide);
      const coefficients = coefficientsOf(start[0]);
      const [aux, factored, general] = reductions;
      for (const step of [aux, factored]) {
        const line = step.value.replace(/\)\(/g, ')*(');
        expect(samePoly(line, auxLine(coefficients)), step.value).toBe(true);
        for (const slip of step.bank) if (slip !== step.value) expect(samePoly(slip.replace(/\)\(/g, ')*('), auxLine(coefficients)), slip).toBe(false);
      }
      expect(isGeneral(solutionToMath(general.value), coefficients)).toBe(true);
      for (const slip of general.bank) if (slip !== general.value) expect(isGeneral(solutionToMath(slip), coefficients), slip).toBe(false);
    }
  });

  it('differentiates xe^{px} twice and puts it in, and every slip fails', () => {
    for (const { slide } of draws(g.deRepCheckSteps as Generator<RepCheckParams>)) {
      const { start, reductions } = stepsOf(slide);
      const Y = solutionToMath(start[0]);
      const coefficients = coefficientsOf(shownEquation(slide));
      const [first, second, last] = reductions;
      const matches = (line: string, order: 1 | 2) =>
        XS.every((x) => close(evalAt(solutionToMath(line.replace(/^y'+ = /, '')), { x }), order === 1 ? derivativeAt(Y, 'x', { x }) : secondAt(Y, { x })));
      expect(matches(first.value, 1)).toBe(true);
      for (const slip of first.bank) if (slip !== first.value) expect(matches(slip, 1), slip).toBe(false);
      expect(matches(second.value, 2)).toBe(true);
      for (const slip of second.bank) if (slip !== second.value) expect(matches(slip, 2), slip).toBe(false);
      // The last line is the equation itself, with y put in: its two sides agree only for the value.
      expect(coefficientsOf(last.value)).toEqual(coefficients);
      const holdsWithY = (line: string) => {
        const [lhs, rhs] = equationToMath(line.replace(/ = (.*)$/, (_, right: string) => ` = ${solutionToMath(right)}`));
        return XS.every((x) =>
          close(evalAt(lhs, { E: secondAt(Y, { x }), D: derivativeAt(Y, 'x', { x }), y: evalAt(Y, { x }) }), evalAt(rhs, { x })),
        );
      };
      expect(solves(Y, coefficients)).toBe(true);
      expect(holdsWithY(last.value)).toBe(true);
      for (const slip of last.bank) if (slip !== last.value) expect(holdsWithY(slip), slip).toBe(false);
    }
  });

  it('types alpha or beta for the complex roots', () => {
    for (const { params, slide } of draws(g.deCxPart as Generator<PartParams>)) {
      const value = Number(typed(slide));
      const { b, c } = coefficientsOf(shownEquation(slide));
      const alpha = -b / 2;
      const beta = Math.sqrt(c - alpha * alpha);
      expect(close(value, params.ask === 'alpha' ? alpha : beta)).toBe(true);
      expect(proseOf(slide)).toContain(`Find $\\${params.ask}$`);
    }
  });

  it('fills the discriminant, then alpha, then beta', () => {
    for (const { slide } of draws(g.deCxTree as Generator<SecondDe>)) {
      const [D, alpha, beta] = answerOf(slide).map(Number);
      const { b, c } = coefficientsOf(shownEquation(slide));
      expect(close(D, b * b - 4 * c)).toBe(true);
      expect(D).toBeLessThan(0);
      expect(close(alpha, -b / 2)).toBe(true);
      expect(close(beta, Math.sqrt(-D) / 2)).toBe(true);
    }
  });

  /** The particular solution a generic form gives with its letters filled in. */
  function fromForm(kind: SecondDe['kind'], values: Record<string, number>): string {
    const { p, q, A, B } = values;
    if (kind === 'real') return `(${A})*exp((${p})*x) + (${B})*exp((${q})*x)`;
    if (kind === 'repeated') return `((${A}) + (${B})*x)*exp((${p})*x)`;
    return `exp((${p})*x)*((${A})*cos((${q})*x) + (${B})*sin((${q})*x))`;
  }

  it('finds the constant the two conditions fix', () => {
    for (const { params, slide } of draws(g.deIvpConstant as Generator<SecondIvp & { shown: boolean }>)) {
      const value = Number(typed(slide));
      const text = proseOf(slide);
      const letter = text.match(/[Ff]ind \$([AB])\$/)![1];
      const values = { p: params.p, q: params.q, A: params.A, B: params.B, [letter]: value };
      const Y = fromForm(params.kind, values);
      expect(solves(Y, coefficientsOf(shownEquation(slide)))).toBe(true);
      expect(meets(Y, statedConditions(text))).toBe(true);
    }
  });

  it('fills the roots, then A, then B, and meets both conditions', () => {
    for (const { params, slide } of draws(g.deIvpTree as Generator<SecondIvp>)) {
      const values = answerOf(slide).map(Number);
      const named =
        params.kind === 'repeated'
          ? { p: values[0], q: values[0], A: values[1], B: values[2] }
          : { p: values[0], q: values[1], A: values[2], B: values[3] };
      if (params.kind === 'real') expect(named.p).toBeLessThan(named.q);
      if (params.kind === 'complex') expect(named.q).toBeGreaterThan(0);
      const Y = fromForm(params.kind, named);
      expect(solves(Y, coefficientsOf(shownEquation(slide)))).toBe(true);
      expect(meets(Y, statedConditions(proseOf(slide)))).toBe(true);
    }
  });

  it('puts the conditions in and ends on the one solution that meets them', () => {
    for (const { slide } of draws(g.deIvpSteps as Generator<SecondIvp>)) {
      const { start, reductions } = stepsOf(slide);
      const coefficients = coefficientsOf(shownEquation(slide));
      const conditions = statedConditions(start[2]);
      expect(isGeneral(solutionToMath(start[0]), coefficients)).toBe(true);
      const last = reductions[reductions.length - 1];
      const fits = (line: string) => solves(solutionToMath(line), coefficients) && meets(solutionToMath(line), conditions);
      expect(fits(last.value)).toBe(true);
      for (const slip of last.bank) if (slip !== last.value) expect(fits(slip), slip).toBe(false);
      // The constants line gives the same solution as the last line.
      const [, A, B] = reductions[1].value.match(/A = (-?\d+), \\; B = (-?\d+)/)!;
      const Y = solutionToMath(start[0]);
      expect(XS.every((x) => close(evalAt(Y, { x, A: Number(A), B: Number(B) }), evalAt(solutionToMath(last.value), { x })))).toBe(true);
    }
  });

  it('marks the one particular solution that meets the equation and both conditions', () => {
    for (const { slide } of draws(g.deIvpFit as Generator<SecondIvp>)) {
      if (slide.kind !== 'choice') throw new Error('expected a choice');
      expect(slide.options.length).toBe(4);
      const coefficients = coefficientsOf(shownEquation(slide));
      const conditions = statedConditions(proseOf(slide));
      const right = slide.options.filter((option) => {
        const Y = solutionToMath(option.label);
        return solves(Y, coefficients) && meets(Y, conditions);
      });
      expect(right.map((option) => option.id)).toEqual([slide.correctId]);
    }
  });
});

describe('non-homogeneous second-order equations', () => {
  /** Probes, small enough that e^{3x} beside a polynomial does not swamp the comparison. */
  const XS = [-0.6, 0.3, 0.9, 1.4];

  type Forced = { b: number; c: number; f: string };

  /**
   * A function's TeX as mathjs: e^{kx}, a cosine or sine of a multiple of x,
   * x^{n}, and the letters A and B kept, with the trial's Greek letters as L,
   * M and N.
   */
  function fnOf(tex: string): string {
    return tex
      .replace(/^y'* = /, '')
      .replace(/\\lambda/g, ' L ')
      .replace(/\\mu/g, ' M ')
      .replace(/\\nu/g, ' N ')
      .replace(/\\(cos|sin) (\d*)x/g, (_, fn: string, n: string) => ` ${fn}(${n || 1}*x) `)
      .replace(/e\^\{(-?)(\d*)x\}/g, (_, sign: string, n: string) => ` exp(${sign}${n || 1}*x) `)
      .replace(/x\^\{(\d+)\}/g, ' x^$1 ')
      .replace(/([0-9ABLMNx)])\s*(?=[ABLMNx(]|exp|cos|sin)/g, '$1 * ');
  }

  /** A long equation is displayed on two lines, broken after its left side: back to one. */
  const oneLine = (tex: string): string =>
    tex.replace(/^\\begin\{aligned\} &(.*) \\\\ &= (.*) \\end\{aligned\}$/, '$1 = $2');

  /**
   * y'' + by' + cy = f(x) read off a shown equation: b and c from the left
   * side, which must have 1 in front of y'' and nothing on its own, and f as
   * mathjs.
   */
  function forcedOf(tex: string): Forced {
    const [lhs, rhs] = oneLine(tex).split(' = ');
    const left = lhs
      .replace(/\\frac\{d\^2y\}\{dx\^2\}/g, ' E ')
      .replace(/\\frac\{dy\}\{dx\}/g, ' D ')
      .replace(/y''/g, ' E ')
      .replace(/y'/g, ' D ')
      .replace(/(\d)\s*(?=[EDy])/g, '$1 * ');
    const at = (E: number, D: number, y: number) => evalAt(left, { E, D, y });
    expect(at(0, 0, 0), tex).toBe(0);
    expect(at(1, 0, 0), tex).toBe(1);
    return { b: at(0, 1, 0), c: at(0, 0, 1), f: fnOf(rhs) };
  }

  const compiledSecond = new Map<string, { evaluate: (scope: Scope) => unknown }>();
  function secondAt(source: string, scope: Scope): number {
    let hit = compiledSecond.get(source);
    if (!hit) {
      hit = math.derivative(math.derivative(source, 'x'), 'x').compile();
      compiledSecond.set(source, hit);
    }
    return hit.evaluate({ ...scope }) as number;
  }

  /** y'' + by' + cy for Y at a point: mathjs differentiates Y twice. */
  const leftAt = (Y: string, { b, c }: { b: number; c: number }, scope: Scope): number =>
    secondAt(Y, scope) + b * derivativeAt(Y, 'x', scope) + c * evalAt(Y, scope);

  /**
   * y'' + by' + cy with the derivatives taken numerically: a five-point
   * stencil on the compiled expression, no symbolic differentiation. Its
   * error is far below the tolerance it is read at, and a wrong answer misses
   * by a whole term, so it screens out the many candidates a test rules out
   * (every filling one tile off, every slip) before mathjs differentiates
   * anything. It only ever says no: a candidate it passes still goes through
   * the symbolic check.
   */
  function roughLeft(Y: string, eq: { b: number; c: number }, scope: Scope, x: number) {
    const h = 5e-3;
    const [m2, m1, y, p1, p2] = [-2, -1, 0, 1, 2].map((k) => evalAt(Y, { ...scope, x: x + k * h }));
    const ypp = (-p2 + 16 * p1 - 30 * y + 16 * m1 - m2) / (12 * h * h);
    const yp = (-p2 + 8 * p1 - 8 * m1 + m2) / (12 * h);
    return { left: ypp + eq.b * yp + eq.c * y, y, yp, size: Math.max(1, Math.abs(ypp), Math.abs(eq.b * yp), Math.abs(eq.c * y)) };
  }

  const ROUGH = 1e-6;

  function roughlySolves(Y: string, eq: Forced, scope: Scope = {}): boolean {
    return XS.every((x) => {
      const { left, size } = roughLeft(Y, eq, scope, x);
      const f = evalAt(eq.f, { ...scope, x });
      return Math.abs(left - f) < ROUGH * Math.max(size, Math.abs(f));
    });
  }

  /** The general-solution test below, numerically: the screen in front of it. */
  function roughlyGeneral(Y: string, eq: Forced): boolean {
    const none = { A: 0, B: 0 };
    if (!roughlySolves(Y, eq, none)) return false;
    const [partA, partB] = [{ A: 1, B: 0 }, { A: 0, B: 1 }];
    const parts = XS.every((x) => {
      const base = roughLeft(Y, eq, none, x);
      return [partA, partB].every((setting) => {
        const part = roughLeft(Y, eq, setting, x);
        return Math.abs(part.left - base.left) < ROUGH * Math.max(part.size, base.size);
      });
    });
    if (!parts) return false;
    const x = 0.3;
    const [base, a, b] = [none, partA, partB].map((setting) => roughLeft(Y, eq, setting, x));
    const [fa, fb, da, db] = [a.y - base.y, b.y - base.y, a.yp - base.yp, b.yp - base.yp];
    return Math.abs(fa * db - fb * da) > 1e-6 * (Math.abs(fa * db) + Math.abs(fb * da));
  }

  /** Whether Y satisfies y'' + by' + cy = f(x) at every probe. */
  function solves(Y: string, eq: Forced, scope: Scope = {}): boolean {
    if (!roughlySolves(Y, eq, scope)) return false;
    return XS.every((x) => {
      const at = { ...scope, x };
      const [ypp, yp, y, f] = [secondAt(Y, at), derivativeAt(Y, 'x', at), evalAt(Y, at), evalAt(eq.f, at)];
      const size = Math.max(1, Math.abs(ypp), Math.abs(eq.b * yp), Math.abs(eq.c * y), Math.abs(f));
      return Math.abs(ypp + eq.b * yp + eq.c * y - f) < 1e-9 * size;
    });
  }

  const homogeneous = (eq: Forced): Forced => ({ ...eq, f: '0' });

  const withAB = (Y: string, A: number, B: number): string => Y.replace(/\bA\b/g, `(${A})`).replace(/\bB\b/g, `(${B})`);

  /**
   * A general solution: with A = B = 0 it is a particular integral, and the
   * part A multiplies and the part B multiplies each solve the equation with
   * 0 on the right, independently of each other.
   *
   * A and B stay letters in the one expression mathjs differentiates, and a
   * part is the difference of two settings of them: a tile test tries every
   * filling one tile off, and a derivative per part would be three times the
   * symbolic work.
   */
  function isGeneralWith(Y: string, eq: Forced): boolean {
    if (!/\bA\b/.test(Y) || !/\bB\b/.test(Y)) return false;
    if (!roughlyGeneral(Y, eq)) return false;
    const none = { A: 0, B: 0 };
    if (!solves(Y, eq, none)) return false;
    const partSolves = (setting: Scope) =>
      XS.every((x) => {
        const [on, off] = [{ ...setting, x }, { ...none, x }];
        const left = leftAt(Y, eq, on) - leftAt(Y, eq, off);
        const size = Math.max(1, Math.abs(secondAt(Y, on)), Math.abs(eq.b * derivativeAt(Y, 'x', on)), Math.abs(eq.c * evalAt(Y, on)));
        return Math.abs(left) < 1e-9 * size;
      });
    const [partA, partB] = [{ A: 1, B: 0 }, { A: 0, B: 1 }];
    if (!partSolves(partA) || !partSolves(partB)) return false;
    const at = (setting: Scope, x: number) => evalAt(Y, { ...setting, x }) - evalAt(Y, { ...none, x });
    const slope = (setting: Scope, x: number) => derivativeAt(Y, 'x', { ...setting, x }) - derivativeAt(Y, 'x', { ...none, x });
    const x = 0.3;
    const [fa, fb, da, db] = [at(partA, x), at(partB, x), slope(partA, x), slope(partB, x)];
    return Math.abs(fa * db - fb * da) > 1e-6 * (Math.abs(fa * db) + Math.abs(fb * da));
  }

  /**
   * Whether some choice of the trial's Greek letters makes it a particular
   * integral: least squares over the functions the letters multiply, with
   * y'' + by' + cy of each worked by mathjs.
   */
  function canFit(trial: string, eq: Forced): boolean {
    const pieces = fnOf(trial).split(/\b[LMN]\b/).slice(1);
    const basis = pieces.map((piece) => piece.replace(/^\s*\*?\s*/, '').replace(/\s*\+\s*$/, '').trim() || '1');
    const points = [-0.9, -0.5, -0.2, 0.1, 0.4, 0.7, 1.0, 1.3];
    const G = points.map((x) => basis.map((phi) => leftAt(phi, eq, { x })));
    const target = points.map((x) => evalAt(eq.f, { x }));
    const n = basis.length;
    // Normal equations, solved with partial pivoting; a column the equation sends to 0 drops out.
    const N = Array.from({ length: n }, (_, i) => [
      ...Array.from({ length: n }, (_, j) => G.reduce((sum, row) => sum + row[i] * row[j], 0)),
      G.reduce((sum, row, r) => sum + row[i] * target[r], 0),
    ]);
    const scale = Math.max(1e-12, ...N.map((row) => Math.max(...row.map(Math.abs))));
    const solution = new Array<number>(n).fill(0);
    const pivots: number[] = [];
    for (let col = 0, row = 0; col < n && row < n; col += 1) {
      let best = row;
      for (let r = row + 1; r < n; r += 1) if (Math.abs(N[r][col]) > Math.abs(N[best][col])) best = r;
      if (Math.abs(N[best][col]) < 1e-10 * scale) continue;
      [N[row], N[best]] = [N[best], N[row]];
      for (let r = 0; r < n; r += 1) {
        if (r === row) continue;
        const k = N[r][col] / N[row][col];
        for (let j = col; j <= n; j += 1) N[r][j] -= k * N[row][j];
      }
      pivots.push(col);
      row += 1;
    }
    pivots.forEach((col, row) => (solution[col] = N[row][n] / N[row][col]));
    const residual = Math.hypot(...G.map((row, r) => row.reduce((sum, g, i) => sum + g * solution[i], 0) - target[r]));
    return residual < 1e-7 * Math.max(1, Math.hypot(...target));
  }

  /** The equation a slide shows, wherever it shows it. */
  function shownEquation(slide: Slide): string {
    if (slide.kind === 'teach') throw new Error('a teach slide shows no equation');
    const candidates = slide.prompt.filter((block) => block.kind === 'display').map((block) => (block.kind === 'display' ? block.tex : ''));
    if (slide.kind === 'flow') candidates.push(slide.subject);
    if (slide.kind === 'tree') candidates.push(slide.expression);
    const found = candidates.map(oneLine).find((tex) => tex.startsWith("y''"));
    if (!found) throw new Error('no second-order equation shown');
    return found;
  }

  const stepsOf = (slide: Slide) => {
    if (slide.kind !== 'steps') throw new Error(`expected steps, got ${slide.kind}`);
    return slide;
  };

  const flowOf = (slide: Slide) => {
    if (slide.kind !== 'flow') throw new Error(`expected a flow, got ${slide.kind}`);
    return slide;
  };

  const choiceOf = (slide: Slide) => {
    if (slide.kind !== 'choice') throw new Error(`expected a choice, got ${slide.kind}`);
    expect(slide.options.length).toBe(4);
    return slide;
  };

  const strip = (label: string): string => label.replace(/^\$|\$$/g, '');

  /** The roots a label names, as numbers: `m = 2, \; m = 3`, `m = 2 (twice)`, `m = 1 \pm 2i`. */
  function rootsIn(label: string): { re: number; im: number }[] {
    const tex = strip(label);
    const complex = tex.match(/^m = (-?\d*) ?\\pm (\d*)i$/);
    if (complex) {
      const re = Number(complex[1] || 0);
      const im = Number(complex[2] || 1);
      return [{ re, im }, { re, im: -im }];
    }
    const reals = [...tex.matchAll(/m = (-?\d+)/g)].map((m) => Number(m[1]));
    return (tex.includes('twice') ? [reals[0], reals[0]] : reals).map((re) => ({ re, im: 0 }));
  }

  /** Whether a pair of roots is the pair of m^2 + bm + c = 0: they add to -b and multiply to c. */
  function areRoots(roots: { re: number; im: number }[], { b, c }: Forced): boolean {
    if (roots.length !== 2) return false;
    const [r, s] = roots;
    const sum = { re: r.re + s.re, im: r.im + s.im };
    const product = { re: r.re * s.re - r.im * s.im, im: r.re * s.im + r.im * s.re };
    return close(sum.re, -b) && close(sum.im, 0) && close(product.re, c) && close(product.im, 0);
  }

  /** The labels of a flow step other than the one on the path. */
  const others = (slide: ReturnType<typeof flowOf>, idx: number): string[] =>
    slide.steps[idx].branches.map((branch) => branch.label).filter((label) => label !== slide.answer[idx]);

  it('types the constant that balances a constant right side', () => {
    for (const { slide } of draws(g.deNhConstant as Generator<NonHomDe>)) {
      const eq = forcedOf(shownEquation(slide));
      expect(solves(`(${typed(slide)})`, eq)).toBe(true);
    }
  });

  it("differentiates a particular integral twice and puts it in, and every slip fails", () => {
    for (const { slide } of draws(g.deNhCheckSteps as Generator<NonHomDe>)) {
      const { start, reductions } = stepsOf(slide);
      const Y = fnOf(start[0]);
      const eq = forcedOf(shownEquation(slide));
      expect(solves(Y, eq)).toBe(true);
      const [first, second, last] = reductions;
      const matches = (line: string, order: 1 | 2) =>
        XS.every((x) => close(evalAt(fnOf(line), { x }), order === 1 ? derivativeAt(Y, 'x', { x }) : secondAt(Y, { x })));
      expect(matches(first.value, 1), first.value).toBe(true);
      for (const slip of first.bank) if (slip !== first.value) expect(matches(slip, 1), slip).toBe(false);
      expect(matches(second.value, 2), second.value).toBe(true);
      for (const slip of second.bank) if (slip !== second.value) expect(matches(slip, 2), slip).toBe(false);
      // The last line is the equation with y put in: the same left side, and a right side only the true one matches.
      const written = forcedOf(last.value);
      expect([written.b, written.c]).toEqual([eq.b, eq.c]);
      const gives = (line: string) => solves(Y, { ...eq, f: forcedOf(line).f });
      expect(gives(last.value)).toBe(true);
      for (const slip of last.bank) if (slip !== last.value) expect(gives(slip), slip).toBe(false);
      expect(last.bank.length).toBeGreaterThanOrEqual(3);
    }
  });

  it('marks the one particular integral among four', () => {
    for (const { slide } of draws(g.deNhWhichPi as Generator<NonHomDe>)) {
      const { options, correctId } = choiceOf(slide);
      const eq = forcedOf(shownEquation(slide));
      const right = options.filter((option) => solves(fnOf(option.label), eq));
      expect(right.map((option) => option.id)).toEqual([correctId]);
    }
  });

  it('walks to the complementary function and adds the particular integral, and every slip fails', () => {
    for (const { slide } of draws(g.deNhGeneralFlow as Generator<NonHomDe>)) {
      const flow = flowOf(slide);
      const eq = forcedOf(flow.subject);
      const aux = (label: string) => {
        const [l, r] = strip(label).split('=');
        const poly = (m: number) => evalAt(`(${l.replace(/(\d)\s*(?=m)/g, '$1 * ')}) - (${r})`, { m });
        return [-1.3, 0.4, 2.2].every((m) => close(poly(m), m * m + eq.b * m + eq.c));
      };
      expect(aux(flow.answer[0])).toBe(true);
      for (const label of others(flow, 0)) expect(aux(label), label).toBe(false);
      const cf = (label: string) => isGeneralWith(fnOf(strip(label)), homogeneous(eq));
      expect(cf(flow.answer[1])).toBe(true);
      for (const label of others(flow, 1)) expect(cf(label), label).toBe(false);
      const general = (label: string) => isGeneralWith(fnOf(strip(label)), eq);
      expect(general(flow.answer[2])).toBe(true);
      for (const label of others(flow, 2)) expect(general(label), label).toBe(false);
      for (const step of flow.steps) expect(step.branches.length).toBeGreaterThanOrEqual(2);
    }
  });

  it('offers exactly one trial function that can balance a polynomial right side', () => {
    for (const { slide } of draws(g.deNhPolyTrial as Generator<NonHomDe>)) {
      const { options, correctId } = choiceOf(slide);
      const eq = forcedOf(shownEquation(slide));
      const right = options.filter((option) => canFit(option.label, eq));
      expect(right.map((option) => option.id)).toEqual([correctId]);
    }
  });

  /** The polynomial particular integral a list of coefficients, top power first, makes. */
  const polyFrom = (values: number[]): string => values.map((v, i) => `(${v})*x^${values.length - 1 - i}`).join(' + ');

  it('compares coefficients to the polynomial particular integral, top power first', () => {
    for (const { slide } of draws(g.deNhPolyTree as Generator<NonHomDe>)) {
      const eq = forcedOf(shownEquation(slide));
      expect(solves(polyFrom(answerOf(slide).map(Number)), eq)).toBe(true);
    }
  });

  /** y'' + by' + cy of a trial with its letters free, as a function of the letters and x. */
  const trialLeft = (trial: string, eq: Forced, scope: Scope): number => leftAt(fnOf(trial), eq, scope);

  /** Letters to try a line of working at: nothing special about them. */
  const LETTERS: Scope[] = [
    { L: 1.3, M: -0.7, N: 2.1 },
    { L: -2.2, M: 0.4, N: -0.9 },
  ];

  /** Whether `lhs = rhs` is the trial's left side, collected, equal to f(x) — as functions of the letters and x. */
  function isCollected(line: string, trial: string, eq: Forced): boolean {
    const [lhs, rhs] = line.split(' = ');
    return LETTERS.every((letters) =>
      XS.every((x) => {
        const at = { ...letters, x };
        return close(evalAt(fnOf(lhs), at), trialLeft(trial, eq, at)) && close(evalAt(fnOf(rhs), at), evalAt(eq.f, at));
      }),
    );
  }

  /** The letters a line gives: `\lambda = 2, \; \mu = -1`. */
  const lettersOf = (line: string): Scope =>
    Object.fromEntries(
      [...line.matchAll(/\\(lambda|mu|nu) = (-?\d+)/g)].map((m) => [{ lambda: 'L', mu: 'M', nu: 'N' }[m[1]]!, Number(m[2])]),
    );

  /** A steps slide that puts a trial in, finds its letters and writes the particular integral: each line right, each slip wrong. */
  function checkTrialSteps(slide: Slide, collectedCheck: (line: string, trial: string, eq: Forced) => boolean) {
    const { start, reductions } = stepsOf(slide);
    const eq = forcedOf(shownEquation(slide));
    const trial = start[0].replace(/^y = /, '');
    const [collected, found, particular] = reductions;
    expect(collectedCheck(collected.value, trial, eq), collected.value).toBe(true);
    for (const slip of collected.bank) if (slip !== collected.value) expect(collectedCheck(slip, trial, eq), slip).toBe(false);
    const fits = (line: string) => solves(fnOf(trial), eq, { L: 0, M: 0, N: 0, ...lettersOf(line) });
    expect(fits(found.value), found.value).toBe(true);
    for (const slip of found.bank) if (slip !== found.value) expect(fits(slip), slip).toBe(false);
    expect(solves(fnOf(particular.value), eq), particular.value).toBe(true);
    for (const slip of particular.bank) if (slip !== particular.value) expect(solves(fnOf(slip), eq), slip).toBe(false);
    for (const step of reductions) expect(step.bank.length).toBeGreaterThanOrEqual(3);
  }

  it('puts a polynomial trial in, compares coefficients and writes the particular integral, and every slip fails', () => {
    for (const { slide } of draws(g.deNhPolySteps as Generator<NonHomDe>)) checkTrialSteps(slide, isCollected);
  });

  it('types the polynomial particular integral', () => {
    for (const { slide } of draws(g.deNhPolyPi as Generator<NonHomDe>)) {
      const eq = forcedOf(shownEquation(slide));
      expect(solves(typed(slide), eq)).toBe(true);
      expect(typed(slide)).not.toMatch(/e|sin|cos/);
    }
  });

  /** The trial a prompt names: the first `y = ...` holding a Greek letter. */
  const namedTrial = (slide: Slide): string => {
    const found = proseOf(slide).match(/\$y = ([^$]*\\(?:lambda|mu)[^$]*)\$/);
    if (!found) throw new Error('no trial named');
    return found[1];
  };

  it('finds lambda for an exponential trial', () => {
    for (const { slide } of draws(g.deNhExpValue as Generator<NonHomDe>)) {
      const eq = forcedOf(shownEquation(slide));
      expect(solves(fnOf(namedTrial(slide)), eq, { L: Number(typed(slide)) })).toBe(true);
    }
  });

  it('puts an exponential trial in, finds lambda and writes the particular integral, and every slip fails', () => {
    for (const { slide } of draws(g.deNhExpSteps as Generator<NonHomDe>)) checkTrialSteps(slide, isCollected);
  });

  /** The template filled with tokens. */
  const fill = (template: string, tokens: string[]): string => template.replace(/\{(\d)\}/g, (_, i: string) => tokens[Number(i)]);

  it('builds the general solution with an exponential particular integral, and no other tile fits', () => {
    for (const { slide } of draws(g.deNhExpGeneral as Generator<NonHomDe>)) {
      if (slide.kind !== 'tiles') throw new Error('expected tiles');
      const { template, answer, bank } = slide;
      const eq = forcedOf(shownEquation(slide));
      expect(isGeneralWith(fnOf(fill(template, answer)), eq)).toBe(true);
      for (let i = 0; i < answer.length; i += 1) {
        for (const token of bank) {
          if (token === answer[i]) continue;
          const other = answer.map((a, j) => (j === i ? token : a));
          expect(isGeneralWith(fnOf(fill(template, other)), eq), other.join(' ')).toBe(false);
        }
      }
      const squeezed = bank.map((token) => token.replace(/\s+/g, ''));
      expect(new Set(squeezed).size).toBe(bank.length);
    }
  });

  /** The walks shared by exponential and resonant right sides: the roots, the trial, then what it gives. */
  function checkTrialFlow(slide: Slide, last: 'value' | 'pi') {
    const flow = flowOf(slide);
    const eq = forcedOf(flow.subject);
    expect(areRoots(rootsIn(flow.answer[0]), eq)).toBe(true);
    for (const label of others(flow, 0)) expect(areRoots(rootsIn(label), eq), label).toBe(false);
    const trial = strip(flow.answer[1]).replace(/^y = /, '');
    expect(canFit(trial, eq)).toBe(true);
    for (const label of others(flow, 1)) expect(canFit(strip(label).replace(/^y = /, ''), eq), label).toBe(false);
    const gives = (label: string) =>
      last === 'value' ? solves(fnOf(trial), eq, { L: Number(strip(label)) }) : solves(fnOf(strip(label)), eq);
    expect(gives(flow.answer[2])).toBe(true);
    for (const label of others(flow, 2)) expect(gives(label), label).toBe(false);
    for (const step of flow.steps) expect(step.branches.length).toBeGreaterThanOrEqual(2);
  }

  it('walks to the roots, the exponential trial and lambda, and every slip fails', () => {
    for (const { slide } of draws(g.deNhExpFlow as Generator<NonHomDe>)) checkTrialFlow(slide, 'value');
  });

  it('offers exactly one trial function that can balance a trigonometric right side', () => {
    for (const { slide } of draws(g.deNhTrigTrial as Generator<NonHomDe>)) {
      const { options, correctId } = choiceOf(slide);
      const eq = forcedOf(shownEquation(slide));
      const right = options.filter((option) => canFit(option.label.replace(/^y = /, ''), eq));
      expect(right.map((option) => option.id)).toEqual([correctId]);
    }
  });

  /** The ω of a trial: `\cos 2x` gives 2. */
  const omegaOf = (trial: string): number => Number(trial.match(/\\cos (\d*)x/)![1] || 1);

  it('fills K and M, then lambda and mu, for a trigonometric right side', () => {
    for (const { slide } of draws(g.deNhTrigTree as Generator<NonHomDe>)) {
      const [K, M, L, Mu] = answerOf(slide).map(Number);
      const eq = forcedOf(shownEquation(slide));
      const trial = namedTrial(slide);
      const w = omegaOf(trial);
      expect(K).toBe(eq.c - w * w);
      expect(M).toBe(eq.b * w);
      expect(solves(fnOf(trial), eq, { L, M: Mu })).toBe(true);
    }
  });

  /**
   * The two equations comparing cosines and sines, as functions of λ and μ:
   * the cosine's coefficient of the left side is its value at 0, the sine's
   * its value at a quarter period.
   */
  function isCompared(line: string, trial: string, eq: Forced): boolean {
    const [first, second] = line.split(', \\; ');
    const quarter = Math.PI / (2 * omegaOf(trial));
    return LETTERS.every((letters) =>
      [
        [first, 0],
        [second, quarter],
      ].every(([equation, x]) => {
        const [lhs, rhs] = (equation as string).split(' = ');
        const at = { ...letters, x: x as number };
        return close(evalAt(fnOf(lhs), letters), trialLeft(trial, eq, at)) && close(Number(rhs), evalAt(eq.f, at));
      }),
    );
  }

  it('puts a trigonometric trial in, compares, solves and writes the particular integral, and every slip fails', () => {
    for (const { slide } of draws(g.deNhTrigSteps as Generator<NonHomDe>)) checkTrialSteps(slide, isCompared);
  });

  it('types lambda or mu for a trigonometric right side', () => {
    for (const { params, slide } of draws(g.deNhTrigPart as Generator<NonHomDe & { letter: 'lambda' | 'mu' }>)) {
      const eq = forcedOf(shownEquation(slide));
      const pi = params.pi.type === 'trig' ? params.pi : undefined;
      const letters = { L: pi!.lambda, M: pi!.mu, [params.letter === 'lambda' ? 'L' : 'M']: Number(typed(slide)) };
      expect(proseOf(slide)).toContain(`Find $\\${params.letter}$`);
      expect(solves(fnOf(namedTrial(slide)), eq, letters)).toBe(true);
    }
  });

  it('walks to the roots, the trial with its x, and the resonant particular integral, and every slip fails', () => {
    for (const { slide } of draws(g.deNhResFlow as Generator<NonHomDe>)) {
      const eq = forcedOf(shownEquation(slide));
      // Resonant: the plain trial, without its x, cannot balance the right side.
      const trial = strip(flowOf(slide).answer[1]).replace(/^y = /, '');
      expect(canFit(trial.replace(/x\^\{2\}(?=e)|x(?=e|\\)/g, ''), eq), trial).toBe(false);
      checkTrialFlow(slide, 'pi');
    }
  });

  it('types the coefficient of a resonant trial', () => {
    for (const { params, slide } of draws(g.deNhResValue as Generator<NonHomDe & { letter: 'lambda' | 'mu' }>)) {
      const eq = forcedOf(shownEquation(slide));
      const trial = namedTrial(slide);
      expect(canFit(trial.replace(/x\^\{2\}(?=e)|x(?=e|\\)/g, ''), eq), trial).toBe(false);
      const value = Number(typed(slide));
      const pi = params.pi;
      const letters: Scope =
        pi.type === 'trig' ? { L: pi.lambda, M: pi.mu, [params.letter === 'lambda' ? 'L' : 'M']: value } : { L: value };
      expect(solves(fnOf(trial), eq, letters)).toBe(true);
    }
  });

  /** The conditions a prompt states. */
  function statedConditions(text: string): [number, number] {
    const [, y0, v0] = text.match(/y\(0\) = (-?\d+), \\; y'\(0\) = (-?\d+)/)!;
    return [Number(y0), Number(v0)];
  }

  /** Both conditions, the gradient screened numerically before mathjs differentiates. */
  const meets = (Y: string, [y0, v0]: [number, number]): boolean =>
    close(evalAt(Y, { x: 0 }), y0) &&
    Math.abs(roughLeft(Y, { b: 0, c: 0 }, {}, 0).yp - v0) < 1e-6 * Math.max(1, Math.abs(v0)) &&
    close(derivativeAt(Y, 'x', { x: 0 }), v0);

  it('fills u and v, then A and B, and the solution meets the equation and both conditions', () => {
    for (const { slide } of draws(g.deNhIvpTree as Generator<NonHomIvp>)) {
      const [u, v, A, B] = answerOf(slide).map(Number);
      const eq = forcedOf(shownEquation(slide));
      const text = proseOf(slide);
      const general = fnOf(text.match(/general solution \$(y = [^$]*)\$/)![1]);
      expect(isGeneralWith(general, eq)).toBe(true);
      const Y = withAB(general, A, B);
      expect(solves(Y, eq)).toBe(true);
      const conditions = statedConditions(text);
      expect(meets(Y, conditions)).toBe(true);
      // u and v are what the complementary function alone gives at 0.
      const cf = `(${Y}) - (${withAB(general, 0, 0)})`;
      expect(close(evalAt(cf, { x: 0 }), u)).toBe(true);
      expect(close(derivativeAt(cf, 'x', { x: 0 }), v)).toBe(true);
    }
  });

  it('marks the one solution that meets the equation and both conditions', () => {
    for (const { slide } of draws(g.deNhIvpFit as Generator<NonHomIvp>)) {
      const { options, correctId } = choiceOf(slide);
      const eq = forcedOf(shownEquation(slide));
      const conditions = statedConditions(proseOf(slide));
      const right = options.filter((option) => {
        const Y = fnOf(option.label);
        return meets(Y, conditions) && solves(Y, eq);
      });
      expect(right.map((option) => option.id)).toEqual([correctId]);
    }
  });
});

describe('simple harmonic and damped motion', () => {
  /** A shown equation of motion as mathjs, with E for the second derivative and D for the first. */
  const motionToMath = (tex: string): [string, string] =>
    tex
      .replace(/\\ddot\{x\}/g, ' E ')
      .replace(/\\dot\{x\}/g, ' D ')
      .replace(/(\d)\s*(?=[EDx])/g, '$1 * ')
      .split('=') as [string, string];

  /** ẍ + kẋ + cx = 0 read off a shown equation: everything moved left, divided by what multiplies ẍ. */
  function motionOf(tex: string): { k: number; c: number } {
    const [lhs, rhs] = motionToMath(tex);
    const L = (E: number, D: number, x: number) => evalAt(`(${lhs}) - (${rhs})`, { E, D, x });
    const k0 = L(0, 0, 0);
    expect(close(k0, 0), tex).toBe(true);
    const kE = L(1, 0, 0) - k0;
    return { k: (L(0, 1, 0) - k0) / kE, c: (L(0, 0, 1) - k0) / kE };
  }

  /** A solution's TeX in t as mathjs, keeping A and B as letters. */
  function inT(tex: string): string {
    return tex
      .replace(/^x = /, '')
      .replace(/\\(cos|sin) (\d*)t/g, (_, fn: string, n: string) => ` ${fn}(${n || 1}*t) `)
      .replace(/e\^\{(-?)(\d*)t\}/g, (_, sign: string, n: string) => ` exp(${sign}${n || 1}*t) `)
      .replace(/([0-9ABt)])\s*(?=[ABt(]|exp|cos|sin)/g, '$1 * ');
  }

  const compiledT = new Map<string, { evaluate: (scope: Scope) => unknown }>();
  function secondInT(source: string, scope: Scope): number {
    let hit = compiledT.get(source);
    if (!hit) {
      hit = math.derivative(math.derivative(source, 't'), 't').compile();
      compiledT.set(source, hit);
    }
    return hit.evaluate({ ...scope }) as number;
  }

  /** Whether X(t) satisfies ẍ + kẋ + cx = 0 at every probe. */
  function solves(X: string, { k, c }: { k: number; c: number }, scope: Scope = {}): boolean {
    return TIMES.every((t) => {
      const at = { ...scope, t };
      const [xpp, xp, x] = [secondInT(X, at), derivativeAt(X, 't', at), evalAt(X, at)];
      const size = Math.max(1, Math.abs(xpp), Math.abs(k * xp), Math.abs(c * x));
      return Math.abs(xpp + k * xp + c * x) < 1e-9 * size;
    });
  }

  /** A general solution: A's part and B's part each solve it, and they are independent. */
  function isGeneral(X: string, coefficients: { k: number; c: number }): boolean {
    const partA = { A: 1, B: 0 };
    const partB = { A: 0, B: 1 };
    if (!solves(X, coefficients, partA) || !solves(X, coefficients, partB)) return false;
    const t = 0.3;
    const [fa, fb] = [evalAt(X, { ...partA, t }), evalAt(X, { ...partB, t })];
    const [da, db] = [derivativeAt(X, 't', { ...partA, t }), derivativeAt(X, 't', { ...partB, t })];
    return Math.abs(fa * db - fb * da) > 1e-6 * (Math.abs(fa * db) + Math.abs(fb * da));
  }

  const sameFn = (a: string, b: string): boolean => TIMES.every((t) => close(evalAt(a, { t }), evalAt(b, { t })));

  /** The greatest |x|, |ẋ| and |ẍ| over one period, from samples of the motion. */
  function extremes(X: string, period: number): { x: number; v: number; a: number } {
    let [x, v, a] = [0, 0, 0];
    for (let i = 0; i <= 4000; i += 1) {
      const at = { t: (period * i) / 4000 };
      x = Math.max(x, Math.abs(evalAt(X, at)));
      v = Math.max(v, Math.abs(derivativeAt(X, 't', at)));
      a = Math.max(a, Math.abs(secondInT(X, at)));
    }
    return { x, v, a };
  }

  const near = (sampled: number, exact: number) => Math.abs(sampled - exact) < 1e-4 * Math.max(1, exact);

  const strip = (label: string): string => label.replace(/^\$|\$$/g, '');

  const displays = (slide: Slide): string[] =>
    slide.kind === 'teach' ? [] : slide.prompt.flatMap((block) => (block.kind === 'display' ? [block.tex] : []));

  /** The equation of motion a slide shows. */
  function shownMotion(slide: Slide): string {
    const candidates = [...displays(slide)];
    if (slide.kind === 'flow') candidates.push(slide.subject);
    if (slide.kind === 'tree') candidates.push(slide.expression);
    const found = candidates.find((tex) => tex.includes('\\ddot{x}'));
    if (!found) throw new Error('no equation of motion shown');
    return found;
  }

  /** A multiple of π as a number. */
  const piValue = (tex: string): number => evalAt(texToMath(tex.replace(/(\d)\\pi/g, '$1 * pi').replace(/\\pi/g, 'pi')), {});

  /** A polynomial in m on the left of `= 0`, compared by value. */
  const samePoly = (a: string, b: string): boolean =>
    [-1.3, 0.4, 2.2].every((m) => {
      const value = (line: string) => {
        const [l, r] = line.replace(/(\d)\s*m/g, '$1 * m').split('=');
        return evalAt(`(${l}) - (${r})`, { m });
      };
      return close(value(a), value(b));
    });

  const auxLine = ({ k, c }: { k: number; c: number }): string => `m^2 + (${k}) * m + (${c}) = 0`;

  const stepsOf = (slide: Slide) => {
    if (slide.kind !== 'steps') throw new Error(`expected steps, got ${slide.kind}`);
    return slide;
  };

  const tilesOf = (slide: Slide) => {
    if (slide.kind !== 'tiles') throw new Error(`expected tiles, got ${slide.kind}`);
    return slide;
  };

  const choiceOf = (slide: Slide) => {
    if (slide.kind !== 'choice') throw new Error(`expected a choice, got ${slide.kind}`);
    return slide;
  };

  const fill = (template: string, tokens: string[]): string => template.replace(/\{(\d)\}/g, (_, i: string) => tokens[Number(i)]);

  function oneOff(answer: string[], bank: string[]): string[][] {
    return answer.flatMap((_, i) => bank.filter((token) => token !== answer[i]).map((token) => answer.map((a, j) => (j === i ? token : a))));
  }

  /** The conditions a prompt states. */
  function motionConditions(text: string): [number, number] {
    const [, x0, v0] = text.match(/x\(0\) = (-?\d+), \\; \\dot\{x\}\(0\) = (-?\d+)/)!;
    return [Number(x0), Number(v0)];
  }

  const meets = (X: string, [x0, v0]: [number, number]): boolean =>
    close(evalAt(X, { t: 0 }), x0) && close(derivativeAt(X, 't', { t: 0 }), v0);

  const DAMPING = ['Over-damped', 'Critically damped', 'Under-damped'];
  const dampingOf = ({ k, c }: { k: number; c: number }): string => {
    const D = k * k - 4 * c;
    return DAMPING[Math.abs(D) < 1e-9 ? 1 : D > 0 ? 0 : 2];
  };

  it('types the ω of simple harmonic motion', () => {
    for (const { slide } of draws(g.deShmOmega as Generator<SecondDe>)) {
      const { k, c } = motionOf(shownMotion(slide));
      const w = Number(typed(slide));
      expect(k).toBe(0);
      expect(w).toBeGreaterThan(0);
      expect(close(w * w, c)).toBe(true);
    }
  });

  it('walks to m² + ω² = 0, the roots ±ωi, and a general solution, with every other branch wrong', () => {
    for (const { slide } of draws(g.deShmAux as Generator<SecondDe>)) {
      if (slide.kind !== 'flow') throw new Error('expected a flow');
      const eq = motionOf(slide.subject);
      expect(eq.k).toBe(0);
      const [aux, roots, general] = slide.answer;
      expect(samePoly(strip(aux), auxLine(eq))).toBe(true);
      for (const branch of slide.steps[0].branches) if (branch.label !== aux) expect(samePoly(strip(branch.label), auxLine(eq))).toBe(false);
      const omegaOf = (label: string): number | undefined => {
        const found = strip(label).match(/^m = \\pm (\d*)i$/);
        return found ? Number(found[1] || 1) : undefined;
      };
      expect(omegaOf(roots)! ** 2).toBe(eq.c);
      for (const branch of slide.steps[1].branches) if (branch.label !== roots) expect(omegaOf(branch.label) ?? 0).not.toBe(Math.sqrt(eq.c));
      expect(isGeneral(inT(strip(general)), eq)).toBe(true);
      for (const branch of slide.steps[2].branches) if (branch.label !== general) expect(isGeneral(inT(strip(branch.label)), eq), branch.label).toBe(false);
    }
  });

  it('places the general solution of SHM, and no other tile fits', () => {
    for (const { slide } of draws(g.deShmGeneral as Generator<SecondDe>)) {
      const { template, answer, bank } = tilesOf(slide);
      const eq = motionOf(shownMotion(slide));
      expect(isGeneral(inT(fill(template, answer)), eq)).toBe(true);
      for (const other of oneOff(answer, bank)) expect(isGeneral(inT(fill(template, other)), eq), other.join(' ')).toBe(false);
    }
  });

  it('differentiates a wave twice to ẍ = -ω²x, with every slip wrong', () => {
    for (const { slide } of draws(g.deShmVerifySteps as Generator<WaveParams>)) {
      const { start, reductions } = stepsOf(slide);
      const X = inT(start[0]);
      const rhs = (line: string) => line.split(' = ')[1];
      const velocity = (line: string) => TIMES.every((t) => close(evalAt(inT(rhs(line)), { t }), derivativeAt(X, 't', { t })));
      const acceleration = (line: string) => TIMES.every((t) => close(evalAt(inT(rhs(line)), { t }), secondInT(X, { t })));
      const law = (line: string) =>
        TIMES.every((t) => close(evalAt(rhs(line).replace(/(\d)x/, '$1 * x'), { x: evalAt(X, { t }) }), secondInT(X, { t })));
      const checks = [velocity, acceleration, law];
      reductions.forEach((step, idx) => {
        expect(checks[idx](step.value), step.value).toBe(true);
        for (const slip of step.bank) if (slip !== step.value) expect(checks[idx](slip), slip).toBe(false);
      });
    }
  });

  it('marks the period 2π/ω, held to samples of the motion, or the equation with a stated period', () => {
    for (const { slide } of draws(g.deShmPeriod as Generator<PeriodParams>)) {
      const { options, correctId } = choiceOf(slide);
      const text = proseOf(slide);
      const stated = text.match(/of period \$([^$]*)\$/);
      if (stated) {
        const T = piValue(stated[1]);
        const right = options.filter((option) => close(Math.sqrt(motionOf(option.label).c) * T, 2 * Math.PI));
        expect(right.map((option) => option.id)).toEqual([correctId]);
        continue;
      }
      const shown = displays(slide)[0];
      const X = shown.includes('\\ddot{x}') ? `cos(${Math.sqrt(motionOf(shown).c)} * t)` : inT(shown);
      // T is a period, and no whole fraction of it is: the least time after which the motion repeats.
      const repeats = (T: number) => TIMES.every((t) => close(evalAt(X, { t: t + T }), evalAt(X, { t })));
      const isPeriod = (T: number) => repeats(T) && Array.from({ length: 30 }, (_, j) => j + 2).every((j) => !repeats(T / j));
      const right = options.filter((option) => isPeriod(piValue(option.label)));
      expect(right.map((option) => option.id)).toEqual([correctId]);
    }
  });

  /** The motion a prompt describes: its equation and how it starts. */
  function describedMotion(slide: Slide): { X: string; period: number } {
    const { c } = motionOf(shownMotion(slide));
    const w = Math.sqrt(c);
    const text = proseOf(slide);
    const rest = text.match(/released from rest at \$x = (-?\d+)\$/);
    const centre = text.match(/passes through \$x = 0\$ with speed \$(\d+)\$/);
    const X = rest ? `(${rest[1]}) * cos(${w} * t)` : `(${Number(centre![1]) / w}) * sin(${w} * t)`;
    return { X, period: (2 * Math.PI) / w };
  }

  it('types a greatest speed, amplitude or acceleration that samples of the motion reach', () => {
    for (const { slide } of draws(g.deShmSpeed as Generator<SpeedParams>)) {
      if (slide.kind !== 'expression') throw new Error('expected an expression');
      const { X, period } = describedMotion(slide);
      expect(solves(X, motionOf(shownMotion(slide)))).toBe(true);
      const most = extremes(X, period);
      const value = Number(slide.answer);
      const lead = slide.lead ?? '';
      const want = lead.startsWith('v') ? most.v : lead.startsWith('a') ? most.x : most.a;
      expect(near(want, value), `${lead} ${value} vs ${want}`).toBe(true);
    }
  });

  it('fills ω, the amplitude, and the greatest speed and acceleration of a released particle', () => {
    for (const { slide } of draws(g.deShmMotionTree as Generator<SpeedParams>)) {
      const [w, a, speed, accel] = answerOf(slide).map(Number);
      const { X, period } = describedMotion(slide);
      expect(close(w * w, motionOf(shownMotion(slide)).c)).toBe(true);
      const most = extremes(X, period);
      expect(near(most.x, a)).toBe(true);
      expect(near(most.v, speed)).toBe(true);
      expect(near(most.a, accel)).toBe(true);
    }
  });

  it('types the x(t) that solves its equation and starts as stated', () => {
    for (const { slide } of draws(g.deShmRelease as Generator<ReleaseParams>)) {
      const X = typed(slide);
      expect(solves(X, motionOf(shownMotion(slide)))).toBe(true);
      expect(meets(X, motionConditions(proseOf(slide)))).toBe(true);
    }
  });

  /** The wave a phase slide writes out. */
  const waveShown = (slide: Slide): string => inT(displays(slide).find((tex) => tex.startsWith('x = '))!);

  /** R cos(ωt - α) with α from tan α, α taken between -π/2 and π/2 since the cosine's coefficient is positive. */
  const singleWave = (R: number, w: number, tan: number, sign = -1, fn = 'cos'): string => `${R} * ${fn}(${w} * t + (${sign}) * ${Math.atan(tan)})`;

  const omegaIn = (tex: string): number => Number(tex.match(/\\(?:cos|sin) (\d*)t/)![1] || 1);

  it('types R, the amplitude that samples of the wave reach', () => {
    for (const { slide } of draws(g.deShmPhaseR as Generator<PhaseParams>)) {
      const X = waveShown(slide);
      const w = omegaIn(displays(slide)[0]);
      expect(near(extremes(X, (2 * Math.PI) / w).x, Number(typed(slide)))).toBe(true);
    }
  });

  it('marks the tan α that puts the wave in the form R cos(ωt - α), and no other', () => {
    for (const { slide } of draws(g.deShmPhaseTan as Generator<PhaseParams>)) {
      const { options, correctId } = choiceOf(slide);
      const X = waveShown(slide);
      const w = omegaIn(displays(slide)[0]);
      const R = Math.sqrt(evalAt(X, { t: 0 }) ** 2 + (derivativeAt(X, 't', { t: 0 }) / w) ** 2);
      const right = options.filter((option) => sameFn(singleWave(R, w, evalAt(texToMath(option.label), {})), X));
      expect(right.map((option) => option.id)).toEqual([correctId]);
    }
  });

  it('compares, finds R and tan α, and writes the single cosine, with every slip wrong', () => {
    for (const { slide } of draws(g.deShmPhaseSteps as Generator<PhaseParams>)) {
      const { start, reductions } = stepsOf(slide);
      const X = inT(start[0]);
      const w = omegaIn(start[0]);
      const compared = (line: string) => {
        const [, a, b] = line.match(/R\\cos \\alpha = (-?\d+), \\; R\\sin \\alpha = (-?\d+)/)!;
        return close(Number(a), evalAt(X, { t: 0 })) && close(Number(b) * w, derivativeAt(X, 't', { t: 0 }));
      };
      const found = (line: string) => {
        const [, R, tan] = line.match(/R = (\d+), \\; \\tan \\alpha = (.*)$/)!;
        return sameFn(singleWave(Number(R), w, evalAt(texToMath(tan), {})), X);
      };
      const [, , tanTex] = reductions[1].value.match(/R = (\d+), \\; \\tan \\alpha = (.*)$/)!;
      const tan = evalAt(texToMath(tanTex), {});
      const single = (line: string) => {
        const [, R, fn, sign] = line.match(/^(\d*)\\(cos|sin)\(\d*t ([+-]) \\alpha\)$/)!;
        return sameFn(singleWave(Number(R || 1), w, tan, sign === '-' ? -1 : 1, fn), X);
      };
      const checks = [compared, found, single];
      reductions.forEach((step, idx) => {
        expect(checks[idx](step.value), step.value).toBe(true);
        for (const slip of step.bank) if (slip !== step.value) expect(checks[idx](slip), slip).toBe(false);
      });
    }
  });

  it('places R and ωt for the wave or the start given, and no other tile fits', () => {
    for (const { slide } of draws(g.deShmPhaseTiles as Generator<PhaseParams>)) {
      const { template, answer, bank } = tilesOf(slide);
      const text = proseOf(slide);
      let X: string;
      if (text.includes('x(0)')) {
        const eq = motionOf(shownMotion(slide));
        const w = Math.sqrt(eq.c);
        const [x0, v0] = motionConditions(text);
        X = `(${x0}) * cos(${w} * t) + (${v0 / w}) * sin(${w} * t)`;
        expect(solves(X, eq)).toBe(true);
      } else {
        X = waveShown(slide);
      }
      // α is fixed by the wave itself, so the tiles have to supply R and ωt.
      const w0 = Math.sqrt(-secondInT(X, { t: 0 }) / evalAt(X, { t: 0 }));
      const tan = derivativeAt(X, 't', { t: 0 }) / w0 / evalAt(X, { t: 0 });
      const matches = (tokens: string[]) => {
        const [, R, n] = fill(template, tokens).match(/^x = (\d+)\\cos\((\d*)t - \\alpha\)$/) ?? [];
        return R !== undefined && sameFn(singleWave(Number(R), Number(n || 1), tan), X);
      };
      expect(matches(answer)).toBe(true);
      for (const other of oneOff(answer, bank)) expect(matches(other), other.join(' ')).toBe(false);
    }
  });

  it('walks to the auxiliary equation, k² - 4ω², and the damping its own discriminant decides', () => {
    for (const { slide } of draws(g.deDampCase as Generator<SecondDe>)) {
      if (slide.kind !== 'flow') throw new Error('expected a flow');
      const eq = motionOf(slide.subject);
      expect(eq.k).toBeGreaterThan(0);
      const [aux, disc, kind] = slide.answer;
      expect(samePoly(strip(aux), auxLine(eq))).toBe(true);
      for (const branch of slide.steps[0].branches) if (branch.label !== aux) expect(samePoly(strip(branch.label), auxLine(eq))).toBe(false);
      const D = eq.k ** 2 - 4 * eq.c;
      expect(close(Number(strip(disc)), D)).toBe(true);
      for (const branch of slide.steps[1].branches) if (branch.label !== disc) expect(close(Number(strip(branch.label)), D)).toBe(false);
      expect(kind).toBe(dampingOf(eq));
    }
  });

  it('types the least k that stops the oscillation: critical there, oscillating just below', () => {
    for (const { slide } of draws(g.deDampLeast as Generator<LeastKParams>)) {
      const shown = displays(slide)[0];
      const [, m, s] = shown.match(/^(\d*)\\ddot\{x\} \+ k\\dot\{x\} \+ (\d+)x = 0$/)!;
      const [mass, spring] = [Number(m || 1), Number(s)];
      const k = Number(typed(slide));
      expect(dampingOf({ k: k / mass, c: spring / mass })).toBe('Critically damped');
      expect(dampingOf({ k: (k - 0.5) / mass, c: spring / mass })).toBe('Under-damped');
    }
  });

  it('fills the discriminant and the roots of the damped auxiliary equation', () => {
    for (const { slide } of draws(g.deDampRootsTree as Generator<SecondDe>)) {
      if (slide.kind !== 'tree') throw new Error('expected a tree');
      const eq = motionOf(slide.expression);
      const [D, ...roots] = slide.answer.map(Number);
      expect(close(D, eq.k ** 2 - 4 * eq.c)).toBe(true);
      if (slide.nodes[1].id === 'alpha') {
        expect(close(roots[0], -eq.k / 2)).toBe(true);
        expect(close(roots[1], Math.sqrt(4 * eq.c - eq.k ** 2) / 2)).toBe(true);
      } else {
        for (const r of roots) expect(close(r * r + eq.k * r + eq.c, 0)).toBe(true);
        if (roots.length === 2) expect(roots[0]).toBeLessThan(roots[1]);
        else expect(D).toBe(0);
      }
      expect(roots.every((r, i) => slide.nodes[1].id === 'alpha' && i === 1 ? r > 0 : r < 0)).toBe(true);
    }
  });

  it('marks the one equation damped the way asked', () => {
    for (const { slide } of draws(g.deDampWhich as Generator<WhichDampParams>)) {
      const { options, correctId } = choiceOf(slide);
      const asked = DAMPING.find((kind) => proseOf(slide).includes(kind.toLowerCase()))!;
      const right = options.filter((option) => dampingOf(motionOf(option.label)) === asked);
      expect(right.map((option) => option.id)).toEqual([correctId]);
    }
  });

  it('places the general solution of a damped equation, and no other tile fits', () => {
    for (const { slide } of draws(g.deDampGeneral as Generator<SecondDe>)) {
      const { template, answer, bank } = tilesOf(slide);
      const eq = motionOf(shownMotion(slide));
      expect(isGeneral(inT(fill(template, answer)), eq)).toBe(true);
      for (const other of oneOff(answer, bank)) expect(isGeneral(inT(fill(template, other)), eq), other.join(' ')).toBe(false);
    }
  });

  it('fills the roots and constants of the solution that meets x(0) and ẋ(0)', () => {
    for (const { slide } of draws(g.deDampIvpTree as Generator<SecondIvp>)) {
      if (slide.kind !== 'tree') throw new Error('expected a tree');
      const eq = motionOf(slide.expression);
      const ids = slide.nodes.map((node) => node.id).join(',');
      const values = slide.answer.map(Number);
      const X =
        ids === 'p,A,B'
          ? `((${values[1]}) + (${values[2]}) * t) * exp((${values[0]}) * t)`
          : ids === 'p,q,A,B'
            ? `(${values[2]}) * exp((${values[0]}) * t) + (${values[3]}) * exp((${values[1]}) * t)`
            : `exp((${values[0]}) * t) * ((${values[2]}) * cos((${values[1]}) * t) + (${values[3]}) * sin((${values[1]}) * t))`;
      expect(solves(X, eq), X).toBe(true);
      expect(meets(X, motionConditions(proseOf(slide)))).toBe(true);
    }
  });

  it('types the constant the conditions fix, or the starting velocity of a damped motion', () => {
    for (const { slide } of draws(g.deDampConstant as Generator<SecondIvp & { velocity: boolean }>)) {
      if (slide.kind !== 'expression') throw new Error('expected an expression');
      const value = Number(slide.answer);
      if (slide.lead === '\\dot{x}(0) =') {
        const X = inT(displays(slide)[0]);
        expect(close(derivativeAt(X, 't', { t: 0 }), value)).toBe(true);
        continue;
      }
      const text = proseOf(slide);
      const general = inT(text.match(/general solution of this equation is \$(x = [^$]*)\$/)![1]);
      const eq = motionOf(shownMotion(slide));
      expect(isGeneral(general, eq)).toBe(true);
      // Solve x(0) and ẋ(0) for A and B from the two parts of the general solution.
      const [x0, v0] = motionConditions(text);
      const part = (A: number, B: number) => [evalAt(general, { A, B, t: 0 }), derivativeAt(general, 't', { A, B, t: 0 })];
      const [[a1, a2], [b1, b2]] = [part(1, 0), part(0, 1)];
      const det = a1 * b2 - b1 * a2;
      const A = (x0 * b2 - b1 * v0) / det;
      const B = (a1 * v0 - x0 * a2) / det;
      expect(close(slide.lead === 'A =' ? A : B, value)).toBe(true);
    }
  });

  it('marks the equation whose own damping matches the curve drawn', () => {
    for (const { params, slide } of draws(g.deDampGraph as Generator<DampGraphParams>)) {
      const { options, correctId } = choiceOf(slide);
      const eq = motionOf(options.find((option) => option.id === correctId)!.label);
      const D = eq.k ** 2 - 4 * eq.c;
      if (params.shown === 'undamped') expect(eq.k).toBe(0);
      if (params.shown === 'under') expect(eq.k > 0 && D < 0).toBe(true);
      if (params.shown === 'growing') expect(eq.k < 0 && D < 0).toBe(true);
      if (params.shown === 'still') expect(eq.k > 0 && D >= 0).toBe(true);
      // The curve drawn: heights read back from the SVG, against the axis line.
      const svg = choiceOf(slide).prompt.find((block) => block.kind === 'diagram');
      if (svg?.kind !== 'diagram') throw new Error('expected a graph');
      const axis = Number(svg.svg.match(/<line x1="[\d.]+" y1="([\d.]+)"/)![1]);
      const path = svg.svg.match(/stroke-width="2" d="M ([^"]*)"/)![1];
      const heights = path.split(' L ').map((point) => axis - Number(point.split(',')[1]));
      const crossings = heights.slice(1).filter((h, i) => Math.sign(h) !== Math.sign(heights[i]) && h !== 0).length;
      if (params.shown === 'still') expect(crossings).toBe(0);
      else expect(crossings).toBeGreaterThanOrEqual(3);
      const quarter = Math.floor(heights.length / 4);
      const early = Math.max(...heights.slice(0, quarter).map(Math.abs));
      const late = Math.max(...heights.slice(-quarter).map(Math.abs));
      if (params.shown === 'under') expect(late).toBeLessThan(early / 2);
      if (params.shown === 'growing') expect(late).toBeGreaterThan(early * 2);
      if (params.shown === 'undamped') expect(late / early).toBeGreaterThan(0.8);
    }
  });
});
