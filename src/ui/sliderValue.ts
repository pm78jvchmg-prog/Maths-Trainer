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
 * It is also a marking bug, not only a cosmetic one. The session seeds the
 * answer with this value so an untouched handle is not read as an empty
 * answer, and a slider grades within half a step of its answer. Half-way
 * between two steps is therefore within tolerance of *both* of them, so an
 * untouched slider was marked correct for either — and on the lattice it can
 * only ever be correct for the one value it is actually sitting on.
 */
export function defaultSliderValue(min: number, max: number, step: number): number {
  if (!(step > 0)) return (min + max) / 2;
  return min + Math.round((max - min) / 2 / step) * step;
}
