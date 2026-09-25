/**
 * `vec-parallel`, checked against the vectors on the slide.
 *
 * The sweep proves the correct id is among the options. It cannot see a
 * distractor that is right as well: swapping the components of `xi + yj` is
 * parallel to it whenever |x| = |y|, which once offered `2i + 2j` (the given
 * vector itself) beside `6i + 6j` and marked the learner who picked it wrong.
 * So every draw here reads the given vector and each option back off the
 * rendered TeX and counts the options that are parallel by the cross product,
 * never through the generator's own arithmetic.
 */
import { describe, expect, it } from 'vitest';
import { makeRng } from '../../engine/rng';
import type { Generator, Slide } from '../types';
import { vectorGenerators } from './vectors';

const SEEDS = 2000;
const DIFFICULTIES = [1, 2];

const parallel = vectorGenerators.find((g) => g.id === 'vec-parallel') as Generator<unknown>;

/** `3\mathbf{i} - \mathbf{j}` as [3, -1]. Throws on anything else. */
function ij(tex: string): [number, number] {
  const out: [number, number] = [0, 0];
  const term = /([+-]?)(\d*)\\mathbf\{([ij])\}/y;
  const t = tex.replace(/\s+/g, '');
  let at = 0;
  while (at < t.length) {
    term.lastIndex = at;
    const match = term.exec(t);
    if (!match) throw new Error(`unreadable vector: ${tex}`);
    out[match[3] === 'i' ? 0 : 1] += (match[1] === '-' ? -1 : 1) * (match[2] === '' ? 1 : Number(match[2]));
    at = term.lastIndex;
  }
  return out;
}

/** The vector the question names, as the learner reads it. */
function givenOf(slide: Slide): [number, number] {
  if (slide.kind !== 'choice') throw new Error(`rendered ${slide.kind}`);
  const block = slide.prompt[0];
  const tex = block.kind === 'prose' ? /\$([^$]+)\$/.exec(block.text)?.[1] : undefined;
  if (!tex) throw new Error('no vector in the prompt');
  return ij(tex);
}

describe('vec-parallel', () => {
  it('offers exactly one option parallel to the given vector, and marks it correct', () => {
    for (const difficulty of DIFFICULTIES) {
      for (let seed = 0; seed < SEEDS; seed += 1) {
        const slide = parallel.render(parallel.sample(makeRng(seed), difficulty));
        if (slide.kind !== 'choice') throw new Error(`rendered ${slide.kind}`);
        const [x, y] = givenOf(slide);
        const right = slide.options
          .filter((option) => {
            const [u, v] = ij(option.label);
            return x * v - y * u === 0;
          })
          .map((option) => option.id);
        expect(right, `seed ${seed} d${difficulty}: ${slide.options.map((o) => o.label).join(' | ')}`)
          .toEqual([slide.correctId]);
      }
    }
  });
});
