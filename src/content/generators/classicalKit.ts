/**
 * Shared pieces for the Classical Mechanics generators (`classical*.ts`).
 *
 * Kept apart from `forces.ts` and `kinematics.ts`, whose helpers are mostly
 * file-local, so the course's levels can be written in files of their own
 * without reaching into either. Nothing here is a generator: this file exports
 * no array ending in `Generators`, so the registry passes over it.
 *
 * The same rules as Forces hold: every answer is an exact decimal, never a
 * rounded one, and a draw that would not be is refused at sampling through
 * `until`, never rounded. Units live in the prose, never in an answer.
 */
import type { Block, ChoiceOption, KeypadKey, Slide } from '../types';
import { options } from '../choiceVariant';
import { fmt } from './numericalMethods';
import { steered } from './parametricImplicit';
import { say } from './format';
import { WORKING_KEYS } from './workingKeys';
import { exact, valueBank } from './forces';

export { fmt, say, exact, valueBank };

/** g, in m s^-2. Stated in every question that uses it. */
export const G = 9.8;
export const G_NOTE = 'Take $g = 9.8\\text{ m s}^{-2}$.';

export const MS = '\\text{ m s}^{-1}';
export const MS2 = '\\text{ m s}^{-2}';
export const KMH = '\\text{ km h}^{-1}';

/** Quantities in prose, each one inline maths with its unit. */
export const ms = (v: number): string => `$${fmt(v)}${MS}$`;
export const ms2 = (v: number): string => `$${fmt(v)}${MS2}$`;
export const kmh = (v: number): string => `$${fmt(v)}${KMH}$`;
export const metres = (v: number): string => `$${fmt(v)}\\text{ m}$`;
export const secs = (v: number): string => `$${fmt(v)}\\text{ s}$`;
export const kg = (v: number): string => `$${fmt(v)}\\text{ kg}$`;
export const newtons = (v: number): string => `$${fmt(v)}\\text{ N}$`;

export const show = (tex: string): Block => ({ kind: 'display', tex });
export const picture = (svg: string): Block => ({ kind: 'diagram', svg });

/** The same draw again until it passes. */
export function until<T>(draw: () => T, ok: (value: T) => boolean): T {
  for (let i = 0; i < 20_000; i += 1) {
    const value = draw();
    if (ok(value)) return value;
  }
  throw new Error('classical mechanics: no draw passed its filter');
}

/** A typed number, with the working keys so the calculation can be typed instead. */
export function typed(prompt: Block[], lead: string, value: number, keypad: KeypadKey[] = WORKING_KEYS): Slide {
  return { kind: 'expression', prompt, lead, keypad, answer: fmt(value), domain: 'real', mode: 'exact' };
}

/**
 * Options for a numeric answer: the slips given, then near misses. A slip
 * that is not an exact decimal is dropped, and a negative near miss is never
 * offered for a quantity that cannot be negative.
 */
export function numChoices(correct: number, wrong: number[], salt: number): ChoiceOption[] {
  const seen = new Set([fmt(correct)]);
  // An answer with four places would never meet a near miss of three, so they step finer for it.
  const places = [0, 1, 2, 3, 4].find((dp) => exact(correct, dp)) ?? 4;
  const ok = (v: number) => Number.isFinite(v) && exact(v, Math.max(3, places)) && !seen.has(fmt(v)) && (correct <= 0 || v > 0);
  const picked: number[] = [];
  for (const v of wrong) {
    if (picked.length === 3 || !ok(v)) continue;
    seen.add(fmt(v));
    picked.push(v);
  }
  const unit = places === 0 ? 1 : places <= 3 ? 0.1 : 0.001;
  const spare: number[] = [];
  for (let step = 1; picked.length + spare.length < 7 && step < 1000; step += 1) {
    for (const v of [correct + step * unit, correct - step * unit]) {
      if (!ok(v)) continue;
      seen.add(fmt(v));
      if (picked.length < 3) picked.push(v);
      else spare.push(v);
    }
  }
  const as = (v: number) => ({ tex: fmt(v), answer: fmt(v) });
  return steered(options(as(correct), ...picked.map(as)), salt, spare.map(as));
}

/**
 * Three values for a fork of a flow: the right one and two slips, distinct,
 * positive and exact, topped up with near misses and sorted, so the order
 * says nothing.
 */
export function forks(right: number, wrong: number[], unit = 1): string[] {
  const out = [fmt(right)];
  const add = (v: number) => {
    if (out.length < 3 && Number.isFinite(v) && v > 0 && exact(v, 3) && !out.includes(fmt(v))) out.push(fmt(v));
  };
  wrong.forEach(add);
  for (let k = 1; out.length < 3 && k < 1000; k += 1) {
    add(right + k * unit);
    add(right - k * unit);
  }
  return out.sort((x, y) => Number(x) - Number(y)).map((v) => `$${v}$`);
}

/** A stable small hash of some numbers, for steering where a right option lands. */
export function salted(...values: number[]): number {
  let hash = 17;
  for (const v of values) hash = (hash * 31 + Math.round(v * 1000)) | 0;
  return Math.abs(hash);
}

/**
 * A horizontal track with labelled points, drawn to scale, for a slider whose
 * marker runs along it. Returns the span the whole drawing covers, which the
 * slider's figure declares so its marker lines up with the ticks.
 */
export function track(
  min: number,
  max: number,
  points: { at: number; name: string }[],
  label: string,
): { svg: string; xMin: number; xMax: number } {
  const W = 280;
  const H = 70;
  const PAD = 14;
  const x = (v: number) => PAD + ((v - min) / (max - min)) * (W - 2 * PAD);
  const ticks: string[] = [];
  const step = niceStep(max - min);
  for (let v = Math.ceil(min / step) * step; v <= max + 1e-9; v += step) {
    ticks.push(
      `<line x1="${x(v).toFixed(1)}" y1="40" x2="${x(v).toFixed(1)}" y2="46" stroke="currentColor" stroke-width="1" opacity="0.5"/>` +
        `<text x="${x(v).toFixed(1)}" y="60" font-size="10" text-anchor="middle" fill="currentColor" opacity="0.7">${fmt(v)}</text>`,
    );
  }
  const dots = points
    .map(
      (p) =>
        `<circle cx="${x(p.at).toFixed(1)}" cy="40" r="5" class="plot-accent" fill="currentColor"/>` +
        `<text x="${x(p.at).toFixed(1)}" y="26" font-size="12" font-weight="600" text-anchor="middle" fill="currentColor">${p.name}</text>`,
    )
    .join('');
  const over = (PAD * (max - min)) / (W - 2 * PAD);
  return {
    svg:
      `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${label}">` +
      `<line x1="${PAD}" y1="40" x2="${W - PAD}" y2="40" stroke="currentColor" stroke-width="2"/>` +
      ticks.join('') +
      dots +
      `</svg>`,
    xMin: min - over,
    xMax: max + over,
  };
}

/** A tick spacing giving at most ten ticks across a span. */
function niceStep(span: number): number {
  for (const s of [1, 2, 5, 10, 20, 25, 50, 100, 200, 250, 500, 1000]) if (span / s <= 10) return s;
  return 2000;
}
