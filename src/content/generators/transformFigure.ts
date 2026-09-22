/**
 * Squared paper for the transformation questions: the unit square, its image
 * under a matrix, the arrows showing where i and j land, a point and a mirror.
 *
 * Square and to scale, like `vectorSvg` in `figures.ts`, and for the same
 * reason: a transformation is about directions, and axes drawn at different
 * scales would show a rotation as a shear. One `span` sets both axes.
 *
 * Nothing is inset from the edge either. The slider widget lays its marker over
 * the figure as a fraction of the figure's width (or height, for a marker lying
 * across), so -span has to sit exactly on the left edge and +span on the right
 * for the marker to meet the arrow tip it is being dragged to. `span` is kept
 * above everything drawn, so nothing sits on the edge itself.
 *
 * Colours come from `currentColor` and the theme's accent class, never a
 * literal colour, so the figure follows light and dark mode.
 */

export type Mirror = 'x-axis' | 'y-axis' | 'y=x' | 'y=-x';

export interface GridArrow {
  x: number;
  y: number;
  /** A short label drawn just past the tip, e.g. `i`. */
  label?: string;
  accent?: boolean;
}

export interface GridMark {
  x: number;
  y: number;
  label?: string;
}

export interface GridOptions {
  /** Both axes run from -span to +span. */
  span: number;
  /** Shade the image of the unit square under the matrix (a b; c d). */
  image?: readonly [number, number, number, number];
  /** Outline the unit square itself, dashed, for comparison. */
  square?: boolean;
  arrows?: GridArrow[];
  marks?: GridMark[];
  /** A mirror line through the origin, drawn dashed in the accent colour. */
  mirror?: Mirror;
  /**
   * Cap the drawn width. Only for a figure shown on its own: a slider figure
   * must fill its frame exactly or the marker drifts off the drawing.
   */
  maxWidth?: number;
  /** What a screen reader is told the picture shows. */
  label: string;
}

const SIZE = 240;

export function transformGridSvg(options: GridOptions): string {
  const { span, image, square = false, arrows = [], marks = [], mirror, maxWidth, label } = options;
  const unit = SIZE / (2 * span);
  const sx = (v: number) => (SIZE / 2 + v * unit).toFixed(1);
  const sy = (v: number) => (SIZE / 2 - v * unit).toFixed(1);
  const style = maxWidth ? ` style="max-width:${maxWidth}px"` : '';

  const parts = [
    `<svg viewBox="0 0 ${SIZE} ${SIZE}" width="100%"${style} role="img" aria-label="${label}">`,
  ];

  // One faint line per unit so a coordinate can be counted rather than
  // guessed, and a number every unit (every other past six) along each axis.
  const every = span > 6 ? 2 : 1;
  for (let n = -span + 1; n <= span - 1; n += 1) {
    parts.push(
      `<line x1="${sx(n)}" y1="0" x2="${sx(n)}" y2="${SIZE}" stroke="currentColor" stroke-width="0.5" opacity="0.15" />`,
      `<line x1="0" y1="${sy(n)}" x2="${SIZE}" y2="${sy(n)}" stroke="currentColor" stroke-width="0.5" opacity="0.15" />`,
    );
    if (n === 0 || n % every !== 0) continue;
    parts.push(
      `<text x="${sx(n)}" y="${(Number(sy(0)) + 11).toFixed(1)}" fill="currentColor" opacity="0.6" font-size="9" text-anchor="middle">${n}</text>`,
      `<text x="${(Number(sx(0)) - 4).toFixed(1)}" y="${(Number(sy(n)) + 3).toFixed(1)}" fill="currentColor" opacity="0.6" font-size="9" text-anchor="end">${n}</text>`,
    );
  }
  parts.push(
    `<line x1="0" y1="${sy(0)}" x2="${SIZE}" y2="${sy(0)}" stroke="currentColor" stroke-width="1" opacity="0.55" />`,
    `<line x1="${sx(0)}" y1="0" x2="${sx(0)}" y2="${SIZE}" stroke="currentColor" stroke-width="1" opacity="0.55" />`,
  );

  if (mirror) {
    const ends: Record<Mirror, [number, number, number, number]> = {
      'x-axis': [-span, 0, span, 0],
      'y-axis': [0, -span, 0, span],
      'y=x': [-span, -span, span, span],
      'y=-x': [-span, span, span, -span],
    };
    const [x1, y1, x2, y2] = ends[mirror];
    parts.push(
      `<line x1="${sx(x1)}" y1="${sy(y1)}" x2="${sx(x2)}" y2="${sy(y2)}" class="plot-accent" stroke="currentColor" stroke-width="1.5" stroke-dasharray="6 4" />`,
    );
  }

  if (square) {
    parts.push(
      `<polygon points="${sx(0)},${sy(0)} ${sx(1)},${sy(0)} ${sx(1)},${sy(1)} ${sx(0)},${sy(1)}" fill="none" stroke="currentColor" stroke-width="1.5" stroke-dasharray="4 3" opacity="0.8" />`,
    );
  }

  if (image) {
    const [a, b, c, d] = image;
    const corners = [
      [0, 0],
      [a, c],
      [a + b, c + d],
      [b, d],
    ]
      .map(([x, y]) => `${sx(x)},${sy(y)}`)
      .join(' ');
    parts.push(
      `<polygon points="${corners}" class="plot-shade" />`,
      `<polygon points="${corners}" class="plot-accent" fill="none" stroke="currentColor" stroke-width="1.5" />`,
    );
  }

  for (const arrow of arrows) {
    const cls = arrow.accent ? ' class="plot-accent"' : '';
    const angle = Math.atan2(-arrow.y, arrow.x);
    const tipX = Number(sx(arrow.x));
    const tipY = Number(sy(arrow.y));
    const head = (turn: number) =>
      `<line x1="${tipX.toFixed(1)}" y1="${tipY.toFixed(1)}" x2="${(tipX - 9 * Math.cos(angle + turn)).toFixed(1)}" y2="${(tipY - 9 * Math.sin(angle + turn)).toFixed(1)}"${cls} stroke="currentColor" stroke-width="2.5" stroke-linecap="round" />`;
    parts.push(
      `<line x1="${sx(0)}" y1="${sy(0)}" x2="${tipX.toFixed(1)}" y2="${tipY.toFixed(1)}"${cls} stroke="currentColor" stroke-width="2.5" />`,
      head(0.45),
      head(-0.45),
    );
    if (arrow.label) {
      // Just past the tip, along the arrow, so it never sits on the shaft.
      // Held inside the frame: a tip one unit from the edge would otherwise
      // push its label half out of the picture.
      const inside = (v: number) => Math.min(SIZE - 6, Math.max(8, v));
      const lx = inside(tipX + 11 * Math.cos(angle));
      const ly = inside(tipY + 11 * Math.sin(angle) + 4);
      parts.push(
        `<text x="${lx.toFixed(1)}" y="${ly.toFixed(1)}"${cls} fill="currentColor" font-size="13" font-weight="700" text-anchor="middle">${arrow.label}</text>`,
      );
    }
  }

  for (const mark of marks) {
    parts.push(
      `<circle cx="${sx(mark.x)}" cy="${sy(mark.y)}" r="4" fill="currentColor" />`,
    );
    if (mark.label) {
      parts.push(
        `<text x="${(Number(sx(mark.x)) + 7).toFixed(1)}" y="${(Number(sy(mark.y)) - 6).toFixed(1)}" fill="currentColor" font-size="12" font-weight="700">${mark.label}</text>`,
      );
    }
  }

  parts.push('</svg>');
  return parts.join('');
}

/** A span that keeps every given coordinate at least one unit inside the edge. */
export function spanFor(...values: number[]): number {
  return Math.max(4, ...values.map((v) => Math.abs(v) + 1));
}
