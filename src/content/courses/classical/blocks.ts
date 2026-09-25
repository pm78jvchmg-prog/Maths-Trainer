/**
 * Authoring helpers shared by the Classical Mechanics levels.
 *
 * Each level lives in a file of its own in this folder and is imported by
 * `../classicalMechanics.ts`, the one course file. This folder is not
 * scanned by `courses/index.ts`, which only reads the top level, so a level
 * file is never mistaken for a course.
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
export const display = (tex: string): Block => ({ kind: 'display', tex });
export const diagram = (svg: string): Block => ({ kind: 'diagram', svg });

/** Lines of working stacked and centred, one line each. */
export const stacked = (...lines: string[]): Block => display(`\\begin{gathered} ${lines.join(' \\\\ ')} \\end{gathered}`);
