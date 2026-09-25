/**
 * The slide builders every Geometry level is written with. Each level is a
 * file of its own beside this one, and `courses/geometry.ts` lists them. This
 * folder is not scanned by `courses/index.ts`, which only reads the top level.
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

/** An exercise with a worked example or a line of teaching above it, on the same slide. */
export const askAfter = (generatorId: string, difficulty: number, ...leadIn: Block[]): SlideRef => ({
  type: 'generated',
  generatorId,
  difficulty,
  leadIn,
});

export const prose = (text: string): Block => ({ kind: 'prose', text });
export const display = (tex: string): Block => ({ kind: 'display', tex });
export const diagram = (svg: string): Block => ({ kind: 'diagram', svg });
