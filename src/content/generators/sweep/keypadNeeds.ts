/**
 * The keys a typed answer needs that its keypad does not offer.
 *
 * A gradient of 1/3 asked on a keypad with no fraction key cannot be given at
 * all: 0.333 misses by more than the checker's tolerance. The owner met the
 * same thing on a drop asked for t, whose answer needed a root the keypad did
 * not have. This reads what the answer is built from and names every function,
 * letter or operation with no key to type it.
 *
 * A constant answer whose value is a whole number or a short decimal needs
 * nothing beyond the digits and the point, however `answer` happens to spell
 * it, and neither does a rounded one (`precision`), which is typed as the
 * rounded decimal.
 */
import type { MathNode } from 'mathjs';
import { math } from '../../../engine/expression';
import type { KeypadKey } from '../../types';

export function missingKeys(
  answer: string,
  keypad: readonly KeypadKey[],
  rounded: boolean,
): string[] {
  const node = math.parse(answer);
  if (rounded || isShortDecimal(node)) return [];
  const inserts = keypad.map((key) => key.insert.trim());
  const missing = new Set<string>();
  node.traverse((child: MathNode, path: string, parent: MathNode | null) => {
    if (child.type === 'FunctionNode') {
      const name = (child as unknown as { fn: { name: string } }).fn.name;
      if (!hasFunction(inserts, keypad, name)) missing.add(`${name}(`);
    } else if (child.type === 'OperatorNode') {
      const { op } = child as unknown as { op: string };
      if (op === '/' && !isShortDecimal(child) && !inserts.includes('/')) missing.add('/');
      if (op === '^' && !inserts.some((i) => i.includes('^'))) missing.add('^');
    } else if (child.type === 'SymbolNode' && !(parent?.type === 'FunctionNode' && path === 'fn')) {
      const { name } = child as unknown as { name: string };
      if (!inserts.some((i) => i === name || i === `(${name})`)) missing.add(name);
    }
  });
  return [...missing];
}

function hasFunction(inserts: string[], keypad: readonly KeypadKey[], name: string): boolean {
  if (inserts.includes(`${name}(`)) return true;
  if (keypad.some((key) => key.fn && key.insert === name)) return true;
  if (name === 'log' && inserts.includes('ln(')) return true;
  if (name === 'exp') return inserts.includes('e') && inserts.some((i) => i.includes('^'));
  return false;
}

/** A constant worth a whole number or a decimal of at most six places. */
function isShortDecimal(node: MathNode): boolean {
  let hasSymbol = false;
  node.traverse((child: MathNode, path: string, parent: MathNode | null) => {
    if (child.type === 'SymbolNode' && !(parent?.type === 'FunctionNode' && path === 'fn')) hasSymbol = true;
  });
  if (hasSymbol) return false;
  let value: unknown;
  try {
    value = node.evaluate();
  } catch {
    return false;
  }
  if (typeof value !== 'number' || !Number.isFinite(value)) return false;
  const scaled = value * 1e6;
  return Math.abs(scaled - Math.round(scaled)) < 1e-6 * Math.max(1, Math.abs(scaled));
}
