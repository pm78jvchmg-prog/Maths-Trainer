/**
 * Number & Proof level 5, Euclid's Algorithm: the arithmetic behind the slides.
 *
 * The generic sweep proves each generator agrees with itself. These read the
 * numbers each slide states, re-run the algorithm from them, and hold every
 * quoted quotient, remainder, HCF and solution to it: each ax + by line is
 * evaluated with mathjs, and every offered solution of ax + by = c is checked
 * by substitution.
 */
import { describe, it, expect } from 'vitest';
import { evaluate } from 'mathjs';
import { makeRng } from '../../engine/rng';
import type { Generator, Slide } from '../types';
import { valueOf } from '../expr';
import { choiceVariant } from '../choiceVariant';
import { euclidTesting, numberEuclidGenerators } from './numberEuclid';

const { runOf, positiveSolutions } = euclidTesting;

const SEEDS = 200;

type Kind = Slide['kind'];
type Of<K extends Kind> = Extract<Slide, { kind: K }>;

const byId = (id: string) => {
  const generator = numberEuclidGenerators.find((g) => g.id === id) as Generator<unknown> | undefined;
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
const texValue = (tex: string) => Number(evaluate(tex.replace(/\\times/g, '*').replace(/\\div/g, '/')));

/** The HCF by trying every divisor: nothing shared with the code under test. */
function hcf(a: number, b: number): number {
  let best = 1;
  for (let d = 1; d <= Math.min(Math.abs(a), Math.abs(b)); d += 1) if (a % d === 0 && b % d === 0) best = d;
  return best;
}

/** `a = q \times b + r` lines in a piece of TeX. */
function divisions(tex: string) {
  return [...tex.matchAll(/(\d+) &?= (\d+) \\times (\d+) \+ (\d+)/g)].map((m) => ({
    a: Number(m[1]),
    q: Number(m[2]),
    b: Number(m[3]),
    r: Number(m[4]),
  }));
}

/** `ax + by = c` in a piece of TeX. */
function equation(tex: string) {
  const m = /(\d+)x \+ (\d+)y = (\d+)/.exec(tex);
  if (!m) throw new Error(`no equation in ${tex}`);
  return { a: Number(m[1]), b: Number(m[2]), c: Number(m[3]) };
}

/** Pairs from different places in a list of values with as + bt = c, as `s,t`. */
function solvingPairs(values: number[], a: number, b: number, c: number): string[] {
  const out = new Set<string>();
  values.forEach((s, i) =>
    values.forEach((t, j) => {
      if (i !== j && a * s + b * t === c) out.add(`${s},${t}`);
    }),
  );
  return [...out];
}

const chosen = (slide: Of<'choice'>) => slide.options.find((option) => option.id === slide.correctId)!.label;

describe('the run', () => {
  it('divides correctly, one quotient and remainder at a time', () => {
    for (const slide of slides('euc-divide', 'expression')) {
      const [a, b] = ints(promptOf(slide));
      expect(Number(slide.answer)).toBe(slide.lead === 'q =' ? Math.floor(a / b) : a % b);
      expect(a).toBeGreaterThan(b);
    }
  });

  it('fills every row of a run table with the true quotient and remainder', () => {
    for (const slide of slides('euc-run-table', 'table')) {
      const run = runOf(Number(slide.rows[0][0]), Number(slide.rows[0][1]));
      expect(slide.rows.map((row) => [Number(row[0]), Number(row[1])])).toEqual(run.map(({ a, b }) => [a, b]));
      expect(slide.answer.map(Number)).toEqual(run.flatMap(({ q, r }) => [q, r]));
      expect(run[run.length - 1].r).toBe(0);
    }
  });

  it('gives the HCF of the two numbers it names', () => {
    for (const slide of slides('euc-hcf', 'expression')) {
      const [a, b] = ints(slide.lead!);
      expect(Number(slide.answer), `${a}, ${b}`).toBe(hcf(a, b));
    }
  });

  it('fills a remainder tree with every remainder down to 0', () => {
    for (const slide of slides('euc-remainder-tree', 'tree')) {
      let [x, y] = ints(slide.expression);
      const remainders: number[] = [];
      while (y > 0) [x, y] = [y, x % y];
      for (let [p, q] = ints(slide.expression); q > 0; [p, q] = [q, p % q]) remainders.push(p % q);
      expect(slide.answer.map(Number)).toEqual(remainders);
      expect(remainders[remainders.length - 2]).toBe(x);
    }
  });

  it('counts the divisions a run takes', () => {
    for (const slide of slides('euc-count', 'expression')) {
      let [x, y] = ints(promptOf(slide));
      let count = 0;
      for (; y > 0; count += 1) [x, y] = [y, x % y];
      expect(Number(slide.answer)).toBe(count);
    }
  });

  it('puts exactly one false line in a run with a slip, and carries on faithfully from it', () => {
    for (const slide of slides('euc-slip', 'choice')) {
      const lines = divisions(promptOf(slide));
      const [a, b] = ints(promptOf(slide));
      expect(lines[0].a).toBe(a);
      expect(lines[0].b).toBe(b);
      const wrong = lines.filter(({ a: x, b: y, q, r }) => x !== q * y + r);
      expect(wrong, JSON.stringify(lines)).toHaveLength(1);
      for (const line of lines) expect(line.r).toBeLessThan(line.b);
      for (let i = 1; i < lines.length; i += 1) {
        expect(lines[i].a).toBe(lines[i - 1].b);
        expect(lines[i].b).toBe(lines[i - 1].r);
      }
      const [w] = wrong;
      expect(chosen(slide)).toBe(`${w.a} = ${w.q} \\times ${w.b} + ${w.r}`);
    }
  });

  it('reads the HCF and coprimality off the end of a run', () => {
    for (const slide of slides('euc-read-flow', 'flow')) {
      const [a, b] = ints(promptOf(slide));
      const h = hcf(a, b);
      expect(slide.answer[1]).toBe(`$${h}$`);
      expect(slide.answer[2].startsWith(h === 1 ? 'Coprime' : 'Not coprime')).toBe(true);
      expect(divisions(slide.subject).every(({ a: x, b: y, q, r }) => x === q * y + r)).toBe(true);
    }
  });

  it('offers exactly one pair with the same HCF', () => {
    for (const slide of slides('euc-same-hcf', 'choice')) {
      const [a, b] = ints(promptOf(slide).replace(/^\$\d+ = \d+ \\times \d+ \+ \d+\$\. /, ''));
      const h = hcf(a, b);
      const same = slide.options.filter(({ label }) => {
        const [s, t] = ints(label);
        return hcf(s, t) === h;
      });
      expect(same.map(({ id }) => id)).toEqual([slide.correctId]);
    }
  });

  it('states a true division in the proof that the HCF carries over', () => {
    for (const slide of slides('euc-order-hcf', 'order')) {
      const [line] = divisions(promptOf(slide).replace(/=/, '&='));
      expect(line.a).toBe(line.q * line.b + line.r);
      expect(line.r).toBeLessThan(line.b);
    }
  });
});

describe('working backwards', () => {
  it('rearranges a true line for its remainder, and offers no second true line', () => {
    for (const slide of slides('euc-rearrange', 'tiles')) {
      const [line] = divisions(promptOf(slide).replace(/=/, '&='));
      expect(line.a).toBe(line.q * line.b + line.r);
      const [r, a, q] = slide.answer.map(Number);
      expect([r, a, q]).toEqual([line.r, line.a, line.q]);
      const b = ints(slide.template.split('\\times')[1])[0];
      expect(b).toBe(line.b);
      const bank = slide.bank.map(Number);
      const truths = bank.flatMap((x, i) =>
        bank.flatMap((y, j) => bank.map((z, k) => (i !== j && j !== k && i !== k && x === y - z * b ? `${x},${y},${z}` : ''))),
      );
      expect(new Set(truths.filter(Boolean))).toEqual(new Set([`${r},${a},${q}`]));
    }
  });

  it('writes every remainder in the table as xa + yb, ending on the HCF', () => {
    for (const slide of slides('euc-back-table', 'table')) {
      const answers = slide.answer.map(Number);
      const rows = slide.rows.map((row) => row.map((cell) => (cell === null ? answers.shift()! : Number(cell))));
      const [a, b] = [rows[0][1], rows[1][1]];
      for (const [, r, x, y] of rows) expect(a * x + b * y, `${r} = ${x} x ${a} + ${y} x ${b}`).toBe(r);
      expect(rows[rows.length - 1][1]).toBe(hcf(a, b));
      for (let i = 2; i < rows.length; i += 1) {
        expect(rows[i][0]).toBe(Math.floor(rows[i - 2][1] / rows[i - 1][1]));
        expect(rows[i][1]).toBe(rows[i - 2][1] % rows[i - 1][1]);
      }
    }
  });

  it('keeps every line of a backwards proof equal to the HCF', () => {
    for (const slide of slides('euc-back-order', 'order')) {
      const [a, b, h] = ints(promptOf(slide));
      expect(hcf(a, b)).toBe(h);
      const steps = slide.answer.map((id) => slide.steps.find((step) => step.id === id)!.text);
      for (const text of steps.slice(0, -1)) {
        const maths = [...text.matchAll(/\$([^$]+)\$/g)].map((m) => m[1]);
        const [given, line] = [maths[0], maths[maths.length - 1]];
        // The line quoted is true, and what it gives still comes to the HCF.
        const [left, right] = given.split(' = ');
        expect(texValue(left), given).toBe(texValue(right.replace(/&/g, '')));
        const [lhs, rhs] = line.split(' = ');
        expect(Number(lhs)).toBe(h);
        expect(texValue(rhs), line).toBe(h);
      }
      const [x, y] = ints(steps[steps.length - 1].split('with')[1]);
      expect(a * x + b * y).toBe(h);
      // A slipped substitution in the bank really is wrong.
      for (const step of slide.steps.filter((s) => !slide.answer.includes(s.id) && s.text.startsWith('Put in'))) {
        const line = [...step.text.matchAll(/\$([^$]+)\$/g)].map((m) => m[1]).pop()!;
        expect(texValue(line.split(' = ')[1]), line).not.toBe(h);
      }
    }
  });

  it('finds the other unknown of a backwards solution', () => {
    for (const slide of slides('euc-find-y', 'expression')) {
      const prompt = promptOf(slide);
      const { a, b, c } = equation(prompt);
      expect(hcf(a, b)).toBe(c);
      const given = Number(/\$[xy] = (-?\d+)\$/.exec(prompt)![1]);
      const [x, y] = slide.lead === 'y =' ? [given, Number(slide.answer)] : [Number(slide.answer), given];
      expect(a * x + b * y).toBe(c);
    }
  });

  it('checks a backwards line that really comes to the HCF', () => {
    for (const slide of slides('euc-check-reduce', 'reduce')) {
      const [a, b] = ints(promptOf(slide));
      expect(valueOf(slide.expr)).toBe(hcf(a, b));
    }
    const choice = choiceVariant(byId('euc-check-reduce'))!;
    for (const slide of slides('euc-check-reduce+choice', 'evaluate', choice as Generator<unknown>)) {
      expect(slide.options.filter((option) => Number(option) === valueOf(slide.expr))).toHaveLength(1);
    }
  });
});

describe('ax + by = c', () => {
  it('offers exactly one equation the HCF lets through', () => {
    for (const slide of slides('euc-solvable', 'choice')) {
      const solvable = slide.options.filter(({ label }) => {
        const { a, b, c } = equation(label);
        return c % hcf(a, b) === 0;
      });
      expect(solvable.map(({ id }) => id)).toEqual([slide.correctId]);
      // And that one really has a solution: brute force over a window.
      const { a, b, c } = equation(chosen(slide));
      const found = Array.from({ length: 200 }, (_, i) => i - 100).some((x) => (c - a * x) % b === 0);
      expect(found).toBe(true);
    }
  });

  it('walks to solutions exactly when the HCF divides the right side', () => {
    for (const slide of slides('euc-solvable-flow', 'flow')) {
      const { a, b, c } = equation(slide.subject);
      const h = hcf(a, b);
      expect(slide.answer[0]).toBe(`$${h}$`);
      expect(slide.answer[1].startsWith(c % h === 0 ? 'Yes' : 'No')).toBe(true);
    }
  });

  it('scales to a solution, and no other pair of tiles solves it', () => {
    for (const slide of slides('euc-scale', 'tiles')) {
      const blocks = slide.prompt.map((block) => (block.kind === 'prose' ? block.text : ''));
      const { a, b, c } = equation(blocks[1]);
      const [x, y] = slide.answer.map(Number);
      expect(a * x + b * y).toBe(c);
      expect(solvingPairs(slide.bank.map(Number), a, b, c)).toEqual([`${x},${y}`]);
      // The backwards line it scales is true and ends on the HCF.
      const h = hcf(a, b);
      const stated = /\$(-?\d+) = ([^$]+)\$/.exec(blocks[0]);
      if (stated) {
        expect(Number(stated[1])).toBe(h);
        expect(texValue(stated[2])).toBe(h);
      } else {
        const [x0, y0] = ints(blocks[0].split('with')[1]);
        expect(a * x0 + b * y0).toBe(h);
      }
    }
  });

  it('tells a story with exactly one answer', () => {
    for (const slide of slides('euc-stamps', 'expression')) {
      const [a, b, c] = ints(promptOf(slide));
      const found: number[] = [];
      for (let x = 1; a * x < c; x += 1) if ((c - a * x) % b === 0 && c - a * x > 0) found.push(x);
      expect(found, `${a}, ${b}, ${c}`).toEqual([Number(slide.answer)]);
      expect(positiveSolutions(a, b, c)).toHaveLength(1);
    }
  });
});

describe('all the solutions', () => {
  /** a, b, c and the solution a slide states. */
  const stated = (slide: Exclude<Slide, { kind: 'teach' }>) => {
    const prompt = promptOf(slide);
    const { a, b, c } = equation(prompt);
    const [x0, y0] = ints(prompt.slice(prompt.indexOf('$x =')));
    expect(a * x0 + b * y0, prompt).toBe(c);
    return { a, b, c, x0, y0, h: hcf(a, b) };
  };

  it('writes every solution with steps of b/h and a/h, from a stated solution', () => {
    for (const slide of slides('euc-general', 'tiles')) {
      const { a, b, c, x0, y0, h } = stated(slide);
      expect(slide.answer.map(Number)).toEqual([x0, b / h, y0, a / h]);
      // No two other tiles give a solution to start the family from.
      expect(solvingPairs(slide.bank.map(Number), a, b, c)).toEqual([`${x0},${y0}`]);
    }
  });

  it('fills a table of solutions that all solve the equation', () => {
    for (const slide of slides('euc-list-table', 'table')) {
      const { a, b, c, x0, y0, h } = stated(slide);
      const answers = slide.answer.map(Number);
      const rows = slide.rows.map((row) => row.map((cell) => (cell === null ? answers.shift()! : Number(cell))));
      for (const [t, x, y] of rows) {
        expect(a * x + b * y).toBe(c);
        expect([x, y]).toEqual([x0 + (b / h) * t, y0 - (a / h) * t]);
      }
    }
  });

  it('finds the smallest positive x by search', () => {
    for (const slide of slides('euc-smallest', 'expression')) {
      const { a, b, c } = stated(slide);
      let x = 1;
      while ((c - a * x) % b !== 0) x += 1;
      expect(Number(slide.answer)).toBe(x);
    }
  });

  it('counts the solutions with both parts positive by search', () => {
    for (const slide of slides('euc-count-positive', 'expression')) {
      const { a, b, c } = equation(promptOf(slide));
      let count = 0;
      for (let x = 1; a * x < c; x += 1) if ((c - a * x) % b === 0) count += 1;
      expect(Number(slide.answer)).toBe(count);
      const hint = /is \$x = (-?\d+)\$, \$y = (-?\d+)\$/.exec(promptOf(slide));
      if (hint) expect(a * Number(hint[1]) + b * Number(hint[2])).toBe(c);
    }
  });

  it('offers exactly one pair that solves the equation', () => {
    for (const slide of slides('euc-another', 'choice')) {
      const { a, b, c } = stated(slide);
      const solving = slide.options.filter(({ label }) => {
        const [x, y] = ints(label);
        return a * x + b * y === c;
      });
      expect(solving.map(({ id }) => id)).toEqual([slide.correctId]);
    }
  });
});

describe('level 5 slides', () => {
  it('keeps every number on the page under 1000', () => {
    const generators = [
      ...numberEuclidGenerators,
      ...numberEuclidGenerators.map((g) => choiceVariant(g as Generator<unknown>)).filter((g) => g !== undefined),
    ] as Generator<unknown>[];
    expect(generators.length).toBeGreaterThan(numberEuclidGenerators.length);
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
