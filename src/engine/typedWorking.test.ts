import { describe, it, expect } from 'vitest';
import { startSession, reduce, currentSlide } from './session';
import { withWorkingKeys, asksForArithmetic, isNumber } from './typedWorking';
import { registry } from '../content/registry';
import { makeRng } from './rng';
import type { Block, Lesson, Slide } from '../content/types';

/** The question the owner sent: 6 shares, doubling daily, 4 days later. */
const shares: Slide = {
  kind: 'expression',
  prompt: [
    { kind: 'prose', text: 'A post has 6 shares on the day it goes up, and its share count doubles every day.' },
    { kind: 'prose', text: 'How many shares does it have 4 days later?' },
  ],
  lead: '\\text{shares} =',
  keypad: [],
  answer: '96',
  domain: 'real',
  mode: 'exact',
};

const lesson = (slide: Slide): Lesson => ({
  id: 'typed-working',
  title: 'Typed working',
  slides: [{ type: 'literal', slide }],
  skillCheck: [],
});

function submit(slide: Slide, answer: string) {
  const session = reduce(startSession(lesson(slide), registry, 1), { type: 'submit', answer });
  return session.feedback.kind;
}

const inserts = (slide: Slide | undefined) =>
  slide?.kind === 'expression' ? slide.keypad.map((key) => key.insert) : [];

describe('typed working', () => {
  it('offers the working keys on a typed number, and keeps the label', () => {
    const shown = currentSlide(startSession(lesson(shares), registry, 1))?.slide;
    expect(inserts(shown)).toEqual(['*', '/', '(', ')', 'sqrt(', '^']);
    expect(shown?.kind === 'expression' && shown.lead).toBe('\\text{shares} =');
  });

  it('marks the working right, as the keypad types it', () => {
    expect(submit(shares, '6*2^4')).toBe('correct');
    expect(submit(shares, '6*((2)^(4))')).toBe('correct');
    expect(submit(shares, '96')).toBe('correct');
    expect(submit(shares, '6*2^5')).toBe('incorrect');
  });

  it('marks rounded working right where a precision is stated', () => {
    const rounded: Slide = { ...shares, answer: '2.76', precision: { dp: 2 } };
    expect(submit(rounded, '1000/(9.8*37)')).toBe('correct');
  });

  it('adds no key twice, and keeps the question’s own keys first', () => {
    const own: Slide = { ...shares, keypad: [{ insert: 'pi' }, { insert: '/' }] };
    expect(inserts(withWorkingKeys(own))).toEqual(['pi', '/', '*', '(', ')', 'sqrt(', '^']);
  });

  it('never adds trig keys', () => {
    expect(inserts(withWorkingKeys(shares)).some((key) => /sin|cos|tan/.test(key))).toBe(false);
  });

  it('leaves a form question, a letter answer and a constant of integration alone', () => {
    const form: Slide = { ...shares, answer: '3.2*10^4', form: { kind: 'standardForm' } };
    expect(withWorkingKeys(form)).toBe(form);
    const letters: Slide = { ...shares, answer: '2*x + 1' };
    expect(withWorkingKeys(letters)).toBe(letters);
    const constant: Slide = { ...shares, mode: 'upToConstant' };
    expect(withWorkingKeys(constant)).toBe(constant);
  });

  it('leaves a question alone whose sum could be typed straight back', () => {
    const shown = (prompt: Block[], lead?: string) => asksForArithmetic(prompt, lead);
    expect(shown([{ kind: 'display', tex: '4348 \\times 4358 - 4345 \\times 4361' }])).toBe(true);
    expect(shown([{ kind: 'prose', text: 'What is $(5 + 5i) - (1 + 4i)$?' }])).toBe(true);
    expect(shown([{ kind: 'prose', text: 'Evaluate.' }], '8^{\\frac{2}{3}} =')).toBe(true);
    expect(shown([{ kind: 'prose', text: 'Work out 18% of 50 without a calculator.' }])).toBe(true);
    expect(
      shown([{ kind: 'display', tex: '\\begin{pmatrix} 3 & 3 \\\\ 3 & -6 \\end{pmatrix} + \\begin{pmatrix} 1 & 0 \\\\ 0 & 1 \\end{pmatrix}' }]),
    ).toBe(true);
  });

  it('still offers the keys where the numbers are values, not a sum', () => {
    const shown = (text: string) => asksForArithmetic([{ kind: 'prose', text }], '\\text{shares} =');
    expect(shown(shares.prompt.map((block) => (block.kind === 'prose' ? block.text : '')).join(' '))).toBe(false);
    expect(shown('The temperature is $-6$ and $P = \\frac{3}{4}$, with $\\sqrt{2}$ given.')).toBe(false);
    expect(shown('The cubic has the root $1 - 2i$. Find its real root.')).toBe(false);
    expect(shown('A chocolate bar is a $7 \\times 12$ grid of squares.')).toBe(false);
    expect(shown('Find $f(3)$ where $f(x) = x^{2} + 1$.')).toBe(false);
  });

  it('reads a number with pi, e or a root as a number', () => {
    expect(isNumber('3*pi')).toBe(true);
    expect(isNumber('sqrt(2) + e')).toBe(true);
    expect(isNumber('(3) + (-2)*i')).toBe(true);
    expect(isNumber('x^2')).toBe(false);
  });

  it('reaches the generated question the owner sent', () => {
    const generator = registry['grow-term'];
    const slide = generator.render(generator.sample(makeRng('typed-working'), 1) as never);
    expect(inserts(withWorkingKeys(slide))).toContain('^');
  });
});
