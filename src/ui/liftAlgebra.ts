/**
 * Moves a line of algebra out of a sentence and onto a line of its own.
 *
 * The owner asked for this after a question read "…after $t$ minutes is
 * $T = 15 + 28e^{-\frac{\ln 2}{9}t}$. At $t = 18$ the power is…": an equation
 * set inline wraps across lines with the prose around it and is hard to read
 * on a phone. Done here, where prose is rendered, rather than in the content,
 * so every lesson follows the rule and no new generator can forget it.
 *
 * Only an equation or inequality is lifted, and only one with something to
 * read: `t = 18` or `k = \frac{\ln 2}{5}` stays in the sentence, where it reads
 * as a value, and `T = 20 + 80e^{-kt}` or `x^{2} - 5x + 6 = 0` goes on its own
 * line. A relation inside brackets (`P(X = 3)`) is not the span's own, so a
 * span is lifted only for a relation at its top level.
 */

import type { Block } from '../content/types';

export type Piece = { kind: 'text'; text: string } | { kind: 'maths'; tex: string };

/** Relations that make a span a statement rather than a value. */
const RELATION = /^(=|<|>|\\(?:le|leq|leqslant|ge|geq|geqslant|ne|neq|approx|equiv|lt|gt)(?![a-zA-Z]))/;

/** Shortest span, in characters a reader sees, lifted when it holds working. */
export const LIFT_LENGTH = 6;

/** Length at which a relation is lifted even with no working in it. */
export const LIFT_LENGTH_PLAIN = 12;

/** Whether the TeX holds a relation outside every bracket and brace. */
export function hasTopLevelRelation(tex: string): boolean {
  let depth = 0;
  for (let at = 0; at < tex.length; at += 1) {
    const ch = tex[at];
    if (ch === '\\') {
      // `\{`, `\(` and the like are escaped characters, not brackets, and
      // `\left(` leaves its bracket for the loop to count.
      if (depth === 0 && RELATION.test(tex.slice(at))) return true;
      const word = /^\\([a-zA-Z]+|.)/.exec(tex.slice(at));
      at += (word?.[0].length ?? 1) - 1;
      continue;
    }
    if (ch === '{' || ch === '(' || ch === '[') depth += 1;
    else if (ch === '}' || ch === ')' || ch === ']') depth -= 1;
    else if (depth === 0 && (ch === '=' || ch === '<' || ch === '>')) return true;
  }
  return false;
}

/** Roughly how many characters the reader sees: a command is one, layout is none. */
export function visibleLength(tex: string): number {
  return tex
    .replace(/\\(frac|dfrac|tfrac|left|right|displaystyle|text|mathrm|mathbf|operatorname|quad|qquad|,|;|!| )/g, '')
    .replace(/\\[a-zA-Z]+/g, 'c')
    .replace(/[{}\s^_]/g, '').length;
}

/**
 * Whether the TeX does some arithmetic: a `+` or `-` between two terms (not a
 * sign, as in `-3` or `e^{-kt}`), a times or a divide. `y = 2x` has none and
 * reads as a value; `y = 3x^{2} + 2x` has one and reads as algebra.
 */
export function hasOperator(tex: string): boolean {
  if (/\\(times|div|cdot)(?![a-zA-Z])/.test(tex)) return true;
  const squeezed = tex.replace(/\s+/g, '');
  for (let at = 1; at < squeezed.length; at += 1) {
    if (squeezed[at] !== '+' && squeezed[at] !== '-') continue;
    const before = squeezed[at - 1];
    if (!/[=<>({[^_,]/.test(before) && !/\\(le|leq|ge|geq|ne|neq|approx|pm|mp)$/.test(squeezed.slice(0, at))) {
      return true;
    }
  }
  return false;
}

/** Whether an inline span is a line of algebra that belongs on its own line. */
export function isAlgebraLine(tex: string): boolean {
  if (!hasTopLevelRelation(tex)) return false;
  const length = visibleLength(tex);
  return length >= LIFT_LENGTH_PLAIN || (length >= LIFT_LENGTH && hasOperator(tex));
}

/**
 * Splits prose into runs of text and lifted equations, in order. Punctuation
 * that only closed the sentence around a lifted equation is dropped with it,
 * so a paragraph never opens with a stray full stop or comma. Text is left
 * holding its own inline maths and markup for `Inline` to render.
 */
export function liftAlgebra(text: string): Piece[] {
  const pieces: Piece[] = [];
  let pending = '';
  const parts = text.split(/(\*\*[^*]+\*\*|\$[^$]+\$)/g);
  for (const part of parts) {
    if (part.startsWith('$') && part.endsWith('$') && part.length > 2 && isAlgebraLine(part.slice(1, -1))) {
      const before = pending.replace(/\s+$/, '');
      if (before) pieces.push({ kind: 'text', text: before });
      pieces.push({ kind: 'maths', tex: part.slice(1, -1) });
      pending = '';
      continue;
    }
    if (pieces.length > 0 && pieces[pieces.length - 1].kind === 'maths' && pending === '') {
      pending = part.replace(/^[\s.,;:]+/, '');
      continue;
    }
    pending += part;
  }
  const rest = pending.replace(/^\s+|\s+$/g, '');
  if (rest) pieces.push({ kind: 'text', text: rest });
  return pieces;
}

/** One rendered item of a block list once its prose has been lifted. */
export type Lifted = Exclude<Block, { kind: 'prose' }> | Piece | { kind: 'lifted'; tex: string };

const squash = (tex: string) => tex.replace(/\s+/g, '');

/**
 * Lifts every prose block in a list, and drops a display block that repeats an
 * equation already lifted above it. Many prompts name their model in the
 * sentence and then show it again as a display; once the sentence's copy is on
 * its own line, the second is the same line twice.
 */
export function liftBlocks(blocks: Block[]): Lifted[] {
  const out: Lifted[] = [];
  const shown = new Set<string>();
  for (const block of blocks) {
    if (block.kind === 'prose') {
      for (const piece of liftAlgebra(block.text)) {
        if (piece.kind === 'maths') {
          shown.add(squash(piece.tex));
          out.push({ kind: 'lifted', tex: piece.tex });
        } else out.push(piece);
      }
    } else if (block.kind === 'display' && shown.has(squash(block.tex))) {
      continue;
    } else out.push(block);
  }
  return out;
}
