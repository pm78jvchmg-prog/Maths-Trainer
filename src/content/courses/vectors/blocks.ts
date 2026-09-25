/**
 * Authoring helpers shared by the later Vectors levels (vm-l13 onward).
 *
 * Each of those levels lives in a file of its own in this folder and is
 * imported by `../vectors.ts`, the one course file. This folder is not scanned
 * by `courses/index.ts`, which only reads the top level, so a level file is
 * never mistaken for a course.
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

/** A generated question with a worked example above it, on the same slide. */
export const askAfter = (lead: Block[], generatorId: string, difficulty = 1): SlideRef => ({
  type: 'generated',
  generatorId,
  difficulty,
  leadIn: lead,
});

export const prose = (text: string): Block => ({ kind: 'prose', text });
export const display = (tex: string): Block => ({ kind: 'display', tex });
export const diagram = (svg: string): Block => ({ kind: 'diagram', svg });

/** Lines of working stacked and centred, one line each. */
export const stacked = (...lines: string[]): Block => display(`\\begin{gathered} ${lines.join(' \\\\ ')} \\end{gathered}`);
