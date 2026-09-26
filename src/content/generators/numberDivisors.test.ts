/**
 * Number & Proof level 11, Divisors and Unique Factorisation: the arithmetic
 * behind the slides.
 *
 * The generic sweep proves each generator agrees with itself. These read the
 * numbers each slide states and re-derive every answer the slow way: divisors
 * by trial division one number at a time, factorisations as BigInt products,
 * smallest multipliers by counting up, and never the power-reading shortcuts
 * the generators use. They also hold every number the learner reads, prompt
 * and worked solution alike, under 1000.
 */
import { describe, it, expect } from 'vitest';
import { makeRng } from '../../engine/rng';
import type { Generator, Lesson, Slide } from '../types';
import { choiceVariant } from '../choiceVariant';
import { numberDivisorsGenerators } from './numberDivisors';
import { startSession, reduce, currentSlide } from '../../engine/session';

const SEEDS = 200;

type Kind = Slide['kind'];
type Of<K extends Kind> = Extract<Slide, { kind: K }>;

const byId = (id: string) => {
  const generator = numberDivisorsGenerators.find((g) => g.id === id) as Generator<unknown> | undefined;
  if (!generator) throw new Error(`no generator ${id}`);
  return generator;
};

function draws<K extends Kind>(id: string, kind: K, generator: Generator<unknown> = byId(id)) {
  const out: { slide: Of<K>; params: unknown; difficulty: number; generator: Generator<unknown> }[] = [];
  for (const difficulty of [1, 2]) {
    for (let seed = 0; seed < SEEDS; seed += 1) {
      const params = generator.sample(makeRng(seed), difficulty);
      const slide = generator.render(params);
      expect(slide.kind, id).toBe(kind);
      out.push({ slide: slide as Of<K>, params, difficulty, generator });
    }
  }
  return out;
}

const slides = <K extends Kind>(id: string, kind: K) => draws(id, kind).map((d) => d.slide);

const promptOf = (slide: Exclude<Slide, { kind: 'teach' }>) =>
  slide.prompt.map((block) => (block.kind === 'prose' ? block.text : block.kind === 'display' ? block.tex : '')).join(' ');

/** Every `$...$` in a piece of prose. */
const mathsIn = (text: string) => [...text.matchAll(/\$([^$]+)\$/g)].map((m) => m[1]);

/** A product of prime powers as TeX, `2^3 \times 3^{10} \times 5`, as a BigInt. */
function bigOf(tex: string): bigint {
  return tex
    .split('\\times')
    .map((part) => part.trim())
    .reduce((acc, part) => {
      const m = /^(\d+)(?:\^\{?(\d+)\}?)?$/.exec(part);
      if (!m) throw new Error(`not a product of powers: ${tex}`);
      return acc * BigInt(m[1]) ** BigInt(m[2] ?? '1');
    }, 1n);
}

/** `name = <product>` out of a string of TeX or prose. */
function named(text: string, name: string): bigint {
  const m = new RegExp(`${name} = ([0-9^{}\\s\\\\a-z]+?)(?:\\$|\\\\\\\\|\\\\end|$)`).exec(text);
  if (!m) throw new Error(`no ${name} in ${text}`);
  return bigOf(m[1].trim());
}

const divisors = (n: number) => {
  const out: number[] = [];
  for (let d = 1; d <= n; d += 1) if (n % d === 0) out.push(d);
  return out;
};
const sigma = (n: number) => divisors(n).reduce((a, b) => a + b, 0);

/** Is x a perfect k-th power? */
function isPower(x: bigint, k: number): boolean {
  const guess = BigInt(Math.round(Number(x) ** (1 / k)));
  return [guess - 1n, guess, guess + 1n].some((r) => r >= 0n && r ** BigInt(k) === x);
}

/** The power of p in x. */
function powerOf(x: bigint, p: bigint): number {
  let e = 0;
  while (x % p === 0n) {
    x /= p;
    e += 1;
  }
  return e;
}

const chosen = (slide: Of<'choice'>) => slide.options.find((option) => option.id === slide.correctId)!.label;
const others = (slide: Of<'choice'>) => slide.options.filter((option) => option.id !== slide.correctId).map((o) => o.label);

describe('what the learner reads', () => {
  it('writes no number of 1000 or more, in prompts or solutions', () => {
    for (const generator of numberDivisorsGenerators as Generator<unknown>[]) {
      for (const difficulty of [1, 2]) {
        for (let seed = 0; seed < 60; seed += 1) {
          const params = generator.sample(makeRng(seed), difficulty);
          const slide = generator.render(params) as Exclude<Slide, { kind: 'teach' }>;
          const text = [
            JSON.stringify(slide.prompt),
            slide.kind === 'flow' ? slide.subject : '',
            slide.kind === 'tiles' ? slide.template + slide.bank.join(' ') : '',
            slide.kind === 'table' || slide.kind === 'tree' ? slide.bank.join(' ') : '',
            slide.kind === 'choice' ? slide.options.map((o) => o.label).join(' ') : '',
            JSON.stringify(generator.solution(params)),
          ].join(' ');
          const big = (text.match(/\d+/g) ?? []).filter((d) => Number(d) >= 1000);
          expect(big, `${generator.id} seed ${seed}`).toEqual([]);
        }
      }
    }
  });
});

describe('divides, from the powers', () => {
  it('offers exactly one divisor of N', () => {
    for (const slide of slides('dvf-divides', 'choice')) {
      const N = named(promptOf(slide), 'N');
      expect(N % bigOf(chosen(slide))).toBe(0n);
      for (const label of others(slide)) expect(N % bigOf(label), label).not.toBe(0n);
    }
  });

  it('walks the flow the way the numbers go', () => {
    for (const slide of slides('dvf-divides-flow', 'flow')) {
      const a = named(slide.subject, 'a');
      const b = named(slide.subject, 'b');
      const divides = b % a === 0n;
      expect(slide.answer[slide.answer.length - 1]).toBe(divides ? 'Yes' : 'No');
      // Every prime of a in b: b is divisible by each prime a is.
      let rest = a;
      let primesIn = true;
      for (let p = 2n; rest > 1n; p += 1n) {
        if (rest % p !== 0n) continue;
        while (rest % p === 0n) rest /= p;
        if (b % p !== 0n) primesIn = false;
      }
      expect(slide.answer[0]).toBe(primesIn ? 'Yes' : 'No');
      expect(slide.answer.length).toBe(primesIn ? 3 : 2);
    }
  });

  it('fills the powers of the quotient', () => {
    for (const slide of slides('dvf-quotient-table', 'table')) {
      const text = promptOf(slide);
      const q = named(text, 'b') / named(text, 'a');
      expect(named(text, 'b') % named(text, 'a')).toBe(0n);
      const expected = slide.rows.map((row) => String(powerOf(q, BigInt(row[0]!))));
      expect(slide.answer).toEqual(expected);
    }
  });

  it('gives the quotient as a number', () => {
    for (const slide of slides('dvf-quotient', 'expression')) {
      const text = promptOf(slide);
      const [a, b] = [named(text, 'a'), named(text, 'b')];
      expect(b % a).toBe(0n);
      expect(slide.answer).toBe(String(b / a));
    }
  });

  it('finds the smallest k by counting up', () => {
    for (const slide of slides('dvf-missing', 'expression')) {
      const text = promptOf(slide);
      const [a, b] = [named(text, 'a'), named(text, 'b')];
      let k = 1n;
      while ((b * k) % a !== 0n) k += 1n;
      expect(slide.answer).toBe(String(k));
    }
  });
});

describe('squares and cubes', () => {
  it('offers exactly one perfect power', () => {
    for (const slide of slides('dvf-is-square', 'choice')) {
      const k = promptOf(slide).includes('square') ? 2 : 3;
      expect(isPower(bigOf(chosen(slide)), k)).toBe(true);
      for (const label of others(slide)) expect(isPower(bigOf(label), k), label).toBe(false);
    }
  });

  it('gives the root', () => {
    for (const slide of slides('dvf-root', 'expression')) {
      const text = promptOf(slide);
      const k = text.includes('[3]') ? 3 : 2;
      expect(BigInt(slide.answer) ** BigInt(k)).toBe(named(text, 'N'));
    }
  });

  const smallest = (n: number, k: number, divide: boolean) => {
    for (let m = 1; ; m += 1) {
      if (divide && n % m !== 0) continue;
      const x = divide ? BigInt(n / m) : BigInt(n * m);
      if (isPower(x, k)) return m;
    }
  };

  it('finds the smallest multiplier and divisor by counting up', () => {
    for (const [id, divide] of [
      ['dvf-multiplier', false],
      ['dvf-divide', true],
    ] as const) {
      for (const slide of slides(id, 'expression')) {
        const text = promptOf(slide);
        const n = Number(/\$(\d+) \\(?:times|div)/.exec(text)![1]);
        const k = text.includes('square') ? 2 : 3;
        expect(slide.answer, `${id} ${n}`).toBe(String(smallest(n, k, divide)));
      }
    }
  });

  it('fills the powers of n and of k', () => {
    for (const slide of slides('dvf-power-table', 'table')) {
      const text = promptOf(slide);
      const n = Number(/\$(\d+) \\times k/.exec(text)![1]);
      const k = text.includes('square') ? 2 : 3;
      const m = smallest(n, k, false);
      const expected = slide.rows.flatMap((row) => {
        const p = BigInt(row[0]!);
        return [String(powerOf(BigInt(n), p)), String(powerOf(BigInt(m), p))];
      });
      expect(slide.answer).toEqual(expected);
      // Every prime of n has a row.
      const product = slide.rows.reduce((acc, row, i) => acc * BigInt(row[0]!) ** BigInt(expected[2 * i]), 1n);
      expect(product).toBe(BigInt(n));
    }
  });
});

describe('sum of divisors', () => {
  it('gives sigma(n) by listing divisors', () => {
    for (const id of ['dvf-sigma-list', 'dvf-sigma']) {
      for (const slide of slides(id, 'expression')) {
        const n = Number(/\\sigma\((\d+)\)/.exec(promptOf(slide))![1]);
        expect(slide.answer).toBe(String(sigma(n)));
      }
    }
  });

  it('fills the tree with the brackets and sigma(n)', () => {
    for (const slide of slides('dvf-sigma-tree', 'tree')) {
      const n = Number(/\\sigma\((\d+)\)/.exec(slide.expression)![1]);
      const text = promptOf(slide);
      const parts = mathsIn(text)
        .map((m) => /^\\sigma\((\d+)\)$/.exec(m))
        .filter((m): m is RegExpExecArray => m !== null)
        .map((m) => Number(m[1]))
        .filter((x) => x !== n);
      expect(parts.reduce((a, b) => a * b, 1)).toBe(n);
      expect(slide.answer).toEqual([...parts.map(sigma), sigma(n)].map(String));
    }
  });

  it('fills the grid with divisors, every divisor once, and offers a distractor', () => {
    for (const slide of slides('dvf-divisor-grid', 'table')) {
      const n = Number(/\$(\d+) = /.exec(promptOf(slide))![1]);
      const heads = slide.columns.slice(1).map(Number);
      let blank = 0;
      const cells: number[] = [];
      for (const row of slide.rows) {
        row.slice(1).forEach((cell, j) => {
          const value = Number(row[0]) * heads[j];
          if (cell === null) expect(slide.answer[blank++]).toBe(String(value));
          else expect(cell).toBe(String(value));
          cells.push(value);
        });
      }
      expect(blank).toBe(slide.answer.length);
      expect(cells.sort((x, y) => x - y)).toEqual(divisors(n));
      expect(slide.bank.length).toBeGreaterThan(slide.answer.length);
    }
  });

  it('fills sigma of each part and of the product', () => {
    for (const slide of slides('dvf-sigma-tiles', 'tiles')) {
      const ns = [...slide.template.matchAll(/\\sigma\((\d+)\)/g)].map((m) => Number(m[1]));
      expect(ns[0] * ns[1]).toBe(ns[2]);
      expect(slide.answer).toEqual(ns.map(sigma).map(String));
    }
  });
});

describe('perfect, abundant and deficient', () => {
  const kind = (n: number) => {
    const s = sigma(n) - n;
    return s === n ? 'Perfect' : s > n ? 'Abundant' : 'Deficient';
  };

  it('classifies n', () => {
    for (const slide of slides('dvf-classify', 'choice')) {
      const n = Number(/\$(\d+)\$/.exec(promptOf(slide))![1]);
      expect(chosen(slide)).toBe(kind(n));
    }
  });

  it('draws every kind', () => {
    for (const difficulty of [1, 2]) {
      const seen = new Set<string>();
      for (let seed = 0; seed < SEEDS; seed += 1) {
        const g = byId('dvf-classify');
        seen.add(chosen(g.render(g.sample(makeRng(seed), difficulty)) as Of<'choice'>));
      }
      expect([...seen].sort()).toEqual(['Abundant', 'Deficient', 'Perfect']);
    }
  });

  it('gives the proper-divisor sum', () => {
    for (const slide of slides('dvf-proper-sum', 'expression')) {
      const n = Number(/\$(\d+)\$/.exec(promptOf(slide))![1]);
      expect(slide.answer).toBe(String(sigma(n) - n));
    }
  });

  it('walks the flow through sigma, the proper sum and the kind', () => {
    for (const slide of slides('dvf-classify-flow', 'flow')) {
      const n = Number(/n = (\d+)/.exec(slide.subject)![1]);
      expect(slide.answer).toEqual([`$${sigma(n)}$`, `$${sigma(n) - n}$`, kind(n)]);
    }
  });

  it('offers exactly one abundant number', () => {
    for (const slide of slides('dvf-which-abundant', 'choice')) {
      expect(kind(Number(chosen(slide)))).toBe('Abundant');
      for (const label of others(slide)) expect(kind(Number(label))).not.toBe('Abundant');
    }
  });

  it('fills the tree for 2^k times a prime', () => {
    for (const slide of slides('dvf-two-power-tree', 'tree')) {
      const n = Number(/\\sigma\((\d+)\)/.exec(slide.expression)![1]);
      const [two, odd] = [...promptOf(slide).matchAll(/\\sigma\((\d+)\)/g)].map((m) => Number(m[1]));
      expect(two * odd).toBe(n);
      expect(slide.answer).toEqual([sigma(two), sigma(odd), sigma(n), sigma(n) - n].map(String));
    }
  });
});

describe('pairing divisors', () => {
  it('pairs every divisor up to the square root', () => {
    for (const { slide, params } of draws('dvf-pair-table', 'table')) {
      const n = (params as { n: number }).n;
      expect(slide.columns[1]).toBe(`${n} \\div d`);
      const low = divisors(n).filter((d) => d * d <= n);
      expect(slide.rows.length).toBe(low.length);
      const expected = low.flatMap((d, i) => (slide.rows[i][0] === null ? [d, n / d] : [n / d]));
      slide.rows.forEach((row, i) => {
        if (row[0] !== null) expect(row[0]).toBe(String(low[i]));
      });
      expect(slide.answer).toEqual(expected.map(String));
    }
  });

  const count = (x: bigint) => {
    let rest = x;
    let t = 1;
    for (let p = 2n; rest > 1n; p += 1n) {
      const e = powerOf(rest, p);
      rest /= p ** BigInt(e);
      t *= e + 1;
    }
    return t;
  };

  it('offers exactly one number with an odd count', () => {
    for (const slide of slides('dvf-odd-count', 'choice')) {
      expect(count(bigOf(chosen(slide))) % 2).toBe(1);
      for (const label of others(slide)) expect(count(bigOf(label)) % 2).toBe(0);
    }
  });

  it('counts the numbers with an odd count up to M', () => {
    for (const slide of slides('dvf-upto', 'expression')) {
      const M = Number(/to \$(\d+)\$/.exec(promptOf(slide))![1]);
      let odd = 0;
      for (let x = 1; x <= M; x += 1) if (divisors(x).length % 2 === 1) odd += 1;
      expect(slide.answer).toBe(String(odd));
    }
  });

  it('gives the power the product of the divisors is', () => {
    for (const slide of slides('dvf-product-power', 'expression')) {
      const [n, root] = [...promptOf(slide).matchAll(/\$(\d+)/g)].map((m) => Number(m[1]));
      const product = divisors(n).reduce((acc, d) => acc * BigInt(d), 1n);
      expect(BigInt(root) ** BigInt(slide.answer)).toBe(product);
    }
  });

  it('proves a non-square has an even count, and grades its own proof right', () => {
    const generator = byId('dvf-pair-order');
    for (const difficulty of [1, 2]) {
      for (let seed = 0; seed < 40; seed += 1) {
        const lesson: Lesson = {
          id: 'proof',
          title: 'Proof',
          slides: [{ type: 'generated', generatorId: generator.id, difficulty }],
          skillCheck: [],
        };
        const session = startSession(lesson, { [generator.id]: generator as Generator<never> }, seed);
        const slide = currentSlide(session)!.slide as Of<'order'>;
        const n = Number(/\$(\d+)\$/.exec(promptOf(slide))![1]);
        expect(divisors(n).length % 2).toBe(0);
        expect(reduce(session, { type: 'submit', answer: slide.answer }).feedback.kind).toBe('correct');
        const swapped = [...slide.answer];
        [swapped[0], swapped[1]] = [swapped[1], swapped[0]];
        expect(reduce(session, { type: 'submit', answer: swapped }).feedback.kind).toBe('incorrect');
      }
    }
  });
});

describe('choice variants', () => {
  it('put the typed answer among the options', () => {
    for (const generator of numberDivisorsGenerators as Generator<unknown>[]) {
      const variant = choiceVariant(generator);
      if (!variant) continue;
      for (const { slide, params } of draws(variant.id, 'choice', variant)) {
        const typed = generator.render(params) as Of<'expression'>;
        expect(chosen(slide)).toBe(typed.answer);
      }
    }
  });
});
