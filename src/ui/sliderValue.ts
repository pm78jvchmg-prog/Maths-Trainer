/**
 * Where a slider's handle sits before the learner has touched it.
 *
 * The middle of the track, but snapped to the step lattice, which is not the
 * same thing when the range is an odd number of steps wide. A slider running
 * -3 to 4 in steps of 1 has its midpoint at 0.5, and the readout above the
 * track then shows a value the input itself cannot produce: dragging away and
 * back can never return to it, and on an `argument-turns` question it printed
 * "0.5 x pi/4", which is not an angle. Every slider shipped before this had a
 * symmetric range and so landed on the lattice by luck.
 *
 * It was a marking bug too, while the widget seeded this value as the answer:
 * a slider grades within half a step, so half-way between two steps was
 * within tolerance of *both*. The value is no longer seeded at all — an
 * untouched handle leaves the draft empty, since wherever it rests is some
 * question's answer — so this now decides only where the handle is drawn and
 * what the readout says before the learner moves it.
 */
export function defaultSliderValue(min: number, max: number, step: number): number {
  if (!(step > 0)) return (min + max) / 2;
  // Rounded to the places the step and the start are written to, or a step
  // of 0.14 lands on 10.780000000000001 and the readout prints every digit.
  return roundTo(min + Math.round((max - min) / 2 / step) * step, Math.max(places(step), places(min)));
}

/** How many decimal places a number is written to: 0.14 is 2, 5 is 0. */
function places(n: number): number {
  const written = String(n);
  if (written.includes('e')) return 10;
  const dot = written.indexOf('.');
  return dot === -1 ? 0 : written.length - dot - 1;
}

function roundTo(n: number, dp: number): number {
  return Number(n.toFixed(Math.min(dp, 10)));
}
