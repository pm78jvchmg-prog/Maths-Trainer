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

describe('calculus-shaped answers', () => {
  const real = (user: string, expected: string) =>
    checkAnswer(user, expected, { seed: SEED }).status;

  it('accepts equivalent forms of a derivative', () => {
    expect(real('6x', '3*2*x')).toBe('correct');
    expect(real('2x + 3', '3 + 2x')).toBe('correct');
    expect(real('-2/x^3', '-2x^(-3)')).toBe('correct');
    expect(real('1/(2sqrt(x))', '0.5*x^(-1/2)')).toBe('correct');
  });

  it('accepts ln as a spelling of the natural logarithm', () => {
    expect(real('ln(x)', 'log(x)')).toBe('correct');
    expect(real('1/x', 'ln(x)')).toBe('incorrect');
  });

  it('accepts trigonometric identities a learner might reach for', () => {
    expect(real('sec(x)^2', '1/cos(x)^2')).toBe('correct');
    expect(real('2sin(x)cos(x)', 'sin(2x)')).toBe('correct');
  });

  it('rejects the classic power-rule slips', () => {
    // Forgetting to decrement the exponent, and forgetting to multiply down.
    expect(real('3x^3', '3x^2')).toBe('incorrect');
    expect(real('x^2', '3x^2')).toBe('incorrect');
  });

  it('reports an unknown function as invalid rather than wrong', () => {
    const verdict = checkAnswer('tg(x)', 'tan(x)', { seed: SEED });
    expect(verdict.status).toBe('invalid');
    if (verdict.status === 'invalid') expect(verdict.message).toMatch(/no function called tg/);
  });
});

/**
 * The positive domain.
 *
 * Fractional indices are the reason it exists. `sqrt(x^3)` and `x^(3/2)` are
 * the same function for x >= 0 and every textbook writes them as equal, but
 * mathjs reads both through the principal branch, and at negative x they come
 * out different for three powers in every four. Probing the whole real line
 * therefore marks a correct answer wrong — and, worse, marks it right for the
 * other power in four, so the fault would look like flakiness rather than a
 * bug. The first two cases below are `incorrect` over `real`.
 */
describe('the positive domain', () => {
  const positive = (user: string, expected: string) =>
    check(user, expected, { domain: 'positive' });
  const real = (user: string, expected: string) => check(user, expected, { domain: 'real' });

  it('accepts a root written as a fractional index', () => {
    expect(positive('x^((3)/(2))', 'sqrt(x^3)')).toBe('correct');
    expect(positive('x^((2)/(3))', '(x^2)^(1/3)')).toBe('correct');
    expect(positive('x^((-1)/(4))', '1/(x^(1/4))')).toBe('correct');
  });

  it('is doing something the real domain cannot', () => {
    // If these ever start passing over `real`, the domain has stopped earning
    // its keep — check what changed in mathjs before deleting it.
    expect(real('x^((3)/(2))', 'sqrt(x^3)')).toBe('incorrect');
    expect(real('x^((2)/(3))', '(x^2)^(1/3)')).toBe('incorrect');
  });

  it('still rejects an index that is genuinely wrong', () => {
    expect(positive('x^((1)/(3))', 'sqrt(x)')).toBe('incorrect');
    expect(positive('x^((2)/(3))', 'x^((3)/(2))')).toBe('incorrect');
    expect(positive('x^((-3)/(2))', 'sqrt(x^3)')).toBe('incorrect');
  });

  it('is narrower than the real domain, which is why it is opt-in', () => {
    // True only for x >= 0. A question about indices wants this accepted; most
    // other questions do not, so no slide gets `positive` by default.
    expect(positive('sqrt(x^2)', 'x')).toBe('correct');
    expect(real('sqrt(x^2)', 'x')).toBe('incorrect');
  });
});

/**
 * The `=` key is on every expression keypad, and mathjs reads `x=0` as an
 * assignment rather than an equation: evaluating it writes into the scope and
 * returns the right-hand side. Both sides were probed against one shared scope
 * object, so a learner's assignment rebound the variable for the expected side
 * as well and any answer vanishing at that value was graded correct.
 */
describe('an equals sign cannot leak into the other side', () => {
  it('rejects an assignment that would make both sides agree', () => {
    expect(check('x=0', '2x')).toBe('incorrect');
    expect(check('x=0', '14x')).toBe('incorrect');
    expect(check('x=1', 'x^2')).toBe('incorrect');
    expect(check('x = 3', 'x')).toBe('incorrect');
    expect(check('x=5', 'x^3+x', { mode: 'upToConstant' })).toBe('incorrect');
  });

  it('leaves a genuinely correct answer alone', () => {
    expect(check('x=3', '3')).toBe('correct');
    expect(check('y=2x', '2x')).toBe('correct');
  });
});
