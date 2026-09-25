import { describe, expect, it } from 'vitest';
import { appLayout } from './fullHeight';

// A 430x932 iPhone with a 59pt status bar.
const iphone = { screenWidth: 430, screenHeight: 932, landscape: false };

describe('appLayout', () => {
  it('fills the screen when placed under the status bar and one status bar short', () => {
    expect(appLayout({ ...iphone, innerHeight: 873, standalone: true })).toEqual({ height: 932, dropTopInset: false });
  });

  it('gives one status bar back and drops the top inset when placed below the status bar', () => {
    expect(appLayout({ ...iphone, innerHeight: 814, standalone: true })).toEqual({ height: 873, dropTopInset: true });
  });

  it('keeps the window height in a browser tab', () => {
    expect(appLayout({ ...iphone, innerHeight: 739, standalone: false })).toEqual({ height: 739, dropTopInset: false });
  });

  it('keeps the window height when it already fills the screen', () => {
    expect(appLayout({ ...iphone, innerHeight: 932, standalone: true })).toEqual({ height: 932, dropTopInset: false });
  });

  it('ignores a gap far larger than two status bars', () => {
    expect(appLayout({ ...iphone, innerHeight: 500, standalone: true })).toEqual({ height: 500, dropTopInset: false });
  });
});
