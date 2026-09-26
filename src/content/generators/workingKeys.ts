import type { KeypadKey } from '../types';

/**
 * Keys for typing a calculation as the answer rather than only its result:
 * times, divide, brackets, a square root and a power.
 *
 * The owner asked for this on mechanics questions, where the arithmetic
 * (a mass times 9.8 times a sine, over a total mass) is the part nobody does
 * in their head. The checker grades a typed answer by its value, so
 * `(18*9.8 - 10*9.8*0.6)/28` is marked exactly as `4.2` would be. That holds
 * because these questions' answers are exact decimals, never rounded, so the
 * working and the answer agree to far inside the checker's tolerance.
 *
 * The root and the power are here because the formulas these questions teach
 * are full of squares: a drop taught as `h = ½gt²` and then asked for `t`
 * needs `√(2h/g)`, and there was no key to type it with.
 */
export const WORKING_KEYS: KeypadKey[] = [
  { insert: '*', label: '×' },
  { insert: '/', label: '÷' },
  { insert: '(' },
  { insert: ')' },
  { insert: 'sqrt(', label: '√' },
  { insert: '^' },
];

/**
 * The working keys with sine, cosine and tangent in degrees, for a question
 * that states an angle in degrees. Most do not: they give `tan α = ¾` and the
 * working multiplies by `0.6`, so a trig key there is a key the question never
 * needs. `generators.test.ts` holds each generator to the right one of the two.
 */
export const TRIG_WORKING_KEYS: KeypadKey[] = [
  ...WORKING_KEYS,
  ...(['sin', 'cos', 'tan'] as const).map((insert) => ({ insert, fn: 'degrees' as const })),
];
