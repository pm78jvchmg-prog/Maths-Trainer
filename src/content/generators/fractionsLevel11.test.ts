/**
 * Independent checks on level 11, partial fractions with higher powers.
 *
 * The generators build each fraction outward from its split, so the sweep only
 * proves they agree with themselves. These read what the learner is shown —
 * the fraction, the form with letters in, the bottom — turn the TeX into
 * something mathjs evaluates, and find the numerators again by solving a
 * linear system at sample points: each letter's part is a function of x, and
 * the fraction must be exactly one combination of them. Every answer the
 * generators claim is held to that solve. A choice of form is checked the same
 * way: the right form fits the fraction exactly, and every wrong one cannot.
 */
import { describe, expect, it } from 'vitest';
import { math } from '../../engine/expression';
import { makeRng } from '../../engine/rng';
import { registry } from '../registry';
import type { Generator, Slide } from '../types';

const SEEDS = 100;
/** Off the integers, so no bottom drawn here is zero at any of them. */
const POINTS = [0.37, 1.61, -2.29, 3.73, -4.41, 5.17, 7.3, -0.83, 2.47, -3.19, 6.11, -5.63];

/** Learner-facing TeX as something mathjs evaluates. Handles only what level 11 writes. */
function toMath(tex: string): string {
  let out = tex
    .replace(/\\left|\\right/g, '')
    .replace(/\\(quad|qquad|;|,)/g, ' ')
    .replace(/\\div/g, '/')
    .replace(/\\times/g, '*')
    .replace(/\[/g, '(')
    .replace(/\]/g, ')');
  const fraction = /\\frac\{([^{}]*(?:\{[^{}]*\}[^{}]*)*)\}\{([^{}]*(?:\{[^{}]*\}[^{}]*)*)\}/;
  while (fraction.test(out)) out = out.replace(fraction, '(($1)/($2))');
  return out
    .replace(/\^\{(-?\d+)\}/g, '^($1)')
    .replace(/(\d)\s*([a-z(])/g, '$1*$2')
    .replace(/\)\s*([a-z(\d])/g, ')*$1')
    .replace(/([a-z])\s*\(/g, '$1*(');
}

function at(tex: string, x: number, letter = 'x'): number {
  return math.evaluate(toMath(tex), { [letter]: x }) as number;
}

function slides(id: string): { slide: Slide; seed: number; difficulty: number }[] {
  const generator = registry[id] as unknown as Generator<unknown>;
  expect(generator, id).toBeDefined();
  return [1, 2].flatMap((difficulty) =>
    Array.from({ length: SEEDS }, (_, seed) => ({ slide: generator.render(generator.sample(makeRng(seed), difficulty)), seed, difficulty })),
  );
}

const promptOf = (slide: Slide) => ('prompt' in slide ? slide.prompt : []);

function display(slide: Slide): string {
  const block = promptOf(slide).find((b) => b.kind === 'display');
  return block && 'tex' in block ? block.tex : '';
}

/** The first inline formula in the prompt holding a form with letters: $\frac{A}{...} + ...$. */
function formInPrompt(slide: Slide): string {
  const prose = promptOf(slide)
    .map((b) => ('text' in b ? b.text : ''))
    .join(' ');
  const match = /\$([^$]*\\frac\{A[^$]*)\$/.exec(prose);
  if (!match) throw new Error(`no form in prompt: ${prose}`);
  return match[1];
}

const lettersIn = (form: string): string[] => [...new Set(form.match(/[A-F]/g) ?? [])].sort();

const put = (form: string, values: Record<string, number>): string => form.replace(/[A-F]/g, (l) => `(${values[l]})`);

/** Solve n x n by elimination with partial pivoting. */
function solveLinear(m: number[][], v: number[]): number[] {
  const n = v.length;
  const a = m.map((row, i) => [...row, v[i]]);
  for (let col = 0; col < n; col += 1) {
    let pivot = col;
    for (let r = col + 1; r < n; r += 1) if (Math.abs(a[r][col]) > Math.abs(a[pivot][col])) pivot = r;
    [a[col], a[pivot]] = [a[pivot], a[col]];
    for (let r = 0; r < n; r += 1) {
      if (r === col) continue;
      const f = a[r][col] / a[col][col];
      for (let c = col; c <= n; c += 1) a[r][c] -= f * a[col][c];
    }
  }
  return a.map((row, i) => row[n] / row[i]);
}

/**
 * The letters' values that make `form` equal `target` at every point, and
 * whether any such values exist. `constant` adds a whole part K to the form.
 */
function fit(form: string, target: (x: number) => number, constant = false): { exact: boolean; values: Record<string, number> } {
  const letters = lettersIn(form);
  const basis = letters.map((l) => (x: number) => at(put(form, Object.fromEntries(letters.map((m) => [m, m === l ? 1 : 0]))), x));
  if (constant) basis.push(() => 1);
  const n = basis.length;
  const coeffs = solveLinear(
    POINTS.slice(0, n).map((x) => basis.map((f) => f(x))),
    POINTS.slice(0, n).map(target),
  );
  const exact = POINTS.every((x) => {
    const got = basis.reduce((s, f, i) => s + coeffs[i] * f(x), 0);
    return Number.isFinite(coeffs.reduce((s, c) => s + c, 0)) && Math.abs(got - target(x)) < 1e-6 * Math.max(1, Math.abs(target(x)));
  });
  const values = Object.fromEntries(letters.map((l, i) => [l, coeffs[i]]));
  if (constant) values.K = coeffs[n - 1];
  return { exact, values };
}

/** The degree of a polynomial written in TeX, read from how fast it grows. */
function degreeOf(tex: string): number {
  return Math.round(Math.log2(Math.abs(at(tex, 2000) / at(tex, 1000))));
}

/** A proper fraction over this bottom with a made-up top, so a form is tested against every top it must make. */
function anyTopOver(bottom: string, seed: number): (x: number) => number {
  const d = degreeOf(bottom);
  // Irrational coefficients, so the top shares no root with the bottom by accident.
  const coeffs = Array.from({ length: d }, (_, i) => 3 * Math.sin(seed + 1.7 * i) + 0.3);
  return (x) => coeffs.reduce((s, c) => s * x + c, 0) / at(bottom, x);
}

const close = (a: number, b: number) => Math.abs(a - b) < 1e-6;

describe('level 11: a choice of form fits exactly when it is right, and never when it is wrong', () => {
  for (const id of ['af11-cubed-form', 'af11-four-form', 'af11-xpow-form']) {
    it(id, () => {
      for (const { slide, seed, difficulty } of slides(id)) {
        if (slide.kind !== 'choice') throw new Error('expected choice');
        const fraction = display(slide);
        for (const option of slide.options) {
          const { exact } = fit(option.label, (x) => at(fraction, x));
          expect(exact, `${id} seed ${seed} d${difficulty}: ${option.label}`).toBe(option.id === slide.correctId);
        }
      }
    });
  }

  it('af11-choose-form, from the bottom alone', () => {
    for (const { slide, seed, difficulty } of slides('af11-choose-form')) {
      if (slide.kind !== 'choice') throw new Error('expected choice');
      const target = anyTopOver(display(slide), seed);
      for (const option of slide.options) {
        expect(fit(option.label, target).exact, `seed ${seed} d${difficulty}: ${option.label}`).toBe(option.id === slide.correctId);
      }
    }
  });

  it('af11-choose-tiles: the placed form fits, with as many letters as the bottom has degree', () => {
    for (const { slide, seed, difficulty } of slides('af11-choose-tiles')) {
      if (slide.kind !== 'tiles') throw new Error('expected tiles');
      const bottom = display(slide);
      const form = slide.answer.join(' ');
      expect(fit(form, anyTopOver(bottom, seed)).exact, `seed ${seed} d${difficulty}: ${form}`).toBe(true);
      expect(lettersIn(form).length).toBe(degreeOf(bottom));
    }
  });

  it('af11-choose-count is the degree of the bottom', () => {
    for (const { slide, seed, difficulty } of slides('af11-choose-count')) {
      if (slide.kind !== 'expression') throw new Error('expected expression');
      expect(Number(slide.answer), `seed ${seed} d${difficulty}`).toBe(degreeOf(display(slide)));
    }
  });
});

describe('level 11: every numerator claimed is the one the fraction forces', () => {
  const lettersNamed = (slide: Slide) => {
    const form = formInPrompt(slide);
    const fraction = slide.kind === 'tree' ? slide.expression : slide.kind === 'flow' ? slide.subject : display(slide);
    const whole = /whole number plus/.test(promptOf(slide).map((b) => ('text' in b ? b.text : '')).join(' '));
    const { exact, values } = fit(form, (x) => at(fraction, x), whole);
    expect(exact, `${form} does not fit ${fraction}`).toBe(true);
    return values;
  };

  it('typed numerators', () => {
    for (const id of ['af11-cubed-value', 'af11-four-value', 'af11-xpow-value', 'af11-whole-value', 'af11-choose-value']) {
      for (const { slide, seed, difficulty } of slides(id)) {
        if (slide.kind !== 'expression') throw new Error('expected expression');
        const letter = /^([A-F]) =$/.exec(slide.lead ?? '')![1];
        expect(close(lettersNamed(slide)[letter], Number(slide.answer)), `${id} seed ${seed} d${difficulty}`).toBe(true);
      }
    }
  });

  it('numerators placed as tiles', () => {
    for (const id of ['af11-cubed-tiles', 'af11-four-tiles', 'af11-xpow-tiles']) {
      for (const { slide, seed, difficulty } of slides(id)) {
        if (slide.kind !== 'tiles') throw new Error('expected tiles');
        const values = lettersNamed(slide);
        const slots = [...slide.template.matchAll(/([A-F]) = \{(\d)\}/g)];
        expect(slots.length).toBe(Object.keys(values).length);
        for (const [, letter, i] of slots) {
          expect(close(values[letter], Number(slide.answer[Number(i)])), `${id} seed ${seed} d${difficulty} ${letter}`).toBe(true);
        }
      }
    }
  });

  it('letters found in a tree', () => {
    for (const id of ['af11-cubed-tree', 'af11-four-cover-tree', 'af11-xpow-tree']) {
      for (const { slide, seed, difficulty } of slides(id)) {
        if (slide.kind !== 'tree') throw new Error('expected tree');
        const values = lettersNamed(slide);
        slide.nodes.forEach((node, i) => {
          if (/^[A-F]$/.test(node.id)) {
            expect(close(values[node.id], Number(slide.answer[i])), `${id} seed ${seed} d${difficulty} ${node.id}`).toBe(true);
          }
        });
      }
    }
  });

  it('the rest tree: a whole number that leaves a proper fraction, then its numerators', () => {
    for (const { slide, seed, difficulty } of slides('af11-whole-rest-tree')) {
      if (slide.kind !== 'tree') throw new Error('expected tree');
      const k = Number(slide.answer[0]);
      const { exact, values } = fit(formInPrompt(slide), (x) => at(slide.expression, x) - k);
      expect(exact, `seed ${seed} d${difficulty}`).toBe(true);
      expect(close(values.A, Number(slide.answer[1])) && close(values.B, Number(slide.answer[3]))).toBe(true);
    }
  });

  it('the cover-up line for C over a squared bracket', () => {
    for (const { slide, seed, difficulty } of slides('af11-four-square-steps')) {
      if (slide.kind !== 'steps') throw new Error('expected steps');
      const values = lettersNamed(slide);
      const [top, , , square, single] = slide.start;
      const [sq, , product, c] = slide.reductions.map((r) => r.value);
      const where = `seed ${seed} d${difficulty}`;
      expect(close(Number(sq), at(square, 0)), where).toBe(true);
      expect(close(at(product, 0), at(square, 0) * at(single, 0)), where).toBe(true);
      expect(close(Number(c), at(top, 0) / at(product, 0)), where).toBe(true);
      expect(close(Number(c), values.C), where).toBe(true);
    }
  });
});

describe('level 11: every split written out adds back to the fraction', () => {
  const same = (left: string, right: (x: number) => number, where: string, letter = 'x') => {
    for (const x of POINTS) expect(at(left, x, letter), `${where} at ${letter} = ${x}: ${left}`).toBeCloseTo(right(x), 6);
  };

  it('af11-cubed-shift-steps: each rewrite in u, and the split', () => {
    for (const { slide, seed, difficulty } of slides('af11-cubed-shift-steps')) {
      if (slide.kind !== 'steps') throw new Error('expected steps');
      const fraction = display(slide);
      const where = `seed ${seed} d${difficulty}`;
      const [first, second, third] = slide.start;
      const [expanded, secondExpanded, collected, split] = slide.reductions.map((r) => r.value);
      same(expanded, (u) => at(first, u, 'u'), `${where} first`, 'u');
      same(secondExpanded, (u) => at(second, u, 'u'), `${where} second`, 'u');
      same(collected, (u) => at(`${first} ${second} ${third}`, u, 'u'), `${where} collected`, 'u');
      same(split, (x) => at(fraction, x), `${where} split`);
      // And the line in u is the top: u = x + a, read off the bracket in the first piece.
      const a = -Number(/\(u ([+-] \d+)\)/.exec(first)![1].replace(' ', ''));
      const bottom = /\\frac\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}\{(.*)\}$/.exec(fraction)![1];
      same(collected, (u) => at(fraction, u - a) * at(bottom, u - a), `${where} top`, 'u');
    }
  });

  it('whole parts divided out and split', () => {
    for (const { slide, seed, difficulty } of slides('af11-whole-tiles')) {
      if (slide.kind !== 'tiles') throw new Error('expected tiles');
      same(slide.answer.join(' '), (x) => at(display(slide), x), `tiles seed ${seed} d${difficulty}`);
    }
    for (const { slide, seed, difficulty } of slides('af11-whole-steps')) {
      if (slide.kind !== 'steps') throw new Error('expected steps');
      const fraction = slide.start[0];
      for (const r of slide.reductions) same(r.value, (x) => at(fraction, x), `steps seed ${seed} d${difficulty}`);
    }
  });

  it('af11-whole-flow: the whole number and a proper fraction left, or proper from the start', () => {
    for (const { slide, seed, difficulty } of slides('af11-whole-flow')) {
      if (slide.kind !== 'flow') throw new Error('expected flow');
      const where = `seed ${seed} d${difficulty}`;
      const big = (tex: string) => Math.abs(at(tex, 1e4));
      if (slide.answer[0] === 'No') {
        expect(big(slide.subject), where).toBeLessThan(0.01);
        continue;
      }
      const k = Number(slide.answer[1].replace(/\$/g, ''));
      const rest = slide.answer[2].replace(/\$/g, '');
      same(`${k} + ${rest}`, (x) => at(slide.subject, x), where);
      expect(big(rest), where).toBeLessThan(0.01);
    }
  });

  it('af11-xpow-flow: x = 0 isolates the top power of x, and the bracket has its own root', () => {
    for (const { slide, seed, difficulty } of slides('af11-xpow-flow')) {
      if (slide.kind !== 'flow') throw new Error('expected flow');
      const where = `seed ${seed} d${difficulty}`;
      const form = formInPrompt(slide);
      const { exact, values } = fit(form, (x) => at(slide.subject, x));
      expect(exact, where).toBe(true);
      const powers = [...form.matchAll(/\\frac\{([A-F])\}\{x\^\{(\d)\}\}/g)].sort((p, q) => Number(q[2]) - Number(p[2]));
      const letter = slide.answer[0].replace(/\$/g, '');
      expect(letter, where).toBe(powers[0][1]);
      expect(close(values[letter], Number(slide.answer[1].replace(/\$/g, ''))), where).toBe(true);
      const bracket = /\\frac\{[A-F]\}\{(x [+-] \d+)\}/.exec(form)![1];
      const x = Number(slide.answer[2].replace(/\$|x = /g, ''));
      expect(at(bracket, x), where).toBe(0);
    }
  });

  it('af11-choose-flow: the quadratic splits as stated or has no real roots, and the count is the degree', () => {
    for (const { slide, seed, difficulty } of slides('af11-choose-flow')) {
      if (slide.kind !== 'flow') throw new Error('expected flow');
      const where = `seed ${seed} d${difficulty}`;
      const quad = /\$([^$]*)\$/.exec(slide.steps[0].ask)![1];
      if (slide.answer[0] === 'Yes') {
        same(slide.answer[1].replace(/\$/g, ''), (x) => at(quad, x), where);
      } else {
        const c = at(quad, 0);
        const p = (at(quad, 1) - at(quad, -1)) / 2;
        expect(p * p - 4 * c, where).toBeLessThan(0);
      }
      expect(Number(slide.answer[2].replace(/\$/g, '')), where).toBe(degreeOf(slide.subject));
    }
  });
});
