/**
 * Number & Proof level 8, Algebraic Proof: the algebra behind the slides.
 *
 * The generic sweep proves each generator agrees with itself. These read the
 * numbers and expressions each slide states, evaluate them at whole numbers
 * with a reader of their own, and hold every claimed multiple, parity and
 * filled line to what the values actually do: a largest "always divides" is
 * the HCF of the values over n = 0 to 30, not the HCF of two coefficients
 * the generator worked with.
 */
import { describe, it, expect } from 'vitest';
import { makeRng } from '../../engine/rng';
import type { Generator, Slide } from '../types';
import { choiceVariant } from '../choiceVariant';
import { algebraicProofGenerators, algebraicProofTesting } from './algebraicProof';

const { texAt, trueFillings } = algebraicProofTesting;

const SEEDS = 150;

type Kind = Slide['kind'];
type Of<K extends Kind> = Extract<Slide, { kind: K }>;

const byId = (id: string) => {
  const generator = algebraicProofGenerators.find((g) => g.id === id) as Generator<unknown> | undefined;
  if (!generator) throw new Error(`no generator ${id}`);
  return generator;
};

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

const promptOf = (slide: Exclude<Slide, { kind: 'teach' }>) =>
  slide.prompt.map((block) => (block.kind === 'prose' ? block.text : block.kind === 'display' ? block.tex : '')).join(' ');

/** Every `$...$` in a piece of prose. */
const maths = (text: string) => [...text.matchAll(/\$([^$]+)\$/g)].map((m) => m[1]);

const at = (tex: string, n: number, m = 0) => texAt(tex, { n, m });
const NS = Array.from({ length: 31 }, (_, i) => i);
const gcd = (a: number, b: number): number => (b === 0 ? Math.abs(a) : gcd(b, a % b));
/** The largest whole number dividing the expression at every n from 0 to 30. */
const largest = (tex: string) => NS.map((n) => at(tex, n)).reduce((g, v) => gcd(g, v), 0);
const same = (a: string, b: string) =>
  [-3, 0, 2, 5, 11].every((n) => [-2, 1, 4].every((m) => Math.abs(texAt(a, { n, m }) - texAt(b, { n, m })) < 1e-9));
const parity = (v: number) => Math.abs(((v % 2) + 2) % 2);

/** Each line a steps slide passes through, replayed the way the widget does. */
function lines(slide: Of<'steps'>): string[] {
  let line = slide.start;
  const out = [line.join(' ')];
  for (const { span, value } of slide.reductions) {
    line = [...line.slice(0, span[0]), value, ...line.slice(span[1])];
    out.push(line.join(' '));
  }
  return out;
}

/** The first term a sum prompt names: "starting at $t$" or "from $t$". */
const firstTerm = (text: string) => /(?:starting at|from) \$([^$]+)\$/.exec(text)![1];

const chosen = (slide: Of<'choice'>) => slide.options.find((option) => option.id === slide.correctId)!.label;

describe('the reader', () => {
  it('reads a number after a sum as multiplying its last term only, as written', () => {
    expect(texAt('2n + 5(3)', { n: 1 })).toBe(17);
    expect(texAt('3(2n + 5)', { n: 1 })).toBe(21);
    expect(texAt('(2m + 1)(2n + 3) - 4mn', { m: 2, n: 3 })).toBe(5 * 9 - 24);
    expect(texAt('4n^2 - 6n + 9', { n: 2 })).toBe(13);
  });

  it('counts a second true filling', () => {
    // 3(2n + 5), 1(6n + 15), and 6n + 15(1) read literally.
    expect(trueFillings('6n + 15 = {0}({1})', ['3', '2n + 5', '1', '6n + 15'], 2)).toBe(3);
    expect(trueFillings('6n + 15 = {0}({1})', ['3', '2n + 5', '6', '2n + 3'], 2)).toBe(1);
  });
});

describe('writing numbers', () => {
  it('offers exactly one expression that fits the description', () => {
    for (const slide of slides('aprf-write', 'choice')) {
      const text = promptOf(slide);
      const nums = maths(text);
      let holds: (tex: string) => boolean;
      if (text.includes('more than a multiple') || text.includes('remainder')) {
        const [r, k] = nums.map(Number);
        holds = (tex) => NS.every((n) => ((at(tex, n) % k) + k) % k === r && Number.isInteger(at(tex, n)));
      } else if (text.includes('a multiple of')) {
        const k = Number(nums[0]);
        holds = (tex) => NS.every((n) => Number.isInteger(at(tex, n)) && at(tex, n) % k === 0);
      } else {
        const base = nums[0];
        const shift = text.includes('next') ? 2 : -2;
        holds = (tex) => NS.every((n) => at(tex, n) === at(base, n) + shift);
      }
      const labels = slide.options.map((o) => o.label.replace(/\\frac\{n\}\{(\d+)\}/, 'n/$1'));
      const fitting = slide.options.filter((o) => {
        const frac = /\\frac\{n\}\{(\d+)\}/.exec(o.label);
        if (frac) return false;
        return holds(o.label);
      });
      expect(fitting.map((o) => o.label), labels.join(' | ')).toEqual([chosen(slide)]);
    }
  });

  it('finds the n that gives the stated number', () => {
    for (const slide of slides('aprf-find-n', 'expression')) {
      const [expr, N] = maths(promptOf(slide))[1].split(' = ');
      expect(at(expr, Number(slide.answer))).toBe(Number(N));
    }
  });

  it('fills a table with the values of its column expressions', () => {
    for (const slide of slides('aprf-list-table', 'table')) {
      const expected: string[] = [];
      for (const row of slide.rows) {
        const n = Number(row[0]);
        row.slice(1).forEach((cell, j) => {
          const value = String(at(slide.columns[j + 1], n));
          if (cell === null) expected.push(value);
          else expect(cell).toBe(value);
        });
      }
      expect(slide.answer).toEqual(expected);
    }
  });

  it('completes a list of consecutive numbers of the stated kind', () => {
    for (const slide of slides('aprf-consec-tiles', 'tiles')) {
      const text = promptOf(slide);
      const filled = slide.template.replace(/\{(\d+)\}/g, (_, i: string) => slide.answer[Number(i)]);
      const terms = filled.split(',\\ ');
      const k = /multiples of \$(\d+)\$/.exec(text);
      const step = k ? Number(k[1]) : text.includes('whole') ? 1 : 2;
      for (const n of [0, 1, 4, 9]) {
        const values = terms.map((t) => at(t, n));
        values.slice(1).forEach((v, i) => expect(v - values[i], filled).toBe(step));
        if (text.includes('even')) values.forEach((v) => expect(parity(v)).toBe(0));
        if (text.includes('odd')) values.forEach((v) => expect(parity(v)).toBe(1));
        if (k) values.forEach((v) => expect(Math.abs(v % step)).toBe(0));
      }
    }
  });
});

/** The sum a prompt describes: its count, the kind and the first term, rebuilt term by term. */
function describedSum(text: string, first: string): string {
  const c = Number(/the sum of (?:any |the )?(\d+)|these (\d+)|any (\d+)/i.exec(text)!.slice(1).find(Boolean));
  const k = /multiples of \$(\d+)\$/.exec(text);
  const step = k ? Number(k[1]) : text.includes('whole') ? 1 : 2;
  return Array.from({ length: c }, (_, i) => `(${first}) + ${i * step}`).join(' + ');
}

describe('sums of consecutive numbers', () => {
  it('keeps the line equal to the sum through every step, and the multiple is the largest', () => {
    for (const slide of slides('aprf-sum-steps', 'steps')) {
      const start = slide.start.join(' ');
      for (const line of lines(slide)) expect(same(start, line), line).toBe(true);
      const g = Number(maths(promptOf(slide)).pop());
      expect(largest(start)).toBe(g);
    }
  });

  it('gives the largest number the described sum is always a multiple of', () => {
    for (const slide of slides('aprf-sum-multiple', 'expression')) {
      const text = promptOf(slide);
      const sum = describedSum(text, firstTerm(text));
      expect(largest(sum), text).toBe(Number(slide.answer));
    }
    const choice = choiceVariant(byId('aprf-sum-multiple'))!;
    for (const slide of slides('aprf-sum-multiple+choice', 'choice', choice as Generator<unknown>)) {
      const text = promptOf(slide);
      expect(largest(describedSum(text, firstTerm(text)))).toBe(Number(chosen(slide)));
    }
  });

  it('proves the multiple the sum really is', () => {
    for (const slide of slides('aprf-sum-order', 'order')) {
      const text = promptOf(slide);
      const g = Number(maths(text.split('Tap')[0]).pop());
      const byId = new Map(slide.steps.map((s) => [s.id, s.text]));
      const proof = slide.answer.map((id) => byId.get(id)!);
      // The last maths in the opening step is the $n$ of "for a whole number $n$".
      const terms = maths(proof[0]).slice(0, -1);
      const sum = terms.map((t) => `(${t})`).join(' + ');
      const stated = maths(proof[2])[0];
      expect(same(sum, stated)).toBe(true);
      expect(largest(stated)).toBe(g);
    }
  });

  it('decides "always a multiple of m" the way the values do', () => {
    for (const slide of slides('aprf-sum-flow', 'flow')) {
      const text = promptOf(slide);
      const m = /multiple of \$(\d+)\$\?/.exec(text)![1];
      const sum = describedSum(text, firstTerm(text));
      const g = largest(sum);
      expect(same(sum, slide.answer[0].replace(/\$/g, ''))).toBe(true);
      expect(Number(slide.answer[1].replace(/\$/g, ''))).toBe(g);
      const always = NS.every((n) => at(sum, n) % Number(m) === 0);
      expect(slide.answer[2]).toBe(always ? 'Yes' : 'No');
    }
  });
});

describe('differences of squares', () => {
  it('fills in an expansion that is true', () => {
    for (const slide of slides('aprf-square-tiles', 'tiles')) {
      const filled = slide.template.replace(/\{(\d+)\}/g, (_, i: string) => slide.answer[Number(i)]);
      const [lhs, rhs] = filled.split(' = ');
      expect(same(lhs, rhs), filled).toBe(true);
      expect(trueFillings(slide.template, slide.bank, slide.answer.length)).toBe(1);
    }
  });

  it('fills each box with what it names, and the claim holds', () => {
    for (const slide of slides('aprf-square-tree', 'tree')) {
      const [, X, Y] = /^(.*\)\^2|n\^2) - (.*)$/.exec(slide.expression)!;
      expect(same(slide.answer[0], X), slide.answer[0]).toBe(true);
      expect(same(slide.answer[1], Y), slide.answer[1]).toBe(true);
      for (const value of slide.answer.slice(2)) expect(same(value, slide.expression), value).toBe(true);
      const text = promptOf(slide);
      if (text.includes('always odd')) NS.forEach((n) => expect(parity(at(slide.expression, n))).toBe(1));
      else expect(largest(slide.expression)).toBe(Number(maths(text)[0]));
    }
  });

  it('gives the largest number that always divides the difference', () => {
    for (const slide of slides('aprf-square-divides', 'expression')) {
      expect(largest(maths(promptOf(slide))[0])).toBe(Number(slide.answer));
    }
  });

  it('proves what the squares of the numbers it names really do', () => {
    for (const slide of slides('aprf-square-order', 'order')) {
      const text = promptOf(slide);
      const byId = new Map(slide.steps.map((s) => [s.id, s.text]));
      const proof = slide.answer.map((id) => byId.get(id)!);
      const [small, big] = maths(proof[0]);
      const diff = `(${big})^2 - (${small})^2`;
      expect(same(diff, maths(proof[2])[0])).toBe(true);
      if (text.includes('an odd number')) NS.forEach((n) => expect(parity(at(diff, n))).toBe(1));
      else expect(largest(diff)).toBe(Number(maths(text).pop()));
    }
  });
});

describe('odd and even products', () => {
  it('writes the product as 2 times a bracket plus 1, and only one filling is true', () => {
    for (const slide of slides('aprf-product-tiles', 'tiles')) {
      const filled = slide.template.replace(/\{(\d+)\}/g, (_, i: string) => slide.answer[Number(i)]);
      const [lhs, rhs] = filled.split(' = ');
      expect(same(lhs, rhs), filled).toBe(true);
      expect(slide.answer[1]).toBe('1');
      expect(trueFillings(slide.template, slide.bank, slide.answer.length)).toBe(1);
    }
  });

  it('offers exactly one option that is always the stated parity', () => {
    for (const slide of slides('aprf-parity-choice', 'choice')) {
      const want = promptOf(slide).includes('always odd') ? 1 : 0;
      const always = (tex: string) =>
        [0, 1, 2, 3, 4, 5].every((m) => [0, 1, 2, 3, 4, 5].every((n) => parity(texAt(tex, { m, n })) === want));
      const fitting = slide.options.filter((o) => always(o.label)).map((o) => o.label);
      expect(fitting).toEqual([chosen(slide)]);
    }
  });

  it('proves the parity mn + c really has', () => {
    for (const slide of slides('aprf-product-order', 'order')) {
      const text = promptOf(slide);
      const nEven = text.includes('$n$ is even');
      const c = Number(/mn \+ (\d+)/.exec(text)![1]);
      const claimed = /is (odd|even)\.$/.exec(text.split('Tap')[0].trim())![1];
      const m = 3;
      const n = nEven ? 4 : 5;
      expect(parity(m * n + c)).toBe(claimed === 'odd' ? 1 : 0);
      const byId = new Map(slide.steps.map((s) => [s.id, s.text]));
      const proof = slide.answer.map((id) => byId.get(id)!);
      // Step 3 writes mn + c in j and k; put j = 1, k = 2 back in.
      const line = maths(proof[2])[0].split(' = ')[1];
      const value = texAt(line.replace(/jk/g, '(j)(k)').replace(/j/g, 'm').replace(/k/g, 'n'), { m: 1, n: 2 });
      expect(value).toBe(3 * (nEven ? 4 : 5) + c);
    }
  });

  it('follows the path the values of the subject take', () => {
    for (const slide of slides('aprf-parity-flow', 'flow')) {
      const parities = NS.map((n) => parity(at(slide.subject, n)));
      const verdict = parities.every((p) => p === 0) ? 'always even' : parities.every((p) => p === 1) ? 'always odd' : 'neither';
      const last = slide.answer[2];
      expect(verdict === 'neither' ? last.startsWith('odd for some') : last === verdict).toBe(true);
      const factor = slide.answer[0].replace(/\$/g, '');
      const constant = at(slide.subject, 0);
      expect(same(`${factor} + ${constant}`, slide.subject)).toBe(true);
    }
  });
});

describe('show that', () => {
  it('takes out the factor the prompt names, and only one filling is true', () => {
    for (const slide of slides('aprf-factor-tiles', 'tiles')) {
      const k = maths(promptOf(slide))[1];
      expect(slide.answer[0]).toBe(k);
      const filled = slide.template.replace(/\{(\d+)\}/g, (_, i: string) => slide.answer[Number(i)]);
      const [lhs, rhs] = filled.split(' = ');
      expect(same(lhs, rhs), filled).toBe(true);
      expect(trueFillings(slide.template, slide.bank, slide.answer.length)).toBe(1);
    }
  });

  it('offers exactly one expression that is always a multiple', () => {
    for (const slide of slides('aprf-which-multiple', 'choice')) {
      const k = Number(maths(promptOf(slide))[0]);
      const fitting = slide.options.filter((o) => NS.every((n) => at(o.label, n) % k === 0)).map((o) => o.label);
      expect(fitting).toEqual([chosen(slide)]);
    }
  });

  it('keeps each step equal to the start, and the multiple is the largest', () => {
    for (const slide of slides('aprf-show-steps', 'steps')) {
      const start = slide.start.join(' ');
      for (const line of lines(slide)) expect(same(start, line), line).toBe(true);
      expect(largest(start)).toBe(Number(maths(promptOf(slide))[0]));
    }
  });

  it('marks as wrong the one line that does not follow', () => {
    for (const slide of slides('aprf-find-error', 'choice')) {
      const blocks = slide.prompt.map((b) => (b.kind === 'prose' ? b.text : ''));
      const claim = blocks[0];
      const lines = blocks.filter((t) => t.startsWith('**Line')).map((t) => t.replace(/^\*\*Line \d:\*\* /, ''));
      const bad: number[] = [];
      if (claim.includes('consecutive whole numbers')) {
        const c = Number(/any (\d+)/.exec(claim)![1]);
        const terms = maths(lines[0]);
        const consecutive = terms.every((t, i) => same(t, `n + ${i}`)) && terms.length === c;
        if (!consecutive) bad.push(0);
        const sum = Array.from({ length: c }, (_, i) => `n + ${i}`).join(' + ');
        if (!same(maths(lines[1])[0], sum)) bad.push(1);
        if (!same(maths(lines[2])[0], sum)) bad.push(2);
      } else {
        const expr = maths(claim)[0];
        lines.slice(0, 3).forEach((line, i) => {
          const tex = maths(line).pop()!;
          const ok = tex.includes(' = ') ? same(...(tex.split(' = ') as [string, string])) : same(tex, expr);
          if (!ok) bad.push(i);
        });
      }
      expect(bad.map((i) => `Line ${i + 1}`), lines.join(' / ')).toEqual([chosen(slide)]);
    }
  });
});
