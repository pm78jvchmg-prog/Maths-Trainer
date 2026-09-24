/**
 * An independent check on Binomial Expansion levels 5 and 6: estimates and
 * surds, and the binomial series for rational n.
 *
 * The oracle in `generators.test.ts` differentiates a `source`, and nothing
 * here declares one: an estimate is a number and a surd expansion is a form.
 * So these tests read each question back off the rendered slide — the bracket
 * in the prompt or template, the tiles placed, the value typed, the option
 * marked correct, the path through a flow — and check it against mathjs
 * evaluating the power itself. a and b in a + b√k are recovered from the
 * power and its conjugate, (v + w)/2 and (v - w)/(2√k), never from the row
 * the generator used, which would only prove it agrees with itself.
 *
 * Level 6 reads the bracket (a + bx)^n back off the slide, n and all, and
 * checks every coefficient against a falling product computed here and
 * against mathjs differentiating the power; four terms at bx = 0.1 must match
 * the power to within the fifth.
 *
 * Level 7 reads the number estimated, the bracket, n and x back off the slide,
 * sums the kept terms here from a falling product, and holds every estimate
 * to that sum and to within the first term left out of mathjs evaluating the
 * number itself. A partial-fraction series is checked against the single
 * fraction divided out term by term, never against the split it came from.
 */
import { describe, expect, it } from 'vitest';
import { makeRng } from '../../engine/rng';
import { math } from '../../engine/expression';
import type { Generator, Slide } from '../types';
import { binomialGenerators } from './binomialExpansion';

const SEEDS = 200;

function generator(id: string): Generator<unknown> {
  const found = binomialGenerators.find((g) => g.id === id);
  if (!found) throw new Error(`no generator ${id}`);
  return found as Generator<unknown>;
}

function slides(id: string): Slide[] {
  const g = generator(id);
  return [1, 2].flatMap((difficulty) => Array.from({ length: SEEDS }, (_, seed) => g.render(g.sample(makeRng(seed), difficulty))));
}

const evaluate = (source: string): number => math.evaluate(source) as number;

const close = (a: number, b: number) => Math.abs(a - b) < 1e-9 * Math.max(1, Math.abs(a), Math.abs(b));

const isWhole = (value: number) => Math.abs(value - Math.round(value)) < 1e-9 * Math.max(1, Math.abs(value));

/** A tile or label such as `- 3`, `+ 3` or `-3` as a number. */
const number = (token: string): number => Number(token.replace(/\s/g, ''));

const proseOf = (slide: Slide): string =>
  slide.kind === 'teach'
    ? ''
    : slide.prompt.map((block) => (block.kind === 'prose' ? block.text : block.kind === 'display' ? block.tex : '')).join(' ');

/** TeX as the learner reads it, turned into something mathjs evaluates. */
const texToMath = (tex: string): string =>
  tex
    .replace(/\\sqrt\{(\d+)\}/g, 'sqrt($1)')
    .replace(/\\sqrt(\d)/g, 'sqrt($1)')
    .replace(/\^\{(\d+)\}/g, '^($1)')
    .replace(/\$/g, '');

interface Surd {
  p: number;
  q: number;
  k: number;
  n: number;
}

/** (p ± q√k)^n, from TeX with or without braces. */
function surdIn(text: string): Surd {
  const m = text.match(/\((\d+) ([+-]) (\d*)\\sqrt\{?(\d+)\}?\)\^\{?(\d+)\}?/);
  if (!m) throw new Error(`no surd bracket in ${text}`);
  const size = m[3] === '' ? 1 : Number(m[3]);
  return { p: Number(m[1]), q: m[2] === '-' ? -size : size, k: Number(m[4]), n: Number(m[5]) };
}

/** a and b in (p + q√k)^n = a + b√k, from the power and its conjugate. */
function partsOf({ p, q, k, n }: Surd): { a: number; b: number } {
  const v = evaluate(`(${p} + ${q} * sqrt(${k}))^${n}`);
  const w = evaluate(`(${p} - ${q} * sqrt(${k}))^${n}`);
  return { a: Math.round((v + w) / 2), b: Math.round((v - w) / (2 * Math.sqrt(k))) };
}

/** n and x in "the first three terms of (1 + x)^n, with x = ...". */
function estimateIn(text: string): { n: number; x: number } {
  const m = text.match(/\(1 \+ x\)\^\{(\d+)\}.*? with \$x = (-?[\d.]+)\$/);
  if (!m) throw new Error(`no estimate in ${text}`);
  return { n: Number(m[1]), x: Number(m[2]) };
}

/** The three-term estimate and the power itself, both from mathjs. */
function estimateOf({ n, x }: { n: number; x: number }): { estimate: number; exact: number; dropped: number } {
  const scope = { n, x };
  return {
    estimate: math.evaluate('1 + n x + combinations(n, 2) x^2', scope) as number,
    exact: math.evaluate('(1 + x)^n', scope) as number,
    dropped: math.evaluate('combinations(n, 3) x^3', scope) as number,
  };
}

/** a, n and the sign in "(a ± x)^{n}", and the number being estimated. */
function nearIn(text: string): { a: number; n: number; s: number; base: number } {
  const bracket = text.match(/\((\d) ([+-]) x\)\^\{?(\d)\}?/);
  const base = text.match(/\((\d+\.\d+)\)\^\{(\d)\}/);
  if (!bracket || !base) throw new Error(`no bracket or base in ${text}`);
  return { a: Number(bracket[1]), n: Number(bracket[3]), s: bracket[2] === '-' ? -1 : 1, base: Number(base[1]) };
}

/** The first three coefficients of (a + sx)^n, by differentiating with mathjs. */
function nearCoefficients({ a, n, s }: { a: number; n: number; s: number }): number[] {
  const f = math.parse(`(${a} + ${s} * x)^${n}`);
  const d1 = math.derivative(f, 'x');
  const d2 = math.derivative(d1, 'x');
  return [f.evaluate({ x: 0 }), d1.evaluate({ x: 0 }), d2.evaluate({ x: 0 }) / 2].map((v: number) => Math.round(v));
}

function correctLabel(slide: Slide): string {
  if (slide.kind !== 'choice') throw new Error(`expected a choice slide, got ${slide.kind}`);
  return slide.options.find((option) => option.id === slide.correctId)!.label;
}

function lastValue(slide: Slide): string {
  if (slide.kind !== 'steps') throw new Error(`expected a steps slide, got ${slide.kind}`);
  return slide.reductions[slide.reductions.length - 1].value;
}

describe('how big the error is', () => {
  it('names the first term left out as mathjs does', () => {
    for (const slide of slides('bin-dropped-term')) {
      if (slide.kind !== 'expression') throw new Error('expected an expression slide');
      expect(close(Number(slide.answer), estimateOf(estimateIn(proseOf(slide))).dropped), proseOf(slide)).toBe(true);
    }
  });

  it('sums the kept terms to the estimate, which is out by about the term left out', () => {
    for (const slide of slides('bin-kept-sum-tree')) {
      if (slide.kind !== 'tree') throw new Error('expected a tree slide');
      const { estimate, exact, dropped } = estimateOf(estimateIn(proseOf(slide)));
      const [, , droppedShown, estimateShown] = slide.answer.map(Number);
      expect(close(estimateShown, estimate)).toBe(true);
      expect(close(droppedShown, dropped)).toBe(true);
      // Same sign as the term left out, and nowhere near twice its size.
      expect(Math.abs(exact - estimate - dropped)).toBeLessThan(Math.abs(dropped));
    }
  });

  it('offers as correct the places the true error leaves accurate', () => {
    for (const slide of slides('bin-safe-places')) {
      const { estimate, exact } = estimateOf(estimateIn(proseOf(slide)));
      const error = Math.abs(exact - estimate);
      const k = Number(correctLabel(slide));
      expect(error, proseOf(slide)).toBeLessThan(0.5 * 10 ** -k);
      expect(error, proseOf(slide)).toBeGreaterThanOrEqual(0.5 * 10 ** -(k + 1));
    }
  });

  it('says three terms are enough exactly when the true error is under half a unit', () => {
    for (const slide of slides('bin-enough-terms-flow')) {
      if (slide.kind !== 'flow') throw new Error('expected a flow slide');
      const text = proseOf(slide);
      const m = text.match(/\(1 \+ x\)\^\{(\d+)\}\$, with \$x = (-?[\d.]+)\$, give this correct to \$(\d+)\$/);
      if (!m) throw new Error(`no question in ${text}`);
      const { estimate, exact, dropped } = estimateOf({ n: Number(m[1]), x: Number(m[2]) });
      const k = Number(m[3]);
      expect(close(Number(slide.answer[0].replace(/\$/g, '')), dropped)).toBe(true);
      expect(close(Number(slide.answer[1].replace(/\$/g, '')), 0.5 * 10 ** -k)).toBe(true);
      expect(slide.answer[2]).toBe(Math.abs(exact - estimate) < 0.5 * 10 ** -k ? 'Yes' : 'No');
    }
  });
});

describe('a number in front', () => {
  it('picks the bracket and x that make the number', () => {
    for (const slide of slides('bin-near-setup')) {
      const text = proseOf(slide);
      const base = Number(text.match(/\((\d+\.\d+)\)\^/)![1]);
      const label = correctLabel(slide);
      const { a, s } = nearIn(`${label} (${base})^{2}`);
      const x = Number(label.match(/x = ([\d.]+)/)![1]);
      expect(close(a + s * x, base), label).toBe(true);
      expect(x).toBeLessThan(0.1);
    }
  });

  it('places the first three coefficients mathjs finds', () => {
    for (const slide of slides('bin-near-tiles')) {
      if (slide.kind !== 'tiles') throw new Error('expected a tiles slide');
      const shape = nearIn(`${slide.template} ${proseOf(slide)}`);
      expect(slide.answer.map(number)).toEqual(nearCoefficients(shape));
    }
  });

  it('estimates from those coefficients, close to the power itself', () => {
    const estimates = [
      ...slides('bin-near-estimate').map((slide) => [slide, slide.kind === 'expression' ? slide.answer : ''] as const),
      ...slides('bin-near-substitute-steps').map((slide) => [slide, lastValue(slide)] as const),
    ];
    for (const [slide, answer] of estimates) {
      const shape = nearIn(proseOf(slide));
      const x = Math.abs(shape.base - shape.a);
      const [c0, c1, c2] = nearCoefficients(shape);
      const estimate = c0 + c1 * x + c2 * x * x;
      expect(close(Number(answer), estimate), proseOf(slide)).toBe(true);
      expect(Math.abs(evaluate(`${shape.base}^${shape.n}`) - estimate)).toBeLessThan(0.01 * shape.a ** shape.n);
    }
  });
});

describe('surd expansions', () => {
  it('places a and b as the power and its conjugate give them', () => {
    for (const id of ['bin-surd-tiles', 'bin-mixed-tiles']) {
      for (const slide of slides(id)) {
        if (slide.kind !== 'tiles') throw new Error('expected a tiles slide');
        const { a, b } = partsOf(surdIn(slide.template));
        expect(slide.answer.map(number), slide.template).toEqual([a, b]);
      }
    }
  });

  it('asks for a or b and expects the right one', () => {
    for (const id of ['bin-surd-part', 'bin-mixed-part']) {
      for (const slide of slides(id)) {
        if (slide.kind !== 'expression') throw new Error('expected an expression slide');
        const text = proseOf(slide);
        const { a, b } = partsOf(surdIn(text));
        expect(Number(slide.answer), text).toBe(text.endsWith('Find $a$.') ? a : b);
      }
    }
  });

  it('gathers the terms into a and b', () => {
    for (const id of ['bin-surd-powers-tree', 'bin-mixed-terms-tree']) {
      for (const slide of slides(id)) {
        if (slide.kind !== 'tree') throw new Error('expected a tree slide');
        const surd = surdIn(slide.expression);
        const { a, b } = partsOf(surd);
        const values = slide.answer.map(Number);
        expect(values.slice(-2), slide.expression).toEqual([a, b]);
        // A bracket starting with 1 leaves that 1 out of the top row, and a takes it.
        const byId = new Map(slide.nodes.map((node, i) => [node.id, values[i]]));
        for (const node of slide.nodes.slice(-2)) {
          const start = node.id === 'a' && surd.p === 1 ? 1 : 0;
          expect(node.from.reduce((sum, id) => sum + byId.get(id)!, start)).toBe(byId.get(node.id));
        }
        expect(slide.nodes.length - 2).toBeLessThanOrEqual(4);
      }
    }
  });

  it('works a line of working out to a or b', () => {
    for (const slide of slides('bin-surd-gather-steps')) {
      const text = proseOf(slide);
      const { a, b } = partsOf(surdIn(text));
      expect(Number(lastValue(slide)), text).toBe(text.includes('$a$ is the sum') ? a : b);
    }
  });
});

describe('conjugate pairs', () => {
  /** (1 + √k)^n ± (1 - √k)^n in some TeX, evaluated. */
  const pairIn = (text: string) => {
    const m = text.match(/\(1 \+ \\sqrt\{(\d+)\}\)\^\{(\d+)\} ([+-]) \(1 - \\sqrt\{\d+\}\)\^\{\d+\}/);
    if (!m) throw new Error(`no pair in ${text}`);
    return { k: Number(m[1]), value: evaluate(texToMath(m[0])), sum: m[3] === '+' };
  };

  it('gives the value of the sum, or the number on the root in the difference', () => {
    for (const slide of slides('bin-conjugate-value')) {
      if (slide.kind !== 'expression') throw new Error('expected an expression slide');
      const { k, value, sum } = pairIn(proseOf(slide));
      expect(close(Number(slide.answer), sum ? value : value / Math.sqrt(k)), proseOf(slide)).toBe(true);
    }
  });

  it('places the sum and the difference', () => {
    for (const slide of slides('bin-conjugate-tiles')) {
      if (slide.kind !== 'tiles') throw new Error('expected a tiles slide');
      const display = slide.prompt.find((block) => block.kind === 'display');
      if (!display || display.kind !== 'display') throw new Error('no display');
      const [first, second] = display.tex.split(', \\quad ').map((tex) => evaluate(texToMath(tex)));
      expect(close(Number(slide.answer[0]), first + second)).toBe(true);
      expect(close(evaluate(texToMath(slide.answer[1]).replace(/^(\d+)/, '$1 * ')), first - second), slide.answer[1]).toBe(true);
    }
  });

  it('offers exactly one option of the kind asked for', () => {
    for (const slide of slides('bin-conjugate-which')) {
      if (slide.kind !== 'choice') throw new Error('expected a choice slide');
      const text = proseOf(slide);
      const k = Number(slide.options[0].label.match(/\\sqrt\{(\d+)\}/)![1]);
      const fits = (label: string) => {
        const value = evaluate(texToMath(label));
        return text.includes('whole number?') ? isWhole(value) : isWhole(value / Math.sqrt(k)) && !isWhole(value);
      };
      const fitting = slide.options.filter((option) => fits(option.label)).map((option) => option.id);
      expect(fitting, slide.options.map((option) => option.label).join(' | ')).toEqual([slide.correctId]);
    }
  });

  it('ends the flow at whole exactly when the value is whole', () => {
    for (const slide of slides('bin-conjugate-flow')) {
      if (slide.kind !== 'flow') throw new Error('expected a flow slide');
      const { value } = pairIn(slide.subject);
      expect(slide.answer[2] === 'A whole number', slide.subject).toBe(isWhole(value));
    }
  });
});

describe('a bracket times its conjugate', () => {
  it('works the product out to what mathjs makes of it', () => {
    for (const slide of slides('bin-unit-steps')) {
      if (slide.kind !== 'steps') throw new Error('expected a steps slide');
      const display = slide.prompt.find((block) => block.kind === 'display');
      if (!display || display.kind !== 'display') throw new Error('no display');
      const value = evaluate(texToMath(display.tex).replace(/(\d)sqrt/g, '$1 * sqrt').replace(/\)\(/g, ') * ('));
      expect(Number(lastValue(slide)), display.tex).toBe(Math.round(value));
      expect(isWhole(value)).toBe(true);
    }
  });
});

/** A number as a tile, label or bank value writes it: `- \frac{3}{8}`, `+ 2`, `\frac{1}{2}`. */
const texNumber = (tex: string): number =>
  evaluate(tex.replace(/\$/g, '').replace(/\\frac\{(\d+)\}\{(\d+)\}/g, '($1/$2)').replace(/\s/g, '').replace(/^\+/, ''));

interface Bracket {
  a: number;
  b: number;
  n: number;
}

/** (a ± bx)^{n} in some TeX, where bx may be written \frac{2x}{3}, and n may be -1/2. */
function bracketIn(text: string): Bracket {
  const m = text.match(/\((\d+) ([+-]) (?:\\frac\{(\d*)x\}\{(\d+)\}|(\d*)x)\)\^\{(-?\d+)(?:\/(\d+))?\}/);
  if (!m) throw new Error(`no bracket in ${text}`);
  const sign = m[2] === '-' ? -1 : 1;
  const size = m[4] !== undefined ? Number(m[3] || 1) / Number(m[4]) : Number(m[5] || 1);
  return { a: Number(m[1]), b: sign * size, n: Number(m[6]) / Number(m[7] ?? 1) };
}

/** n(n - 1)...(n - r + 1)/r!, as a float, from n as read off the slide. */
const falling = (n: number, r: number): number => {
  let value = 1;
  for (let i = 0; i < r; i += 1) value *= (n - i) / (i + 1);
  return value;
};

// Symbolic differentiation per bracket: a budget rather than fewer seeds.
describe('the binomial series for rational n', { timeout: 60_000 }, () => {
  /**
   * The coefficient of x^r in (a + bx)^n, by differentiating with mathjs.
   * Symbolic differentiation is slow and the brackets repeat, so each is done
   * once.
   */
  const known = new Map<string, number>();
  function coefficient(bracket: Bracket, r: number): number {
    const key = `${bracket.a} ${bracket.b} ${bracket.n} ${r}`;
    if (!known.has(key)) known.set(key, differentiated(bracket, r));
    return known.get(key)!;
  }

  function differentiated({ a, b, n }: Bracket, r: number): number {
    let f = math.parse(`(${a} + ${b} * x)^(${n})`);
    for (let i = 0; i < r; i += 1) f = math.derivative(f, 'x');
    let fact = 1;
    for (let i = 2; i <= r; i += 1) fact *= i;
    return (f.evaluate({ x: 0 }) as number) / fact;
  }

  /** The power asked about in "coefficient of $x^{r}$". */
  const powerIn = (text: string): number => Number(text.match(/coefficient of \$x(?:\^\{(\d)\})?\$/)![1] ?? 1);

  it('places four terms that agree with the power at a small x, to within the fifth term', () => {
    for (const id of ['bin-negative-tiles', 'bin-fraction-tiles']) {
      for (const slide of slides(id)) {
        if (slide.kind !== 'tiles') throw new Error('expected a tiles slide');
        const { a, b, n } = bracketIn(proseOf(slide));
        expect(a).toBe(1);
        const coefs = slide.answer.map(texNumber);
        coefs.forEach((c, i) => expect(close(c, falling(n, i + 1) * b ** (i + 1)), `${proseOf(slide)} x^${i + 1}`).toBe(true));
        // x chosen so bx is 0.1: 1.1^n, as far as the fourth term.
        const x = 0.1 / Math.abs(b);
        const four = 1 + coefs.reduce((sum, c, i) => sum + c * x ** (i + 1), 0);
        const fifth = Math.abs(falling(n, 4) * (b * x) ** 4);
        expect(Math.abs(evaluate(`(1 + ${b * x})^(${n})`) - four), proseOf(slide)).toBeLessThan(1.5 * fifth);
      }
    }
  });

  it('asks for a coefficient the falling product gives', () => {
    for (const id of ['bin-negative-coef', 'bin-fraction-coef']) {
      for (const slide of slides(id)) {
        if (slide.kind !== 'expression') throw new Error('expected an expression slide');
        const text = proseOf(slide);
        const { b, n } = bracketIn(text);
        const r = powerIn(text);
        expect(close(evaluate(slide.answer), falling(n, r) * b ** r), text).toBe(true);
        expect(close(evaluate(slide.answer), coefficient({ a: 1, b, n }, r)), text).toBe(true);
      }
    }
  });

  it('works a line of working out to the coefficient', () => {
    for (const id of ['bin-series-coef-steps', 'bin-fraction-term-steps', 'bin-taken-out-coef-steps']) {
      for (const slide of slides(id)) {
        const text = proseOf(slide);
        const bracket = bracketIn(text);
        const r = powerIn(text);
        expect(close(texNumber(lastValue(slide)), coefficient(bracket, r)), text).toBe(true);
      }
    }
  });

  it('builds the factors and coefficients from n', () => {
    for (const slide of slides('bin-series-factors-tiles')) {
      if (slide.kind !== 'tiles') throw new Error('expected a tiles slide');
      const text = proseOf(slide);
      const { n } = bracketIn(text);
      const r = powerIn(text);
      const values = slide.answer.map(texNumber);
      expect(values.slice(0, r), text).toEqual(Array.from({ length: r }, (_, i) => expect.closeTo(n - i, 9)));
      if (values.length > r) expect(values[r]).toBe(r === 3 ? 6 : 2);
    }
    for (const slide of slides('bin-series-build-tree')) {
      if (slide.kind !== 'tree') throw new Error('expected a tree slide');
      const bracket = bracketIn(slide.expression);
      const byId = new Map(slide.nodes.map((node, i) => [node.id, texNumber(slide.answer[i])]));
      expect(close(byId.get('x2')!, coefficient(bracket, 2)), slide.expression).toBe(true);
      expect(close(byId.get('x3')!, coefficient(bracket, 3)), slide.expression).toBe(true);
    }
    for (const slide of slides('bin-negative-tree')) {
      if (slide.kind !== 'tree') throw new Error('expected a tree slide');
      const r = Number(proseOf(slide).match(/coefficient of \$x\^\{(\d)\}\$/)![1]);
      expect(close(Number(slide.answer[3]), coefficient(bracketIn(slide.expression), r)), slide.expression).toBe(true);
    }
  });

  it('names the sign of the term the falling product gives', () => {
    for (const slide of slides('bin-negative-signs-flow')) {
      if (slide.kind !== 'flow') throw new Error('expected a flow slide');
      const bracket = bracketIn(slide.subject);
      const r = Number(proseOf(slide).match(/\$x(?:\^\{(\d)\})?\$ term/)![1] ?? 1);
      expect(slide.answer[2], slide.subject).toBe(coefficient(bracket, r) > 0 ? 'Positive' : 'Negative');
    }
  });

  it('marks as correct the only start that matches the series', () => {
    for (const slide of slides('bin-fraction-which')) {
      if (slide.kind !== 'choice') throw new Error('expected a choice slide');
      const bracket = bracketIn(proseOf(slide));
      const [, c1, c2] = [0, 1, 2].map((r) => coefficient(bracket, r));
      const matches = (label: string) =>
        [0.5, 1.5, 3].every((x) => close(evaluate(texToMath(label.replace(/\\frac\{(\d+)\}\{(\d+)\}/g, '($1/$2)')).replace(/x/g, `(${x})`)), 1 + c1 * x + c2 * x * x));
      const fitting = slide.options.filter((option) => matches(option.label)).map((option) => option.id);
      expect(fitting, proseOf(slide)).toEqual([slide.correctId]);
    }
    for (const slide of slides('bin-series-stops-choice')) {
      if (slide.kind !== 'choice') throw new Error('expected a choice slide');
      const wantStops = proseOf(slide).includes('stops');
      const stopsAt = (label: string) => {
        const power = label.match(/^\(1 \+ x\)\^\{(.+)\}$/)![1];
        const n = evaluate(power.replace(/\\sqrt\{(\d+)\}/g, 'sqrt($1)'));
        return Number.isInteger(n) && n >= 0;
      };
      const fitting = slide.options.filter((option) => stopsAt(option.label) === wantStops).map((option) => option.id);
      expect(fitting, slide.options.map((option) => option.label).join(' | ')).toEqual([slide.correctId]);
    }
  });

  it('gives the range the series holds for', () => {
    for (const id of ['bin-valid-bound', 'bin-taken-out-range']) {
      for (const slide of slides(id)) {
        if (slide.kind !== 'expression') throw new Error('expected an expression slide');
        const { a, b } = bracketIn(proseOf(slide));
        expect(close(evaluate(slide.answer), a / Math.abs(b)), proseOf(slide)).toBe(true);
      }
    }
    for (const slide of slides('bin-valid-slider')) {
      if (slide.kind !== 'slider') throw new Error('expected a slider slide');
      const { b } = bracketIn(proseOf(slide));
      expect(close(slide.answer, 1 / Math.abs(b)), proseOf(slide)).toBe(true);
    }
  });

  it('says the series holds exactly where |bx| is under 1', () => {
    for (const slide of slides('bin-valid-which-x')) {
      if (slide.kind !== 'choice') throw new Error('expected a choice slide');
      const { b } = bracketIn(proseOf(slide));
      const inside = (label: string) => Math.abs(b * texNumber(label.replace('x = ', ''))) < 1;
      const fitting = slide.options.filter((option) => inside(option.label)).map((option) => option.id);
      expect(fitting, proseOf(slide)).toEqual([slide.correctId]);
      // Never on the edge, where whether it holds depends on n.
      for (const option of slide.options) expect(close(Math.abs(b * texNumber(option.label.replace('x = ', ''))), 1)).toBe(false);
    }
    for (const slide of slides('bin-valid-flow')) {
      if (slide.kind !== 'flow') throw new Error('expected a flow slide');
      const { b } = bracketIn(slide.subject);
      const x = texNumber(proseOf(slide).match(/at \$x = ([^$]+)\$/)![1]);
      expect(slide.answer[2], `${slide.subject} at ${x}`).toBe(Math.abs(b * x) < 1 ? 'Yes' : 'No');
    }
  });

  it('takes the number out and places the terms mathjs finds', () => {
    for (const slide of slides('bin-taken-out-tiles')) {
      if (slide.kind !== 'tiles') throw new Error('expected a tiles slide');
      const bracket = bracketIn(proseOf(slide));
      expect(slide.answer.map(texNumber).every((c, r) => close(c, coefficient(bracket, r))), proseOf(slide)).toBe(true);
    }
    for (const slide of slides('bin-taken-out-parts-tree')) {
      if (slide.kind !== 'tree') throw new Error('expected a tree slide');
      const bracket = bracketIn(slide.expression);
      const [power, ratio, x1, x2] = slide.answer.map(texNumber);
      expect(close(power, bracket.a ** bracket.n)).toBe(true);
      expect(close(ratio, bracket.b / bracket.a)).toBe(true);
      expect(close(x1, coefficient(bracket, 1)), slide.expression).toBe(true);
      expect(close(x2, coefficient(bracket, 2)), slide.expression).toBe(true);
    }
  });
});

// mathjs evaluating every root and every fraction: a budget rather than fewer seeds.
describe('approximating with the series', { timeout: 60_000 }, () => {
  /** TeX for a number — roots, fractions and powers — as mathjs reads it. */
  function texValue(tex: string): number {
    const toMath = (text: string): string => {
      let out = '';
      let i = 0;
      const group = (): string => {
        const start = i;
        let depth = 0;
        for (; i < text.length; i += 1) {
          if (text[i] === '{') depth += 1;
          if (text[i] === '}') {
            depth -= 1;
            if (depth === 0) {
              i += 1;
              return text.slice(start + 1, i - 1);
            }
          }
        }
        throw new Error(`unclosed group in ${text}`);
      };
      while (i < text.length) {
        if (text.startsWith('\\frac', i)) {
          i += 5;
          const top = group();
          out += `((${toMath(top)}) / (${toMath(group())}))`;
        } else if (text.startsWith('\\sqrt[', i)) {
          const close = text.indexOf(']', i);
          const k = text.slice(i + 6, close);
          i = close + 1;
          out += `nthRoot(${toMath(group())}, ${k})`;
        } else if (text.startsWith('\\sqrt', i)) {
          i += 5;
          out += `sqrt(${toMath(group())})`;
        } else if (text[i] === '^') {
          i += 1;
          out += `^(${toMath(group())})`;
        } else if (text[i] === '{') {
          out += `(${toMath(group())})`;
        } else {
          out += text[i];
          i += 1;
        }
      }
      return out;
    };
    return evaluate(toMath(tex.replace(/\$/g, '').trim()));
  }

  /** The x put in, from "$x = 0.02$". */
  const xIn = (text: string): number => {
    const m = text.match(/\$x = (-?[\d.]+)\$/);
    if (!m) throw new Error(`no x in ${text}`);
    return Number(m[1]);
  };

  interface Estimate {
    /** What is being estimated, from mathjs. */
    truth: number;
    /** The front times the three terms kept, summed here. */
    sum: number;
    /** The front times the x^3 term. */
    dropped: number;
  }

  /** The estimate a slide asks for, worked here from its bracket, n, x and the number in front. */
  function estimateFrom(target: string, front: number, bracket: Bracket, x: number): Estimate {
    expect(bracket.a).toBe(1);
    const u = bracket.b * x;
    const terms = [0, 1, 2].map((r) => falling(bracket.n, r) * u ** r);
    const truth = texValue(target);
    // The number and the bracket really are equal.
    expect(close(truth, front * evaluate(`(1 + ${u})^(${bracket.n})`)), `${target} at x = ${x}`).toBe(true);
    // And the series holds there.
    expect(Math.abs(u)).toBeLessThan(1);
    return { truth, sum: front * terms.reduce((a, b) => a + b, 0), dropped: front * falling(bracket.n, 3) * u ** 3 };
  }

  /** target = front(1 + bx)^{n}, as a relation block writes it. */
  function relationIn(tex: string, x: number): Estimate {
    const at = tex.indexOf(' = ');
    const target = tex.slice(0, at);
    const right = tex.slice(at + 3);
    const front = right.slice(0, right.indexOf('(1 '));
    return estimateFrom(target, front === '' ? 1 : texValue(front), bracketIn(right), x);
  }

  /** The estimate is the kept terms' sum, and within about the first term left out of the truth. */
  function holds(value: number, { truth, sum, dropped }: Estimate, what: string, places?: number): void {
    const half = places === undefined ? 0 : 0.5 * 10 ** -places;
    if (places === undefined) expect(close(value, sum), `${what}: ${value} is not the sum ${sum}`).toBe(true);
    else expect(Math.abs(value - sum), `${what}: ${value} is not ${sum} to ${places} places`).toBeLessThanOrEqual(half + 1e-12);
    expect(Math.abs(value - truth), `${what}: ${value} against ${truth}`).toBeLessThanOrEqual(1.5 * Math.abs(dropped) + half);
  }

  const relationOf = (slide: Slide): string => {
    if (slide.kind === 'teach') throw new Error('a teach slide asks nothing');
    const block = slide.prompt.find((b) => b.kind === 'display');
    if (!block || block.kind !== 'display') throw new Error(`no relation in ${proseOf(slide)}`);
    return block.tex;
  };

  /** The generator's +choice options, the correct one first. */
  function choicesOf(id: string): { correct: string; all: string[] }[] {
    const g = generator(id);
    return [1, 2].flatMap((difficulty) =>
      Array.from({ length: SEEDS }, (_, seed) => {
        const options = g.choices!(g.sample(makeRng(seed), difficulty));
        return { correct: options.find((o) => o.correct)!.tex, all: options.map((o) => o.tex) };
      }),
    );
  }

  it('types an estimate that is the kept terms added, near the true number', () => {
    for (const id of ['bin-root-estimate', 'bin-reciprocal-estimate', 'bin-out-first-estimate']) {
      for (const slide of slides(id)) {
        if (slide.kind !== 'expression') throw new Error('expected an expression slide');
        holds(Number(slide.answer), relationIn(relationOf(slide), xIn(proseOf(slide))), proseOf(slide));
      }
      // The choice form marks the same number correct, and only it.
      const answers = slides(id).map((slide) => (slide.kind === 'expression' ? slide.answer : ''));
      choicesOf(id).forEach(({ correct, all }, i) => {
        expect(correct).toBe(answers[i]);
        expect(new Set(all.map(Number)).size).toBe(all.length);
      });
    }
  });

  it('rounds a surd from a known root to places its error allows', () => {
    for (const slide of slides('bin-known-root-estimate')) {
      if (slide.kind !== 'expression') throw new Error('expected an expression slide');
      const text = proseOf(slide);
      const places = Number(text.match(/correct to \$(\d)\$ decimal places/)![1]);
      expect(slide.answer, text).toMatch(new RegExp(`^\\d+\\.\\d{${places}}$`));
      const estimate = relationIn(relationOf(slide), xIn(text));
      holds(Number(slide.answer), estimate, text, places);
      // Right to the places asked, which is the point of asking them.
      expect(Math.abs(Number(slide.answer) - estimate.truth), text).toBeLessThan(0.5 * 10 ** -places);
      // The known root in the lead is true.
      const known = text.match(/\$\\sqrt\{([\d.]+)\} = (\\frac\{\d*\\sqrt\{\d+\}\}\{\d+\}|\d*\\sqrt\{\d+\})\$/)!;
      expect(close(Math.sqrt(Number(known[1])), texValue(known[2].replace(/(\d)\\sqrt/, '$1 \\sqrt'))), text).toBe(true);
    }
  });

  it('fills the x term, the x^2 term and the estimate from the series', () => {
    for (const id of ['bin-root-terms-tree', 'bin-reciprocal-terms-tree']) {
      for (const slide of slides(id)) {
        if (slide.kind !== 'tree') throw new Error('expected a tree slide');
        const text = proseOf(slide);
        const bracket = bracketIn(slide.expression);
        const x = xIn(text);
        const target = text.match(/^Estimate \$(.+?)\$ from/)![1];
        const [t1, t2, estimate] = slide.answer.map(Number);
        expect(close(t1, falling(bracket.n, 1) * bracket.b * x), text).toBe(true);
        expect(close(t2, falling(bracket.n, 2) * (bracket.b * x) ** 2), text).toBe(true);
        holds(estimate, estimateFrom(target, 1, bracket, x), text);
      }
    }
    for (const slide of slides('bin-root-substitute-steps')) {
      const text = proseOf(slide);
      const target = text.match(/^Estimate \$(.+?)\$ from/)![1];
      holds(Number(lastValue(slide)), estimateFrom(target, 1, bracketIn(text), xIn(text)), text);
    }
    for (const slide of slides('bin-out-first-tree')) {
      if (slide.kind !== 'tree') throw new Error('expected a tree slide');
      const text = proseOf(slide);
      const m = text.match(/= (\d+)\^\{(-?\d+\/\d+)\}\(1/)!;
      const front = evaluate(`${m[1]}^(${m[2]})`);
      const [shownFront, bracketSum, estimate] = slide.answer.map(Number);
      expect(close(shownFront, front), text).toBe(true);
      const found = estimateFrom(slide.expression, front, bracketIn(text), xIn(text));
      expect(close(bracketSum * front, found.sum), text).toBe(true);
      holds(estimate, found, text);
    }
  });

  it('sets up the root or reciprocal so the bracket equals the number', () => {
    for (const slide of slides('bin-root-setup')) {
      const text = proseOf(slide);
      const target = texValue(text.match(/estimate \$(.+?)\$ as/)![1]);
      const works = (label: string) => {
        const m = label.match(/^n = (.+), \\enspace x = (-?[\d.]+)$/)!;
        return Math.abs(Number(m[2])) < 1 && close(evaluate(`(1 + ${m[2]})^(${texNumber(m[1])})`), target);
      };
      if (slide.kind !== 'choice') throw new Error('expected a choice slide');
      expect(slide.options.filter((o) => works(o.label)).map((o) => o.id), text).toEqual([slide.correctId]);
    }
    for (const slide of slides('bin-reciprocal-rewrite')) {
      if (slide.kind !== 'choice') throw new Error('expected a choice slide');
      const text = proseOf(slide);
      const given = text.match(/^Write \$(.+)\$ as one power/)![1];
      const at = (tex: string, x: number) => texValue(tex.replace(/(\d)x/g, `$1 * (${x})`).replace(/x/g, `(${x})`).replace(/(\d)\(/g, '$1 * ('));
      const equal = (label: string) => [0.05, 0.1, 0.13].every((x) => close(at(label, x), at(given, x)));
      expect(slide.options.filter((o) => equal(o.label)).map((o) => o.id), text).toEqual([slide.correctId]);
    }
    for (const slide of slides('bin-reciprocal-flow')) {
      if (slide.kind !== 'flow') throw new Error('expected a flow slide');
      const text = proseOf(slide);
      const bracket = bracketIn(text);
      const x = Number(slide.answer[1].replace(/\$/g, ''));
      // The x chosen puts the number back, and the power is the number's own.
      estimateFrom(slide.subject, 1, bracket, x);
      const base = 1 + bracket.b * x;
      expect(close(texValue(slide.answer[0]), base ** bracket.n), text).toBe(true);
      const terms = slide.answer[2].replace(/\$/g, '');
      for (const probe of [0.5, 2]) {
        const value = texValue(terms.replace(/(\d)x/g, `$1 * (${probe})`).replace(/x/g, `(${probe})`));
        const want = [0, 1, 2].reduce((sum, r) => sum + falling(bracket.n, r) * (bracket.b * probe) ** r, 0);
        expect(close(value, want), `${text} ${terms}`).toBe(true);
      }
    }
  });

  it('takes the number out so the bracket starts with 1 and holds', () => {
    /** front(1 ± d)^{n} with the numbers put in. */
    const valueOf = (label: string) => {
      const m = label.match(/^(.*)\(1 ([+-]) ([\d.]+)\)\^\{(-?\d+\/\d+)\}$/)!;
      const d = (m[2] === '-' ? -1 : 1) * Number(m[3]);
      return { value: (m[1] === '' ? 1 : texValue(m[1])) * (1 + d) ** evaluate(m[4]), holds: Math.abs(d) < 1 };
    };
    for (const slide of slides('bin-out-first-which')) {
      if (slide.kind !== 'choice') throw new Error('expected a choice slide');
      const text = proseOf(slide);
      const target = texValue(text.match(/equals \$(.+?)\$ and/)![1]);
      const fitting = slide.options.filter((o) => {
        const { value, holds: inside } = valueOf(o.label);
        return inside && close(value, target);
      });
      expect(fitting.map((o) => o.id), text).toEqual([slide.correctId]);
    }
    for (const slide of slides('bin-out-first-tiles')) {
      if (slide.kind !== 'tiles') throw new Error('expected a tiles slide');
      const filled = slide.template.replace(/\{(\d)\}/g, (_, i: string) => slide.answer[Number(i)]);
      const { value, holds: inside } = valueOf(filled);
      const target = texValue(relationOf(slide).replace(/ =$/, ''));
      expect(inside && close(value, target), `${filled} for ${relationOf(slide)}`).toBe(true);
    }
  });

  it('names the first term left out and the places the true error allows', () => {
    for (const slide of slides('bin-error-term')) {
      if (slide.kind !== 'expression') throw new Error('expected an expression slide');
      const text = proseOf(slide);
      const estimate = relationIn(relationOf(slide), xIn(text));
      expect(close(Number(slide.answer), estimate.dropped), text).toBe(true);
      // Same sign as the error, and nowhere near twice its size.
      expect(Math.abs(estimate.truth - estimate.sum - estimate.dropped), text).toBeLessThan(Math.abs(estimate.dropped));
    }
    for (const slide of slides('bin-error-places-flow')) {
      if (slide.kind !== 'flow') throw new Error('expected a flow slide');
      const text = proseOf(slide);
      const target = slide.subject.split(' \\approx ')[0];
      const estimate = estimateFrom(target, 1, bracketIn(text), xIn(text));
      expect(close(Number(slide.subject.split(' \\approx ')[1]), estimate.sum), text).toBe(true);
      expect(close(Number(slide.answer[0].replace(/\$/g, '')), estimate.dropped), text).toBe(true);
      const k = Number(slide.answer[2].replace(/\$/g, ''));
      const error = Math.abs(estimate.truth - estimate.sum);
      expect(error, text).toBeLessThan(0.5 * 10 ** -k);
      expect(error, text).toBeGreaterThanOrEqual(0.5 * 10 ** -(k + 1));
    }
  });

  it('finds the known root the bracket holds', () => {
    for (const slide of slides('bin-known-root-which')) {
      if (slide.kind !== 'choice') throw new Error('expected a choice slide');
      const text = proseOf(slide);
      const surd = (tex: string) => texValue(tex.replace(/(\d)\\sqrt/g, '$1 \\sqrt'));
      let right: (label: string) => boolean;
      const value = text.match(/^Which of these is \$\\sqrt\{([\d.]+)\}\$\?$/);
      const back = text.match(/Which of these is \$\\sqrt\{(\d+)\}\$\?$/);
      if (value) right = (label) => close(surd(label), Math.sqrt(Number(value[1])));
      else if (back) right = (label) => close(surd(label), Math.sqrt(Number(back[1])));
      else {
        const k = Number(text.match(/multiple of \$\\sqrt\{(\d+)\}\$/)![1]);
        const xs = slide.options.map((o) => Number(o.label.replace('x = ', '')));
        // Every x offered gives a whole multiple of √k over 10.
        for (const x of xs) expect(isWhole(10 * Math.sqrt((1 + x) / k)), `${x} for √${k}`).toBe(true);
        const best = Math.min(...xs.map(Math.abs));
        right = (label) => Math.abs(Number(label.replace('x = ', ''))) === best;
      }
      expect(slide.options.filter((o) => right(o.label)).map((o) => o.id), text).toEqual([slide.correctId]);
    }
  });

  describe('a partial-fraction split', () => {
    interface Split {
      /** f(x) as one fraction: its top at x = 0 and its x coefficient, and the two brackets' numbers on x. */
      p0: number;
      p1: number;
      u: number;
      v: number;
      /** The split as the slide writes it. */
      parts: string;
    }

    const onX = (sign: string, size: string) => (sign === '-' ? -1 : 1) * Number(size || 1);

    function splitIn(text: string): Split {
      const m = text.match(/\\frac\{([^{}]+)\}\{\(1 ([+-]) (\d*)x\)\(1 ([+-]) (\d*)x\)\} \\\\ &= (.+?) \\end\{aligned\}/);
      if (!m) throw new Error(`no fraction in ${text}`);
      const top = (x: number) => evaluate(m[1].replace(/(\d)x/g, `$1 * (${x})`).replace(/x/g, `(${x})`));
      return { p0: top(0), p1: top(1) - top(0), u: onX(m[2], m[3]), v: onX(m[4], m[5]), parts: m[6] };
    }

    /** The series of (p0 + p1 x)/((1 + ux)(1 + vx)), by dividing out term by term. */
    function seriesOf({ p0, p1, u, v }: Split, top: number): number[] {
      const c = [p0];
      c.push(p1 - (u + v) * c[0]);
      for (let r = 2; r <= top; r += 1) c.push(-(u + v) * c[r - 1] - u * v * c[r - 2]);
      return c;
    }

    function checkParts(split: Split): void {
      const at = (x: number) =>
        texValue(split.parts.replace(/(\d)x/g, `$1 * (${x})`).replace(/x/g, `(${x})`).replace(/^-/, '0 -'));
      for (const x of [0.1, 0.3, -0.2]) {
        expect(close(at(x), (split.p0 + split.p1 * x) / ((1 + split.u * x) * (1 + split.v * x))), split.parts).toBe(true);
      }
    }

    const rIn = (text: string) => Number(text.match(/coefficient of \$x\^\{(\d)\}\$/)![1]);

    it('splits into parts that add back to the fraction', () => {
      for (const id of ['bin-pf-tiles', 'bin-pf-coef', 'bin-pf-parts-tree', 'bin-pf-range']) {
        for (const slide of slides(id)) checkParts(splitIn(proseOf(slide)));
      }
    });

    it('gives the coefficients of the fraction divided out', () => {
      for (const slide of slides('bin-pf-tiles')) {
        if (slide.kind !== 'tiles') throw new Error('expected a tiles slide');
        expect(slide.answer.map(number), proseOf(slide)).toEqual(seriesOf(splitIn(proseOf(slide)), 2));
      }
      for (const slide of slides('bin-pf-coef')) {
        if (slide.kind !== 'expression') throw new Error('expected an expression slide');
        const text = proseOf(slide);
        expect(Number(slide.answer), text).toBe(seriesOf(splitIn(text), 3)[rIn(text)]);
      }
      for (const slide of slides('bin-pf-parts-tree')) {
        if (slide.kind !== 'tree') throw new Error('expected a tree slide');
        const text = proseOf(slide);
        const [first, second, sum] = slide.answer.map(Number);
        expect(first + second, text).toBe(sum);
        expect(sum, text).toBe(seriesOf(splitIn(text), 3)[rIn(text)]);
      }
    });

    it('holds for the smaller of the two ranges', () => {
      for (const slide of slides('bin-pf-range')) {
        const text = proseOf(slide);
        const { u, v } = splitIn(text);
        const bound = Math.min(1 / Math.abs(u), 1 / Math.abs(v));
        const label = correctLabel(slide);
        expect(close(texNumber(label.replace('|x| < ', '')), bound), text).toBe(true);
      }
    });
  });
});
