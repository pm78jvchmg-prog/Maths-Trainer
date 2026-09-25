/**
 * `mat-missing`, checked against the equation on the slide.
 *
 * The generic sweep proves the bank holds the answer a generator claims. It
 * cannot see that the claim is wrong: `A - X = E` once stored `E + A`, which
 * satisfies neither form, and the choice variant offered no option that did.
 * So every draw here reads A, the sign and E back off the rendered prompt and
 * checks the answer by putting it into the equation, never through the
 * generator's own arithmetic.
 */
import { describe, expect, it } from 'vitest';
import { makeRng } from '../../engine/rng';
import { choiceVariant } from '../choiceVariant';
import type { Generator, Slide } from '../types';
import { matrixGenerators } from './matrices';

const SEEDS = 200;
const DIFFICULTIES = [1, 2];

const missing = matrixGenerators.find((g) => g.id === 'mat-missing') as Generator<unknown>;
const missingChoice = choiceVariant(missing) as Generator<unknown>;

/** The entries of every `pmatrix` in a TeX string, read row by row. */
function matricesIn(tex: string): number[][] {
  return [...tex.matchAll(/\\begin\{pmatrix\}(.*?)\\end\{pmatrix\}/g)].map((match) =>
    match[1].split(/\\\\|&/).map((entry) => Number(entry.trim())),
  );
}

/** A, the operator in front of X, and E, as the learner reads them. */
function equationOf(slide: Slide) {
  if (!('prompt' in slide)) throw new Error(`${slide.kind} has no prompt`);
  const display = slide.prompt.find((block) => block.kind === 'display');
  if (display?.kind !== 'display') throw new Error('no displayed equation');
  const operator = /\\end\{pmatrix\} ([+-]) \\mathbf\{X\}/.exec(display.tex)?.[1];
  const [a, e] = matricesIn(display.tex);
  if (!operator || !a || !e) throw new Error(`unreadable equation: ${display.tex}`);
  return { a, operator, e };
}

describe('mat-missing', () => {
  it('stores the X that makes A + X = E and A - X = E true', () => {
    const forms = { '+': 0, '-': 0 };
    for (const difficulty of DIFFICULTIES) {
      for (let seed = 0; seed < SEEDS; seed += 1) {
        const slide = missing.render(missing.sample(makeRng(seed), difficulty));
        if (slide.kind !== 'tiles') throw new Error(`rendered ${slide.kind}`);
        const { a, operator, e } = equationOf(slide);
        forms[operator as '+' | '-'] += 1;
        const x = slide.answer.map(Number);
        const lhs = a.map((entry, i) => (operator === '+' ? entry + x[i] : entry - x[i]));
        expect(lhs, `seed ${seed} d${difficulty}: A ${operator} X`).toEqual(e);
      }
    }
    // Both forms are drawn, so neither can go unchecked.
    expect(forms['+']).toBeGreaterThan(0);
    expect(forms['-']).toBeGreaterThan(0);
  });

  it('offers the X that solves the equation as the correct choice', () => {
    for (const difficulty of DIFFICULTIES) {
      for (let seed = 0; seed < SEEDS; seed += 1) {
        const slide = missingChoice.render(missingChoice.sample(makeRng(seed), difficulty));
        if (slide.kind !== 'choice') throw new Error(`rendered ${slide.kind}`);
        const { a, operator, e } = equationOf(slide);
        const solves = (label: string) => {
          const [x] = matricesIn(label);
          return a.every((entry, i) => (operator === '+' ? entry + x[i] : entry - x[i]) === e[i]);
        };
        const correct = slide.options.find((option) => option.id === slide.correctId);
        expect(correct && solves(correct.label), `seed ${seed} d${difficulty}`).toBe(true);
        const alsoSolve = slide.options.filter((o) => o.id !== slide.correctId && solves(o.label));
        expect(alsoSolve, `seed ${seed} d${difficulty}`).toEqual([]);
      }
    }
  });
});
