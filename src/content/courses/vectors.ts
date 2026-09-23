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
 * combined course survives the split. Level 4, Vector Geometry, is `vm-l4`,
 * level 6, Lines in Vector Form, is `vm-l6`, and level 8, Planes & the Cross
 * Product, is `vm-l8`: `vm-l2`, `vm-l3`, `vm-l5`, `vm-l7` and `vm-l9` are the
 * Matrices course's.
 *
 * Level 4 turns vectors into a way of saying where points are: position
 * vectors, a point part-way along a line, three points on one line, the
 * corners of a parallelogram, and last the same reasoning in terms of
 * $\mathbf{a}$ and $\mathbf{b}$ with no numbers at all.
 *
 * Level 6 writes a whole line as `r = a + t b`: its points, a line through
 * two points, whether a point is on it, how two lines sit relative to each
 * other and where they cross. It stays in two dimensions until skew lines
 * need a third.
 *
 * Level 8 is three-dimensional throughout: the cross product and what it is
 * for, perpendicular vectors and areas, then the equation of a plane from a
 * point and a normal, from three points, and where a line meets one.
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
  blurb: 'Components, magnitude and the scalar product, then vector geometry, lines and planes.',
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
    {
      id: 'vm-l6',
      title: 'Lines in Vector Form',
      lessons: [
        {
          id: 'vm-l6-equation',
          title: 'The Vector Equation of a Line',
          slides: [
            teach(
              prose(
                'A straight line is fixed by a point on it and a direction along it. Start at the point, then move any multiple of the direction.',
              ),
              maths('\\mathbf{r} = \\mathbf{a} + t\\mathbf{b}'),
              prose(
                '$\\mathbf{a}$ is the position vector of a point on the line and $\\mathbf{b}$ is its **direction vector**. $t$ is a number you choose, called the **parameter**, and each value of $t$ gives one point $\\mathbf{r}$ on the line.',
              ),
              maths(
                '\\mathbf{r} = \\begin{pmatrix} 1 \\\\ 2 \\end{pmatrix} + t\\begin{pmatrix} 3 \\\\ -1 \\end{pmatrix}',
              ),
              prose(
                'With $t = 2$ that is $\\begin{pmatrix} 1 \\\\ 2 \\end{pmatrix} + \\begin{pmatrix} 6 \\\\ -2 \\end{pmatrix} = \\begin{pmatrix} 7 \\\\ 0 \\end{pmatrix}$, the point $\\left(7, 0\\right)$.',
              ),
            ),
            ask('line-point-at'),
            ask('line-direction'),
            ask('line-t-slider'),
            teach(
              prose(
                '$t$ counts direction vectors from the starting point. $t = 0$ is the starting point itself, $t = 1$ is one step along, and a negative $t$ goes back the other way.',
              ),
              prose(
                'Work a point out in two moves: multiply the direction by $t$, then add the start. Multiplying the start by $t$ as well is the usual slip.',
              ),
              maths('\\mathbf{a} + 3\\mathbf{b} \\ne 3\\left(\\mathbf{a} + \\mathbf{b}\\right)'),
            ),
            ask('line-point-at-steps'),
            ask('line-t-slider'),
            ask('line-same'),
            teach(
              prose(
                'One line has many equations. Any point on it will do as the start, and any non-zero multiple of the direction still points along it.',
              ),
              maths(
                '\\mathbf{r} = \\begin{pmatrix} 7 \\\\ 0 \\end{pmatrix} + s\\begin{pmatrix} -6 \\\\ 2 \\end{pmatrix}',
              ),
              prose(
                'That is the line above again: $\\left(7, 0\\right)$ is its point at $t = 2$, and the new direction is $-2$ times the old one. A new letter, $s$, is a reminder that the two parameters count differently.',
              ),
            ),
            ask('line-direction'),
            ask('line-same'),
          ],
          skillCheck: [
            ask('line-point-at', 2),
            ask('line-direction', 2),
            ask('line-same', 2),
          ],
        },
        {
          id: 'vm-l6-two-points',
          title: 'A Line Through Two Points',
          slides: [
            teach(
              prose(
                'Two points fix a line. Start at one of them, and take the direction from the journey between them: destination minus start, as in the last level.',
              ),
              maths('\\mathbf{r} = \\mathbf{a} + t\\left(\\mathbf{b} - \\mathbf{a}\\right)'),
              prose('For $A\\left(1, 4\\right)$ and $B\\left(3, 1\\right)$:'),
              maths('\\overrightarrow{AB} = \\begin{pmatrix} 2 \\\\ -3 \\end{pmatrix}'),
              maths(
                '\\mathbf{r} = \\begin{pmatrix} 1 \\\\ 4 \\end{pmatrix} + t\\begin{pmatrix} 2 \\\\ -3 \\end{pmatrix}',
              ),
            ),
            ask('vec-between'),
            ask('line-through-two'),
            ask('line-same'),
            teach(
              prose(
                'With this equation $t = 0$ gives $A$ and $t = 1$ gives $B$. Other values reach the rest of the line: $t = 2$ is as far beyond $B$ again, and $t = -1$ is one step back behind $A$.',
              ),
              prose(
                'Starting at $B$, or heading along $\\overrightarrow{BA}$, gives another equation of the same line. Each is as correct as the first.',
              ),
            ),
            ask('line-two-points-at-tree'),
            ask('vec-between+choice'),
            ask('line-same'),
            teach(
              prose(
                'The direction has to be the journey **between** the points. $\\mathbf{b}$ on its own points from the origin to $B$, which is usually a different direction altogether.',
              ),
              prose(
                'A line **parallel** to another shares its direction, so only the starting point changes. Here is a line:',
              ),
              maths('\\mathbf{r} = \\begin{pmatrix} 0 \\\\ 5 \\end{pmatrix} + s\\begin{pmatrix} 2 \\\\ 1 \\end{pmatrix}'),
              prose('The line through $\\left(4, -1\\right)$ parallel to it borrows its direction and starts at $\\left(4, -1\\right)$:'),
              maths('\\mathbf{r} = \\begin{pmatrix} 4 \\\\ -1 \\end{pmatrix} + t\\begin{pmatrix} 2 \\\\ 1 \\end{pmatrix}'),
            ),
            ask('line-through-two+choice', 2),
            ask('line-two-points-at-tree'),
          ],
          skillCheck: [
            ask('line-through-two', 2),
            ask('line-two-points-at-tree', 2),
            ask('line-same', 2),
          ],
        },
        {
          id: 'vm-l6-on-line',
          title: 'Is the Point on the Line?',
          slides: [
            teach(
              prose(
                'To test whether a point is on a line, set the equation equal to it and look for a value of $t$ that works.',
              ),
              maths(
                '\\begin{pmatrix} 1 \\\\ 2 \\end{pmatrix} + t\\begin{pmatrix} 3 \\\\ -1 \\end{pmatrix} = \\begin{pmatrix} 10 \\\\ -1 \\end{pmatrix}',
              ),
              prose(
                'Each component is an equation of its own. Across, $1 + 3t = 10$, so $t = 3$. Up, $2 - t = -1$, so $t = 3$ as well.',
              ),
              prose(
                'One value of $t$ satisfies both, so $\\left(10, -1\\right)$ is on the line, three direction vectors from the start.',
              ),
            ),
            ask('line-find-t'),
            ask('line-contains'),
            ask('line-t-slider'),
            teach(
              prose(
                'A point off the line still gives a value of $t$ from each component. What gives it away is that the two values differ.',
              ),
              maths('1 + 3t = 7 \\implies t = 2'),
              maths('2 - t = 1 \\implies t = 1'),
              prose(
                'No single value of $t$ reaches $\\left(7, 1\\right)$, so it is not on the line. Solving one component and stopping would have missed that, so always check the other.',
              ),
            ),
            ask('line-contains'),
            ask('line-find-t+choice'),
            ask('line-missing-coord'),
            teach(
              prose(
                'The same idea finds a missing coordinate. If $\\left(k, -3\\right)$ is on the line, the component you know fixes $t$.',
              ),
              maths('2 - t = -3 \\implies t = 5'),
              maths('k = 1 + 3 \\times 5 = 16'),
              prose('Find $t$ from the coordinate you have, then use it in the other component.'),
            ),
            ask('line-t-slider'),
            ask('line-missing-coord+choice'),
          ],
          skillCheck: [
            ask('line-find-t', 2),
            ask('line-contains', 2),
            ask('line-missing-coord', 2),
          ],
        },
        {
          id: 'vm-l6-relation',
          title: 'Parallel, Intersecting or Skew',
          slides: [
            teach(
              prose(
                'Two lines are **parallel** when their directions are scalar multiples of each other. Compare the directions first, whatever else the question asks.',
              ),
              maths('\\begin{pmatrix} 6 \\\\ -4 \\end{pmatrix} = 2\\begin{pmatrix} 3 \\\\ -2 \\end{pmatrix}'),
              prose(
                'Parallel lines may still be one line written twice. Test whether a point of one lies on the other: if it does, they are the same line; if not, they never meet.',
              ),
            ),
            ask('lines-parallel-k'),
            ask('lines-relation'),
            ask('line-contains'),
            teach(
              prose(
                'In a plane, two lines that are not parallel always cross. In three dimensions they need not: one can pass above the other. Lines that are not parallel and never meet are **skew**.',
              ),
              prose(
                'A line in three dimensions works exactly as in two, with a third component. Two lines get two parameters, $\\lambda$ and $\\mu$, because where they meet each line can be at a different value of its own.',
              ),
            ),
            ask('lines-third-tree'),
            ask('lines-relation+choice', 2),
            ask('lines-parallel-k+choice'),
            teach(
              prose(
                'To test for crossing, set the lines equal, solve two of the components for $\\lambda$ and $\\mu$, then check the third.',
              ),
              maths(
                '\\ell_1: \\; \\mathbf{r} = \\begin{pmatrix} 1 \\\\ 2 \\\\ 0 \\end{pmatrix} + \\lambda\\begin{pmatrix} 1 \\\\ 1 \\\\ 2 \\end{pmatrix}',
              ),
              maths(
                '\\ell_2: \\; \\mathbf{r} = \\begin{pmatrix} 3 \\\\ 0 \\\\ 1 \\end{pmatrix} + \\mu\\begin{pmatrix} 0 \\\\ 1 \\\\ 1 \\end{pmatrix}',
              ),
              prose(
                'In $x$, $1 + \\lambda = 3$, so $\\lambda = 2$. In $y$, $2 + \\lambda = \\mu$, so $\\mu = 4$. Then in $z$, $\\ell_1$ reaches $2 \\times 2 = 4$ but $\\ell_2$ reaches $1 + 4 = 5$. The third component disagrees, so these lines are skew.',
              ),
            ),
            ask('lines-third-tree'),
            ask('lines-solve'),
          ],
          skillCheck: [
            ask('lines-relation', 2),
            ask('lines-third-tree', 2),
            ask('lines-parallel-k', 2),
          ],
        },
        {
          id: 'vm-l6-intersection',
          title: 'The Point of Intersection',
          slides: [
            teach(
              prose(
                'Where two lines cross, the same point is on both, so their equations are equal there, each line at its own parameter.',
              ),
              maths(
                '\\begin{gathered} \\begin{pmatrix} 1 \\\\ 1 \\end{pmatrix} + \\lambda\\begin{pmatrix} 2 \\\\ 1 \\end{pmatrix} \\\\ = \\begin{pmatrix} 5 \\\\ 0 \\end{pmatrix} + \\mu\\begin{pmatrix} 0 \\\\ 1 \\end{pmatrix} \\end{gathered}',
              ),
              prose(
                'Across, $1 + 2\\lambda = 5$, so $\\lambda = 2$. Up, $1 + \\lambda = \\mu$, so $\\mu = 3$. Two equations, two unknowns.',
              ),
            ),
            ask('lines-solve'),
            ask('lines-meet-slider'),
            ask('lines-meet'),
            teach(
              prose(
                'The parameter is not the point. Put $\\lambda = 2$ back into the first line to find where they cross:',
              ),
              maths(
                '\\begin{pmatrix} 1 \\\\ 1 \\end{pmatrix} + 2\\begin{pmatrix} 2 \\\\ 1 \\end{pmatrix} = \\begin{pmatrix} 5 \\\\ 3 \\end{pmatrix}',
              ),
              prose(
                'Putting $\\mu = 3$ into the second line lands on $\\left(5, 3\\right)$ too, which is a free check. Each parameter belongs to its own line: $\\lambda$ in the second equation is the slip to avoid.',
              ),
            ),
            ask('lines-meet-tree'),
            ask('lines-solve+choice'),
            ask('lines-meet-slider'),
            teach(
              prose(
                'In three dimensions the method is the same with one more step: solve two components, then check the third before trusting the point.',
              ),
              prose(
                'If the third component disagrees there is no point to find. The lines are skew, and no pair of parameters puts them in the same place.',
              ),
            ),
            ask('lines-third-tree'),
            ask('lines-relation+choice', 2),
          ],
          skillCheck: [
            ask('lines-meet', 2),
            ask('lines-solve', 2),
            ask('lines-third-tree', 2),
          ],
        },
      ],
      levelCheck: [
        ask('line-point-at', 2),
        ask('line-direction', 2),
        ask('line-same', 2),
        ask('line-through-two', 2),
        ask('line-two-points-at-tree', 2),
        ask('line-find-t', 2),
        ask('line-contains', 2),
        ask('line-missing-coord+choice', 2),
        ask('lines-parallel-k', 2),
        ask('lines-relation', 2),
        ask('lines-third-tree', 2),
        ask('lines-solve', 2),
        ask('lines-meet', 2),
        ask('lines-meet-slider', 2),
      ],
    },
    {
      id: 'vm-l8',
      title: 'Planes & the Cross Product',
      lessons: [
        {
          id: 'vm-l8-cross',
          title: 'The Cross Product',
          slides: [
            teach(
              prose(
                'The **cross product** $\\mathbf{a} \\times \\mathbf{b}$ of two vectors in three dimensions is another vector. Each of its components is built from the other two components of $\\mathbf{a}$ and $\\mathbf{b}$, cross-multiplied and subtracted.',
              ),
              maths(
                '\\mathbf{a} \\times \\mathbf{b} = \\begin{pmatrix} a_y b_z - a_z b_y \\\\ a_z b_x - a_x b_z \\\\ a_x b_y - a_y b_x \\end{pmatrix}',
              ),
              prose(
                'The letters follow the cycle $x \\to y \\to z \\to x$: the $x$ component starts from $y$, the $y$ component from $z$, and the $z$ component from $x$.',
              ),
              maths(
                '\\begin{pmatrix} 1 \\\\ 2 \\\\ 3 \\end{pmatrix} \\times \\begin{pmatrix} 4 \\\\ 0 \\\\ -1 \\end{pmatrix} = \\begin{pmatrix} -2 \\\\ 13 \\\\ -8 \\end{pmatrix}',
              ),
            ),
            ask('cross-product'),
            ask('cross-entry-steps'),
            ask('cross-product+choice'),
            teach(
              prose(
                'Working backwards: if one component of $\\mathbf{a} \\times \\mathbf{b}$ is known, an unknown entry turns that component into an equation.',
              ),
              prose(
                'Take $\\mathbf{a} = \\left(1, k, 2\\right)$ and $\\mathbf{b} = \\left(3, 1, 0\\right)$, with a $z$ component of $-5$. That component is $a_x b_y - a_y b_x$:',
              ),
              maths('1 \\times 1 - k \\times 3 = -5'),
              maths('1 - 3k = -5 \\implies k = 2'),
            ),
            ask('cross-unknown'),
            ask('cross-entry-steps', 2),
            teach(
              prose(
                'The order matters. Swapping the vectors swaps every pair of products, so every component changes sign. A scalar on either vector comes outside the whole product.',
              ),
              maths('\\mathbf{b} \\times \\mathbf{a} = -\\left(\\mathbf{a} \\times \\mathbf{b}\\right)'),
              maths('\\left(k\\mathbf{a}\\right) \\times \\mathbf{b} = k\\left(\\mathbf{a} \\times \\mathbf{b}\\right)'),
              prose(
                'A vector crossed with itself is $\\mathbf{0}$. The unit vectors go round the cycle $\\mathbf{i} \\to \\mathbf{j} \\to \\mathbf{k} \\to \\mathbf{i}$: forwards gives the third one, backwards gives its negative.',
              ),
              maths('\\mathbf{i} \\times \\mathbf{j} = \\mathbf{k}, \\quad \\mathbf{j} \\times \\mathbf{i} = -\\mathbf{k}'),
            ),
            ask('cross-rules'),
            ask('cross-unknown', 2),
            ask('cross-rules', 2),
          ],
          skillCheck: [
            ask('cross-product', 2),
            ask('cross-rules', 2),
            ask('cross-unknown', 2),
          ],
        },
        {
          id: 'vm-l8-perpendicular',
          title: 'What the Cross Product Is For',
          slides: [
            teach(
              prose(
                'The cross product $\\mathbf{a} \\times \\mathbf{b}$ is **perpendicular to both** $\\mathbf{a}$ and $\\mathbf{b}$. That is what it is for: given two directions, it finds a third at right angles to both.',
              ),
              prose(
                'The dot product checks it, since perpendicular vectors have a dot product of zero. With the example from the last lesson:',
              ),
              maths(
                '\\begin{pmatrix} -2 \\\\ 13 \\\\ -8 \\end{pmatrix} \\cdot \\begin{pmatrix} 1 \\\\ 2 \\\\ 3 \\end{pmatrix}',
              ),
              maths('= -2 + 26 - 24 = 0'),
              prose('Any non-zero multiple of $\\mathbf{a} \\times \\mathbf{b}$ is perpendicular to both as well.'),
            ),
            ask('cross-perpendicular'),
            ask('cross-product'),
            ask('cross-check-tree'),
            teach(
              prose(
                'The **length** of $\\mathbf{a} \\times \\mathbf{b}$ is the area of the parallelogram with sides $\\mathbf{a}$ and $\\mathbf{b}$.',
              ),
              maths('\\text{area} = \\left|\\mathbf{a} \\times \\mathbf{b}\\right|'),
              maths(
                '\\begin{pmatrix} 2 \\\\ 0 \\\\ 1 \\end{pmatrix} \\times \\begin{pmatrix} 0 \\\\ 2 \\\\ 2 \\end{pmatrix} = \\begin{pmatrix} -2 \\\\ -4 \\\\ 4 \\end{pmatrix}',
              ),
              maths('\\sqrt{4 + 16 + 16} = 6'),
              prose('So those two sides make a parallelogram of area $6$. Leaving out the square root is the usual slip.'),
            ),
            ask('cross-area-tree'),
            ask('cross-product+choice'),
            ask('cross-check-tree', 2),
            teach(
              prose('A triangle on the same two sides is half the parallelogram.'),
              maths('\\text{triangle} = \\tfrac{1}{2}\\left|\\mathbf{a} \\times \\mathbf{b}\\right|'),
              prose(
                'When the corners are given as points, the sides are journeys out of one corner: for triangle $ABC$, cross $\\overrightarrow{AB}$ with $\\overrightarrow{AC}$.',
              ),
            ),
            ask('cross-area'),
            ask('cross-perpendicular', 2),
          ],
          skillCheck: [
            ask('cross-area', 2),
            ask('cross-perpendicular', 2),
            ask('cross-check-tree', 2),
          ],
        },
        {
          id: 'vm-l8-plane',
          title: 'The Equation of a Plane',
          slides: [
            teach(
              prose(
                'A plane is fixed by one point on it and a **normal**: a vector perpendicular to the whole plane.',
              ),
              prose(
                'If $A$ is on the plane, the journey from $A$ to any other point $\\mathbf{r}$ of the plane is perpendicular to the normal $\\mathbf{n}$. So every point of the plane has the same dot product with $\\mathbf{n}$ as $A$ does:',
              ),
              maths('\\mathbf{r} \\cdot \\mathbf{n} = \\mathbf{a} \\cdot \\mathbf{n}'),
              prose('The right-hand side is a number, called $d$. Through $A\\left(1, 2, 3\\right)$ with normal $\\left(2, -1, 1\\right)$:'),
              maths('d = 1(2) + 2(-1) + 3(1)'),
              maths('= 2 - 2 + 3 = 3'),
            ),
            ask('plane-d'),
            ask('plane-on'),
            ask('plane-d', 2),
            teach(
              prose(
                'Writing $\\mathbf{r}$ as $\\left(x, y, z\\right)$ and multiplying out the dot product gives the **Cartesian** form. The normal\'s components become the coefficients.',
              ),
              maths('\\mathbf{r} \\cdot \\begin{pmatrix} 2 \\\\ -1 \\\\ 1 \\end{pmatrix} = 3'),
              maths('2x - y + z = 3'),
              prose('So the normal can be read straight off a Cartesian equation, and a missing term means a zero component.'),
            ),
            ask('plane-cartesian'),
            ask('plane-vector-form'),
            ask('plane-on', 2),
            teach(
              prose(
                'A point is on the plane exactly when its coordinates satisfy the equation. With one coordinate unknown, substituting leaves an equation to solve. For $\\left(4, k, 5\\right)$ on $2x - y + z = 3$:',
              ),
              maths('2(4) - k + 5 = 3'),
              maths('13 - k = 3 \\implies k = 10'),
            ),
            ask('plane-missing'),
            ask('plane-cartesian', 2),
          ],
          skillCheck: [
            ask('plane-d', 2),
            ask('plane-cartesian', 2),
            ask('plane-missing', 2),
          ],
        },
        {
          id: 'vm-l8-three-points',
          title: 'A Plane Through Three Points',
          slides: [
            teach(
              prose(
                'Three points not on one line fix a plane. The journeys between them lie in the plane, so their cross product is a normal to it.',
              ),
              maths('\\mathbf{n} = \\overrightarrow{AB} \\times \\overrightarrow{AC}'),
              prose(
                'Use the journeys, destination minus start, not the position vectors. $\\mathbf{a} \\times \\mathbf{b}$ is perpendicular to the lines from the origin, and those are not in the plane.',
              ),
            ),
            ask('plane-three-normal'),
            ask('plane-d'),
            ask('plane-on'),
            teach(
              prose('The whole route for $A\\left(1, 0, 2\\right)$, $B\\left(2, 1, 2\\right)$ and $C\\left(1, 2, 3\\right)$:'),
              maths(
                '\\overrightarrow{AB} = \\begin{pmatrix} 1 \\\\ 1 \\\\ 0 \\end{pmatrix}, \\quad \\overrightarrow{AC} = \\begin{pmatrix} 0 \\\\ 2 \\\\ 1 \\end{pmatrix}',
              ),
              maths('\\mathbf{n} = \\overrightarrow{AB} \\times \\overrightarrow{AC} = \\begin{pmatrix} 1 \\\\ -1 \\\\ 2 \\end{pmatrix}'),
              maths('d = 1(1) - 1(0) + 2(2) = 5'),
              maths('x - y + 2z = 5'),
            ),
            ask('plane-three-tree'),
            ask('plane-three-normal+choice'),
            ask('plane-three-equation'),
            teach(
              prose(
                'Any non-zero multiple of the normal gives the same plane, so divide out a common factor: $2x - 4y + 6z = 10$ is the plane $x - 2y + 3z = 5$.',
              ),
              prose(
                'Then check with the points you did not use for $d$. All three have to satisfy the equation; if one does not, a sign has slipped.',
              ),
            ),
            ask('plane-three-equation', 2),
            ask('plane-three-tree', 2),
          ],
          skillCheck: [
            ask('plane-three-normal', 2),
            ask('plane-three-tree', 2),
            ask('plane-three-equation', 2),
          ],
        },
      ],
    },
  ],
};
