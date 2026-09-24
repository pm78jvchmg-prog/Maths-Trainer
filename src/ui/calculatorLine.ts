/**
 * The pure half of the calculator in `Calculator.tsx`: what a line shows, what
 * a backspace removes, and what a line comes to.
 */
import { math } from '../engine/expression';

/** The typed line as it reads on the display: symbols, not mathjs spelling. */
export function shown(line: string): string {
  return line
    .replace(/sqrt\(/g, '√(')
    .replace(/cbrt\(/g, '∛(')
    .replace(/\*/g, '×')
    .replace(/\//g, '÷')
    .replace(/-/g, '−');
}

/** Tokens a backspace removes whole, so `cbrt(` does not come apart a letter at a time. */
const WHOLE = ['sqrt(', 'cbrt(', 'ln(', 'e^(', 'Ans'];

export function backspace(line: string): string {
  const whole = WHOLE.find((token) => line.endsWith(token));
  return line.slice(0, line.length - (whole ? whole.length : 1));
}

/** At most six decimal places, and no float dust. */
export function display(value: number): string {
  if (!Number.isFinite(value)) return 'Error';
  return String(Number(value.toFixed(6)));
}

export function evaluateLine(line: string, ans: number): number | undefined {
  if (line.trim() === '') return undefined;
  try {
    const value = math.evaluate(line, { Ans: ans });
    return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
  } catch {
    return undefined;
  }
}

