/**
 * Vectors, level 14 (`vm-l14`): Unit Vectors and i, j Notation.
 *
 * Shown in Vectors Basics. Writing vectors with i and j and doing arithmetic
 * in that form, magnitudes as exact surds and the distance between two
 * position vectors, a direction as an angle from the positive x axis with
 * care over the quadrant, unit vectors and vectors of a given length, and
 * the same ideas in three dimensions with k. Generators in
 * `generators/vectorUnit.ts`.
 */
import type { Level } from '../../types';
import { ask, askAfter, display, prose, stacked, teach } from './blocks';

export const level14: Level = {
  id: 'vm-l14',
  title: 'Unit Vectors and i, j Notation',
  lessons: [
    {
      id: 'vm-l14-ij-form',
      title: 'Writing Vectors with i and j',
      slides: [
        teach(
          prose('$\\mathbf{i}$ is the vector one step right and $\\mathbf{j}$ the vector one step up. Any flat vector is some number of each.'),
          display('\\mathbf{i} = \\begin{pmatrix} 1 \\\\ 0 \\end{pmatrix} \\qquad \\mathbf{j} = \\begin{pmatrix} 0 \\\\ 1 \\end{pmatrix}'),
          prose('The number in front of $\\mathbf{i}$ is the top entry of the column, and the number in front of $\\mathbf{j}$ is the bottom entry.'),
          display('4\\mathbf{i} - \\mathbf{j} = \\begin{pmatrix} 4 \\\\ -1 \\end{pmatrix} \\qquad -3\\mathbf{j} = \\begin{pmatrix} 0 \\\\ -3 \\end{pmatrix}'),
          prose('A missing letter means that component is $0$. A letter on its own means one of it, so $-\\mathbf{j}$ is $-1\\mathbf{j}$. The order of the terms does not matter: $2\\mathbf{j} + 5\\mathbf{i}$ is the same vector as $5\\mathbf{i} + 2\\mathbf{j}$.'),
          prose('Drawn on a grid, the $\\mathbf{i}$ component is how far the arrow reaches across and the $\\mathbf{j}$ component is how far it reaches up. Left and down are negative.'),
        ),
        ask('vunit-to-column'),
        ask('vunit-to-ij'),
        ask('vunit-read-j'),
        teach(
          prose('Arithmetic in $\\mathbf{i}$, $\\mathbf{j}$ form is collecting like terms: the $\\mathbf{i}$ terms together and the $\\mathbf{j}$ terms together. A number in front of a vector multiplies both of its components.'),
          prose('Take'),
          display('\\mathbf{a} = 3\\mathbf{i} - 2\\mathbf{j} \\qquad \\mathbf{b} = -\\mathbf{i} + 5\\mathbf{j}'),
          stacked(
            '2\\mathbf{a} = 6\\mathbf{i} - 4\\mathbf{j}',
            '2\\mathbf{a} - \\mathbf{b} = 6\\mathbf{i} - 4\\mathbf{j} + \\mathbf{i} - 5\\mathbf{j}',
            '= 7\\mathbf{i} - 9\\mathbf{j}',
          ),
          prose('Taking $\\mathbf{b}$ away changes the sign of both of its components, which is where the slips happen.'),
        ),
        ask('vunit-combine'),
        ask('vunit-combine+choice'),
        askAfter(
          [
            prose('When $\\mathbf{a} + \\mathbf{b}$ is known, take $\\mathbf{a}$ away to leave $\\mathbf{b}$. For example, from'),
            display('\\mathbf{a} = 2\\mathbf{i} + \\mathbf{j} \\qquad \\mathbf{a} + \\mathbf{b} = 5\\mathbf{i} - 3\\mathbf{j}'),
            stacked('\\mathbf{i}: \\; 5 - 2 = 3', '\\mathbf{j}: \\; -3 - 1 = -4', '\\mathbf{b} = 3\\mathbf{i} - 4\\mathbf{j}'),
            prose('Now this one.'),
          ],
          'vunit-missing',
        ),
        ask('vunit-read-j', 2),
      ],
      skillCheck: [ask('vunit-to-column', 2), ask('vunit-combine', 2), ask('vunit-missing', 2)],
    },
    {
      id: 'vm-l14-magnitude',
      title: 'Magnitude in i, j Form',
      slides: [
        teach(
          prose('The **magnitude** of a vector is its length. The two components are the short sides of a right-angled triangle, so the length comes from Pythagoras.'),
          display('\\left| a\\mathbf{i} + b\\mathbf{j} \\right| = \\sqrt{a^2 + b^2}'),
          stacked('\\left| 2\\mathbf{i} - 5\\mathbf{j} \\right| = \\sqrt{2^2 + (-5)^2}', '= \\sqrt{4 + 25} = \\sqrt{29}'),
          prose('Squaring removes the signs, so a magnitude is never negative. $29$ is not a square number, so $\\sqrt{29}$ is the exact answer: leave the root in.'),
          prose('A vector along one axis is just the size of its one component: $\\left| -6\\mathbf{j} \\right| = 6$.'),
        ),
        ask('vunit-mag-steps'),
        ask('vunit-mag'),
        askAfter(
          [
            prose('Run the formula backwards to find a missing component. If $\\left| k\\mathbf{i} + 4\\mathbf{j} \\right| = 5$ and $k$ is positive, square both sides:'),
            stacked('k^2 + 4^2 = 5^2', 'k^2 = 25 - 16 = 9', 'k = 3'),
            prose('Now this one.'),
          ],
          'vunit-mag-k',
        ),
        teach(
          prose('A surd is in its simplest form when no square number divides what is under the root. Split off the largest square factor and take its root outside.'),
          display('\\sqrt{ab} = \\sqrt{a} \\times \\sqrt{b}'),
          stacked(
            '\\left| 6\\mathbf{i} - 3\\mathbf{j} \\right| = \\sqrt{36 + 9}',
            '= \\sqrt{45} = \\sqrt{9 \\times 5}',
            '= \\sqrt{9} \\times \\sqrt{5} = 3\\sqrt{5}',
          ),
          prose('The squares to look for are $4, 9, 16, 25, 36, 49, 64, 81, 100$. Always take the largest one that divides, so for $\\sqrt{72}$ use $36$, not $4$ or $9$:'),
          display('\\sqrt{72} = \\sqrt{36 \\times 2} = 6\\sqrt{2}'),
        ),
        ask('vunit-surd'),
        teach(
          prose('A point $A$ has **position vector** $\\mathbf{a}$: the vector from the origin to $A$. The vector from $A$ to $B$ is destination minus start, and its magnitude is the distance.'),
          display('\\overrightarrow{AB} = \\mathbf{b} - \\mathbf{a} \\qquad AB = \\left| \\mathbf{b} - \\mathbf{a} \\right|'),
          prose('Take'),
          display('\\mathbf{a} = 2\\mathbf{i} + \\mathbf{j} \\qquad \\mathbf{b} = 5\\mathbf{i} - 3\\mathbf{j}'),
          stacked('\\mathbf{b} - \\mathbf{a} = 3\\mathbf{i} - 4\\mathbf{j}', 'AB = \\sqrt{3^2 + (-4)^2} = \\sqrt{25} = 5'),
        ),
        ask('vunit-distance'),
        ask('vunit-distance+choice'),
        ask('vunit-surd', 2),
      ],
      skillCheck: [ask('vunit-mag', 2), ask('vunit-surd', 2), ask('vunit-distance', 2)],
    },
    {
      id: 'vm-l14-direction',
      title: 'Direction as an Angle',
      slides: [
        teach(
          prose('A direction is often given as an angle $\\theta$ from the positive $x$ axis, the direction of $\\mathbf{i}$, measured anticlockwise.'),
          prose('For a vector pointing right and up, the components make a right-angled triangle with $\\theta$ at its corner: the $\\mathbf{j}$ component is opposite the angle and the $\\mathbf{i}$ component is next to it.'),
          display('\\tan\\theta = \\frac{b}{a} \\quad \\text{for } a\\mathbf{i} + b\\mathbf{j}'),
          prose('For $3\\mathbf{i} + 4\\mathbf{j}$:'),
          stacked('\\tan\\theta = \\frac{4}{3}', '\\theta = \\tan^{-1}\\left(\\tfrac{4}{3}\\right) \\approx 53.1^\\circ', '\\theta \\approx 53^\\circ'),
          prose('Upside down, $\\frac{3}{4}$ gives $37^\\circ$, the angle with $\\mathbf{j}$ instead. The two always add up to $90^\\circ$.'),
        ),
        ask('vunit-tan'),
        ask('vunit-angle'),
        ask('vunit-tan+choice'),
        teach(
          prose('When a component of $a\\mathbf{i} + b\\mathbf{j}$ is negative, first find the acute angle $\\alpha$ between the vector and the $x$ axis, from the sizes of the components. Then use where the vector points: right or left is the sign of $a$, up or down the sign of $b$.'),
          display('\\tan\\alpha = \\frac{|b|}{|a|}'),
          stacked(
            'a > 0, \\; b > 0: \\quad \\theta = \\alpha',
            'a < 0, \\; b > 0: \\quad \\theta = 180^\\circ - \\alpha',
            'a < 0, \\; b < 0: \\quad \\theta = 180^\\circ + \\alpha',
            'a > 0, \\; b < 0: \\quad \\theta = 360^\\circ - \\alpha',
          ),
          prose('For $-3\\mathbf{i} + 4\\mathbf{j}$, $\\alpha = 53^\\circ$ as before. It points left and up, so'),
          display('\\theta = 180^\\circ - 53^\\circ = 127^\\circ'),
          prose('When the components are the same size, $\\tan\\alpha = 1$ and $\\alpha = 45^\\circ$ exactly, so $-2\\mathbf{i} - 2\\mathbf{j}$ is at $180^\\circ + 45^\\circ = 225^\\circ$. A vector along an axis is at $0^\\circ$, $90^\\circ$, $180^\\circ$ or $270^\\circ$.'),
        ),
        ask('vunit-quadrant-flow'),
        ask('vunit-angle', 2),
        ask('vunit-axis-angle'),
        ask('vunit-quadrant-flow', 2),
      ],
      skillCheck: [ask('vunit-tan', 2), ask('vunit-angle', 2), ask('vunit-axis-angle', 2)],
    },
    {
      id: 'vm-l14-unit',
      title: 'Unit Vectors',
      slides: [
        teach(
          prose('A **unit vector** has magnitude $1$. Dividing a vector by its own magnitude gives the unit vector in the same direction, written with a hat.'),
          display('\\hat{\\mathbf{v}} = \\frac{\\mathbf{v}}{\\left| \\mathbf{v} \\right|}'),
          stacked('\\left| 3\\mathbf{i} - 4\\mathbf{j} \\right| = \\sqrt{9 + 16} = 5', '\\hat{\\mathbf{v}} = \\frac{3}{5}\\mathbf{i} - \\frac{4}{5}\\mathbf{j}'),
          prose('To check a unit vector, square the components and add. The answer must be exactly $1$:'),
          display('\\frac{3^2}{5^2} + \\frac{4^2}{5^2} = \\frac{9}{25} + \\frac{16}{25} = 1'),
          prose('Dividing by the sum of the components, $3 + 4 = 7$, is the usual slip, and it does not give length one.'),
        ),
        ask('vunit-hat'),
        ask('vunit-is-unit'),
        ask('vunit-hat+choice'),
        teach(
          prose('When the magnitude is a surd, the unit vector is usually written with one over the magnitude in front, as a single number $k$.'),
          stacked('\\left| 2\\mathbf{i} + \\mathbf{j} \\right| = \\sqrt{4 + 1} = \\sqrt{5}', '\\hat{\\mathbf{v}} = \\frac{1}{\\sqrt{5}}(2\\mathbf{i} + \\mathbf{j})'),
          prose('So $k = \\frac{1}{\\sqrt{5}}$. Simplify the magnitude first if it has a square factor: $\\sqrt{8} = 2\\sqrt{2}$ gives $k = \\frac{1}{2\\sqrt{2}}$.'),
        ),
        ask('vunit-hat-k'),
        ask('vunit-hat-k+choice'),
        teach(
          prose('For a vector of a given magnitude in the same direction, multiply the unit vector by that magnitude.'),
          prose('Magnitude $15$ in the direction of $3\\mathbf{i} + 4\\mathbf{j}$, whose magnitude is $5$:'),
          stacked('15 \\times \\frac{1}{5}(3\\mathbf{i} + 4\\mathbf{j})', '= 3(3\\mathbf{i} + 4\\mathbf{j})', '= 9\\mathbf{i} + 12\\mathbf{j}'),
          prose('Check the length:'),
          stacked('\\left| 9\\mathbf{i} + 12\\mathbf{j} \\right| = \\sqrt{81 + 144}', '= \\sqrt{225} = 15'),
        ),
        ask('vunit-scale-to'),
        ask('vunit-scale-to+choice'),
      ],
      skillCheck: [ask('vunit-hat', 2), ask('vunit-hat-k', 2), ask('vunit-scale-to', 2)],
    },
    {
      id: 'vm-l14-three-d',
      title: 'Three Dimensions: i, j and k',
      slides: [
        teach(
          prose('In three dimensions a third unit vector, $\\mathbf{k}$, points along the $z$ axis. A column vector gains a third entry.'),
          display('\\mathbf{i} = \\begin{pmatrix} 1 \\\\ 0 \\\\ 0 \\end{pmatrix} \\qquad \\mathbf{j} = \\begin{pmatrix} 0 \\\\ 1 \\\\ 0 \\end{pmatrix} \\qquad \\mathbf{k} = \\begin{pmatrix} 0 \\\\ 0 \\\\ 1 \\end{pmatrix}'),
          display('2\\mathbf{i} - \\mathbf{j} + 4\\mathbf{k} = \\begin{pmatrix} 2 \\\\ -1 \\\\ 4 \\end{pmatrix} \\qquad 3\\mathbf{i} - 2\\mathbf{k} = \\begin{pmatrix} 3 \\\\ 0 \\\\ -2 \\end{pmatrix}'),
          prose('Adding and scaling work exactly as before, one component at a time. Take'),
          display('\\mathbf{a} = 2\\mathbf{i} - \\mathbf{j} + 4\\mathbf{k} \\qquad \\mathbf{b} = \\mathbf{i} + 3\\mathbf{j} - 5\\mathbf{k}'),
          prose('For $2\\mathbf{a} - \\mathbf{b}$:'),
          stacked('\\mathbf{i}: \\; 2 \\times 2 - 1 = 3', '\\mathbf{j}: \\; 2 \\times (-1) - 3 = -5', '\\mathbf{k}: \\; 2 \\times 4 - (-5) = 13'),
          display('2\\mathbf{a} - \\mathbf{b} = 3\\mathbf{i} - 5\\mathbf{j} + 13\\mathbf{k}'),
        ),
        ask('vunit-3d-column'),
        ask('vunit-3d-add'),
        ask('vunit-3d-add+choice'),
        teach(
          prose('The magnitude is Pythagoras with a third square under the root.'),
          display('\\left| x\\mathbf{i} + y\\mathbf{j} + z\\mathbf{k} \\right| = \\sqrt{x^2 + y^2 + z^2}'),
          stacked('\\left| 2\\mathbf{i} - 3\\mathbf{j} + 6\\mathbf{k} \\right| = \\sqrt{4 + 9 + 36}', '= \\sqrt{49} = 7'),
          prose('The unit vector divides all three components by the magnitude:'),
          display('\\hat{\\mathbf{v}} = \\frac{2}{7}\\mathbf{i} - \\frac{3}{7}\\mathbf{j} + \\frac{6}{7}\\mathbf{k}'),
          prose('A vector of magnitude $14$ in the same direction is $14$ times the unit vector:'),
          stacked('14 \\times \\frac{1}{7}(2\\mathbf{i} - 3\\mathbf{j} + 6\\mathbf{k})', '= 4\\mathbf{i} - 6\\mathbf{j} + 12\\mathbf{k}'),
        ),
        ask('vunit-3d-mag-tree'),
        ask('vunit-3d-mag'),
        ask('vunit-3d-hat'),
        ask('vunit-3d-scale'),
      ],
      skillCheck: [ask('vunit-3d-add', 2), ask('vunit-3d-mag', 2), ask('vunit-3d-hat', 2)],
    },
  ],
  levelCheck: [
    ask('vunit-to-column', 2),
    ask('vunit-combine', 2),
    ask('vunit-mag', 2),
    ask('vunit-surd', 2),
    ask('vunit-distance', 2),
    ask('vunit-tan', 2),
    ask('vunit-angle', 2),
    ask('vunit-axis-angle', 2),
    ask('vunit-hat', 2),
    ask('vunit-hat-k', 2),
    ask('vunit-scale-to', 2),
    ask('vunit-3d-add', 2),
    ask('vunit-3d-mag', 2),
    ask('vunit-3d-hat', 2),
  ],
};
