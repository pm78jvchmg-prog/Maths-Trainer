/**
 * Trigonometric Functions.
 *
 * Sine and cosine are reached through periodic behaviour rather than through
 * right-angled triangles. Level 1 is about reading a repeating quantity —
 * period, shift, midline, amplitude — with no trig function named at all;
 * Level 2 then defines sine and cosine as the height and displacement of a
 * point going round a circle, which is the definition that survives past
 * 90 degrees.
 *
 * Level 4 changes the unit to radians, the one the rest of mathematics uses:
 * what a radian is, converting, exact values, and arcs and sectors.
 *
 * Level 5 divides sine by cosine to reach the tangent, the gradient of the
 * radius, then turns all three over to meet secant, cosecant and cotangent,
 * their graphs, and the two identities that follow from the Pythagorean one.
 *
 * Level 6 runs the functions backwards. sin^-1, cos^-1 and tan^-1 each answer
 * with one angle from a restricted range, the principal value: what that
 * means, the graphs as reflections, what happens inside another function, and
 * how the calculator's one angle leads to every solution.
 *
 * Level 7 puts the waves to work on real situations: building d + a sin(bt)
 * from a description, reading one back, choosing the function from where the
 * situation starts, solving for when it reaches a value, and fitting a model
 * to readings.
 *
 * Each level closes with a level check: twelve to fifteen questions, no
 * teaching slides, one attempt each.
 */
import type { Block, Course, SlideRef } from '../types';
import { plotSvg, wave } from '../figures';

const teach = (...blocks: Block[]): SlideRef => ({
  type: 'literal',
  slide: { kind: 'teach', body: blocks },
});

const ask = (generatorId: string, difficulty = 1): SlideRef => ({
  type: 'generated',
  generatorId,
  difficulty,
});

/**
 * One cycle of a sine wave, as an SVG the traversal block animates.
 *
 * Sampled rather than drawn with Bezier arcs because the dot follows the path
 * with `getPointAtLength`, and a sampled polyline is exactly as long as the
 * curve it draws — an approximating arc would put the dot slightly off the
 * line it is supposed to be tracing.
 *
 * The dot starts at the left-hand end so the still frame, which is what a
 * browser refusing to animate shows, is the beginning of the story rather than
 * a point stranded in the middle of it.
 */
function periodicTraversalSvg(): string {
  const width = 260;
  const height = 120;
  const midline = height / 2;
  const amplitude = 40;
  const samples = 120;
  // The curve is inset by the dot's radius at both ends, or the dot is cut in
  // half by the viewBox edge exactly when it arrives — at the end of the
  // journey the figure exists to show.
  const inset = 7;
  const span = width - inset * 2;

  const points = Array.from({ length: samples + 1 }, (_, i) => {
    const x = inset + (i / samples) * span;
    const y = midline - amplitude * Math.sin((i / samples) * 2 * Math.PI);
    return `${x.toFixed(2)},${y.toFixed(2)}`;
  });

  return [
    `<svg viewBox="0 0 ${width} ${height}" width="100%" role="img" aria-label="One cycle of a repeating quantity">`,
    `<line x1="0" y1="${midline}" x2="${width}" y2="${midline}" stroke="currentColor" stroke-width="1" stroke-dasharray="4 4" opacity="0.5" />`,
    `<line id="traversal-drop" class="traversal-drop" x1="${inset}" y1="${midline}" x2="${inset}" y2="${midline}" stroke-width="1" />`,
    `<path id="tf-periodic-path" fill="none" stroke="currentColor" stroke-width="1.5" d="M ${points.join(' L ')}" />`,
    `<circle id="traversal-dot" class="traversal-dot" r="5" cx="${inset}" cy="${midline}" />`,
    `</svg>`,
  ].join('');
}

/**
 * The animated figure, as blocks rather than as a slide of its own.
 *
 * It used to sit on its own teaching slide, which cost this lesson a slide it
 * now needs for an eighth exercise. Closing the opening slide with the
 * animation of what it has just described reads better than a page turn
 * between the two, and the local `prose` and `maths` helpers do not cover a
 * traversal block, hence the longhand.
 */
const periodicBlocks: Block[] = [
  {
    kind: 'prose',
    text: 'Watch one full cycle. The height rises, falls, and returns to exactly where it started — and the next cycle will take just as long as this one. Press Replay to watch it again.',
  },
  {
    kind: 'traversal',
    svg: periodicTraversalSvg(),
    pathId: 'tf-periodic-path',
    durationMs: 2600,
  },
];

const prose = (text: string): Block => ({ kind: 'prose', text });
const maths = (tex: string): Block => ({ kind: 'display', tex });

/**
 * The wave a slide is talking about.
 *
 * This course teaches reading a graph — period, shift, midline, amplitude —
 * and described every one of those in words alone. A sentence about where the
 * peaks sit is not a picture of peaks.
 *
 * Defaults suit the level-1 lessons: one quantity oscillating about a midline,
 * drawn over about two cycles so "the next time it happens" is visible in the
 * same frame as the first time.
 */
const graph = (
  opts: Omit<Parameters<typeof plotSvg>[0], 'label'> & { label?: string },
): Block => ({
  kind: 'diagram',
  svg: plotSvg({ label: 'A repeating quantity', ...opts }),
});

/**
 * A circle with one radius wrapped round its edge: the picture of one radian.
 *
 * The accent arc is exactly as long as the radius drawn beneath it, so the
 * angle between the two radii is the thing being defined rather than an
 * illustration of it. `sweep` lets the same figure show a sector for the
 * arc-length lesson, where the angle is whatever the example needs.
 */
function radianSvg(sweep: number, label: string, shaded = false): string {
  const cx = 130;
  const cy = 78;
  const r = 60;
  const ex = cx + r * Math.cos(sweep);
  const ey = cy - r * Math.sin(sweep);
  const large = sweep > Math.PI ? 1 : 0;
  const arc = `M ${cx + r} ${cy} A ${r} ${r} 0 ${large} 0 ${ex.toFixed(2)} ${ey.toFixed(2)}`;
  return [
    `<svg viewBox="0 0 260 156" width="100%" role="img" aria-label="${label}">`,
    `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="currentColor" stroke-width="1" opacity="0.35" />`,
    shaded ? `<path class="plot-shade" d="M ${cx} ${cy} L ${cx + r} ${cy} ${arc.slice(arc.indexOf('A'))} Z" />` : '',
    `<line x1="${cx}" y1="${cy}" x2="${cx + r}" y2="${cy}" stroke="currentColor" stroke-width="1.5" />`,
    `<line x1="${cx}" y1="${cy}" x2="${ex.toFixed(2)}" y2="${ey.toFixed(2)}" stroke="currentColor" stroke-width="1.5" />`,
    `<path class="plot-accent" d="${arc}" fill="none" stroke="currentColor" stroke-width="3.5" stroke-linecap="round" />`,
    `<circle cx="${cx}" cy="${cy}" r="2.5" fill="currentColor" />`,
    `</svg>`,
  ].join('');
}

/**
 * A radius to a point on a circle, with its rise dashed and its run on the
 * axis: the picture of tangent as up over across.
 *
 * The run is drawn along the axis in the accent colour with the radius, so the
 * two lengths the ratio divides are the two marked lines, and the height is
 * the dashed drop from the point.
 */
function tangentSvg(): string {
  const cx = 110;
  const cy = 90;
  const r = 64;
  const angle = (38 * Math.PI) / 180;
  const px = cx + r * Math.cos(angle);
  const py = cy - r * Math.sin(angle);
  return [
    `<svg viewBox="0 0 260 170" width="100%" role="img" aria-label="A radius at an angle to the horizontal axis, with its height dashed and its sideways distance along the axis">`,
    `<line x1="20" y1="${cy}" x2="240" y2="${cy}" stroke="currentColor" stroke-width="1" opacity="0.55" />`,
    `<line x1="${cx}" y1="12" x2="${cx}" y2="158" stroke="currentColor" stroke-width="1" opacity="0.55" />`,
    `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="currentColor" stroke-width="1" opacity="0.35" />`,
    `<line x1="${px.toFixed(2)}" y1="${py.toFixed(2)}" x2="${px.toFixed(2)}" y2="${cy}" stroke="currentColor" stroke-width="1.5" stroke-dasharray="4 4" />`,
    `<line class="plot-accent" x1="${cx}" y1="${cy}" x2="${px.toFixed(2)}" y2="${cy}" stroke="currentColor" stroke-width="3" stroke-linecap="round" />`,
    `<line class="plot-accent" x1="${cx}" y1="${cy}" x2="${px.toFixed(2)}" y2="${py.toFixed(2)}" stroke="currentColor" stroke-width="2" />`,
    `<circle cx="${px.toFixed(2)}" cy="${py.toFixed(2)}" r="4" fill="currentColor" />`,
    `</svg>`,
  ].join('');
}

/**
 * d + a sin(bt) or d + a cos(bt) with bt in degrees, the way level 7 writes a
 * model. A negative amplitude turns it upside down.
 */
const degreeWave =
  (d: number, a: number, fn: 'sin' | 'cos', b: number) =>
  (t: number): number =>
    d + a * Math[fn]((b * t * Math.PI) / 180);

/** A degree-measured curve, for the tangent-level graphs. */
const inDegrees = (f: (x: number) => number) => (x: number) => f((x * Math.PI) / 180);

/**
 * The inverses as curves, with no value off their domain. Drawn with
 * `breaks`, a sample with no value lifts the pen rather than writing NaN into
 * the path, and the windows used here put a sample exactly on x = -1 and 1.
 */
const arcsin = (x: number) => (Math.abs(x) > 1 ? NaN : Math.asin(x));
const arccos = (x: number) => (Math.abs(x) > 1 ? NaN : Math.acos(x));

/** plotSvg draws no y-axis of its own; the inverse graphs need one. */
const Y_AXIS = { x: 0, dashed: false };

/**
 * Sine on its restricted domain, its inverse, and the mirror line y = x.
 *
 * Square, with the same span on both axes, so the reflection is a true one:
 * a figure whose axes ran at different scales would show two curves that are
 * not mirror images, which is the one thing it exists to show.
 */
function reflectionSvg(): string {
  return plotSvg({
    xMin: -2,
    xMax: 2,
    yMin: -2,
    yMax: 2,
    height: 280,
    curves: [
      { f: (x) => x, dashed: true },
      { f: (x) => (Math.abs(x) > Math.PI / 2 ? NaN : Math.sin(x)), dashed: true, breaks: true },
      { f: arcsin, accent: true, breaks: true },
    ],
    verticals: [Y_AXIS],
    marks: [
      { x: -1, y: -Math.PI / 2 },
      { x: 1, y: Math.PI / 2 },
    ],
    label:
      'Sine from minus a quarter turn to a quarter turn, dashed, and its inverse, solid, mirror images of each other in the dashed line y = x',
  });
}

/** A right-angled triangle with sides 3, 4 and 5 and the angle theta marked. */
function triangleSvg(): string {
  const [ax, ay] = [40, 140];
  const [bx, by] = [200, 140];
  const [cx, cy] = [200, 20];
  return [
    `<svg viewBox="0 0 260 170" width="100%" role="img" aria-label="A right-angled triangle with hypotenuse 5, opposite side 3 and adjacent side 4, and the angle theta at the bottom left">`,
    `<path d="M ${ax} ${ay} L ${bx} ${by} L ${cx} ${cy} Z" fill="none" stroke="currentColor" stroke-width="2" />`,
    `<path d="M ${bx - 14} ${by} L ${bx - 14} ${by - 14} L ${bx} ${by - 14}" fill="none" stroke="currentColor" stroke-width="1" />`,
    `<path class="plot-accent" d="M ${ax + 34} ${ay} A 34 34 0 0 0 ${(ax + 34 * 0.8).toFixed(1)} ${(ay - 34 * 0.6).toFixed(1)}" fill="none" stroke="currentColor" stroke-width="2.5" />`,
    `<text x="${ax + 44}" y="${ay - 8}" font-size="14" font-style="italic" fill="currentColor">θ</text>`,
    `<text x="${(ax + cx) / 2 - 14}" y="${(ay + cy) / 2 - 6}" font-size="15" fill="currentColor" text-anchor="end">5</text>`,
    `<text x="${bx + 10}" y="${(by + cy) / 2 + 5}" font-size="15" fill="currentColor">3</text>`,
    `<text x="${(ax + bx) / 2}" y="${ay + 20}" font-size="15" fill="currentColor" text-anchor="middle">4</text>`,
    `</svg>`,
  ].join('');
}

export const trigonometricFunctions: Course = {
  id: 'trigonometric-functions',
  category: 'advanced-algebra',
  position: 10,
  title: 'Trigonometric Functions',
  blurb: 'Periodic behaviour first, then sine and cosine as circular motion.',
  levels: [
    {
      id: 'tf-l1',
      title: 'Periodic Phenomena',
      lessons: [
        {
          id: 'tf-l1-periodic',
          title: 'Periodic Phenomena',
          slides: [
            teach(
              prose(
                'A great many things repeat. A Ferris wheel seat rises and falls and rises again; the tide comes in and goes out and comes back; a valve on a bicycle wheel traces the same rise and fall every revolution.',
              ),
              prose(
                'A quantity is *periodic* when it returns to the same value at even intervals, and keeps doing so. The length of one repeat is called the **period**.',
              ),
              prose(
                'That is a stronger condition than simply going up and down. A share price rises and falls, but it never repeats on a fixed interval, so it has no period.',
              ),
              ...periodicBlocks,
            ),
            ask('trig-is-periodic'),
            ask('trig-periodic-flow'),
            teach(
              prose(
                'The test to apply is: does it come back to where it was, and does it take the same time every time? Both halves matter.',
              ),
              prose(
                'The reading on an electricity meter goes up and up. It never returns to a previous value, so nothing repeats.',
              ),
              prose(
                'The total distance a car has driven behaves the same way. Something can change fast, slowly, or in fits and starts and still not be periodic — the question is whether it comes back.',
              ),
            ),
            ask('trig-is-periodic', 2),
            ask('trig-periodic-flow', 2),
            teach(
              prose(
                'One complete repeat is a **cycle**. Because every cycle takes the same time, counting cycles and counting periods are the same thing.',
              ),
              prose(
                'If a wheel turns once every 4 seconds, then in 20 seconds it has turned 5 times, because $20 \\div 4 = 5$.',
              ),
              maths('\\text{cycles} = \\frac{\\text{total time}}{\\text{period}}'),
              prose(
                'The period also says when the next repeats happen: add it on, again and again. A buzzer that sounds every $5$ seconds, first at $t = 1$, sounds next at',
              ),
              maths('\\begin{gathered} 1 + 5 = 6 \\\\ 6 + 5 = 11 \\\\ 11 + 5 = 16 \\end{gathered}'),
              prose(
                'Start adding from the first time, not after it: $1$ has already happened, so the next one is $6$.',
              ),
            ),
            ask('trig-cycle-count'),
            ask('trig-repeat-times'),
            ask('trig-cycle-count', 2),
            ask('trig-repeat-times', 2),
          ],
          skillCheck: [
            ask('trig-is-periodic', 2),
            ask('trig-cycle-count', 2),
            ask('trig-periodic-flow', 2),
          ],
        },
        {
          id: 'tf-l1-period',
          title: 'The Period of a Function',
          slides: [
            teach(
              prose(
                'To measure a period from a graph, find one feature and then find the very next time it happens. The gap between them is the period.',
              ),
              prose(
                'Peaks are the easiest feature to spot. If consecutive peaks sit at $t = 2$ and $t = 9$, the period is $9 - 2 = 7$.',
              ),
              // Peak at t = 2, period 7, so the next peak is at t = 9 — the two
              // ringed points are the two the sentence above names.
              graph({
                xMin: -1,
                xMax: 17,
                curves: [{ f: wave(0, 1, 7, 0.25) }],
                marks: [
                  { x: 2, y: 1 },
                  { x: 9, y: 1 },
                ],
                verticals: [{ x: 2 }, { x: 9 }],
                label: 'A wave with consecutive peaks at t = 2 and t = 9',
              }),
              maths('\\text{period} = t_{\\text{next peak}} - t_{\\text{this peak}}'),
              prose(
                'They must be *consecutive*. Two peaks with another peak between them are two periods apart, not one.',
              ),
              prose(
                'The period then counts cycles: with a period of $7$, a stretch of $35$ seconds holds $35 \\div 7 = 5$ cycles.',
              ),
            ),
            ask('trig-period-from-peaks'),
            ask('trig-read-period'),
            ask('trig-cycle-count'),
            teach(
              prose(
                'Peaks are convenient but not special. Any pair of matching points does, as long as they are at the same point in the cycle.',
              ),
              prose(
                'Two troughs work. So do two consecutive upward crossings of the midline. What does *not* work is pairing an upward crossing with a downward one — the curve is at the same height, but it is going the other way, so that is only half a period.',
              ),
              // The two hollow rings are an upward and a downward crossing: the
              // same height, half a period apart, which is the trap.
              graph({
                xMin: -1,
                xMax: 17,
                curves: [{ f: wave(0, 1, 7, 0.25) }],
                marks: [
                  { x: 0.25, y: 0, hollow: true },
                  { x: 3.75, y: 0, hollow: true },
                  { x: 7.25, y: 0 },
                ],
                label: 'Upward and downward crossings of the midline half a period apart',
              }),
              prose(
                'The filled ring is the next *upward* crossing, a full period from the first. The hollow one between them is the downward crossing at the same height — half a period, and the wrong pair to measure.',
              ),
              prose(
                'This is the most common error in reading a period off a graph, and it gives an answer exactly half the true one.',
              ),
            ),
            ask('trig-period-from-peaks+choice', 2),
            ask('trig-read-period', 2),
            ask('trig-cycle-count', 2),
            teach(
              prose(
                'Once the period is known, every future repeat is predictable. If a peak is at $t = 2$ with period $7$, add $7$ on each time:',
              ),
              maths('\\begin{gathered} 2 + 7 = 9 \\\\ 9 + 7 = 16 \\\\ 16 + 7 = 23 \\end{gathered}'),
              maths('t = 2 + 7n \\quad \\text{for whole numbers } n'),
              prose(
                'Working backwards is just as valid: $n = -1$ gives a peak at $t = -5$. A periodic function has no start, which is what makes it worth studying as a whole rather than point by point.',
              ),
            ),
            ask('trig-repeat-times'),
            ask('trig-repeat-times', 2),
          ],
          skillCheck: [
            ask('trig-period-from-peaks', 2),
            ask('trig-repeat-times', 2),
            ask('trig-cycle-count', 2),
          ],
        },
        {
          id: 'tf-l1-shift',
          title: 'Horizontal Shifts of a Periodic Function',
          slides: [
            teach(
              prose(
                'Replacing $t$ with $t - c$ inside a function slides its graph sideways, without changing its shape at all.',
              ),
              maths('y = f(t) \\quad \\longrightarrow \\quad y = f(t - 3)'),
              // The dashed curve is the original, the solid one is it shifted
              // right by 3. Same shape, same height, different starting place.
              graph({
                xMin: -1,
                xMax: 15,
                curves: [
                  { f: wave(0, 1, 6, 0), dashed: true },
                  { f: wave(0, 1, 6, 3), accent: true },
                ],
                marks: [
                  { x: 1.5, y: 1, hollow: true },
                  { x: 4.5, y: 1 },
                ],
                label: 'A wave and the same wave shifted three to the right',
              }),
              prose(
                'The dashed curve is the original and the solid one is $f(t - 3)$. The peak that was at $1.5$ now arrives at $4.5$ — the shape has not changed at all, only when it happens.',
              ),
              prose(
                'The period, the gap from one peak to the next, is the same on both: the next solid peak is at $10.5$, and $10.5 - 4.5 = 6$.',
              ),
              prose(
                'Subtracting shifts right. That reads backwards to most people the first time, and it is worth being clear about why.',
              ),
            ),
            ask('trig-horizontal-shift'),
            ask('trig-period-from-peaks'),
            ask('trig-read-period'),
            teach(
              prose(
                'The reason is that the bracket is an *input*, not an output. For $f(t - 3)$ to do what $f$ did at $0$, the bracket must equal $0$ — so $t$ must be $3$.',
              ),
              maths('t - 3 = 0 \\implies t = 3'),
              prose(
                'Every feature therefore arrives 3 later than it used to, which is a shift to the right. Adding inside the bracket does the opposite: $f(t + 3)$ arrives 3 early, so the graph moves left.',
              ),
              prose(
                'If you ever lose the thread, solve the bracket for a single known point rather than trying to remember the rule.',
              ),
              prose(
                'The repeats keep their spacing wherever the graph sits. Peaks every $6$ seconds, the first at $t = 4$, come next at $4 + 6 = 10$, $10 + 6 = 16$ and $16 + 6 = 22$.',
              ),
            ),
            ask('trig-horizontal-shift', 2),
            ask('trig-repeat-times'),
            ask('trig-read-period', 2),
            teach(
              prose(
                'A horizontal shift changes nothing else. The period is the same, the maximum and minimum are the same, and the midline is the same.',
              ),
              prose(
                'This matters because it means a shift is never the explanation for a graph that is taller, flatter, or repeating at a different rate. If those have changed, something other than a shift has been done to it.',
              ),
            ),
            ask('trig-period-from-peaks', 2),
            ask('trig-repeat-times', 2),
          ],
          skillCheck: [
            ask('trig-horizontal-shift', 2),
            ask('trig-repeat-times', 2),
            ask('trig-period-from-peaks', 2),
          ],
        },
        {
          id: 'tf-l1-midline',
          title: 'Midline of a Periodic Function',
          slides: [
            teach(
              prose(
                'A periodic quantity swings about a central level. That level is the **midline**, and it sits exactly halfway between the highest and lowest values.',
              ),
              maths('\\text{midline} = \\frac{\\text{max} + \\text{min}}{2}'),
              prose(
                'If the tide runs between $9$ m and $3$ m, the midline is $\\frac{9 + 3}{2} = 6$ m.',
              ),
              // The tide itself: max 9, min 3, so midline 6 and amplitude 3.
              graph({
                xMin: 0,
                xMax: 26,
                curves: [{ f: wave(6, 3, 12, 3) }],
                horizontals: [6],
                marks: [
                  { x: 6, y: 9 },
                  { x: 12, y: 3 },
                ],
                yMin: 0,
                yMax: 11,
                label: 'A tide between 9 and 3 metres, with its midline at 6',
              }),
              prose(
                'The dashed line is the midline. The curve spends as long above it as below, and the two ringed points are the highest and lowest the tide reaches.',
              ),
              prose(
                'How far the tide swings either side of the midline is its **amplitude**: from $6$ up to $9$ is $3$. It is half the gap between the extremes, not the whole gap:',
              ),
              maths('\\text{amplitude} = \\frac{9 - 3}{2} = \\frac{6}{2} = 3'),
            ),
            ask('trig-midline'),
            ask('trig-read-midline'),
            ask('trig-describe-wave'),
            teach(
              prose(
                'Adding a constant to a function raises the whole graph, midline included. Subtracting lowers it.',
              ),
              maths('y = f(t) + 6 \\quad \\text{has midline 6 higher than } y = f(t)'),
              prose(
                'Unlike a horizontal shift, this one reads the way you expect: add to go up. The sign only misbehaves when the change is *inside* the function.',
              ),
              prose(
                'A vertical shift leaves the period untouched, and leaves the size of the swing untouched. It moves the whole picture up or down and nothing else.',
              ),
              prose(
                'A formula shows both numbers. $\\sin(x)$ and $\\cos(x)$ both swing between $1$ and $-1$ about $0$. In $y = 8\\sin(x) + 1$ the $8$ makes that $8$ either side, and the $+ 1$ lifts the midline to $1$:',
              ),
              maths(
                '\\begin{aligned} \\text{greatest} &= 1 + 8 = 9 \\\\ \\text{least} &= 1 - 8 = -7 \\\\ \\text{full swing} &= 9 - (-7) = 16 \\end{aligned}',
              ),
              prose('The full swing is twice the amplitude of $8$, never the amplitude itself.'),
            ),
            ask('trig-midline+choice', 2),
            ask('trig-wave-swing'),
            ask('trig-read-midline', 2),
            teach(
              prose(
                'One caution. The midline is the mean of the two *extremes*, not the average value over time.',
              ),
              prose(
                'For a sine wave those happen to agree, because the curve is symmetric — it spends as long above the midline as below. For a shape that rises quickly and falls slowly, they do not agree at all.',
              ),
              prose(
                'The definition to hold on to is the geometric one: the midline is the horizontal line the graph is symmetric about.',
              ),
            ),
            ask('trig-wave-swing', 2),
            ask('trig-describe-wave', 2),
          ],
          skillCheck: [
            ask('trig-midline', 2),
            ask('trig-describe-wave', 2),
            ask('trig-wave-swing', 2),
          ],
        },
        {
          id: 'tf-l1-amplitude',
          title: 'Amplitude of a Periodic Function',
          slides: [
            teach(
              prose(
                'The **amplitude** is how far the quantity swings from its midline to a peak — half the full distance from trough to peak.',
              ),
              maths('\\text{amplitude} = \\frac{\\text{max} - \\text{min}}{2}'),
              prose(
                'For a tide between $9$ m and $3$ m, the full swing is $6$ m and the amplitude is $3$ m.',
              ),
              // The same tide as the midline lesson, so the two slides describe
              // one quantity rather than two unrelated examples.
              graph({
                xMin: 0,
                xMax: 26,
                curves: [{ f: wave(6, 3, 12, 3) }],
                horizontals: [6],
                marks: [
                  { x: 6, y: 9 },
                  { x: 6, y: 6 },
                  { x: 12, y: 3 },
                ],
                yMin: 0,
                yMax: 11,
                label: 'A tide swinging three metres either side of a midline at six',
              }),
              prose(
                'The amplitude is the gap from the dashed midline up to the peak — from $6$ to $9$, so $3$. The gap from trough to peak, $3$ up to $9$, is twice that.',
              ),
              prose(
                'Giving the full swing instead of half of it is by far the most common mistake here. Amplitude is measured from the middle, not from the bottom.',
              ),
            ),
            ask('trig-amplitude'),
            ask('trig-describe-wave'),
            ask('trig-midline'),
            teach(
              prose(
                'Midline and amplitude together fix the whole vertical picture, and either pair determines the other.',
              ),
              maths(
                '\\text{max} = \\text{midline} + \\text{amplitude} \\qquad \\text{min} = \\text{midline} - \\text{amplitude}',
              ),
              prose(
                'So a tide with midline $6$ m and amplitude $3$ m runs between $3$ m and $9$ m, which is where we started. Being able to go either way is worth more than either formula on its own.',
              ),
              prose(
                'A formula hands over both. $\\sin(x)$ and $\\cos(x)$ swing between $1$ and $-1$, so in $y = 2\\cos(x) + 10$ the multiplier $2$ is the amplitude and the $10$ added on is the midline:',
              ),
              maths(
                '\\begin{aligned} \\text{greatest} &= 10 + 2 = 12 \\\\ \\text{least} &= 10 - 2 = 8 \\\\ \\text{full swing} &= 12 - 8 = 4 \\end{aligned}',
              ),
            ),
            ask('trig-amplitude+choice', 2),
            ask('trig-wave-swing'),
            ask('trig-midline', 2),
            teach(
              prose(
                'Amplitude is a distance, so it is never negative. A quantity swinging between $-2$ and $-8$ has amplitude $3$, not $-3$.',
              ),
              maths('\\frac{-2 - (-8)}{2} = \\frac{6}{2} = 3'),
              prose(
                'Watch the double negative in that subtraction; it is where sign errors creep in. Later, a negative multiplier in front of a sine will flip the curve upside down, but even then the amplitude is its size, taken positive.',
              ),
            ),
            ask('trig-wave-swing', 2),
            ask('trig-describe-wave', 2),
          ],
          skillCheck: [
            ask('trig-amplitude', 2),
            ask('trig-wave-swing', 2),
            ask('trig-midline', 2),
          ],
        },
      ],
      levelCheck: [
        ask('trig-is-periodic', 2),
        ask('trig-periodic-flow', 2),
        ask('trig-cycle-count', 2),
        ask('trig-repeat-times', 2),
        ask('trig-period-from-peaks', 2),
        ask('trig-read-graph', 2),
        ask('trig-midline', 2),
        ask('trig-describe-wave', 2),
        ask('trig-amplitude', 2),
        ask('trig-wave-swing', 2),
        ask('trig-horizontal-shift', 2),
        ask('trig-period-from-peaks', 2),
      ],
    },
    {
      id: 'tf-l2',
      title: 'Periodic Functions from Circular Motion',
      lessons: [
        {
          id: 'tf-l2-sine',
          title: 'Sine from Circular Motion',
          slides: [
            teach(
              prose(
                'Put a point on a circle of radius $1$, centred at the origin, at the far right, and turn it anticlockwise. Its height above the centre *is* the **sine** of the angle turned — a height, not a ratio of two sides. Its distance to the right of the centre is the **cosine**. At each quarter turn:',
              ),
              maths(
                '\\begin{array}{c|cccc} \\theta & 0^{\\circ} & 90^{\\circ} & 180^{\\circ} & 270^{\\circ} \\\\ \\hline \\sin & 0 & 1 & 0 & -1 \\\\ \\cos & 1 & 0 & -1 & 0 \\end{array}',
              ),
              prose(
                'On a circle of radius $r$ every length is $r$ times as big: the height is $r\\sin(\\theta)$ and the displacement is $r\\cos(\\theta)$. Radius $3$, turned $270^{\\circ}$:',
              ),
              maths(
                '\\begin{aligned} 3\\sin(270^{\\circ}) &= 3 \\times (-1) = -3 \\\\ 3\\cos(270^{\\circ}) &= 3 \\times 0 = 0 \\end{aligned}',
              ),
              prose('A sine is a plain number, so find it before anything multiplies or adds to it:'),
              maths('\\begin{aligned} 5\\sin(90^{\\circ}) + 1 &= 5 \\times 1 + 1 \\\\ &= 5 + 1 = 6 \\end{aligned}'),
            ),
            ask('trig-circle-coords'),
            ask('trig-evaluate-exact'),
            teach(
              prose(
                'Defining it this way costs nothing for the angles you already know and gains everything for the ones you do not.',
              ),
              prose(
                'Turn $30^{\\circ}$ up and $30^{\\circ}$ down from the start. The two points and the centre make a triangle with two sides of $1$ and $60^{\\circ}$ between them, so it is equilateral and the two points are $1$ apart. The upper one is half of that above the centre:',
              ),
              maths('\\sin(30^{\\circ}) = \\tfrac{1}{2} = 0.5'),
              prose(
                'A triangle cannot have an angle of $150^{\\circ}$, but a point can turn that far: it is the $30^{\\circ}$ point reflected across the vertical axis, at the same height. Past a half turn the same heights come again below the centre: $210^{\\circ}$ is $30^{\\circ}$ past a half turn, and $330^{\\circ}$ is $30^{\\circ}$ short of a full one.',
              ),
              maths(
                '\\begin{aligned} \\sin(150^{\\circ}) &= 0.5 \\\\ \\sin(210^{\\circ}) &= -0.5 \\\\ \\sin(330^{\\circ}) &= -0.5 \\end{aligned}',
              ),
              prose('With a radius, multiply as before. Radius $7$, turned $210^{\\circ}$:'),
              maths('\\begin{aligned} 7\\sin(210^{\\circ}) &= 7 \\times (-0.5) \\\\ &= -3.5 \\end{aligned}'),
            ),
            ask('trig-sine-from-circle'),
            ask('trig-circle-coords', 2),
            ask('trig-sine-from-circle+choice', 2),
            teach(
              prose(
                'The same triangle gives the cosine. Turn $60^{\\circ}$: the point, the centre and the start make a triangle with two sides of $1$ and $60^{\\circ}$ between them, equilateral again, so the point sits straight above the middle of the side along the axis:',
              ),
              maths('\\cos(60^{\\circ}) = \\tfrac{1}{2} = 0.5'),
              prose(
                '$300^{\\circ}$ is that point reflected below the axis, the same distance to the right. $120^{\\circ}$ and $240^{\\circ}$ are the same two points reflected to the left, so the displacement is negative.',
              ),
              maths(
                '\\begin{aligned} \\cos(300^{\\circ}) &= 0.5 \\\\ \\cos(120^{\\circ}) &= -0.5 \\\\ \\cos(240^{\\circ}) &= -0.5 \\end{aligned}',
              ),
              prose('Settle the cosine, then multiply by the radius. Radius $5$, turned $240^{\\circ}$:'),
              maths('\\begin{aligned} 5\\cos(240^{\\circ}) &= 5 \\times (-0.5) \\\\ &= -2.5 \\end{aligned}'),
              prose('With two terms, settle each value, then each product, then combine:'),
              maths(
                '\\begin{aligned} &4\\sin(90^{\\circ}) - \\cos(180^{\\circ}) \\\\ &= 4 \\times 1 - (-1) \\\\ &= 4 + 1 = 5 \\end{aligned}',
              ),
            ),
            ask('trig-height-steps'),
            ask('trig-height-steps', 2),
            ask('trig-evaluate-exact+choice', 2),
          ],
          skillCheck: [
            ask('trig-sine-from-circle', 2),
            ask('trig-circle-coords', 2),
            ask('trig-height-steps', 2),
          ],
        },
        {
          id: 'tf-l2-cosine',
          title: 'Cosine from Circular Motion',
          slides: [
            teach(
              prose(
                'The same turning point has a second coordinate: how far it is to the right of the centre. That is the cosine.',
              ),
              prose(
                'Over the quarter turns it runs $1$, $0$, $-1$, $0$, while the height, the sine, runs $0$, $1$, $0$, $-1$.',
              ),
              prose(
                'At $60^{\\circ}$ the point, the centre and the start make an equilateral triangle, so the point is straight above the middle of the unit along the axis: $\\cos(60^{\\circ}) = 0.5$. Reflections give the rest:',
              ),
              maths(
                '\\begin{aligned} \\cos(60^{\\circ}) = \\cos(300^{\\circ}) &= 0.5 \\\\ \\cos(120^{\\circ}) = \\cos(240^{\\circ}) &= -0.5 \\end{aligned}',
              ),
              prose(
                'On a circle of radius $r$ the displacement is $r\\cos(\\theta)$ and the height $r\\sin(\\theta)$. Radius $9$, turned $120^{\\circ}$:',
              ),
              maths('\\begin{aligned} 9\\cos(120^{\\circ}) &= 9 \\times (-0.5) \\\\ &= -4.5 \\end{aligned}'),
              prose('Two terms are each settled on their own, then added:'),
              maths(
                '\\begin{aligned} &3\\cos(180^{\\circ}) + \\sin(90^{\\circ}) \\\\ &= 3 \\times (-1) + 1 \\\\ &= -3 + 1 = -2 \\end{aligned}',
              ),
            ),
            ask('trig-cosine-from-circle'),
            ask('trig-circle-coords'),
            ask('trig-evaluate-tree'),
            teach(
              prose(
                'Sine and cosine describe the same motion, measured in two directions. That is why their graphs have the same shape and the same period, and differ only in where they start.',
              ),
              maths('\\cos(\\theta) = \\sin(\\theta + 90^{\\circ})'),
              prose(
                'Cosine is a quarter turn ahead of sine. Everything from the previous lesson about shifting a graph sideways applies here, and this is the tidiest example of it.',
              ),
              prose(
                'It hands over the sine half values too. $\\cos(60^{\\circ}) = \\sin(150^{\\circ})$, and $150^{\\circ}$ is the $30^{\\circ}$ point reflected across the vertical axis, at the same height:',
              ),
              maths('\\sin(30^{\\circ}) = \\sin(150^{\\circ}) = 0.5'),
              prose(
                'Below the centre the same heights are negative, $\\sin(210^{\\circ}) = \\sin(330^{\\circ}) = -0.5$. So radius $7$ turned $330^{\\circ}$ is $7 \\times (-0.5) = -3.5$ above the centre, which is $3.5$ below it.',
              ),
            ),
            ask('trig-cosine-from-circle+choice', 2),
            ask('trig-height-steps'),
            ask('trig-circle-coords', 2),
            teach(
              prose(
                'The point sits on a circle of radius $1$, so its two coordinates obey Pythagoras.',
              ),
              maths('\\cos^2(\\theta) + \\sin^2(\\theta) = 1'),
              prose(
                'This is the circle equation $x^2 + y^2 = 1$ with the coordinates renamed, which is why it holds for every angle without exception — including angles past $90^{\\circ}$, where a triangle argument would have run out.',
              ),
              prose(
                'It also says the two cannot both be large. If the sine is $1$, the cosine must be $0$: the point is at the top of the circle, and it cannot be far to the right at the same time.',
              ),
            ),
            ask('trig-height-steps', 2),
            ask('trig-evaluate-tree', 2),
          ],
          skillCheck: [
            ask('trig-cosine-from-circle', 2),
            ask('trig-circle-coords', 2),
            ask('trig-evaluate-tree', 2),
          ],
        },
        {
          id: 'tf-l2-symmetry',
          title: 'Angles with the Same Sine',
          slides: [
            teach(
              prose(
                'An earlier lesson said $\\sin(150^{\\circ})$ equals $\\sin(30^{\\circ})$; that is not a coincidence about one pair of angles but a symmetry of the circle, and it comes in three kinds.',
              ),
              graph({
                xMin: 0,
                xMax: 360,
                curves: [{ f: wave(0, 1, 360, 0) }],
                marks: [
                  { x: 40, y: Math.sin((40 * Math.PI) / 180) },
                  { x: 140, y: Math.sin((40 * Math.PI) / 180) },
                ],
                verticals: [{ x: 40 }, { x: 140 }],
                yMin: -1.4,
                yMax: 1.4,
                label: 'The sine curve, with the equal heights at 40 and 140 degrees ringed',
              }),
              prose(
                'The ringed points are $\\sin(40^{\\circ})$ and $\\sin(140^{\\circ})$, the same height because $40^{\\circ}$ and $140^{\\circ}$ are the same distance either side of the top of the circle at $90^{\\circ}$ — reflections of each other in the vertical axis.',
              ),
              maths('\\sin(180^{\\circ} - \\theta) = \\sin(\\theta) \\qquad \\cos(180^{\\circ} - \\theta) = -\\cos(\\theta)'),
              prose(
                'The reflection keeps the height and flips the displacement, so the sine is unchanged and the cosine changes sign.',
              ),
              prose(
                'Signs come straight from the picture. Sine is the height, so it is positive whenever the point is above the centre; cosine is the displacement, positive whenever the point is to the right. After $120^{\\circ}$ the point is above the centre and to its left, so $\\sin(120^{\\circ})$ is positive and $\\cos(120^{\\circ})$ is negative.',
              ),
            ),
            ask('trig-quadrant-flow'),
            ask('trig-circle-coords'),
            teach(
              prose(
                'A half turn takes the point to the diametrically opposite side, so both coordinates change sign.',
              ),
              maths('\\sin(180^{\\circ} + \\theta) = -\\sin(\\theta) \\qquad \\cos(180^{\\circ} + \\theta) = -\\cos(\\theta)'),
              prose(
                'The third symmetry is reflection in the horizontal axis: $360^{\\circ} - \\theta$ sits just below the starting point rather than just above it, and a negative angle, a clockwise turn, lands in exactly the same place; same displacement, flipped height.',
              ),
              maths(
                '\\sin(360^{\\circ} - \\theta) = \\sin(-\\theta) = -\\sin(\\theta) \\qquad \\cos(360^{\\circ} - \\theta) = \\cos(-\\theta) = \\cos(\\theta)',
              ),
              prose(
                'Given a value, the same rules hand over the answer: if $\\sin(40^{\\circ}) \\approx 0.643$ then $\\sin(220^{\\circ}) \\approx -0.643$; the digits are the same and only the sign needs deciding.',
              ),
              prose(
                'The same goes for a height on a bigger circle. $210^{\\circ}$ is a half turn past $30^{\\circ}$ and $\\sin(30^{\\circ}) = 0.5$, so on a circle of radius $5$:',
              ),
              maths('\\begin{aligned} 5\\sin(210^{\\circ}) &= 5 \\times (-0.5) \\\\ &= -2.5 \\end{aligned}'),
            ),
            ask('trig-related-angle'),
            ask('trig-related-angle', 2),
            ask('trig-sine-from-circle'),
            teach(
              prose(
                'Rather than memorising six rules, picture the point: sine is the height, so ask whether the reflected point is above or below the centre; cosine is the displacement, so ask whether it is left or right.',
              ),
              maths('\\sin(220^{\\circ}) = -\\sin(40^{\\circ}) \\approx -0.643'),
              prose(
                'These symmetries are what make a table of values from $0^{\\circ}$ to $90^{\\circ}$ enough for every angle there is; the sine of $140^{\\circ}$, $220^{\\circ}$, $320^{\\circ}$ and $-40^{\\circ}$ are all $0.643$ in size, with the sign read off the circle.',
              ),
            ),
            ask('trig-quadrant-flow', 2),
            ask('trig-sine-from-circle', 2),
            ask('trig-circle-coords', 2),
          ],
          skillCheck: [
            ask('trig-related-angle', 2),
            ask('trig-quadrant-flow', 2),
            ask('trig-sine-from-circle', 2),
          ],
        },
        {
          id: 'tf-l2-solve',
          title: 'Solving for the Angle',
          slides: [
            teach(
              prose(
                'So far the angle was given and the height asked for; turn it round: at which angles is a point on a circle of radius $6$ exactly $3$ above the centre?',
              ),
              maths('6\\sin(\\theta) = 3 \\quad \\Rightarrow \\quad \\sin(\\theta) = \\tfrac{3}{6} = \\tfrac{1}{2}'),
              prose(
                'Dividing by the radius turns a question about a height into one about the sine alone. Which angle has a height of $\\tfrac{1}{2}$? Turn $30^{\\circ}$ up and $30^{\\circ}$ down from the start: the two points and the centre make a triangle with two sides of $1$ and $60^{\\circ}$ between them, so it is equilateral, the points are $1$ apart, and each is $\\tfrac{1}{2}$ from the axis. So $\\sin(30^{\\circ}) = \\tfrac{1}{2}$.',
              ),
              prose(
                'Reflecting that picture in the diagonal line $y = x$ swaps the two coordinates and takes the $30^{\\circ}$ point to the $60^{\\circ}$ one, so $\\cos(60^{\\circ}) = \\tfrac{1}{2}$ as well. Multiplying back by a radius undoes the division: $5\\cos(60^{\\circ}) = 5 \\times 0.5 = 2.5$.',
              ),
              prose(
                'The previous lesson showed $\\sin(150^{\\circ})$ is also $\\tfrac{1}{2}$, so there are two answers:',
              ),
              maths('\\sin(\\theta) = \\tfrac{1}{2} \\quad \\Rightarrow \\quad \\theta = 30^{\\circ} \\text{ or } 150^{\\circ}'),
              prose(
                'Two, because the point passes every height twice in a turn, once going up and once coming down; giving only one is the standard slip.',
              ),
            ),
            ask('trig-quadrant-flow'),
            ask('trig-height-steps'),
            teach(
              prose(
                'Cosine works the same way with the other axis: a displacement of $\\tfrac{1}{2}$ happens at $60^{\\circ}$ and again at its reflection in the horizontal axis, $300^{\\circ}$.',
              ),
              maths('\\cos(\\theta) = \\tfrac{1}{2} \\quad \\Rightarrow \\quad \\theta = 60^{\\circ} \\text{ or } 300^{\\circ}'),
              prose(
                'A negative value moves both answers to the other half of the circle: for $\\sin(\\theta) = -\\tfrac{1}{2}$ the point is below the centre, at $180^{\\circ} + 30^{\\circ} = 210^{\\circ}$ and $360^{\\circ} - 30^{\\circ} = 330^{\\circ}$; for $\\cos(\\theta) = -\\tfrac{1}{2}$ it is to the left, at $180^{\\circ} - 60^{\\circ} = 120^{\\circ}$ and $180^{\\circ} + 60^{\\circ} = 240^{\\circ}$.',
              ),
              prose(
                'The range matters: between $0^{\\circ}$ and $360^{\\circ}$ every angle is an anticlockwise turn, but between $-180^{\\circ}$ and $180^{\\circ}$ the lower half of the circle is named by clockwise turns instead.',
              ),
              maths(
                '\\begin{gathered} \\sin(\\theta) = -\\tfrac{1}{2} \\\\ \\Rightarrow \\; \\theta = -30^{\\circ} \\text{ or } -150^{\\circ} \\\\ (-180^{\\circ} < \\theta \\le 180^{\\circ}) \\end{gathered}',
              ),
              prose(
                'In that range $\\cos(\\theta) = \\tfrac{1}{2}$ gives $60^{\\circ}$ and $-60^{\\circ}$, and $\\cos(\\theta) = -\\tfrac{1}{2}$ gives $120^{\\circ}$ and $-120^{\\circ}$.',
              ),
            ),
            ask('trig-solve-height'),
            ask('trig-solve-height+choice', 2),
            ask('trig-quadrant-flow', 2),
            teach(
              prose(
                'The method is always the same: find the reference angle, $30^{\\circ}$ for sine or $60^{\\circ}$ for cosine, decide from the sign which half of the circle the point is in, and take the two angles there by symmetry.',
              ),
              prose(
                'Same two points, different labels: $-30^{\\circ}$ is $330^{\\circ}$ and $-150^{\\circ}$ is $210^{\\circ}$; always read the range before writing the answer. Check each answer by substituting it back: $6\\sin(330^{\\circ})$ is $-3$, so $330^{\\circ}$ answers the question about $-3$ and not the one about $3$.',
              ),
              prose(
                'The same symmetries relate any two angles. Take $25^{\\circ}$: $180^{\\circ} - 25^{\\circ} = 155^{\\circ}$ keeps the height and flips the displacement, $180^{\\circ} + 25^{\\circ} = 205^{\\circ}$ flips both, and $360^{\\circ} - 25^{\\circ} = 335^{\\circ}$, the same place as a clockwise $-25^{\\circ}$, keeps the displacement and flips the height:',
              ),
              maths(
                '\\begin{aligned} \\cos(155^{\\circ}) &= -\\cos(25^{\\circ}) \\\\ \\sin(205^{\\circ}) &= -\\sin(25^{\\circ}) \\\\ \\cos(335^{\\circ}) &= \\cos(25^{\\circ}) \\end{aligned}',
              ),
            ),
            ask('trig-related-angle'),
            ask('trig-height-steps', 2),
            ask('trig-related-angle', 2),
          ],
          skillCheck: [
            ask('trig-solve-height', 2),
            ask('trig-solve-height+choice', 2),
            ask('trig-quadrant-flow', 2),
          ],
        },
        {
          id: 'tf-l2-identity',
          title: 'The Pythagorean Identity',
          slides: [
            teach(
              prose(
                'The cosine lesson ended with $\\cos^2(\\theta) + \\sin^2(\\theta) = 1$, the circle equation with the coordinates renamed; it means knowing one of sine and cosine nearly pins down the other.',
              ),
              maths('\\cos^2(\\theta) = 1 - \\sin^2(\\theta) = 1 - \\tfrac{9}{25} = \\tfrac{16}{25}'),
              prose(
                'If $\\sin(\\theta) = \\tfrac{3}{5}$ then $\\cos(\\theta)$ is $\\tfrac{4}{5}$ or $-\\tfrac{4}{5}$: the square root leaves the sign open, and the sign comes from where the point is — sine is the height, positive in the upper half of the circle; cosine is the displacement, positive on the right.',
              ),
              maths(
                '\\sin(\\theta) = \\tfrac{3}{5}, \\quad 90^{\\circ} < \\theta < 180^{\\circ} \\quad \\Rightarrow \\quad \\cos(\\theta) = -\\tfrac{4}{5}',
              ),
              prose(
                'Between $90^{\\circ}$ and $180^{\\circ}$ the point is above the centre and to its left, so the sine is positive and the cosine negative; the quarter of the circle the angle lies in is the only extra information needed.',
              ),
            ),
            ask('trig-pythagorean'),
            ask('trig-quadrant-flow'),
            ask('trig-circle-coords'),
            teach(
              prose(
                'The lower half works the same way: between $180^{\\circ}$ and $270^{\\circ}$ the point is below and to the left, so both are negative; between $270^{\\circ}$ and $360^{\\circ}$ it is below and to the right.',
              ),
              maths(
                '\\cos(\\theta) = \\tfrac{5}{13}, \\quad 270^{\\circ} < \\theta < 360^{\\circ} \\quad \\Rightarrow \\quad \\sin(\\theta) = -\\tfrac{12}{13}',
              ),
              prose(
                'The fractions stay tidy because $5$, $12$ and $13$ are the sides of a right-angled triangle, like $3$, $4$ and $5$; every question here uses such a triple, so the arithmetic is never the hard part.',
              ),
              prose(
                'Give the answer as a fraction, with its sign; the fraction is the exact value, and a decimal read off a calculator usually is not.',
              ),
            ),
            ask('trig-pythagorean+choice', 2),
            ask('trig-evaluate-exact'),
            ask('trig-quadrant-flow', 2),
            teach(
              prose(
                'The identity is a check as well as a tool: any pair of values claimed for the sine and cosine of one angle must have squares adding to $1$, and if they do not, one of them is wrong.',
              ),
              maths('\\left(\\tfrac{5}{13}\\right)^2 + \\left(\\tfrac{12}{13}\\right)^2 = \\tfrac{25}{169} + \\tfrac{144}{169} = 1'),
              prose(
                'It also says neither value can exceed $1$ in size and the two cannot both be large: when one is $1$ the other is $0$, the point at the top of the circle or the far right, never both.',
              ),
            ),
            ask('trig-evaluate-exact+choice', 2),
            ask('trig-circle-coords', 2),
          ],
          skillCheck: [
            ask('trig-pythagorean', 2),
            ask('trig-pythagorean+choice', 2),
            ask('trig-quadrant-flow', 2),
          ],
        },
        {
          id: 'tf-l2-speed',
          title: 'Period and Speed',
          slides: [
            teach(
              prose(
                'How long one turn takes depends on how fast the point is going round. The two are reciprocals.',
              ),
              maths('\\text{period} = \\frac{1}{\\text{turns per second}}'),
              prose(
                'A wheel making $4$ turns per second has a period of $\\frac{1}{4}$ of a second. One making a turn every $4$ seconds has a period of $4$ seconds. Read the units carefully — those are very different wheels.',
              ),
              prose(
                'Often the count and the time come together. A wheel making $5$ turns in $12$ seconds shares the $12$ seconds between $5$ turns:',
              ),
              maths('\\text{period} = \\frac{12}{5} = 2.4 \\text{ seconds}'),
              prose(
                'Once the period is known, add it on to list the later turns: a valve at the top at $t = 1$, with a period of $3$ seconds, is there again at $1 + 3 = 4$, $4 + 3 = 7$ and $7 + 3 = 10$.',
              ),
            ),
            ask('trig-period-from-speed'),
            ask('trig-speed-comparison'),
            ask('trig-repeat-times'),
            teach(
              prose(
                'Turning faster squashes the graph horizontally. The peaks come closer together, but they are no higher.',
              ),
              prose(
                'This is the one transformation that changes the period. Amplitude and midline are untouched by it, because how fast the point goes round has no bearing on how far from the centre it is.',
              ),
              maths('\\text{double the speed} \\implies \\text{half the period}'),
              prose(
                'It follows that speed and period can never both go up. If a graph repeats more often, each repeat must be shorter.',
              ),
              prose(
                'On a graph the period is still the gap from one peak to the next: peaks at $t = 2$ and $t = 5$ are $5 - 2 = 3$ apart, so the period is $3$.',
              ),
            ),
            ask('trig-period-from-speed', 2),
            ask('trig-read-period'),
            ask('trig-speed-comparison', 2),
            teach(
              prose(
                'The general rate is written $b$, and it multiplies the input rather than the output.',
              ),
              maths('\\text{period of } \\sin(bt) = \\frac{\\text{period of } \\sin(t)}{b}'),
              prose(
                'So $b$ divides the period. Being inside the bracket, it behaves like the horizontal shift did: the effect on the graph is the reciprocal of what the number looks like.',
              ),
              prose(
                'Note that $\\sin(2t)$ is not $2\\sin(t)$. The first is twice as fast, the second is twice as tall. Where the number sits decides which.',
              ),
            ),
            ask('trig-read-period', 2),
            ask('trig-repeat-times', 2),
          ],
          skillCheck: [
            ask('trig-period-from-speed', 2),
            ask('trig-speed-comparison'),
            ask('trig-repeat-times', 2),
          ],
        },
      ],
      levelCheck: [
        ask('trig-sine-from-circle', 2),
        ask('trig-cosine-from-circle', 2),
        ask('trig-circle-coords', 2),
        ask('trig-height-steps', 2),
        ask('trig-related-angle', 2),
        ask('trig-quadrant-flow', 2),
        ask('trig-evaluate-tree', 2),
        ask('trig-pythagorean', 2),
        ask('trig-solve-height', 2),
        ask('trig-period-from-speed', 2),
        ask('trig-speed-comparison'),
        ask('trig-repeat-times', 2),
        ask('trig-evaluate-exact', 2),
        ask('trig-related-angle', 2),
        ask('trig-cosine-from-circle', 2),
      ],
    },
    {
      id: 'tf-l3',
      title: 'Graphs of Sine and Cosine',
      lessons: [
        {
          id: 'tf-l3-amplitude-shift',
          title: 'Amplitude and Vertical Shift',
          slides: [
            teach(
              prose(
                'Everything from Level 1 now attaches to a formula. In $y = a\\sin(t) + d$, the $a$ is the amplitude and the $d$ is the midline.',
              ),
              maths('y = a\\sin(t) + d'),
              // sin(t) dashed against y = 2sin(t) + 3, so a and d are visible
              // as the stretch and the lift rather than as two letters.
              graph({
                xMin: 0,
                xMax: 13,
                curves: [
                  { f: wave(0, 1, 2 * Math.PI, 0), dashed: true },
                  { f: wave(3, 2, 2 * Math.PI, 0), accent: true },
                ],
                horizontals: [3],
                yMin: -2,
                yMax: 6,
                label: 'sin t dashed, and 2 sin t + 3 stretched and lifted above it',
              }),
              prose(
                'The dashed curve is $\\sin(t)$ and the solid one is $2\\sin(t) + 3$. The $2$ stretched it to twice the height; the $3$ lifted the whole thing so it now swings about the dashed line at $3$ instead of about zero.',
              ),
              prose(
                'Since $\\sin(t)$ runs between $-1$ and $1$, multiplying by $a$ makes it run between $-a$ and $a$, and adding $d$ lifts that to between $d - a$ and $d + a$.',
              ),
            ),
            ask('trig-read-parameters'),
            ask('trig-wave-range'),
            ask('trig-match-graph'),
            teach(
              prose(
                'Reading the numbers back out is a matter of noticing where they sit. The multiplier in front is the amplitude; the number added on the end is the midline.',
              ),
              maths(
                '\\text{max} = d + a \\qquad \\text{min} = d - a \\qquad \\text{amplitude} = a',
              ),
              prose(
                'The trap is to read $d$ as part of the amplitude. It is not: $d$ decides where the curve sits, $a$ decides how far it swings, and changing one does not affect the other.',
              ),
            ),
            ask('trig-read-parameters', 2),
            ask('trig-wave-swing'),
            ask('trig-match-graph', 2),
            teach(
              prose(
                'A negative $a$ flips the curve upside down. $y = -3\\sin(t)$ starts by going *down* rather than up.',
              ),
              prose(
                'Its amplitude is still $3$, because amplitude is a distance. The maximum and minimum are unchanged too — the curve reaches the same heights, just in the other order.',
              ),
              maths('y = -3\\sin(t) \\quad \\text{has amplitude } 3'),
            ),
            ask('trig-wave-swing', 2),
            ask('trig-wave-range', 2),
          ],
          skillCheck: [
            ask('trig-match-graph', 2),
            ask('trig-read-parameters', 2),
            ask('trig-wave-range', 2),
          ],
        },
        {
          id: 'tf-l3-period-shift',
          title: 'Period and Horizontal Shift',
          slides: [
            teach(
              prose(
                'The two remaining parameters both live inside the bracket, and both therefore act in reverse.',
              ),
              maths('y = \\sin\\left(b(t - c)\\right)'),
              prose(
                'The $b$ divides the period: larger $b$ means faster repeats. The $c$ shifts the graph right, exactly as it did in Level 1. On a drawn graph the period is still the gap between consecutive peaks: peaks at $t = 1$ and $t = 5$ mean a period of $5 - 1 = 4$.',
              ),
              prose(
                'Writing it with $b$ outside the inner bracket is deliberate. It makes $c$ a genuine shift in $t$; in the expanded form $\\sin(bt - bc)$ the shift is much harder to see.',
              ),
            ),
            ask('trig-horizontal-shift'),
            ask('trig-period-from-speed'),
            ask('trig-read-period'),
            teach(
              prose(
                'The order to read them in is: $b$ squashes first, then $c$ slides the squashed graph.',
              ),
              prose(
                'Getting this backwards is a genuine error rather than a matter of taste. Sliding first and then squashing would drag the shift along with everything else and land the graph somewhere different.',
              ),
              maths('\\sin\\left(2(t - 3)\\right) \\ne \\sin(2t - 3)'),
              prose(
                'The left-hand side is shifted right by $3$; the right-hand side by only $\\frac{3}{2}$. Keeping $b$ factored out is what stops that confusion.',
              ),
              prose(
                'To find a value, work from the inside out: the bracket, then its sine, then the multiplier, then the shift. $\\sin(150^{\\circ}) = \\sin(30^{\\circ}) = \\tfrac{1}{2}$, since $150^{\\circ}$ is $30^{\\circ}$ short of a half turn; past a half turn the same values are negative, $\\sin(210^{\\circ}) = \\sin(330^{\\circ}) = -\\tfrac{1}{2}$. So $6\\sin(4x + 30) - 1$ at $x = 30$ is:',
              ),
              maths(
                '\\begin{aligned} 4(30) + 30 &= 150^{\\circ} \\\\ \\sin(150^{\\circ}) &= \\tfrac{1}{2} \\\\ 6 \\times \\tfrac{1}{2} &= 3 \\\\ 3 - 1 &= 2 \\end{aligned}',
              ),
            ),
            ask('trig-horizontal-shift', 2),
            ask('trig-evaluate-wave-tree', 2),
            ask('trig-read-parameters'),
            teach(
              prose(
                'Neither of these touches the vertical picture. Squashing and sliding leave the amplitude and the midline exactly where they were.',
              ),
              prose(
                'That gives a reliable way to take a graph apart: read the height first, since $a$ and $d$ are unaffected by anything inside the bracket, and only then work out what has been done to the input.',
              ),
            ),
            ask('trig-period-from-speed', 2),
            ask('trig-read-parameters', 2),
          ],
          skillCheck: [
            ask('trig-horizontal-shift', 2),
            ask('trig-period-from-speed', 2),
            ask('trig-read-parameters', 2),
          ],
        },
        {
          id: 'tf-l3-period-formula',
          title: 'Reading the Period from the Formula',
          slides: [
            teach(
              prose(
                'The previous lesson said $b$ divides the period; with $t$ in degrees the arithmetic is concrete. $\\sin(t)$ repeats every $360^{\\circ}$, so $\\sin(bt)$ repeats every $360^{\\circ}$ divided by $b$.',
              ),
              maths('\\text{period of } \\sin(bt) = \\frac{360^{\\circ}}{b}'),
              graph({
                xMin: 0,
                xMax: 360,
                curves: [
                  { f: wave(0, 1, 360, 0), dashed: true },
                  { f: wave(0, 1, 120, 0), accent: true },
                ],
                verticals: [{ x: 120 }, { x: 240 }],
                label: 'sin t dashed against sin 3t, which fits three cycles into one turn',
              }),
              prose(
                'The dashed curve is $\\sin(t)$ and the solid one is $\\sin(3t)$; three complete cycles of the solid curve fit into one cycle of the dashed one, so each is a third as long: $360^{\\circ} \\div 3 = 120^{\\circ}$, and the dashed verticals mark where each cycle ends.',
              ),
              prose('Read $b$ as a count: how many cycles fit into one turn.'),
            ),
            ask('trig-period-from-b'),
            ask('trig-match-graph'),
            ask('trig-wave-range'),
            teach(
              prose(
                'Only what is inside the bracket changes the period; in $y = 4\\sin(3t) + 2$ the $4$ sets the height and the $2$ lifts the curve, but the period is still $120^{\\circ}$.',
              ),
              prose(
                'The formula runs backwards just as easily: a curve known to repeat every $90^{\\circ}$ fits four cycles into a turn, so $b = 4$.',
              ),
              maths('b = \\frac{360^{\\circ}}{\\text{period}} = \\frac{360^{\\circ}}{90^{\\circ}} = 4'),
              prose(
                'You do not have to simplify. If the period is $360^{\\circ} \\div 3$, typing $\\frac{360}{3}$ is accepted just as $120$ is, because the checker compares the value rather than how it is written. The same holds the other way round: for $b$, typing $\\frac{360}{120}$ is accepted as $3$.',
              ),
            ),
            ask('trig-period-from-b+choice', 2),
            ask('trig-period-from-speed', 2),
            ask('trig-match-graph', 2),
            teach(
              prose(
                'This is the wheel from Level 2 in a new coat: a wheel making more turns per second has a shorter period, and $b$ counts cycles per turn in exactly the same way.',
              ),
              maths('b \\times \\text{period} = 360^{\\circ}'),
              prose(
                'That product is a check worth a second: if $b$ and the period do not multiply to a full turn, one of them has been misread; and $\\sin(2t)$ is still not $2\\sin(t)$ — the first repeats twice as often, the second is twice as tall.',
              ),
            ),
            ask('trig-period-from-speed'),
            ask('trig-wave-range', 2),
          ],
          skillCheck: [
            ask('trig-period-from-b', 2),
            ask('trig-match-graph', 2),
            ask('trig-period-from-speed', 2),
          ],
        },
        {
          id: 'tf-l3-together',
          title: 'Putting It Together',
          slides: [
            teach(
              prose(
                'All four parameters at once. Each one does a single job, and they do not interfere with each other.',
              ),
              maths('y = a\\sin\\left(b(t - c)\\right) + d'),
              prose(
                'The $a$ sets the amplitude and $d$ the midline; the $b$ sets the period and $c$ the shift. Outside the bracket is vertical, inside is horizontal.',
              ),
              prose(
                'Inside also means reversed: a larger $b$ gives a shorter period, and subtracting $c$ moves the graph right.',
              ),
            ),
            ask('trig-evaluate-wave'),
            ask('trig-read-parameters', 2),
            ask('trig-wave-range', 2),
            teach(
              prose(
                'To evaluate one of these at a particular angle, work from the inside out, in the order the operations actually apply.',
              ),
              prose(
                'Take the sine of the angle first. Then multiply by the amplitude. Only then add the vertical shift.',
              ),
              maths('4\\sin(30^{\\circ}) + 5 = 4 \\times 0.5 + 5 = 7'),
              prose(
                'Adding before multiplying is the usual slip and gives $4 \\times 5.5 = 22$, which is not even within reach of the curve — its maximum is $9$.',
              ),
            ),
            ask('trig-evaluate-exact'),
            ask('trig-evaluate-exact+choice', 2),
            ask('trig-read-parameters'),
            teach(
              prose(
                'A useful check: the answer must lie between $d - a$ and $d + a$. Sine never leaves $[-1, 1]$, so the curve never leaves that band.',
              ),
              prose(
                'It costs a second and catches sign errors, order-of-operation errors, and misread parameters all at once. If the value is outside the band, something has gone wrong before the arithmetic.',
              ),
            ),
            ask('trig-evaluate-wave', 2),
            ask('trig-wave-range'),
          ],
          skillCheck: [
            ask('trig-evaluate-exact', 2),
            ask('trig-wave-range', 2),
            ask('trig-read-parameters', 2),
          ],
        },
      ],
      levelCheck: [
        ask('trig-read-parameters', 2),
        ask('trig-wave-range', 2),
        ask('trig-match-graph', 2),
        ask('trig-evaluate-exact', 2),
        ask('trig-horizontal-shift', 2),
        ask('trig-period-from-speed', 2),
        ask('trig-period-from-b', 2),
        ask('trig-wave-swing', 2),
        ask('trig-read-graph', 2),
        ask('trig-evaluate-exact+choice', 2),
        ask('trig-period-from-b+choice', 2),
        ask('trig-amplitude', 2),
        ask('trig-midline', 2),
        ask('trig-evaluate-wave', 2),
        ask('trig-read-parameters', 2),
      ],
    },
    {
      id: 'tf-l4',
      title: 'Radians',
      lessons: [
        {
          id: 'tf-l4-radian',
          title: 'What a Radian Is',
          slides: [
            teach(
              prose(
                'Degrees split a turn into $360$ because $360$ divides so many ways, a choice made thousands of years ago. A **radian** measures an angle with the circle itself instead.',
              ),
              { kind: 'diagram', svg: radianSvg(1, 'A circle with an arc exactly one radius long, and the angle it makes at the centre') },
              prose(
                'Bend the radius round the edge of the circle. The angle that arc makes at the centre is **one radian**, whatever the size of the circle.',
              ),
              maths('\\theta = \\frac{s}{r} \\qquad \\text{arc length} \\div \\text{radius}'),
              prose(
                'So an angle in radians counts how many radii fit along the arc: $10$ cm of arc on a radius of $4$ cm is $2.5$ radii, or $2.5$ radians. One radian is just under a sixth of a turn, a little over $57^{\\circ}$.',
              ),
            ),
            ask('trig-rad-arc-angle'),
            ask('trig-rad-arc-angle+choice'),
            ask('trig-rad-compare'),
            teach(
              prose(
                'The circumference of a circle is $2\\pi r$, so exactly $2\\pi$ radii fit round it. A full turn is therefore $2\\pi$ radians, about $6.28$.',
              ),
              maths('360^{\\circ} = 2\\pi \\qquad 180^{\\circ} = \\pi \\qquad 90^{\\circ} = \\frac{\\pi}{2}'),
              prose(
                'Any fraction of a turn is that fraction of $2\\pi$: a third of a turn is $\\frac{2\\pi}{3}$, three quarters is $\\frac{3\\pi}{2}$. Answers are usually left as a multiple of $\\pi$, typed with the $\\pi$ key, because $\\pi$ is not a tidy decimal.',
              ),
              prose(
                'A clock hand works the same way. The hour hand goes once round in $12$ hours, so in $4$ hours it turns $\\frac{4}{12} = \\frac{1}{3}$ of a turn; the minute hand does the same with $60$ minutes to a turn:',
              ),
              maths('\\frac{1}{3} \\times 2\\pi = \\frac{2\\pi}{3}'),
            ),
            ask('trig-rad-from-turn'),
            ask('trig-rad-compare'),
            ask('trig-rad-from-turn+choice'),
            teach(
              prose(
                'The waves of level 3 look exactly the same with the axis in radians; only the numbers along the bottom change. One cycle of $\\sin(x)$ now ends at $2\\pi$, not at $360$.',
              ),
              graph({
                xMin: 0,
                xMax: 6.5,
                curves: [{ f: Math.sin, accent: true }],
                verticals: [1, 2, 3, 4].map((q) => ({ x: (q * Math.PI) / 2, dashed: true })),
                yMin: -1.5,
                yMax: 1.5,
                label: 'One cycle of sin x with the axis in radians, dashed lines at each quarter turn',
              }),
              prose(
                'The dashed lines are the quarter turns, $\\frac{\\pi}{2} \\approx 1.57$, $\\pi \\approx 3.14$, $\\frac{3\\pi}{2} \\approx 4.71$ and $2\\pi \\approx 6.28$. An angle written with no degree sign is in radians.',
              ),
              prose(
                'To place an angle on that axis, put about $3.14$ in for $\\pi$. Take $\\frac{5\\pi}{6}$:',
              ),
              maths('\\frac{5\\pi}{6} \\approx \\frac{5 \\times 3.14}{6} \\approx 2.62'),
              prose(
                'That is past $\\frac{\\pi}{2} \\approx 1.57$ and short of $\\pi \\approx 3.14$, so it sits between the first two dashed lines.',
              ),
            ),
            ask('trig-rad-place'),
            ask('trig-rad-place'),
          ],
          skillCheck: [
            ask('trig-rad-arc-angle'),
            ask('trig-rad-from-turn'),
            ask('trig-rad-compare'),
          ],
        },
        {
          id: 'tf-l4-converting',
          title: 'Converting Degrees and Radians',
          slides: [
            teach(
              prose(
                'Half a turn is $180^{\\circ}$ and also $\\pi$ radians. Every conversion comes from that one fact.',
              ),
              maths('180^{\\circ} = \\pi \\quad \\Rightarrow \\quad 1^{\\circ} = \\frac{\\pi}{180}'),
              prose(
                'To go from degrees to radians, multiply by $\\frac{\\pi}{180}$ and cancel the fraction as far as it goes.',
              ),
              maths('150^{\\circ} \\times \\frac{\\pi}{180} = \\frac{150\\pi}{180} = \\frac{5\\pi}{6}'),
            ),
            ask('trig-rad-from-degrees'),
            ask('trig-rad-from-degrees+choice'),
            teach(
              prose(
                'The other way round, put $180^{\\circ}$ where the $\\pi$ is. That is the same as multiplying by $\\frac{180}{\\pi}$.',
              ),
              maths('\\frac{5\\pi}{6} \\times \\frac{180}{\\pi} = \\frac{5 \\times 180^{\\circ}}{6} = 150^{\\circ}'),
              prose(
                'Dividing first is often kinder: $\\frac{\\pi}{6}$ is $180^{\\circ} \\div 6 = 30^{\\circ}$, and $\\frac{5\\pi}{6}$ is five of those:',
              ),
              maths('\\frac{5\\pi}{6} = 5 \\times 30^{\\circ} = 150^{\\circ}'),
            ),
            ask('trig-rad-to-degrees'),
            ask('trig-rad-convert-tiles'),
            ask('trig-rad-unit-tree'),
            ask('trig-rad-to-degrees+choice'),
            teach(
              prose(
                'A quick check catches a factor used upside down. Degree numbers are big and radian numbers small: $150^{\\circ}$ is about $2.6$ radians, so a conversion that lands on thousands has gone the wrong way.',
              ),
              maths(
                '30^{\\circ} = \\frac{\\pi}{6} \\qquad 45^{\\circ} = \\frac{\\pi}{4} \\qquad 60^{\\circ} = \\frac{\\pi}{3} \\qquad 90^{\\circ} = \\frac{\\pi}{2}',
              ),
              prose(
                'These four are worth knowing on sight. They are the special angles of level 2 under new names, and every other common angle is a multiple of one of them.',
              ),
            ),
            ask('trig-rad-unit-tree', 2),
            ask('trig-rad-convert-tiles', 2),
          ],
          skillCheck: [
            ask('trig-rad-from-degrees'),
            ask('trig-rad-to-degrees'),
            ask('trig-rad-unit-tree', 2),
          ],
        },
        {
          id: 'tf-l4-exact',
          title: 'Exact Values in Radians',
          slides: [
            teach(
              prose(
                'The special angles keep their exact values; only their names change. Level 2 used the values $0$, $\\frac{1}{2}$ and $1$, and two more complete the set.',
              ),
              maths(
                '\\begin{array}{c|ccccc} \\theta & 0 & \\frac{\\pi}{6} & \\frac{\\pi}{4} & \\frac{\\pi}{3} & \\frac{\\pi}{2} \\\\ \\hline \\sin(\\theta) & 0 & \\frac{1}{2} & \\frac{\\sqrt{2}}{2} & \\frac{\\sqrt{3}}{2} & 1 \\\\ \\cos(\\theta) & 1 & \\frac{\\sqrt{3}}{2} & \\frac{\\sqrt{2}}{2} & \\frac{1}{2} & 0 \\end{array}',
              ),
              prose(
                'The cosine row is the sine row backwards: as the point climbs the circle its height grows while its sideways distance shrinks. Past $\\frac{\\pi}{2}$ the sizes repeat and only the sign changes, and converting to degrees is always a safe way in.',
              ),
              prose(
                'Take $\\cos\\left(\\frac{2\\pi}{3}\\right)$. Put $180^{\\circ}$ for $\\pi$: $\\frac{2 \\times 180^{\\circ}}{3} = 120^{\\circ}$. That is $60^{\\circ}$ short of a half turn, so the size comes from the $60^{\\circ}$ column, $\\frac{1}{2}$. The point is left of the centre, so the displacement is negative:',
              ),
              maths('\\cos\\left(\\frac{2\\pi}{3}\\right) = \\cos(120^{\\circ}) = -\\frac{1}{2}'),
              prose(
                'Below the centre the height is negative instead: $\\frac{7\\pi}{6} = 210^{\\circ}$ is $30^{\\circ}$ past a half turn, so $\\sin\\left(\\frac{7\\pi}{6}\\right) = -\\frac{1}{2}$. And $\\frac{5\\pi}{3} = 300^{\\circ}$ is $60^{\\circ}$ short of a full turn, below the centre and to its right, so $\\cos\\left(\\frac{5\\pi}{3}\\right) = \\frac{1}{2}$ while $\\sin\\left(\\frac{5\\pi}{3}\\right) = -\\frac{\\sqrt{3}}{2}$.',
              ),
            ),
            ask('trig-rad-to-degrees+choice'),
            ask('trig-rad-value-tree'),
            ask('trig-rad-exact-value'),
            teach(
              prose(
                'The sign still comes from where the point is. In radians the quarter-turn marks are $\\frac{\\pi}{2}$, $\\pi$ and $\\frac{3\\pi}{2}$, and writing the angle over the same denominator makes the comparison easy.',
              ),
              prose(
                'Take $\\frac{5\\pi}{4} = \\frac{15\\pi}{12}$. The marks either side of it are $\\pi = \\frac{12\\pi}{12}$ and $\\frac{3\\pi}{2} = \\frac{18\\pi}{12}$:',
              ),
              maths('\\frac{12\\pi}{12} < \\frac{15\\pi}{12} < \\frac{18\\pi}{12}'),
              prose(
                'So the point is below the centre and to its left, and both $\\sin$ and $\\cos$ are negative there. An angle past $2\\pi$ is a full turn and then some, so take the $2\\pi$ off; a negative angle turns clockwise, so add $2\\pi$.',
              ),
            ),
            ask('trig-rad-quadrant-flow'),
            ask('trig-rad-exact-value'),
            ask('trig-rad-value-tree'),
            teach(
              prose(
                'On a graph in radians the features of $\\sin(x)$ land on the quarter-turn marks: its peak at $\\frac{\\pi}{2}$, down through the axis at $\\pi$, its trough at $\\frac{3\\pi}{2}$, and back to the start at $2\\pi$.',
              ),
              graph({
                xMin: 0,
                xMax: 6.5,
                curves: [
                  { f: Math.sin, accent: true },
                  { f: Math.cos, dashed: true },
                ],
                verticals: [1, 2, 3, 4].map((q) => ({ x: (q * Math.PI) / 2, dashed: true })),
                yMin: -1.5,
                yMax: 1.5,
                label: 'sin x solid and cos x dashed over one turn, with dashed lines at each quarter turn',
              }),
              prose(
                'The dashed curve is $\\cos(x)$, a quarter turn ahead: its peak is at $0$ and its trough at $\\pi$. Stretching either curve taller moves none of these points.',
              ),
            ),
            ask('trig-rad-graph-slider'),
            ask('trig-rad-quadrant-flow', 2),
          ],
          skillCheck: [
            ask('trig-rad-exact-value'),
            ask('trig-rad-value-tree'),
            ask('trig-rad-quadrant-flow'),
          ],
        },
        {
          id: 'tf-l4-arc-sector',
          title: 'Arc Length and Sector Area',
          slides: [
            teach(
              prose(
                'The definition of a radian runs straight into a formula. If the angle is the arc divided by the radius, the arc is the radius times the angle.',
              ),
              maths('\\theta = \\frac{s}{r} \\quad \\Rightarrow \\quad s = r\\theta'),
              { kind: 'diagram', svg: radianSvg((2 * Math.PI) / 3, 'A sector with an angle of two thirds of pi and its arc highlighted', true) },
              prose(
                'For a radius of $6$ cm and an angle of $\\frac{2\\pi}{3}$, the arc is $6 \\times \\frac{2\\pi}{3} = 4\\pi$ cm. That is the whole method, and it only works with the angle in radians.',
              ),
            ),
            ask('trig-rad-arc-length'),
            ask('trig-rad-arc-angle+choice'),
            ask('trig-rad-arc-length+choice'),
            teach(
              prose(
                'A sector with angle $\\theta$ is $\\frac{\\theta}{2\\pi}$ of the whole circle, so its area is that share of $\\pi r^2$.',
              ),
              maths('A = \\frac{\\theta}{2\\pi} \\times \\pi r^2 = \\frac{1}{2}r^2\\theta'),
              prose(
                'Written with the arc it is $A = \\frac{1}{2}rs$: a triangle with the arc as its base and the radius as its height. A thin sector nearly is one, which makes the half easy to remember.',
              ),
            ),
            ask('trig-rad-sector-area'),
            ask('trig-rad-sector-tree'),
            ask('trig-rad-sector-area+choice'),
            teach(
              prose(
                'When the angle arrives in degrees, convert it first. Both formulas are built on radians, and feeding in $60$ rather than $\\frac{\\pi}{3}$ makes the answer about $57$ times too big.',
              ),
              maths('60^{\\circ} = \\frac{\\pi}{3} \\quad \\Rightarrow \\quad s = r \\times \\frac{\\pi}{3}'),
              prose(
                'So every sector question is the same two decisions: is the angle in radians yet, and does the question want the curved edge or the space inside?',
              ),
            ),
            ask('trig-rad-formula-flow'),
            ask('trig-rad-sector-tree', 2),
          ],
          skillCheck: [
            ask('trig-rad-arc-length', 2),
            ask('trig-rad-sector-area'),
            ask('trig-rad-sector-tree'),
          ],
        },
      ],
      levelCheck: [
        ask('trig-rad-arc-angle', 2),
        ask('trig-rad-compare', 2),
        ask('trig-rad-from-turn', 2),
        ask('trig-rad-place', 2),
        ask('trig-rad-from-degrees', 2),
        ask('trig-rad-to-degrees', 2),
        ask('trig-rad-convert-tiles', 2),
        ask('trig-rad-unit-tree', 2),
        ask('trig-rad-exact-value', 2),
        ask('trig-rad-quadrant-flow', 2),
        ask('trig-rad-value-tree', 2),
        ask('trig-rad-graph-slider', 2),
        ask('trig-rad-arc-length', 2),
        ask('trig-rad-sector-area+choice', 2),
        ask('trig-rad-sector-tree', 2),
      ],
    },
    {
      id: 'tf-l5',
      title: 'Tangent & the Reciprocal Functions',
      lessons: [
        {
          id: 'tf-l5-tangent',
          title: 'Tangent as Sine over Cosine',
          slides: [
            teach(
              prose(
                'Sine and cosine are the height and the sideways distance of a point going round a circle. Divide one by the other and you get the third ratio, the **tangent**.',
              ),
              maths('\\tan(\\theta) = \\frac{\\sin(\\theta)}{\\cos(\\theta)}'),
              { kind: 'diagram', svg: tangentSvg() },
              prose(
                'For a point $(x, y)$ on a circle of radius $r$, $\\sin(\\theta) = \\frac{y}{r}$ and $\\cos(\\theta) = \\frac{x}{r}$. Dividing cancels the $r$ and leaves $\\tan(\\theta) = \\frac{y}{x}$: up over across, the **gradient** of the radius.',
              ),
              prose(
                'The coordinates keep their signs, so a point to the left of the centre has a negative $x$, and the fraction carries that minus sign.',
              ),
            ),
            ask('trig-tan-from-point'),
            ask('trig-tan-quotient-tiles'),
            ask('trig-tan-from-point+choice'),
            teach(
              prose(
                'A fraction with zero on the bottom has no value. Cosine is zero at $90^{\\circ}$ and $270^{\\circ}$, where the point is straight above or below the centre, so $\\tan$ is **undefined** there: a vertical radius has no gradient.',
              ),
              maths('\\tan(90^{\\circ}) \\text{ and } \\tan(270^{\\circ}) \\text{ are undefined}'),
              prose(
                'Zero on *top* is different. At $0^{\\circ}$ and $180^{\\circ}$ the sine is zero, the radius lies flat, and $\\tan$ is simply $0$.',
              ),
            ),
            ask('trig-tan-undefined'),
            ask('trig-tan-quotient-tiles', 2),
            ask('trig-tan-undefined', 2),
            teach(
              prose(
                'The sign of $\\tan$ comes from the signs of sine and cosine. The same signs divide to a positive, opposite signs to a negative.',
              ),
              maths(
                '\\begin{array}{c|cccc} \\text{quarter} & 1\\text{st} & 2\\text{nd} & 3\\text{rd} & 4\\text{th} \\\\ \\hline \\sin & + & + & - & - \\\\ \\cos & + & - & - & + \\\\ \\tan & + & - & + & - \\end{array}',
              ),
              prose(
                'So $\\tan$ is positive in the first and third quarters, where the radius slopes upwards, and negative in the second and fourth, where it slopes down.',
              ),
            ),
            ask('trig-tan-sign-flow'),
            ask('trig-tan-sign-flow', 2),
          ],
          skillCheck: [
            ask('trig-tan-from-point', 2),
            ask('trig-tan-undefined', 2),
            ask('trig-tan-sign-flow', 2),
          ],
        },
        {
          id: 'tf-l5-tan-graph',
          title: 'The Graph of Tangent',
          slides: [
            teach(
              prose(
                'Plot $y = \\tan(x)$ and something new appears. The curve rises from zero, then climbs faster and faster as $x$ nears $90^{\\circ}$, where cosine reaches zero and $\\tan$ has no value.',
              ),
              graph({
                xMin: 0,
                xMax: 360,
                curves: [{ f: inDegrees(Math.tan), accent: true, breaks: true }],
                verticals: [{ x: 90 }, { x: 270 }],
                yMin: -4,
                yMax: 4,
                label: 'y = tan x from 0 to 360 degrees, with dashed asymptotes at 90 and 270 degrees',
              }),
              prose(
                'The dashed lines are **asymptotes**: the curve gets ever closer to them but never reaches them. On the far side it comes back from far below and makes the same climb again.',
              ),
              prose(
                'So $\\tan$ repeats every $180^{\\circ}$, half the period of sine and cosine. It has no amplitude either, since it has no highest or lowest value at all.',
              ),
              prose(
                'Its asymptotes are where the angle inside is $90^{\\circ}$, $270^{\\circ}$, $450^{\\circ}$ and so on, and it crosses the axis where the angle is $180^{\\circ}$, $360^{\\circ}$ and so on. With a number multiplying $x$, solve for $x$. For $y = \\tan(15x)$ the first asymptote is where $15x = 90^{\\circ}$, the second where $15x = 270^{\\circ}$, and the first crossing after $0$ where $15x = 180^{\\circ}$:',
              ),
              maths(
                '\\begin{gathered} x = 90^{\\circ} \\div 15 = 6^{\\circ} \\\\ x = 270^{\\circ} \\div 15 = 18^{\\circ} \\\\ x = 180^{\\circ} \\div 15 = 12^{\\circ} \\end{gathered}',
              ),
              prose(
                'A number in front, as in $3\\tan(15x)$, stretches the curve upwards but moves no asymptote and no crossing. The $15$ fits $15$ repeats into the space of one, so the period is a fifteenth of $180^{\\circ}$:',
              ),
              maths('\\begin{gathered} \\text{period of } \\tan(bx) = \\frac{180^{\\circ}}{b} \\\\ \\frac{180^{\\circ}}{15} = 12^{\\circ} \\end{gathered}'),
            ),
            ask('trig-tan-period'),
            ask('trig-tan-asymptote-slider'),
            ask('trig-tan-period+choice'),
            teach(
              prose(
                'The asymptotes sit one period apart, the first halfway through the first period. Written all at once, with $k$ standing for any whole number:',
              ),
              maths('\\begin{aligned} 15x &= 90^{\\circ} + 180^{\\circ} \\times k \\\\ x &= 6^{\\circ} + 12^{\\circ} \\times k \\end{aligned}'),
              graph({
                xMin: 0,
                xMax: 360,
                curves: [{ f: inDegrees((x) => Math.tan(2 * x)), accent: true, breaks: true }],
                verticals: [45, 135, 225, 315].map((x) => ({ x })),
                yMin: -4,
                yMax: 4,
                label: 'y = tan 2x from 0 to 360 degrees, with dashed asymptotes every 90 degrees from 45',
              }),
              prose(
                'A graph runs this backwards. Measure the gap from one asymptote to the next, or from one crossing to the next: that is the period, and $b = \\frac{180^{\\circ}}{\\text{period}}$. The curve above has asymptotes $90^{\\circ}$ apart, so $b = \\frac{180}{90} = 2$ and it is $\\tan(2x)$. A gap of $360^{\\circ}$ would give $b = \\frac{1}{2}$, written $\\tan\\left(\\frac{x}{2}\\right)$.',
              ),
            ),
            ask('trig-tan-asymptote-tiles'),
            ask('trig-tan-graph-match'),
            ask('trig-tan-asymptote-slider'),
            teach(
              prose(
                'In radians half a turn is $\\pi$, so $\\tan(x)$ repeats every $\\pi$ and its asymptotes are at $\\frac{\\pi}{2}$, $\\frac{3\\pi}{2}$ and so on.',
              ),
              maths('\\text{period of } \\tan(bx) = \\frac{\\pi}{b}'),
              maths('\\text{asymptotes at } x = \\frac{\\pi}{2b} + \\frac{\\pi}{b} \\times k'),
              prose(
                'For $\\tan(7x)$ that is a period of $\\frac{\\pi}{7}$ and a first asymptote at $\\frac{\\pi}{14}$, the next at $\\frac{\\pi}{14} + \\frac{\\pi}{7} = \\frac{3\\pi}{14}$. Every question about the tangent graph comes back to these two numbers: where the first asymptote is, and how far apart they are.',
              ),
            ),
            ask('trig-tan-graph-match', 2),
            ask('trig-tan-asymptote-tiles', 2),
          ],
          skillCheck: [
            ask('trig-tan-asymptote-slider', 2),
            ask('trig-tan-period', 2),
            ask('trig-tan-asymptote-tiles', 2),
          ],
        },
        {
          id: 'tf-l5-tan-exact',
          title: 'Exact Values and Solving tan x = k',
          slides: [
            teach(
              prose('Dividing the special values of sine by those of cosine gives the tangent of each special angle.'),
              maths(
                '\\begin{array}{c|cccc} \\theta & 0 & 30^{\\circ} & 45^{\\circ} & 60^{\\circ} \\\\ \\hline \\tan(\\theta) & 0 & \\frac{1}{\\sqrt{3}} & 1 & \\sqrt{3} \\end{array}',
              ),
              prose(
                'For example $\\tan(60^{\\circ}) = \\frac{\\sqrt{3}}{2} \\div \\frac{1}{2} = \\sqrt{3}$, and $\\tan(30^{\\circ})$ is the same division the other way up. In radians the angles are $0$, $\\frac{\\pi}{6}$, $\\frac{\\pi}{4}$ and $\\frac{\\pi}{3}$.',
              ),
              prose(
                'Any other special angle has the same size of tangent as its **reference angle**, the acute angle between its radius and the horizontal axis, with the sign of its quarter. $\\tan(240^{\\circ})$ has reference angle $60^{\\circ}$ and lies in the third quarter, so it is $\\sqrt{3}$.',
              ),
            ),
            ask('trig-tan-exact'),
            ask('trig-tan-value-tree'),
            ask('trig-tan-exact', 2),
            teach(
              prose(
                'Solving $\\tan(x) = k$ runs the table backwards. $\\tan(x) = 1$ has the solution $45^{\\circ}$ straight from the table.',
              ),
              prose(
                'Because $\\tan$ repeats every $180^{\\circ}$, adding $180^{\\circ}$ gives another, $225^{\\circ}$. In a full turn there are exactly two solutions, half a turn apart.',
              ),
              maths('\\tan(x) = 1 \\quad \\Rightarrow \\quad x = 45^{\\circ} \\text{ or } 225^{\\circ}'),
              prose(
                'For a negative $k$ the table angle is negative: $\\tan(-45^{\\circ}) = -1$. Add $180^{\\circ}$ until the answers land in the interval asked for, here $135^{\\circ}$ and $315^{\\circ}$.',
              ),
            ),
            ask('trig-tan-solve'),
            ask('trig-tan-solve-slider'),
            ask('trig-tan-value-tree', 2),
            teach(
              prose(
                'On the graph, the solutions are where the horizontal line $y = k$ crosses the curve. Every branch crosses it exactly once, and the branches are $180^{\\circ}$ apart.',
              ),
              graph({
                xMin: 0,
                xMax: 540,
                curves: [{ f: inDegrees(Math.tan), accent: true, breaks: true }],
                horizontals: [1],
                marks: [45, 225, 405].map((x) => ({ x, y: 1 })),
                yMin: -3,
                yMax: 3,
                label: 'y = tan x from 0 to 540 degrees crossing the dashed line y = 1 at 45, 225 and 405 degrees',
              }),
              prose(
                'The interval decides which crossings count. For $-180^{\\circ} < x \\le 180^{\\circ}$, take the one from the table and the one half a turn before or after it; in radians the step is $\\pi$. An equation such as $3\\tan(x) = 3$ is first divided down to $\\tan(x) = 1$.',
              ),
            ),
            ask('trig-tan-solve', 2),
            ask('trig-tan-solve-slider', 2),
          ],
          skillCheck: [
            ask('trig-tan-exact', 2),
            ask('trig-tan-value-tree', 2),
            ask('trig-tan-solve', 2),
          ],
        },
        {
          id: 'tf-l5-reciprocal',
          title: 'Secant, Cosecant and Cotangent',
          slides: [
            teach(
              prose('Three more ratios complete the set. Each is one over a ratio you already know.'),
              maths('\\sec(\\theta) = \\frac{1}{\\cos(\\theta)}'),
              maths('\\operatorname{cosec}(\\theta) = \\frac{1}{\\sin(\\theta)}'),
              maths('\\cot(\\theta) = \\frac{1}{\\tan(\\theta)} = \\frac{\\cos(\\theta)}{\\sin(\\theta)}'),
              prose(
                'The pairing looks back to front, so go by the **third letter**: se**c** goes with **c**osine, co**s**ec with **s**ine, and co**t** with **t**angent.',
              ),
              prose(
                'To evaluate one exactly, find the ratio underneath and turn it over. One over a fraction is the fraction upside down, and its sign stays as it was:',
              ),
              maths('\\begin{aligned} \\sec(60^{\\circ}) &= \\frac{1}{\\cos(60^{\\circ})} \\\\ &= 1 \\div \\frac{1}{2} = 2 \\end{aligned}'),
              maths(
                '\\begin{aligned} \\tan(150^{\\circ}) &= -\\frac{1}{\\sqrt{3}} \\\\ \\cot(150^{\\circ}) &= 1 \\div \\left(-\\frac{1}{\\sqrt{3}}\\right) \\\\ &= -\\sqrt{3} \\end{aligned}',
              ),
              prose(
                'Where $\\tan$ has no value, use cosine over sine: $\\cot(90^{\\circ}) = \\frac{\\cos(90^{\\circ})}{\\sin(90^{\\circ})} = \\frac{0}{1} = 0$.',
              ),
            ),
            ask('trig-recip-exact'),
            ask('trig-recip-tree'),
            ask('trig-recip-exact+choice'),
            teach(
              prose(
                'The same works for any fraction: if $\\sin(\\theta) = \\frac{3}{5}$ then $\\operatorname{cosec}(\\theta) = \\frac{5}{3}$, and if $\\cos(\\theta) = -\\frac{4}{5}$ then $\\sec(\\theta) = -\\frac{5}{4}$.',
              ),
              prose('For $\\cot$, divide cosine by sine, and their common denominator cancels:'),
              maths('\\cot(\\theta) = -\\frac{4}{5} \\div \\frac{3}{5} = -\\frac{4}{3}'),
            ),
            ask('trig-recip-from-values'),
            ask('trig-recip-tree', 2),
            ask('trig-recip-from-values', 2),
            teach(
              prose(
                'Each is undefined where the ratio on the bottom is zero. Written with sine and cosine, $\\sec$ has $\\cos$ on the bottom, while $\\operatorname{cosec}$ and $\\cot$ both have $\\sin$.',
              ),
              maths('\\sec \\text{ is undefined at } 90^{\\circ} \\text{ and } 270^{\\circ}'),
              maths('\\operatorname{cosec}, \\ \\cot \\text{ are undefined at } 0^{\\circ} \\text{ and } 180^{\\circ}'),
              prose(
                'Watch $\\cot(90^{\\circ})$. $\\tan(90^{\\circ})$ is undefined, but $\\cot(90^{\\circ}) = \\frac{\\cos(90^{\\circ})}{\\sin(90^{\\circ})} = \\frac{0}{1} = 0$, so writing it as cosine over sine is the safe way to decide.',
              ),
            ),
            ask('trig-recip-undefined-flow'),
            ask('trig-recip-undefined-flow', 2),
          ],
          skillCheck: [
            ask('trig-recip-exact', 2),
            ask('trig-recip-tree', 2),
            ask('trig-recip-undefined-flow', 2),
          ],
        },
        {
          id: 'tf-l5-recip-graphs',
          title: 'Reciprocal Graphs and Two Identities',
          slides: [
            teach(
              prose(
                'Turning a graph over, value by value, gives the graph of its reciprocal. Where $\\cos(x)$ is $1$, so is $\\sec(x)$; as $\\cos(x)$ shrinks towards zero, $\\sec(x)$ grows without limit; where $\\cos(x)$ is zero, $\\sec(x)$ has an asymptote.',
              ),
              graph({
                xMin: 0,
                xMax: 360,
                curves: [
                  { f: inDegrees(Math.cos), dashed: true },
                  { f: inDegrees((x) => 1 / Math.cos(x)), accent: true, breaks: true },
                ],
                verticals: [{ x: 90 }, { x: 270 }],
                yMin: -4,
                yMax: 4,
                label: 'cos x dashed, and sec x solid, with asymptotes at 90 and 270 degrees',
              }),
              prose(
                'So $\\sec(x)$ is a chain of U shapes that never gets between $-1$ and $1$. $\\operatorname{cosec}(x)$ is the same shape following sine instead, with asymptotes at $0^{\\circ}$, $180^{\\circ}$ and $360^{\\circ}$, and $\\cot(x)$ falls from one asymptote to the next where $\\tan(x)$ rises.',
              ),
            ),
            ask('trig-recip-graph-match'),
            ask('trig-recip-undefined-flow', 2),
            ask('trig-recip-graph-match', 2),
            teach(
              prose(
                'Divide every term of $\\sin^2(\\theta) + \\cos^2(\\theta) = 1$ by $\\cos^2(\\theta)$ and each piece becomes a ratio of this level:',
              ),
              maths('\\tan^2(\\theta) + 1 = \\sec^2(\\theta)'),
              prose('Dividing by $\\sin^2(\\theta)$ instead gives the other one:'),
              maths('1 + \\cot^2(\\theta) = \\operatorname{cosec}^2(\\theta)'),
              prose(
                'With $\\tan(\\theta) = \\frac{3}{4}$, the first says $\\sec^2(\\theta) = 1 + \\frac{9}{16} = \\frac{25}{16}$, so $\\sec(\\theta)$ is $\\frac{5}{4}$ or $-\\frac{5}{4}$.',
              ),
            ),
            ask('trig-identity-square'),
            ask('trig-identity-square', 2),
            teach(
              prose(
                'A square root leaves a choice of sign, and the quarter of the turn settles it. $\\sec$ has the sign of $\\cos$, $\\operatorname{cosec}$ the sign of $\\sin$, and $\\tan$ and $\\cot$ are positive where those two agree.',
              ),
              prose(
                'So finding one ratio from another is two decisions: which identity has both of them in it, and which sign the quarter gives. With $\\tan(\\theta) = \\frac{3}{4}$ and $180^{\\circ} < \\theta < 270^{\\circ}$, cosine is negative there, so $\\sec(\\theta) = -\\frac{5}{4}$.',
              ),
              prose(
                'With $\\cot(\\theta) = -\\frac{12}{35}$ and $90^{\\circ} < \\theta < 180^{\\circ}$, the identity with both in it is the second one:',
              ),
              maths(
                '\\begin{aligned} \\operatorname{cosec}^2(\\theta) &= 1 + \\frac{144}{1225} = \\frac{1369}{1225} \\\\ \\operatorname{cosec}(\\theta) &= \\pm\\frac{37}{35} \\end{aligned}',
              ),
              prose(
                'Between $90^{\\circ}$ and $180^{\\circ}$ the point is above the centre, so sine is positive, and so is $\\operatorname{cosec}$: it is $\\frac{37}{35}$. Going the other way, from $\\operatorname{cosec}$ to $\\cot$, subtract the $1$ instead of adding it.',
              ),
            ),
            ask('trig-identity-find'),
            ask('trig-identity-flow'),
            ask('trig-identity-find+choice', 2),
          ],
          skillCheck: [
            ask('trig-recip-graph-match', 2),
            ask('trig-identity-find', 2),
            ask('trig-identity-flow', 2),
          ],
        },
      ],
      levelCheck: [
        ask('trig-tan-from-point', 2),
        ask('trig-tan-sign-flow', 2),
        ask('trig-tan-undefined', 2),
        ask('trig-tan-asymptote-slider', 2),
        ask('trig-tan-period+choice', 2),
        ask('trig-tan-asymptote-tiles', 2),
        ask('trig-tan-graph-match', 2),
        ask('trig-tan-exact', 2),
        ask('trig-tan-value-tree', 2),
        ask('trig-tan-solve', 2),
        ask('trig-recip-exact', 2),
        ask('trig-recip-tree', 2),
        ask('trig-recip-undefined-flow', 2),
        ask('trig-recip-graph-match', 2),
        ask('trig-identity-find', 2),
      ],
    },
    {
      id: 'tf-l6',
      title: 'Inverse Trigonometric Functions',
      lessons: [
        {
          id: 'tf-l6-arcsin',
          title: 'Undoing Sine',
          slides: [
            teach(
              prose(
                'Sine takes an angle to a number: $\\sin(30^{\\circ}) = \\frac{1}{2}$. Running it backwards asks which angle has a sine of $\\frac{1}{2}$, and there is a snag: lots of them do.',
              ),
              graph({
                xMin: -180,
                xMax: 360,
                curves: [{ f: inDegrees(Math.sin), accent: true }],
                horizontals: [0.5],
                verticals: [{ x: -90 }, { x: 90 }],
                marks: [
                  { x: 30, y: 0.5 },
                  { x: 150, y: 0.5, hollow: true },
                ],
                yMin: -1.4,
                yMax: 1.4,
                label:
                  'y = sin x from -180 to 360 degrees crossing the dashed line y = 1/2 at 30 and 150 degrees, with upright dashed lines at -90 and 90 degrees',
              }),
              prose(
                'So we only allow angles from $-90^{\\circ}$ to $90^{\\circ}$, between the upright dashed lines, where sine takes every value from $-1$ to $1$ exactly once. The **inverse sine** gives the one angle there:',
              ),
              maths('\\sin^{-1}\\left(\\frac{1}{2}\\right) = 30^{\\circ}'),
              prose(
                'That answer is the **principal value**; $150^{\\circ}$, ringed, is not it. $\\sin^{-1}$ is also written $\\arcsin$, and the $-1$ is not a power: $\\sin^{-1}(x)$ is not $\\frac{1}{\\sin(x)}$.',
              ),
            ),
            ask('trig-inv-sin-exact'),
            ask('trig-inv-sin-tiles'),
            ask('trig-inv-principal'),
            teach(
              prose(
                'In radians the range is $-\\frac{\\pi}{2} \\le \\theta \\le \\frac{\\pi}{2}$, and the answers are the same angles: $\\sin^{-1}\\left(\\frac{1}{2}\\right) = \\frac{\\pi}{6}$, $\\sin^{-1}\\left(\\frac{\\sqrt{2}}{2}\\right) = \\frac{\\pi}{4}$ and $\\sin^{-1}(1) = \\frac{\\pi}{2}$.',
              ),
              prose(
                'A negative input gives a negative angle, below the axis. The sine of $-\\theta$ is minus the sine of $\\theta$, so',
              ),
              maths('\\sin^{-1}(-x) = -\\sin^{-1}(x)'),
              prose('For example $\\sin^{-1}\\left(-\\frac{\\sqrt{3}}{2}\\right) = -60^{\\circ}$, which is $-\\frac{\\pi}{3}$.'),
            ),
            ask('trig-inv-sin-exact', 2),
            ask('trig-inv-crossing-slider'),
            ask('trig-inv-sin-tiles', 2),
            teach(
              prose(
                'On the graph, $\\sin^{-1}(k)$ is where the level line $y = k$ crosses the sine curve between $-90^{\\circ}$ and $90^{\\circ}$. For any $k$ from $-1$ to $1$ there is exactly one such crossing.',
              ),
              prose(
                "A calculator's $\\sin^{-1}$ key gives that crossing and no other. $\\sin(150^{\\circ})$ is $\\frac{1}{2}$ too, but $\\sin^{-1}\\left(\\frac{1}{2}\\right)$ is still $30^{\\circ}$, because $150^{\\circ}$ is outside the range.",
              ),
            ),
            ask('trig-inv-principal'),
            ask('trig-inv-crossing-slider'),
          ],
          skillCheck: [
            ask('trig-inv-sin-exact', 2),
            ask('trig-inv-sin-tiles', 2),
            ask('trig-inv-crossing-slider'),
          ],
        },
        {
          id: 'tf-l6-arccos-arctan',
          title: 'Inverse Cosine and Inverse Tangent',
          slides: [
            teach(
              prose(
                "Cosine needs a different range. From $-90^{\\circ}$ to $90^{\\circ}$ it never goes negative, so instead $\\cos^{-1}$ answers from $0^{\\circ}$ to $180^{\\circ}$, the top half of the circle, where cosine falls from $1$ to $-1$ and takes every value once.",
              ),
              maths('0^{\\circ} \\le \\cos^{-1}(x) \\le 180^{\\circ}'),
              prose(
                'Tangent keeps the range of sine, but without its ends, since $\\tan(90^{\\circ})$ has no value:',
              ),
              maths('-90^{\\circ} < \\tan^{-1}(x) < 90^{\\circ}'),
              prose(
                'The positive values come straight from the tables: $\\cos^{-1}\\left(\\frac{1}{2}\\right) = 60^{\\circ}$, $\\tan^{-1}(1) = 45^{\\circ}$ and $\\tan^{-1}\\left(\\sqrt{3}\\right) = 60^{\\circ}$, or $\\frac{\\pi}{3}$, $\\frac{\\pi}{4}$ and $\\frac{\\pi}{3}$ in radians. Like $\\arcsin$, these are also written $\\arccos$ and $\\arctan$.',
              ),
            ),
            ask('trig-inv-exact'),
            ask('trig-inv-exact+choice'),
            teach(
              prose(
                'A negative input puts the angle in the other part of the range. For sine and tangent that means below the axis, so the angle is simply negative:',
              ),
              maths('\\tan^{-1}(-1) = -45^{\\circ}'),
              prose(
                'Cosine is negative left of the centre, so $\\cos^{-1}$ of a negative number is past a quarter turn, as far past $90^{\\circ}$ as the positive answer falls short of it:',
              ),
              maths('\\cos^{-1}(-x) = 180^{\\circ} - \\cos^{-1}(x)'),
              prose(
                'So $\\cos^{-1}\\left(-\\frac{1}{2}\\right) = 180^{\\circ} - 60^{\\circ} = 120^{\\circ}$, which is $\\frac{2\\pi}{3}$.',
              ),
            ),
            ask('trig-inv-principal', 2),
            ask('trig-inv-range-flow'),
            ask('trig-inv-negative-tree'),
            teach(
              prose('Side by side, the three ranges are:'),
              maths(
                '\\begin{array}{c|c} \\sin^{-1} & -\\frac{\\pi}{2} \\le \\theta \\le \\frac{\\pi}{2} \\\\ \\cos^{-1} & 0 \\le \\theta \\le \\pi \\\\ \\tan^{-1} & -\\frac{\\pi}{2} < \\theta < \\frac{\\pi}{2} \\end{array}',
              ),
              prose(
                'So before looking anything up, the sign of the input already says where the answer is: a positive input always lands in the first quarter, and a negative one below the axis, or past a quarter turn for $\\cos^{-1}$.',
              ),
            ),
            ask('trig-inv-principal', 2),
            ask('trig-inv-range-flow', 2),
            ask('trig-inv-negative-tree', 2),
          ],
          skillCheck: [
            ask('trig-inv-exact', 2),
            ask('trig-inv-range-flow', 2),
            ask('trig-inv-negative-tree', 2),
          ],
        },
        {
          id: 'tf-l6-graphs',
          title: 'Graphs of the Inverse Functions',
          slides: [
            teach(
              prose(
                'Undoing a function swaps its inputs and outputs, so every point $(a, b)$ on the graph of sine becomes $(b, a)$ on the graph of $\\sin^{-1}$. On a picture that is a reflection in the line $y = x$.',
              ),
              { kind: 'diagram', svg: reflectionSvg() },
              prose(
                'The dashed curve is sine on its restricted domain, and the solid one is $y = \\sin^{-1}(x)$. Its **domain**, the inputs allowed, is $-1 \\le x \\le 1$; its **range**, the values it gives, is $-\\frac{\\pi}{2} \\le y \\le \\frac{\\pi}{2}$. $y = \\cos^{-1}(x)$ has the same domain and the range $0 \\le y \\le \\pi$. A number in front, as in $y = 2\\sin^{-1}(x)$, doubles every height and so the range, and leaves the domain alone.',
              ),
            ),
            ask('trig-inv-domain-range'),
            ask('trig-inv-graph-slider'),
            ask('trig-inv-undefined'),
            teach(
              prose(
                '$y = \\cos^{-1}(x)$ starts at its highest point, $(-1, \\pi)$, and falls to $(1, 0)$. $y = \\tan^{-1}(x)$ is different again: tangent takes every value, so every number has an inverse tangent and the curve runs right across the page.',
              ),
              graph({
                xMin: -6,
                xMax: 6,
                curves: [{ f: Math.atan, accent: true }],
                horizontals: [Math.PI / 2, -Math.PI / 2],
                verticals: [Y_AXIS],
                yMin: -2.2,
                yMax: 2.2,
                label: 'y = inverse tangent of x from -6 to 6, levelling off towards dashed lines at plus and minus pi over 2',
              }),
              prose(
                'It never reaches $\\frac{\\pi}{2}$ or $-\\frac{\\pi}{2}$, which are **horizontal asymptotes**: the upright asymptotes of $\\tan$, reflected in $y = x$. So its domain is every real number and its range is $-\\frac{\\pi}{2} < y < \\frac{\\pi}{2}$.',
              ),
            ),
            ask('trig-inv-graph-match'),
            ask('trig-inv-undefined', 2),
            ask('trig-inv-graph-slider', 2),
            teach(
              prose(
                'Changes inside the bracket act on $x$. In $y = \\sin^{-1}\\left(\\frac{x}{3}\\right)$ the input to $\\sin^{-1}$ must still lie from $-1$ to $1$, so $x$ itself runs from $-3$ to $3$: the domain is three times as wide.',
              ),
              prose('So $y = 2\\cos^{-1}\\left(\\frac{x}{3}\\right)$, drawn here, has'),
              maths('-3 \\le x \\le 3 \\qquad 0 \\le y \\le 2\\pi'),
              graph({
                xMin: -4,
                xMax: 4,
                curves: [{ f: (x) => 2 * arccos(x / 3), accent: true, breaks: true }],
                verticals: [Y_AXIS],
                marks: [
                  { x: -3, y: 2 * Math.PI },
                  { x: 3, y: 0 },
                ],
                yMin: -1,
                yMax: 7,
                label: 'y = 2 times inverse cosine of x over 3, running from a height of 2 pi at x = -3 down to 0 at x = 3',
              }),
              prose(
                'A negative number in front turns the curve upside down, so $y = -\\cos^{-1}(x)$ lies below the axis, from $-\\pi$ up to $0$.',
              ),
            ),
            ask('trig-inv-domain-range', 2),
            ask('trig-inv-graph-match', 2),
          ],
          skillCheck: [
            ask('trig-inv-graph-match', 2),
            ask('trig-inv-domain-range', 2),
            ask('trig-inv-graph-slider', 2),
          ],
        },
        {
          id: 'tf-l6-compose',
          title: 'Inverses Inside Other Functions',
          slides: [
            teach(
              prose(
                'Doing sine and then undoing it should get you back where you started, and one way round it always does. $\\sin^{-1}(x)$ is an angle whose sine is $x$, so for any $x$ from $-1$ to $1$:',
              ),
              maths('\\sin\\left(\\sin^{-1}(x)\\right) = x'),
              prose(
                'The other way round only works inside the range, $-90^{\\circ}$ to $90^{\\circ}$. Outside it, find the angle inside the range with the same sine. $150^{\\circ}$ is at the same height as $180^{\\circ} - 150^{\\circ} = 30^{\\circ}$, so',
              ),
              maths('\\sin^{-1}\\left(\\sin(150^{\\circ})\\right) = 30^{\\circ}'),
              prose(
                'Below the axis the mirror is $-180^{\\circ} - \\theta$: for $-150^{\\circ}$ that is $-180^{\\circ} + 150^{\\circ} = -30^{\\circ}$. A full turn changes nothing, so $320^{\\circ}$ gives $320^{\\circ} - 360^{\\circ} = -40^{\\circ}$. In radians the same moves use $\\pi$ for $180^{\\circ}$: $\\sin^{-1}\\left(\\sin\\frac{5\\pi}{6}\\right) = \\pi - \\frac{5\\pi}{6} = \\frac{\\pi}{6}$.',
              ),
              prose(
                '$\\cos^{-1}$ answers from $0^{\\circ}$ to $180^{\\circ}$, and $\\theta$ and $-\\theta$ share a cosine: $\\cos^{-1}(\\cos(-50^{\\circ})) = 50^{\\circ}$, and $\\cos^{-1}(\\cos 290^{\\circ}) = 360^{\\circ} - 290^{\\circ} = 70^{\\circ}$.',
              ),
              prose(
                '$\\tan^{-1}$ answers between $-90^{\\circ}$ and $90^{\\circ}$, and tangent repeats every $180^{\\circ}$, so take $180^{\\circ}$ off or add it on:',
              ),
              maths(
                '\\begin{aligned} \\tan^{-1}(\\tan 130^{\\circ}) &= 130^{\\circ} - 180^{\\circ} \\\\ &= -50^{\\circ} \\end{aligned}',
              ),
            ),
            ask('trig-inv-undo'),
            ask('trig-inv-undo-flow'),
            ask('trig-inv-undo+choice', 2),
            teach(
              prose(
                'A function of a different inverse needs a triangle. Let $\\theta = \\sin^{-1}\\left(\\frac{3}{5}\\right)$. Then $\\sin(\\theta) = \\frac{3}{5}$: opposite $3$, hypotenuse $5$.',
              ),
              { kind: 'diagram', svg: triangleSvg() },
              prose(
                "Pythagoras gives the third side, $\\sqrt{5^2 - 3^2} = 4$, and now every ratio of $\\theta$ can be read off. The answer stays a fraction, never a decimal from a calculator's angle.",
              ),
              maths('\\cos\\left(\\sin^{-1}\\left(\\frac{3}{5}\\right)\\right) = \\frac{4}{5}'),
              prose(
                'A tangent gives the two shorter sides instead: for $\\tan^{-1}\\left(\\frac{3}{4}\\right)$ the hypotenuse is $\\sqrt{3^2 + 4^2} = 5$, so $\\sin\\left(\\tan^{-1}\\left(\\frac{3}{4}\\right)\\right) = \\frac{3}{5}$.',
              ),
            ),
            ask('trig-inv-side-tree'),
            ask('trig-inv-triangle'),
            teach(
              prose(
                "A negative input moves the angle out of the first quarter, and the triangle's ratios pick up that quarter's signs. $\\sin^{-1}$ and $\\tan^{-1}$ of a negative number are below the axis, where cosine is still positive and sine is negative; $\\cos^{-1}$ of a negative number is past a quarter turn, where sine is still positive and cosine is negative.",
              ),
              prose(
                'Take $\\theta = \\cos^{-1}\\left(-\\frac{3}{5}\\right)$. Ignoring the sign, the triangle has adjacent $3$ and hypotenuse $5$, so the opposite side is $\\sqrt{5^2 - 3^2} = 4$. The angle is past a quarter turn, where sine is positive and cosine negative:',
              ),
              maths(
                '\\begin{aligned} \\sin(\\theta) &= \\frac{4}{5} \\\\ \\tan(\\theta) &= \\frac{4}{-3} = -\\frac{4}{3} \\end{aligned}',
              ),
              prose(
                'And for $\\tan^{-1}\\left(-\\frac{3}{4}\\right)$ the angle is below the axis, so its sine is $-\\frac{3}{5}$ and its cosine $\\frac{4}{5}$.',
              ),
            ),
            ask('trig-inv-side-tree', 2),
            ask('trig-inv-triangle+choice', 2),
            ask('trig-inv-undo-flow', 2),
          ],
          skillCheck: [
            ask('trig-inv-undo', 2),
            ask('trig-inv-undo-flow', 2),
            ask('trig-inv-triangle', 2),
          ],
        },
        {
          id: 'tf-l6-general',
          title: 'From Principal Value to Every Solution',
          slides: [
            teach(
              prose(
                'A calculator solving $\\sin(x) = 0.4$ gives one angle, $\\sin^{-1}(0.4) = 23.6^{\\circ}$. But the level line crosses the curve twice in a turn.',
              ),
              graph({
                xMin: 0,
                xMax: 360,
                curves: [{ f: inDegrees(Math.sin), accent: true }],
                horizontals: [0.4],
                marks: [
                  { x: 23.6, y: 0.4 },
                  { x: 156.4, y: 0.4 },
                ],
                yMin: -1.4,
                yMax: 1.4,
                label: 'y = sin x from 0 to 360 degrees crossing the dashed line y = 0.4 at 23.6 and 156.4 degrees',
              }),
              prose(
                'The curve is symmetric about its peak at $90^{\\circ}$, so the second crossing is as far before $180^{\\circ}$ as the first is after $0^{\\circ}$. Calling the calculator\'s angle $\\alpha$, the solutions of $\\sin(x) = k$ in one turn are',
              ),
              maths('x = \\alpha \\quad \\text{or} \\quad x = 180^{\\circ} - \\alpha'),
              prose(
                'Cosine is symmetric about $0^{\\circ}$ instead, so its second solution is $-\\alpha$, which is $360^{\\circ} - \\alpha$ once a turn is added. In radians these are $\\pi - \\alpha$ and $2\\pi - \\alpha$.',
              ),
            ),
            ask('trig-inv-second-solution'),
            ask('trig-inv-solutions-slider'),
            ask('trig-inv-general-tiles'),
            teach(
              prose(
                'Tangent repeats every $180^{\\circ}$, so its second solution is $\\alpha + 180^{\\circ}$, or $\\alpha + \\pi$.',
              ),
              prose(
                'For a negative $k$ the calculator gives a negative angle for $\\sin^{-1}$ and $\\tan^{-1}$, outside $0^{\\circ} \\le x < 360^{\\circ}$. Adding a full turn brings it in without changing its value, and the rule gives the other: $\\sin^{-1}(-0.4) = -23.6^{\\circ}$, so',
              ),
              maths('x = 180^{\\circ} + 23.6^{\\circ} = 203.6^{\\circ}'),
              maths('x = -23.6^{\\circ} + 360^{\\circ} = 336.4^{\\circ}'),
            ),
            ask('trig-inv-general-flow'),
            ask('trig-inv-general-tiles', 2),
            ask('trig-inv-general-flow', 2),
            teach(
              prose(
                "Other intervals use the same rules, with a turn added or taken off where needed. For $-180^{\\circ} < x \\le 180^{\\circ}$, cosine's second solution is $-\\alpha$ as it stands; sine's is $180^{\\circ} - \\alpha$, or $-180^{\\circ} - \\alpha$ when $\\alpha$ is negative; and tangent's is $\\alpha - 180^{\\circ}$, or $\\alpha + 180^{\\circ}$ when $\\alpha$ is negative.",
              ),
              prose(
                "Every solution there is comes from the principal value or its partner, with whole turns added. The calculator's one answer is where the working starts, not where it ends.",
              ),
            ),
            ask('trig-inv-second-solution+choice', 2),
            ask('trig-inv-solutions-slider', 2),
          ],
          skillCheck: [
            ask('trig-inv-second-solution', 2),
            ask('trig-inv-general-tiles', 2),
            ask('trig-inv-general-flow', 2),
          ],
        },
      ],
      levelCheck: [
        ask('trig-inv-sin-exact', 2),
        ask('trig-inv-principal', 2),
        ask('trig-inv-crossing-slider', 2),
        ask('trig-inv-exact+choice', 2),
        ask('trig-inv-range-flow', 2),
        ask('trig-inv-negative-tree', 2),
        ask('trig-inv-graph-match', 2),
        ask('trig-inv-domain-range', 2),
        ask('trig-inv-graph-slider', 2),
        ask('trig-inv-undo', 2),
        ask('trig-inv-undo-flow', 2),
        ask('trig-inv-triangle', 2),
        ask('trig-inv-general-tiles', 2),
        ask('trig-inv-second-solution+choice', 2),
        ask('trig-inv-general-flow', 2),
      ],
    },
    {
      id: 'tf-l7',
      title: 'Modelling with Trigonometric Functions',
      lessons: [
        {
          id: 'tf-l7-build',
          title: 'Building a Model',
          slides: [
            teach(
              prose(
                'The depth of water at a harbour rises and falls with the tide, from $3$ m up to $9$ m and back every $12$ hours. A **model** is a formula for the depth at any time: here $h$ metres, $t$ hours after midnight.',
              ),
              graph({
                xMin: 0,
                xMax: 24,
                curves: [{ f: degreeWave(6, 3, 'sin', 30), accent: true }],
                horizontals: [6],
                yMin: -0.5,
                yMax: 10.5,
                label: 'The depth of the tide over 24 hours, swinging between 3 and 9 metres about a dashed midline at 6',
              }),
              prose(
                'Build it one number at a time. The midline is halfway between the extremes, $\\frac{9 + 3}{2} = 6$, and the amplitude is how far each is from it, $\\frac{9 - 3}{2} = 3$.',
              ),
              prose(
                'One cycle, $12$ hours, is a full turn of $360^{\\circ}$, so the bracket turns $\\frac{360}{12} = 30$ degrees an hour. At midnight the water is on its midline and rising, which is how sine starts:',
              ),
              maths('h = 6 + 3\\sin(30t)'),
            ),
            ask('trig-model-extremes-tree'),
            ask('trig-model-build'),
            teach(
              prose(
                'The period is not always handed over as a period. Two tides a day is $2$ cycles in $24$ hours, one every $12$. Six hours from high water to low is half a cycle, so a whole one is $12$.',
              ),
              prose('Once the period is known, $b$ follows from one rule, since one cycle is one full turn:'),
              maths('b \\times \\text{period} = 360'),
              prose(
                'A bigger $b$ means a faster cycle: $\\sin(60t)$ repeats every $6$ hours and $\\sin(15t)$ every $24$.',
              ),
            ),
            ask('trig-model-b'),
            ask('trig-model-b+choice', 2),
            ask('trig-model-build+choice', 2),
            ask('trig-model-extremes-tree', 2),
            teach(
              prose(
                'A model can be read backwards as a check. Sine runs from $-1$ to $1$, so $h = 6 + 3\\sin(30t)$ runs from $6 - 3 = 3$ up to $6 + 3 = 9$: exactly the tide described. Its period comes back too: $\\frac{360}{30} = 12$ hours.',
              ),
              prose(
                'If the check does not land back on the numbers you started from, the midline and the amplitude have been swapped, or the whole swing has been used as the amplitude.',
              ),
              prose(
                'When is it first highest? Sine starts on its midline rising and peaks a quarter of the way through a cycle, so the tide is first highest at $\\frac{12}{4} = 3$ hours. A cosine starts at its peak, so a cosine model is next highest one whole cycle after $t = 0$.',
              ),
              prose(
                'A minus sign turns either one over: $-\\sin$ starts on its midline falling and peaks three quarters of the way through, and $-\\cos$ starts at its least and peaks halfway through. For $6 - 3\\sin(30t)$ that is $3 \\times \\frac{12}{4} = 9$ hours.',
              ),
            ),
            ask('trig-model-read'),
            ask('trig-model-read+choice', 2),
          ],
          skillCheck: [
            ask('trig-model-build', 2),
            ask('trig-model-b', 2),
            ask('trig-model-extremes-tree', 2),
          ],
        },
        {
          id: 'tf-l7-read',
          title: 'Reading a Model',
          slides: [
            teach(
              prose(
                'Reading a model turns its numbers back into the situation. The temperature in a greenhouse is $T = 18 + 5\\sin(15t)$ degrees Celsius, $t$ hours after midnight.',
              ),
              prose(
                'Sine runs from $-1$ to $1$, so $T$ runs from $18 - 5 = 13$ up to $18 + 5 = 23$: the least and the greatest temperatures. The bracket turns $15^{\\circ}$ an hour, so one cycle takes $\\frac{360}{15} = 24$ hours, one day.',
              ),
              prose(
                'A minus sign in front of the amplitude turns the curve upside down but does not change how far it swings: $18 - 5\\cos(15t)$ has the same least and greatest.',
              ),
              prose(
                'Sine starts on its midline rising, so the greenhouse is first warmest a quarter of a cycle in, $\\frac{24}{4} = 6$ hours after midnight; a cosine model would be at its warmest at the start of every cycle. The count runs backwards too: $4$ cycles in $48$ hours is one every $48 \\div 4 = 12$, so $b = \\frac{360}{12} = 30$.',
              ),
            ),
            ask('trig-model-read'),
            ask('trig-model-b', 2),
            teach(
              prose(
                'When is it greatest? That depends on the function. Sine starts on its midline rising, so it peaks a quarter of the way through each cycle and is least three quarters of the way through. Cosine starts at its peak and is least halfway through.',
              ),
              graph({
                xMin: 0,
                xMax: 24,
                curves: [{ f: degreeWave(10, 2, 'sin', 30), accent: true }],
                horizontals: [10],
                marks: [
                  { x: 3, y: 12 },
                  { x: 9, y: 8 },
                  { x: 15, y: 12 },
                ],
                yMin: -0.5,
                yMax: 13.5,
                label: 'h = 10 + 2 sin(30t) over two cycles, with its first peak at t = 3, a trough at t = 9 and the next peak at t = 15',
              }),
              prose(
                'A buoy on the swell is $h = 10 + 2\\sin(30t)$ metres above the sea bed, $t$ seconds in. A cycle is $12$ seconds, so it is highest at $t = 3$, lowest at $t = 9$, and highest again at $t = 15$.',
              ),
              prose(
                'A minus sign swaps the high and the low. $h = 10 - 2\\sin(30t)$ starts on its midline falling, so it is lowest a quarter of the way through, $t = 3$, and highest three quarters of the way, $t = 9$. $10 - 2\\cos(30t)$ starts at its lowest and is highest halfway through, $t = 6$.',
              ),
            ),
            ask('trig-model-peak-slider'),
            ask('trig-model-read+choice', 2),
            ask('trig-model-peak-slider', 2),
            teach(
              prose(
                'For the value at one time, work from the inside out: the angle in the bracket, then its sine or cosine, then the model. The buoy at $t = 5$:',
              ),
              maths('h = 10 + 2\\sin(30 \\times 5)'),
              maths('= 10 + 2\\sin(150^{\\circ})'),
              maths('= 10 + 2 \\times \\frac{1}{2} = 11'),
              prose(
                'A time in the second cycle gives an angle past $360^{\\circ}$. Take a full turn off: $\\sin(30 \\times 13) = \\sin(390^{\\circ}) = \\sin(30^{\\circ})$, because the model repeats every cycle.',
              ),
            ),
            ask('trig-model-value-tree'),
            ask('trig-model-value-tree', 2),
            ask('trig-model-b+choice', 2),
          ],
          skillCheck: [
            ask('trig-model-read', 2),
            ask('trig-model-peak-slider', 2),
            ask('trig-model-value-tree', 2),
          ],
        },
        {
          id: 'tf-l7-start',
          title: 'Where the Model Starts',
          slides: [
            teach(
              prose(
                'A Ferris wheel seat does not start halfway up: you board at the bottom. A model has to start where the situation does, and each of the four shapes starts somewhere different.',
              ),
              maths(
                '\\begin{array}{c|c} \\sin & \\text{midline, rising} \\\\ \\cos & \\text{greatest} \\\\ -\\cos & \\text{least} \\\\ -\\sin & \\text{midline, falling} \\end{array}',
              ),
              prose(
                'A wheel with its hub $20$ m up and a radius of $18$ m, turning once every $36$ minutes, starts at its least, so the seat is at height $h = 20 - 18\\cos(10t)$.',
              ),
              graph({
                xMin: 0,
                xMax: 72,
                curves: [{ f: degreeWave(20, -18, 'cos', 10), accent: true }],
                horizontals: [20],
                verticals: [{ x: 0, dashed: false }],
                yMin: -2,
                yMax: 42,
                label: 'h = 20 - 18 cos(10t) over two turns of the wheel, starting at its lowest point',
              }),
            ),
            ask('trig-model-start-flow'),
            ask('trig-model-graph-match'),
            ask('trig-model-value-tree', 2),
            teach(
              prose(
                'The value at $t = 0$ says which. With $t = 0$ the bracket is $0$: $\\sin(0) = 0$ leaves just the midline, and $\\cos(0) = 1$ adds or takes away the whole amplitude.',
              ),
              maths('20 - 18\\cos(0) = 20 - 18 = 2'),
              prose(
                'On the midline, the direction decides: rising is $+\\sin$ and falling is $-\\sin$.',
              ),
            ),
            ask('trig-model-start-flow', 2),
            ask('trig-model-graph-match', 2),
            ask('trig-model-value-tree', 2),
            teach(
              prose(
                'Sometimes the first peak is not at $t = 0$ or at a quarter of a cycle. Then shift a cosine: $\\cos(b(t - c))$ is greatest when its bracket is zero, which is at $t = c$.',
              ),
              prose(
                'A greenhouse that is warmest, $24^{\\circ}$C, at $t = 14$ and coolest, $12^{\\circ}$C, twelve hours later has a period of $24$ hours, so',
              ),
              maths('T = 18 + 6\\cos(15(t - 14))'),
              prose('The $15$ multiplies the whole of $t - 14$, which is why the inner bracket stays.'),
            ),
            ask('trig-model-shift-tiles'),
            ask('trig-model-shift-tiles', 2),
          ],
          skillCheck: [
            ask('trig-model-start-flow', 2),
            ask('trig-model-graph-match', 2),
            ask('trig-model-shift-tiles', 2),
          ],
        },
        {
          id: 'tf-l7-when',
          title: 'When the Model Reaches a Value',
          slides: [
            teach(
              prose(
                'Turn the question round: when is the harbour $7.5$ m deep, if $h = 6 + 3\\sin(30t)$? Set the model equal to $7.5$ and undo it from the outside in.',
              ),
              maths('3\\sin(30t) = 1.5'),
              maths('\\sin(30t) = \\frac{1}{2}'),
              prose(
                'Sine is $\\frac{1}{2}$ at $30^{\\circ}$ and at $150^{\\circ}$ in one turn, so $30t = 30$ or $150$, and $t = 1$ or $t = 5$.',
              ),
              graph({
                xMin: 0,
                xMax: 12,
                curves: [{ f: degreeWave(6, 3, 'sin', 30), accent: true }],
                horizontals: [7.5],
                marks: [
                  { x: 1, y: 7.5 },
                  { x: 5, y: 7.5 },
                ],
                yMin: -0.5,
                yMax: 10.5,
                label: 'One cycle of h = 6 + 3 sin(30t) crossing the dashed line h = 7.5 at t = 1 and t = 5',
              }),
              prose(
                'A value below the midline makes the sine negative. When is a seat on $h = 20 + 10\\sin(15t)$ at $15$ m?',
              ),
              maths('\\begin{aligned} 10\\sin(15t) &= -5 \\\\ \\sin(15t) &= -\\tfrac{1}{2} \\end{aligned}'),
              prose(
                'Below the centre that happens at $180^{\\circ} + 30^{\\circ} = 210^{\\circ}$ and $360^{\\circ} - 30^{\\circ} = 330^{\\circ}$, so $t = \\frac{210}{15} = 14$ or $t = \\frac{330}{15} = 22$. A cosine model works the same way with its own angles: $\\cos = \\tfrac{1}{2}$ at $60^{\\circ}$ and $300^{\\circ}$, $\\cos = -\\tfrac{1}{2}$ at $120^{\\circ}$ and $240^{\\circ}$.',
              ),
            ),
            ask('trig-model-when-tree'),
            ask('trig-model-when-tiles'),
            teach(
              prose(
                'Each later cycle has two more, $12$ hours on: $13$ and $17$, then $25$ and $29$. A question gives a window, and only the times inside it count.',
              ),
              prose(
                'For $6 \\le t < 18$, the first-cycle times $1$ and $5$ are too early, but $1 + 12 = 13$ and $5 + 12 = 17$ are inside, so those are the answers.',
              ),
              prose(
                'A level between the least and the greatest is crossed twice a cycle, once going up and once coming down. The greatest and the least are each reached once a cycle, and a level outside them never.',
              ),
            ),
            ask('trig-model-count'),
            ask('trig-model-when-tiles', 2),
            ask('trig-model-when-tree', 2),
            teach(
              prose(
                'Between $t = 1$ and $t = 5$ the water is deeper than $7.5$ m, so a boat that needs that depth has $5 - 1 = 4$ hours in each $12$.',
              ),
              prose(
                'Check which side of the level you are on with a time in between: at $t = 3$, $h = 6 + 3\\sin(90^{\\circ}) = 9$, above. The time spent below is the rest of the cycle, $12 - 4 = 8$ hours.',
              ),
              prose(
                'For a level below the midline it is the other way round. The seat on $20 + 10\\sin(15t)$ is at $15$ m at $t = 14$ and $t = 22$, and at $t = 18$ it is at $20 + 10\\sin(270^{\\circ}) = 10$, below, so it spends $22 - 14 = 8$ minutes of each $24$ below $15$ m.',
              ),
            ),
            ask('trig-model-above'),
            ask('trig-model-above+choice', 2),
            ask('trig-model-count', 2),
          ],
          skillCheck: [
            ask('trig-model-when-tree', 2),
            ask('trig-model-when-tiles', 2),
            ask('trig-model-above', 2),
          ],
        },
        {
          id: 'tf-l7-fit',
          title: 'Fitting a Model to Data',
          slides: [
            teach(
              prose(
                'Real readings rarely start at a neat point, so fitting a model means reading $a$, $b$, $c$ and $d$ off the data. Say a tidal river is highest, $7$ m, at $t = 2$ and next lowest, $3$ m, at $t = 8$, $t$ hours after noon.',
              ),
              prose(
                'The model to fit is a shifted cosine, $L = d + a\\cos(b(t - c))$. This slide finds $a$, $b$ and $d$; the next finds $c$.',
              ),
              prose(
                'As before, $d = \\frac{7 + 3}{2} = 5$ and $a = \\frac{7 - 3}{2} = 2$. Highest to lowest is half a cycle, $8 - 2 = 6$ hours, so the period is $12$ and $b = \\frac{360}{12} = 30$.',
              ),
            ),
            ask('trig-model-period-tree'),
            ask('trig-model-fit'),
            teach(
              prose(
                'A cosine is greatest when its bracket is zero, so start it at the first high: $c = 2$.',
              ),
              maths('L = 5 + 2\\cos(30(t - 2))'),
              graph({
                xMin: 0,
                xMax: 24,
                curves: [{ f: (t) => 5 + 2 * Math.cos(((30 * (t - 2)) * Math.PI) / 180), accent: true }],
                horizontals: [5],
                marks: [
                  { x: 2, y: 7 },
                  { x: 8, y: 3 },
                ],
                yMin: -0.5,
                yMax: 8,
                label: 'L = 5 + 2 cos(30(t - 2)) through the high reading at t = 2 and the low reading at t = 8',
              }),
              prose(
                'If the readings start at a low, the high is half a cycle later. If that high is past a whole cycle, take one period off to find the first high after $t = 0$: a high at $t = 15$ with a period of $12$ gives $c = 3$.',
              ),
            ),
            ask('trig-model-fit-slider'),
            ask('trig-model-fit', 2),
            ask('trig-model-period-tree', 2),
            ask('trig-model-fit-slider', 2),
            teach(
              prose(
                'A cosine shifted to the first high always fits. When the data starts at a neat point, no shift is needed: on the midline rising is $+\\sin$, falling is $-\\sin$, at the top $+\\cos$ and at the bottom $-\\cos$.',
              ),
              prose(
                'The two ways agree: $5 + 2\\sin(30t)$ and $5 + 2\\cos(30(t - 3))$ are the same curve, since a sine is a cosine a quarter of a cycle late.',
              ),
            ),
            ask('trig-model-start-flow'),
            ask('trig-model-start-flow', 2),
          ],
          skillCheck: [
            ask('trig-model-fit', 2),
            ask('trig-model-fit-slider', 2),
            ask('trig-model-period-tree', 2),
          ],
        },
      ],
      levelCheck: [
        ask('trig-model-build', 2),
        ask('trig-model-extremes-tree', 2),
        ask('trig-model-b+choice', 2),
        ask('trig-model-read', 2),
        ask('trig-model-peak-slider', 2),
        ask('trig-model-value-tree', 2),
        ask('trig-model-start-flow', 2),
        ask('trig-model-graph-match', 2),
        ask('trig-model-shift-tiles', 2),
        ask('trig-model-when-tree', 2),
        ask('trig-model-count', 2),
        ask('trig-model-when-tiles', 2),
        ask('trig-model-above', 2),
        ask('trig-model-fit-slider', 2),
        ask('trig-model-fit', 2),
      ],
    },
  ],
};
