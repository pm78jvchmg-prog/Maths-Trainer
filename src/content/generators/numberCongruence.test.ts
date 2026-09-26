/**
 * Number & Proof level 9, Linear Congruences and Inverses: the arithmetic
 * behind the slides.
 *
 * The generic sweep proves each generator agrees with itself. These read the
 * numbers each slide states and hold every inverse, solution and count to a
 * brute-force search over x from 0 to n - 1, never to the inverse or the
 * backwards run the generator used. Every backwards line a slide shows is
 * evaluated with mathjs, and every congruence a slide calls equivalent is
 * compared on its whole-number solutions.
 */
import { describe, it, expect } from 'vitest';
import { evaluate } from 'mathjs';
import { makeRng } from '../../engine/rng';
import type { Generator, Slide } from '../types';
import { choiceVariant } from '../choiceVariant';
import { numberCongruenceGenerators } from './numberCongruence';

const SEEDS = 200;

type Kind = Slide['kind'];
type Of<K extends Kind> = Extract<Slide, { kind: K }>;

const byId = (id: string) => {
  const generator = numberCongruenceGenerators.find((g) => g.id === id) as Generator<unknown> | undefined;
  if (!generator) throw new Error(`no generator ${id}`);
  return generator;
};

/** Every slide a generator draws, at both difficulties. */
function slides<K extends Kind>(id: string, kind: K, generator: Generator<unknown> = byId(id)): Of<K>[] {
  const out: Of<K>[] = [];
  for (const difficulty of [1, 2]) {
    for (let seed = 0; seed < SEEDS; seed += 1) {
      const slide = generator.render(generator.sample(makeRng(seed), difficulty));
      expect(slide.kind, id).toBe(kind);
      out.push(slide as Of<K>);
    }
  }
  return out;
}

/** The prompt's words and maths, run together. */
const promptOf = (slide: Exclude<Slide, { kind: 'teach' }>) =>
  slide.prompt.map((block) => (block.kind === 'prose' ? block.text : block.kind === 'display' ? block.tex : '')).join(' ');

/** Whole numbers in a string, signs kept. */
const ints = (text: string) => (text.match(/-?\d+/g) ?? []).map(Number);

const residue = (x: number, n: number) => ((x % n) + n) % n;

/** Every x from 0 to n - 1 with ax ≡ b (mod n), by trying each. */
const solve = (a: number, b: number, n: number) =>
  Array.from({ length: n }, (_, x) => x).filter((x) => residue(a * x - b, n) === 0);

/** The whole-number solutions of two congruences agree over a common period. */
function same([a1, b1, n1]: number[], [a2, b2, n2]: number[]): boolean {
  for (let x = 0; x < n1 * n2; x += 1) {
    if ((residue(a1 * x - b1, n1) === 0) !== (residue(a2 * x - b2, n2) === 0)) return false;
  }
  return true;
}

/** `ax \equiv b \pmod{n}` read back as [a, b, n]; a bare `x` is 1. */
function congruence(tex: string): number[] {
  const match = /(\d*)x \\equiv (-?\d+) \\pmod\{(\d+)\}/.exec(tex);
  if (!match) throw new Error(`no congruence in ${tex}`);
  return [match[1] === '' ? 1 : Number(match[1]), Number(match[2]), Number(match[3])];
}

const chosen = (slide: Of<'choice'>) => slide.options.find((option) => option.id === slide.correctId)!.label;

/** A TeX line of arithmetic, as mathjs reads it. */
const texValue = (tex: string) => Number(evaluate(tex.replace(/\\times/g, '*')));

/** The answer steps of an order slide, as text. */
const orderText = (slide: Of<'order'>) => slide.answer.map((id) => slide.steps.find((step) => step.id === id)!.text);

describe('inverses mod n', () => {
  it('fills the row of multiples', () => {
    for (const slide of slides('lcong-inverse-row', 'table')) {
      const [a, n] = ints(slide.columns[1]);
      const row = slide.rows.map((_, i) => residue((i + 1) * a, n));
      const blanks = slide.rows.flatMap((cells, i) => (cells[1] === null ? [row[i]] : []));
      expect(slide.answer.map(Number)).toEqual(blanks);
      slide.rows.forEach((cells, i) => cells[1] !== null && expect(Number(cells[1])).toBe(row[i]));
    }
  });

  it('finds the inverse', () => {
    const generator = byId('lcong-inverse');
    const check = (a: number, n: number, b: number) => {
      expect(b).toBeGreaterThanOrEqual(1);
      expect(b).toBeLessThan(n);
      expect(residue(a * b, n), `${a} x ${b} mod ${n}`).toBe(1);
    };
    for (const slide of slides('lcong-inverse', 'expression', generator)) {
      const [a, n] = ints(promptOf(slide));
      check(a, n, Number(slide.answer));
    }
    for (const slide of slides('lcong-inverse+choice', 'choice', choiceVariant(generator)!)) {
      const [a, n] = ints(promptOf(slide));
      check(a, n, Number(chosen(slide)));
    }
  });

  it('fills a table of inverses, listing only the numbers that have one', () => {
    for (const slide of slides('lcong-inverse-table', 'table')) {
      const [n] = ints(slide.columns[1]);
      const numbers = slide.rows.map((cells) => Number(cells[0]));
      expect(numbers).toEqual(Array.from({ length: n - 1 }, (_, i) => i + 1).filter((u) => solve(u, 1, n).length === 1));
      const blanks = slide.rows.filter((cells) => cells[1] === null).map((cells) => Number(cells[0]));
      slide.answer.forEach((b, i) => expect(residue(blanks[i] * Number(b), n)).toBe(1));
    }
  });

  it('offers exactly one number with an inverse', () => {
    for (const slide of slides('lcong-has-inverse', 'choice')) {
      const [n] = ints(promptOf(slide));
      const invertible = slide.options.filter(({ label }) => solve(Number(label), 1, n).length > 0);
      expect(invertible.map(({ id }) => id)).toEqual([slide.correctId]);
    }
  });

  it('walks to the inverse, or to none', () => {
    for (const slide of slides('lcong-inverse-flow', 'flow')) {
      const [a, n] = ints(promptOf(slide));
      const found = solve(a, 1, n);
      const h = Array.from({ length: a }, (_, i) => a - i).find((d) => a % d === 0 && n % d === 0)!;
      expect(slide.answer).toEqual(found.length === 1 ? ['$1$', 'Yes', `$${found[0]}$`] : [`$${h}$`, 'No']);
    }
  });
});

describe('inverses by Euclid', () => {
  it('reads the inverse off a backwards line that really comes to 1', () => {
    for (const slide of slides('lcong-from-bezout', 'expression')) {
      const [n, a] = ints(slide.prompt[0].kind === 'prose' ? slide.prompt[0].text : '');
      const line = slide.prompt[1].kind === 'display' ? slide.prompt[1].tex : '';
      expect(texValue(line.replace(/^1 = /, ''))).toBe(1);
      expect(residue(a * Number(slide.answer), n)).toBe(1);
      expect(Number(slide.answer)).toBeLessThan(n);
    }
  });

  it('orders a run that ends on the inverse', () => {
    for (const slide of slides('lcong-euclid-order', 'order')) {
      const [a, n] = ints(/inverse of \$(\d+)\$ modulo \$(\d+)\$/.exec(promptOf(slide))!.slice(1).join(' '));
      const steps = orderText(slide);
      const found = ints(steps.find((s) => s.includes('the inverse is'))!);
      expect(residue(a * found[found.length - 1], n)).toBe(1);
      for (const text of steps.filter((s) => s.startsWith('Check'))) {
        const [inv, times, product, q, m, one] = ints(text);
        expect([times, product, q * m + one, m, one]).toEqual([a, inv * a, inv * a, n, 1]);
        expect(residue(inv * a, n)).toBe(1);
      }
      // Every backwards line in the proof comes to 1.
      for (const text of steps.filter((s) => s.includes('$1 = '))) {
        expect(texValue(/\$1 = ([^$]+)\$/.exec(text)![1])).toBe(1);
      }
    }
  });

  it('finds the inverse by Euclid', () => {
    const generator = byId('lcong-euclid-inverse');
    for (const slide of slides('lcong-euclid-inverse', 'expression', generator)) {
      const [a, n] = ints(promptOf(slide));
      expect(residue(a * Number(slide.answer), n)).toBe(1);
    }
    for (const slide of slides('lcong-euclid-inverse+choice', 'choice', choiceVariant(generator)!)) {
      const [a, n] = ints(promptOf(slide));
      expect(residue(a * Number(chosen(slide)), n)).toBe(1);
    }
  });

  it('drops the multiple of n and brings the number beside a into range', () => {
    for (const slide of slides('lcong-reduce-flow', 'flow')) {
      const [n, a] = ints(promptOf(slide));
      expect(texValue(slide.subject.replace(/^1 = /, ''))).toBe(1);
      const v = ints(slide.answer[1])[0];
      const inv = ints(slide.answer[2])[0];
      expect(residue(a * v, n)).toBe(1);
      expect(residue(a * inv, n)).toBe(1);
      expect(inv).toBeGreaterThanOrEqual(1);
      expect(inv).toBeLessThan(n);
    }
  });

  it('keeps every row of the y table equal to a times y modulo n', () => {
    for (const slide of slides('lcong-euclid-table', 'table')) {
      const [n, a] = [Number(slide.rows[0][1]), Number(slide.rows[1][1])];
      const ys = [0, 1, ...slide.answer.map(Number)];
      slide.rows.forEach((cells, i) => expect(residue(a * ys[i] - Number(cells[1]), n), `row ${i}`).toBe(0));
      expect(Number(slide.rows[slide.rows.length - 1][1])).toBe(1);
    }
  });
});

describe('solving ax ≡ b', () => {
  it('multiplies by the inverse it states', () => {
    for (const slide of slides('lcong-solve-tiles', 'tiles')) {
      const [a, n, k, , b] = ints(promptOf(slide));
      expect(residue(a * k, n)).toBe(1);
      expect(Number(slide.answer[0])).toBe(k * b);
      expect(solve(a, b, n)).toEqual([Number(slide.answer[1])]);
    }
  });

  it('solves a congruence with a coprime a', () => {
    const generator = byId('lcong-solve');
    for (const slide of slides('lcong-solve', 'expression', generator)) {
      const [a, b, n] = congruence(promptOf(slide));
      expect(solve(a, b, n)).toEqual([Number(slide.answer)]);
    }
    for (const slide of slides('lcong-solve+choice', 'choice', choiceVariant(generator)!)) {
      const [a, b, n] = congruence(promptOf(slide));
      expect(solve(a, b, n)).toEqual([Number(chosen(slide))]);
    }
  });

  it('checks a candidate by putting it in', () => {
    for (const slide of slides('lcong-check-flow', 'flow')) {
      const [a, b, n] = congruence(slide.subject);
      const [c] = ints(promptOf(slide));
      expect(slide.answer).toEqual([`$${a * c}$`, `$${residue(a * c, n)}$`, solve(a, b, n).includes(c) ? 'Yes' : 'No']);
    }
  });

  it('takes the constant away first', () => {
    for (const slide of slides('lcong-shift', 'expression')) {
      const [a, c, b, n] = ints(promptOf(slide));
      const found = Array.from({ length: n }, (_, x) => x).filter((x) => residue(a * x + c - b, n) === 0);
      expect(found).toEqual([Number(slide.answer)]);
    }
  });

  it('orders a solution that ends on the one solution', () => {
    for (const slide of slides('lcong-solve-order', 'order')) {
      const [a, b, n] = congruence(promptOf(slide));
      const step = orderText(slide).find((text) => text.includes(', so $x \\equiv'))!;
      const x = ints(/so \$x \\equiv (\d+)/.exec(step)![1])[0];
      expect(solve(a, b, n)).toEqual([x]);
    }
  });
});

describe('when the HCF is not 1', () => {
  it('offers exactly one congruence with solutions', () => {
    for (const slide of slides('lcong-solvable', 'choice')) {
      const solvable = slide.options.filter(({ label }) => solve(...(congruence(label) as [number, number, number])).length > 0);
      expect(solvable.map(({ id }) => id)).toEqual([slide.correctId]);
    }
  });

  it('counts the solutions through the flow', () => {
    for (const slide of slides('lcong-hcf-flow', 'flow')) {
      const [a, b, n] = congruence(slide.subject);
      const count = solve(a, b, n).length;
      expect(ints(slide.answer[0])[0]).toBe(Array.from({ length: a }, (_, i) => a - i).find((d) => a % d === 0 && n % d === 0));
      if (count === 0) expect(slide.answer.length).toBe(2);
      else expect(ints(slide.answer[2])[0]).toBe(count);
    }
  });

  it('counts the solutions from 0 to n - 1', () => {
    const generator = byId('lcong-count');
    for (const slide of slides('lcong-count', 'expression', generator)) {
      const [a, b, n] = congruence(promptOf(slide));
      expect(Number(slide.answer)).toBe(solve(a, b, n).length);
    }
    for (const slide of slides('lcong-count+choice', 'choice', choiceVariant(generator)!)) {
      const [a, b, n] = congruence(promptOf(slide));
      expect(Number(chosen(slide))).toBe(solve(a, b, n).length);
    }
  });

  it('divides through to a congruence with the same solutions', () => {
    for (const slide of slides('lcong-divide-tiles', 'tiles')) {
      const original = congruence(promptOf(slide));
      const divided = slide.answer.map(Number);
      expect(same(original, divided)).toBe(true);
      expect(original[2] % divided[2]).toBe(0);
      expect(divided[2]).toBeLessThan(original[2]);
    }
  });

  it('finds the smallest solution', () => {
    for (const slide of slides('lcong-hcf-solve', 'expression')) {
      const [a, b, n] = congruence(promptOf(slide));
      expect(Number(slide.answer)).toBe(solve(a, b, n)[0]);
    }
  });

  it('lists every solution, smallest first', () => {
    for (const slide of slides('lcong-all-table', 'table')) {
      const [a, b, n] = congruence(promptOf(slide));
      expect(slide.answer.map(Number)).toEqual(solve(a, b, n));
    }
  });
});

describe('cancelling safely', () => {
  it('offers exactly one congruence where cancelling keeps the modulus', () => {
    for (const slide of slides('lcong-cancel-safe', 'choice')) {
      const safe = slide.options.filter(({ label }) => {
        const [c, cy, n] = congruence(label);
        return same([c, cy, n], [1, cy / c, n]);
      });
      expect(safe.map(({ id }) => id)).toEqual([slide.correctId]);
    }
  });

  it('cancels to a congruence with the same solutions', () => {
    for (const slide of slides('lcong-cancel-tiles', 'tiles')) {
      const original = congruence(promptOf(slide));
      const [r, m] = slide.answer.map(Number);
      expect(same(original, [1, r, m])).toBe(true);
      expect(r).toBeLessThan(m);
    }
  });

  it('walks to a congruence with the same solutions', () => {
    for (const slide of slides('lcong-cancel-flow', 'flow')) {
      const original = congruence(slide.subject);
      expect(same(original, congruence(slide.answer[2]))).toBe(true);
      const others = slide.steps[2].branches.map((branch) => branch.label).filter((label) => label !== slide.answer[2]);
      for (const label of others) expect(same(original, congruence(label)), label).toBe(false);
    }
  });

  /** The congruence a story describes, read from its own numbers. */
  function storyOf(text: string): number[] {
    const [first, second, third] = ints(text);
    if (text.startsWith('A counter')) {
      const b = ints(/land on square \$(\d+)\$/.exec(text)![1])[0];
      return [first, b, second];
    }
    if (text.startsWith('Cards')) return [first, third, second];
    if (text.startsWith('A timer')) return [first, ints(/beep at \$(\d+)\$/.exec(text)![1])[0], 60];
    return [first, ints(/end at hour \$(\d+)\$/.exec(text)![1])[0], 24];
  }

  it('picks the congruence the story describes', () => {
    for (const slide of slides('lcong-story-setup', 'choice')) {
      const truth = storyOf(promptOf(slide));
      for (const option of slide.options) {
        expect(same(truth, congruence(option.label)), option.label).toBe(option.id === slide.correctId);
      }
    }
  });

  it('answers a story with its smallest positive solution', () => {
    for (const slide of slides('lcong-story', 'expression')) {
      const [a, b, n] = storyOf(promptOf(slide));
      const first = Array.from({ length: n }, (_, i) => i + 1).find((x) => residue(a * x - b, n) === 0);
      expect(Number(slide.answer)).toBe(first);
    }
  });
});
