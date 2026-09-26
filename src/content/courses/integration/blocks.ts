/**
 * Slide builders for the later Further Integration levels, each written in a
 * file of its own beside this one and listed by `courses/integration.ts`. This
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

export const prose = (text: string): Block => ({ kind: 'prose', text });
export const maths = (tex: string): Block => ({ kind: 'display', tex });
