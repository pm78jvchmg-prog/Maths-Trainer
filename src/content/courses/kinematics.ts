/**
 * Kinematics.
 *
 * Motion in a straight line. Level 1 reads motion from graphs: displacement
 * against distance and velocity against speed, average speed and velocity
 * over a journey, the gradient of a displacement-time graph as velocity, the
 * gradient of a velocity-time graph as acceleration, and the area under one
 * as the distance travelled. Level 2 is constant acceleration: the suvat
 * equations, choosing one from what is given with a sign convention, vertical
 * motion under gravity with g = 9.8, and journeys in two stages or with one
 * particle catching another. Level 3 is calculus: v = ds/dt and a = dv/dt for
 * polynomial and exponential s, speeding up told from the signs of v and a,
 * v and s back again by integrating with a known value fixing the constant,
 * and the displacement and distance over an interval where v keeps one sign.
 * Level 4 is variable acceleration: when a particle is at rest or turns
 * round, its greatest velocity and greatest speed on an interval, distance
 * against displacement when v changes sign, reading curved displacement-time
 * and velocity-time graphs, and chaining from s, v or a with a starting value
 * to the time, position or speed asked.
 *
 * Gradients, areas, rearranging, the quadratic formula, differentiating and
 * integrating are used here, not taught again: a lesson points back to
 * Coordinate Geometry, Differentiation, Integration, Linear Equations or
 * Quadratics instead. Each level closes with a level check: questions only,
 * no teaching slides, one attempt each.
 */
import type { Block, Course, SlideRef } from '../types';
import { plotSvg } from '../figures';

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
 * A generated question with a worked example above it, on the same slide.
 * Used where one question needs a step the teaching slide before it did not
 * show, so the example sits right where it is needed.
 */
const askAfter = (lead: Block[], generatorId: string, difficulty = 1): SlideRef => ({
  type: 'generated',
  generatorId,
  difficulty,
  leadIn: lead,
});

const prose = (text: string): Block => ({ kind: 'prose', text });
const display = (tex: string): Block => ({ kind: 'display', tex });

/** Lines of working stacked in one display and aligned on their `&`. */
const working = (...lines: string[]): Block => display(`\\begin{aligned} ${lines.join(' \\\\ ')} \\end{aligned}`);

const figure = (options: Parameters<typeof plotSvg>[0]): Block => ({ kind: 'diagram', svg: plotSvg(options) });

/** A graph joining corners with straight lines, for the teaching slides. */
function through(corners: [number, number][]): (x: number) => number {
  return (x) => {
    for (let k = 1; k < corners.length; k += 1) {
      const [x0, y0] = corners[k - 1];
      const [x1, y1] = corners[k];
      if (x <= x1) return y0 + ((y1 - y0) * (x - x0)) / (x1 - x0);
    }
    return corners[corners.length - 1][1];
  };
}

export const kinematics: Course = {
  id: 'kinematics',
  category: 'mechanics',
  position: 10,
  title: 'Kinematics',
  blurb: 'Motion in a straight line: displacement and velocity, motion graphs, the constant-acceleration equations, and gravity.',
  levels: [
    {
      id: 'kn-l1',
      title: 'Motion Graphs',
      lessons: [
        {
          id: 'kn-l1-displacement',
          title: 'Displacement and Velocity',
          slides: [
            teach(
              prose(
                'Motion along a line is measured from a fixed point $O$, with one direction chosen as **positive**. A particle\'s **position** $s$ says where it is: $s = -3$ is 3 m from $O$ the negative way.',
              ),
              prose('**Displacement** is the change in position: where it ends minus where it started, sign included. **Distance** adds up every leg, whichever way it went, so it is never negative.'),
              prose('Start at $s = 2$, go to $s = 9$, then back to $s = 5$:'),
              working('\\text{displacement} &= 5 - 2 = 3', '\\text{distance} &= 7 + 4 = 11'),
            ),
            ask('kin-disp'),
            ask('kin-line-slider'),
            ask('kin-disp+choice', 2),
            teach(
              prose(
                '**Velocity** is how fast the displacement changes, and it carries a sign: which way the particle is moving. **Speed** is its size, never negative.',
              ),
              prose('With right as positive, $v = -3$ m/s means moving left at a speed of 3 m/s.'),
              prose('Moving steadily from $s = 4$ to $s = -8$ in 4 s is a velocity of $\\frac{-8 - 4}{4} = -3$ m/s.'),
              prose('Turned round, velocity times time is the displacement. From $s = 1$, at $-3$ m/s for 2 s, then $2$ m/s for 4 s:'),
              working('(-3) \\times 2 &= -6', '2 \\times 4 &= 8', 's &= 1 - 6 + 8 = 3'),
            ),
            ask('kin-motion-choice'),
            ask('kin-line-slider', 2),
            ask('kin-motion-choice', 2),
            teach(
              prose(
                'The two signs answer different questions. The velocity says **which way it is moving**; the displacement says **which side of $O$ it is**.',
              ),
              prose('With east positive, a particle leaves $O$, goes 5 m east, turns and has come 8 m back, still moving west. It is moving west, so $v < 0$. It is at $5 - 8 = -3$, west of $O$, so $s < 0$ too.'),
              prose('A ball thrown up from $O$, with up positive, is still above $O$ on its way down: $s > 0$ but $v < 0$.'),
            ),
            ask('kin-sign-flow'),
            ask('kin-sign-flow', 2),
          ],
          skillCheck: [ask('kin-disp', 2), ask('kin-sign-flow', 2), ask('kin-line-slider', 2)],
        },
        {
          id: 'kn-l1-average',
          title: 'Average Speed and Velocity',
          slides: [
            teach(
              prose('Over a whole journey, the **average speed** is the total distance over the total time.'),
              display('\\text{average speed} = \\frac{\\text{distance}}{\\text{time}}'),
              prose(
                'Do not average the speeds. 60 m at 6 m/s takes 10 s and 60 m at 3 m/s takes 20 s, so the average is $\\frac{120}{30} = 4$ m/s, not $4.5$: more time is spent going slowly.',
              ),
            ),
            ask('kin-avg-tree'),
            ask('kin-mean-speed'),
            ask('kin-setup-tiles'),
            teach(
              prose('The **average velocity** uses the displacement instead of the distance, so it has a sign.'),
              display('\\bar{v} = \\frac{\\text{displacement}}{\\text{total time}}'),
              prose('Out 30 m and back 10 m in 8 s: the average velocity is $\\frac{30 - 10}{8} = 2.5$ m/s, while the average speed is $\\frac{40}{8} = 5$ m/s.'),
            ),
            ask('kin-avgvel-steps'),
            ask('kin-avg-tree', 2),
            askAfter(
              [
                prose('A stop still counts in the time. A bus goes 30 m at 6 m/s, stops for 5 s, then goes 40 m at 4 m/s:'),
                working('\\text{time} &= \\tfrac{30}{6} + 5 + \\tfrac{40}{4}', '&= 5 + 5 + 10 = 20'),
                display('\\text{average speed} = \\tfrac{30 + 40}{20} = 3.5'),
              ],
              'kin-mean-speed+choice',
              2,
            ),
            teach(
              prose('With several legs, set the fraction up before working it out: every leg **adds** to the distance, and legs the negative way **subtract** from the displacement.'),
              working('\\text{distance} &= 40 + 15 + 25', '\\text{displacement} &= 40 - 15 + 25'),
              prose('The time is the same in both: every second counts, including any time spent stopped.'),
            ),
            ask('kin-setup-tiles', 2),
            ask('kin-avgvel-steps', 2),
          ],
          skillCheck: [ask('kin-avg-tree', 2), ask('kin-avgvel-steps', 2), ask('kin-mean-speed', 2)],
        },
        {
          id: 'kn-l1-st-graphs',
          title: 'Displacement-Time Graphs',
          slides: [
            teach(
              prose(
                'A **displacement-time graph** plots $s$ against $t$. Its gradient is change in $s$ over change in $t$: the **velocity**. (Finding a gradient is the one from Coordinate Geometry, "The Gradient of a Line".)',
              ),
              figure({
                xMin: 0,
                xMax: 8,
                yMin: -1,
                yMax: 9,
                grid: true,
                height: 170,
                curves: [{ f: through([[0, 0], [3, 6], [5, 6], [8, 0]]) }],
                marks: [
                  { x: 0, y: 0 },
                  { x: 3, y: 6 },
                  { x: 5, y: 6 },
                  { x: 8, y: 0 },
                ],
                label: 'A displacement-time graph rising, flat, then falling back to zero',
              }),
              prose('Here the first stage has gradient $\\frac{6}{3} = 2$: a steady $2$ m/s.'),
              prose('A **flat** stage is a gradient of zero: the particle is at rest. Here it stops at $t = 3$ and moves again at $t = 5$.'),
            ),
            ask('kin-st-gradient'),
            ask('kin-st-slider'),
            askAfter(
              [
                prose('Going the other way, each second adds the velocity to $s$. From $s = 1$: $3$ m/s for 2 s, still for 1 s, then $-2$ m/s for 2 s:'),
                working('t = 0, 1, 2 &: \\quad s = 1, 4, 7', 't = 3 &: \\quad s = 7 \\text{ (still)}', 't = 4, 5 &: \\quad s = 5, 3'),
              ],
              'kin-st-table',
            ),
            teach(
              prose(
                'A stage sloping **down** has a negative gradient: the particle is moving the negative way. Above, the last stage is $\\frac{0 - 6}{3} = -2$ m/s, back to $O$, where the graph meets the $t$-axis.',
              ),
              prose('Steeper means faster, up or down: the speed is the size of the gradient, whatever its sign. Stages at $2$, $0$ and $-3$ m/s: the fastest is the $-3$ stage, at 3 m/s.'),
            ),
            ask('kin-st-choice'),
            ask('kin-st-gradient+choice', 2),
            ask('kin-st-table', 2),
            teach(
              prose('The particle is **at $O$** where $s = 0$: where the graph meets the $t$-axis. In the graph above, that is $t = 0$ and $t = 8$.'),
              prose(
                'Every graph here is made of straight stages, so each stage has one velocity. A curved graph has a different gradient at every point, $v = \\frac{ds}{dt}$, which is a later level of this course.',
              ),
            ),
            ask('kin-st-slider', 2),
            ask('kin-st-choice', 2),
          ],
          skillCheck: [ask('kin-st-gradient', 2), ask('kin-st-slider', 2), ask('kin-st-table', 2)],
        },
        {
          id: 'kn-l1-vt-graphs',
          title: 'Velocity-Time Graphs',
          slides: [
            teach(
              prose(
                'A **velocity-time graph** plots $v$ against $t$. Its gradient is the rate the velocity changes: the **acceleration**, in m/s².',
              ),
              display('a = \\frac{v - u}{t}'),
              prose('Here $u$ is the velocity at the start of the stage, $v$ at the end, and $t$ the time between. From $4$ m/s to $10$ m/s in 3 s is $a = \\frac{10 - 4}{3} = 2$ m/s².'),
            ),
            ask('kin-vt-accel'),
            ask('kin-vt-tree'),
            ask('kin-vt-accel+choice', 2),
            teach(
              prose('Whether it is **speeding up** depends on both signs. When $v$ and $a$ have the same sign, the acceleration pushes the way it is moving, and the speed grows.'),
              prose(
                'Opposite signs slow it down, even when $a$ is positive: moving at $v = -6$ m/s with $a = 2$ m/s² is slowing down. A flat stage has $a = 0$: a steady speed.',
              ),
            ),
            ask('kin-speeding-flow'),
            ask('kin-vt-tree', 2),
            ask('kin-speeding-flow', 2),
            teach(
              prose('A straight stage starting at $t = 0$ is the line $v = u + at$: $u$ is where it meets the $v$-axis, and $a$ is its gradient.'),
              prose('A line from $(0, 3)$ to $(4, 11)$ has gradient $2$, so $v = 3 + 2t$.'),
            ),
            ask('kin-vt-tiles'),
            ask('kin-vt-tiles', 2),
          ],
          skillCheck: [ask('kin-vt-accel', 2), ask('kin-speeding-flow', 2), ask('kin-vt-tiles', 2)],
        },
        {
          id: 'kn-l1-area',
          title: 'Area Under a Velocity-Time Graph',
          slides: [
            teach(
              prose(
                'The **area under a velocity-time graph** is the distance travelled: a velocity times a time is a distance. (It is the area under a graph from Integration, "Definite Integrals & Area", found here from shapes.)',
              ),
              figure({
                xMin: 0,
                xMax: 8,
                yMin: -1,
                yMax: 7,
                grid: true,
                height: 170,
                curves: [{ f: through([[0, 0], [2, 6], [6, 6], [8, 0]]) }],
                shade: { f: through([[0, 0], [2, 6], [6, 6], [8, 0]]), from: 0, to: 8 },
                label: 'A velocity-time graph: up, steady, then down to zero, with the area under it shaded',
              }),
              working('A_1 &= \\tfrac{1}{2} \\times 2 \\times 6 = 6', 'A_2 &= 4 \\times 6 = 24', 'A_3 &= \\tfrac{1}{2} \\times 2 \\times 6 = 6', '\\text{distance} &= 6 + 24 + 6 = 36'),
            ),
            ask('kin-stages-tree'),
            teach(
              prose('A stage that does not start or end at zero is a **trapezium**: half the sum of the parallel sides times the width.'),
              display('\\tfrac{1}{2}(u + v)t'),
              prose('From $4$ m/s to $10$ m/s over 3 s: $\\tfrac{1}{2}(4 + 10) \\times 3 = \\tfrac{1}{2} \\times 14 \\times 3 = 21$ m.'),
              prose('Split the area at every corner and work stage by stage; the shapes are always triangles, rectangles or trapezia. The units check the method: m/s times s is m.'),
            ),
            ask('kin-trap-steps'),
            ask('kin-dist-area'),
            ask('kin-trap-steps', 2),
            teach(
              prose(
                'Area **below** the axis is motion the negative way. For the distance, add it; for the displacement, take it away from the area above.',
              ),
              prose('A graph joining $(0, 4)$, $(2, 0)$ and $(3, -2)$ has a triangle above the axis and one below:'),
              working(
                '\\text{above} &= \\tfrac{1}{2} \\times 2 \\times 4 = 4',
                '\\text{below} &= \\tfrac{1}{2} \\times 1 \\times 2 = 1',
                '\\text{displacement} &= 4 - 1 = 3',
                '\\text{distance} &= 4 + 1 = 5',
              ),
            ),
            ask('kin-net-disp+choice'),
            ask('kin-dist-area+choice', 2),
            ask('kin-stages-tree', 2),
            ask('kin-net-disp', 2),
          ],
          skillCheck: [ask('kin-dist-area', 2), ask('kin-trap-steps', 2), ask('kin-net-disp', 2)],
        },
      ],
      levelCheck: [
        ask('kin-disp', 2),
        ask('kin-avg-tree', 2),
        ask('kin-st-gradient', 2),
        ask('kin-vt-accel', 2),
        ask('kin-dist-area', 2),
        ask('kin-sign-flow', 2),
        ask('kin-avgvel-steps', 2),
        ask('kin-st-table', 2),
        ask('kin-speeding-flow', 2),
        ask('kin-stages-tree', 2),
        ask('kin-line-slider', 2),
        ask('kin-mean-speed+choice', 2),
        ask('kin-st-choice', 2),
        ask('kin-vt-tiles', 2),
        ask('kin-net-disp', 2),
      ],
    },
    {
      id: 'kn-l2',
      title: 'Constant Acceleration',
      lessons: [
        {
          id: 'kn-l2-suvat',
          title: 'v = u + at and s = ut + ½at²',
          slides: [
            teach(
              prose(
                'With a **constant acceleration**, five quantities describe a motion: $s$ the displacement, $u$ the initial velocity, $v$ the final velocity, $a$ the acceleration and $t$ the time.',
              ),
              display('v = u + at'),
              prose(
                'This is the straight velocity-time graph from Motion Graphs. Rearranged (Linear Equations, "Changing the Subject"), it gives $a = \\frac{v - u}{t}$ and $t = \\frac{v - u}{a}$.',
              ),
              prose('With $u = 5$, $a = 3$, $t = 4$:'),
              display('v = 5 + 3 \\times 4 = 17'),
              prose('With $u = 2$, $v = 14$, $t = 3$:'),
              display('a = \\tfrac{14 - 2}{3} = 4'),
            ),
            ask('kin-vuat-tiles'),
            ask('kin-vuat'),
            ask('kin-vuat+choice', 2),
            teach(
              prose('The area under that graph is a rectangle $ut$ plus a triangle $\\tfrac{1}{2} \\times t \\times at$:'),
              display('s = ut + \\tfrac{1}{2}at^{2}'),
              prose('Square $t$ first. From $3$ m/s, accelerating at $2$ m/s² for 4 s: $s = 12 + \\tfrac{1}{2} \\times 2 \\times 16 = 28$ m.'),
            ),
            ask('kin-suat-steps'),
            ask('kin-suat-find'),
            askAfter(
              [
                prose('Slowing down is a **negative** acceleration: decelerating at 2 m/s² means $a = -2$. From $20$ m/s down to $6$ m/s:'),
                working('t &= \\frac{v - u}{a} = \\frac{6 - 20}{-2} = 7'),
              ],
              'kin-vuat-tiles',
              2,
            ),
            teach(
              prose('Braking at 2 m/s² means $a = -2$ in $s = ut + \\tfrac{1}{2}at^{2}$ too, so the half term is taken away.'),
              prose('Given $s$, the same equation gives $a$: put in what is known and solve the linear equation left. From $4$ m/s, covering 40 m in 4 s:'),
              working('40 &= 4 \\times 4 + \\tfrac{1}{2} \\times a \\times 4^{2}', '40 &= 16 + 8a', 'a &= \\tfrac{24}{8} = 3'),
            ),
            ask('kin-suat-tree', 2),
            ask('kin-suat-find', 2),
          ],
          skillCheck: [ask('kin-vuat-tiles', 2), ask('kin-vuat', 2), ask('kin-suat-tree', 2)],
        },
        {
          id: 'kn-l2-more',
          title: 'v² = u² + 2as and s = ½(u + v)t',
          slides: [
            teach(
              prose('When the time is neither given nor asked, use'),
              display('v^{2} = u^{2} + 2as'),
              prose('From $4$ m/s, accelerating at $2$ m/s² over 21 m: $v^{2} = 16 + 84 = 100$, so $v = 10$ m/s.'),
            ),
            ask('kin-v2'),
            ask('kin-vsq-tree'),
            askAfter(
              [
                prose('The same equation gives $a$ or $s$: put in what is known and solve. From $3$ m/s to $7$ m/s over 10 m:'),
                working('7^{2} &= 3^{2} + 2 \\times a \\times 10', '49 &= 9 + 20a', 'a &= \\tfrac{40}{20} = 2'),
                prose('Asked for $s$ instead, with $a = 2$: $49 = 9 + 4s$, so $s = \\tfrac{40}{4} = 10$ m.'),
              ],
              'kin-v2+choice',
              2,
            ),
            teach(
              prose('When the acceleration plays no part, use the average of the two velocities times the time:'),
              display('s = \\tfrac{1}{2}(u + v)t'),
              prose('It is the trapezium under the velocity-time graph. From $4$ m/s to $10$ m/s in 6 s: $s = \\tfrac{1}{2} \\times 14 \\times 6 = 42$ m.'),
            ),
            ask('kin-uvt-tiles'),
            ask('kin-uvt'),
            askAfter(
              [
                prose('Braking makes $a$ negative, so $2as$ is taken away. From $10$ m/s, braking at 2 m/s² over 16 m:'),
                working('v^{2} &= 10^{2} + 2 \\times (-2) \\times 16', '&= 100 - 64 = 36', 'v &= \\sqrt{36} = 6'),
              ],
              'kin-vsq-tree',
              2,
            ),
            teach(
              prose('Rearranged for the time, $s = \\tfrac{1}{2}(u + v)t$ gives $t = \\frac{2s}{u + v}$. From $8$ m/s to $12$ m/s over 30 m: $t = \\frac{60}{20} = 3$ s.'),
              prose('It gives $u$ or $v$ the same way. Reaching $9$ m/s after 4 s, covering 24 m:'),
              working('24 &= \\tfrac{1}{2}(u + 9) \\times 4', '24 &= 2(u + 9)', 'u + 9 &= 12, \\quad u = 3'),
            ),
            ask('kin-uvt-tiles', 2),
            ask('kin-uvt+choice', 2),
          ],
          skillCheck: [ask('kin-v2', 2), ask('kin-vsq-tree', 2), ask('kin-uvt', 2)],
        },
        {
          id: 'kn-l2-choosing',
          title: 'Choosing the Equation',
          slides: [
            teach(
              prose('Each equation leaves out exactly one of the five quantities:'),
              working(
                'v &= u + at & &\\text{no } s',
                's &= ut + \\tfrac{1}{2}at^{2} & &\\text{no } v',
                'v^{2} &= u^{2} + 2as & &\\text{no } t',
                's &= \\tfrac{1}{2}(u + v)t & &\\text{no } a',
              ),
              prose('List what is given and what is asked. The one quantity left over says which equation to use.'),
            ),
            ask('kin-which-flow'),
            ask('kin-which-choice'),
            ask('kin-solve-mixed'),
            teach(
              prose(
                'Pick a **positive direction** before writing anything down, and give every quantity pointing the other way a minus sign.',
              ),
              prose(
                'A car braking has $a < 0$ in the direction it travels. A stone thrown up at 12 m/s from a ledge 20 m high, with up positive, has $u = 12$, $a = -9.8$ and, on landing, $s = -20$.',
              ),
              prose('With **down** as positive instead, every sign flips: the same stone has $u = -12$, $a = 9.8$ and $s = 20$.'),
            ),
            ask('kin-signs-tiles'),
            ask('kin-which-flow', 2),
            askAfter(
              [
                prose('With no $v$, solve $s = ut + \\tfrac{1}{2}at^{2}$ for $a$. From $2$ m/s, covering 32 m in 4 s:'),
                working('32 &= 2 \\times 4 + \\tfrac{1}{2} \\times a \\times 4^{2}', '32 &= 8 + 8a', 'a &= \\tfrac{24}{8} = 3'),
              ],
              'kin-solve-mixed+choice',
              2,
            ),
            teach(
              prose('A train slows from $20$ m/s to rest over 100 m. Given $u$, $v$, $s$; asked $a$; no $t$. So:'),
              working('0^{2} &= 20^{2} + 2a \\times 100', 'a &= -2'),
              prose('Negative, because it is slowing down.'),
            ),
            ask('kin-signs-tiles', 2),
            ask('kin-which-choice', 2),
          ],
          skillCheck: [ask('kin-which-flow', 2), ask('kin-signs-tiles', 2), ask('kin-solve-mixed', 2)],
        },
        {
          id: 'kn-l2-gravity',
          title: 'Vertical Motion Under Gravity',
          slides: [
            teach(
              prose(
                'Near the ground, anything moving freely up or down accelerates downwards at $g = 9.8$ m/s². With **up** as positive, $a = -9.8$, and the equations become',
              ),
              working('v &= u - 9.8t', 's &= ut - 4.9t^{2}'),
              prose('Thrown up at $19.6$ m/s, after 1 s: $s = 19.6 - 4.9 = 14.7$ m and $v = 9.8$ m/s.'),
            ),
            ask('kin-grav-height'),
            ask('kin-grav-steps'),
            askAfter(
              [
                prose('Back at the level it was thrown from, $s = 0$. Thrown up at $9.8$ m/s, take out the common factor $t$:'),
                working('9.8t - 4.9t^{2} &= 0', 't(9.8 - 4.9t) &= 0', 't = 0 \\text{ or } t &= \\tfrac{9.8}{4.9} = 2'),
                prose('$t = 0$ is the throw, so it is back at $t = 2$ s.'),
              ],
              'kin-grav-slider',
            ),
            teach(
              prose('At the **greatest height** it stops for an instant: $v = 0$. So the time to the top is $t = \\frac{u}{9.8}$, and the height gained is $\\tfrac{1}{2}(u + 0)t$. Thrown up at $19.6$ m/s from 10 m above the ground:'),
              working('0 &= 19.6 - 9.8t, \\quad t = 2', 's &= \\tfrac{1}{2}(19.6 + 0) \\times 2 = 19.6', '\\text{height} &= 10 + 19.6 = 29.6'),
              prose('Going up and coming back to the same level take the same time. Thrown from a cliff, it carries on past its start: below that point $s$ is negative.'),
            ),
            ask('kin-top-tree'),
            ask('kin-grav-steps', 2),
            ask('kin-grav-slider', 2),
            teach(
              prose('From the top it falls from rest, so it falls $4.9t^{2}$. Thrown up at $19.6$ m/s from 24.5 m above the ground:'),
              working(
                '\\text{to the top: } t &= 2, \\text{ rising } 19.6',
                '\\text{top: } 24.5 + 19.6 &= 44.1',
                '\\text{fall: } 4.9t^{2} &= 44.1',
                't^{2} &= 9, \\ t = 3',
                '\\text{in the air: } 2 + 3 &= 5',
              ),
              prose('Solving $-24.5 = 19.6t - 4.9t^{2}$ in one go (Quadratics, "The Quadratic Formula") gives the same 5 s; keep the positive root.'),
            ),
            ask('kin-grav-height+choice', 2),
            ask('kin-top-tree', 2),
          ],
          skillCheck: [ask('kin-grav-height', 2), ask('kin-grav-steps', 2), ask('kin-top-tree', 2)],
        },
        {
          id: 'kn-l2-two-stage',
          title: 'Two-Stage Journeys and Catching Up',
          slides: [
            teach(
              prose(
                'A journey can change acceleration part way. Treat each **stage** as its own suvat problem: where one stage ends, the next begins, so the first stage\'s $v$ is the second stage\'s $u$.',
              ),
              prose('A table with a row per stage keeps track: fill each row from the one above. From rest at 3 m/s² for 4 s, then steady for 5 s:'),
              working(
                '\\text{stage 1: } v &= 0 + 3 \\times 4 = 12',
                's &= \\tfrac{1}{2} \\times 3 \\times 4^{2} = 24',
                '\\text{stage 2: } u &= 12',
                's &= 12 \\times 5 = 60',
                '\\text{total: } s &= 24 + 60 = 84',
              ),
            ),
            ask('kin-stage-table'),
            ask('kin-twostage-steps'),
            ask('kin-stage-table', 2),
            teach(
              prose(
                'Two things **meet** when they are at the same place at the same time. One already ahead at a steady speed is caught at the **difference** of the speeds: 30 m behind, at 8 m/s against 5 m/s, the gap closes 3 m each second, so $t = \\frac{30}{8 - 5} = 10$ s.',
              ),
              prose('A car passes a junction at a steady $w$ just as another sets off from rest there at $a$. They meet when their displacements are equal, $\\tfrac{1}{2}at^{2} = wt$, so $t = \\frac{2w}{a}$. At $w = 10$ and $a = 4$: $t = \\frac{20}{4} = 5$ s.'),
            ),
            ask('kin-catch-time'),
            ask('kin-catch-tree'),
            ask('kin-twostage-steps', 2),
            teach(
              prose('With a head start $d$, the chaser has to cover $d$ more: $\\tfrac{1}{2}at^{2} = d + wt$, a quadratic in $t$. A cyclist 24 m ahead rides at a steady $2$ m/s; a runner starts from rest at 2 m/s²:'),
              working('\\tfrac{1}{2} \\times 2t^{2} &= 24 + 2t', 't^{2} - 2t - 24 &= 0', '(t - 6)(t + 4) &= 0'),
              prose('Keep the positive root: $t = 6$ s. The negative one is before the start.'),
            ),
            ask('kin-catch-time', 2),
            askAfter(
              [
                prose('If the one ahead is accelerating too, give it its own $\\tfrac{1}{2}at^{2}$. Passing at 10 m/s and accelerating at 1 m/s², chased from rest at 3 m/s²:'),
                working('\\tfrac{1}{2} \\times 3t^{2} &= 10t + \\tfrac{1}{2} \\times 1t^{2}', '\\tfrac{1}{2} \\times 2t^{2} &= 10t', 't &= \\tfrac{2 \\times 10}{2} = 10'),
              ],
              'kin-catch-tree',
              2,
            ),
          ],
          skillCheck: [ask('kin-stage-table', 2), ask('kin-catch-tree', 2), ask('kin-catch-time', 2)],
        },
      ],
      levelCheck: [
        ask('kin-vuat', 2),
        ask('kin-v2', 2),
        ask('kin-which-flow', 2),
        ask('kin-grav-height', 2),
        ask('kin-stage-table', 2),
        ask('kin-suat-steps', 2),
        ask('kin-uvt-tiles', 2),
        ask('kin-signs-tiles', 2),
        ask('kin-top-tree', 2),
        ask('kin-catch-tree', 2),
        ask('kin-suat-find+choice', 2),
        ask('kin-vsq-tree', 2),
        ask('kin-solve-mixed+choice', 2),
        ask('kin-grav-slider', 2),
        ask('kin-catch-time+choice', 2),
      ],
    },
    {
      id: 'kn-l3',
      title: 'Calculus in Kinematics',
      lessons: [
        {
          id: 'kn-l3-velocity',
          title: 'Velocity from Displacement',
          slides: [
            teach(
              prose(
                'When $s$ is given as a formula in $t$, the velocity is its **rate of change**: the gradient of the displacement-time graph at that instant, which is the derivative (Differentiation, "Sums and Constants").',
              ),
              display('v = \\frac{ds}{dt}'),
              prose('For $s = 2t^{3} - 5t + 1$, each power comes down in front and drops by one, and the constant goes:'),
              display('v = 6t^{2} - 5'),
            ),
            ask('kin-ds-dt'),
            ask('kin-ds-tiles'),
            ask('kin-v-at'),
            teach(
              prose('For the velocity **at a moment**, differentiate first and put the time in second. Putting the time into $s$ gives where it is, not how fast it is going.'),
              working('v &= 6t^{2} - 5', 'v(2) &= 6(2)^{2} - 5 = 19'),
            ),
            ask('kin-v-table'),
            ask('kin-ds-dt', 2),
            ask('kin-v-at+choice', 2),
            teach(
              prose('Working back, set $v$ equal to a value and solve for $t$. With $s = t^{2} + 3t$, $v = 2t + 3$, so it moves at $11$ m/s when $2t + 3 = 11$: $t = 4$.'),
              prose('A formula can come in any order. $s = 4 + 3t - t^{3}$ is $-t^{3} + 3t + 4$, and differentiates the same way.'),
            ),
            ask('kin-v-slider'),
            ask('kin-ds-tiles', 2),
          ],
          skillCheck: [ask('kin-ds-dt', 2), ask('kin-v-at', 2), ask('kin-v-table', 2)],
        },
        {
          id: 'kn-l3-acceleration',
          title: 'Acceleration',
          slides: [
            teach(
              prose('**Acceleration** is the rate of change of velocity: the derivative of $v$, and so the second derivative of $s$.'),
              display('a = \\frac{dv}{dt} = \\frac{d^{2}s}{dt^{2}}'),
              prose('For $v = t^{3} - 4t^{2} + 2$, $a = 3t^{2} - 8t$.'),
            ),
            ask('kin-a-dt'),
            ask('kin-a-at'),
            teach(
              prose('From $s$, differentiate twice:'),
              working('s &= t^{3} + 2t^{2} - 7t', 'v &= 3t^{2} + 4t - 7', 'a &= 6t + 4'),
              prose('Keep $v$ on the way: a question about the acceleration often asks the velocity too.'),
            ),
            ask('kin-a-tiles'),
            ask('kin-va-table'),
            ask('kin-a-at+choice', 2),
            teach(
              prose(
                'The signs say whether it is **speeding up**. When $v$ and $a$ have the same sign the acceleration acts the way it is moving, so its speed grows; opposite signs, it slows down (Motion Graphs, "Velocity-Time Graphs", read the same from a graph).',
              ),
              prose('For $v = 10 - t^{2}$ at $t = 2$: $v = 6$ and $a = -2t = -4$. Opposite signs, so it is slowing down.'),
            ),
            ask('kin-accel-flow'),
            ask('kin-accel-flow', 2),
            ask('kin-a-dt', 2),
          ],
          skillCheck: [ask('kin-a-dt', 2), ask('kin-a-at', 2), ask('kin-accel-flow', 2)],
        },
        {
          id: 'kn-l3-exponential',
          title: 'Exponential Motion',
          slides: [
            teach(
              prose(
                'Some motion follows an exponential, $s = Ae^{kt}$. Differentiating $e^{kt}$ brings $k$ down in front and leaves the power as it was (Differentiation, "Exponentials and Logarithms"):',
              ),
              display('\\frac{d}{dt}e^{kt} = ke^{kt}'),
              working('s &= 5e^{2t}', 'v &= 10e^{2t}', 'a &= 20e^{2t}'),
              prose('At $t = 0$, $e^{0} = 1$, so the **starting values** are the coefficients: it starts at $s = 5$ with $v = 10$ and $a = 20$.'),
            ),
            ask('kin-exp-v'),
            ask('kin-exp-start'),
            teach(
              prose('A constant term moves the start but differentiates to nothing: $s = 3 + 5e^{2t}$ starts at $s = 8$, with the same $v$ and $a$ as before.'),
              prose(
                '$e^{kt}$ is positive for every $t$. So with $k > 0$, $v$ and $a$ share a sign and it speeds up; with $k < 0$ they have opposite signs, and it slows down as it settles.',
              ),
            ),
            ask('kin-exp-flow'),
            ask('kin-exp-v', 2),
            ask('kin-exp-start+choice', 2),
            teach(
              prose('Because $v = kAe^{kt}$ is $k$ times $Ae^{kt}$, the velocity is always $k$ times the displacement, and differentiating again, the acceleration is $k$ times the velocity:'),
              display('v = ks, \\quad a = kv'),
              prose('With a constant term $B$, it is the distance from $B$ that counts: $v = k(s - B)$.'),
            ),
            ask('kin-exp-tree'),
            ask('kin-exp-flow', 2),
            ask('kin-exp-tree', 2),
          ],
          skillCheck: [ask('kin-exp-v', 2), ask('kin-exp-start', 2), ask('kin-exp-tree', 2)],
        },
        {
          id: 'kn-l3-integrating',
          title: 'Back by Integrating',
          slides: [
            teach(
              prose(
                'Going back is integrating (Integration, "Integrating Powers of x"): $v$ is the integral of $a$, and $s$ the integral of $v$. Raise each power by one and divide by the new power.',
              ),
              working('a &= 6t - 4', 'v &= 3t^{2} - 4t + c'),
              prose('The constant $c$ is fixed by one value you know. Starting from rest, $v = 0$ at $t = 0$, so $c = 0$.'),
            ),
            ask('kin-int-v'),
            ask('kin-int-v-at'),
            ask('kin-int-s-tiles'),
            teach(
              prose('When the value you know is at a later time, put it in and solve for $c$. With $v = 3t^{2} - 4t + c$ and $v = 9$ at $t = 2$:'),
              working('3(2)^{2} - 4(2) &= 12 - 8 = 4', '9 &= 4 + c', 'c &= 5'),
              prose('When the acceleration changes with $t$, the constant-acceleration equations do not apply: $v = u + at$ is only true for a constant $a$.'),
            ),
            ask('kin-int-c-tree'),
            ask('kin-int-s-table'),
            ask('kin-int-v', 2),
            teach(
              prose('From $v$ to $s$ is the same step again. With $v = 6t^{2} + 2t - 1$, starting at $s = 3$:'),
              working('s &= 2t^{3} + t^{2} - t + c', 'c &= 3'),
            ),
            ask('kin-int-s-tiles', 2),
            ask('kin-int-v-at+choice', 2),
          ],
          skillCheck: [ask('kin-int-v', 2), ask('kin-int-s-tiles', 2), ask('kin-int-v-at', 2)],
        },
        {
          id: 'kn-l3-interval',
          title: 'Displacement over an Interval',
          slides: [
            teach(
              prose(
                'The displacement between two times is the **definite integral** of $v$: the area under the velocity-time graph, counted negative below the axis (Integration, "The Definite Integral").',
              ),
              display('\\text{displacement} = \\int_{t_1}^{t_2} v \\, dt'),
              working('\\int_{1}^{3} (2t + 1) \\, dt &= \\Big[ t^{2} + t \\Big]_{1}^{3}', '&= 12 - 2 = 10'),
            ),
            ask('kin-disp-int'),
            ask('kin-interval-tree'),
            ask('kin-disp-int+choice', 2),
            teach(
              prose(
                '**Distance** is never negative. While $v$ keeps one sign over the interval, the distance is the size of that integral: the integral itself when $v > 0$, and minus it when $v < 0$.',
              ),
              figure({
                xMin: 0,
                xMax: 4,
                yMin: -11,
                yMax: 2,
                height: 150,
                curves: [{ f: (t) => t * t - 6 * t - 1 }],
                shade: { f: (t) => t * t - 6 * t - 1, from: 1, to: 3 },
                label: 'A velocity-time graph below the axis between t = 1 and t = 3, shaded',
              }),
              prose('Check the sign first: $v$ at each end, and whether it reaches zero in between. Every interval in this level keeps one sign; one where it changes is the next level.'),
            ),
            ask('kin-dist-choice'),
            ask('kin-dist-int'),
            ask('kin-interval-tree', 2),
            teach(
              prose('Worked the other way, a distance fixes a time. With $v = 2t + 3$ from $t = 0$, by time $T$ it has gone $\\Big[ t^{2} + 3t \\Big]_{0}^{T} = T^{2} + 3T$. When has it gone $28$ m?'),
              working('T^{2} + 3T &= 28', 'T^{2} + 3T - 28 &= 0', '(T + 7)(T - 4) &= 0'),
              prose('$T = -7$ is before it started, so $T = 4$ s.'),
            ),
            ask('kin-area-slider'),
            ask('kin-dist-int', 2),
          ],
          skillCheck: [ask('kin-disp-int', 2), ask('kin-interval-tree', 2), ask('kin-dist-int', 2)],
        },
      ],
      levelCheck: [
        ask('kin-ds-dt', 2),
        ask('kin-v-table', 2),
        ask('kin-a-at', 2),
        ask('kin-accel-flow', 2),
        ask('kin-exp-v+choice', 2),
        ask('kin-exp-tree', 2),
        ask('kin-int-v', 2),
        ask('kin-int-s-tiles', 2),
        ask('kin-int-c-tree', 2),
        ask('kin-disp-int', 2),
        ask('kin-dist-choice', 2),
        ask('kin-area-slider', 2),
        ask('kin-exp-start', 2),
        ask('kin-dist-int', 2),
      ],
    },
    {
      id: 'kn-l4',
      title: 'Variable Acceleration',
      lessons: [
        {
          id: 'kn-l4-at-rest',
          title: 'At Rest and Turning Round',
          slides: [
            teach(
              prose(
                'When the acceleration changes, the constant-acceleration equations no longer hold. Instead the velocity is the rate of change of the displacement, and the acceleration the rate of change of the velocity (Differentiation, "Sums and Constants"):',
              ),
              display('v = \\frac{ds}{dt}, \\qquad a = \\frac{dv}{dt}'),
              prose('A particle is **at rest** when $v = 0$. With $s = t^3 - 6t^2 + 9t$, $v = 3t^2 - 12t + 9 = 3(t - 1)(t - 3)$, so it is at rest at $t = 1$ and at $t = 3$.'),
            ),
            ask('kin-rest-times'),
            ask('kin-rest-times', 2),
            teach(
              prose('At rest is not always **turning round**. It turns round only if $v$ changes sign there: positive on one side, negative on the other.'),
              prose(
                'A factor that appears once, like $(t - 1)$, changes sign as $t$ passes 1, and $v$ changes with it. A squared factor never goes negative: $v = 3(t - 2)^2$ is zero at $t = 2$, but the particle only pauses there and carries on the same way.',
              ),
              prose('So with $s = t^3 - 6t^2 + 9t$, where $v = 3(t - 1)(t - 3)$, it turns round at $t = 1$ and at $t = 3$. Where it first turns round, put $t = 1$ into $s$: $s = 1 - 6 + 9 = 4$.'),
            ),
            ask('kin-turn-flow'),
            ask('kin-turn-position'),
            ask('kin-turn-position+choice', 2),
            ask('kin-turn-flow', 2),
            teach(
              prose('The particle is **at $O$** when $s = 0$: where its displacement-time graph meets the $t$-axis.'),
              figure({
                xMin: 0,
                xMax: 5,
                yMin: -6,
                yMax: 5,
                grid: true,
                height: 170,
                curves: [{ f: (t) => 4 * t - t * t }],
                marks: [
                  { x: 0, y: 0 },
                  { x: 4, y: 0 },
                ],
                label: 'A displacement-time graph rising from zero to a peak and falling back through zero',
              }),
              prose('Here $s = 4t - t^2 = t(4 - t)$: it leaves $O$ at $t = 0$ and is back at $t = 4$. On the way it turns round at $t = 2$, where the graph is flat.'),
            ),
            ask('kin-origin-slider'),
            askAfter(
              [
                prose('A cubic $s$ factorises one root at a time (Polynomials & the Factor Theorem, "The Factor Theorem"). Take $s = -t^3 + 7t^2 - 14t + 8 = -(t^3 - 7t^2 + 14t - 8)$. Try the numbers that divide 8: at $t = 1$ the bracket is $1 - 7 + 14 - 8 = 0$, so $(t - 1)$ is a factor.'),
                working('s &= -(t - 1)(t^2 - 6t + 8)', '&= -(t - 1)(t - 2)(t - 4)'),
                prose('So it is at $O$ at $t = 1$, $2$ and $4$: the third time is $t = 4$.'),
              ],
              'kin-origin-slider',
              2,
            ),
          ],
          skillCheck: [ask('kin-rest-times', 2), ask('kin-turn-flow', 2), ask('kin-origin-slider', 2)],
        },
        {
          id: 'kn-l4-max-speed',
          title: 'Maximum Speed',
          slides: [
            teach(
              prose('The velocity is greatest, or least, where it stops rising or falling: where its rate of change, the **acceleration**, is zero (Differentiation, "Finding Stationary Points").'),
              prose('With $v = 3 + 8t - 2t^2$, $a = 8 - 4t$, which is zero at $t = 2$. Before then $a > 0$ and $v$ rises; after, it falls. So the greatest velocity is'),
              working('v(2) &= 3 + 16 - 8', '&= 11'),
            ),
            ask('kin-peak-tree'),
            ask('kin-max-velocity'),
            ask('kin-peak-tree', 2),
            teach(
              prose('**Speed** is the size of the velocity, $|v|$. A velocity of $-12$ m/s is a speed of 12 m/s: faster than 9 m/s the other way.'),
              prose(
                'Over a time interval the greatest speed can only be at an **end** of the interval, or at a time inside it where $a = 0$. Work out $v$ at each, drop the signs, and take the largest.',
              ),
            ),
            ask('kin-speed-table'),
            ask('kin-interval-speed'),
            askAfter(
              [
                prose('Given $a$ instead of $v$, integrate first, with the starting velocity fixing $c$ (Calculus in Kinematics, "Back by Integrating"). With $a = 6 - 2t$ and $v = -5$ at $t = 0$:'),
                working('v &= 6t - t^2 + c, \\quad c = -5', 'a &= 0 \\text{ at } t = 3', 'v(3) &= 18 - 9 - 5 = 4'),
              ],
              'kin-max-velocity+choice',
              2,
            ),
            teach(
              prose('If $a = 0$ falls **outside** the interval, it does not count: only the ends do.'),
              prose('With $v = t^2 - 6t + 5$ for $0 \\le t \\le 2$: $a = 2t - 6$ is zero at $t = 3$, outside. $v(0) = 5$ and $v(2) = -3$, so the greatest speed is 5 m/s, at the start.'),
            ),
            ask('kin-speed-table', 2),
            ask('kin-interval-speed+choice', 2),
          ],
          skillCheck: [ask('kin-peak-tree', 2), ask('kin-speed-table', 2), ask('kin-interval-speed', 2)],
        },
        {
          id: 'kn-l4-distance',
          title: 'Distance and Displacement',
          slides: [
            teach(
              prose('The **displacement** over a time interval is the integral of the velocity (Integration, "The Definite Integral"):'),
              display('s(b) - s(a) = \\int_{a}^{b} v\\,dt'),
              prose(
                'If $v$ changes sign inside the interval, the particle turns round, and the forward and backward parts cancel in that integral. The **distance** does not cancel: split the integral where $v$ changes sign and add the sizes of the pieces.',
              ),
            ),
            askAfter(
              [
                prose('With $v = 4 - 2t$ from $t = 0$ to $t = 3$:'),
                working('\\int_{0}^{3} (4 - 2t)\\,dt &= \\Big[ 4t - t^2 \\Big]_{0}^{3}', '&= (12 - 9) - 0 = 3'),
                prose('It turns round at $t = 2$ on the way, so 3 m is the displacement, not the distance.'),
              ],
              'kin-disp-integral',
            ),
            ask('kin-split-flow'),
            ask('kin-dist-or-disp'),
            teach(
              prose('Take $v = 3t^2 - 6t$ from $t = 0$ to $t = 3$. It factorises as $3t(t - 2)$, so it changes sign at $t = 2$:'),
              working('\\int_{0}^{2} v\\,dt &= \\Big[ t^3 - 3t^2 \\Big]_{0}^{2} = -4', '\\int_{2}^{3} v\\,dt &= \\Big[ t^3 - 3t^2 \\Big]_{2}^{3} = 4'),
              prose('The displacement is $-4 + 4 = 0$: it ends where it started. The distance is $4 + 4 = 8$ m.'),
            ),
            ask('kin-pieces-tree'),
            ask('kin-dist-total'),
            ask('kin-split-flow', 2),
            teach(
              prose(
                'Find where $v = 0$ first, and keep only the times **strictly inside** the interval where $v$ changes sign. A root outside it, or a squared factor that only touches zero, needs no split.',
              ),
              prose('A check: the distance is never less than the size of the displacement, and equals it only when the particle never turns round.'),
            ),
            ask('kin-dist-total+choice', 2),
            ask('kin-pieces-tree', 2),
          ],
          skillCheck: [ask('kin-pieces-tree', 2), ask('kin-dist-total', 2), ask('kin-split-flow', 2)],
        },
        {
          id: 'kn-l4-curved-graphs',
          title: 'Reading Curved Motion Graphs',
          slides: [
            teach(
              prose(
                'A curved **displacement-time** graph has a different gradient at every point. The gradient at a point is the gradient of the **tangent** there, and it is the velocity at that moment, $v = \\frac{ds}{dt}$.',
              ),
              figure({
                xMin: 0,
                xMax: 4,
                yMin: -1,
                yMax: 6,
                grid: true,
                height: 170,
                curves: [{ f: (t) => t ** 3 - 6 * t * t + 9 * t }, { f: (t) => 2 - 3 * (t - 2), dashed: true }],
                marks: [
                  { x: 1, y: 4 },
                  { x: 2, y: 2 },
                  { x: 3, y: 0 },
                ],
                label: 'A curved displacement-time graph with a dashed tangent where it falls, and two flat points',
              }),
              prose(
                'For $s = t^3 - 6t^2 + 9t$, $v = 3t^2 - 12t + 9$. The dashed tangent at $t = 2$ has gradient $v(2) = -3$: moving the negative way at 3 m/s. Where the graph is **flat**, at $t = 1$ and $t = 3$, the particle is at rest.',
              ),
            ),
            ask('kin-curve-gradient'),
            ask('kin-flat-slider'),
            ask('kin-graph-choice'),
            teach(
              prose(
                'A curved **velocity-time** graph works the same way one step down: its gradient is the acceleration, $a = \\frac{dv}{dt}$, so $a = 0$ where it is flat. The **area** under it is still the distance, now found by integrating. For $v = 3 + 2t - t^2$, flat at $t = 1$:',
              ),
              figure({
                xMin: 0,
                xMax: 3.5,
                yMin: -1,
                yMax: 5,
                grid: true,
                height: 170,
                curves: [{ f: (t) => 3 + 2 * t - t * t }],
                shade: { f: (t) => 3 + 2 * t - t * t, from: 0, to: 3 },
                marks: [{ x: 1, y: 4 }],
                label: 'A curved velocity-time graph peaking at t = 1, with the area under it shaded to t = 3',
              }),
              working('\\int_{0}^{3} v\\,dt &= \\Big[ 3t + t^2 - \\tfrac{1}{3}t^3 \\Big]_{0}^{3}', '&= 9 + 9 - 9 = 9'),
            ),
            ask('kin-curve-area'),
            ask('kin-azero-slider'),
            ask('kin-curve-gradient+choice', 2),
            teach(
              prose('Steeper means faster. On a displacement-time graph the speed is the size of the gradient: sloping up is moving the positive way, sloping down the negative way.'),
              prose('Where the graph is flat the particle is at rest for an instant. It turns round there only if the graph comes back the way it went.'),
            ),
            ask('kin-graph-choice', 2),
            ask('kin-flat-slider', 2),
          ],
          skillCheck: [ask('kin-curve-gradient', 2), ask('kin-curve-area', 2), ask('kin-azero-slider', 2)],
        },
        {
          id: 'kn-l4-together',
          title: 'Putting It Together',
          slides: [
            teach(
              prose('The three quantities are linked both ways: differentiate to go from $s$ to $v$ to $a$, and integrate to come back, using a starting value for the constant each time.'),
              working('v &= \\frac{ds}{dt}, & a &= \\frac{dv}{dt}', 'v &= \\int a\\,dt, & s &= \\int v\\,dt'),
              prose('With $a = 6t - 4$ and $v = 2$ when $t = 0$: $v = 3t^2 - 4t + c$, and $t = 0$ gives $c = 2$, so $v = 3t^2 - 4t + 2$.'),
            ),
            ask('kin-integrate-tiles'),
            ask('kin-chain-velocity'),
            ask('kin-integrate-tiles', 2),
            teach(
              prose('A particle has $a = 6 - 6t$ and starts from rest at $O$. Then $v = 6t - 3t^2 = 3t(2 - t)$, so it next comes to rest at $t = 2$.'),
              prose('Up to then $v > 0$, so it moves one way only, and the distance is the displacement:'),
              working('\\int_{0}^{2} (6t - 3t^2)\\,dt &= \\Big[ 3t^2 - t^3 \\Big]_{0}^{2}', '&= 12 - 8 = 4'),
            ),
            ask('kin-stop-tree'),
            ask('kin-chain-velocity+choice', 2),
            ask('kin-turn-position', 2),
            teach(
              prose(
                'Before starting, name what is asked. A **time** usually comes from $v = 0$ or $a = 0$; a **position** from $s$ with its starting value; a **speed** from $|v|$; a **distance** from integrating $v$, split wherever it changes sign.',
              ),
            ),
            ask('kin-stop-tree', 2),
            ask('kin-dist-total', 2),
          ],
          skillCheck: [ask('kin-stop-tree', 2), ask('kin-chain-velocity', 2), ask('kin-integrate-tiles', 2)],
        },
      ],
      levelCheck: [
        ask('kin-rest-times', 2),
        ask('kin-peak-tree', 2),
        ask('kin-dist-total', 2),
        ask('kin-curve-gradient', 2),
        ask('kin-chain-velocity', 2),
        ask('kin-turn-flow', 2),
        ask('kin-interval-speed', 2),
        ask('kin-pieces-tree', 2),
        ask('kin-azero-slider', 2),
        ask('kin-stop-tree', 2),
        ask('kin-origin-slider', 2),
        ask('kin-speed-table', 2),
        ask('kin-split-flow', 2),
        ask('kin-graph-choice', 2),
        ask('kin-max-velocity+choice', 2),
      ],
    },
  ],
};
