import { describe, expect, it } from 'vitest';
import { appHeight } from './fullHeight';

const iphone = { screenWidth: 430, screenHeight: 932, landscape: false };

describe('appHeight', () => {
  it('fills the whole screen when installed and one status bar short', () => {
    expect(appHeight({ ...iphone, innerHeight: 873, standalone: true })).toBe(932);
  });

  it('keeps the window height in a browser tab', () => {
    expect(appHeight({ ...iphone, innerHeight: 739, standalone: false })).toBe(739);
  });

  it('keeps the window height when it already fills the screen', () => {
    expect(appHeight({ ...iphone, innerHeight: 932, standalone: true })).toBe(932);
  });

  it('ignores a gap far larger than a status bar', () => {
    expect(appHeight({ ...iphone, innerHeight: 500, standalone: true })).toBe(500);
  });

  it('uses the short side of the screen when held sideways', () => {
    expect(appHeight({ ...iphone, landscape: true, innerHeight: 400, standalone: true })).toBe(430);
  });
});
