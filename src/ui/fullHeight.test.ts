import { describe, expect, it } from 'vitest';
import { dropsTopInset } from './fullHeight';

// A 430x932 iPhone with a 59pt status bar.
const iphone = { screenWidth: 430, screenHeight: 932, landscape: false };

describe('dropsTopInset', () => {
  it('keeps the inset when placed under the status bar and one status bar short', () => {
    expect(dropsTopInset({ ...iphone, innerHeight: 873, standalone: true })).toBe(false);
  });

  it('drops the inset when placed below the status bar', () => {
    expect(dropsTopInset({ ...iphone, innerHeight: 814, standalone: true })).toBe(true);
  });

  it('keeps the inset in a browser tab', () => {
    expect(dropsTopInset({ ...iphone, innerHeight: 739, standalone: false })).toBe(false);
  });

  it('keeps the inset when the window fills the screen', () => {
    expect(dropsTopInset({ ...iphone, innerHeight: 932, standalone: true })).toBe(false);
  });

  it('ignores a gap far larger than two status bars', () => {
    expect(dropsTopInset({ ...iphone, innerHeight: 500, standalone: true })).toBe(false);
  });
});

