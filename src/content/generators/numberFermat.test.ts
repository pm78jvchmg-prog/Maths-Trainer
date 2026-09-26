/**
 * Number & Proof level 10, Fermat's Little Theorem: the arithmetic behind the
 * slides.
 *
 * The generic sweep proves each generator agrees with itself. These read the
 * numbers each slide states and re-do every power one multiplication at a
 * time and every factorial one factor at a time, never through Fermat's or
 * Wilson's theorem, so a slip in the generator's shortcut shows up here.
 */
import { describe, it, expect } from 'vitest';
import { makeRng } from '../../engine/rng';
import type { Generator, Slide } from '../types';
import { choiceVariant } from '../choiceVariant';
import { numberFermatGenerators } from './numberFermat';

const SEEDS = 200;

type Kind = Slide['kind'];
type Of<K extends Kind> = Extract<Slide, { kind: K }>;

const byId = (id: string) => {
  const generator = numberFermatGenerators.find((g) => g.id === id) as Generator<unknown> | undefined;
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

const promptOf = (slide: Exclude<Slide, { kind: 'teach' }>) =>
  slide.prompt.map((block) => (block.kind === 'prose' ? block.text : block.kind === 'display' ? block.tex : '')).join(' ');

/** Whole numbers in a string, signs kept. */
const ints = (text: string) => (text.match(/-?\d+/g) ?? []).map(Number);

const residue = (x: number, n: number) => ((x % n) + n) % n;

/** a^e modulo n, one multiplication at a time. */
function slowPower(a: number, e: number, n: number): number {
  let out = 1 % n;
  for (let i = 0; i < e; i += 1) out = (out * residue(a, n)) % n;
  return out;
}

/** m! modulo n, one factor at a time. */
function slowFact(m: number, n: number): number {
  let out = 1 % n;
  for (let k = 1; k <= m; k += 1) out = (out * k) % n;
  return out;
}

function prime(n: number): boolean {
  if (n < 2) return false;
  for (let d = 2; d < n; d += 1) if (n % d === 0) return false;
  return true;
}

const chosen = (slide: Of<'choice'>) => slide.options.find((option) => option.id === slide.correctId)!.label;

describe('the theorem', () => {
  it('fills a table of powers that ends on 1', () => {
    for (const slide of slides('flt-power-table', 'table')) {
      const [a, p] = ints(slide.columns[1]);
      expect(prime(p)).toBe(true);
      const column = slide.rows.map((row) => slowPower(a, Number(row[0]), p));
      const blanks = slide.rows.map((row, i) => (row[1] === null ? column[i] : undefined)).filter((x) => x !== undefined);
      expect(slide.answer.map(Number)).toEqual(blanks);
      slide.rows.forEach((row, i) => row[1] !== null && expect(Number(row[1])).toBe(column[i]));
      expect(column[column.length - 1]).toBe(1);
      expect(slide.rows.length).toBe(p - 1);
    }
  });

  it('offers exactly one congruence the theorem gives, and every other one is false', () => {
    for (const slide of slides('flt-true', 'choice')) {
      for (const option of slide.options) {
        const [base, power, one, modulus] = ints(option.label);
        expect(one).toBe(1);
        const given = prime(modulus) && base % modulus !== 0 && power === modulus - 1;
        expect(given, option.label).toBe(option.id === slide.correctId);
        if (!given) expect(slowPower(base, power, modulus), option.label).not.toBe(1);
      }
    }
  });

  it('decides whether the theorem applies', () => {
    for (const slide of slides('flt-applies', 'flow')) {
      const [a, e, n] = ints(slide.subject);
      expect(e).toBe(n - 1);
      const expected = !prime(n) ? ['No', 'No'] : a % n === 0 ? ['Yes', 'Yes', 'No'] : ['Yes', 'No', 'Yes'];
      expect(slide.answer).toEqual(expected);
    }
  });

  it('works out the residue whether or not the theorem applies', () => {
    for (const generator of [byId('flt-residue'), choiceVariant(byId('flt-residue'))!]) {
      const kind = generator.id.endsWith('+choice') ? 'choice' : 'expression';
      for (const slide of slides(generator.id, kind, generator)) {
        const [a, e, n] = ints(promptOf(slide));
        expect(e).toBe(n - 1);
        const answer = slide.kind === 'choice' ? Number(chosen(slide)) : Number(slide.answer);
        expect(answer).toBe(slowPower(a, e, n));
        if (!prime(n)) expect(answer).toBeGreaterThan(1);
      }
    }
  });

  it('fills the row a, 2a, ... with 1 to p - 1 in a new order', () => {
    for (const slide of slides('flt-row-table', 'table')) {
      const [a, p] = ints(slide.columns[1]);
      const column = slide.rows.map((row) => (a * Number(row[0])) % p);
      expect([...column].sort((x, y) => x - y)).toEqual(Array.from({ length: p - 1 }, (_, i) => i + 1));
      const blanks = slide.rows.map((row, i) => (row[1] === null ? column[i] : undefined)).filter((x) => x !== undefined);
      expect(slide.answer.map(Number)).toEqual(blanks);
    }
  });
});

describe('big powers', () => {
  it('gives the residue of a big power', () => {
    for (const generator of [byId('flt-big'), choiceVariant(byId('flt-big'))!]) {
      const kind = generator.id.endsWith('+choice') ? 'choice' : 'expression';
      for (const slide of slides(generator.id, kind, generator)) {
        const [a, e, p] = ints(promptOf(slide));
        expect(prime(p)).toBe(true);
        expect(e % (p - 1)).toBeLessThanOrEqual(5);
        const answer = slide.kind === 'choice' ? Number(chosen(slide)) : Number(slide.answer);
        expect(answer).toBe(slowPower(a, e, p));
      }
    }
  });

  it('walks the flow to the right remainder and residue', () => {
    for (const slide of slides('flt-big-flow', 'flow')) {
      const [a, e, p] = ints(slide.subject);
      expect(slide.answer).toEqual([`$${a}^{${p - 1}}$`, `$${e % (p - 1)}$`, `$${slowPower(a, e, p)}$`]);
    }
  });

  it('completes the division and the residue, with no second split in the bank', () => {
    for (const slide of slides('flt-big-tiles', 'tiles')) {
      const [a, e, p] = ints(promptOf(slide));
      const [e2, m] = ints(slide.template);
      expect(e2).toBe(e);
      expect(m).toBe(p - 1);
      const [q, r, value] = slide.answer.map(Number);
      expect(m * q + r).toBe(e);
      expect(r).toBeLessThan(m);
      expect(value).toBe(slowPower(a, e, p));
      const bank = slide.bank.map(Number);
      const others = bank.flatMap((x, i) =>
        bank.filter((y, j) => i !== j && m * x + y === e && !(x === q && y === r)).map((y) => `${x},${y}`),
      );
      expect(others, slide.bank.join(' ')).toEqual([]);
    }
  });

  it('fills remainders and residues for several powers', () => {
    for (const slide of slides('flt-exp-table', 'table')) {
      const [m] = ints(slide.columns[1]);
      const [a, p] = ints(slide.columns[2]);
      expect(m).toBe(p - 1);
      const expected = slide.rows.flatMap((row) => {
        const e = Number(row[0]);
        return [e % m, slowPower(a, e, p)];
      });
      expect(slide.answer.map(Number)).toEqual(expected);
    }
  });
});

describe('inverses', () => {
  it('offers one power that is an inverse', () => {
    for (const slide of slides('flt-inverse-power', 'choice')) {
      const [p] = ints(promptOf(slide));
      for (const option of slide.options) {
        const [a, k] = ints(option.label);
        const inverse = residue(a * slowPower(a, k, p), p) === 1;
        expect(inverse, option.label).toBe(option.id === slide.correctId);
      }
    }
  });

  it('finds the inverse', () => {
    for (const generator of [byId('flt-inverse'), choiceVariant(byId('flt-inverse'))!]) {
      const kind = generator.id.endsWith('+choice') ? 'choice' : 'expression';
      for (const slide of slides(generator.id, kind, generator)) {
        const [a, p] = ints(promptOf(slide));
        const answer = slide.kind === 'choice' ? Number(chosen(slide)) : Number(slide.answer);
        expect(answer).toBeGreaterThanOrEqual(1);
        expect(answer).toBeLessThan(p);
        expect(residue(a * answer, p)).toBe(1);
      }
    }
  });

  for (const id of ['flt-inverse-squaring', 'flt-test-squaring']) {
    it(`${id} squares correctly and lands on the power`, () => {
      for (const slide of slides(id, 'tree')) {
        const [a, e, n] = ints(slide.expression);
        const values = slide.answer.map(Number);
        values.slice(0, -1).forEach((value, i) => expect(value).toBe(slowPower(a, 2 ** i, n)));
        expect(values[values.length - 1]).toBe(slowPower(a, e, n));
        for (const value of values) expect(value * value).toBeLessThan(1000);
        if (id === 'flt-inverse-squaring') {
          expect(e).toBe(n - 2);
          expect(residue(a * values[values.length - 1], n)).toBe(1);
        } else {
          expect(e).toBe(n - 1);
          expect(prime(n)).toBe(false);
        }
      }
    });
  }

  it('orders the proof that a^(p - 2) is an inverse', () => {
    for (const slide of slides('flt-inverse-order', 'order')) {
      expect(slide.answer).toHaveLength(5);
    }
  });

  it('gives a^p and a^(p + 1)', () => {
    for (const generator of [byId('flt-power-p'), choiceVariant(byId('flt-power-p'))!]) {
      const kind = generator.id.endsWith('+choice') ? 'choice' : 'expression';
      for (const slide of slides(generator.id, kind, generator)) {
        const [a, e, p] = ints(promptOf(slide));
        expect([p, p + 1]).toContain(e);
        const answer = slide.kind === 'choice' ? Number(chosen(slide)) : Number(slide.answer);
        expect(answer).toBe(slowPower(a, e, p));
      }
    }
  });
});

describe('spotting composites', () => {
  it('gives the residue for a test on a number that is not prime', () => {
    for (const slide of slides('flt-test-residue', 'expression')) {
      const [n, a, a2, e, n2] = ints(promptOf(slide));
      expect([a2, e, n2]).toEqual([a, n - 1, n]);
      expect(prime(n)).toBe(false);
      expect(Number(slide.answer)).toBe(slowPower(a, n - 1, n));
      expect(Number(slide.answer)).not.toBe(1);
    }
  });

  it('reads a test result the right way round', () => {
    for (const slide of slides('flt-test-flow', 'flow')) {
      const [a, e, n] = ints(slide.subject);
      const r = slowPower(a, e, n);
      expect(slide.answer).toEqual([`$${r}$`, r === 1 ? 'Could be either' : 'Not prime']);
      if (r !== 1) expect(prime(n)).toBe(false);
    }
  });

  it('states a true test result and draws the right conclusion', () => {
    for (const slide of slides('flt-verdict', 'choice')) {
      const [a, e, r, n] = ints(promptOf(slide));
      expect(e).toBe(n - 1);
      expect(slowPower(a, e, n)).toBe(r);
      expect(chosen(slide)).toBe(r === 1 ? 'Nothing: it may or may not be prime' : 'It is not prime');
      if (r !== 1) expect(prime(n)).toBe(false);
    }
  });
});

describe("Wilson's theorem", () => {
  it('fills inverses that multiply to 1', () => {
    for (const slide of slides('flt-wilson-table', 'table')) {
      const [p] = ints(slide.columns[1]);
      const inverses = slide.rows.map((row) => {
        const k = Number(row[0]);
        return Array.from({ length: p - 1 }, (_, i) => i + 1).find((x) => (k * x) % p === 1)!;
      });
      slide.rows.forEach((row, i) => row[1] !== null && expect(Number(row[1])).toBe(inverses[i]));
      const blanks = slide.rows.map((row, i) => (row[1] === null ? inverses[i] : undefined)).filter((x) => x !== undefined);
      expect(slide.answer.map(Number)).toEqual(blanks);
    }
  });

  it('gives the remainder of a factorial', () => {
    for (const generator of [byId('flt-wilson'), choiceVariant(byId('flt-wilson'))!]) {
      const kind = generator.id.endsWith('+choice') ? 'choice' : 'expression';
      for (const slide of slides(generator.id, kind, generator)) {
        const [f, p] = ints(promptOf(slide));
        const answer = slide.kind === 'choice' ? Number(chosen(slide)) : Number(slide.answer);
        expect(answer).toBe(slowFact(f, p));
      }
    }
  });

  it('walks the flow to the factorial', () => {
    for (const slide of slides('flt-wilson-flow', 'flow')) {
      const [f, p] = ints(slide.subject);
      expect(slide.answer[0]).toBe(`$${slowFact(p - 1, p)}$`);
      expect(slide.answer[2]).toBe(`$${slowFact(f, p)}$`);
    }
  });

  it('offers exactly one true factorial congruence', () => {
    for (const slide of slides('flt-wilson-true', 'choice')) {
      const truths = slide.options.filter(({ label }) => {
        const [f, r, m] = ints(label);
        return slowFact(f, m) === residue(r, m);
      });
      expect(truths.map(({ id }) => id), JSON.stringify(slide.options)).toEqual([slide.correctId]);
    }
  });
});
