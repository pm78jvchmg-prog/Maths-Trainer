import type { Block, KeypadKey, Slide } from '../content/types';
import { WORKING_KEYS } from '../content/generators/workingKeys';
import { math } from './expression';

/**
 * Every typed question whose answer is a number offers the working keys, so
 * the calculation can be typed rather than done in the head: a post with 6
 * shares doubling daily is answered `6 × 2⁴` as well as `96`. The owner asked
 * for it across the whole suite. The checker already grades a typed answer by
 * its value, and a stated `precision` accepts anything rounding to the
 * answer, so the working is marked exactly as its result would be.
 *
 * Added here, when a slide is resolved, rather than in some fourteen hundred
 * generators, so a question written tomorrow gets them too. Three kinds of
 * question are left as they were:
 *
 * - One held to a `form` (standard form, `p + q√d`). The notation is the
 *   skill there, and anything else typed is refused before its value is read.
 * - One graded up to a constant, where every constant would agree.
 * - One whose question *is* a sum to work out (`4306 × 4308 − 4303 × 4311`,
 *   two matrices to add): with the keys it could be typed straight back.
 *   Such a question shows its arithmetic as numbers and operators only, which
 *   is what `asksForArithmetic` looks for.
 *
 * Trig keys are never added here; they stay on the questions that state an
 * angle in degrees, which declare them themselves.
 */
export function withWorkingKeys(slide: Slide): Slide {
  if (slide.kind !== 'expression' || slide.form || slide.mode !== 'exact') return slide;
  if (!isNumber(slide.answer) || asksForArithmetic(slide.prompt, slide.lead)) return slide;
  const missing = WORKING_KEYS.filter((key) => !slide.keypad.some((own) => own.insert === key.insert));
  if (missing.length === 0) return slide;
  const keypad: KeypadKey[] = [...slide.keypad, ...missing];
  return { ...slide, keypad };
}

/** Constants a numeric answer may be written with. */
const CONSTANTS = new Set(['pi', 'e', 'i']);

/** Does the answer come to a number, with no variable in it? */
export function isNumber(answer: string): boolean {
  try {
    return math
      .parse(answer)
      .filter((node) => node.type === 'SymbolNode')
      .every((node) => {
        const symbol = node as unknown as { name: string; isFunctionName?: boolean };
        return CONSTANTS.has(symbol.name) || isFunctionName(answer, symbol.name);
      });
  } catch {
    return false;
  }
}

/** mathjs lists a called function's name as a symbol too (`sqrt` in `sqrt(2)`). */
function isFunctionName(answer: string, name: string): boolean {
  return new RegExp(`(?<![A-Za-z])${name}\\s*\\(`).test(answer) && typeof math[name as keyof typeof math] === 'function';
}

/** TeX that is layout or an operator, never a quantity with a name. */
const OPERATORS =
  /\\(times|div|cdot|pm|mp|frac|tfrac|dfrac|sqrt|left|right|big|Big|bigg|Bigg|quad|qquad|begin\{[a-z]*\}|end\{[a-z]*\}|[,;:! ]|\\)/g;

/**
 * Is a piece of TeX arithmetic on numbers alone: at least one operation, and
 * nothing named? `i` counts as a number, so `(3 + 2i)(4 - i)` is arithmetic.
 */
export function isArithmetic(tex: string): boolean {
  const bare = tex.replace(OPERATORS, ' ');
  if (/[A-Za-hj-z\\]/.test(bare)) return false;
  if (!/\d/.test(bare)) return false;
  // An operator between two operands, or a power of one, or a matrix. A
  // lone `-4`, `\frac{3}{4}` or `\sqrt{2}` is a value, not a sum.
  return /[\d)}i]\s*([-+*/]|\\(times|div|cdot))\s*[\d({\\]|[\d)}]\s*\^|\\begin\{/.test(tex);
}

/** A complex number written out, `3 - 2i`: a value, though it has a sign in it. */
const COMPLEX_LITERAL = /^\s*-?\s*\d*\.?\d*\s*([-+]\s*\d*\.?\d*\s*i)?\s*$/;

/** A size, `a $7 \times 12$ grid`: numbers joined by times, but not a sum. */
const SIZE = /^\$[\d\s]+(\\times[\d\s]+)+\$\s+(grid|block|box|matrix|board|rectangle|cuboid)/;
const SIZE_BEFORE = /(measures|measuring|is an?)\s+$/;

/** Words that say the arithmetic itself is what the question asks for. */
const IN_THE_HEAD = /without a calculator|in your head/i;

/**
 * Does the question show a sum on numbers for the learner to work out, in its
 * prompt or in the lead beside the answer box (`97^2 - 3^2 =`)?
 */
export function asksForArithmetic(prompt: Block[], lead?: string): boolean {
  if (lead && isArithmetic(lead.replace(/=\s*$/, ''))) return true;
  return prompt.some((block) => {
    if (block.kind === 'display') return isArithmetic(block.tex);
    if (block.kind !== 'prose') return false;
    if (IN_THE_HEAD.test(block.text)) return true;
    return [...block.text.matchAll(/\$[^$]+\$/g)].some((match) => {
      const piece = match[0].slice(1, -1);
      if (COMPLEX_LITERAL.test(piece)) return false;
      const at = match.index ?? 0;
      if (SIZE.test(block.text.slice(at)) || SIZE_BEFORE.test(block.text.slice(0, at))) return false;
      return isArithmetic(piece);
    });
  });
}
