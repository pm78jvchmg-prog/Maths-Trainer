/**
 * The slide builders the later Algebraic Fractions levels are written with.
 * Levels 7 to 12 are each a file beside this one, listed by
 * `courses/algebraicFractions.ts`. This folder is not scanned by
 * `courses/index.ts`, which only reads the top level.
 */
import type { Block, SlideRef } from '../../types';

export const teach = (...blocks: Block[]): SlideRef => ({
  type: 'literal',
  slide: { kind: 'teach', body: blocks },
});

export const ask = (generatorId: string, difficulty = 1): SlideRef => ({
  type: 'generated',
  generatorId,
  difficulty,
});

/** A question with a worked example above it, on the same slide. */
export const askAfter = (generatorId: string, difficulty: number, ...leadIn: Block[]): SlideRef => ({
  type: 'generated',
  generatorId,
  difficulty,
  leadIn,
});

export const prose = (text: string): Block => ({ kind: 'prose', text });
export const maths = (tex: string): Block => ({ kind: 'display', tex });
export const diagram = (svg: string): Block => ({ kind: 'diagram', svg });

/**
 * Lines of working stacked in one display and aligned on their `&`. A chain
 * of equals signs on one line runs off a phone screen after about three terms.
 */
export const working = (...lines: string[]): Block =>
  maths(`\\begin{aligned} ${lines.join(' \\\\ ')} \\end{aligned}`);
