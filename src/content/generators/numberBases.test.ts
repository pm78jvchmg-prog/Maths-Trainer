/**
 * Number & Proof level 7, Number Bases: the arithmetic behind the slides.
 *
 * The generic sweep proves each generator agrees with itself. These read the
 * numerals each prompt states, convert them with `parseInt` and
 * `Number.prototype.toString(base)`, and hold every answer, table cell, tile
 * and option to that, never to the generator's own helpers.
 */
import { describe, it, expect } from 'vitest';
import { makeRng } from '../../engine/rng';
import type { Generator, Slide } from '../types';
import { choiceVariant } from '../choiceVariant';
import { numberBasesGenerators } from './numberBases';

const SEEDS = 200;

type Kind = Slide['kind'];
type Of<K extends Kind> = Extract<Slide, { kind: K }>;

const byId = (id: string) => {
  const generator = numberBasesGenerators.find((g) => g.id === id) as Generator<unknown> | undefined;
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
  slide.prompt.map((block) => (block.kind === 'prose' ? block.text : '')).join(' ');

/** Every numeral with a base subscript in a piece of TeX: `1011_2`, `\mathrm{2F}_{16}`. */
function numerals(tex: string): { digits: string; base: number; value: number }[] {
  const out: { digits: string; base: number; value: number }[] = [];
  const re = /(?:\\mathrm\{([0-9A-F]+)\}|([0-9]+))_(?:\{(\d+)\}|(\d))/g;
  for (let m = re.exec(tex); m; m = re.exec(tex)) {
    const digits = m[1] ?? m[2];
    const base = Number(m[3] ?? m[4]);
    out.push({ digits, base, value: parseInt(digits, base) });
  }
  return out;
}

/** The first `$...$` in a piece of prose. */
const firstMaths = (text: string) => /\$([^$]+)\$/.exec(text)![1];

/** Whole numbers in a string. */
const ints = (text: string) => (text.match(/\d+/g) ?? []).map(Number);

const chosen = (slide: Of<'choice'>) => slide.options.find((option) => option.id === slide.correctId)!.label;

/** A hex or other digit token as its value: `\mathrm{B}` is 11. */
const tokenValue = (token: string) => parseInt(token.replace(/\\mathrm\{(\w)\}/, '$1'), 16);

describe('reading binary', () => {
  it('gives the worth of the underlined digit', () => {
    for (const slide of slides('base-bin-worth', 'expression')) {
      const tex = firstMaths(promptOf(slide));
      const m = /^([01]*)\\underline\{1\}([01]*)_2$/.exec(tex)!;
      expect(m, tex).not.toBeNull();
      expect(Number(slide.answer)).toBe(2 ** m[2].length);
    }
  });

  it('converts the stated numeral to denary', () => {
    for (const id of ['base-bin-to-den', 'base-to-den', 'base-hex-to-den']) {
      for (const slide of slides(id, 'expression')) {
        const [n] = numerals(promptOf(slide));
        expect(Number(slide.answer), `${id}: ${n.digits}_${n.base}`).toBe(n.value);
        expect(n.value).toBeLessThan(1000);
      }
    }
  });

  it('offers the conversion once among different numbers', () => {
    for (const id of ['base-bin-to-den', 'base-to-den', 'base-hex-to-den', 'base-bin-worth']) {
      const choice = choiceVariant(byId(id))!;
      for (const slide of slides(`${id}+choice`, 'choice', choice)) {
        const labels = slide.options.map((o) => o.label);
        expect(new Set(labels).size).toBe(labels.length);
      }
    }
  });

  it('fills the worth table from place values and digits', () => {
    for (const id of ['base-bin-table', 'base-worth-table']) {
      for (const slide of slides(id, 'table')) {
        const [n] = numerals(promptOf(slide));
        const digits = [...n.digits].map((c) => parseInt(c, n.base));
        const expected = digits.map((d, i) => d * n.base ** (digits.length - 1 - i));
        expect(slide.answer.map(Number), id).toEqual([...expected, n.value]);
        // The given cells are the true place values and digits.
        slide.rows.slice(0, -1).forEach((row, i) => {
          expect(Number(row[0])).toBe(n.base ** (digits.length - 1 - i));
          expect(Number(row[1])).toBe(digits[i]);
        });
      }
    }
  });

  it('doubles and adds to each running total', () => {
    for (const slide of slides('base-bin-double', 'table')) {
      const bits = /\$([01]+)_2\$/.exec(promptOf(slide))![1];
      let total = 0;
      const running = [...bits].map((c) => (total = 2 * total + Number(c)));
      expect(slide.answer.map(Number)).toEqual(running.slice(1));
      expect(running[running.length - 1]).toBe(parseInt(bits, 2));
    }
  });
});

describe('writing in binary and other bases', () => {
  it('names the biggest power of 2 not over the number', () => {
    for (const slide of slides('base-biggest-power', 'expression')) {
      const n = ints(promptOf(slide)).pop()!;
      const p = Number(slide.answer);
      expect(Math.log2(p) % 1).toBe(0);
      expect(p).toBeLessThanOrEqual(n);
      expect(2 * p).toBeGreaterThan(n);
    }
  });

  it('takes away powers of 2 down to nothing', () => {
    for (const slide of slides('base-powers-table', 'table')) {
      const n = Number(firstMaths(promptOf(slide).replace(/\$2\$/, '')));
      const values = slide.answer.map(Number);
      let left = n;
      for (let i = 0; i < values.length; i += 2) {
        const [power, after] = [values[i], values[i + 1]];
        expect(2 ** Math.floor(Math.log2(left))).toBe(power);
        left -= power;
        expect(after).toBe(left);
      }
      expect(left).toBe(0);
    }
  });

  it('divides down with the right remainders', () => {
    for (const id of ['base-halving-table', 'base-divide-table']) {
      for (const slide of slides(id, 'table')) {
        const [n, b] = ints(promptOf(slide));
        const values = [n, ...slide.answer.map(Number)];
        // Pairs of number, remainder, starting from the stated number.
        const remainders: number[] = [];
        for (let i = 0; i < values.length; i += 2) {
          const x = values[i];
          const r = values[i + 1];
          expect(r, id).toBe(x % b);
          if (i + 2 < values.length) expect(values[i + 2]).toBe(Math.floor(x / b));
          else expect(x).toBeLessThan(b);
          remainders.push(r);
        }
        expect(remainders.reverse().join('')).toBe(n.toString(b));
      }
    }
  });

  it('writes the stated number in the stated base', () => {
    for (const id of ['base-den-to-bin', 'base-from-den']) {
      for (const slide of slides(id, 'expression')) {
        const prose = promptOf(slide);
        const n = Number(firstMaths(prose));
        const base = /binary/.test(prose) ? 2 : /octal/.test(prose) ? 8 : Number(/base \$(\d)\$/.exec(prose)![1]);
        expect(slide.answer, id).toBe(n.toString(base));
        // Eight digits at most: the checker's relative tolerance stays below one unit.
        expect(slide.answer.length).toBeLessThanOrEqual(8);
      }
    }
  });

  it('offers numerals worth different numbers, one of them right', () => {
    for (const id of ['base-den-to-bin', 'base-from-den', 'base-bin-add', 'base-bin-subtract', 'base-shift']) {
      const choice = choiceVariant(byId(id))!;
      for (const slide of slides(`${id}+choice`, 'choice', choice)) {
        const read = slide.options.map((o) => numerals(o.label)[0]);
        const values = read.map((r) => r.value);
        expect(new Set(values).size, id).toBe(values.length);
        for (const r of read) expect([...r.digits].every((c) => parseInt(c, 16) < r.base)).toBe(true);
      }
    }
  });

  it('offers exactly one binary numeral worth the stated number', () => {
    for (const slide of slides('base-bin-which', 'choice')) {
      const n = Number(firstMaths(promptOf(slide)));
      const values = slide.options.map((o) => numerals(o.label)[0].value);
      expect(values.filter((v) => v === n)).toHaveLength(1);
      expect(numerals(chosen(slide))[0].value).toBe(n);
      expect(new Set(values).size).toBe(values.length);
    }
  });

  it('offers exactly one numeral whose digits all fit the base', () => {
    for (const slide of slides('base-valid-digits', 'choice')) {
      const b = ints(promptOf(slide))[0];
      const fits = slide.options.filter((o) => [...o.label].every((c) => Number(c) < b));
      expect(fits.map((o) => o.label)).toEqual([chosen(slide)]);
    }
  });
});

describe('octal and hexadecimal', () => {
  it('writes the number in hex digit by digit', () => {
    for (const slide of slides('base-den-to-hex', 'tiles')) {
      const n = Number(firstMaths(promptOf(slide)));
      expect(slide.answer.map((t) => tokenValue(t).toString(16)).join('')).toBe(n.toString(16));
    }
  });

  it('groups binary into octal and hex digits', () => {
    for (const [id, base] of [['base-bin-to-hex', 16], ['base-bin-to-oct', 8]] as const) {
      for (const slide of slides(id, 'tiles')) {
        const [bin] = numerals(promptOf(slide));
        expect(bin.base).toBe(2);
        expect(slide.answer.map((t) => tokenValue(t).toString(base)).join(''), id).toBe(bin.value.toString(base));
      }
    }
  });

  it('turns hex into the one binary number worth the same', () => {
    for (const slide of slides('base-hex-to-bin', 'choice')) {
      const [hex] = numerals(promptOf(slide));
      const read = slide.options.map((o) => numerals(o.label.replace(/\\,/g, ''))[0].value);
      expect(read.filter((v) => v === hex.value)).toHaveLength(1);
      expect(numerals(chosen(slide).replace(/\\,/g, ''))[0].value).toBe(hex.value);
      expect(new Set(read).size).toBe(read.length);
    }
  });
});

describe('binary arithmetic', () => {
  it('adds, subtracts and shifts the stated numbers', () => {
    const cases: [string, (a: number, b: number) => number][] = [
      ['base-bin-add', (a, b) => a + b],
      ['base-bin-subtract', (a, b) => a - b],
      ['base-shift', (a, b) => a * b],
    ];
    for (const [id, op] of cases) {
      for (const slide of slides(id, 'expression')) {
        const [a, b] = numerals(promptOf(slide));
        expect(parseInt(slide.answer, 2), id).toBe(op(a.value, b.value));
        expect(slide.answer.length).toBeLessThanOrEqual(8);
      }
    }
  });

  it('fills the column addition with its true carries and sum', () => {
    for (const slide of slides('base-add-table', 'table')) {
      const [a, b] = numerals(promptOf(slide));
      const width = slide.columns.length - 1;
      const sum = (a.value + b.value).toString(2).padStart(width, '0');
      expect(sum.length).toBe(width);
      const carries: string[] = [];
      let carry = 0;
      for (let i = 0; i < width; i += 1) {
        if (i > 0) carries.unshift(String(carry));
        carry = (((a.value >> i) & 1) + ((b.value >> i) & 1) + carry) >> 1;
      }
      expect(slide.answer).toEqual([...carries, ...sum]);
    }
  });
});
