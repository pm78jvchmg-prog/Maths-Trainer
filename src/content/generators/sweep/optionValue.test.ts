/**
 * The label reader behind the sweep's same-value check. It must read the
 * shapes choice options are written in, and decline anything that is not
 * plainly a value: a label it misreads is a false alarm at best, and a
 * question it wrongly waves through at worst.
 */
import { describe, expect, it } from 'vitest';
import { equalPairs, labelToMath, slideValues } from './optionValue';

describe('labelToMath', () => {
  it.each([
    ['\\frac{\\ln\\left(8\\right)}{\\ln\\left(3\\right)}'],
    ['2\\sqrt{3} - \\frac{1}{2}x^{2}'],
    ['\\left(x + 5\\right)\\left(3x - 1\\right)'],
    ['610\\,000'],
    ['-3 + 2i'],
    ['\\sqrt[3]{x} \\times \\pi'],
  ])('reads %s', (tex) => {
    expect(labelToMath(tex)).toBeDefined();
  });

  it.each([
    ['P(Type I) rises'],
    ['y = f(2x)'],
    ['\\frac{dA}{dt}'],
    ['x \\le 3'],
    ['2\\mathbf{i} + 3\\mathbf{j}'],
    ['30^{\\circ}'],
    ['\\text{never}'],
    ['a_{3}'],
    ['\\sin x'],
  ])('declines %s', (tex) => {
    expect(labelToMath(tex)).toBeUndefined();
  });
});

describe('slideValues and equalPairs', () => {
  it('compares the right-hand sides when every option opens with the same letter', () => {
    const values = slideValues(['x = 3', 'x = \\frac{6}{2}', 'x = -3']);
    expect(values).toBeDefined();
    expect(equalPairs(values!, 1)).toEqual([[0, 1]]);
  });

  it('finds equal expressions written differently, and only those', () => {
    const values = slideValues(['x^{2} - 1', '(x - 1)(x + 1)', 'x^{2} + 1', '\\frac{2}{2x}', '\\frac{1}{x}']);
    expect(equalPairs(values!, 1)).toEqual([
      [0, 1],
      [3, 4],
    ]);
  });

  it('gives up on the whole slide when one label cannot be read', () => {
    expect(slideValues(['3', '4', '\\text{neither}'])).toBeUndefined();
  });
});
