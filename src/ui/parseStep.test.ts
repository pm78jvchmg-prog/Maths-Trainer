import { describe, expect, it } from 'vitest';
import { parseStep, stepToken } from './workingSlides';

describe('parseStep', () => {
  it('reads a leading span', () => {
    expect(parseStep('2-5|12')).toEqual({ span: [2, 5], value: '12' });
  });

  it('keeps the bars of a modulus in the value', () => {
    expect(parseStep('\\ln|y| = 2x + C')).toEqual({ value: '\\ln|y| = 2x + C' });
    expect(parseStep(stepToken([0, 3], '\\ln|y|'))).toEqual({ span: [0, 3], value: '\\ln|y|' });
  });
});
