import { describe, expect, it } from 'vitest';
import { appHeight } from './fullHeight';

// A 430x932 iPhone with a 59pt status bar.
const iphone = { screenWidth: 430, screenHeight: 932, landscape: false };

describe('appHeight', () => {
  it('gives back the second status bar the installed app is short by', () => {
    // Below the status bar the page has 873pt, and iOS reports 814.
    expect(appHeight({ ...iphone, innerHeight: 814, standalone: true })).toBe(873);
  });

  it('keeps a window short by one status bar, which is already the visible screen', () => {
    expect(appHeight({ ...iphone, innerHeight: 873, standalone: true })).toBe(873);
  });

  it('keeps the window height in a browser tab', () => {
    expect(appHeight({ ...iphone, innerHeight: 739, standalone: false })).toBe(739);
  });

  it('keeps the window height when it already fills the screen', () => {
    expect(appHeight({ ...iphone, innerHeight: 932, standalone: true })).toBe(932);
  });

  it('ignores a gap far larger than two status bars', () => {
    expect(appHeight({ ...iphone, innerHeight: 500, standalone: true })).toBe(500);
  });
});
