import { describe, expect, it } from 'vitest';
import { PEEK_THRESHOLD, peekIntent, peekOffset } from './peekDrag';

describe('peekIntent', () => {
  it('waits until the finger has moved far enough to tell', () => {
    expect(peekIntent(PEEK_THRESHOLD - 1, 0)).toBe('wait');
    expect(peekIntent(3, 3)).toBe('wait');
  });

  it('peeks on a rightward drag that is plainly sideways', () => {
    expect(peekIntent(PEEK_THRESHOLD, 0)).toBe('peek');
    expect(peekIntent(20, 10)).toBe('peek');
    expect(peekIntent(20, -10)).toBe('peek');
  });

  it('leaves a scroll, a diagonal and a leftward drag alone', () => {
    expect(peekIntent(0, 20)).toBe('ignore');
    expect(peekIntent(20, 11)).toBe('ignore');
    expect(peekIntent(-20, 0)).toBe('ignore');
  });
});

describe('peekOffset', () => {
  it('follows the finger between nothing and one whole slide', () => {
    expect(peekOffset(120, 393)).toBe(120);
    expect(peekOffset(-40, 393)).toBe(0);
    expect(peekOffset(600, 393)).toBe(393);
  });
});
