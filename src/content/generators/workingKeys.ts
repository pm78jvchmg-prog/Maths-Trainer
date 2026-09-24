import type { KeypadKey } from '../types';

/**
 * Keys for typing a calculation as the answer rather than only its result:
 * times, divide, brackets and trig in degrees.
 *
 * The owner asked for this on mechanics questions, where the arithmetic
 * (a mass times 9.8 times a sine, over a total mass) is the part nobody does
 * in their head. The checker grades a typed answer by its value, so
 * `(18*9.8 - 10*9.8*0.6)/28` is marked exactly as `4.2` would be. That holds
 * because these questions' answers are exact decimals, never rounded, so the
 * working and the answer agree to far inside the checker's tolerance.
 */
export const WORKING_KEYS: KeypadKey[] = [
  { insert: '*', label: '×' },
  { insert: '/', label: '÷' },
  { insert: '(' },
  { insert: ')' },
  ...(['sin', 'cos', 'tan'] as const).map((insert) => ({ insert, fn: 'degrees' as const })),
];
