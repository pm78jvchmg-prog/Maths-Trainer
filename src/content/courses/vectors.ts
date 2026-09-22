/**
 * Vectors.
 *
 * Level 1 is vectors as components, through the scalar product and what
 * it says about direction. Split out of the old Vectors & Matrices course,
 * which was two subjects sharing a title — neither half reaches thirty lessons
 * while they share one, and a learner looking for matrices should not have to
 * know they live under a heading that starts with vectors.
 *
 * Lesson ids keep their `vm-` prefix so that progress recorded against the
 * combined course survives the split. Level 4, Vector Geometry, is `vm-l4`:
 * `vm-l2` and `vm-l3` are the Matrices course's, and `vm-l5` is kept for its
 * next level.
 *
 * Level 4 turns vectors into a way of saying where points are: position
 * vectors, a point part-way along a line, three points on one line, the
 * corners of a parallelogram, and last the same reasoning in terms of
 * $\mathbf{a}$ and $\mathbf{b}$ with no numbers at all.
 *
 * Each level closes with a level check: twelve or fourteen questions, no
 * teaching slides, one attempt each.
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

export const vectors: Course = {
  id: 'vectors',
  title: 'Vectors',
  blurb: 'Components, magnitude and the scalar product, then vector geometry.',
  levels: [
    {
      id: 'vm-l1',
      title: 'Vectors',
      lessons: [
        {
          id: 'vm-l1-components',
          title: 'Vectors and Components',
          slides: [
            teach(
              prose(
                'A **vector** has size and direction, where an ordinary number has only size. A displacement of 3 east and 2 north is a vector; the distance walked is not.',
              ),
              prose(
                'The usual way to write one is as a pair of components: how far across, then how far up.',
              ),
              maths('\\begin{pmatrix} 3 \\\\ 2 \\end{pmatrix} = 3\\mathbf{i} + 2\\mathbf{j}'),
              prose(
                'The column form and the $\\mathbf{i}$, $\\mathbf{j}$ form are the same object written two ways. $\\mathbf{i}$ and $\\mathbf{j}$ are the unit vectors one step across and one step up.',
              ),
              prose(
                'Because a vector is only a direction and a size, it has no position. The same vector describes a move from anywhere to anywhere three across and two up.',
              ),
            ),
            ask('vec-notation'),
            ask('vec-component'),
            ask('vec-notation'),
            teach(
              prose(
                'Vectors add component by component. The across-parts combine with each other and the up-parts with each other, and the two calculations never interact.',
              ),
              maths(
                '\\begin{pmatrix} 3 \\\\ 2 \\end{pmatrix} + \\begin{pmatrix} 5 \\\\ -4 \\end{pmatrix} = \\begin{pmatrix} 8 \\\\ -2 \\end{pmatrix}',
              ),
              prose(
                'Geometrically this is what happens when two displacements are made one after the other: go 3 across and 2 up, then 5 across and 4 down, and you have gone 8 across and 2 down.',
              ),
              prose(
                'Bracket each component before combining. A negative entry being subtracted is where the sign goes wrong, and the bracket removes the risk.',
              ),
              prose(
                'A journey described in words becomes vectors the same way. West is the negative of east and south is the negative of north, so 3 km west is a first component of $-3$.',
              ),
              prose(
                'What comes out is the **displacement** — where the journey ended up relative to where it started — not the distance travelled. The two legs can cancel; distances never do.',
              ),
            ),
            ask('vec-add-tree'),
            ask('vec-journey'),
            ask('vec-component'),
            teach(
              prose(
                'Subtraction follows the same rule, and it has a useful reading of its own.',
              ),
              maths('\\mathbf{b} - \\mathbf{a} = \\text{the vector from } \\mathbf{a} \\text{ to } \\mathbf{b}'),
              prose(
                'If $\\mathbf{a}$ and $\\mathbf{b}$ are positions of two points, then $\\mathbf{b} - \\mathbf{a}$ is the displacement taking you from the first to the second. The order matters: the other way round points backwards.',
              ),
              prose(
                'So "destination minus start" is worth remembering. Nearly every vector geometry question begins with it.',
              ),
            ),
            ask('vec-add+choice'),
            ask('vec-journey+choice'),
          ],
          skillCheck: [
            ask('vec-add', 2),
            ask('vec-journey', 2),
            ask('vec-notation', 2),
          ],
        },
        {
          id: 'vm-l1-scalars',
          title: 'Scalar Multiples',
          slides: [
            teach(
              prose(
                'Multiplying a vector by an ordinary number — a **scalar** — stretches it without turning it. Every component is multiplied.',
              ),
              maths('3\\begin{pmatrix} 2 \\\\ -1 \\end{pmatrix} = \\begin{pmatrix} 6 \\\\ -3 \\end{pmatrix}'),
              prose(
                'Multiplying only the top component is the characteristic error. A scalar changes the length of the whole vector, so it has to reach both entries.',
              ),
              prose(
                'A negative scalar reverses the direction as well as scaling: $-2\\mathbf{v}$ is twice as long as $\\mathbf{v}$ and points the opposite way.',
              ),
            ),
            ask('vec-scalar-k'),
            ask('vec-parallel'),
            ask('vec-scalar-k+choice'),
            teach(
              prose(
                'A **linear combination** scales two vectors and adds the results, which is the operation nearly every vector question is built from.',
              ),
              maths(
                '2\\begin{pmatrix} 1 \\\\ 4 \\end{pmatrix} - 3\\begin{pmatrix} 2 \\\\ 1 \\end{pmatrix} = \\begin{pmatrix} 2 \\\\ 8 \\end{pmatrix} - \\begin{pmatrix} 6 \\\\ 3 \\end{pmatrix} = \\begin{pmatrix} -4 \\\\ 5 \\end{pmatrix}',
              ),
              prose(
                'Scale each vector fully first, then combine. Adding first and scaling afterwards gives a different answer unless the two scalars happen to be equal.',
              ),
              prose(
                'Carry each sign through the scaling rather than saving it for the end. A negative scalar applied to a negative component is where this goes wrong.',
              ),
            ),
            ask('vec-scalar-combine'),
            ask('vec-add+choice'),
            ask('vec-scalar-combine-steps'),
            teach(
              prose(
                'Two vectors are **parallel** exactly when one is a scalar multiple of the other — the same multiple applied to every component.',
              ),
              maths('\\begin{pmatrix} 3 \\\\ -2 \\end{pmatrix} \\quad \\begin{pmatrix} 6 \\\\ -4 \\end{pmatrix} \\quad \\text{are parallel}'),
              prose(
                'The test is whether the ratio of the components is unchanged. Scaling only one component changes the direction, so the result is not parallel.',
              ),
              prose(
                'A negative multiple points the opposite way along the same line, and that still counts as parallel — the direction is reversed but the line is the same.',
              ),
            ),
            ask('vec-parallel'),
            ask('vec-add'),
          ],
          skillCheck: [
            ask('vec-scalar-combine', 2),
            ask('vec-parallel', 2),
            ask('vec-scalar-k', 2),
          ],
        },
        {
          id: 'vm-l1-magnitude',
          title: 'The Magnitude of a Vector',
          slides: [
            teach(
              prose(
                'The **magnitude** of a vector is its length, written with the modulus bars. The two components are the short sides of a right-angled triangle and the vector is its hypotenuse, so it comes from Pythagoras.',
              ),
              maths('\\left| \\mathbf{v} \\right| = \\sqrt{x^{2} + y^{2}}'),
              maths(
                '\\left| \\begin{pmatrix} 3 \\\\ 4 \\end{pmatrix} \\right| = \\sqrt{9 + 16} = \\sqrt{25} = 5',
              ),
              prose(
                'Both components are squared, so both signs disappear. A magnitude can never be negative, which is a useful check on the arithmetic.',
              ),
              prose(
                'Most magnitudes are not whole numbers. Leaving $\\sqrt{13}$ as it stands keeps the answer exact; a decimal is a rounded one, and rounding early spoils anything done afterwards.',
              ),
              prose(
                'The **distance between two points** is the same calculation with one step in front of it: find the vector from one to the other — destination minus start — and take its magnitude.',
              ),
              maths(
                'AB = \\left| \\begin{pmatrix} 5 \\\\ 1 \\end{pmatrix} - \\begin{pmatrix} 2 \\\\ -3 \\end{pmatrix} \\right| = \\left| \\begin{pmatrix} 3 \\\\ 4 \\end{pmatrix} \\right| = 5',
              ),
              prose(
                'Reaching for Pythagoras on the two coordinate pairs without subtracting first measures from the origin instead, which answers a different question.',
              ),
            ),
            ask('vec-magnitude'),
            ask('vec-magnitude-steps'),
            ask('vec-distance'),
            teach(
              prose(
                'A vector of magnitude 1 is called a **unit vector**, and dividing any vector by its own magnitude produces one pointing the same way.',
              ),
              maths('\\hat{\\mathbf{v}} = \\frac{\\mathbf{v}}{\\left| \\mathbf{v} \\right|}'),
              prose(
                'So $\\begin{pmatrix} 3 \\\\ 4 \\end{pmatrix}$ has magnitude 5, and dividing by 5 gives $\\begin{pmatrix} 0.6 \\\\ 0.8 \\end{pmatrix}$ — same direction, length 1.',
              ),
              prose(
                'This is how a direction is separated from a size, which is why unit vectors appear wherever only the direction matters.',
              ),
            ),
            ask('vec-unit'),
            ask('vec-distance+choice'),
            ask('vec-add'),
            teach(
              prose(
                'Scaling a vector scales its magnitude by the *size* of the scalar, sign ignored.',
              ),
              maths('\\left| k\\mathbf{v} \\right| = \\left| k \\right| \\left| \\mathbf{v} \\right|'),
              prose(
                'So $-3\\mathbf{v}$ is three times as long as $\\mathbf{v}$, not minus three times. Length has no sign.',
              ),
              prose(
                'What does *not* work is adding magnitudes. $\\left| \\mathbf{a} + \\mathbf{b} \\right|$ is almost never $\\left| \\mathbf{a} \\right| + \\left| \\mathbf{b} \\right|$ — they are equal only when the two vectors point the same way.',
              ),
            ),
            ask('vec-unit+choice'),
            ask('vec-add+choice'),
          ],
          skillCheck: [
            ask('vec-magnitude', 2),
            ask('vec-distance', 2),
            ask('vec-unit', 2),
          ],
        },
        {
          id: 'vm-l1-dot',
          title: 'The Scalar Product',
          slides: [
            teach(
              prose(
                'There is a way to multiply two vectors that produces an ordinary number: multiply matching components and add the results. It is called the **scalar product**, or the dot product.',
              ),
              maths(
                '\\begin{pmatrix} 3 \\\\ 2 \\end{pmatrix} \\cdot \\begin{pmatrix} -4 \\\\ 6 \\end{pmatrix} = \\left(3\\right)\\left(-4\\right) + \\left(2\\right)\\left(6\\right) = 0',
              ),
              prose(
                'The result is one number, not a vector — which is where the name comes from. Stopping with two products is stopping halfway.',
              ),
              prose(
                'That example came out zero, and zero is the interesting case. It means the two vectors are perpendicular.',
              ),
            ),
            ask('vec-dot'),
            ask('vec-dot-steps'),
            ask('vec-method'),
            teach(
              prose('The sign of the scalar product describes the angle between the vectors.'),
              maths('\\mathbf{a} \\cdot \\mathbf{b} = \\left| \\mathbf{a} \\right| \\left| \\mathbf{b} \\right| \\cos\\theta'),
              prose(
                'Since the two magnitudes are positive, the sign of the product is the sign of $\\cos\\theta$: positive means the vectors point broadly the same way, negative means broadly opposite, and zero means exactly perpendicular.',
              ),
              prose(
                'Rearranging that formula gives the angle itself, which is the usual reason for computing a scalar product at all.',
              ),
            ),
            ask('vec-angle'),
            ask('vec-method'),
            ask('vec-angle+choice'),
            teach(
              prose(
                'So a missing component can be found by insisting the scalar product is zero.',
              ),
              maths(
                '\\begin{pmatrix} 3 \\\\ 4 \\end{pmatrix} \\cdot \\begin{pmatrix} 8 \\\\ k \\end{pmatrix} = 24 + 4k = 0 \\implies k = -6',
              ),
              prose(
                'Perpendicularity is the scalar product being zero, not the vectors being negatives of each other. Those are opposite directions, whose scalar product is as negative as it can get.',
              ),
              prose(
                'Check the answer by substituting it back. $24 + 4\\left(-6\\right) = 0$, so the two vectors really are at right angles.',
              ),
            ),
            ask('vec-perpendicular-k'),
            ask('vec-perpendicular-k+choice'),
          ],
          skillCheck: [
            ask('vec-dot', 2),
            ask('vec-perpendicular-k', 2),
            ask('vec-angle', 2),
          ],
        },
      ],
      levelCheck: [
        ask('vec-add', 2),
        ask('vec-notation', 2),
        ask('vec-journey', 2),
        ask('vec-scalar-combine', 2),
        ask('vec-scalar-k', 2),
        ask('vec-parallel', 2),
        ask('vec-magnitude', 2),
        ask('vec-distance', 2),
        ask('vec-unit', 2),
        ask('vec-dot', 2),
        ask('vec-perpendicular-k', 2),
        ask('vec-angle', 2),
      ],
    },
    {
      id: 'vm-l4',
      title: 'Vector Geometry',
      lessons: [
        {
          id: 'vm-l4-position',
          title: 'Position Vectors',
          slides: [
            teach(
              prose(
                'The **position vector** of a point is the vector from the origin $O$ to it. It carries the same two numbers as the point.',
              ),
              maths(
                'A\\left(3, 2\\right) \\implies \\mathbf{a} = \\overrightarrow{OA} = \\begin{pmatrix} 3 \\\\ 2 \\end{pmatrix}',
              ),
              prose(
                'Lower-case bold is the usual name: $\\mathbf{a}$ for $A$, $\\mathbf{p}$ for $P$.',
              ),
              prose(
                'The vector **between** two points is destination minus start. From $A$, go back to $O$, which is $-\\mathbf{a}$, then out to $B$, which is $\\mathbf{b}$.',
              ),
              maths('\\overrightarrow{AB} = -\\mathbf{a} + \\mathbf{b} = \\mathbf{b} - \\mathbf{a}'),
            ),
            ask('vec-between'),
            ask('vec-direction'),
            ask('vec-between-slider'),
            teach(
              prose(
                'On squared paper, $\\overrightarrow{AB}$ is how far you move from $A$ to reach $B$: across, then up. Counting squares and subtracting coordinates are the same calculation.',
              ),
              maths(
                'A\\left(-1, 4\\right), \\; B\\left(3, 1\\right) \\implies \\overrightarrow{AB} = \\begin{pmatrix} 3 - \\left(-1\\right) \\\\ 1 - 4 \\end{pmatrix} = \\begin{pmatrix} 4 \\\\ -3 \\end{pmatrix}',
              ),
              prose(
                'The same equation run the other way finds a point. Knowing one end and the journey between them gives the other end.',
              ),
              maths('\\mathbf{b} = \\mathbf{a} + \\overrightarrow{AB} \\qquad \\mathbf{a} = \\mathbf{b} - \\overrightarrow{AB}'),
            ),
            ask('vec-endpoint'),
            ask('vec-between+choice'),
            ask('vec-between-slider'),
            teach(
              prose(
                'Reversing a journey negates it: $\\overrightarrow{BA} = \\mathbf{a} - \\mathbf{b} = -\\overrightarrow{AB}$. The same length, pointing the other way.',
              ),
              prose(
                'Journeys chain. Going from $P$ to $Q$ and then on to $R$ ends in the same place as going straight from $P$ to $R$.',
              ),
              maths(
                '\\overrightarrow{PQ} + \\overrightarrow{QR} = \\left(\\mathbf{q} - \\mathbf{p}\\right) + \\left(\\mathbf{r} - \\mathbf{q}\\right) = \\mathbf{r} - \\mathbf{p} = \\overrightarrow{PR}',
              ),
              prose('Where the journey passed through cancels out. Only the start and the end are left.'),
            ),
            ask('vec-direction'),
            ask('vec-endpoint+choice'),
          ],
          skillCheck: [
            ask('vec-between', 2),
            ask('vec-endpoint', 2),
            ask('vec-direction', 2),
          ],
        },
        {
          id: 'vm-l4-ratio',
          title: 'Dividing a Line',
          slides: [
            teach(
              prose(
                'The **midpoint** of $AB$ is halfway along it: start at $A$ and go half of $\\overrightarrow{AB}$.',
              ),
              maths(
                '\\mathbf{m} = \\mathbf{a} + \\tfrac{1}{2}\\left(\\mathbf{b} - \\mathbf{a}\\right) = \\tfrac{1}{2}\\left(\\mathbf{a} + \\mathbf{b}\\right)',
              ),
              prose(
                'So each coordinate of the midpoint is the average of the two ends. Halfway between $\\left(2, 7\\right)$ and $\\left(8, -1\\right)$ is $\\left(5, 3\\right)$.',
              ),
              prose(
                'Halving $\\overrightarrow{AB}$ on its own says how far the midpoint is **from $A$**, not where it is. Adding $\\mathbf{a}$ is the step that places it.',
              ),
              prose(
                'Run it backwards to find an end: the second half of the line is the same journey as the first, so $\\mathbf{b} = \\mathbf{m} + \\overrightarrow{AM}$.',
              ),
            ),
            ask('vec-midpoint'),
            ask('vec-section-fraction'),
            ask('vec-midpoint+choice'),
            teach(
              prose(
                'A ratio does the same job for any other point. $AP : PB = 2 : 3$ cuts $AB$ into $2 + 3 = 5$ equal parts, with 2 of them between $A$ and $P$.',
              ),
              maths(
                '\\overrightarrow{AP} = \\frac{2}{5}\\overrightarrow{AB} \\qquad \\overrightarrow{PB} = \\frac{3}{5}\\overrightarrow{AB}',
              ),
              prose(
                'The fraction is a part over the **whole**, 5. $\\frac{2}{3}$ compares $AP$ with $PB$, which is a different question with a different answer.',
              ),
              prose(
                'Direction counts too: $\\overrightarrow{PA}$ points back towards $A$, so $\\overrightarrow{PA} = -\\frac{2}{5}\\overrightarrow{AB}$.',
              ),
            ),
            ask('vec-section'),
            ask('vec-ratio-slider'),
            ask('vec-section-fraction+choice'),
            teach(
              prose(
                'Worked through, with $A\\left(1, 2\\right)$, $B\\left(10, -4\\right)$ and $AP : PB = 1 : 2$:',
              ),
              maths(
                '\\overrightarrow{AB} = \\begin{pmatrix} 9 \\\\ -6 \\end{pmatrix} \\implies \\overrightarrow{AP} = \\frac{1}{3}\\begin{pmatrix} 9 \\\\ -6 \\end{pmatrix} = \\begin{pmatrix} 3 \\\\ -2 \\end{pmatrix} \\implies P = \\left(4, 0\\right)',
              ),
              prose(
                'The first number of the ratio belongs to the part next to $A$. Read it backwards and you land on the point the same distance from the other end.',
              ),
            ),
            ask('vec-section-tree'),
            ask('vec-ratio-slider'),
          ],
          skillCheck: [
            ask('vec-midpoint', 2),
            ask('vec-section', 2),
            ask('vec-section-fraction', 2),
          ],
        },
        {
          id: 'vm-l4-collinear',
          title: 'Parallel and Collinear',
          slides: [
            teach(
              prose(
                'Level 1 met the test for **parallel** vectors: one is a scalar multiple of the other, with the same multiple on every component.',
              ),
              maths('\\begin{pmatrix} 6 \\\\ -4 \\end{pmatrix} = -2\\begin{pmatrix} -3 \\\\ 2 \\end{pmatrix}'),
              prose(
                'Parallel says two lines point the same way. It does not say they are the same line: opposite sides of a rectangle are parallel and never meet.',
              ),
            ),
            ask('vec-parallel'),
            ask('vec-scalar-k'),
            ask('vec-line-test'),
            teach(
              prose(
                'Three points are **collinear** when they lie on one straight line. The test puts two facts together.',
              ),
              maths('\\overrightarrow{AC} = k\\,\\overrightarrow{AB}'),
              prose(
                'That makes $AB$ and $AC$ parallel, and both start at $A$, so they cannot be two separate parallel lines. They are one line, through all three points.',
              ),
              prose(
                'For $A\\left(1, 1\\right)$, $B\\left(3, 2\\right)$ and $C\\left(7, 4\\right)$: $\\overrightarrow{AB} = \\begin{pmatrix} 2 \\\\ 1 \\end{pmatrix}$ and $\\overrightarrow{AC} = \\begin{pmatrix} 6 \\\\ 3 \\end{pmatrix} = 3\\overrightarrow{AB}$, so the three are collinear.',
              ),
            ),
            ask('vec-on-line'),
            ask('vec-collinear-k'),
            ask('vec-line-test'),
            teach(
              prose(
                'The same fact finds a missing coordinate. If $C\\left(9, k\\right)$ is on the line through $A\\left(1, 1\\right)$ and $B\\left(3, 2\\right)$, the across components fix the multiple.',
              ),
              maths(
                '\\overrightarrow{AC} = \\begin{pmatrix} 8 \\\\ k - 1 \\end{pmatrix} = 4\\begin{pmatrix} 2 \\\\ 1 \\end{pmatrix} \\implies k - 1 = 4 \\implies k = 5',
              ),
              prose(
                'The multiple comes from the component you know, and then has to hold for the one you do not.',
              ),
            ),
            ask('vec-on-line'),
            ask('vec-collinear-k+choice'),
          ],
          skillCheck: [
            ask('vec-collinear-k', 2),
            ask('vec-on-line', 2),
            ask('vec-line-test', 2),
          ],
        },
        {
          id: 'vm-l4-parallelogram',
          title: 'Parallelograms',
          slides: [
            teach(
              prose(
                'Two vectors are **equal** when they have the same components: the same length and the same direction, wherever they start.',
              ),
              prose(
                'In a parallelogram $ABCD$, lettered in order round the shape, opposite sides are equal and parallel. As vectors that is one equation, with both sides written going the same way round.',
              ),
              maths('\\overrightarrow{AB} = \\overrightarrow{DC}'),
              prose(
                'So a missing corner comes from one subtraction. $\\overrightarrow{DC}$ ends at $C$, so $D$ is $C$ with that journey taken off.',
              ),
              maths(
                'A\\left(1, 1\\right), \\; B\\left(5, 2\\right), \\; C\\left(6, 5\\right) \\implies D = C - \\overrightarrow{AB} = \\left(6, 5\\right) - \\begin{pmatrix} 4 \\\\ 1 \\end{pmatrix} = \\left(2, 4\\right)',
              ),
            ),
            ask('vec-fourth-vertex'),
            ask('vec-between+choice'),
            ask('vec-fourth-vertex-tree'),
            teach(
              prose(
                'To **prove** a quadrilateral is a parallelogram, one pair of opposite sides equal as vectors is enough. Equal vectors are parallel and the same length at once.',
              ),
              prose(
                'Parallel alone is not enough. If $\\overrightarrow{DC} = 2\\overrightarrow{AB}$, the two sides are parallel but one is twice as long, and the shape is a **trapezium**.',
              ),
              prose(
                'Any corner can be the missing one. Each is its neighbour plus the side opposite, written in the same direction round the shape.',
              ),
            ),
            ask('vec-quad-flow'),
            ask('vec-between'),
            teach(
              prose(
                'The diagonals of a parallelogram cut each other in half, so the midpoint of $AC$ is also the midpoint of $BD$.',
              ),
              maths(
                '\\tfrac{1}{2}\\left(\\mathbf{a} + \\mathbf{c}\\right) = \\tfrac{1}{2}\\left(\\mathbf{b} + \\mathbf{d}\\right)',
              ),
              prose(
                'With the corners above, both midpoints are $\\left(3.5, 3\\right)$. Finding where the diagonals cross is a midpoint question, and it doubles as a check on a corner you have just found.',
              ),
            ),
            ask('vec-midpoint'),
            ask('vec-quad-flow'),
            ask('vec-midpoint+choice'),
          ],
          skillCheck: [
            ask('vec-fourth-vertex', 2),
            ask('vec-quad-flow', 2),
            ask('vec-midpoint', 2),
          ],
        },
        {
          id: 'vm-l4-paths',
          title: 'Vector Paths',
          slides: [
            teach(
              prose(
                'Vector geometry often has no coordinates at all. Two vectors are named, $\\overrightarrow{OA} = \\mathbf{a}$ and $\\overrightarrow{OB} = \\mathbf{b}$, and everything else is written in terms of them.',
              ),
              prose(
                'The method is to find a **route**: a chain of journeys you already know. Going along a known vector backwards is its negative.',
              ),
              maths('\\overrightarrow{AB} = \\overrightarrow{AO} + \\overrightarrow{OB} = -\\mathbf{a} + \\mathbf{b}'),
              prose(
                'Type $\\mathbf{a}$ and $\\mathbf{b}$ with the $a$ and $b$ keys. The route itself or its tidied form is accepted, so $\\frac{1}{2}\\left(\\mathbf{a} + \\mathbf{b}\\right)$ and $\\frac{1}{2}\\mathbf{a} + \\frac{1}{2}\\mathbf{b}$ both count.',
              ),
            ),
            ask('vec-direction'),
            ask('vec-path'),
            ask('vec-path-coefficients'),
            teach(
              prose(
                'A point on $AB$ is reached the same way: out to $A$, then the right fraction of the way along $\\overrightarrow{AB}$. With $AP : PB = 1 : 2$:',
              ),
              maths(
                '\\overrightarrow{OP} = \\mathbf{a} + \\tfrac{1}{3}\\left(\\mathbf{b} - \\mathbf{a}\\right) = \\tfrac{2}{3}\\mathbf{a} + \\tfrac{1}{3}\\mathbf{b}',
              ),
              prose(
                'Starting from $B$ gives the same answer by another route, which makes a good check: $\\mathbf{b} + \\tfrac{2}{3}\\left(\\mathbf{a} - \\mathbf{b}\\right)$ tidies up to the same thing.',
              ),
              prose(
                'For any point on the line $AB$ the two coefficients add up to 1, as $\\tfrac{2}{3} + \\tfrac{1}{3}$ does here.',
              ),
            ),
            ask('vec-path-tree'),
            ask('vec-section-fraction'),
            ask('vec-path-coefficients'),
            teach(
              prose(
                'Proofs in vector geometry usually end on the level 1 test. Two vectors written in $\\mathbf{a}$ and $\\mathbf{b}$ are parallel when one is a multiple of the other, with the same multiple on both coefficients.',
              ),
              maths('6\\mathbf{a} - 4\\mathbf{b} = 2\\left(3\\mathbf{a} - 2\\mathbf{b}\\right)'),
              prose(
                'So those two are parallel. If they also share a point, the points are collinear, exactly as with numbers.',
              ),
            ),
            ask('vec-path-parallel'),
            ask('vec-line-test'),
          ],
          skillCheck: [
            ask('vec-path', 2),
            ask('vec-path-coefficients', 2),
            ask('vec-path-parallel', 2),
          ],
        },
      ],
      levelCheck: [
        ask('vec-between', 2),
        ask('vec-direction', 2),
        ask('vec-endpoint+choice', 2),
        ask('vec-midpoint', 2),
        ask('vec-section-fraction', 2),
        ask('vec-section', 2),
        ask('vec-on-line', 2),
        ask('vec-collinear-k', 2),
        ask('vec-line-test', 2),
        ask('vec-fourth-vertex', 2),
        ask('vec-quad-flow', 2),
        ask('vec-path', 2),
        ask('vec-path-parallel', 2),
        ask('vec-path-coefficients', 2),
      ],
    },
  ],
};
