/**
 * The slide builders the later Polynomials levels (8 onwards) are written
 * with. Each of those levels is a file beside this one, listed by
 * `courses/polynomials.ts`. This folder is not scanned by `courses/index.ts`,
 * which reads only the top level.
 *
 * They match the builders at the top of `courses/polynomials.ts`, so the
 * levels read the same whichever file they sit in.
 */
import type { Block, SlideRef } from '../../types';

export const teach = (...body: Block[]): SlideRef => ({ type: 'literal', slide: { kind: 'teach', body } });

export const ask = (generatorId: string, difficulty = 1): SlideRef => ({
  type: 'generated',
  generatorId,
  difficulty,
});

/**
 * A question with a worked example shown just above it, for a technique the
 * question needs that the teach slide before it does not show.
 */
export const asking = (generatorId: string, difficulty: number, ...leadIn: Block[]): SlideRef => ({
  type: 'generated',
  generatorId,
  difficulty,
  leadIn,
});

export const prose = (text: string): Block => ({ kind: 'prose', text });
export const maths = (tex: string): Block => ({ kind: 'display', tex });

/**
 * Lines of working stacked in one display and aligned on their `&`. A chain
 * of equals signs on one line runs off a phone screen after about three terms.
 */
export const working = (...lines: string[]): Block =>
  maths(`\\begin{aligned} ${lines.join(' \\\\ ')} \\end{aligned}`);
