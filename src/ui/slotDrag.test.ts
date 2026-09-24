import { describe, expect, it } from 'vitest';
import { moveInList, swapSlots } from './slotDrag';

describe('swapSlots', () => {
  it('exchanges two filled blanks', () => {
    expect(swapSlots(['3', '7', '9'], 0, 2)).toEqual(['9', '7', '3']);
  });

  it('moves a tile into an empty blank, leaving its old one empty', () => {
    expect(swapSlots(['3', '', '9'], 0, 1)).toEqual(['', '3', '9']);
  });
});

describe('moveInList', () => {
  it('moves a step down, closing the gap it left', () => {
    expect(moveInList(['a', 'b', 'c', 'd'], 0, 2)).toEqual(['b', 'c', 'a', 'd']);
  });

  it('moves a step up', () => {
    expect(moveInList(['a', 'b', 'c', 'd'], 3, 1)).toEqual(['a', 'd', 'b', 'c']);
  });

  it('puts a step dropped past the last one at the end', () => {
    expect(moveInList(['a', 'b', 'c'], 0, 5)).toEqual(['b', 'c', 'a']);
  });
});
