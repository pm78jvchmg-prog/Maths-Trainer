import { describe, expect, it } from 'vitest';
import { backspace, display, evaluateLine, shown } from './calculatorLine';

describe('calculator line', () => {
  it('runs an iteration on Ans the way a pocket calculator does', () => {
    // x_{n+1} = cbrt(6 x_n + 20) from x_0 = 4, the owner's example.
    let ans = 4;
    const rows: string[] = [];
    for (let n = 0; n < 4; n += 1) {
      ans = evaluateLine('cbrt(6*Ans+20)', ans)!;
      rows.push(ans.toFixed(2));
    }
    expect(rows).toEqual(['3.53', '3.45', '3.44', '3.44']);
  });

  it('knows ln, e and square roots, and reports nonsense as no value', () => {
    expect(evaluateLine('ln(e^(2))', 0)).toBeCloseTo(2, 12);
    expect(evaluateLine('sqrt(2)^2', 0)).toBeCloseTo(2, 12);
    expect(evaluateLine('3*(', 0)).toBeUndefined();
    expect(evaluateLine('', 0)).toBeUndefined();
    expect(evaluateLine('sqrt(-1)', 0)).toBeUndefined();
  });

  it('shows symbols and removes a function key whole', () => {
    expect(shown('cbrt(6*Ans-2)/3')).toBe('∛(6×Ans−2)÷3');
    expect(backspace('2+cbrt(')).toBe('2+');
    expect(backspace('Ans')).toBe('');
    expect(display(3.4400000000001)).toBe('3.44');
  });
});
