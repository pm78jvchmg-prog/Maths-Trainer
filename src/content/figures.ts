/**
 * Drawing a function on axes.
 *
 * Five courses teach about a picture — a parabola's line of symmetry, a wave's
 * period, the area under a curve, the gradient of a tangent, a point on the
 * plane — and until now four of them only described one. This draws it.
 *
 * Inline SVG rather than a charting library, for the same reason `plane.ts`
 * does it by hand: these are a curve, an axis and a couple of marks, and a
 * chart dependency would cost more than the rest of the bundle. The app has to
 * work with no network at all, so every byte is precached.
 *
 * Colours come from `currentColor` and the stylesheet, so a figure follows the
 * app's theme instead of carrying its own.
 *
 * The vertical window is the part worth understanding. Fitting a curve to
 * whatever it does across the whole x range sounds right and is usually wrong:
 * y = x^2 - 6x + 4 reaches 59 at x = -5, so fitting that squashes the vertex —
 * the one feature the question is about — flat against the bottom edge. So a
 * caller may name the y window it cares about and let the rest run off the top;
 * the viewBox clips it, and a curve leaving the picture still reads as a curve.
 */

/** One plotted function. */
export interface Curve {
  f: (x: number) => number;
  /** Drawn faint and dashed — a midline, an asymptote, a comparison. */
  dashed?: boolean;
  /** Drawn in the accent colour rather than in the text colour. */
  accent?: boolean;
  /**
   * Lift the pen at an asymptote.
   *
   * A curve is otherwise one path through every sample, so `tan x` drawn
   * across $x = 90^{\circ}$ gets a near-vertical stroke joining $+\infty$ to
   * $-\infty$ — a line the function never draws. With this set, the path
   * breaks wherever one sample and the next sit on opposite sides of the
   * window's middle and further apart than the window is tall, and at any
   * sample with no value; points far off the window are also pulled in to
   * just past its edge, which keeps the numbers in the SVG sane.
   */
  breaks?: boolean;
}

/** A ringed point: a root, an intercept, a turning point. */
export interface Mark {
  x: number;
  y: number;
  /** Drawn hollow, for a point that is excluded or merely indicated. */
  hollow?: boolean;
}

/** A vertical line: a line of symmetry, a limit of integration, a period. */
export interface Vertical {
  x: number;
  dashed?: boolean;
}

export interface PlotOptions {
  xMin: number;
  xMax: number;
  /**
   * The vertical window. Computed from the sampled curves when omitted, which
   * is right for a wave and wrong for anything with a distant arm — see the
   * note at the top of this file.
   */
  yMin?: number;
  yMax?: number;
  curves: Curve[];
  marks?: Mark[];
  verticals?: Vertical[];
  /** A horizontal line other than the axis — a midline, a limit. */
  horizontals?: number[];
  /** Shade the region between a curve and the axis, for an integral. */
  shade?: { f: (x: number) => number; from: number; to: number };
  /** Overall shape. Wider than tall reads better on a phone. */
  height?: number;
  /** What a screen reader is told the picture shows. */
  label: string;
}

const WIDTH = 280;
const PAD = 12;
const SAMPLES = 160;

/**
 * The span a slider's marker should declare, so that it lines up with the
 * figure it is drawn over.
 *
 * `plotSvg` insets its drawing by `PAD` at every edge, while the marker is
 * positioned as a percentage of the whole figure box. Declaring the plot's own
 * window therefore puts the marker `PAD` out at the ends — a vertical slider
 * dragged to its minimum draws the line *below the picture entirely*, which is
 * how this was found. Widening the declared span by exactly that inset makes
 * the two agree at every value, not only in the middle where the error happens
 * to vanish.
 */
export function markerWindow(
  min: number,
  max: number,
  axis: 'x' | 'y' = 'x',
  height = 150,
): { xMin: number; xMax: number } {
  const extent = axis === 'y' ? height : WIDTH;
  const overhang = (PAD * (max - min)) / (extent - 2 * PAD);
  return { xMin: min - overhang, xMax: max + overhang };
}

/**
 * A y window that keeps the interesting part visible.
 *
 * Takes the extremes of every sampled curve, but never lets the window grow so
 * far that a feature near y = 0 becomes a flat line: the span is capped at four
 * times the distance from zero to the nearest extreme, which is enough to show
 * a curve's shape without letting one runaway arm set the scale.
 */
function autoWindow(values: number[]): { lo: number; hi: number } {
  const finite = values.filter((v) => Number.isFinite(v));
  if (finite.length === 0) return { lo: -1, hi: 1 };
  const lo = Math.min(0, ...finite);
  const hi = Math.max(0, ...finite);
  const span = hi - lo || 1;
  return { lo: lo - span * 0.08, hi: hi + span * 0.08 };
}

export function plotSvg(options: PlotOptions): string {
  const {
    xMin,
    xMax,
    curves,
    marks = [],
    verticals = [],
    horizontals = [],
    shade,
    height = 150,
    label,
  } = options;

  const sampled = curves.flatMap((curve) =>
    Array.from({ length: SAMPLES + 1 }, (_, i) => curve.f(xMin + ((xMax - xMin) * i) / SAMPLES)),
  );
  const auto = autoWindow([...sampled, ...horizontals]);
  const lo = options.yMin ?? auto.lo;
  const hi = options.yMax ?? auto.hi;
  const span = hi - lo || 1;

  const px = (x: number) => PAD + ((x - xMin) / (xMax - xMin)) * (WIDTH - PAD * 2);
  const py = (y: number) => PAD + ((hi - y) / span) * (height - PAD * 2);

  const path = (f: (x: number) => number, from = xMin, to = xMax) =>
    Array.from({ length: SAMPLES + 1 }, (_, i) => {
      const x = from + ((to - from) * i) / SAMPLES;
      return `${px(x).toFixed(1)},${py(f(x)).toFixed(1)}`;
    }).join(' L ');

  const parts = [
    `<svg viewBox="0 0 ${WIDTH} ${height}" width="100%" role="img" aria-label="${label}">`,
  ];

  // The shaded region goes down first so the curve and axis draw over its edge.
  if (shade) {
    const top = path(shade.f, shade.from, shade.to);
    parts.push(
      `<path class="plot-shade" d="M ${px(shade.from).toFixed(1)},${py(0).toFixed(1)} L ${top} L ${px(shade.to).toFixed(1)},${py(0).toFixed(1)} Z" />`,
    );
  }

  // The x-axis, and y = 0 is always where it sits.
  parts.push(
    `<line x1="${PAD}" y1="${py(0).toFixed(1)}" x2="${WIDTH - PAD}" y2="${py(0).toFixed(1)}" stroke="currentColor" stroke-width="1" opacity="0.55" />`,
  );

  for (const y of horizontals) {
    parts.push(
      `<line x1="${PAD}" y1="${py(y).toFixed(1)}" x2="${WIDTH - PAD}" y2="${py(y).toFixed(1)}" stroke="currentColor" stroke-width="1" stroke-dasharray="4 4" opacity="0.45" />`,
    );
  }

  for (const vertical of verticals) {
    const dash = vertical.dashed === false ? '' : ' stroke-dasharray="4 4"';
    parts.push(
      `<line x1="${px(vertical.x).toFixed(1)}" y1="${PAD}" x2="${px(vertical.x).toFixed(1)}" y2="${height - PAD}" stroke="currentColor" stroke-width="1"${dash} opacity="0.7" />`,
    );
  }

  /** A path that lifts the pen at each asymptote; see `Curve.breaks`. */
  const brokenPath = (f: (x: number) => number) => {
    const middle = (hi + lo) / 2;
    const clamp = (y: number) => Math.min(hi + span, Math.max(lo - span, y));
    const pieces: string[] = [];
    let previous: number | undefined;
    for (let i = 0; i <= SAMPLES; i += 1) {
      const x = xMin + ((xMax - xMin) * i) / SAMPLES;
      const y = f(x);
      if (!Number.isFinite(y)) {
        previous = undefined;
        continue;
      }
      const jumped =
        previous !== undefined && (previous - middle) * (y - middle) < 0 && Math.abs(y - previous) > span;
      pieces.push(`${previous === undefined || jumped ? 'M' : 'L'} ${px(x).toFixed(1)},${py(clamp(y)).toFixed(1)}`);
      previous = y;
    }
    return pieces.join(' ');
  };

  for (const curve of curves) {
    const dash = curve.dashed ? ' stroke-dasharray="5 4" opacity="0.6"' : '';
    const stroke = curve.accent ? 'class="plot-accent" ' : '';
    const d = curve.breaks ? brokenPath(curve.f) : `M ${path(curve.f)}`;
    parts.push(`<path ${stroke}fill="none" stroke="currentColor" stroke-width="2"${dash} d="${d}" />`);
  }

  for (const mark of marks) {
    const fill = mark.hollow ? 'none' : 'currentColor';
    parts.push(
      `<circle cx="${px(mark.x).toFixed(1)}" cy="${py(mark.y).toFixed(1)}" r="4" fill="${fill}" stroke="currentColor" stroke-width="2" />`,
    );
  }

  parts.push('</svg>');
  return parts.join('');
}

/**
 * A vector drawn as an arrow from the origin, on squared paper.
 *
 * Square and to scale, unlike `plotSvg`: a vector is a direction as much as a
 * pair of numbers, and a figure whose axes ran at different scales would show
 * the wrong direction. So the caller gives one `span` and both axes use it.
 *
 * Nothing is inset from the edge either, because the slider widget positions
 * its marker as a fraction of the picture's width and knows nothing about the
 * drawing inside. Mapping -span to the left edge exactly is what lets the
 * handle line up with the arrow. The arrow stays clear of the edge because the
 * caller keeps `span` above the components it draws.
 */
export function vectorSvg(
  x: number,
  y: number,
  opts: { span: number; label?: string; drop?: boolean },
): string {
  const { span, drop = false } = opts;
  const SIZE = 220;
  const unit = SIZE / (2 * span);
  const sx = (v: number) => (SIZE / 2 + v * unit).toFixed(1);
  const sy = (v: number) => (SIZE / 2 - v * unit).toFixed(1);

  const parts = [
    `<svg viewBox="0 0 ${SIZE} ${SIZE}" width="100%" role="img" aria-label="${opts.label ?? 'A vector drawn on axes'}">`,
  ];

  // One grid line per unit, so a component can be counted off rather than
  // estimated — which is the whole question this figure is drawn for.
  for (let i = -span + 1; i <= span - 1; i += 1) {
    parts.push(
      `<line x1="${sx(i)}" y1="0" x2="${sx(i)}" y2="${SIZE}" stroke="currentColor" stroke-width="0.5" opacity="0.15" />`,
      `<line x1="0" y1="${sy(i)}" x2="${SIZE}" y2="${sy(i)}" stroke="currentColor" stroke-width="0.5" opacity="0.15" />`,
    );
  }
  parts.push(
    `<line x1="0" y1="${sy(0)}" x2="${SIZE}" y2="${sy(0)}" stroke="currentColor" stroke-width="1" opacity="0.55" />`,
    `<line x1="${sx(0)}" y1="0" x2="${sx(0)}" y2="${SIZE}" stroke="currentColor" stroke-width="1" opacity="0.55" />`,
  );

  if (drop) {
    parts.push(
      `<line x1="${sx(x)}" y1="${sy(y)}" x2="${sx(x)}" y2="${sy(0)}" stroke="currentColor" stroke-width="1" stroke-dasharray="4 4" opacity="0.5" />`,
    );
  }

  // The shaft, then two short lines back from the tip for the head. Drawn from
  // the tip's own direction so the head follows the arrow round.
  const angle = Math.atan2(-y, x);
  const head = (turn: number) =>
    `<line x1="${sx(x)}" y1="${sy(y)}" x2="${(Number(sx(x)) - 11 * Math.cos(angle + turn)).toFixed(1)}" y2="${(Number(sy(y)) - 11 * Math.sin(angle + turn)).toFixed(1)}" class="plot-accent" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" />`;
  parts.push(
    `<line x1="${sx(0)}" y1="${sy(0)}" x2="${sx(x)}" y2="${sy(y)}" class="plot-accent" stroke="currentColor" stroke-width="2.5" />`,
    head(0.4),
    head(-0.4),
  );

  parts.push('</svg>');
  return parts.join('');
}

/** The curve y = ax^2 + bx + c. */
export function quadratic(a: number, b: number, c: number) {
  return (x: number) => a * x * x + b * x + c;
}

/**
 * A parabola drawn around its vertex.
 *
 * The window is built from the turning point rather than from the arms, which
 * is the whole reason this wrapper exists instead of callers passing a curve
 * straight to `plotSvg`. `reach` is roughly how much of the arms to show.
 */
export function parabolaSvg(
  a: number,
  b: number,
  c: number,
  opts: Omit<PlotOptions, 'curves' | 'label'> & { label?: string; reach?: number },
): string {
  const f = quadratic(a, b, c);
  const vertexY = f(-b / (2 * a));
  const reach = (opts.reach ?? 9) * Math.abs(a);
  return plotSvg({
    ...opts,
    curves: [{ f }],
    yMin: opts.yMin ?? Math.min(0, vertexY, a > 0 ? vertexY : vertexY - reach) - Math.abs(a),
    yMax: opts.yMax ?? Math.max(0, vertexY, a > 0 ? vertexY + reach : vertexY) + Math.abs(a),
    label: opts.label ?? 'A parabola',
  });
}

/** A sine wave: midline + amplitude * sin(2 pi (x - shift) / period). */
export function wave(midline: number, amplitude: number, period: number, shift = 0) {
  return (x: number) => midline + amplitude * Math.sin((2 * Math.PI * (x - shift)) / period);
}
