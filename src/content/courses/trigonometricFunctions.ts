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
 * Each level closes with a level check: twelve questions, no teaching slides,
 * one attempt each.
 */
import type { Course, SlideRef } from '../types';

const teach = (
  ...blocks: { kind: 'prose' | 'display'; text?: string; tex?: string }[]
): SlideRef => ({
  type: 'literal',
  slide: {
    kind: 'teach',
    body: blocks.map((b) =>
      b.kind === 'prose'
        ? ({ kind: 'prose', text: b.text ?? '' } as const)
        : ({ kind: 'display', tex: b.tex ?? '' } as const),
    ),
  },
});

const ask = (generatorId: string, difficulty = 1): SlideRef => ({
  type: 'generated',
  generatorId,
  difficulty,
});

const prose = (text: string) => ({ kind: 'prose' as const, text });
const maths = (tex: string) => ({ kind: 'display' as const, tex });

export const trigonometricFunctions: Course = {
  id: 'trigonometric-functions',
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
            ),
            ask('trig-is-periodic'),
            ask('trig-is-periodic'),
            ask('trig-is-periodic'),
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
            ask('trig-is-periodic'),
            ask('trig-cycle-count'),
            teach(
              prose(
                'One complete repeat is a **cycle**. Because every cycle takes the same time, counting cycles and counting periods are the same thing.',
              ),
              prose(
                'If a wheel turns once every 4 seconds, then in 20 seconds it has turned 5 times, because $20 \\div 4 = 5$.',
              ),
              maths('\\text{cycles} = \\frac{\\text{total time}}{\\text{period}}'),
              prose(
                'This is why the period is the natural unit for anything that repeats: it converts an awkward stretch of time into a plain count.',
              ),
            ),
            ask('trig-cycle-count'),
            ask('trig-cycle-count'),
          ],
          skillCheck: [
            ask('trig-is-periodic', 2),
            ask('trig-cycle-count', 2),
            ask('trig-cycle-count', 2),
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
              maths('\\text{period} = t_{\\text{next peak}} - t_{\\text{this peak}}'),
              prose(
                'They must be *consecutive*. Two peaks with another peak between them are two periods apart, not one.',
              ),
            ),
            ask('trig-period-from-peaks'),
            ask('trig-period-from-peaks'),
            ask('trig-period-from-peaks'),
            teach(
              prose(
                'Peaks are convenient but not special. Any pair of matching points does, as long as they are at the same point in the cycle.',
              ),
              prose(
                'Two troughs work. So do two consecutive upward crossings of the midline. What does *not* work is pairing an upward crossing with a downward one — the curve is at the same height, but it is going the other way, so that is only half a period.',
              ),
              prose(
                'This is the most common error in reading a period off a graph, and it gives an answer exactly half the true one.',
              ),
            ),
            ask('trig-period-from-peaks'),
            ask('trig-period-from-peaks', 2),
            teach(
              prose(
                'Once the period is known, every future repeat is predictable. If a peak is at $t = 2$ with period $7$, there are peaks at $9$, $16$, $23$, and so on.',
              ),
              maths('t = 2 + 7n \\quad \\text{for whole numbers } n'),
              prose(
                'Working backwards is just as valid: $n = -1$ gives a peak at $t = -5$. A periodic function has no start, which is what makes it worth studying as a whole rather than point by point.',
              ),
            ),
            ask('trig-period-from-peaks', 2),
            ask('trig-cycle-count', 2),
          ],
          skillCheck: [
            ask('trig-period-from-peaks', 2),
            ask('trig-period-from-peaks', 2),
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
              prose(
                'Subtracting shifts right. That reads backwards to most people the first time, and it is worth being clear about why.',
              ),
            ),
            ask('trig-horizontal-shift'),
            ask('trig-horizontal-shift'),
            ask('trig-horizontal-shift'),
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
            ),
            ask('trig-horizontal-shift', 2),
            ask('trig-horizontal-shift', 2),
            teach(
              prose(
                'A horizontal shift changes nothing else. The period is the same, the maximum and minimum are the same, and the midline is the same.',
              ),
              prose(
                'This matters because it means a shift is never the explanation for a graph that is taller, flatter, or repeating at a different rate. If those have changed, something other than a shift has been done to it.',
              ),
            ),
            ask('trig-period-from-peaks', 2),
            ask('trig-horizontal-shift', 2),
          ],
          skillCheck: [
            ask('trig-horizontal-shift', 2),
            ask('trig-horizontal-shift', 2),
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
            ),
            ask('trig-midline'),
            ask('trig-midline'),
            ask('trig-midline'),
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
            ),
            ask('trig-midline', 2),
            ask('trig-midline', 2),
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
            ask('trig-midline', 2),
            ask('trig-midline', 2),
          ],
          skillCheck: [
            ask('trig-midline', 2),
            ask('trig-midline', 2),
            ask('trig-midline', 2),
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
              prose(
                'Giving the full swing instead of half of it is by far the most common mistake here. Amplitude is measured from the middle, not from the bottom.',
              ),
            ),
            ask('trig-amplitude'),
            ask('trig-amplitude'),
            ask('trig-amplitude'),
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
            ),
            ask('trig-amplitude', 2),
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
            ask('trig-amplitude', 2),
            ask('trig-amplitude', 2),
          ],
          skillCheck: [
            ask('trig-amplitude', 2),
            ask('trig-amplitude', 2),
            ask('trig-midline', 2),
          ],
        },
      ],
      levelCheck: [
        ask('trig-is-periodic', 2),
        ask('trig-cycle-count', 2),
        ask('trig-period-from-peaks', 2),
        ask('trig-midline', 2),
        ask('trig-amplitude', 2),
        ask('trig-horizontal-shift', 2),
        ask('trig-period-from-peaks', 2),
        ask('trig-amplitude', 2),
        ask('trig-cycle-count', 2),
        ask('trig-midline', 2),
        ask('trig-horizontal-shift', 2),
        ask('trig-is-periodic', 2),
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
                'Put a point on a circle of radius $1$, centred at the origin, starting at the far right. Now turn it anticlockwise and watch its height above the centre.',
              ),
              prose(
                'That height starts at $0$, rises to $1$ after a quarter turn, falls back to $0$ at a half turn, drops to $-1$ at three quarters, and returns to $0$. Then it does it again.',
              ),
              prose(
                'That height *is* the sine of the angle turned. Not a ratio of two sides — a height.',
              ),
              maths('\\sin(\\theta) = \\text{height of the point after turning } \\theta'),
            ),
            ask('trig-sine-from-circle'),
            ask('trig-sine-from-circle'),
            ask('trig-sine-from-circle'),
            teach(
              prose(
                'Defining it this way costs nothing for the angles you already know and gains everything for the ones you do not.',
              ),
              prose(
                'A triangle cannot have an angle of $150^{\\circ}$, but a point can certainly turn that far, and when it does it is still above the centre — so $\\sin(150^{\\circ})$ is positive, and equals $\\sin(30^{\\circ})$.',
              ),
              maths('\\sin(150^{\\circ}) = \\sin(30^{\\circ}) = 0.5'),
              prose(
                'Past a half turn the point is below the centre and the sine is negative. Nothing special happens at $90^{\\circ}$; the point simply keeps going.',
              ),
            ),
            ask('trig-sine-from-circle', 2),
            ask('trig-sine-from-circle', 2),
            teach(
              prose(
                'On a circle of radius $r$ the whole picture scales. Every height is $r$ times what it was on the unit circle.',
              ),
              maths('\\text{height} = r\\sin(\\theta)'),
              prose(
                'So the radius is the amplitude: it is how far the height swings from the centre line. The midline is the height of the centre, which so far has been $0$.',
              ),
              prose(
                'Plotting height against angle gives the sine curve. Its period is one full turn, because that is when the point is back where it started.',
              ),
            ),
            ask('trig-sine-from-circle', 2),
            ask('trig-amplitude', 2),
          ],
          skillCheck: [
            ask('trig-sine-from-circle', 2),
            ask('trig-sine-from-circle', 2),
            ask('trig-sine-from-circle', 2),
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
              maths('\\cos(\\theta) = \\text{horizontal displacement of the point}'),
              prose(
                'It starts at $1$, since the point begins at the far right. After a quarter turn it is directly above the centre, so the displacement is $0$. At a half turn it is at the far left, giving $-1$.',
              ),
            ),
            ask('trig-cosine-from-circle'),
            ask('trig-cosine-from-circle'),
            ask('trig-cosine-from-circle'),
            teach(
              prose(
                'Sine and cosine describe the same motion, measured in two directions. That is why their graphs have the same shape and the same period, and differ only in where they start.',
              ),
              maths('\\cos(\\theta) = \\sin(\\theta + 90^{\\circ})'),
              prose(
                'Cosine is a quarter turn ahead of sine. Everything from the previous lesson about shifting a graph sideways applies here, and this is the tidiest example of it.',
              ),
              prose(
                'A practical consequence: any question about cosine can be answered by shifting a sine question, and the other way round. They are not two facts to learn but one.',
              ),
            ),
            ask('trig-cosine-from-circle', 2),
            ask('trig-cosine-from-circle', 2),
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
            ask('trig-cosine-from-circle', 2),
            ask('trig-sine-from-circle', 2),
          ],
          skillCheck: [
            ask('trig-cosine-from-circle', 2),
            ask('trig-cosine-from-circle', 2),
            ask('trig-sine-from-circle', 2),
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
            ),
            ask('trig-period-from-speed'),
            ask('trig-period-from-speed'),
            ask('trig-speed-comparison'),
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
            ),
            ask('trig-period-from-speed', 2),
            ask('trig-speed-comparison'),
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
            ask('trig-period-from-speed', 2),
            ask('trig-period-from-speed', 2),
          ],
          skillCheck: [
            ask('trig-period-from-speed', 2),
            ask('trig-speed-comparison'),
            ask('trig-period-from-speed', 2),
          ],
        },
      ],
      levelCheck: [
        ask('trig-sine-from-circle', 2),
        ask('trig-cosine-from-circle', 2),
        ask('trig-period-from-speed', 2),
        ask('trig-sine-from-circle', 2),
        ask('trig-speed-comparison'),
        ask('trig-cosine-from-circle', 2),
        ask('trig-period-from-speed', 2),
        ask('trig-sine-from-circle', 2),
        ask('trig-cosine-from-circle', 2),
        ask('trig-amplitude', 2),
        ask('trig-period-from-speed', 2),
        ask('trig-speed-comparison'),
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
              prose(
                'Since $\\sin(t)$ runs between $-1$ and $1$, multiplying by $a$ makes it run between $-a$ and $a$, and adding $d$ lifts that to between $d - a$ and $d + a$.',
              ),
            ),
            ask('trig-read-parameters'),
            ask('trig-wave-range'),
            ask('trig-wave-range'),
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
            ask('trig-wave-range', 2),
            teach(
              prose(
                'A negative $a$ flips the curve upside down. $y = -3\\sin(t)$ starts by going *down* rather than up.',
              ),
              prose(
                'Its amplitude is still $3$, because amplitude is a distance. The maximum and minimum are unchanged too — the curve reaches the same heights, just in the other order.',
              ),
              maths('y = -3\\sin(t) \\quad \\text{has amplitude } 3'),
            ),
            ask('trig-read-parameters', 2),
            ask('trig-wave-range', 2),
          ],
          skillCheck: [
            ask('trig-wave-range', 2),
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
                'The $b$ divides the period: larger $b$ means faster repeats. The $c$ shifts the graph right, exactly as it did in Level 1.',
              ),
              prose(
                'Writing it with $b$ outside the inner bracket is deliberate. It makes $c$ a genuine shift in $t$; in the expanded form $\\sin(bt - bc)$ the shift is much harder to see.',
              ),
            ),
            ask('trig-horizontal-shift'),
            ask('trig-period-from-speed'),
            ask('trig-horizontal-shift', 2),
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
            ),
            ask('trig-period-from-speed', 2),
            ask('trig-horizontal-shift', 2),
            teach(
              prose(
                'Neither of these touches the vertical picture. Squashing and sliding leave the amplitude and the midline exactly where they were.',
              ),
              prose(
                'That gives a reliable way to take a graph apart: read the height first, since $a$ and $d$ are unaffected by anything inside the bracket, and only then work out what has been done to the input.',
              ),
            ),
            ask('trig-read-parameters', 2),
            ask('trig-period-from-speed', 2),
          ],
          skillCheck: [
            ask('trig-horizontal-shift', 2),
            ask('trig-period-from-speed', 2),
            ask('trig-read-parameters', 2),
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
            ask('trig-evaluate-wave'),
            ask('trig-evaluate-wave', 2),
            teach(
              prose(
                'A useful check: the answer must lie between $d - a$ and $d + a$. Sine never leaves $[-1, 1]$, so the curve never leaves that band.',
              ),
              prose(
                'It costs a second and catches sign errors, order-of-operation errors, and misread parameters all at once. If the value is outside the band, something has gone wrong before the arithmetic.',
              ),
            ),
            ask('trig-evaluate-wave', 2),
            ask('trig-wave-range', 2),
          ],
          skillCheck: [
            ask('trig-evaluate-wave', 2),
            ask('trig-wave-range', 2),
            ask('trig-read-parameters', 2),
          ],
        },
      ],
      levelCheck: [
        ask('trig-read-parameters', 2),
        ask('trig-wave-range', 2),
        ask('trig-evaluate-wave', 2),
        ask('trig-horizontal-shift', 2),
        ask('trig-period-from-speed', 2),
        ask('trig-wave-range', 2),
        ask('trig-read-parameters', 2),
        ask('trig-evaluate-wave', 2),
        ask('trig-amplitude', 2),
        ask('trig-midline', 2),
        ask('trig-wave-range', 2),
        ask('trig-evaluate-wave', 2),
      ],
    },
  ],
};
