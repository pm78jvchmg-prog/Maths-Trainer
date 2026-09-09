/**
 * Drawing the complex plane.
 *
 * Generates inline SVG rather than pulling in a chart library: the diagrams are
 * a grid, two axes and a handful of dots, and a charting dependency would cost
 * more than the whole rest of the bundle. Colours come from the CSS custom
 * properties so the diagrams follow the app's theme.
 */

export interface PlanePoint {
  re: number;
  im: number;
  /** Drawn filled and accented rather than plain. */
  highlight?: boolean;
  /** Optional caption, e.g. "A". */
  label?: string;
}

const SIZE = 260;
/**
 * Breathing room outside the grid. Without it a point plotted at the extreme
 * of the range sits exactly on the viewBox edge and is drawn half-clipped, and
 * the outermost axis labels are cut off entirely.
 */
const MARGIN = 20;

/** Maps a complex coordinate to SVG user space. Im is up, so its axis inverts. */
function project(value: number, range: number): number {
  return ((value + range) / (2 * range)) * SIZE;
}

export function complexPlaneSvg(range: number, points: PlanePoint[] = []): string {
  const lines: string[] = [];

  for (let n = -range; n <= range; n++) {
    const at = project(n, range);
    const major = n === 0;
    const stroke = major ? 'var(--text-dim)' : 'var(--border)';
    const width = major ? 1.5 : 0.6;
    lines.push(
      `<line x1="${at}" y1="0" x2="${at}" y2="${SIZE}" stroke="${stroke}" stroke-width="${width}"/>`,
      `<line x1="0" y1="${at}" x2="${SIZE}" y2="${at}" stroke="${stroke}" stroke-width="${width}"/>`,
    );
  }

  // Axis ticks, thinned out on a wide grid so the labels never collide.
  const labelEvery = range > 5 ? 2 : 1;
  const mid = project(0, range);
  for (let n = -range; n <= range; n++) {
    if (n === 0 || n % labelEvery !== 0) continue;
    const at = project(n, range);
    lines.push(
      `<text x="${at}" y="${mid + 13}" fill="var(--text-dim)" font-size="9" text-anchor="middle">${n}</text>`,
      `<text x="${mid - 6}" y="${SIZE - at + 3}" fill="var(--text-dim)" font-size="9" text-anchor="end">${n}i</text>`,
    );
  }

  for (const point of points) {
    const cx = project(point.re, range);
    const cy = SIZE - project(point.im, range);
    const colour = point.highlight ? 'var(--accent)' : 'var(--text)';
    lines.push(`<circle cx="${cx}" cy="${cy}" r="5" fill="${colour}"/>`);
    if (point.label) {
      lines.push(
        `<text x="${cx + 9}" y="${cy - 7}" fill="${colour}" font-size="13" font-weight="600">${point.label}</text>`,
      );
    }
  }

  const extent = SIZE + MARGIN * 2;
  return `<svg viewBox="${-MARGIN} ${-MARGIN} ${extent} ${extent}" width="100%" style="max-width:${extent}px" role="img" aria-label="Complex plane">${lines.join('')}</svg>`;
}

/** Every lattice point on a grid of the given range, for distractor selection. */
export function latticePoints(range: number): { re: number; im: number }[] {
  const out: { re: number; im: number }[] = [];
  for (let re = -range; re <= range; re++) {
    for (let im = -range; im <= range; im++) out.push({ re, im });
  }
  return out;
}

export { SIZE as PLANE_SIZE, MARGIN as PLANE_MARGIN, project as projectToPlane };
