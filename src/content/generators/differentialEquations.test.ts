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
