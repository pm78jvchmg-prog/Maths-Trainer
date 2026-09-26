import { describe, expect, it } from 'vitest';
import { alignedRows, displayLines, displayPieces } from './displayPieces';

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

describe('displayLines', () => {
  it('takes a whole-display gathered block apart into its rows', () => {
    expect(displayLines('\\begin{gathered} a = 1 \\\\ \\frac{b}{2} = \\left( 2 \\\\ 3 \\right) \\\\[4pt] c \\end{gathered}')).toEqual([
      'a = 1',
      '\\frac{b}{2} = \\left( 2 \\\\ 3 \\right)',
      'c',
    ]);
  });

  it('keeps nested environments, aligned blocks and part-display gathered whole', () => {
    expect(displayLines('\\begin{gathered} \\begin{pmatrix} 1 \\\\ 2 \\end{pmatrix} \\\\ x \\end{gathered}')).toEqual([
      '\\begin{pmatrix} 1 \\\\ 2 \\end{pmatrix}',
      'x',
    ]);
    for (const tex of [
      '\\begin{aligned} a &= 1 \\\\ b &= 2 \\end{aligned}',
      'x = \\begin{gathered} a \\\\ b \\end{gathered}',
      '\\begin{gathered} a \\end{gathered} + \\begin{gathered} b \\end{gathered}',
    ]) {
      expect(displayLines(tex)).toEqual([tex]);
    }
  });
});

describe('alignedRows', () => {
  it('splits a whole aligned block into rows at the &', () => {
    expect(alignedRows('\\begin{aligned} x^2 &= \\frac{a}{b} \\\\ &\\quad + \\begin{pmatrix} 1 \\\\ 2 \\end{pmatrix} \\\\[4pt] t &= 3 \\end{aligned}')).toEqual([
      ['x^2', '= \\frac{a}{b}'],
      ['', '\\quad + \\begin{pmatrix} 1 \\\\ 2 \\end{pmatrix}'],
      ['t', '= 3'],
    ]);
  });

  it('keeps a row with no & as all left of the alignment point', () => {
    expect(alignedRows('\\begin{aligned} a = 1 \\\\ b &= 2 \\end{aligned}')).toEqual([
      ['a = 1', ''],
      ['b', '= 2'],
    ]);
  });

  it('refuses two column pairs, and anything that is not one whole aligned block', () => {
    for (const tex of [
      '\\begin{aligned} a &= 1 & b &= 2 \\end{aligned}',
      'x = \\begin{aligned} a &= 1 \\end{aligned}',
      '\\begin{aligned} a &= 1 \\end{aligned} + \\begin{aligned} b &= 2 \\end{aligned}',
      '\\begin{gathered} a \\end{gathered}',
    ]) {
      expect(alignedRows(tex)).toBeNull();
    }
  });
});
