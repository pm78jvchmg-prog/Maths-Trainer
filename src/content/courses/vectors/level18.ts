/**
 * Vectors, level 18 (`vm-l18`): Angles and Intersections of Planes.
 *
 * Level 8 wrote planes as `r . n = d` and found where a line meets one;
 * level 12 found angles between lines and planes. This level puts the two
 * together: how two planes sit against each other and the angle between
 * them, the line two planes meet in, where a line meets a plane and at what
 * angle, three planes meeting at one point, and the ways three planes can
 * fail to. Generators are `vplx-*`, in `generators/vectorPlanes.ts`; the one
 * reused from level 12 is `angle-planes`, as the reminder it is.
 */
import type { Level } from '../../types';
import { ask, askAfter, display, prose, stacked, teach } from './blocks';

export const level18: Level = {
  id: 'vm-l18',
  title: 'Angles and Intersections of Planes',
  lessons: [
    {
      id: 'vm-l18-two-planes',
      title: 'How Two Planes Meet',
      slides: [
        teach(
          prose(
            'Two planes meet in a line, never meet, or are the same plane. The **normals** decide first, read off the coefficients.',
          ),
          prose(
            'If $\\mathbf{n}_2$ is a multiple of $\\mathbf{n}_1$, the planes face the same way. They are the **same plane** when the whole equation is that multiple, constant included, and **parallel** when it is not. Otherwise they meet in a **line**.',
          ),
          prose('Compare three planes with'),
          display('\\Pi_1\\colon \\; {x - 2y + 3z = 4}'),
          display('2x - 4y + 6z = 8'),
          prose('is $\\Pi_1$ doubled, constant too: the same plane.'),
          display('2x - 4y + 6z = 5'),
          prose('has the doubled normal but not the doubled constant: parallel.'),
          display('x + 2y + 3z = 4'),
          prose('has a normal that is no multiple of $\\left(1, -2, 3\\right)$: the planes meet in a line.'),
        ),
        ask('vplx-planes-flow'),
        askAfter(
          [
            prose('For these planes to be parallel, the normals must be multiples:'),
            display('2x - y + 3z = 1 \\qquad 6x + ky + 9z = 7'),
            prose('The $x$ terms give the multiple:'),
            stacked('6 \\div 2 = 3', 'k = 3 \\times (-1) = -3'),
            prose('For the same plane the constant takes the multiple too. For'),
            display('3x - y + 2z = 4 \\qquad 6x - 2y + 4z = d'),
            display('d = 2 \\times 4 = 8'),
          ],
          'vplx-planes-unknown',
        ),
        ask('vplx-planes-flow', 2),
        teach(
          prose('Where two planes meet, the angle between them is the angle between their normals, taken acute:'),
          display('\\cos\\theta = \\frac{|\\mathbf{n}_1 \\cdot \\mathbf{n}_2|}{|\\mathbf{n}_1| \\, |\\mathbf{n}_2|}'),
          prose('For the planes'),
          display('x + 2y + 2z = 3 \\qquad 2x - 3y + 6z = 1'),
          stacked(
            '\\mathbf{n}_1 \\cdot \\mathbf{n}_2 = 2 - 6 + 12 = 8',
            '|\\mathbf{n}_1| = \\sqrt{9} = 3',
            '|\\mathbf{n}_2| = \\sqrt{49} = 7',
            '\\cos\\theta = \\frac{8}{3 \\times 7} = \\frac{8}{21}',
          ),
          prose(
            'A negative scalar product loses its sign: the modulus gives the acute angle. A standard cosine names the angle: $\\tfrac{1}{2}$ is $60^\\circ$, $\\tfrac{1}{\\sqrt{2}} = \\tfrac{\\sqrt{2}}{2}$ is $45^\\circ$ and $\\tfrac{\\sqrt{3}}{2}$ is $30^\\circ$.',
          ),
        ),
        ask('angle-planes'),
        ask('vplx-planes-cos'),
        ask('vplx-planes-cos+choice', 2),
        ask('vplx-planes-unknown+choice', 2),
      ],
      skillCheck: [ask('vplx-planes-flow', 2), ask('vplx-planes-unknown', 2), ask('vplx-planes-cos', 2)],
    },
    {
      id: 'vm-l18-line-of-intersection',
      title: 'The Line of Intersection',
      slides: [
        teach(
          prose(
            'Where two planes meet, the line lies in both, so its direction is perpendicular to both normals. The cross product gives exactly that:',
          ),
          display('\\mathbf{d} = \\mathbf{n}_1 \\times \\mathbf{n}_2'),
          prose(
            'For the planes',
          ),
          display('x + 2y - z = 5 \\qquad 2x - y + z = 5'),
          prose('the normals are $\\left(1, 2, -1\\right)$ and $\\left(2, -1, 1\\right)$:'),
          stacked('x\\colon \\; 2(1) - (-1)(-1) = 1', 'y\\colon \\; (-1)(2) - 1(1) = -3', 'z\\colon \\; 1(-1) - 2(2) = -5'),
          prose('So the line runs in the direction $\\left(1, -3, -5\\right)$.'),
        ),
        ask('vplx-meet-direction'),
        ask('vplx-meet-direction+choice'),
        teach(
          prose(
            'Next, one point on both planes. Set one coordinate to zero, here $z = 0$, and solve the two equations that are left:',
          ),
          stacked('x + 2y = 5', '2x - y = 5'),
          prose('Take $2$ times the first from the second, so $x$ cancels, then put $y$ back into the first:'),
          stacked('-5y = -5 \\implies y = 1', 'x + 2(1) = 5 \\implies x = 3'),
          prose(
            'So $\\left(3, 1, 0\\right)$ is on both planes. Any coordinate can be set to zero; the question says which. An equation left with one unknown gives it straight away.',
          ),
        ),
        ask('vplx-meet-solve-tree'),
        ask('vplx-meet-point'),
        ask('vplx-meet-point', 2),
        teach(
          prose('Put the point and the direction together as $\\mathbf{r} = \\mathbf{a} + t\\mathbf{d}$:'),
          display('\\mathbf{r} = \\begin{pmatrix} 3 \\\\ 1 \\\\ 0 \\end{pmatrix} + t\\begin{pmatrix} 1 \\\\ -3 \\\\ -5 \\end{pmatrix}'),
          prose(
            'Any point on both planes and any multiple of the direction give the same line, so divide out a common factor. A normal is never the direction: the line runs across the normals, not along them.',
          ),
        ),
        ask('vplx-meet-line'),
        ask('vplx-meet-line', 2),
      ],
      skillCheck: [ask('vplx-meet-direction', 2), ask('vplx-meet-point', 2), ask('vplx-meet-line', 2)],
    },
    {
      id: 'vm-l18-line-meets-plane',
      title: 'Where a Line Meets a Plane, and at What Angle',
      slides: [
        teach(
          prose(
            'A line $\\mathbf{r} = \\mathbf{a} + t\\mathbf{b}$ meeting a plane $\\mathbf{r} \\cdot \\mathbf{n} = d$ raises two questions, where and at what angle, and both start from $\\mathbf{b} \\cdot \\mathbf{n}$:',
          ),
          display(
            '\\mathbf{a} \\cdot \\mathbf{n} + t\\,\\mathbf{b} \\cdot \\mathbf{n} = d \\qquad \\sin\\theta = \\frac{|\\mathbf{b} \\cdot \\mathbf{n}|}{|\\mathbf{b}| \\, |\\mathbf{n}|}',
          ),
          prose(
            'The line through $\\left(2, -1, 3\\right)$ with direction $\\left(1, 1, 0\\right)$, and the plane $y + z = 5$ with normal $\\left(0, 1, 1\\right)$:',
          ),
          stacked(
            '\\mathbf{a} \\cdot \\mathbf{n} = -1 + 3 = 2',
            '\\mathbf{b} \\cdot \\mathbf{n} = 0 + 1 + 0 = 1',
            '2 + t = 5 \\implies t = 3',
          ),
          prose('Putting $t = 3$ into the line, they meet at $\\left(5, 2, 3\\right)$. And'),
          display('\\sin\\theta = \\frac{1}{\\sqrt{2}\\sqrt{2}} = \\frac{1}{2}'),
          prose(
            'so $\\theta = 30^\\circ$. A sine of $\\tfrac{\\sqrt{2}}{2}$ is $45^\\circ$ and $\\tfrac{\\sqrt{3}}{2}$ is $60^\\circ$; otherwise leave it as a fraction.',
          ),
        ),
        ask('vplx-meet-angle-tree'),
        ask('vplx-line-plane-sin'),
        ask('vplx-meet-angle-pair'),
        teach(
          prose(
            'When $\\mathbf{b} \\cdot \\mathbf{n} = 0$ the line runs parallel to the plane. If its starting point is on the plane as well, the whole line lies in it.',
          ),
          prose(
            'For the line through $\\left(1, 2, 1\\right)$ with direction $\\left(2, 1, -1\\right)$ to lie in $x + y + kz = d$:',
          ),
          stacked('\\mathbf{b} \\cdot \\mathbf{n} = 2 + 1 - k = 0', 'k = 3', 'd = \\mathbf{a} \\cdot \\mathbf{n} = 1 + 2 + 3 = 6'),
        ),
        ask('vplx-line-in-plane'),
        ask('vplx-line-plane-sin+choice', 2),
        ask('vplx-meet-angle-pair', 2),
        ask('vplx-line-in-plane', 2),
      ],
      skillCheck: [ask('vplx-line-plane-sin', 2), ask('vplx-meet-angle-pair', 2), ask('vplx-line-in-plane', 2)],
    },
    {
      id: 'vm-l18-three-planes',
      title: 'Three Planes Meeting at a Point',
      slides: [
        teach(
          prose(
            'Three planes meet at a single point exactly when the **determinant** of their normals is not zero. It is a cross product, then a scalar product:',
          ),
          display('\\mathbf{n}_1 \\cdot (\\mathbf{n}_2 \\times \\mathbf{n}_3) \\neq 0'),
          prose(
            'For $\\mathbf{n}_1 = \\left(1, 1, 1\\right)$, $\\mathbf{n}_2 = \\left(1, -1, 2\\right)$ and $\\mathbf{n}_3 = \\left(2, 1, -1\\right)$, first $\\mathbf{n}_2 \\times \\mathbf{n}_3$:',
          ),
          stacked('x\\colon \\; (-1)(-1) - 2(1) = -1', 'y\\colon \\; 2(2) - 1(-1) = 5', 'z\\colon \\; 1(1) - (-1)(2) = 3'),
          prose('Then the scalar product with $\\mathbf{n}_1$:'),
          display('-1 + 5 + 3 = 7'),
          prose('Not zero, so these three planes meet at exactly one point.'),
        ),
        ask('vplx-triple-tree'),
        ask('vplx-det'),
        ask('vplx-det+choice', 2),
        teach(
          prose('To find the point, solve the three equations. The first has $x$ on its own; use it to remove $x$ from the other two:'),
          stacked('x + y + z = 2', 'x - y + 2z = -3', '2x + y - z = 5'),
          prose('Take the first from the second, and $2$ times the first from the third:'),
          stacked('-2y + z = -5', '-y - 3z = 1'),
          prose('Take the first of these from $2$ times the second, so $y$ cancels, then work back:'),
          stacked('-7z = 7 \\implies z = -1', '-2y + (-1) = -5 \\implies y = 2', 'x + 2 + (-1) = 2 \\implies x = 1'),
          prose('So the planes meet at $\\left(1, 2, -1\\right)$. Check it in all three:'),
          stacked('1 + 2 - 1 = 2', '1 - 2 - 2 = -3', '2 + 2 + 1 = 5'),
        ),
        ask('vplx-three-point'),
        ask('vplx-three-check'),
        ask('vplx-three-point', 2),
        ask('vplx-three-check', 2),
      ],
      skillCheck: [ask('vplx-det', 2), ask('vplx-three-point', 2), ask('vplx-three-check', 2)],
    },
    {
      id: 'vm-l18-no-single-point',
      title: 'When Three Planes Do Not Meet at a Point',
      slides: [
        teach(
          prose(
            'When the determinant of the normals is zero, there is no single meeting point. If one normal is a multiple of another, those two planes are parallel: all three may be parallel, or the third cuts the two in a pair of parallel lines.',
          ),
          prose(
            'A letter in a normal can make the determinant zero. With',
          ),
          display('\\mathbf{n}_1 = \\left(k, 1, -1\\right) \\qquad \\mathbf{n}_2 \\times \\mathbf{n}_3 = \\left(-1, 5, 3\\right)'),
          prose('the scalar product is set to zero:'),
          stacked('-k + 5(1) + 3(-1) = 0', '-k + 2 = 0 \\implies k = 2'),
        ),
        ask('vplx-det'),
        ask('vplx-singular-k'),
        ask('vplx-singular-k+choice', 2),
        teach(
          prose('If no two normals are multiples, a zero determinant means the third normal is built from the other two:'),
          display('\\mathbf{n}_3 = \\alpha\\mathbf{n}_1 + \\beta\\mathbf{n}_2'),
          prose(
            'For $\\mathbf{n}_1 = \\left(1, 2, -1\\right)$, $\\mathbf{n}_2 = \\left(2, -1, 1\\right)$ and $\\mathbf{n}_3 = \\left(0, 5, -3\\right)$, match the $x$ and $y$ components:',
          ),
          stacked('\\alpha + 2\\beta = 0', '2\\alpha - \\beta = 5'),
          prose('Take $2$ times the first from the second:'),
          stacked('-5\\beta = 5 \\implies \\beta = -1', '\\alpha + 2(-1) = 0 \\implies \\alpha = 2'),
          prose(
            'The $z$ components check: $2(-1) - 1(1) = -3$. Where a normal has a zero, that component gives $\\alpha$ or $\\beta$ on its own.',
          ),
        ),
        ask('vplx-combo'),
        askAfter(
          [
            prose(
              'Then the constants decide. If $d_3 = \\alpha d_1 + \\beta d_2$, the equations agree and the planes share one line: a **sheaf**. If not, they meet in pairs, in three parallel lines: a **triangular prism**.',
            ),
            prose('With the planes above,'),
            display('\\Pi_1\\colon \\; {x + 2y - z = 1} \\qquad \\Pi_2\\colon \\; {2x - y + z = 3}'),
            display('\\alpha d_1 + \\beta d_2 = 2(1) - 1(3) = -1'),
            prose('So $5y - 3z = -1$ makes a sheaf, and any other constant a prism.'),
          ],
          'vplx-sheaf-d',
        ),
        ask('vplx-config-flow'),
        teach(
          prose('The whole decision, in order:'),
          prose('**1.** Determinant not zero: one point.'),
          prose('**2.** Zero, and a normal is a multiple of another: all three multiples, three parallel planes; otherwise two parallel planes cut by the third.'),
          prose('**3.** Zero, and no normal a multiple of another: $d_3 = \\alpha d_1 + \\beta d_2$ is a sheaf, anything else a prism.'),
        ),
        ask('vplx-config-flow', 2),
        ask('vplx-sheaf-d+choice', 2),
      ],
      skillCheck: [ask('vplx-singular-k', 2), ask('vplx-sheaf-d', 2), ask('vplx-config-flow', 2)],
    },
  ],
  levelCheck: [
    ask('vplx-planes-flow', 2),
    ask('vplx-planes-unknown', 2),
    ask('vplx-planes-cos', 2),
    ask('vplx-meet-direction', 2),
    ask('vplx-meet-point', 2),
    ask('vplx-meet-line', 2),
    ask('vplx-meet-angle-pair', 2),
    ask('vplx-line-plane-sin', 2),
    ask('vplx-line-in-plane', 2),
    ask('vplx-det', 2),
    ask('vplx-three-point', 2),
    ask('vplx-singular-k', 2),
    ask('vplx-sheaf-d', 2),
    ask('vplx-config-flow', 2),
  ],
};
