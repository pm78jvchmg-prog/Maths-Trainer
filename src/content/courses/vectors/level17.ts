/**
 * Vectors, level 17 (`vm-l17`): Distances from Lines and Planes.
 *
 * Comes after Lines in Vector Form, The Angle Between Two Vectors and Planes &
 * the Cross Product, and uses all three: a general point on a line, a scalar
 * product of zero for a right angle, and the cross product for a vector at
 * right angles to two others. Generators are in
 * `src/content/generators/vectorDistances.ts`, every id `vdist-`.
 */
import type { Level } from '../../types';
import { ask, askAfter, display, prose, stacked, teach } from './blocks';

export const level17: Level = {
  id: 'vm-l17',
  title: 'Distances from Lines and Planes',
  lessons: [
    {
      id: 'vm-l17-foot-line',
      title: 'The Foot of the Perpendicular',
      slides: [
        teach(
          prose(
            'The shortest route from a point $P$ to a line meets the line at right angles. Where it lands is the **foot of the perpendicular**, $F$.',
          ),
          prose('Take the line and the point:'),
          display('\\mathbf{r} = \\begin{pmatrix} 1 \\\\ 0 \\\\ 2 \\end{pmatrix} + t\\begin{pmatrix} 1 \\\\ 2 \\\\ 2 \\end{pmatrix}'),
          display('P\\left(4, 1, 4\\right)'),
          prose(
            'A general point $R$ of the line is $\\left(1 + t, \\, 2t, \\, 2 + 2t\\right)$. The vector from $P$ to it is $R$ minus $P$:',
          ),
          display('\\overrightarrow{PR} = \\begin{pmatrix} t - 3 \\\\ 2t - 1 \\\\ 2t - 2 \\end{pmatrix}'),
          prose('At the foot this is perpendicular to the direction $\\mathbf{d}$, so their scalar product is zero:'),
          stacked('1(t - 3) + 2(2t - 1) + 2(2t - 2) = 0', '9t - 9 = 0', 't = 1'),
        ),
        ask('vdist-foot-t'),
        ask('vdist-foot-tree'),
        askAfter(
          [
            prose(
              'The value of $t$ is a step, not the answer. Put $t = 1$ back into the line: $\\left(1 + 1, \\, 2, \\, 2 + 2\\right)$, so the foot is $F\\left(2, 2, 4\\right)$.',
            ),
          ],
          'vdist-foot-point',
        ),
        teach(
          prose(
            'The vector from $P$ to the foot is the perpendicular itself. In the example, destination minus start:',
          ),
          display('\\overrightarrow{PF} = \\begin{pmatrix} 2 \\\\ 2 \\\\ 4 \\end{pmatrix} - \\begin{pmatrix} 4 \\\\ 1 \\\\ 4 \\end{pmatrix} = \\begin{pmatrix} -2 \\\\ 1 \\\\ 0 \\end{pmatrix}'),
          prose('It checks out: its scalar product with the direction is zero.'),
          stacked('(-2)(1) + 1(2) + 0(2)', '= -2 + 2 + 0 = 0'),
          prose('If that check fails, a sign has slipped somewhere in finding $t$.'),
        ),
        ask('vdist-foot-vector'),
        ask('vdist-foot-t+choice', 2),
        ask('vdist-foot-point', 2),
        ask('vdist-foot-tree', 2),
      ],
      skillCheck: [ask('vdist-foot-t', 2), ask('vdist-foot-point', 2), ask('vdist-foot-vector', 2)],
    },
    {
      id: 'vm-l17-point-line',
      title: 'The Distance from a Point to a Line',
      slides: [
        teach(
          prose(
            'The shortest distance from $P$ to a line is the length of $\\overrightarrow{PF}$, the perpendicular to the foot. In the last example $\\overrightarrow{PF} = \\left(-2, 1, 0\\right)$:',
          ),
          stacked('\\left|\\overrightarrow{PF}\\right| = \\sqrt{(-2)^2 + 1^2 + 0^2}', '= \\sqrt{5}'),
          prose('So $P\\left(4, 1, 4\\right)$ is $\\sqrt{5}$ from the line. Leave the answer as a surd: it is exact.'),
        ),
        ask('vdist-point-line'),
        ask('vdist-foot-vector', 2),
        ask('vdist-point-line+choice'),
        teach(
          prose(
            'There is a formula that skips the foot. With $A$ the point $\\mathbf{a}$ on the line and $\\mathbf{d}$ its direction:',
          ),
          display('\\text{distance} = \\frac{\\left|\\overrightarrow{AP} \\times \\mathbf{d}\\right|}{|\\mathbf{d}|}'),
          prose(
            'The cross product has length the area of the parallelogram on $\\overrightarrow{AP}$ and $\\mathbf{d}$, and dividing an area by the base $|\\mathbf{d}|$ leaves the height: the distance.',
          ),
          prose('The same example, $A\\left(1, 0, 2\\right)$ and $\\mathbf{d} = \\left(1, 2, 2\\right)$:'),
          stacked(
            '\\overrightarrow{AP} = \\left(3, 1, 2\\right)',
            '\\overrightarrow{AP} \\times \\mathbf{d} = \\left(-2, -4, 5\\right)',
            '\\left|\\overrightarrow{AP} \\times \\mathbf{d}\\right| = \\sqrt{45} = 3\\sqrt{5}',
            '|\\mathbf{d}| = \\sqrt{9} = 3',
            '\\text{distance} = \\frac{3\\sqrt{5}}{3} = \\sqrt{5}',
          ),
        ),
        ask('vdist-ap-cross'),
        ask('vdist-line-cross-tree'),
        ask('vdist-ap-cross', 2),
        ask('vdist-line-cross-tree', 2),
      ],
      skillCheck: [ask('vdist-point-line', 2), ask('vdist-ap-cross', 2), ask('vdist-line-cross-tree', 2)],
    },
    {
      id: 'vm-l17-point-plane',
      title: 'The Distance from a Point to a Plane',
      slides: [
        teach(
          prose('The distance from the point $P$, position vector $\\mathbf{p}$, to the plane $\\mathbf{r} \\cdot \\mathbf{n} = d$ is:'),
          display('\\text{distance} = \\frac{|\\mathbf{n} \\cdot \\mathbf{p} - d|}{|\\mathbf{n}|}'),
          prose('For $P\\left(3, 1, -2\\right)$ and the plane $2x - y + 2z = 10$, the normal is $\\mathbf{n} = \\left(2, -1, 2\\right)$:'),
          stacked(
            '\\mathbf{n} \\cdot \\mathbf{p} = 6 - 1 - 4 = 1',
            '\\mathbf{n} \\cdot \\mathbf{p} - d = 1 - 10 = -9',
            '|\\mathbf{n}| = \\sqrt{4 + 1 + 4} = 3',
            '\\text{distance} = \\frac{|-9|}{3} = 3',
          ),
          prose('The modulus keeps a distance positive. The answer need not be whole: $\\frac{4}{3}$ is a fine distance.'),
        ),
        ask('vdist-point-plane'),
        ask('vdist-plane-formula-tree'),
        ask('vdist-point-plane+choice', 2),
        teach(
          prose('The origin has $\\mathbf{p} = \\mathbf{0}$, so $\\mathbf{n} \\cdot \\mathbf{p} = 0$ and the distance of the plane itself from $O$ is:'),
          display('\\text{distance} = \\frac{|d|}{|\\mathbf{n}|}'),
          prose('For $2x - y + 2z = 12$ that is $\\frac{12}{3} = 4$.'),
          prose(
            'When $\\mathbf{n}$ is a unit vector, $|\\mathbf{n}| = 1$ and $d$ itself is the distance from $O$. A plane with $d = 0$ passes through the origin; the formula for $P$ still works, with $\\mathbf{n} \\cdot \\mathbf{p}$ on top.',
          ),
        ),
        ask('vdist-origin-plane'),
        ask('vdist-origin-plane+choice', 2),
        askAfter(
          [
            prose(
              'Backwards: if $2x - y + 2z = d$ is $5$ from the origin with $d > 0$, then $\\frac{d}{3} = 5$, so $d = 15$.',
            ),
          ],
          'vdist-origin-given',
        ),
        ask('vdist-plane-formula-tree', 2),
      ],
      skillCheck: [ask('vdist-point-plane', 2), ask('vdist-origin-plane', 2), ask('vdist-plane-formula-tree', 2)],
    },
    {
      id: 'vm-l17-parallel-reflect',
      title: 'Parallel Planes and the Reflection of a Point',
      slides: [
        teach(
          prose(
            'Parallel planes share a normal. Written with the **same** $\\mathbf{n}$,',
          ),
          display('\\mathbf{r} \\cdot \\mathbf{n} = d_1 \\qquad \\mathbf{r} \\cdot \\mathbf{n} = d_2'),
          prose('they are this far apart:'),
          display('\\text{distance} = \\frac{|d_1 - d_2|}{|\\mathbf{n}|}'),
          prose('For the planes'),
          display('x + 2y + 2z = 3 \\qquad x + 2y + 2z = 15'),
          prose('that is'),
          display('\\frac{|3 - 15|}{3} = \\frac{12}{3} = 4'),
          prose(
            'If the second plane is $2x + 4y + 4z = 30$, divide it by $2$ first, to $x + 2y + 2z = 15$. Comparing $3$ with $30$ would be comparing different normals.',
          ),
        ),
        ask('vdist-parallel-planes'),
        ask('vdist-parallel-planes+choice', 2),
        teach(
          prose(
            'The foot of the perpendicular from $P$ to a plane lies on the line through $P$ along the normal, $\\mathbf{r} = \\mathbf{p} + \\lambda\\mathbf{n}$. Put its general point into the plane and solve for $\\lambda$.',
          ),
          prose('For $P\\left(3, 6, 6\\right)$ and the plane $x + 2y + 2z = 9$:'),
          stacked('(3 + \\lambda) + 2(6 + 2\\lambda)', '+ 2(6 + 2\\lambda) = 9', '27 + 9\\lambda = 9', '\\lambda = -2'),
          prose('Put $\\lambda = -2$ back into the line for the foot:'),
          stacked('\\left(3, 6, 6\\right) - 2\\left(1, 2, 2\\right)', '= \\left(1, 2, 2\\right)'),
        ),
        ask('vdist-plane-foot'),
        ask('vdist-mirror-tree'),
        teach(
          prose(
            'The **mirror image** of $P$ in the plane is as far beyond the foot as $P$ is before it: the same line, at twice the value of $\\lambda$.',
          ),
          display('\\lambda = 2 \\times (-2) = -4'),
          display('\\begin{pmatrix} 3 \\\\ 6 \\\\ 6 \\end{pmatrix} - 4\\begin{pmatrix} 1 \\\\ 2 \\\\ 2 \\end{pmatrix} = \\begin{pmatrix} -1 \\\\ -2 \\\\ -2 \\end{pmatrix}'),
          prose('Check: the foot $\\left(1, 2, 2\\right)$ is the midpoint of $P$ and its image $\\left(-1, -2, -2\\right)$.'),
        ),
        ask('vdist-reflect'),
        ask('vdist-mirror-tree', 2),
        ask('vdist-plane-foot', 2),
      ],
      skillCheck: [ask('vdist-parallel-planes', 2), ask('vdist-plane-foot', 2), ask('vdist-reflect', 2)],
    },
    {
      id: 'vm-l17-skew',
      title: 'The Shortest Distance Between Skew Lines',
      slides: [
        teach(
          prose(
            'Skew lines are not parallel and never meet. Call their points $\\mathbf{a}$ and $\\mathbf{c}$ and their directions $\\mathbf{d}_1$ and $\\mathbf{d}_2$. They are closest along a line perpendicular to both, and the cross product gives its direction:',
          ),
          display('\\mathbf{n} = \\mathbf{d}_1 \\times \\mathbf{d}_2'),
          prose('The shortest distance is the part of $\\mathbf{c} - \\mathbf{a}$ that runs along $\\mathbf{n}$:'),
          display('\\text{distance} = \\frac{|(\\mathbf{c} - \\mathbf{a}) \\cdot \\mathbf{n}|}{|\\mathbf{n}|}'),
          prose(
            'For $\\mathbf{a} = \\left(1, 0, 2\\right)$, $\\mathbf{d}_1 = \\left(1, -2, 0\\right)$, $\\mathbf{c} = \\left(2, 1, -1\\right)$ and $\\mathbf{d}_2 = \\left(1, 0, 1\\right)$, the cross product first:',
          ),
          stacked(
            'x\\colon \\; {(-2)(1) - 0(0) = -2}',
            'y\\colon \\; {0(1) - 1(1) = -1}',
            'z\\colon \\; {1(0) - (-2)(1) = 2}',
          ),
          display('\\mathbf{n} = \\left(-2, -1, 2\\right) \\qquad |\\mathbf{n}| = 3'),
        ),
        ask('vdist-common-normal'),
        askAfter(
          [
            prose('Then the scalar product, and divide:'),
            stacked(
              '\\mathbf{c} - \\mathbf{a} = \\left(1, 1, -3\\right)',
              '(\\mathbf{c} - \\mathbf{a}) \\cdot \\mathbf{n} = -2 - 1 - 6 = -9',
              '\\text{distance} = \\frac{|-9|}{3} = 3',
            ),
          ],
          'vdist-skew-distance',
        ),
        ask('vdist-skew-tree'),
        teach(
          prose(
            'Any point of each line would do in place of $\\mathbf{a}$ and $\\mathbf{c}$: moving along a line does not change the part along $\\mathbf{n}$.',
          ),
          prose(
            'If $(\\mathbf{c} - \\mathbf{a}) \\cdot \\mathbf{n} = 0$, the distance is $0$ and the lines meet. So a distance that is not zero confirms they are skew.',
          ),
        ),
        ask('vdist-skew-distance+choice', 2),
        ask('vdist-skew-tree', 2),
        teach(
          prose(
            'Parallel lines have $\\mathbf{d}_1 \\times \\mathbf{d}_2 = \\mathbf{0}$, and the formula divides by zero. Instead, take the given point of the second line and find its distance from the first line, as for any point.',
          ),
          prose('For the parallel lines:'),
          display('\\mathbf{r} = \\begin{pmatrix} 1 \\\\ 0 \\\\ 2 \\end{pmatrix} + \\lambda\\begin{pmatrix} 1 \\\\ 2 \\\\ 2 \\end{pmatrix}'),
          display('\\mathbf{r} = \\begin{pmatrix} 4 \\\\ 1 \\\\ 4 \\end{pmatrix} + \\mu\\begin{pmatrix} 2 \\\\ 4 \\\\ 4 \\end{pmatrix}'),
          prose(
            'Take $C\\left(4, 1, 4\\right)$ from the second line. The vector from $C$ to a general point of the first is dotted with $\\left(1, 2, 2\\right)$ and set to zero:',
          ),
          stacked(
            '1(\\lambda - 3) + 2(2\\lambda - 1) + 2(2\\lambda - 2) = 0',
            '\\lambda = 1',
            'F = \\left(2, 2, 4\\right)',
            '\\overrightarrow{CF} = \\left(-2, 1, 0\\right)',
            '\\left|\\overrightarrow{CF}\\right| = \\sqrt{5}',
          ),
          prose('So the lines are $\\sqrt{5}$ apart.'),
        ),
        ask('vdist-parallel-lines'),
        ask('vdist-parallel-lines+choice', 2),
      ],
      skillCheck: [ask('vdist-skew-distance', 2), ask('vdist-skew-tree', 2), ask('vdist-parallel-lines', 2)],
    },
  ],
  levelCheck: [
    ask('vdist-foot-t', 2),
    ask('vdist-foot-point', 2),
    ask('vdist-foot-tree', 2),
    ask('vdist-point-line', 2),
    ask('vdist-line-cross-tree', 2),
    ask('vdist-point-plane', 2),
    ask('vdist-origin-plane', 2),
    ask('vdist-origin-given', 2),
    ask('vdist-plane-formula-tree', 2),
    ask('vdist-parallel-planes', 2),
    ask('vdist-reflect', 2),
    ask('vdist-mirror-tree', 2),
    ask('vdist-skew-distance', 2),
    ask('vdist-parallel-lines', 2),
  ],
};
