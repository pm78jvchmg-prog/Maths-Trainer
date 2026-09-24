/**
 * The Series Expansions generators, checked against mathjs's own calculus.
 *
 * The generic sweep in `generators.test.ts` proves each slide agrees with
 * itself: the bank holds the answer, the checker accepts it. It would pass a
 * series with a factorial missing, a sign that fails to alternate, or a Taylor
 * coefficient taken about the wrong point. So here every answer is read back
 * off the rendered slide — the tiles placed, the tree filled, the value typed,
 * the option marked correct, the last value of a line of working — and each
 * coefficient is compared with `f^(n)(a)/n!`, where mathjs differentiates the
 * function `n` times itself. None of the generator's own coefficient
 * arithmetic is used to decide what is right.
 */
import { describe, expect, it } from 'vitest';
import { makeRng } from '../../engine/rng';
import { checkAnswer } from '../../engine/equivalence';
import { math } from '../../engine/expression';
import type { Generator, Slide } from '../types';
import {
  centreOf,
  fact,
  fnSource,
  hTex,
  numeratorSource,
  seriesByName as g,
  taylorSource,
  type Fn,
} from './seriesExpansions';

const SEEDS = 120;

function draws<P>(generator: Generator<P>, seeds = SEEDS): { params: P; slide: Slide; seed: number }[] {
  return [1, 2].flatMap((difficulty) =>
    Array.from({ length: seeds }, (_, seed) => {
      const params = generator.sample(makeRng(seed), difficulty);
      return { params, slide: generator.render(params), seed };
    }),
  );
}

const close = (a: number, b: number) => Math.abs(a - b) < 1e-9 * Math.max(1, Math.abs(a), Math.abs(b));

/** `f^(n)(a)/n!` for n = 0..upTo, by differentiating the source n times with mathjs. */
const taylorCache = new Map<string, number[]>();
function taylor(source: string, upTo: number, at = 0, simplify = false): number[] {
  const key = `${source}@${at}#${upTo}#${simplify}`;
  const cached = taylorCache.get(key);
  if (cached) return cached;
  const out: number[] = [];
  let node = math.parse(source);
  // Unsimplified derivatives keep terms like 0 * x^(-1), which are NaN at
  // exactly 0; a hair away from 0 they are 0, and nothing else moves. Left
  // unsimplified the tree also doubles at each quotient, so the long runs
  // (fourteen derivatives of ln(1 + x)) simplify as they go instead.
  const x = at === 0 ? 1e-40 : at;
  for (let n = 0; n <= upTo; n += 1) {
    out.push((node.evaluate({ x }) as number) / fact(n));
    node = math.derivative(node, 'x', { simplify });
  }
  taylorCache.set(key, out);
  return out;
}

const maclaurin = (f: Fn, upTo: number, simplify = false) => taylor(fnSource(f), upTo, 0, simplify);

/** A number as TeX writes it: `-\frac{4}{3}`, `- 3`, `(-\frac{1}{2})`, `12`. */
function texNumber(tex: string): number {
  const t = tex.replace(/[()\s]/g, '');
  const frac = /^([+-]?)\\frac\{(\d+)\}\{(\d+)\}$/.exec(t);
  if (frac) return (frac[1] === '-' ? -1 : 1) * (Number(frac[2]) / Number(frac[3]));
  const n = Number(t);
  if (!Number.isFinite(n)) throw new Error(`not a number: ${tex}`);
  return n;
}

/** A term as a tile writes it: `+ \frac{4}{3}x^{3}`, `- x`, `2x^{2}`, `5`, `+ \frac{1}{4}(x - 4)^{2}`. */
function texTerm(tex: string, v = 'x'): { c: number; p: number } {
  const t = tex.replace(/\s/g, '');
  const escaped = v.replace(/\s/g, '').replace(/[()\\^{}+-]/g, (ch) => `\\${ch}`);
  const re = new RegExp(`^([+-]?)(\\\\frac\\{(\\d+)\\}\\{(\\d+)\\}|\\d+)?(${escaped}(\\^\\{(\\d+)\\})?)?$`);
  const m = re.exec(t);
  if (!m || (m[2] === undefined && m[5] === undefined)) throw new Error(`not a term: ${tex}`);
  const sign = m[1] === '-' ? -1 : 1;
  const size = m[2] === undefined ? 1 : m[3] !== undefined ? Number(m[3]) / Number(m[4]) : Number(m[2]);
  const p = m[5] === undefined ? 0 : m[7] === undefined ? 1 : Number(m[7]);
  return { c: sign * size, p };
}

/** A whole series as an option writes it, split into its terms. */
function texSeries(tex: string, v = 'x'): { c: number; p: number }[] {
  const body = tex.replace(/\+\s*\\cdots$/, '').trim();
  const parts = body.split(/\s(?=[+-]\s)/);
  return parts.map((part) => texTerm(part, v));
}

const placed = (slide: Slide): string[] => {
  if (slide.kind !== 'tiles') throw new Error(`expected tiles, got ${slide.kind}`);
  return slide.answer;
};

const filled = (slide: Slide): number[] => {
  if (slide.kind !== 'tree') throw new Error(`expected a tree, got ${slide.kind}`);
  return slide.answer.map(texNumber);
};

/** The value a steps slide ends on. */
const lastValue = (slide: Slide): number => {
  if (slide.kind !== 'steps') throw new Error(`expected steps, got ${slide.kind}`);
  return texNumber(slide.reductions[slide.reductions.length - 1].value);
};

const typed = (slide: Slide): string => {
  if (slide.kind !== 'expression') throw new Error(`expected an expression, got ${slide.kind}`);
  return slide.answer;
};

const typedNumber = (slide: Slide): number => math.evaluate(typed(slide)) as number;

const picked = (slide: Slide): string => {
  if (slide.kind !== 'choice') throw new Error(`expected a choice, got ${slide.kind}`);
  return slide.options.find((o) => o.id === slide.correctId)!.label;
};

const proseOf = (slide: Slide): string =>
  slide.kind === 'teach'
    ? ''
    : slide.prompt.map((block) => (block.kind === 'prose' ? block.text : block.kind === 'display' ? block.tex : '')).join(' ');

/** Each placed term matches the true coefficient, and they are the first non-zero terms in order. */
function expectLeadingTerms(terms: { c: number; p: number }[], truth: number[], from = 0) {
  const expected = truth
    .map((c, p) => ({ c, p }))
    .filter(({ c, p }) => p >= from && Math.abs(c) > 1e-12)
    .slice(0, terms.length);
  expect(terms.map((t) => t.p)).toEqual(expected.map((t) => t.p));
  terms.forEach((t, i) => expect(close(t.c, expected[i].c), `x^${t.p}: ${t.c} against ${expected[i].c}`).toBe(true));
}

describe('level 1 series, checked against mathjs derivatives', { timeout: 120_000 }, () => {
  it('ser-coef-tree fills f\'(0), f\'\'(0), f\'\'\'(0), then f\'\'(0)/2! and f\'\'\'(0)/3!', () => {
    for (const { params, slide } of draws(g.coefTree)) {
      const t = maclaurin(params.f, 3);
      const [d1, d2, d3, c2, c3] = filled(slide);
      expect([d1, d2, d3].every((d, i) => close(d, t[i + 1] * fact(i + 1)))).toBe(true);
      expect(close(c2, t[2]) && close(c3, t[3])).toBe(true);
    }
  });

  it('ser-coef-typed types f^(n)(0)/n!', () => {
    for (const { params, slide } of draws(g.coefTyped)) {
      const value = typedNumber(slide);
      if (params.f) {
        expect(close(value, maclaurin(params.f, params.n)[params.n])).toBe(true);
      } else {
        // Read the derivative back out of the prompt, not the params.
        const name = params.n <= 3 ? `f${"'".repeat(params.n)}(0)` : `f^{(${params.n})}(0)`;
        const at = proseOf(slide).indexOf(`$${name} = `);
        const given = Number(/= (-?\d+)\$/.exec(proseOf(slide).slice(at))![1]);
        expect(close(value, given / fact(params.n))).toBe(true);
      }
    }
  });

  it('ser-first-terms-tiles places the first four non-zero terms', () => {
    for (const { params, slide } of draws(g.firstTermsTiles)) {
      const terms = placed(slide).map((tok) => texTerm(tok));
      const truth = params.f ? maclaurin(params.f, 6) : params.derivs!.map((d, p) => d / fact(p));
      expectLeadingTerms(terms, truth);
    }
  });

  it('ser-which-flow finds the constant term exactly when every derivative exists', () => {
    for (const { params, slide } of draws(g.whichFlow)) {
      if (slide.kind !== 'flow') throw new Error('expected flow');
      if (params.rough === 'ln' || params.rough === 'recip') expect(slide.answer).toEqual(['No']);
      else if (params.rough) expect(slide.answer).toEqual(['Yes', 'No']);
      else {
        const f0 = math.evaluate(fnSource(params.good!), { x: 0 }) + params.shift;
        expect(slide.answer.slice(0, 2)).toEqual(['Yes', 'Yes']);
        expect(texNumber(slide.answer[2].replace(/\$/g, ''))).toBe(f0);
      }
    }
  });

  it('ser-exp-tiles places the terms after the constant', () => {
    for (const { params, slide } of draws(g.expTiles)) {
      const truth = maclaurin(params.f, 5);
      expect(slide.kind === 'tiles' && slide.template.startsWith(`f(x) = ${truth[0]} `)).toBe(true);
      expectLeadingTerms(placed(slide).map((tok) => texTerm(tok)), truth, 1);
    }
  });

  it('ser-exp-steps ends on the x^n coefficient', () => {
    for (const { params, slide } of draws(g.expSteps)) {
      const source = `(${params.a})*exp((${params.k.n}/${params.k.d})*x)`;
      expect(close(lastValue(slide), taylor(source, params.n)[params.n])).toBe(true);
    }
  });

  it('ser-exp-term types the x^n term', () => {
    for (const { params, slide, seed } of draws(g.expTerm)) {
      const c = maclaurin(params.f, params.n)[params.n];
      expect(checkAnswer(typed(slide), `(${c})*x^${params.n}`, { seed }).status).toBe('correct');
    }
  });

  it('ser-exp-slider answers with the polynomial at the marked x', () => {
    for (const { params, slide } of draws(g.expSlider)) {
      if (slide.kind !== 'slider') throw new Error('expected slider');
      const t = taylor(`exp(${params.k}*x)`, params.deg);
      const value = t.reduce((total, c, p) => total + c * params.a ** p, 0);
      expect(close(slide.answer, value)).toBe(true);
    }
  });

  it('ser-trig-tiles places the first three terms', () => {
    for (const { params, slide } of draws(g.trigTiles)) {
      expectLeadingTerms(placed(slide).map((tok) => texTerm(tok)), maclaurin(params.f, 6));
    }
  });

  it('ser-trig-sign-flow says No exactly when the coefficient is zero, and its sign otherwise', () => {
    for (const { params, slide } of draws(g.trigSignFlow)) {
      if (slide.kind !== 'flow') throw new Error('expected flow');
      const t = maclaurin(params.f, 7);
      const c = t[params.n];
      if (Math.abs(c) < 1e-12) {
        expect(slide.answer).toEqual(['No']);
        continue;
      }
      const place = t.slice(0, params.n + 1).filter((v) => Math.abs(v) > 1e-12).length;
      expect(slide.answer).toEqual(['Yes', ['1st', '2nd', '3rd', '4th'][place - 1], c > 0 ? 'Positive' : 'Negative']);
    }
  });

  it('ser-trig-cycle-tree fills f(0) to f^(4)(0)', () => {
    for (const { params, slide } of draws(g.trigCycleTree)) {
      const t = taylor(`${params.a}*sin(${params.k}*x) + ${params.b}*cos(${params.k}*x)`, 4);
      filled(slide).forEach((d, i) => expect(close(d, t[i] * fact(i))).toBe(true));
    }
  });

  it('ser-trig-pick marks the true series correct, and no distractor is it', () => {
    for (const { params, slide } of draws(g.trigPick)) {
      if (slide.kind !== 'choice') throw new Error('expected choice');
      const truth = maclaurin(params.f, 6);
      expectLeadingTerms(texSeries(picked(slide)), truth);
      for (const option of slide.options) {
        if (option.id === slide.correctId) continue;
        const terms = texSeries(option.label);
        const matches = terms.every((t) => close(t.c, truth[t.p] ?? 0));
        expect(matches, `distractor ${option.label} is the series`).toBe(false);
      }
    }
  });

  it('ser-log-tiles places ln a and the terms of the series', () => {
    for (const { params, slide } of draws(g.logTiles)) {
      const tokens = placed(slide);
      if (params.a !== undefined) {
        expect(tokens[0]).toBe(`\\ln ${params.a}`);
        const truth = taylor(`log(${params.a} + (${params.b})*x)`, 6);
        expect(close(truth[0], Math.log(params.a))).toBe(true);
        expectLeadingTerms(tokens.slice(1).map((tok) => texTerm(tok)), truth, 1);
      } else {
        expectLeadingTerms(tokens.map((tok) => texTerm(tok)), maclaurin(params.f!, 6));
      }
    }
  });

  it('ser-log-coef types the x^n coefficient', () => {
    for (const { params, slide } of draws(g.logCoefGen)) {
      const source =
        params.k !== undefined
          ? `log(1 + (${params.k})*x)`
          : `log(1 + (${params.a})*x) ${params.quotient ? '-' : '+'} log(1 + (${params.b})*x)`;
      expect(close(typedNumber(slide), taylor(source, params.n)[params.n])).toBe(true);
    }
  });

  it('ser-log-valid-flow says Yes exactly when the partial sums settle on f(x)', () => {
    for (const { params, slide } of draws(g.logValidFlow)) {
      if (slide.kind !== 'flow') throw new Error('expected flow');
      const x = texNumber(/x = (.+)$/.exec(slide.subject)![1]);
      const ln = params.form.startsWith('ln');
      const u = (params.form.endsWith('-') ? -1 : 1) * params.k * x * (params.form.startsWith('geo') ? -1 : 1);
      // ln(1 + kx) and ln(1 - kx) are ln(1 + u); 1/(1 - kx) and 1/(1 + kx) are 1/(1 - u).
      const f = ln ? Math.log(1 + u) : 1 / (1 - u);
      const term = (j: number) => (ln ? ((j % 2 === 1 ? 1 : -1) * u ** j) / j : u ** j);
      let sum = ln ? 0 : 1;
      for (let j = 1; j <= 20000; j += 1) sum += term(j);
      const settles = Number.isFinite(f) && Math.abs(sum - f) < 1e-3;
      expect(slide.answer[2], `u = ${u}`).toBe(settles ? 'Yes' : 'No');
      expect(texNumber(slide.answer[1].replace(/\$/g, ''))).toBeCloseTo(ln ? u : u, 9);
    }
  });

  it('ser-log-range picks the interval whose inside the series converges on', () => {
    for (const { params, slide } of draws(g.logRange)) {
      const label = picked(slide);
      if (params.form === 'pow') {
        expect(label).toBe('\\text{all real } x');
        continue;
      }
      const m = /^(.+?) (<|\\le) x (<|\\le) (.+)$/.exec(label)!;
      const [lo, hi] = [texNumber(m[1]), texNumber(m[4])];
      const k = params.k.n / params.k.d;
      const ln = params.form !== 'geo';
      // Just inside each end the series converges; just outside it does not.
      const converges = (x: number) => {
        const u = k * x;
        return ln ? u > -1 && u <= 1 + 1e-12 : Math.abs(u) < 1;
      };
      expect(converges(lo + 1e-6) && converges(hi - 1e-6)).toBe(true);
      expect(converges(lo - 1e-6) || converges(hi + 1e-6)).toBe(false);
      expect(converges(lo)).toBe(m[2] === '\\le');
      expect(converges(hi)).toBe(m[3] === '\\le');
    }
  });

  it('ser-sub-tiles places the first three terms of x^r f(c x^m)', () => {
    for (const { params, slide } of draws(g.subTiles, 80)) {
      const source = `x^${params.r} * ${fnSource(params.f)}`;
      expectLeadingTerms(placed(slide).map((tok) => texTerm(tok)), taylor(source, 7));
    }
  });

  it('ser-sub-tree ends on the two x coefficients', () => {
    for (const { params, slide } of draws(g.subTree, 80)) {
      const values = filled(slide);
      const t = maclaurin(params.f, params.f.m * (params.j + 1));
      expect(close(values[4], t[params.f.m * params.j])).toBe(true);
      expect(close(values[5], t[params.f.m * (params.j + 1)])).toBe(true);
    }
  });

  it('ser-multiply-steps ends on the x^n coefficient of the product', () => {
    for (const { params, slide } of draws(g.multiplySteps)) {
      const t = taylor(`${fnSource(params.f)} * ${fnSource(params.g)}`, params.n);
      expect(close(lastValue(slide), t[params.n])).toBe(true);
    }
  });

  it('ser-product-coef types the x^n coefficient of the product', () => {
    for (const { params, slide } of draws(g.productCoefGen)) {
      const t = taylor(`${fnSource(params.f)} * ${fnSource(params.g)}`, params.n);
      expect(close(typedNumber(slide), t[params.n])).toBe(true);
    }
  });
});

/** The first `count` non-zero coefficients, with their powers. */
const nonZeroTerms = (coefs: number[], count: number, from = 0) =>
  coefs
    .map((c, p) => ({ c, p }))
    .filter(({ c, p }) => p >= from && Math.abs(c) > 1e-12)
    .slice(0, count);

/** A centre or value as an option writes it: `16`, `\pi`, `\frac{\pi}{2}`, `e`, `1.1`. */
const texPoint = (tex: string): number =>
  tex === '\\pi' ? Math.PI : tex === '\\frac{\\pi}{2}' ? Math.PI / 2 : tex === 'e' ? Math.E : texNumber(tex);

/**
 * Where a series about `centre` is valid, found from the function itself: the
 * radius is the distance to the nearest point where it blows up, and an end is
 * included only where the function is still finite and the series still
 * converges there (the alternating ln end).
 */
function validity(source: string, centre: number, singular: number, lnLike: boolean) {
  const R = Math.abs(singular - centre);
  const other = singular < centre ? centre + R : centre - R;
  const f = (x: number) => math.evaluate(source, { x }) as number;
  expect(Number.isFinite(f(singular)), `${source} is finite at ${singular}`).toBe(false);
  return {
    lo: centre - R,
    hi: centre + R,
    loIn: lnLike && other < centre,
    hiIn: lnLike && other > centre,
  };
}

/** The function, centre and nearest singular point for a range question. */
function lineCase(form: string, k: number, a: number): { source: string; centre: number; singular: number; lnLike: boolean } {
  switch (form) {
    case 'ln':
      return { source: `log(1 + ${k}*x)`, centre: 0, singular: -1 / k, lnLike: true };
    case 'geo':
      return { source: `1/(1 - ${k}*x)`, centre: 0, singular: 1 / k, lnLike: false };
    case 'lnShift':
      return { source: `log(${a} + ${k * a}*x)`, centre: 0, singular: -1 / k, lnLike: true };
    case 'geoShift':
      return { source: `1/(${a} - ${k * a}*x)`, centre: 0, singular: 1 / k, lnLike: false };
    case 'lnTaylor':
      return { source: `log(x + ${1 - a})`, centre: a, singular: a - 1, lnLike: true };
    default:
      return { source: `1/(x + ${1 - a})`, centre: a, singular: a - 1, lnLike: false };
  }
}

/** `-\frac{1}{2} < x \le \frac{1}{2}` read back. */
function readRange(tex: string) {
  const m = /^(.+?) (<|\\le) x (<|\\le) (.+)$/.exec(tex.replace(/\$/g, '').trim())!;
  return { lo: texNumber(m[1]), hi: texNumber(m[4]), loIn: m[2] === '\\le', hiIn: m[3] === '\\le' };
}

function expectRange(got: { lo: number; hi: number; loIn: boolean; hiIn: boolean }, want: ReturnType<typeof validity>) {
  expect(close(got.lo, want.lo) && close(got.hi, want.hi), `${JSON.stringify(got)} against ${JSON.stringify(want)}`).toBe(true);
  expect([got.loIn, got.hiIn]).toEqual([want.loIn, want.hiIn]);
}

describe('level 2 series, checked against mathjs derivatives', { timeout: 120_000 }, () => {
  it('ser-taylor-tree fills the derivatives at a, then the coefficients', () => {
    for (const { params, slide } of draws(g.taylorTree)) {
      const t = taylor(taylorSource(params.t), 3, centreOf(params.t));
      const [d1, d2, d3, c2, c3] = filled(slide);
      expect([d1, d2, d3].every((d, i) => close(d, t[i + 1] * fact(i + 1)))).toBe(true);
      expect(close(c2, t[2]) && close(c3, t[3])).toBe(true);
    }
  });

  it('ser-taylor-tiles places the first terms in powers of (x - a)', () => {
    for (const { params, slide } of draws(g.taylorTiles)) {
      const truth = taylor(taylorSource(params.t), 5, centreOf(params.t));
      expectLeadingTerms(placed(slide).map((tok) => texTerm(tok, hTex(params.t))), truth);
    }
  });

  it('ser-taylor-coef types f^(n)(a)/n!', () => {
    for (const { params, slide } of draws(g.taylorCoef)) {
      expect(close(typedNumber(slide), taylor(taylorSource(params.t), params.n, centreOf(params.t))[params.n])).toBe(true);
    }
  });

  it('ser-taylor-centre picks the closest point where the function is known exactly', () => {
    const whole = (x: number) => Number.isInteger(x);
    // Where each function and all its derivatives have exact values, and a series exists.
    const known: [RegExp, (x: number) => boolean][] = [
      [/\\sqrt\[3\]\{x\}/, (x) => x > 0 && Math.round(Math.cbrt(x)) ** 3 === x],
      [/\\sqrt\{x\}/, (x) => x > 0 && whole(Math.sqrt(x))],
      [/\\ln x/, (x) => close(x, 1) || close(x, Math.E)],
      [/\\frac\{1\}\{x\}/, (x) => x !== 0 && whole(x)],
      [/\\sin x/, (x) => whole(Math.round((2 * x) / Math.PI)) && close((2 * x) / Math.PI, Math.round((2 * x) / Math.PI))],
    ];
    for (const { slide } of draws(g.taylorCentre)) {
      if (slide.kind !== 'choice') throw new Error('expected choice');
      const prose = proseOf(slide);
      // The number under the root (or inside the log) is what a centre is measured from.
      const value = math.evaluate(/estimate \$(.+?)\$ from/.exec(prose)![1].replace(/\\sqrt\[3\]\{(.+?)\}/, '$1').replace(/\\sqrt\{(.+?)\}/, '$1').replace(/\\ln /, '').replace(/\\sin /, '').replace(/\\frac\{1\}\{(.+?)\}/, '$1')) as number;
      const fnTex = /series of \$(.+?)\$/.exec(prose)![1];
      const nice = known.find(([re]) => re.test(fnTex))![1];
      const points = slide.options.map((o) => ({ id: o.id, x: texPoint(o.label.replace('x = ', '')) }));
      const usable = points.filter((p) => nice(p.x) && !close(p.x, value));
      const best = usable.reduce((a, b) => (Math.abs(b.x - value) < Math.abs(a.x - value) ? b : a));
      expect(best.id, prose).toBe(slide.correctId);
    }
  });

  it('ser-estimate-tree adds the first terms of the true series at h', () => {
    for (const { params, slide } of draws(g.estimateTree)) {
      const h = params.h.n / params.h.d;
      const terms = nonZeroTerms(maclaurin(params.f, 9), params.count);
      const values = filled(slide);
      terms.forEach(({ c, p }, i) => expect(close(values[i], c * h ** p)).toBe(true));
      expect(close(values[values.length - 1], terms.reduce((s, { c, p }) => s + c * h ** p, 0))).toBe(true);
    }
  });

  it('ser-dropped-term types the next non-zero term at h', () => {
    for (const { params, slide } of draws(g.droppedTerm)) {
      const h = params.h.n / params.h.d;
      const next = nonZeroTerms(maclaurin(params.f, 10, true), params.count + 1)[params.count];
      expect(close(typedNumber(slide), next.c * h ** next.p)).toBe(true);
    }
  });

  it('ser-estimate-pick counts terms until the next one is small enough', () => {
    for (const { params, slide } of draws(g.estimatePick, 60)) {
      const h = params.h.n / params.h.d;
      const terms = nonZeroTerms(maclaurin(params.f, 14, true), 20);
      let n = 1;
      while (Math.abs(terms[n].c * h ** terms[n].p) >= 10 ** -params.places) n += 1;
      expect(Number(picked(slide))).toBe(n);
    }
  });

  it('ser-estimate-slider stops where the first term left out meets the bound', () => {
    for (const { params, slide } of draws(g.estimateSlider)) {
      if (slide.kind !== 'slider') throw new Error('expected slider');
      // The first term left out, from the true series.
      const kept = nonZeroTerms(maclaurin(fnOfBase(params.base), 7), 8).filter((t) => t.p < params.p);
      const next = nonZeroTerms(maclaurin(fnOfBase(params.base), 7), kept.length + 1)[kept.length];
      expect(next.p).toBe(params.p);
      const bound = texNumber(/at most \$(.+)\$\.$/.exec(proseOf(slide))![1]);
      expect(close(Math.abs(next.c) * slide.answer ** next.p, bound)).toBe(true);
    }
  });

  it('ser-limit types the limit, which the series of the top gives', () => {
    for (const { params, slide } of draws(g.limitGen)) {
      const top = taylor(numeratorSource(params), params.p + 1);
      top.slice(0, params.p).forEach((c) => expect(Math.abs(c) < 1e-9).toBe(true));
      expect(close(typedNumber(slide), top[params.p] / params.b)).toBe(true);
    }
  });

  it('ser-limit-sum-steps ends on the limit', () => {
    for (const { params, slide } of draws(g.limitSumSteps)) {
      const top = taylor(numeratorSource(params), params.p);
      top.slice(0, params.p).forEach((c) => expect(Math.abs(c) < 1e-9).toBe(true));
      expect(close(lastValue(slide), top[params.p] / params.b)).toBe(true);
    }
  });

  it('ser-limit-flow compares the top\'s first power with the bottom\'s', () => {
    for (const { params, slide } of draws(g.limitFlow)) {
      if (slide.kind !== 'flow') throw new Error('expected flow');
      if (params.direct !== undefined) {
        expect(slide.answer).toEqual(['No']);
        continue;
      }
      const top = taylor(numeratorSource(params), 4);
      const p = top.findIndex((c) => Math.abs(c) > 1e-9);
      expect(slide.answer[1]).toBe(p === 1 ? '$x$' : `$x^{${p}}$`);
      const verdict = slide.answer[2];
      if (p > params.m) expect(verdict).toBe('is $0$');
      else if (p < params.m) expect(verdict).toBe('does not exist');
      else expect(close(texNumber(verdict.replace(/^is \$|\$$/g, '')), top[p] / params.b)).toBe(true);
    }
  });

  it('ser-leading-term picks the first term of the top\'s series', () => {
    for (const { params, slide } of draws(g.leadingTerm)) {
      const top = taylor(numeratorSource(params), 4);
      const p = top.findIndex((c) => Math.abs(c) > 1e-9);
      const term = texTerm(picked(slide));
      expect(term.p).toBe(p);
      expect(close(term.c, top[p])).toBe(true);
    }
  });

  it('ser-int-tiles places the integral of each term', () => {
    for (const { params, slide } of draws(g.intTiles)) {
      const f = maclaurin(params.f, 6);
      const integral = [0, ...f.map((c, p) => c / (p + 1))];
      expectLeadingTerms(placed(slide).map((tok) => texTerm(tok)), integral);
    }
  });

  it('ser-int-steps ends on three integrated terms at h', () => {
    for (const { params, slide } of draws(g.intSteps)) {
      const h = params.h.n / params.h.d;
      const f = maclaurin(params.f, 6);
      const total = nonZeroTerms(f, 3).reduce((s, { c, p }) => s + (c / (p + 1)) * h ** (p + 1), 0);
      expect(close(lastValue(slide), total)).toBe(true);
    }
  });

  it('ser-int-tree fills the integrand coefficients, then the integral\'s', () => {
    for (const { params, slide } of draws(g.intTree)) {
      const terms = nonZeroTerms(maclaurin(params.f, 6), 3);
      const values = filled(slide);
      terms.forEach(({ c, p }, i) => {
        expect(close(values[i], c)).toBe(true);
        expect(close(values[i + 3], c / (p + 1))).toBe(true);
      });
    }
  });

  it('ser-int-coef types a coefficient of the integral', () => {
    for (const { params, slide } of draws(g.intCoef)) {
      const { c, p } = nonZeroTerms(maclaurin(params.f, 6), 3)[params.which];
      expect(close(typedNumber(slide), c / (p + 1))).toBe(true);
    }
  });

  it('ser-valid-line shades out to the nearest point where the function blows up', () => {
    for (const { params, slide } of draws(g.validLine)) {
      if (slide.kind !== 'numberLine') throw new Error('expected numberLine');
      const c = lineCase(params.form, params.k.n / params.k.d, params.a);
      const want = validity(c.source, c.centre, c.singular, c.lnLike);
      const m = /^([[(])(-?[\d.]+),(-?[\d.]+)([\])])$/.exec(slide.answer)!;
      expectRange({ lo: Number(m[2]), hi: Number(m[3]), loIn: m[1] === '[', hiIn: m[4] === ']' }, want);
    }
  });

  it('ser-range-flow ends on the interval out to the nearest point where the function blows up', () => {
    for (const { params, slide } of draws(g.rangeFlow)) {
      if (slide.kind !== 'flow') throw new Error('expected flow');
      const k = params.b / params.a;
      const c = lineCase(params.ln ? 'lnShift' : 'geoShift', k, params.a);
      expectRange(readRange(slide.answer[2]), validity(c.source, c.centre, c.singular, c.lnLike));
    }
  });

  it('ser-valid-pick marks the one value inside the interval', () => {
    for (const { params, slide } of draws(g.validPick)) {
      if (slide.kind !== 'choice') throw new Error('expected choice');
      const c = lineCase(params.form, params.k.n / params.k.d, params.a);
      const want = validity(c.source, c.centre, c.singular, c.lnLike);
      const inside = (x: number) =>
        (want.loIn ? x >= want.lo - 1e-12 : x > want.lo + 1e-12) && (want.hiIn ? x <= want.hi + 1e-12 : x < want.hi - 1e-12);
      for (const option of slide.options) {
        expect(inside(texNumber(option.label.replace('x = ', '')))).toBe(option.id === slide.correctId);
      }
    }
  });

  it('ser-valid-tiles writes the interval out to the nearest point where the function blows up', () => {
    for (const { params, slide } of draws(g.validTiles)) {
      const [lo, r1, r2, hi] = placed(slide);
      const c = lineCase(params.form, params.k.n / params.k.d, params.a);
      expectRange(readRange(`${lo} ${r1} x ${r2} ${hi}`), validity(c.source, c.centre, c.singular, c.lnLike));
    }
  });
});

/** e^x, sin x or cos x itself. */
function fnOfBase(base: Fn['base']): Fn {
  return { base, k: { n: 1, d: 1 }, m: 1, scale: 1, index: 0 };
}
