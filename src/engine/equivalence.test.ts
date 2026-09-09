import { describe, it, expect } from 'vitest';
import { checkAnswer, probePolicy, type CheckOptions } from './equivalence';
import { makeRng, hashSeed } from './rng';

/** Fixed seed everywhere so a failure is always reproducible. */
const SEED = 20260909;
const check = (user: string, expected: string, opts: CheckOptions = {}) =>
  checkAnswer(user, expected, { seed: SEED, ...opts }).status;

describe('probePolicy', () => {
  it('returns values inside a defensible band', () => {
    const p = probePolicy();
    expect(p.sampleCount).toBeGreaterThanOrEqual(8);
    expect(p.minValidPoints).toBeGreaterThanOrEqual(2);
    expect(p.minValidPoints).toBeLessThanOrEqual(p.sampleCount);
    // At or below 0.5 you would accept |x| as equal to x.
    expect(p.agreementThreshold).toBeGreaterThan(0.5);
    expect(p.agreementThreshold).toBeLessThanOrEqual(1);
    expect(p.relativeTolerance).toBeGreaterThan(0);
    expect(p.relativeTolerance).toBeLessThan(1e-3);
  });
});

describe('rearrangement and equivalent forms', () => {
  const equivalent: Array<[string, string]> = [
    ['2x+3', '3+2x'],
    ['x*2', '2x'],
    ['(x+1)^2', 'x^2+2x+1'],
    ['sin(x)^2+cos(x)^2', '1'],
    ['(x^2-1)/(x-1)', 'x+1'],
    ['2(x+y)', '2x+2y'],
  ];
  it.each(equivalent)('accepts %s as %s', (a, b) => {
    expect(check(a, b)).toBe('correct');
  });

  const different: Array<[string, string]> = [
    ['2x+3', '2x-3'],
    ['x^2', 'x^3'],
    ['sin(x)', 'cos(x)'],
    ['x+1', 'x+1.01'],
  ];
  it.each(different)('rejects %s as %s', (a, b) => {
    expect(check(a, b)).toBe('incorrect');
  });
});

describe('the |x| trap', () => {
  // abs(x) and x agree at roughly half of all real points. A checker with a
  // permissive agreement threshold would wrongly accept this.
  it('rejects abs(x) as equal to x', () => {
    expect(check('abs(x)', 'x')).toBe('incorrect');
  });
  it('rejects x^2 as equal to x*abs(x)', () => {
    expect(check('x^2', 'x*abs(x)')).toBe('incorrect');
  });
});

describe('complex arithmetic', () => {
  const cx: CheckOptions = { domain: 'complex' };
  it('evaluates constant complex expressions', () => {
    expect(check('10i', '3i+7i', cx)).toBe('correct');
    expect(check('-3', '4i^2-i^2', cx)).toBe('correct');
    expect(check('-2', 'i^2+i^2', cx)).toBe('correct');
    expect(check('5+i', '(2+3i)*(1-i)', cx)).toBe('correct');
  });
  it('rejects a wrong sign on the imaginary part', () => {
    expect(check('5-i', '(2+3i)*(1-i)', cx)).toBe('incorrect');
    expect(check('3i', '-3i', cx)).toBe('incorrect');
  });
  it('handles conjugates and modulus symbolically', () => {
    expect(check('z*conj(z)', 'abs(z)^2', cx)).toBe('correct');
    expect(check('z+conj(z)', '2*re(z)', cx)).toBe('correct');
  });
  it('accepts an identity that holds across the whole principal branch', () => {
    expect(check('exp(log(z))', 'z', cx)).toBe('correct');
    expect(check('z^2', 'z*z', cx)).toBe('correct');
  });
  it('rejects an identity that only holds off the principal branch', () => {
    // log(z^2) and 2log(z) differ by 2*pi*i over roughly half the plane: as
    // principal-branch functions they are genuinely different, and a complex
    // numbers course should mark that difference rather than paper over it.
    expect(check('log(z*z)', '2*log(z)', cx)).toBe('incorrect');
    // Likewise sqrt(z^2) is z only where Re(z) > 0.
    expect(check('sqrt(z^2)', 'z', cx)).toBe('incorrect');
  });
});

describe('indefinite integrals, up to a constant', () => {
  const mode: CheckOptions = { mode: 'upToConstant' };
  it('accepts an antiderivative with or without + C', () => {
    expect(check('x^2/2', 'x^2/2 + C', mode)).toBe('correct');
    expect(check('x^2/2 + C', 'x^2/2', mode)).toBe('correct');
    expect(check('x^2/2 + 7', 'x^2/2', mode)).toBe('correct');
  });
  it('accepts an equivalent form differing by a constant', () => {
    // Both differentiate to 2sin(x)cos(x); they differ by a constant.
    expect(check('sin(x)^2', '-cos(x)^2', mode)).toBe('correct');
  });
  it('still rejects a genuinely wrong antiderivative', () => {
    expect(check('x^3/3', 'x^2/2', mode)).toBe('incorrect');
    expect(check('x^2', 'x^2/2', mode)).toBe('incorrect');
  });
  it('does not accept a stray constant in exact mode', () => {
    expect(check('x^2/2 + 7', 'x^2/2')).toBe('incorrect');
  });
});

describe('malformed input is distinguished from a wrong answer', () => {
  it.each(['', '   ', '2x+', '((x+1)', '*3'])('reports %p as invalid', (input) => {
    const verdict = checkAnswer(input, 'x', { seed: SEED });
    expect(verdict.status).toBe('invalid');
    if (verdict.status === 'invalid') expect(verdict.message).toBeTruthy();
  });

  it('throws when our own content has a broken expected answer', () => {
    expect(() => checkAnswer('x', 'x +', { seed: SEED })).toThrow(/content/i);
  });
});

describe('determinism', () => {
  it('gives the same verdict for the same seed', () => {
    const once = checkAnswer('(x+1)^2', 'x^2+2x+1', { seed: 'abc' });
    const twice = checkAnswer('(x+1)^2', 'x^2+2x+1', { seed: 'abc' });
    expect(once).toEqual(twice);
  });
});

describe('rng', () => {
  it('reproduces a sequence from the same seed', () => {
    const a = makeRng(42);
    const b = makeRng(42);
    expect([a.next(), a.next(), a.next()]).toEqual([b.next(), b.next(), b.next()]);
  });
  it('diverges for different seeds', () => {
    expect(makeRng(1).next()).not.toEqual(makeRng(2).next());
  });
  it('hashes strings to stable seeds', () => {
    expect(hashSeed('lesson-1:3')).toBe(hashSeed('lesson-1:3'));
    expect(hashSeed('lesson-1:3')).not.toBe(hashSeed('lesson-1:4'));
  });
  it('respects int bounds', () => {
    const rng = makeRng('bounds');
    for (let n = 0; n < 500; n++) {
      const v = rng.int(2, 5);
      expect(v).toBeGreaterThanOrEqual(2);
      expect(v).toBeLessThanOrEqual(5);
      expect(Number.isInteger(v)).toBe(true);
    }
  });
  it('shuffles without mutating the input', () => {
    const source = [1, 2, 3, 4, 5];
    const out = makeRng('sh').shuffle(source);
    expect(source).toEqual([1, 2, 3, 4, 5]);
    expect([...out].sort()).toEqual(source);
  });
});
