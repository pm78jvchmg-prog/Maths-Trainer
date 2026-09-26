/**
 * An independent check on the mathematics behind Models of Populations and
 * Money (Differential Equations, Level 10).
 *
 * Nothing here is a plain derivative in x, so the sweep's oracle never looks
 * at these slides. Instead each answer is worked out again from the numbers
 * the question shows: a solution is differentiated by mathjs and put back into
 * its equation, and a value at a time is recomputed with `Math.exp` rather
 * than with the powers of 2 the generator builds it from. Every seed, both
 * difficulties.
 */
import { describe, expect, it, vi } from 'vitest';
import { makeRng } from '../../engine/rng';
import { math } from '../../engine/expression';
import type { Generator, Slide } from '../types';
import {
  deModelGens as g,
  doseAnswer,
  interestRate,
  money,
  type DoseParams,
  type DoseWhenParams,
  type DripParams,
  type DripSliderParams,
  type FateParams,
  type HalfLifeParams,
  type HarvestLevelParams,
  type HarvestParams,
  type InterestParams,
  type LevelParams,
  type MaxParams,
  type ReachParams,
  type SaveParams,
  type SaveStepsParams,
  type TimesParams,
  type YearlyParams,
} from './deModels';

const SEEDS = 200;

vi.setConfig({ testTimeout: 120_000 });

function draws<P>(generator: Generator<P>): { params: P; slide: Slide; difficulty: number }[] {
  return [1, 2].flatMap((difficulty) =>
    Array.from({ length: SEEDS }, (_, seed) => {
      const params = generator.sample(makeRng(seed), difficulty);
      return { params, slide: generator.render(params), difficulty };
    }),
  );
}

type Scope = Record<string, number>;
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

const evalAt = (source: string, scope: Scope = {}): number => compile(source).evaluate({ ...scope }) as number;
const derivativeAt = (source: string, scope: Scope): number => compile(source, 't').evaluate({ ...scope }) as number;
const close = (a: number, b: number) => Math.abs(a - b) < 1e-7 * Math.max(1, Math.abs(a), Math.abs(b));

/** y(t) satisfies dy/dt = rhs(y) at several times. */
function satisfies(solution: string, rhs: string): boolean {
  return [-0.7, 0.3, 1.1, 2.4].every((t) => close(derivativeAt(solution, { t }), evalAt(rhs, { y: evalAt(solution, { t }) })));
}

const answerOf = (slide: Slide): string[] => {
  if (slide.kind === 'tiles' || slide.kind === 'tree' || slide.kind === 'flow') return slide.answer;
  throw new Error(`expected tiles, a tree or a flow, got ${slide.kind}`);
};

const typed = (slide: Slide): number => {
  if (slide.kind !== 'expression') throw new Error(`expected an expression slide, got ${slide.kind}`);
  return Number(slide.answer);
};

const sliderOf = (slide: Slide) => {
  if (slide.kind !== 'slider') throw new Error(`expected a slider, got ${slide.kind}`);
  return slide;
};

const textOf = (slide: Slide): string =>
  slide.kind === 'teach'
    ? ''
    : slide.prompt.map((block) => (block.kind === 'prose' ? block.text : block.kind === 'display' ? block.tex : '')).join(' ');

/** The displayed equation's right-hand side, in y, for mathjs. */
function rhsOf(slide: Slide, sym: string): string {
  const shown = slide.kind === 'flow' ? slide.subject : slide.kind === 'teach' ? '' : slide.prompt.find((b) => b.kind === 'display')?.kind === 'display' ? (slide.prompt.find((b) => b.kind === 'display') as { tex: string }).tex : '';
  return toMath(shown.replace(/^.*?= /, ''), sym);
}

/** A little TeX as mathjs, enough for these equations and solutions, with the letter renamed y. */
function toMath(tex: string, sym: string): string {
  let out = tex
    .replace(/\\ln (\d+(\.\d+)?)/g, 'log($1)')
    .replace(/\\frac\{([^{}]*)\}\{([^{}]*)\}/g, '(($1)/($2))')
    .replace(/e\^\{([^{}]*?)t\}/g, 'e^(($1)*t)')
    .replace(/\(\)\*t/g, '(1)*t')
    .replace(/\(-\)\*t/g, '(-1)*t')
    .replace(/\{/g, '(')
    .replace(/\}/g, ')');
  // Not \b: in `0.05A` the digit and the letter are both word characters.
  out = out.replace(new RegExp(`(?<![A-Za-z])${sym}(?![A-Za-z])`, 'g'), 'y');
  // Implicit products: 0.05y, 10000e^, )y, )(.
  return out.replace(/(\d)\s*(y|e\^|\()/g, '$1*$2').replace(/\)\s*(y|\()/g, ')*$1');
}

/** A solution line `A = 60000 - 10000e^{0.05t}` as mathjs in t. */
const solutionOf = (line: string): string => toMath(line.replace(/^[A-Za-z] = /, ''), '#');

/** Pounds as written in prose back to a number. */
const pounds = (text: string): number[] => [...text.matchAll(/£([\d,]+)/g)].map((m) => Number(m[1].replace(/,/g, '')));

describe('continuous interest', () => {
  it('builds the start times e^{rt}, which solves dA/dt = rA with the stated rate', () => {
    for (const { params, slide } of draws(g.deModelInterestTiles as Generator<InterestParams>)) {
      const [start, exp] = answerOf(slide);
      const solution = `${start} * ${toMath(exp, '#')}`;
      const k = interestRate(params);
      // The rate the prose states, read back from it.
      const stated = Number(/(\d+)%/.exec(textOf(slide))![1]) / 100;
      expect(Math.abs(k)).toBeCloseTo(stated, 12);
      expect(k < 0).toBe(/loses value/.test(textOf(slide)));
      expect(satisfies(solution, `${k} * y`)).toBe(true);
      expect(close(evalAt(solution, { t: 0 }), pounds(textOf(slide))[0])).toBe(true);
    }
  });

  it('counts the doublings, their factor and the value, as e^{kt} gives it', () => {
    for (const { params, slide } of draws(g.deModelDoubleTree as Generator<TimesParams>)) {
      const [n, factor, value] = answerOf(slide).map(Number);
      const rhs = rhsOf(slide, 'A');
      const k = evalAt(rhs, { y: 1 });
      const T = Number(/t = (\d+)/.exec(slide.kind === 'tree' ? slide.expression : '')![1]);
      expect(close(Math.exp(k * T), factor)).toBe(true);
      expect(close(params.start * Math.exp(k * T), value)).toBe(true);
      expect(close(params.b ** n, factor)).toBe(true);
      expect(satisfies(`${params.start} * e^(${k} * t)`, rhs)).toBe(true);
    }
  });

  it('types the balance that the yearly-rate equation gives', () => {
    for (const { params, slide } of draws(g.deModelYearly as Generator<YearlyParams>)) {
      const rhs = rhsOf(slide, 'A');
      const k = evalAt(rhs, { y: 1 });
      expect(close(k, Math.log(1 + params.pct / 100))).toBe(true);
      const solution = `${params.A0} * e^(${k} * t)`;
      expect(satisfies(solution, rhs)).toBe(true);
      expect(close(evalAt(solution, { t: params.t }), typed(slide))).toBe(true);
      expect(Number.isInteger(typed(slide))).toBe(true);
      expect(pounds(textOf(slide))[0]).toBe(params.A0);
    }
  });

  it('slides to the first time the value reaches the dashed line', () => {
    for (const { params, slide } of draws(g.deModelReachSlider as Generator<ReachParams>)) {
      const s = sliderOf(slide);
      const k = evalAt(rhsOf(slide, params.grow ? 'A' : 'V'), { y: 1 });
      const [start, target] = pounds(textOf(slide));
      const at = (t: number) => start * Math.exp(k * t);
      expect(close(at(s.answer), target)).toBe(true);
      // One step earlier it has not got there yet.
      expect(params.grow ? at(s.answer - 1) < target : at(s.answer - 1) > target).toBe(true);
    }
  });
});

describe('saving and spending', () => {
  it('builds interest plus what is paid in, minus what is taken out', () => {
    for (const { params, slide } of draws(g.deModelSaveTiles as Generator<SaveParams>)) {
      const [r, c] = answerOf(slide);
      const rhs = `${r} * y ${c}`;
      const [, , a, b] = [0, ...pounds(textOf(slide))];
      const flows = /paid in and/.test(textOf(slide)) ? a - b : /paid in/.test(textOf(slide)) ? a : -a;
      expect(params.paidIn - params.takenOut).toBe(flows);
      for (const y of [0, 1000, 55555]) expect(close(evalAt(rhs, { y }), (params.pct / 100) * y + flows)).toBe(true);
    }
  });

  it('types the balance at which the rate is zero', () => {
    for (const { params, slide } of draws(g.deModelSaveLevel as Generator<LevelParams>)) {
      const A = typed(slide);
      const text = textOf(slide);
      const out = params.words ? pounds(text)[0] : Number(/- (\d+)$/.exec(text.replace(/ What.*$/, ''))![1]);
      expect(close((params.pct / 100) * A - out, 0)).toBe(true);
    }
  });

  it('solves to a balance that meets the equation and the start, and takes out the rate correctly', () => {
    for (const { params, slide } of draws(g.deModelSaveSteps as Generator<SaveStepsParams>)) {
      if (slide.kind !== 'steps') throw new Error('expected steps');
      const rhs = toMath(slide.start[0].replace(/^.*?= /, ''), 'A');
      const A0 = Number(/= (\d+)/.exec(slide.start[2])![1]);
      const last = slide.reductions[slide.reductions.length - 1].value;
      const solution = solutionOf(last);
      expect(satisfies(solution, rhs)).toBe(true);
      expect(close(evalAt(solution, { t: 0 }), A0)).toBe(true);
      if (params.expanded) {
        const factored = toMath(slide.reductions[0].value.replace(/^.*?= /, ''), 'A');
        for (const y of [0, 777, 40000]) expect(close(evalAt(factored, { y }), evalAt(rhs, { y }))).toBe(true);
      }
    }
  });
});

/** Where y' = r y - c ends up from y0: the closed form, read without the generator's labels. */
function fateOf(rhs: string, y0: number): 'grows' | 'ends' | 'stays' {
  const r = evalAt(rhs, { y: 1 }) - evalAt(rhs, { y: 0 });
  const L = -evalAt(rhs, { y: 0 }) / r;
  const y = (t: number) => L + (y0 - L) * Math.exp(r * t);
  if (close(y0, L)) return 'stays';
  // Below the level it crosses zero at a finite time.
  if (y0 < L) {
    const tZero = Math.log(L / (L - y0)) / r;
    expect(Math.abs(y(tZero))).toBeLessThan(1e-6);
    return 'ends';
  }
  expect(y(10 / r)).toBeGreaterThan(y0);
  return 'grows';
}

describe('funds and populations over time', () => {
  for (const [name, generator, sym] of [
    ['fund', g.deModelSaveFlow, 'A'],
    ['population', g.deModelHarvestFlow, 'P'],
  ] as const) {
    it(`walks to where the ${name} ends up`, () => {
      for (const { params, slide } of draws(generator as Generator<FateParams>)) {
        const rhs = rhsOf(slide, sym);
        const [level, sign, verdict] = answerOf(slide);
        const L = Number(/= (\d+)/.exec(level)![1]);
        expect(close(evalAt(rhs, { y: L }), 0)).toBe(true);
        const rate0 = evalAt(rhs, { y: params.y0 });
        expect(sign).toBe(rate0 > 0 ? 'Positive' : rate0 < 0 ? 'Negative' : 'Zero');
        const fate = fateOf(rhs, params.y0);
        const said = /faster and faster$/.test(verdict) ? 'grows' : /(runs|dies) out$/.test(verdict) ? 'ends' : /stays exactly/.test(verdict) ? 'stays' : verdict;
        expect(said).toBe(fate);
      }
    });
  }
});

describe('harvesting a population', () => {
  it('builds growth minus the catch plus what is added', () => {
    for (const { params, slide } of draws(g.deModelHarvestTiles as Generator<HarvestParams>)) {
      const [r, c] = answerOf(slide);
      const text = textOf(slide);
      const pct = Number(/(\d+)% of itself/.exec(text)![1]);
      const caught = Number(/(\d+) a year are (caught|culled|trapped|taken out)/.exec(text)![1]);
      const added = /and (\d+) a year are/.exec(text)?.[1];
      expect(params.pct).toBe(pct);
      for (const y of [0, 500, 3333]) {
        expect(close(evalAt(`${r} * y ${c}`, { y }), (pct / 100) * y - caught + Number(added ?? 0))).toBe(true);
      }
    }
  });

  it('types the population at which the rate is zero', () => {
    for (const { params, slide } of draws(g.deModelHarvestLevel as Generator<HarvestLevelParams>)) {
      const text = textOf(slide);
      const H = params.words ? Number(/and (\d+) a year/.exec(text)![1]) : Number(/- (\d+)/.exec(text)![1]);
      expect(close((params.pct / 100) * typed(slide) - H, 0)).toBe(true);
    }
  });

  it('marks the catch, or the population, at which the rate is exactly zero', () => {
    for (const { params, slide } of draws(g.deModelHarvestMax as Generator<MaxParams>)) {
      if (slide.kind !== 'choice') throw new Error('expected a choice');
      const marked = Number(slide.options.find((o) => o.id === slide.correctId)!.label);
      const r = params.pct / 100;
      const text = textOf(slide);
      if (params.reverse) {
        const H = Number(/(\d+) a year are to be/.exec(text)![1]);
        expect(close(r * marked - H, 0)).toBe(true);
        // Any smaller population falls.
        expect(r * (marked - 1) - H).toBeLessThan(0);
      } else {
        const P0 = Number(/holds (\d+)/.exec(text)![1]);
        expect(close(r * P0 - marked, 0)).toBe(true);
        expect(r * P0 - (marked + 1)).toBeLessThan(0);
      }
    }
  });
});

describe('a drug in the bloodstream', () => {
  it('halves to the value e^{-kt} gives', () => {
    for (const { params, slide } of draws(g.deModelHalveTree as Generator<TimesParams>)) {
      const [n, factor, value] = answerOf(slide).map(Number);
      const rhs = rhsOf(slide, 'C');
      const k = evalAt(rhs, { y: 1 });
      expect(k).toBeLessThan(0);
      const T = Number(/t = (\d+)/.exec(slide.kind === 'tree' ? slide.expression : '')![1]);
      expect(close(Math.exp(-k * T), factor)).toBe(true);
      expect(close(params.start * Math.exp(k * T), value)).toBe(true);
      expect(2 ** n).toBe(factor);
      expect(Number.isInteger(value)).toBe(true);
    }
  });

  it('finds the half-life and k from the two readings', () => {
    for (const { slide } of draws(g.deModelHalflifeTree as Generator<HalfLifeParams>)) {
      if (slide.kind !== 'tree') throw new Error('expected a tree');
      const [, C0, T, C1] = /C\(0\) = (\d+) \\qquad C\((\d+)\) = (\d+)/.exec(slide.expression)!.map(Number);
      const [ratio, n, h, kTex] = slide.answer;
      expect(Number(ratio)).toBe(C0 / C1);
      const k = Math.log(C0 / C1) / T;
      expect(close(evalAt(toMath(kTex, '#')), k)).toBe(true);
      // Half-life: e^{-kh} = 1/2.
      expect(close(Math.exp(-k * Number(h)), 0.5)).toBe(true);
      expect(Number(n) * Number(h)).toBe(T);
    }
  });

  it('types the time the amount falls to the level asked', () => {
    for (const { params, slide } of draws(g.deModelDoseWhen as Generator<DoseWhenParams>)) {
      const k = evalAt(rhsOf(slide, 'C'), { y: 1 });
      const text = textOf(slide);
      const C0 = Number(/(\d+) mg/.exec(text)![1]);
      const C1 = Number(/are (\d+) mg left/.exec(text)![1]);
      expect(C1).toBe(params.C1);
      expect(close(C0 * Math.exp(k * typed(slide)), C1)).toBe(true);
    }
  });

  it('slides to what is left after the second dose, decaying on top', () => {
    for (const { params, slide } of draws(g.deModelDoseSlider as Generator<DoseParams>)) {
      const s = sliderOf(slide);
      const k = evalAt(rhsOf(slide, 'C'), { y: 1 });
      const text = textOf(slide);
      const C0 = Number(/(\d+) mg/.exec(text)![1]);
      const [, T1, D, T2] = /At \$t = (\d+)\$ a second dose of (\d+) mg is given\. Slide to the amount at \$t = (\d+)\$/.exec(text)!.map(Number);
      const expected = (C0 * Math.exp(k * T1) + D) * Math.exp(k * (T2 - T1));
      expect(close(expected, s.answer)).toBe(true);
      expect(s.answer).toBe(doseAnswer(params));
      expect(s.answer % s.step).toBe(0);
    }
  });
});

describe('a steady drip', () => {
  it('builds in at a steady rate, out in proportion', () => {
    for (const { params, slide } of draws(g.deModelDripTiles as Generator<DripParams>)) {
      if (slide.kind !== 'tiles') throw new Error('expected tiles');
      const [a, b] = slide.answer;
      const shape = params.hard ? `${a} * (${b} - y)` : `${a} - ${b} * y`;
      const text = textOf(slide);
      const R = Number(/(puts|carries|stocked with|takes in) (\d+)/.exec(text)![2]);
      const pct = Number(/(\d+)%/.exec(text)![1]);
      for (const y of [0, 17, 90]) expect(close(evalAt(shape, { y }), R - (pct / 100) * y)).toBe(true);
    }
  });

  it('types the level at which in and out balance', () => {
    for (const { params, slide } of draws(g.deModelDripLevel as Generator<DripParams>)) {
      expect(close(params.R - (params.pct / 100) * typed(slide), 0)).toBe(true);
      expect(textOf(slide)).toContain(`${params.R}`);
    }
  });

  it('solves to an amount that meets the equation and the start', () => {
    for (const { slide } of draws(g.deModelDripSteps as Generator<DripParams>)) {
      if (slide.kind !== 'steps') throw new Error('expected steps');
      const sym = /d(\w)\}/.exec(slide.start[0])![1];
      const rhs = toMath(slide.start[0].replace(/^.*?= /, ''), sym);
      const start = Number(/= (\d+)/.exec(slide.start[2])![1]);
      const factored = toMath(slide.reductions[0].value.replace(/^.*?= /, ''), sym);
      for (const y of [0, 13, 250]) expect(close(evalAt(factored, { y }), evalAt(rhs, { y }))).toBe(true);
      const solution = solutionOf(slide.reductions[3].value);
      expect(satisfies(solution, rhs)).toBe(true);
      expect(close(evalAt(solution, { t: 0 }), start)).toBe(true);
    }
  });

  it('slides to the amount the solution reaches at the dashed line', () => {
    for (const { slide } of draws(g.deModelDripSlider as Generator<DripSliderParams>)) {
      const s = sliderOf(slide);
      const text = textOf(slide);
      const sym = /\\frac\{d(\w)\}/.exec(text)![1];
      const rhs = rhsOf(slide, sym);
      const start = Number(new RegExp(`${sym}\\(0\\) = (\\d+)`).exec(text)![1]);
      const T = Number(/at \$t = (\d+)\$/.exec(text)![1]);
      const k = evalAt(rhs, { y: 0 }) - evalAt(rhs, { y: 1 });
      const L = evalAt(rhs, { y: 0 }) / k;
      const solution = `${L} + (${start - L}) * e^(${-k} * t)`;
      expect(satisfies(solution, rhs)).toBe(true);
      expect(close(evalAt(solution, { t: T }), s.answer)).toBe(true);
    }
  });
});

describe('money in prose', () => {
  it('separates thousands', () => {
    expect(money(12000)).toBe('£12,000');
    expect(money(500)).toBe('£500');
    expect(money(1102.5)).toBe('£1,102.50');
  });
});
