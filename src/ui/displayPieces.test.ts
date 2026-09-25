import { describe, expect, it } from 'vitest';
import { displayPieces } from './displayPieces';

describe('displayPieces', () => {
  it('splits a display at each top-level \\qquad', () => {
    expect(displayPieces('(a + bi)^2 = a^2 - b^2 + 2ab\\,i \\qquad a^2 - b^2 = 3,\\ 2ab = 4')).toEqual([
      '(a + bi)^2 = a^2 - b^2 + 2ab\\,i',
      'a^2 - b^2 = 3,\\ 2ab = 4',
    ]);
  });

  it('leaves \\quad, braces, \\left...\\right and environments whole', () => {
    for (const tex of [
      '\\text{Left} \\quad \\square \\quad \\text{Right}',
      '\\text{a \\qquad b}',
      '\\left( x \\qquad y \\right)',
      '\\begin{aligned} a &= 1 \\qquad b = 2 \\end{aligned}',
      'x^2',
    ]) {
      expect(displayPieces(tex)).toEqual([tex]);
    }
  });

  it('does not read \\qquadx or \\\\ as a separator', () => {
    expect(displayPieces('a \\\\ \\qquad b')).toEqual(['a \\\\', 'b']);
  });
});
