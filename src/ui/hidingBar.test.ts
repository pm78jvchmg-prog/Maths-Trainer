import { describe, expect, it } from 'vitest';
import { HIDE_THRESHOLD, nextHidden } from './hidingBar';

const reading = (from: number, y: number) => ({ from, y, max: 2000, reveal: 48 });

describe('nextHidden', () => {
  it('hides on scrolling down and shows on scrolling up', () => {
    expect(nextHidden(reading(200, 260))).toBe(true);
    expect(nextHidden(reading(260, 200))).toBe(false);
  });

  it('keeps the bar near the top whatever the direction', () => {
    expect(nextHidden(reading(0, 40))).toBe(false);
    expect(nextHidden(reading(40, 48))).toBe(false);
  });

  it('ignores movement smaller than the threshold', () => {
    expect(nextHidden(reading(300, 300 + HIDE_THRESHOLD - 1))).toBeNull();
    expect(nextHidden(reading(300, 300 - HIDE_THRESHOLD + 1))).toBeNull();
  });

  it('does not read a bounce past the bottom as scrolling up', () => {
    // Rubber-banding past the end reports positions beyond `max` and then
    // settles back; clamped, the settle is no movement at all.
    expect(nextHidden({ from: 2060, y: 2000, max: 2000, reveal: 48 })).toBeNull();
  });
});
