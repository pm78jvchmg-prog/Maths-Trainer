import { describe, expect, it } from 'vitest';
import { hasTopLevelRelation, isAlgebraLine, liftAlgebra, liftBlocks } from './liftAlgebra';

describe('liftAlgebra', () => {
  it('lifts the model out of the tea question the owner flagged', () => {
    const text =
      'The temperature of a cup of tea, in °C, after $t$ minutes is $T = 15 + 28e^{-\\frac{\\ln 2}{9}t}$. At $t = 18$ the power is $-2\\ln 2$.';
    expect(liftAlgebra(text)).toEqual([
      { kind: 'text', text: 'The temperature of a cup of tea, in °C, after $t$ minutes is' },
      { kind: 'maths', tex: 'T = 15 + 28e^{-\\frac{\\ln 2}{9}t}' },
      { kind: 'text', text: 'At $t = 18$ the power is $-2\\ln 2$.' },
    ]);
  });

  it('leaves values in the sentence', () => {
    for (const tex of ['t = 18', 'k = \\frac{\\ln 2}{5}', 'x \\ge 3', '\\bar{x} = 12.4', 'y = 2x', 'x \\ge -3', 'e^{kt} = 2^{3}', '-2\\ln 2', 'P(X = 3)']) {
      expect(isAlgebraLine(tex), tex).toBe(false);
    }
  });

  it('lifts equations and inequalities with something to read', () => {
    for (const tex of ['x^{2} - 5x + 6 = 0', 'T = 20 + 80e^{-kt}', '2x + 3 \\le 11', 'y = 3x^{2} + 2x']) {
      expect(isAlgebraLine(tex), tex).toBe(true);
    }
  });

  it('counts only a relation outside brackets', () => {
    expect(hasTopLevelRelation('P(X = 3) + P(X = 4)')).toBe(false);
    expect(hasTopLevelRelation('\\left\\{ x : x = 1 \\right\\} \\ne A')).toBe(true);
    expect(hasTopLevelRelation('\\le')).toBe(true);
    expect(hasTopLevelRelation('\\left(x\\right)')).toBe(false);
  });

  it('drops the punctuation that closed the sentence around a lifted line', () => {
    expect(liftAlgebra('Solve $2x + 3 = 11 - 4x$.')).toEqual([
      { kind: 'text', text: 'Solve' },
      { kind: 'maths', tex: '2x + 3 = 11 - 4x' },
    ]);
    expect(liftAlgebra('If $y = 3x^{2} + 2x$, find $y$.')).toEqual([
      { kind: 'text', text: 'If' },
      { kind: 'maths', tex: 'y = 3x^{2} + 2x' },
      { kind: 'text', text: 'find $y$.' },
    ]);
  });

  it('leaves prose with nothing to lift as it was', () => {
    const text = 'Find **the gradient** at $x = 2$, then *stop*.';
    expect(liftAlgebra(text)).toEqual([{ kind: 'text', text }]);
  });
});

describe('liftBlocks', () => {
  it('drops a display that repeats an equation lifted above it', () => {
    const items = liftBlocks([
      { kind: 'prose', text: 'The speed after $t$ seconds is modelled by $v = 60 - 57e^{-0.2t}$. Find where it settles.' },
      { kind: 'display', tex: 'v = 60 - 57e^{-0.2t}' },
      { kind: 'display', tex: 'v = 60' },
    ]);
    expect(items.map((item) => item.kind)).toEqual(['text', 'lifted', 'text', 'display']);
  });
});
