/**
 * Authoring helpers shared by the Parametric & Implicit levels written in
 * this folder (pi-l8 onwards, all shown on the Parametric & Implicit Basics
 * card; see placement.ts).
 *
 * Each level lives in a file of its own and is imported by
 * `../parametricImplicit.ts`, the one course file. This folder is not scanned
 * by `courses/index.ts`, which only reads the top level, so a level file is
 * never mistaken for a course.
 */
import type { Block, SlideRef } from '../../types';
import { paramSvg } from '../../generators/parametricImplicit';

export const teach = (...blocks: Block[]): SlideRef => ({
  type: 'literal',
  slide: { kind: 'teach', body: blocks },
});

export const ask = (generatorId: string, difficulty = 1): SlideRef => ({
  type: 'generated',
  generatorId,
  difficulty,
});

/** A generated question with the sentences that set it up above it. */
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

/** A parametric curve drawn on square axes. */
export const figure = (f: (t: number) => [number, number], opts: Parameters<typeof paramSvg>[1]): Block =>
  diagram(paramSvg(f, opts));
