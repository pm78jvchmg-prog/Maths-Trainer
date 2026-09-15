import { describe, expect, it } from 'vitest';
import { bin, num, pow, renderExpr, toTex } from './expr';

/**
 * `-3^{2}` is minus three squared, which is -9. The square of -3 is 9, so a
 * negative base has to be bracketed wherever it is written.
 */
describe('a negative base is bracketed', () => {
  it('brackets it in toTex', () => {
    const tex = toTex(pow(num(-3), num(2)));
    expect(tex, `got ${tex}`).toMatch(/\(\s*-3\s*\)|\\left\(\s*-3\s*\\right\)/);
    expect(tex.startsWith('-3^')).toBe(false);
  });

  it('brackets it in a rendered line too', () => {
    const line = renderExpr(bin('+', pow(num(-4), num(2)), num(5)))
      .map((f) => f.tex)
      .join('');
    expect(line, `got ${line}`).not.toMatch(/(^|[+\-×\\times\s])-4\^/);
  });

  it('leaves a positive base unbracketed', () => {
    expect(toTex(pow(num(3), num(2)))).toBe('3^{2}');
  });
});
