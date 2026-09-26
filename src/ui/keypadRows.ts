import type { KeypadKey } from '../content/types';

/** Characters per row, as the digits have always been laid out. */
export const KEY_COLUMNS = 7;

/** Function keys per row: `sin⁻¹` needs about two characters' width. */
export const FN_COLUMNS = 3;

/**
 * Split `items` into as few rows of at most `max` as will hold them, as evenly
 * as possible, the longer rows first. Nine keys make rows of five and four
 * rather than seven and a stranded two.
 */
function balanced<T>(items: readonly T[], max: number): T[][] {
  const count = Math.ceil(items.length / max);
  const rows: T[][] = [];
  let at = 0;
  for (let row = 0; row < count; row += 1) {
    const size = Math.ceil((items.length - at) / (count - row));
    rows.push(items.slice(at, at + size));
    at += size;
  }
  return rows;
}

/**
 * The keypad as rows, each drawn as its own grid as wide as the pad, so no row
 * ever ends in a gap whatever keys a question declares.
 *
 * A single seven-column grid left holes: four working keys and `sin` filled
 * one row with a column to spare, and `cos` and `tan` stranded three more on
 * the next. Now the base keys keep their two rows of seven, so the digits never
 * move between questions; the question's own keys follow, balanced across rows
 * of at most seven; and the function keys come last, grouped in rows of at
 * most three, except that one or two stray keys finish the last of them.
 */
export function keypadRows(base: readonly KeypadKey[], topic: readonly KeypadKey[]): KeypadKey[][] {
  const plain = balanced(topic.filter((key) => !key.fn), KEY_COLUMNS);
  const fns = balanced(topic.filter((key) => key.fn), FN_COLUMNS);
  // One or two keys left on a row of their own would each be drawn half the
  // pad wide or more: a lone fraction key spanning the whole pad above the
  // trig keys. They finish the last row of function keys instead.
  if (fns.length && plain.length && plain[plain.length - 1].length <= 2) {
    fns[fns.length - 1] = [...fns[fns.length - 1], ...plain.pop()!];
  }
  return [...balanced(base, KEY_COLUMNS), ...plain, ...fns];
}
