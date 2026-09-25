/**
 * The slide builders every Contest Math level is written with. Each level is
 * a file of its own beside this one, so levels can be written side by side
 * without touching the same lines; `courses/contestMath.ts` lists them.
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

export const prose = (text: string): Block => ({ kind: 'prose', text });

export const maths = (tex: string): Block => ({ kind: 'display', tex });

/** An exercise with a worked example or a line of teaching above it, on the same slide. */
export const askAfter = (generatorId: string, difficulty: number, ...leadIn: Block[]): SlideRef => ({
  type: 'generated',
  generatorId,
  difficulty,
  leadIn,
});
