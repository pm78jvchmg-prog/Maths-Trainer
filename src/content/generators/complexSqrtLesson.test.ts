/**
 * The square-root lesson's two scaffolding questions, checked from what the
 * learner reads.
 *
 * The sweep proves each generator agrees with itself: that the answer it
 * grades against is in its bank or among its options. It cannot see a table
 * whose `|z|` row holds the wrong number, or a "which is a square root" slide
 * where a distractor also squares to `z`. So both are worked again here from
 * the displayed `z` alone, by squaring and by the method the lesson teaches.
 */
import { describe, expect, it } from 'vitest';
import { makeRng } from '../../engine/rng';
import type { Generator, Slide } from '../types';
import { planeGenerators } from './complexPlane';

const SEEDS = 300;
const DIFFICULTIES = [1, 2];

const byId = (id: string) => {
  const found = (planeGenerators as Generator<unknown>[]).find((g) => g.id === id);
  if (!found) throw new Error(`no generator ${id}`);
  return found;
};

/** `3 - 2i`, `-i`, `4i`, `-5` as written by `complexTex`, read back as [re, im]. */
function parse(tex: string): [number, number] {
  const s = tex.replace(/\s+/g, '');
  const imaginary = /^(-?)(\d*)i$/.exec(s);
  if (imaginary) return [0, (imaginary[1] ? -1 : 1) * (imaginary[2] === '' ? 1 : Number(imaginary[2]))];
  if (/^-?\d+$/.test(s)) return [Number(s), 0];
  const both = /^(-?\d+)([+-])(\d*)i$/.exec(s);
  if (!both) throw new Error(`cannot read ${tex}`);
  const mag = both[3] === '' ? 1 : Number(both[3]);
  return [Number(both[1]), both[2] === '-' ? -mag : mag];
}

const square = ([a, b]: [number, number]): [number, number] => [a * a - b * b, 2 * a * b];

function shownZ(slide: Slide): [number, number] {
  if (!('prompt' in slide)) throw new Error('no prompt');
  const display = slide.prompt.find((block) => block.kind === 'display');
  if (!display || display.kind !== 'display') throw new Error('no display');
  return parse(display.tex.replace(/^z\s*=\s*/, ''));
}

function each(id: string, check: (slide: Slide) => void) {
  const generator = byId(id);
  for (const difficulty of DIFFICULTIES) {
    for (let seed = 0; seed < SEEDS; seed += 1) {
      check(generator.render(generator.sample(makeRng(seed), difficulty)));
    }
  }
}

describe('complex square roots, worked from the question', () => {
  it('parses what complexTex writes', () => {
    expect(parse('3 - 2i')).toEqual([3, -2]);
    expect(parse('-i')).toEqual([0, -1]);
    expect(parse('4i')).toEqual([0, 4]);
    expect(parse('-5')).toEqual([-5, 0]);
    expect(parse('-2 + i')).toEqual([-2, 1]);
  });

  it('sqrt-check: exactly one option squares to z, and it is the one marked right', () => {
    each('sqrt-check', (slide) => {
      if (slide.kind !== 'choice') throw new Error('not a choice slide');
      const z = shownZ(slide);
      const roots = slide.options.filter((option) => {
        const s = square(parse(option.label));
        return s[0] === z[0] && s[1] === z[1];
      });
      expect(roots.map((o) => o.id)).toEqual([slide.correctId]);
    });
  });

  it('sqrt-method: every row follows from z by the method the lesson shows', () => {
    each('sqrt-method', (slide) => {
      if (slide.kind !== 'table') throw new Error('not a table slide');
      const [x, y] = shownZ(slide);
      expect(slide.rows[0][1]).toBe(String(x));
      expect(slide.rows[1][1]).toBe(String(y));
      const mod = Math.sqrt(x * x + y * y);
      expect(Number.isInteger(mod), `|z| = ${mod} is not whole`).toBe(true);
      const aSq = (mod + x) / 2;
      const bSq = (mod - x) / 2;
      const [answerMod, answerA, answerB, root] = slide.answer;
      expect(Number(answerMod)).toBe(mod);
      expect(Number(answerA)).toBe(aSq);
      expect(Number(answerB)).toBe(bSq);
      const [a, b] = parse(root);
      expect(a).toBeGreaterThan(0);
      expect(square([a, b])).toEqual([x, y]);
    });
  });
});
