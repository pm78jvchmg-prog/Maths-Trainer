/**
 * Vectors, level 13 (`vm-l13`): Adding and Subtracting Vectors.
 *
 * Shown in Vectors Basics straight after the first level, which taught the
 * column arithmetic. This one is the picture behind it, at GCSE higher with
 * small whole numbers: arrows on squared paper, equal and negative vectors,
 * the triangle law and the parallelogram, `b - a` as the arrow from one tip to
 * the other, several vectors combined, an unknown vector solved for, and
 * unknown numbers found by matching entries. Generators in
 * `generators/vectorAdding.ts`.
 */
import type { Level } from '../../types';
import { gridSvg } from '../../generators/vectorAdding';
import { ask, askAfter, diagram, display, prose, stacked, teach } from './blocks';

const col = (x: number, y: number) => `\\begin{pmatrix} ${x} \\\\ ${y} \\end{pmatrix}`;

/** One arrow, 4 across and 3 up. */
const READING = gridSvg({
  cols: 7,
  rows: 5,
  arrows: [{ x0: 1, y0: 1, x1: 5, y1: 4, name: 'a', away: [5, 1] }],
  label: 'Vector a drawn as an arrow on squared paper, 4 squares right and 3 up',
});

/** Two equal arrows and the negative. */
const EQUAL = gridSvg({
  cols: 14,
  rows: 5,
  arrows: [
    { x0: 1, y0: 1, x1: 4, y1: 3, name: 'a', away: [4, 1] },
    { x0: 6, y0: 2, x1: 9, y1: 4, name: 'a', away: [9, 2] },
    { x0: 13, y0: 4, x1: 10, y1: 2, name: '−a', style: 'second', away: [13, 2] },
  ],
  label: 'Two equal arrows labelled a, each 3 right and 2 up, and an arrow labelled minus a, 3 left and 2 down',
});

/** a then b, head to tail, and the resultant. */
const TRIANGLE = gridSvg({
  cols: 7,
  rows: 6,
  arrows: [
    { x0: 1, y0: 1, x1: 4, y1: 2, name: 'a', away: [2, 4] },
    { x0: 4, y0: 2, x1: 5, y1: 5, name: 'b', style: 'second', away: [2, 4] },
    { x0: 1, y0: 1, x1: 5, y1: 5, name: 'a + b', style: 'result', away: [4, 2] },
  ],
  label: 'Vector a, 3 right and 1 up, then vector b from its head, 1 right and 3 up, and a dashed arrow a plus b from the tail of a to the head of b',
});

/** Parallelogram OACB: a along OA and BC, b along OB and AC. */
const PARALLELOGRAM = gridSvg({
  cols: 8,
  rows: 6,
  grid: false,
  arrows: [
    { x0: 1, y0: 1, x1: 5, y1: 1, name: 'a', away: [4, 3] },
    { x0: 1, y0: 1, x1: 3, y1: 5, name: 'b', away: [4, 3] },
    { x0: 5, y0: 1, x1: 7, y1: 5, name: 'b', style: 'second', away: [4, 3] },
    { x0: 3, y0: 5, x1: 7, y1: 5, name: 'a', style: 'second', away: [4, 3] },
    { x0: 1, y0: 1, x1: 7, y1: 5, name: 'a + b', style: 'result', away: [3, 5] },
  ],
  dots: [
    { x: 1, y: 1, name: 'O', away: [4, 3] },
    { x: 5, y: 1, name: 'A', away: [4, 3] },
    { x: 7, y: 5, name: 'C', away: [4, 3] },
    { x: 3, y: 5, name: 'B', away: [4, 3] },
  ],
  label: 'Parallelogram OACB with a along OA and BC, b along OB and AC, and the diagonal OC dashed as a plus b',
});

/** a and b from O, and the arrow from A to B. */
const TIPS = gridSvg({
  cols: 8,
  rows: 6,
  grid: false,
  arrows: [
    { x0: 1, y0: 1, x1: 6, y1: 2, name: 'a', away: [3, 3] },
    { x0: 1, y0: 1, x1: 3, y1: 5, name: 'b', style: 'second', away: [3, 3] },
    { x0: 6, y0: 2, x1: 3, y1: 5, name: 'b − a', style: 'result', away: [1, 1] },
  ],
  dots: [
    { x: 1, y: 1, name: 'O', away: [3, 3] },
    { x: 6, y: 2, name: 'A', away: [3, 3] },
    { x: 3, y: 5, name: 'B', away: [3, 3] },
  ],
  label: 'Vectors a and b drawn from O to A and B, and a dashed arrow from A to B labelled b minus a',
});

export const level13: Level = {
  id: 'vm-l13',
  title: 'Adding and Subtracting Vectors',
  lessons: [
    {
      id: 'vm-l13-grid',
      title: 'Vectors on a Grid',
      slides: [
        teach(
          prose(
            'On squared paper a vector is drawn as an arrow. Its column vector counts squares from the **tail** to the **head**: the top number is how far across, the bottom number how far up.',
          ),
          diagram(READING),
          display(`\\mathbf{a} = ${col(4, 3)}`),
          prose('Right and up are positive; left and down are negative. An arrow going 3 left and 2 down is'),
          display(col(-3, -2)),
          prose('Across always goes on top. In the answers the two blanks are labelled top and bottom.'),
        ),
        ask('vadd-read-arrow'),
        ask('vadd-arrow-slider'),
        ask('vadd-read-arrow+choice'),
        teach(
          prose(
            'Two arrows are **equal vectors** when they have the same length and the same direction, which is the same as having the same column vector. Where they are drawn does not matter.',
          ),
          diagram(EQUAL),
          prose(
            'The **negative** $-\\mathbf{a}$ has the same length as $\\mathbf{a}$ but points the opposite way, so both entries change sign.',
          ),
          display(`\\mathbf{a} = ${col(3, 2)} \\qquad -\\mathbf{a} = ${col(-3, -2)}`),
          prose('Going backwards along an arrow gives its negative. If'),
          display(`\\overrightarrow{PQ} = ${col(4, -1)}`),
          prose('then the journey from $Q$ back to $P$ is'),
          display(`\\overrightarrow{QP} = -\\overrightarrow{PQ} = ${col(-4, 1)}`),
        ),
        ask('vadd-equal-arrows'),
        ask('vadd-reverse'),
        ask('vadd-arrow-slider', 2),
        teach(
          prose('Most wrong readings come from two slips.'),
          prose(
            '**Swapping the entries.** $\\begin{pmatrix} 2 \\\\ 3 \\end{pmatrix}$ and $\\begin{pmatrix} 3 \\\\ 2 \\end{pmatrix}$ point different ways. Across is always on top.',
          ),
          prose(
            '**Losing a sign.** Count from the tail to the head. Counting from the head back to the tail gives the negative, with both signs wrong.',
          ),
        ),
        ask('vadd-equal-arrows', 2),
        ask('vadd-reverse+choice', 2),
      ],
      skillCheck: [ask('vadd-read-arrow', 2), ask('vadd-equal-arrows', 2), ask('vadd-reverse', 2)],
    },
    {
      id: 'vm-l13-triangle',
      title: 'The Triangle Law',
      slides: [
        teach(
          prose(
            'Adding vectors is doing one journey after another. Draw $\\mathbf{b}$ starting where $\\mathbf{a}$ finishes, **head to tail**. Then $\\mathbf{a} + \\mathbf{b}$ is the single arrow from the tail of $\\mathbf{a}$ to the head of $\\mathbf{b}$.',
          ),
          prose('This is the **triangle law**.'),
          diagram(TRIANGLE),
          display(`${col(3, 1)} + ${col(1, 3)} = ${col(4, 4)}`),
          prose(
            'Counting straight from the tail of $\\mathbf{a}$ to the head of $\\mathbf{b}$ gives 4 across and 4 up: the picture and the columns agree.',
          ),
        ),
        ask('vadd-head-to-tail'),
        ask('vadd-resultant-slider'),
        ask('vadd-head-to-tail+choice'),
        teach(
          prose(
            'Order does not matter. In the parallelogram $OACB$, going along $\\mathbf{a}$ then $\\mathbf{b}$ reaches $C$, and going along $\\mathbf{b}$ then $\\mathbf{a}$ reaches $C$ too.',
          ),
          diagram(PARALLELOGRAM),
          display('\\mathbf{a} + \\mathbf{b} = \\mathbf{b} + \\mathbf{a}'),
          prose(
            'Opposite sides of a parallelogram are equal vectors, so $\\overrightarrow{AC} = \\mathbf{b}$ and $\\overrightarrow{BC} = \\mathbf{a}$. Going against an arrow gives its negative, so $\\overrightarrow{CA} = -\\mathbf{b}$.',
          ),
          prose('For a diagonal, go round the sides. From $C$ back to $O$ through $A$:'),
          stacked(
            '\\overrightarrow{CO} = \\overrightarrow{CA} + \\overrightarrow{AO}',
            '\\overrightarrow{CO} = -\\mathbf{b} + \\left(-\\mathbf{a}\\right)',
            '\\overrightarrow{CO} = -\\mathbf{a} - \\mathbf{b}',
          ),
        ),
        ask('vadd-parallelogram-sum'),
        ask('vadd-resultant-slider', 2),
        ask('vadd-parallelogram-sum', 2),
        teach(
          prose(
            'The length of $\\mathbf{a} + \\mathbf{b}$ is the length of the one vector that comes out, by Pythagoras. Add first, then use',
          ),
          display('\\left| \\begin{pmatrix} x \\\\ y \\end{pmatrix} \\right| = \\sqrt{x^{2} + y^{2}}'),
          prose('With the triangle above:'),
          stacked(
            `\\mathbf{a} + \\mathbf{b} = ${col(4, 4)}`,
            '\\left| \\mathbf{a} + \\mathbf{b} \\right| = \\sqrt{4^{2} + 4^{2}}',
            '= \\sqrt{32} = 4\\sqrt{2}',
          ),
          prose(
            'Typing $\\sqrt{32}$ as sqrt(32) is fine. Adding the two lengths $\\left| \\mathbf{a} \\right| + \\left| \\mathbf{b} \\right|$ is not: two sides of a triangle are always longer than the third.',
          ),
        ),
        ask('vadd-resultant-length'),
        ask('vadd-resultant-length+choice', 2),
      ],
      skillCheck: [ask('vadd-head-to-tail', 2), ask('vadd-parallelogram-sum', 2), ask('vadd-resultant-length', 2)],
    },
    {
      id: 'vm-l13-subtract',
      title: 'Subtracting Vectors',
      slides: [
        teach(
          prose(
            'Subtracting a vector is adding its negative: $\\mathbf{a} - \\mathbf{b}$ means $\\mathbf{a} + \\left(-\\mathbf{b}\\right)$. Reverse $\\mathbf{b}$, then add.',
          ),
          display(`\\mathbf{a} = ${col(5, 2)} \\qquad \\mathbf{b} = ${col(3, -4)}`),
          stacked(
            `-\\mathbf{b} = ${col(-3, 4)}`,
            `\\mathbf{a} - \\mathbf{b} = ${col(5, 2)} + ${col(-3, 4)}`,
            `\\mathbf{a} - \\mathbf{b} = ${col(2, 6)}`,
          ),
          prose(
            'Entry by entry that is $5 - 3 = 2$ and $2 - \\left(-4\\right) = 6$. Bracket a negative being taken away: taking away $-4$ adds 4, and adding instead is the usual slip.',
          ),
          prose('Order matters. $\\mathbf{b} - \\mathbf{a}$ is the negative of $\\mathbf{a} - \\mathbf{b}$:'),
          display(`\\mathbf{b} - \\mathbf{a} = ${col(-2, -6)}`),
        ),
        ask('vadd-minus-tree'),
        ask('vadd-spot-slip'),
        ask('vadd-minus-tree', 2),
        teach(
          prose(
            'Draw $\\mathbf{a}$ and $\\mathbf{b}$ from the same point $O$, to $A$ and to $B$. To get from $A$ to $B$, go back along $\\mathbf{a}$, then out along $\\mathbf{b}$.',
          ),
          diagram(TIPS),
          display('\\overrightarrow{AB} = -\\mathbf{a} + \\mathbf{b} = \\mathbf{b} - \\mathbf{a}'),
          prose(
            'So the arrow from the head of $\\mathbf{a}$ to the head of $\\mathbf{b}$ is $\\mathbf{b} - \\mathbf{a}$: the one you arrive at minus the one you leave from. With the numbers above,',
          ),
          display(`\\overrightarrow{AB} = ${col(3, -4)} - ${col(5, 2)} = ${col(-2, -6)}`),
          prose(
            'In the parallelogram $OACB$, with $\\overrightarrow{OA} = \\mathbf{a}$ and $\\overrightarrow{OB} = \\mathbf{b}$, the second diagonal is the same idea:',
          ),
          display('\\overrightarrow{AB} = \\mathbf{b} - \\mathbf{a} \\qquad \\overrightarrow{BA} = \\mathbf{a} - \\mathbf{b}'),
        ),
        ask('vadd-tip-to-tip'),
        ask('vadd-parallelogram-diff'),
        ask('vadd-tip-to-tip+choice'),
        teach(
          prose(
            'A quick check on any subtraction: adding back should undo it. With the numbers above, $\\mathbf{a} + \\left(\\mathbf{b} - \\mathbf{a}\\right)$ should be $\\mathbf{b}$:',
          ),
          display(`${col(5, 2)} + ${col(-2, -6)} = ${col(3, -4)}`),
          prose(
            'If it comes out as something else, look for a sign lost on a negative entry, or the two vectors taken away the wrong way round.',
          ),
        ),
        ask('vadd-spot-slip', 2),
        ask('vadd-parallelogram-diff', 2),
      ],
      skillCheck: [ask('vadd-minus-tree', 2), ask('vadd-tip-to-tip', 2), ask('vadd-parallelogram-diff', 2)],
    },
    {
      id: 'vm-l13-combine',
      title: 'Combining Several Vectors',
      slides: [
        teach(
          prose(
            'To work out something like $2\\mathbf{a} - 3\\mathbf{b} + \\mathbf{c}$, scale every vector fully first, keeping its sign, then add the tops and add the bottoms.',
          ),
          display(`\\mathbf{a} = ${col(2, -1)} \\qquad \\mathbf{b} = ${col(1, 3)} \\qquad \\mathbf{c} = ${col(-2, 5)}`),
          stacked(
            `2\\mathbf{a} = ${col(4, -2)}`,
            `-3\\mathbf{b} = ${col(-3, -9)}`,
            `\\mathbf{c} = ${col(-2, 5)}`,
          ),
          stacked('4 + \\left(-3\\right) + \\left(-2\\right) = -1', '-2 + \\left(-9\\right) + 5 = -6'),
          display(`2\\mathbf{a} - 3\\mathbf{b} + \\mathbf{c} = ${col(-1, -6)}`),
          prose('When only one entry is asked for, work that row alone. The top row here is'),
          display('2 \\times 2 - 3 \\times 1 - 2 = -1'),
        ),
        ask('vadd-combine'),
        ask('vadd-combine+choice'),
        ask('vadd-combine-entry'),
        teach(
          prose(
            'An unknown vector $\\mathbf{x}$ is found the way an unknown number is: undo what is done to it, to both sides.',
          ),
          display(`\\mathbf{a} + \\mathbf{x} = \\mathbf{b} \\qquad \\mathbf{a} = ${col(3, -2)} \\qquad \\mathbf{b} = ${col(1, 4)}`),
          stacked(
            '\\mathbf{x} = \\mathbf{b} - \\mathbf{a}',
            `\\mathbf{x} = ${col(1, 4)} - ${col(3, -2)}`,
            `\\mathbf{x} = ${col(-2, 6)}`,
          ),
          prose('If instead $\\mathbf{x} - \\mathbf{a} = \\mathbf{b}$, add $\\mathbf{a}$ to both sides:'),
          stacked('\\mathbf{x} = \\mathbf{b} + \\mathbf{a}', `\\mathbf{x} = ${col(1, 4)} + ${col(3, -2)} = ${col(4, 2)}`),
        ),
        ask('vadd-solve-x'),
        ask('vadd-solve-x+choice', 2),
        teach(
          prose(
            'With a number in front, as in $2\\mathbf{x} + \\mathbf{a} = \\mathbf{b}$, first move $\\mathbf{a}$ across, then divide every entry by the number.',
          ),
          display(`\\mathbf{a} = ${col(1, -3)} \\qquad \\mathbf{b} = ${col(7, 5)}`),
          stacked(
            '2\\mathbf{x} = \\mathbf{b} - \\mathbf{a}',
            `2\\mathbf{x} = ${col(7, 5)} - ${col(1, -3)} = ${col(6, 8)}`,
            `\\mathbf{x} = ${col(3, 4)}`,
          ),
          prose(
            'With $3\\mathbf{x} - \\mathbf{a} = \\mathbf{b}$ it is $3\\mathbf{x} = \\mathbf{b} + \\mathbf{a}$ instead, then divide by 3.',
          ),
        ),
        ask('vadd-scaled-x-tree'),
        ask('vadd-combine-entry', 2),
        ask('vadd-scaled-x-tree', 2),
      ],
      skillCheck: [ask('vadd-combine', 2), ask('vadd-solve-x', 2), ask('vadd-scaled-x-tree', 2)],
    },
    {
      id: 'vm-l13-unknowns',
      title: 'Equal Vectors and Unknowns',
      slides: [
        teach(
          prose(
            'Equal vectors have equal entries: the tops match and the bottoms match. So one vector equation is two ordinary equations.',
          ),
          display(`\\begin{pmatrix} 2k + 1 \\\\ 5 \\end{pmatrix} = \\begin{pmatrix} 9 \\\\ m - 3 \\end{pmatrix}`),
          prose('Tops:'),
          stacked('2k + 1 = 9', '2k = 8', 'k = 4'),
          prose('Bottoms:'),
          stacked('5 = m - 3', 'm = 8'),
          prose(
            'The unknowns can sit on either side, and can be multiplied: $3m = 12$ gives $m = 4$. Match top with top and bottom with bottom whatever the layout.',
          ),
        ),
        ask('vadd-match-entries'),
        ask('vadd-match-entries+choice', 2),
        askAfter(
          [
            prose(
              'An unknown number can multiply a whole vector. Match one row to find it, then check the other row.',
            ),
            display(`k${col(2, -1)} + ${col(1, 4)} = ${col(7, 1)}`),
            stacked('2k + 1 = 7', '2k = 6', 'k = 3'),
            prose('Check the bottoms: $-1 \\times 3 + 4 = 1$. It works.'),
          ],
          'vadd-scalar-unknown',
        ),
        teach(
          prose(
            'With two unknown numbers, $p\\mathbf{a} + q\\mathbf{b} = \\mathbf{c}$, multiply out and match rows. That gives two equations in $p$ and $q$.',
          ),
          prose('When one vector has a zero, one row holds only $q$:'),
          display(`p${col(2, 0)} + q${col(1, 3)} = ${col(8, 6)}`),
          stacked('\\text{bottom: } 3q = 6', 'q = 2'),
          stacked('\\text{top: } 2p + q = 8', '2p + 2 = 8', 'p = 3'),
        ),
        ask('vadd-pq-easy'),
        askAfter(
          [
            prose('With a minus in front of the second vector, add it back.'),
            display(`k${col(3, 1)} - ${col(2, -5)} = ${col(10, 9)}`),
            stacked('3k - 2 = 10', '3k = 12', 'k = 4'),
          ],
          'vadd-scalar-unknown',
          2,
        ),
        ask('vadd-pq-easy+choice', 2),
        teach(
          prose(
            'With no zero to help, solve the two equations together. Make the $p$ terms match, then take one equation from the other.',
          ),
          display(`p${col(2, 1)} + q${col(1, 3)} = ${col(7, 11)}`),
          stacked('2p + q = 7', 'p + 3q = 11'),
          prose('Multiply the second by 2, so both have $2p$:'),
          stacked('2p + q = 7', '2p + 6q = 22'),
          prose('Take the second from the first, then put $q$ back in:'),
          stacked('-5q = -15', 'q = 3', '2p + 3 = 7', 'p = 2'),
        ),
        ask('vadd-pq'),
        ask('vadd-pq+choice', 2),
      ],
      skillCheck: [ask('vadd-match-entries', 2), ask('vadd-scalar-unknown', 2), ask('vadd-pq', 2)],
    },
  ],
  levelCheck: [
    ask('vadd-read-arrow', 2),
    ask('vadd-equal-arrows', 2),
    ask('vadd-reverse', 2),
    ask('vadd-head-to-tail', 2),
    ask('vadd-parallelogram-sum', 2),
    ask('vadd-resultant-length', 2),
    ask('vadd-minus-tree', 2),
    ask('vadd-tip-to-tip', 2),
    ask('vadd-parallelogram-diff', 2),
    ask('vadd-combine', 2),
    ask('vadd-solve-x', 2),
    ask('vadd-scaled-x-tree', 2),
    ask('vadd-match-entries', 2),
    ask('vadd-pq', 2),
  ],
};
