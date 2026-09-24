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
 * particle catching another.
 *
 * Gradients, areas, rearranging and the quadratic formula are used here, not
 * taught again: a lesson points back to Coordinate Geometry, Integration,
 * Linear Equations or Quadratics instead. Calculus with v = ds/dt is a later
 * level of this course, quoted once and never depended on. Each level closes
 * with a level check: questions only, no teaching slides, one attempt each.
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
            ask('kin-sign-flow'),
            ask('kin-line-slider'),
            teach(
              prose(
                '**Velocity** is how fast the displacement changes, and it carries a sign: which way the particle is moving. **Speed** is its size, never negative.',
              ),
              prose('With right as positive, $v = -3$ m/s means moving left at a speed of 3 m/s.'),
              prose('Moving steadily from $s = 4$ to $s = -8$ in 4 s is a velocity of $\\frac{-8 - 4}{4} = -3$ m/s.'),
            ),
            ask('kin-motion-choice'),
            ask('kin-disp+choice', 2),
            ask('kin-line-slider', 2),
            teach(
              prose(
                'The two signs answer different questions. The velocity says **which way it is moving**; the displacement says **which side of $O$ it is**.',
              ),
              prose('A ball thrown up from $O$, with up positive, is still above $O$ on its way down: $s > 0$ but $v < 0$.'),
            ),
            ask('kin-sign-flow', 2),
            ask('kin-motion-choice', 2),
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
            ask('kin-mean-speed+choice', 2),
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
            ),
            ask('kin-st-gradient'),
            ask('kin-st-table'),
            ask('kin-st-slider'),
            teach(
              prose('A **flat** stage is a gradient of zero: the particle is at rest.'),
              prose(
                'A stage sloping **down** has a negative gradient: the particle is moving the negative way. Above, the last stage is $\\frac{0 - 6}{3} = -2$ m/s, back to $O$, where the graph meets the $t$-axis.',
              ),
            ),
            ask('kin-st-choice'),
            ask('kin-st-gradient+choice', 2),
            ask('kin-st-table', 2),
            teach(
              prose('Steeper means faster, up or down: the speed is the size of the gradient, whatever its sign.'),
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
            ask('kin-dist-area'),
            ask('kin-trap-steps'),
            ask('kin-stages-tree'),
            teach(
              prose('A stage that does not start or end at zero is a **trapezium**: half the sum of the parallel sides times the width.'),
              display('\\tfrac{1}{2}(u + v)t'),
              prose(
                'Area **below** the axis is motion the negative way. For the distance, add it; for the displacement, take it away from the area above.',
              ),
            ),
            ask('kin-net-disp+choice'),
            ask('kin-dist-area+choice', 2),
            ask('kin-trap-steps', 2),
            teach(
              prose('Split the area at every corner and work stage by stage; the shapes are always triangles, rectangles or trapezia.'),
              prose('The units check the method: m/s times s is m.'),
            ),
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
                'This is the straight velocity-time graph from level 1. Rearranged (Linear Equations, "Changing the Subject"), it gives $a = \\frac{v - u}{t}$ and $t = \\frac{v - u}{a}$.',
              ),
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
            ask('kin-vuat-tiles', 2),
            teach(
              prose('Slowing down is a **negative** acceleration. Braking at 2 m/s² means $a = -2$, so the half term is taken away.'),
              prose('Given $s$, the same equation gives $a$ or $u$: put in what is known and solve the linear equation left.'),
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
            ask('kin-v2+choice', 2),
            teach(
              prose('When the acceleration plays no part, use the average of the two velocities times the time:'),
              display('s = \\tfrac{1}{2}(u + v)t'),
              prose('It is the trapezium under the velocity-time graph. From $4$ m/s to $10$ m/s in 6 s: $s = \\tfrac{1}{2} \\times 14 \\times 6 = 42$ m.'),
            ),
            ask('kin-uvt-tiles'),
            ask('kin-uvt'),
            ask('kin-vsq-tree', 2),
            teach(
              prose('Coming to rest means $v = 0$. Braking from $u$ at $a < 0$, the stopping distance is $s = \\frac{-u^{2}}{2a}$.'),
              prose('Rearranged for the time, $s = \\tfrac{1}{2}(u + v)t$ gives $t = \\frac{2s}{u + v}$.'),
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
            ),
            ask('kin-signs-tiles'),
            ask('kin-which-flow', 2),
            ask('kin-solve-mixed+choice', 2),
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
            ask('kin-grav-slider'),
            teach(
              prose('At the **greatest height** it stops for an instant: $v = 0$. So the time to the top is $t = \\frac{u}{9.8}$, and the height gained is $\\tfrac{1}{2}ut$.'),
              prose('Going up and coming back to the same level take the same time. Thrown from a cliff, it carries on past its start: below that point $s$ is negative.'),
            ),
            ask('kin-top-tree'),
            ask('kin-grav-steps', 2),
            ask('kin-grav-slider', 2),
            teach(
              prose('Landing time from a cliff $h$ m high means solving $-h = ut - 4.9t^{2}$, a quadratic (Quadratics, "The Quadratic Formula"):'),
              display('4.9t^{2} - ut - h = 0'),
              prose('Keep the positive root; the negative one is a time before it was thrown.'),
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
              prose('A table with a row per stage keeps track: fill each row from the one above.'),
            ),
            ask('kin-stage-table'),
            ask('kin-twostage-steps'),
            ask('kin-catch-time'),
            teach(
              prose(
                'Two things **meet** when they are at the same place at the same time. Starting from the same point together, that is when their displacements are equal.',
              ),
              prose('A car passes a junction at a steady $w$ just as another sets off from rest there at $a$. They meet when $\\tfrac{1}{2}at^{2} = wt$, so $t = \\frac{2w}{a}$.'),
            ),
            ask('kin-catch-tree'),
            ask('kin-stage-table', 2),
            ask('kin-twostage-steps', 2),
            teach(
              prose('With a head start $d$, the chaser has to cover $d$ more: $\\tfrac{1}{2}at^{2} = d + wt$.'),
              prose('That is a quadratic in $t$. It has one positive root, the time they meet.'),
            ),
            ask('kin-catch-time', 2),
            ask('kin-catch-tree', 2),
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
  ],
};
