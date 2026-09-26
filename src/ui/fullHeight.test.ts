import { describe, expect, it } from 'vitest';
import { dropsTopInset, stripIsFixed } from './fullHeight';

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


describe('stripIsFixed', () => {
  it('leaves the strip to follow the body a status bar short', () => {
    expect(stripIsFixed({ ...iphone, innerHeight: 873, standalone: true })).toBe(false);
  });

  it('marks the window that stops about 69pt short', () => {
    expect(stripIsFixed({ ...iphone, innerHeight: 863, standalone: true })).toBe(true);
  });

  it('marks the window placed below the status bar', () => {
    expect(stripIsFixed({ ...iphone, innerHeight: 814, standalone: true })).toBe(true);
  });

  it('never applies in a browser tab or on a full-height window', () => {
    expect(stripIsFixed({ ...iphone, innerHeight: 739, standalone: false })).toBe(false);
    expect(stripIsFixed({ ...iphone, innerHeight: 932, standalone: true })).toBe(false);
  });
});
