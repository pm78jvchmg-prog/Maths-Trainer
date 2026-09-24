import { describe, expect, it } from 'vitest';
import { packPages } from './solutionPages';

describe('packPages', () => {
  it('keeps a short solution on one page', () => {
    expect(packPages([40, 40, 40], 240)).toEqual([[0, 1, 2]]);
  });

  it('starts a new page when the next step would not fit, keeping the order', () => {
    expect(packPages([100, 100, 100, 100], 240)).toEqual([[0, 1], [2, 3]]);
  });

  it('gives a step taller than a page a page to itself', () => {
    expect(packPages([50, 400, 50], 240)).toEqual([[0], [1], [2]]);
  });

  it('never returns an empty page', () => {
    expect(packPages([], 240)).toEqual([]);
  });
});
