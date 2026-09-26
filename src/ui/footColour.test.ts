import { describe, expect, it } from 'vitest';
import { bandColour } from './footColour';

// Expected values are the pixels Chromium drew at the foot of the window
// for the same band and offset, read back from a screenshot.
describe('bandColour', () => {
  it('matches the flat maths blue over the page, shaded', () => {
    expect(bandColour('maths', 100, 4000)).toBe('rgb(36 40 111)');
  });

  it('ends the maths run on the opaque purple the applied run opens on', () => {
    expect(bandColour('maths', 4000, 4000)).toBe(bandColour('applied', 0, 1500));
  });

  it('ends the applied run on the brown at the foot of the list', () => {
    expect(bandColour('applied', 1500, 1500)).toBe('rgb(76 37 38)');
  });

  it('darkens by the fade over the foot of the list', () => {
    expect(bandColour('applied', 1500, 1500, 0.14)).toBe('rgb(65 32 32)');
  });

  it('falls back to the page colour for anything that is not a band', () => {
    expect(bandColour('other', 0, 100)).toBe('rgb(30 33 84)');
  });
});
