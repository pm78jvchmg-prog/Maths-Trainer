/**
 * Number & Proof level 6, Modular Arithmetic: the arithmetic behind the slides.
 *
 * The generic sweep proves each generator agrees with itself. These read the
 * numbers each slide states and hold every quoted residue, last digit and
 * digit sum to this file's own `%`. Every power is re-done by multiplying one
 * step at a time, never by the cycle the generator used, and every expression
 * a slide shows is evaluated with mathjs rather than re-assembled by hand.
 */
import { describe, it, expect } from 'vitest';
import { evaluate } from 'mathjs';
import { makeRng } from '../../engine/rng';
import type { Generator, Slide } from '../types';
import { choiceVariant } from '../choiceVariant';
import { modularTesting, numberModularGenerators } from './numberModular';

const SEEDS = 200;

type Kind = Slide['kind'];
type Of<K extends Kind> = Extract<Slide, { kind: K }>;

const byId = (id: string) => {
  const generator = numberModularGenerators.find((g) => g.id === id) as Generator<unknown> | undefined;
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

/** A TeX line of arithmetic, as mathjs reads it. */
const texValue = (tex: string) =>
  Number(evaluate(tex.replace(/\\times/g, '*').replace(/\^\{(\d+)\}/g, '^$1').replace(/\\div/g, '/')));

/** The first `$...$` in a piece of prose. */
const firstMaths = (text: string) => /\$([^$]+)\$/.exec(text)![1];

/** A residue in 0..n - 1, whatever the sign. */
const residue = (x: number, n: number) => ((x % n) + n) % n;

/** a^e modulo n, one multiplication at a time. */
function slowPower(a: number, e: number, n: number): number {
  let out = 1 % n;
  for (let i = 0; i < e; i += 1) out = (out * residue(a, n)) % n;
  return out;
}

/** The length of the cycle of powers of a modulo n, by multiplying until a^1 comes back. */
function slowCycle(a: number, n: number): number {
  const first = residue(a, n);
  let x = first;
  for (let k = 1; k <= n; k += 1) {
    x = (x * first) % n;
    if (x === first) return k;
  }
  throw new Error(`no cycle for ${a} mod ${n}`);
}

const chosen = (slide: Of<'choice'>) => slide.options.find((option) => option.id === slide.correctId)!.label;

describe('congruence', () => {
  it('gives the residue of the number it names', () => {
    for (const slide of slides('cong-residue', 'expression')) {
      const [a, n] = ints(promptOf(slide));
      expect(Number(slide.answer), `${a} mod ${n}`).toBe(residue(a, n));
      expect(a).toBeGreaterThanOrEqual(n);
    }
  });

  it('gives a negative number a residue from 0 to n - 1', () => {
    for (const slide of slides('cong-negative', 'expression')) {
      const [a, n] = ints(promptOf(slide));
      expect(a).toBeLessThan(0);
      const answer = Number(slide.answer);
      expect(answer).toBe(residue(a, n));
      expect(residue(a - answer, n)).toBe(0);
    }
  });

  it('offers exactly one true congruence', () => {
    for (const slide of slides('cong-true', 'choice')) {
      const truths = slide.options.filter(({ label }) => {
        const [a, b, n] = ints(label);
        return (a - b) % n === 0;
      });
      expect(truths.map(({ id }) => id), JSON.stringify(slide.options)).toEqual([slide.correctId]);
    }
  });

  it('fills a table of residues', () => {
    for (const slide of slides('cong-class-table', 'table')) {
      const [n] = ints(slide.columns[1]);
      expect(slide.answer.map(Number)).toEqual(slide.rows.map((row) => residue(Number(row[0]), n)));
    }
  });

  it('decides a congruence by whether n divides the difference', () => {
    for (const slide of slides('cong-flow', 'flow')) {
      const [a, b, n] = ints(slide.subject);
      const holds = (a - b) % n === 0 ? 'Yes' : 'No';
      expect(slide.answer).toEqual([`$${a - b}$`, holds, holds]);
    }
  });
});

describe('adding and multiplying', () => {
  it('ends a chain of reductions on the residue of the whole line', () => {
    for (const slide of slides('cong-combine-steps', 'steps')) {
      const [n] = ints(firstMaths(promptOf(slide)));
      const value = texValue(slide.start.join(' '));
      const last = slide.reductions[slide.reductions.length - 1];
      expect(Number(last.value), slide.start.join(' ')).toBe(residue(value, n));
      // Each number's own reduction is its residue.
      const numbers = slide.start.filter((_, i) => i % 2 === 0).map(Number);
      numbers.forEach((x, i) => expect(Number(slide.reductions[i].value)).toBe(residue(x, n)));
    }
  });

  it('finds a combination from the residues alone', () => {
    for (const slide of slides('cong-from-residues', 'expression')) {
      const text = promptOf(slide);
      const [r, s, n] = ints(text);
      const form = /residue of \$([^$]+)\$/.exec(text)![1];
      const value = Number(evaluate(form.replace(/ab/g, 'a*b').replace(/(\d)([ab])/g, '$1*$2'), { a: r, b: s }));
      expect(Number(slide.answer), `${form} at ${r}, ${s}`).toBe(residue(value, n));
    }
  });

  it('fills a table modulo n with true sums or products', () => {
    for (const slide of slides('cong-op-table', 'table')) {
      const [n] = ints(promptOf(slide));
      const times = slide.columns[0] === '\\times';
      const answers = slide.answer.map(Number);
      const heads = slide.columns.slice(1).map(Number);
      for (const row of slide.rows) {
        const v = Number(row[0]);
        row.slice(1).forEach((cell, j) => {
          const value = cell === null ? answers.shift()! : Number(cell);
          expect(value).toBe(residue(times ? v * heads[j] : v + heads[j], n));
        });
      }
    }
  });

  it('proves a true claim about the residue of a sum or a product', () => {
    for (const slide of slides('cong-arith-order', 'order')) {
      const claim = promptOf(slide);
      const [r, s, n, t] = ints(claim);
      expect(t).toBe(residue(claim.includes('ab \\equiv') ? r * s : r + s, n));
    }
  });
});

describe('powers', () => {
  it('fills a table of powers by repeated multiplication', () => {
    for (const slide of slides('cong-power-table', 'table')) {
      const [a, n] = ints(slide.columns[1]);
      const answers = slide.answer.map(Number);
      for (const row of slide.rows) {
        const k = Number(row[0]);
        const value = row[1] === null ? answers.shift()! : Number(row[1]);
        expect(value, `${a}^${k} mod ${n}`).toBe(slowPower(a, k, n));
      }
    }
  });

  it('measures the cycle of powers', () => {
    for (const slide of slides('cong-cycle', 'expression')) {
      const [a, , , , , , n] = ints(promptOf(slide));
      expect(Number(slide.answer), `${a} mod ${n}`).toBe(slowCycle(a, n));
    }
  });

  it('finds a large power by multiplying all the way', () => {
    for (const slide of slides('cong-big-power', 'expression')) {
      const [a, e, n] = ints(promptOf(slide));
      expect(Number(slide.answer), `${a}^${e} mod ${n}`).toBe(slowPower(a, e, n));
    }
  });

  it('walks a power flow to the right length, remainder and residue', () => {
    for (const slide of slides('cong-power-flow', 'flow')) {
      const [a, e, n] = ints(slide.subject);
      const length = slowCycle(a, n);
      expect(slide.answer).toEqual([`$${length}$`, `$${e % length}$`, `$${slowPower(a, e, n)}$`]);
    }
  });

  it('squares repeatedly to the true residues', () => {
    for (const slide of slides('cong-square-tree', 'tree')) {
      const [a, e, n] = ints(slide.expression);
      const values = slide.answer.map(Number);
      const squares = slide.nodes.slice(0, -1).map((node) => Number(node.id.slice(1)));
      squares.forEach((p, i) => expect(values[i], `${a}^${p} mod ${n}`).toBe(slowPower(a, p, n)));
      expect(values[values.length - 1]).toBe(slowPower(a, e, n));
      // The last node uses exactly the squarings that add up to e.
      const used = slide.nodes[slide.nodes.length - 1].from.map((id) => Number(id.slice(1)));
      expect(used.reduce((x, y) => x + y, 0)).toBe(e);
    }
  });
});

describe('last digits', () => {
  it('gives the last digit of a product or sum', () => {
    for (const slide of slides('cong-last-product', 'expression')) {
      const tex = firstMaths(promptOf(slide));
      expect(Number(slide.answer), tex).toBe(texValue(tex) % 10);
    }
  });

  it('gives the last digit of a power', () => {
    for (const slide of slides('cong-last-power', 'expression')) {
      const [a, e] = ints(promptOf(slide));
      expect(Number(slide.answer)).toBe(slowPower(a, e, 10));
    }
  });

  it('splits the power into fours and names the true last digit, with no second split in the bank', () => {
    for (const slide of slides('cong-last-tiles', 'tiles')) {
      const [a, e] = ints(firstMaths(slide.prompt.map((b) => (b.kind === 'prose' ? b.text : '')).join(' ').split('working for')[1]));
      const [q, s, d] = slide.answer.map(Number);
      expect(4 * q + s).toBe(e);
      expect(s).toBeGreaterThanOrEqual(0);
      expect(s).toBeLessThan(4);
      expect(d).toBe(slowPower(a, e, 10));
      const values = slide.bank.map(Number);
      const splits = new Set<string>();
      values.forEach((x, i) => values.forEach((y, j) => i !== j && 4 * x + y === e && splits.add(`${x},${y}`)));
      expect([...splits]).toEqual([`${q},${s}`]);
    }
  });

  it('gives the last two digits', () => {
    for (const slide of slides('cong-last-two', 'expression')) {
      const tex = firstMaths(promptOf(slide));
      const [a, e] = ints(tex);
      const answer = Number(slide.answer);
      if (tex.includes('\\times')) expect(answer).toBe((a * e) % 100);
      else expect(answer, tex).toBe(slowPower(a, e, 100));
    }
  });

  it('offers exactly one square', () => {
    for (const slide of slides('cong-last-square', 'choice')) {
      const square = (x: number) => Number.isInteger(Math.sqrt(x));
      expect(slide.options.filter(({ label }) => square(Number(label))).map(({ id }) => id)).toEqual([slide.correctId]);
      expect(square(Number(chosen(slide)))).toBe(true);
    }
  });
});

describe('digit sums', () => {
  it('proves a true claim about a number and its digit sum', () => {
    for (const slide of slides('cong-digit-order', 'order')) {
      const [N, a, b, c, m] = ints(promptOf(slide));
      expect(a + b + c).toBe(modularTesting.digitSum(N));
      expect(residue(N - (a + b + c), m)).toBe(0);
      expect(slide.steps.some(({ text }) => text.includes(`= ${a + b + c} \\pmod{${m}}`))).toBe(true);
    }
  });

  it('gives the remainder a digit sum points to', () => {
    for (const slide of slides('cong-digit-residue', 'expression')) {
      const tex = firstMaths(promptOf(slide));
      const [m] = ints(promptOf(slide).split('divided by')[1]);
      // Products are held as BigInt-free doubles: both factors are under 1000.
      expect(Number(slide.answer), tex).toBe(texValue(tex) % m);
    }
  });

  it('casts out nines correctly', () => {
    for (const slide of slides('cong-cast-flow', 'flow')) {
      const [a, b, claim] = ints(slide.subject);
      const must = (a * b) % 9;
      const got = claim % 9;
      expect(slide.answer.slice(0, 2)).toEqual([`$${must}$`, `$${got}$`]);
      expect(slide.answer[2].startsWith(must === got ? 'passes' : 'fails')).toBe(true);
    }
  });

  it('fills the line with the residues of 100, 10 and the number, and nothing else fits', () => {
    for (const slide of slides('cong-ten-tiles', 'tiles')) {
      const [N, a, b, c] = /(\d+) \\equiv (\d) \\times \{0\} \+ (\d) \\times \{1\} \+ (\d)/.exec(slide.template)!.slice(1).map(Number);
      const m = Number(/bmod (\d+)/.exec(slide.template)![1]);
      expect(100 * a + 10 * b + c).toBe(N);
      const [x, y, z] = slide.answer.map(Number);
      expect(residue(100 - x, m)).toBe(0);
      expect(residue(10 - y, m)).toBe(0);
      expect(z).toBe(N % m);
      const values = slide.bank.map(Number);
      let fillings = 0;
      values.forEach((p, i) =>
        values.forEach((q, j) =>
          values.forEach((r, k) => {
            if (i === j || j === k || i === k) return;
            if (residue(a * p + b * q + c - N, m) === 0 && residue(r - N, m) === 0 && !(p === x && q === y && r === z)) fillings += 1;
          }),
        ),
      );
      expect(fillings, slide.bank.join(' ')).toBe(0);
    }
  });

  it('has exactly one missing digit that fits', () => {
    for (const slide of slides('cong-missing-digit', 'expression')) {
      const text = promptOf(slide);
      const shown = firstMaths(text);
      const r = text.includes('remainder') ? ints(text.split('remainder')[1])[0] : 0;
      const fits = Array.from({ length: 10 }, (_, d) => d).filter((d) => {
        const number = shown.replace('\\square', String(d));
        return !number.startsWith('0') && Number(number) % 9 === r;
      });
      expect(fits, shown).toEqual([Number(slide.answer)]);
    }
  });
});

describe('level 6 slides', () => {
  it('keeps every number on the page under 1000', () => {
    const generators = [
      ...numberModularGenerators,
      ...numberModularGenerators.map((g) => choiceVariant(g as Generator<unknown>)).filter((g) => g !== undefined),
    ] as Generator<unknown>[];
    expect(generators.length).toBeGreaterThan(numberModularGenerators.length);
    for (const generator of generators) {
      for (const difficulty of [1, 2]) {
        for (let seed = 0; seed < SEEDS; seed += 1) {
          const params = generator.sample(makeRng(seed), difficulty);
          const page = JSON.stringify([generator.render(params), generator.solution(params)]);
          const numbers = (page.match(/\d+/g) ?? []).map(Number);
          expect(Math.max(...numbers), `${generator.id} seed ${seed}`).toBeLessThan(1000);
        }
      }
    }
  });
});
