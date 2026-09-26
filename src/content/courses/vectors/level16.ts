/**
 * Vectors, level 16 (`vm-l16`): Vector Proofs in Shapes.
 *
 * Shown in Vectors Basics, straight after Vector Geometry, whose last lesson
 * (Vector Paths) met routes in terms of $\mathbf{a}$ and $\mathbf{b}$. This
 * level turns those routes into the GCSE "show that": midpoints in a
 * triangle, lines shown parallel, points shown collinear and the ratio that
 * falls out, ratios in parallelograms, trapeziums and regular hexagons, and
 * last where two lines cross, by writing a point two ways and comparing
 * coefficients. Proofs are asked as routes, multiples, flows and steps to
 * order, never as free text. Generators are in `generators/vectorProofs.ts`.
 */
import type { Level } from '../../types';
import { figureSvg, vecLabel } from '../../generators/vectorProofs';
import { ask, diagram, display, prose, stacked, teach } from './blocks';

/** Triangle OAB with OA = 2a, OB = 2b and the midpoints M of OA, N of OB. */
const MIDPOINT_TRIANGLE = figureSvg({
  dots: [
    { name: 'O', at: [0, 0] },
    { name: 'A', at: [200, 0] },
    { name: 'B', at: [70, 130] },
    { name: 'M', at: [100, 0] },
    { name: 'N', at: [35, 65] },
  ],
  lines: [
    { from: [200, 0], to: [70, 130] },
    { from: [100, 0], to: [35, 65], dashed: true },
  ],
  arrows: [
    { from: [0, 0], to: [200, 0], label: vecLabel(2, 'a') },
    { from: [0, 0], to: [70, 130], label: vecLabel(2, 'b') },
  ],
  ticks: [
    { from: [0, 0], to: [100, 0], count: 1 },
    { from: [100, 0], to: [200, 0], count: 1 },
    { from: [0, 0], to: [35, 65], count: 2 },
    { from: [35, 65], to: [70, 130], count: 2 },
  ],
  aria: 'Triangle OAB with M the midpoint of OA and N the midpoint of OB',
});

/** Triangle OAB with OA = 3a, OB = 3b, X and Y a third of the way along. */
const RATIO_TRIANGLE = figureSvg({
  dots: [
    { name: 'O', at: [0, 0] },
    { name: 'A', at: [200, 0] },
    { name: 'B', at: [70, 130] },
    { name: 'X', at: [66.7, 0] },
    { name: 'Y', at: [23.3, 43.3] },
  ],
  lines: [
    { from: [200, 0], to: [70, 130] },
    { from: [66.7, 0], to: [23.3, 43.3], dashed: true },
  ],
  arrows: [
    { from: [0, 0], to: [200, 0], label: vecLabel(3, 'a') },
    { from: [0, 0], to: [70, 130], label: vecLabel(3, 'b') },
  ],
  caption: ['OX : XA = 1 : 2', 'OY : YB = 1 : 2'],
  aria: 'Triangle OAB with X on OA and Y on OB, each a third of the way from O',
});

/** Parallelogram OABC with OA = 2a, OC = 3b and P a third of the way up AB. */
const PARALLELOGRAM = figureSvg({
  dots: [
    { name: 'O', at: [0, 0] },
    { name: 'A', at: [160, 0] },
    { name: 'B', at: [215, 110] },
    { name: 'C', at: [55, 110] },
    { name: 'P', at: [178.3, 36.7] },
  ],
  lines: [
    { from: [160, 0], to: [215, 110] },
    { from: [55, 110], to: [215, 110] },
    { from: [0, 0], to: [178.3, 36.7], dashed: true },
  ],
  arrows: [
    { from: [0, 0], to: [160, 0], label: vecLabel(2, 'a') },
    { from: [0, 0], to: [55, 110], label: vecLabel(3, 'b') },
  ],
  caption: ['AP : PB = 1 : 2'],
  aria: 'Parallelogram OABC with P on AB',
});

/** Regular hexagon ABCDEF with AB = a, BC = b and centre O. */
const HEXAGON = figureSvg({
  dots: [
    { name: 'A', at: [0, 0] },
    { name: 'B', at: [60, 0] },
    { name: 'C', at: [90, 52] },
    { name: 'D', at: [60, 104] },
    { name: 'E', at: [0, 104] },
    { name: 'F', at: [-30, 52] },
    { name: 'O', at: [30, 52] },
  ],
  lines: [
    { from: [90, 52], to: [60, 104] },
    { from: [60, 104], to: [0, 104] },
    { from: [0, 104], to: [-30, 52] },
    { from: [-30, 52], to: [0, 0] },
    { from: [0, 0], to: [60, 104], dashed: true },
  ],
  arrows: [
    { from: [0, 0], to: [60, 0], label: vecLabel(1, 'a') },
    { from: [60, 0], to: [90, 52], label: vecLabel(1, 'b') },
  ],
  aria: 'Regular hexagon ABCDEF with its long diagonal AD through the centre O',
});

/** Parallelogram OACB with its diagonals crossing at P. */
const DIAGONALS = figureSvg({
  dots: [
    { name: 'O', at: [0, 0] },
    { name: 'A', at: [170, 0] },
    { name: 'B', at: [55, 110] },
    { name: 'C', at: [225, 110] },
    { name: 'P', at: [112.5, 55] },
  ],
  lines: [
    { from: [170, 0], to: [225, 110] },
    { from: [55, 110], to: [225, 110] },
    { from: [0, 0], to: [225, 110], dashed: true },
    { from: [170, 0], to: [55, 110], dashed: true },
  ],
  arrows: [
    { from: [0, 0], to: [170, 0], label: vecLabel(1, 'a') },
    { from: [0, 0], to: [55, 110], label: vecLabel(1, 'b') },
  ],
  aria: 'Parallelogram OACB with diagonals OC and AB crossing at P',
});

/** Triangle OAB, D the midpoint of AB, E the midpoint of OB, OD and AE crossing at P. */
const MEDIANS = figureSvg({
  dots: [
    { name: 'O', at: [0, 0] },
    { name: 'A', at: [200, 0] },
    { name: 'B', at: [70, 130] },
    { name: 'D', at: [135, 65] },
    { name: 'E', at: [35, 65] },
    { name: 'P', at: [90, 43.3] },
  ],
  lines: [
    { from: [200, 0], to: [70, 130] },
    { from: [0, 0], to: [135, 65], dashed: true },
    { from: [200, 0], to: [35, 65], dashed: true },
  ],
  arrows: [
    { from: [0, 0], to: [200, 0], label: vecLabel(1, 'a') },
    { from: [0, 0], to: [70, 130], label: vecLabel(1, 'b') },
  ],
  ticks: [
    { from: [200, 0], to: [135, 65], count: 1 },
    { from: [135, 65], to: [70, 130], count: 1 },
    { from: [0, 0], to: [35, 65], count: 2 },
    { from: [35, 65], to: [70, 130], count: 2 },
  ],
  aria: 'Triangle OAB with D the midpoint of AB, E the midpoint of OB, and OD crossing AE at P',
});

export const level16: Level = {
  id: 'vm-l16',
  title: 'Vector Proofs in Shapes',
  lessons: [
    {
      id: 'vm-l16-midpoints',
      title: 'Midpoints in Triangles',
      slides: [
        teach(
          prose(
            'A vector proof starts from two vectors, $\\overrightarrow{OA}$ and $\\overrightarrow{OB}$, given in terms of $\\mathbf{a}$ and $\\mathbf{b}$. Every other vector is written in terms of them.',
          ),
          diagram(MIDPOINT_TRIANGLE),
          prose(
            'The method that always works: write each end as a journey from $O$, then take destination minus start, as in Vector Geometry.',
          ),
          display('\\overrightarrow{XY} = \\overrightarrow{OY} - \\overrightarrow{OX}'),
          prose(
            'Here $\\overrightarrow{OA} = 2\\mathbf{a}$, $\\overrightarrow{OB} = 2\\mathbf{b}$, and $M$ and $N$ are the midpoints of $OA$ and $OB$. A midpoint is half of the way along:',
          ),
          display('\\overrightarrow{OM} = \\mathbf{a} \\qquad \\overrightarrow{ON} = \\mathbf{b}'),
          display('\\overrightarrow{MN} = \\mathbf{b} - \\mathbf{a} = -\\mathbf{a} + \\mathbf{b}'),
          prose('The midpoint $P$ of $AB$ is the average of its ends:'),
          display('\\overrightarrow{OP} = \\frac{1}{2}\\left(\\overrightarrow{OA} + \\overrightarrow{OB}\\right)'),
          prose('Here that is $\\mathbf{a} + \\mathbf{b}$.'),
        ),
        ask('vproof-mid-route'),
        ask('vproof-mid-route+choice'),
        teach(
          prose('Now compare $\\overrightarrow{MN}$ with the third side, $\\overrightarrow{AB}$:'),
          stacked(
            '\\overrightarrow{MN} = -\\mathbf{a} + \\mathbf{b}',
            '\\overrightarrow{AB} = -2\\mathbf{a} + 2\\mathbf{b} = 2\\left(-\\mathbf{a} + \\mathbf{b}\\right)',
          ),
          prose(
            'So $\\overrightarrow{AB} = 2\\overrightarrow{MN}$, or $\\overrightarrow{MN} = \\frac{1}{2}\\overrightarrow{AB}$. When one vector is a number $k$ times another, the two are **parallel** and the first is $k$ times as long.',
          ),
          prose(
            'That is the whole proof: $MN$ is parallel to $AB$ and half as long. A negative $k$ is still parallel, pointing the opposite way: $\\overrightarrow{NM} = -\\frac{1}{2}\\overrightarrow{AB}$.',
          ),
          prose(
            'Parallel lines never meet, so two segments sharing no point is no reason to think they are not parallel.',
          ),
        ),
        ask('vproof-mid-multiple'),
        ask('vproof-mid-flow'),
        ask('vproof-mid-multiple'),
        teach(
          prose(
            'Written out, the proof is a chain, each line using the one before. With $\\overrightarrow{OA} = \\mathbf{a}$, $\\overrightarrow{OB} = \\mathbf{b}$, $M$ the midpoint of $OA$ and $P$ the midpoint of $AB$:',
          ),
          stacked(
            '\\overrightarrow{OM} = \\frac{1}{2}\\mathbf{a}',
            '\\overrightarrow{OP} = \\frac{1}{2}\\mathbf{a} + \\frac{1}{2}\\mathbf{b}',
            '\\overrightarrow{MP} = \\frac{1}{2}\\mathbf{b} = \\frac{1}{2}\\overrightarrow{OB}',
          ),
          prose(
            'So $MP$ is parallel to $OB$ and half as long. Any two midpoints do the same: the segment joining them is parallel to the third side and half its length.',
          ),
          prose('When the multiple is not obvious, take out a factor until the bracket is the other vector:'),
          stacked(
            '-\\frac{1}{2}\\mathbf{a} + \\frac{1}{2}\\mathbf{b}',
            '= \\frac{1}{2}\\left(-\\mathbf{a} + \\mathbf{b}\\right)',
          ),
          prose('The bracket is $\\overrightarrow{AB}$.'),
        ),
        ask('vproof-mid-order'),
        ask('vproof-mid-flow', 2),
      ],
      skillCheck: [ask('vproof-mid-route', 2), ask('vproof-mid-multiple', 2), ask('vproof-mid-flow', 2)],
    },
    {
      id: 'vm-l16-parallel',
      title: 'Showing Lines are Parallel',
      slides: [
        teach(
          prose(
            'Two vectors are parallel when one is a multiple of the other, with the **same** multiple on both coefficients. Taking out a common factor shows it:',
          ),
          display('6\\mathbf{a} - 9\\mathbf{b} = 3\\left(2\\mathbf{a} - 3\\mathbf{b}\\right)'),
          prose(
            'So with',
          ),
          display('\\overrightarrow{PQ} = 6\\mathbf{a} - 9\\mathbf{b} \\qquad \\overrightarrow{RS} = 2\\mathbf{a} - 3\\mathbf{b}'),
          prose(
            '$\\overrightarrow{PQ} = 3\\overrightarrow{RS}$: parallel, and three times as long. To find the multiple, divide coefficient by coefficient:',
          ),
          display('6 \\div 2 = 3 \\qquad -9 \\div \\left(-3\\right) = 3'),
          prose(
            'The multiple can be a fraction, $\\overrightarrow{RS} = \\frac{1}{3}\\overrightarrow{PQ}$, or negative: $-2\\mathbf{a} + 3\\mathbf{b}$ is $-1$ times $2\\mathbf{a} - 3\\mathbf{b}$, parallel but pointing the other way.',
          ),
          prose(
            'If the two divisions give different numbers, no single multiple works and the vectors are **not parallel**. $4\\mathbf{a} + 6\\mathbf{b}$ against $2\\mathbf{a} + 4\\mathbf{b}$ gives $2$ and then $\\frac{3}{2}$.',
          ),
        ),
        ask('vproof-multiple'),
        ask('vproof-parallel-check'),
        ask('vec-path-parallel'),
        teach(
          prose(
            'In a shape, find each vector first. $\\overrightarrow{OA} = 3\\mathbf{a}$ and $\\overrightarrow{OB} = 3\\mathbf{b}$, with $OX : XA = 1 : 2$ and $OY : YB = 1 : 2$.',
          ),
          diagram(RATIO_TRIANGLE),
          prose(
            'A ratio $1 : 2$ cuts $OA$ into $1 + 2 = 3$ equal parts, and $X$ is 1 of them from $O$, so $\\overrightarrow{OX} = \\frac{1}{3}\\overrightarrow{OA} = \\mathbf{a}$. Likewise $\\overrightarrow{OY} = \\mathbf{b}$.',
          ),
          stacked(
            '\\overrightarrow{XY} = \\mathbf{b} - \\mathbf{a} = -\\mathbf{a} + \\mathbf{b}',
            '\\overrightarrow{AB} = -3\\mathbf{a} + 3\\mathbf{b} = 3\\overrightarrow{XY}',
          ),
          prose('So $XY$ is parallel to $AB$ and a third as long.'),
        ),
        ask('vproof-parallel-route'),
        ask('vproof-parallel-flow'),
        ask('vproof-parallel-order'),
        teach(
          prose(
            'A point can also lie beyond the end of a line. If $OA$ is extended to $X$ with $OA : AX = 1 : 2$, then $OX$ is $1 + 2 = 3$ of the parts $OA$ is 1 of:',
          ),
          display('\\overrightarrow{OX} = 3\\overrightarrow{OA}'),
          prose(
            'With $\\overrightarrow{OA} = \\mathbf{a}$ and $\\overrightarrow{OB} = \\mathbf{b}$, and $Y$ found the same way on $OB$ extended:',
          ),
          stacked('\\overrightarrow{XY} = -3\\mathbf{a} + 3\\mathbf{b}', '= 3\\overrightarrow{AB}'),
          prose('Parallel, and three times as long.'),
          prose(
            'The fractions need not come out whole. With $\\overrightarrow{OA} = \\mathbf{a}$ and $OX : XA = 2 : 3$, $\\overrightarrow{OX} = \\frac{2}{5}\\mathbf{a}$, and $OA : AX = 2 : 1$ makes $\\overrightarrow{OX} = \\frac{3}{2}\\mathbf{a}$.',
          ),
        ),
        ask('vproof-parallel-route', 2),
        ask('vproof-multiple+choice'),
      ],
      skillCheck: [ask('vproof-multiple', 2), ask('vproof-parallel-route', 2), ask('vproof-parallel-flow', 2)],
    },
    {
      id: 'vm-l16-collinear',
      title: 'Showing Points are Collinear',
      slides: [
        teach(
          prose(
            'Three points are **collinear** when they lie on one straight line. The proof needs two facts: two of the vectors between them are parallel, and those two share a point.',
          ),
          prose(
            'Take',
          ),
          display('\\overrightarrow{OA} = \\mathbf{a} \\qquad \\overrightarrow{OB} = \\mathbf{b} \\qquad \\overrightarrow{OC} = -2\\mathbf{a} + 3\\mathbf{b}'),
          stacked(
            '\\overrightarrow{AB} = -\\mathbf{a} + \\mathbf{b}',
            '\\overrightarrow{AC} = -3\\mathbf{a} + 3\\mathbf{b} = 3\\overrightarrow{AB}',
          ),
          prose(
            'So $AB$ is parallel to $AC$, and both pass through $A$. Parallel lines through one point are the same line, so $A$, $B$ and $C$ are collinear.',
          ),
          prose('Any two vectors sharing a point will do:'),
          stacked('\\overrightarrow{BC} = -2\\mathbf{a} + 2\\mathbf{b}', '= 2\\overrightarrow{AB}'),
          prose(
            'That pair shares $B$. Parallel alone is not enough, since opposite sides of a parallelogram are parallel and never meet. And if no multiple works, the points are not collinear.',
          ),
        ),
        ask('vproof-collinear-flow'),
        ask('vproof-collinear-order'),
        ask('vproof-multiple'),
        teach(
          prose(
            'The multiple also says where the points sit. $\\overrightarrow{AC} = 3\\overrightarrow{AB}$ makes $AC$ three parts where $AB$ is one, so $BC$ is the other two:',
          ),
          display('AB : BC = 1 : 2'),
          prose(
            'A fraction works the same way. $\\overrightarrow{AC} = \\frac{3}{2}\\overrightarrow{AB}$ makes $BC$ half of $AB$, so:',
          ),
          stacked('AB : BC = 1 : \\frac{1}{2}', '= 2 : 1'),
          prose(
            'For $P$ on $AB$ with $\\overrightarrow{AP} = \\frac{2}{5}\\overrightarrow{AB}$, $AP$ is 2 parts of 5 and $PB$ is the other 3, so $AP : PB = 2 : 3$.',
          ),
          prose(
            'With $\\overrightarrow{OA} = \\mathbf{a}$ and $\\overrightarrow{OB} = \\mathbf{b}$, take',
          ),
          display('\\overrightarrow{OP} = \\frac{3}{5}\\mathbf{a} + \\frac{2}{5}\\mathbf{b}'),
          prose('and rewrite it as a journey from $A$:'),
          display('\\overrightarrow{OP} = \\mathbf{a} + \\frac{2}{5}\\left(\\mathbf{b} - \\mathbf{a}\\right)'),
          prose('The fraction along from $A$ is the coefficient of $\\mathbf{b}$, so again $AP : PB = 2 : 3$.'),
        ),
        ask('vproof-split-ratio'),
        ask('vproof-split-ratio+choice'),
        ask('vproof-collinear-flow', 2),
        teach(
          prose(
            'Collinearity can fix a missing number. $A$, $B$ and $C$ are collinear, with',
          ),
          display('\\overrightarrow{AB} = 2\\mathbf{a} + 3\\mathbf{b} \\qquad \\overrightarrow{BC} = c\\mathbf{a} + 9\\mathbf{b}'),
          prose('Then $\\overrightarrow{BC} = k\\overrightarrow{AB}$, and the coefficient known in both fixes $k$:'),
          stacked('k = 9 \\div 3 = 3', 'c = 3 \\times 2 = 6'),
          prose('The multiple can be a fraction or negative. With'),
          display('\\overrightarrow{AB} = 4\\mathbf{a} + 4\\mathbf{b} \\qquad \\overrightarrow{BC} = c\\mathbf{a} + 6\\mathbf{b}'),
          stacked('k = 6 \\div 4 = \\frac{3}{2}', 'c = \\frac{3}{2} \\times 4 = 6'),
        ),
        ask('vproof-collinear-unknown'),
        ask('vproof-collinear-order', 2),
      ],
      skillCheck: [ask('vproof-collinear-flow', 2), ask('vproof-split-ratio', 2), ask('vproof-collinear-unknown', 2)],
    },
    {
      id: 'vm-l16-shapes',
      title: 'Ratios in Shapes',
      slides: [
        teach(
          prose(
            'In a parallelogram $OABC$ opposite sides are equal and parallel, so $\\overrightarrow{CB} = \\overrightarrow{OA}$ and $\\overrightarrow{AB} = \\overrightarrow{OC}$. Here $\\overrightarrow{OA} = 2\\mathbf{a}$, $\\overrightarrow{OC} = 3\\mathbf{b}$ and $AP : PB = 1 : 2$.',
          ),
          diagram(PARALLELOGRAM),
          stacked(
            '\\overrightarrow{AB} = 3\\mathbf{b}',
            '\\overrightarrow{OP} = 2\\mathbf{a} + \\frac{1}{3}\\left(3\\mathbf{b}\\right) = 2\\mathbf{a} + \\mathbf{b}',
          ),
          prose(
            'A **trapezium** has only one pair of parallel sides, and the question gives it as a multiple. With $\\overrightarrow{CB} = 4\\mathbf{a}$ instead, twice $\\overrightarrow{OA}$:',
          ),
          stacked(
            '\\overrightarrow{OB} = \\overrightarrow{OC} + \\overrightarrow{CB} = 4\\mathbf{a} + 3\\mathbf{b}',
            '\\overrightarrow{AB} = \\overrightarrow{OB} - \\overrightarrow{OA} = 2\\mathbf{a} + 3\\mathbf{b}',
          ),
          prose(
            'Then a point on $AB$ or $CB$ is its start plus the right fraction of the side, and any vector is destination minus start. A midpoint $Q$ of $CB$ is $\\overrightarrow{OC} + \\frac{1}{2}\\overrightarrow{CB}$.',
          ),
        ),
        ask('vproof-shape-route'),
        ask('vproof-shape-coeffs'),
        ask('vproof-shape-route+choice'),
        teach(
          prose(
            'In a regular hexagon $ABCDEF$ opposite sides are equal and parallel. Going round, the far sides point back the other way:',
          ),
          diagram(HEXAGON),
          display('\\overrightarrow{AB} = \\mathbf{a} \\qquad \\overrightarrow{BC} = \\mathbf{b}'),
          display('\\overrightarrow{DE} = -\\mathbf{a} \\qquad \\overrightarrow{EF} = -\\mathbf{b}'),
          prose(
            'The long diagonal $AD$ is parallel to $BC$ and twice as long, and the centre $O$ is its midpoint:',
          ),
          display('\\overrightarrow{AD} = 2\\mathbf{b} \\qquad \\overrightarrow{AO} = \\mathbf{b}'),
          prose('So every vertex is a journey from $A$:'),
          stacked(
            '\\overrightarrow{AE} = \\overrightarrow{AD} + \\overrightarrow{DE}',
            '= -\\mathbf{a} + 2\\mathbf{b}',
          ),
          prose('Then destination minus start, with'),
          display('\\overrightarrow{AC} = \\mathbf{a} + \\mathbf{b}'),
          stacked(
            '\\overrightarrow{CE} = \\left(-\\mathbf{a} + 2\\mathbf{b}\\right) - \\left(\\mathbf{a} + \\mathbf{b}\\right)',
            '= -2\\mathbf{a} + \\mathbf{b}',
          ),
          prose('A midpoint is the average of its ends. For $M$ the midpoint of $DE$:'),
          stacked(
            '\\overrightarrow{AM} = \\frac{1}{2}\\left(\\overrightarrow{AD} + \\overrightarrow{AE}\\right)',
            '= -\\frac{1}{2}\\mathbf{a} + 2\\mathbf{b}',
          ),
        ),
        ask('vproof-hexagon'),
        ask('vproof-hexagon+choice'),
        ask('vproof-shape-coeffs', 2),
        teach(
          prose(
            'The same comparison proves what a shape is. $OABC$ is a parallelogram when $\\overrightarrow{CB} = \\overrightarrow{OA}$: one pair of opposite sides equal as vectors. If $\\overrightarrow{CB}$ is a multiple of $\\overrightarrow{OA}$ but not equal, it is a trapezium; if not a multiple at all, neither.',
          ),
          prose(
            'Take',
          ),
          display('\\overrightarrow{OA} = 2\\mathbf{a} \\qquad \\overrightarrow{OB} = 4\\mathbf{a} + \\mathbf{b} \\qquad \\overrightarrow{OC} = \\mathbf{b}'),
          display('\\overrightarrow{CB} = \\left(4\\mathbf{a} + \\mathbf{b}\\right) - \\mathbf{b} = 4\\mathbf{a} = 2\\overrightarrow{OA}'),
          prose('Parallel to $OA$ and twice as long, so $OABC$ is a trapezium.'),
        ),
        ask('vproof-quad-flow'),
        ask('vproof-quad-flow', 2),
      ],
      skillCheck: [ask('vproof-shape-route', 2), ask('vproof-hexagon', 2), ask('vproof-quad-flow', 2)],
    },
    {
      id: 'vm-l16-crossing',
      title: 'Where Two Lines Cross',
      slides: [
        teach(
          prose(
            'When $\\mathbf{a}$ and $\\mathbf{b}$ are not parallel, two combinations of them are equal only coefficient by coefficient. That is **comparing coefficients**:',
          ),
          display('\\lambda\\left(2\\mathbf{a} + \\mathbf{b}\\right) = 6\\mathbf{a} + \\mu\\mathbf{b}'),
          stacked('\\mathbf{a}: \\; 2\\lambda = 6 \\implies \\lambda = 3', '\\mathbf{b}: \\; \\mu = \\lambda = 3'),
          prose(
            'It finds where lines cross. In the parallelogram $OACB$, with $\\overrightarrow{OA} = \\mathbf{a}$ and $\\overrightarrow{OB} = \\mathbf{b}$, the diagonals $OC$ and $AB$ cross at $P$. Write $\\overrightarrow{OP}$ two ways, along $OC$ and from $A$ along $AB$:',
          ),
          diagram(DIAGONALS),
          display('\\overrightarrow{OP} = \\lambda\\left(\\mathbf{a} + \\mathbf{b}\\right)'),
          display('\\overrightarrow{OP} = \\mathbf{a} + \\mu\\left(\\mathbf{b} - \\mathbf{a}\\right) = \\left(1 - \\mu\\right)\\mathbf{a} + \\mu\\mathbf{b}'),
          stacked('\\mathbf{a}: \\; \\lambda = 1 - \\mu', '\\mathbf{b}: \\; \\lambda = \\mu'),
          prose(
            'Put the second into the first: $\\lambda = 1 - \\lambda$, so $\\lambda = \\mu = \\frac{1}{2}$. $P$ is halfway along both: the diagonals of a parallelogram cut each other in half.',
          ),
        ),
        ask('vproof-compare'),
        ask('vproof-compare', 2),
        teach(
          prose(
            'In a triangle: $\\overrightarrow{OA} = \\mathbf{a}$, $\\overrightarrow{OB} = \\mathbf{b}$, $D$ is the midpoint of $AB$ and $E$ the midpoint of $OB$. $OD$ and $AE$ cross at $P$.',
          ),
          diagram(MEDIANS),
          stacked(
            '\\overrightarrow{OD} = \\frac{1}{2}\\mathbf{a} + \\frac{1}{2}\\mathbf{b}',
            '\\overrightarrow{AE} = -\\mathbf{a} + \\frac{1}{2}\\mathbf{b}',
          ),
          display('\\overrightarrow{OP} = \\lambda\\overrightarrow{OD} = \\frac{1}{2}\\lambda\\mathbf{a} + \\frac{1}{2}\\lambda\\mathbf{b}'),
          display('\\overrightarrow{OP} = \\mathbf{a} + \\mu\\overrightarrow{AE} = \\left(1 - \\mu\\right)\\mathbf{a} + \\frac{1}{2}\\mu\\mathbf{b}'),
          stacked('\\mathbf{a}: \\; \\frac{1}{2}\\lambda = 1 - \\mu', '\\mathbf{b}: \\; \\frac{1}{2}\\lambda = \\frac{1}{2}\\mu'),
          prose(
            'The second gives $\\mu = \\lambda$; then $\\frac{1}{2}\\lambda = 1 - \\lambda$, so $\\lambda = \\mu = \\frac{2}{3}$.',
          ),
          prose(
            'Read the ratio off the fraction: $P$ is $\\frac{2}{3}$ of the way from $O$ to $D$, leaving $\\frac{1}{3}$, so $OP : PD = 2 : 1$. Likewise $AP : PE = 2 : 1$.',
          ),
        ),
        ask('vproof-cross'),
        ask('vproof-cross-order'),
        ask('vproof-cross-ratio'),
        teach(
          prose(
            'The answers need not match. With $AD : DB = 1 : 2$ and $E$ still the midpoint of $OB$:',
          ),
          stacked(
            '\\overrightarrow{OD} = \\mathbf{a} + \\frac{1}{3}\\left(\\mathbf{b} - \\mathbf{a}\\right) = \\frac{2}{3}\\mathbf{a} + \\frac{1}{3}\\mathbf{b}',
            '\\mathbf{a}: \\; \\frac{2}{3}\\lambda = 1 - \\mu',
            '\\mathbf{b}: \\; \\frac{1}{3}\\lambda = \\frac{1}{2}\\mu',
          ),
          prose(
            'The second gives $\\mu = \\frac{2}{3}\\lambda$, and then $\\frac{4}{3}\\lambda = 1$: $\\lambda = \\frac{3}{4}$ and $\\mu = \\frac{1}{2}$. So $OP : PD = 3 : 1$ but $AP : PE = 1 : 1$.',
          ),
          prose(
            'Check by putting both back: $\\frac{3}{4}\\left(\\frac{2}{3}\\mathbf{a} + \\frac{1}{3}\\mathbf{b}\\right)$ and $\\mathbf{a} + \\frac{1}{2}\\left(-\\mathbf{a} + \\frac{1}{2}\\mathbf{b}\\right)$ both come to $\\frac{1}{2}\\mathbf{a} + \\frac{1}{4}\\mathbf{b}$.',
          ),
        ),
        ask('vproof-cross', 2),
        ask('vproof-cross-ratio', 2),
        ask('vproof-cross-order', 2),
      ],
      skillCheck: [ask('vproof-compare', 2), ask('vproof-cross', 2), ask('vproof-cross-ratio', 2)],
    },
  ],
  levelCheck: [
    ask('vproof-mid-route', 2),
    ask('vproof-mid-multiple', 2),
    ask('vproof-multiple', 2),
    ask('vproof-parallel-route', 2),
    ask('vproof-parallel-flow', 2),
    ask('vproof-collinear-flow', 2),
    ask('vproof-split-ratio', 2),
    ask('vproof-collinear-unknown', 2),
    ask('vproof-shape-route', 2),
    ask('vproof-hexagon', 2),
    ask('vproof-quad-flow', 2),
    ask('vproof-compare', 2),
    ask('vproof-cross', 2),
    ask('vproof-cross-ratio', 2),
  ],
};
