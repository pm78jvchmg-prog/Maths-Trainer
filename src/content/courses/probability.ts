/**
 * Probability.
 *
 * Level 1 is outcomes and sample spaces: probability as favourable over total
 * and its place on the 0 to 1 scale, listing a sample space and counting it,
 * the complement and "at least one", two-way tables, and relative frequency
 * with the expected number. Level 2 combines events: mutually exclusive
 * events and the addition rule, Venn diagrams, independence and the
 * multiplication rule, tree diagrams, and a first look at "given that" and
 * picking without replacement.
 *
 * Level 4 is conditional probability: the formula P(A | B) = P(A ∩ B) / P(B)
 * and its turned-round form, reading it off a Venn diagram, conditional
 * branches on a tree, testing independence with P(A | B) = P(A), and working
 * back up a tree from the outcome. It follows level 2's "given that" lesson
 * (`pb-l2-conditional`) rather than teaching that again. Level 3, Tree and
 * Venn Diagrams, is built on its own branch and slots in before it.
 *
 * Counting selections with nCr belongs to Binomial Expansion (`be-l2-ncr`)
 * and percentages to Exponents & Radicals (`er-l7-percent`); both are pointed
 * at, not taught again. Later levels are in `docs/roadmap/levels/probability.md`.
 *
 * Each level closes with a level check: fifteen questions, no teaching
 * slides, one attempt each.
 */
import type { Block, Course, SlideRef } from '../types';
import { scaleSvg, spinnerSvg, treeSvg, vennSvg } from '../generators/probability';

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

const maths = (tex: string): Block => ({ kind: 'display', tex });

const diagram = (svg: string): Block => ({ kind: 'diagram', svg });

/** Lines of working stacked in one display and aligned on their `&`. */
const working = (...lines: string[]) => maths(`\\begin{aligned} ${lines.join(' \\\\ ')} \\end{aligned}`);

/** The two-way table used by the teaching slides of level 1, lesson 4. */
const lunchTable = maths(
  '{\\small \\begin{array}{l|cc|c} & \\text{Hot} & \\text{Packed} & \\text{Total} \\\\ \\hline \\text{Boys} & 18 & 12 & 30 \\\\ \\text{Girls} & 14 & 16 & 30 \\\\ \\hline \\text{Total} & 32 & 28 & 60 \\end{array}}',
);

export const probability: Course = {
  id: 'probability',
  category: 'statistics',
  position: 10,
  title: 'Probability',
  blurb: 'How likely things are: counting outcomes, the 0 to 1 scale, and combining events with tables, Venn diagrams and trees.',
  levels: [
    {
      id: 'pb-l1',
      title: 'Outcomes and Sample Spaces',
      lessons: [
        {
          id: 'pb-l1-scale',
          title: 'Chance as a Fraction',
          slides: [
            teach(
              prose(
                'When every outcome is **equally likely**, the probability of an event is the number of outcomes that give it over the number of outcomes altogether.',
              ),
              maths('P(\\text{event}) = \\frac{\\text{favourable}}{\\text{total}}'),
              prose('A bag holds 3 red and 5 blue counters. One is taken at random. There are 8 counters, and 3 of them are red:'),
              maths('P(\\text{red}) = \\frac{3}{8}'),
            ),
            ask('prob-bag-fraction'),
            ask('prob-cancel-tiles'),
            ask('prob-bag-fraction+choice', 2),
            teach(
              prose(
                'Every probability sits between $0$ and $1$. $0$ means it cannot happen, $1$ means it must, and $\\frac{1}{2}$ is an even chance.',
              ),
              diagram(scaleSvg()),
              prose(
                'Below $\\frac{1}{2}$ is **unlikely**, above it **likely**. This spinner has 3 of its 8 equal sectors shaded, so landing on shaded is $\\frac{3}{8}$: a little below evens.',
              ),
              diagram(spinnerSvg(8, 3)),
            ),
            ask('prob-scale-slider'),
            ask('prob-scale-words'),
            ask('prob-cancel-tiles', 2),
            teach(
              prose(
                'A probability can be written as a fraction, a decimal or a percentage. To compare them, turn each into a decimal: $\\frac{3}{8} = 0.375$ and $40\\% = 0.4$, so $40\\%$ is the more likely. Percentages are covered in Exponents & Radicals, in Percentage Change as a Multiplier.',
              ),
              prose(
                'An event either happens or it does not, so the chance that it does **not** is what is left of $1$. A $0.3$ chance of winning is a $1 - 0.3 = 0.7$ chance of not winning.',
              ),
            ),
            ask('prob-scale-words', 2),
            ask('prob-scale-slider', 2),
          ],
          skillCheck: [ask('prob-bag-fraction', 2), ask('prob-scale-slider', 2), ask('prob-cancel-tiles', 2)],
        },
        {
          id: 'pb-l1-space',
          title: 'Listing a Sample Space',
          slides: [
            teach(
              prose(
                'The **sample space** is the list of every possible outcome. Flip a coin and roll a four-sided die, and each of the 2 coin results can go with each of the 4 die results:',
              ),
              maths(
                '\\begin{array}{c|cccc} & 1 & 2 & 3 & 4 \\\\ \\hline \\text{H} & \\text{H}1 & \\text{H}2 & \\text{H}3 & \\text{H}4 \\\\ \\text{T} & \\text{T}1 & \\text{T}2 & \\text{T}3 & \\text{T}4 \\end{array}',
              ),
              prose(
                'That is $2 \\times 4 = 8$ equally likely outcomes. A head and an even number is H2 or H4, so its probability is $\\frac{2}{8} = \\frac{1}{4}$.',
              ),
            ),
            ask('prob-outcome-count'),
            ask('prob-space-event'),
            ask('prob-space-tree'),
            teach(
              prose(
                'When two dice are added, some totals turn up more often than others. Two four-sided dice give 16 outcomes, and a total of 5 comes from 1 + 4, 2 + 3, 3 + 2 and 4 + 1:',
              ),
              maths('P(\\text{total } 5) = \\frac{4}{16} = \\frac{1}{4}'),
              prose(
                'A table of every total, with how many ways each can happen, is the whole sample space at once. Its probabilities add up to $1$.',
              ),
            ),
            ask('prob-space-table'),
            ask('prob-space-event+choice', 2),
            ask('prob-outcome-count', 2),
            teach(
              prose(
                'Work down the grid systematically rather than guessing: for "the product is even", every outcome where either number is even counts. With a six-sided die and a four-sided die that is $24 - 6 = 18$ of the $24$ outcomes, since only odd times odd is odd.',
              ),
              prose(
                'Counting choices where order does not matter, such as picking 3 people from 10, uses $^{n}C_{r}$, which is covered in Binomial Expansion, in Factorials and nCr.',
              ),
            ),
            ask('prob-space-tree', 2),
            ask('prob-space-table', 2),
          ],
          skillCheck: [ask('prob-space-event', 2), ask('prob-space-tree', 2), ask('prob-space-table', 2)],
        },
        {
          id: 'pb-l1-complement',
          title: 'The Complement',
          slides: [
            teach(
              prose(
                'The **complement** of an event $A$ is "not $A$", written $A\'$. Exactly one of $A$ and $A\'$ happens, so their probabilities add up to $1$:',
              ),
              maths("P(A') = 1 - P(A)"),
              prose('If the chance of rain is $0.35$, the chance of no rain is $1 - 0.35 = 0.65$. With a fraction, $1 - \\frac{2}{7} = \\frac{5}{7}$.'),
            ),
            ask('prob-complement-tiles'),
            ask('prob-complement-value'),
            ask('prob-complement-tiles', 2),
            teach(
              prose(
                '"At least one" is usually found through its complement, "none". Roll a die twice: there are $36$ outcomes and $5 \\times 5 = 25$ of them have no six, so',
              ),
              working(
                'P(\\text{no six}) &= \\frac{25}{36}',
                '&= \\left(\\frac{5}{6}\\right)^{2}',
                'P(\\text{at least one}) &= 1 - \\frac{25}{36}',
                '&= \\frac{11}{36}',
              ),
            ),
            ask('prob-complement-flow'),
            ask('prob-at-least-one'),
            ask('prob-complement-value+choice', 2),
            teach(
              prose(
                'The same works for any number of goes: the chance of missing every time is the chance of one miss, multiplied once for each go. For three rolls of a die:',
              ),
              working('P(\\text{at least one}) &= 1 - \\left(\\frac{5}{6}\\right)^{3}', '&= 1 - \\frac{125}{216}', '&= \\frac{91}{216}'),
              prose('Counting the "at least one" outcomes directly would mean one six, two sixes or three; the complement is one subtraction.'),
            ),
            ask('prob-at-least-one', 2),
            ask('prob-complement-flow', 2),
          ],
          skillCheck: [ask('prob-complement-value', 2), ask('prob-at-least-one', 2), ask('prob-complement-flow', 2)],
        },
        {
          id: 'pb-l1-twoway',
          title: 'Two-Way Tables',
          slides: [
            teach(
              prose(
                'A **two-way table** sorts one group by two things at once. Each row and each column adds up to its total, and the totals add up to the grand total:',
              ),
              lunchTable,
              prose(
                'A missing number is found from a total: if you know a row total and one cell, the other cell is the difference. For a probability, divide the count you want by the grand total: $P(\\text{hot}) = \\frac{32}{60} = \\frac{8}{15}$.',
              ),
            ),
            ask('prob-twoway-fill'),
            ask('prob-twoway-cell'),
            ask('prob-twoway-tree'),
            teach(
              prose(
                'Read the question for which count it wants. "A girl with a packed lunch" is one cell, $16$. "Packed" alone is a column total, $28$. Both are out of everyone:',
              ),
              working('P(\\text{girl, packed}) &= \\frac{16}{60} = \\frac{4}{15}', 'P(\\text{packed}) &= \\frac{28}{60} = \\frac{7}{15}'),
            ),
            ask('prob-twoway-which'),
            ask('prob-twoway-fill', 2),
            ask('prob-twoway-cell+choice', 2),
            teach(
              prose(
                'When a table comes without its totals, add them in first. Summing every cell gives the grand total, and a mistake in it spoils every probability after it, so check that the row totals and the column totals come to the same number.',
              ),
            ),
            ask('prob-twoway-tree', 2),
            ask('prob-twoway-which', 2),
          ],
          skillCheck: [ask('prob-twoway-fill', 2), ask('prob-twoway-cell', 2), ask('prob-twoway-tree', 2)],
        },
        {
          id: 'pb-l1-frequency',
          title: 'Relative Frequency and Expectation',
          slides: [
            teach(
              prose(
                'Some probabilities cannot be counted: whether a drawing pin lands point up, or a biased spinner lands red. Instead, run the experiment and use the **relative frequency**:',
              ),
              maths('P(\\text{event}) \\approx \\frac{\\text{successes}}{\\text{trials}}'),
              prose(
                'A pin landing point up 36 times in 60 drops gives $\\frac{36}{60} = 0.6$. The more trials, the better the estimate. When the outcomes are equally likely, count them instead.',
              ),
            ),
            ask('prob-rel-freq'),
            ask('prob-method-flow'),
            ask('prob-rel-freq', 2),
            teach(
              prose(
                'Turned round, a probability says how many times to expect something. In $n$ trials of an event with probability $p$, the **expected number** is',
              ),
              maths('\\text{Expected number} = np'),
              prose('Roll a fair die 120 times and you expect $120 \\times \\frac{1}{6} = 20$ sixes: not exactly 20 every time, but about that many.'),
            ),
            ask('prob-expected'),
            ask('prob-missing-expected'),
            ask('prob-method-flow', 2),
            teach(
              prose(
                'The probability may have to be found first. When a spinner lands on red, blue or green only, and $P(\\text{red}) = 0.2$ and $P(\\text{blue}) = 0.45$, then',
              ),
              working('P(\\text{green}) &= 1 - (0.2 + 0.45)', '&= 0.35'),
              prose('So in 200 spins, expect $200 \\times 0.35 = 70$ greens.'),
            ),
            ask('prob-expected+choice', 2),
            ask('prob-missing-expected', 2),
          ],
          skillCheck: [ask('prob-rel-freq', 2), ask('prob-expected', 2), ask('prob-missing-expected', 2)],
        },
      ],
      levelCheck: [
        ask('prob-bag-fraction+choice', 2),
        ask('prob-space-tree', 2),
        ask('prob-complement-tiles', 2),
        ask('prob-twoway-cell', 2),
        ask('prob-scale-slider', 2),
        ask('prob-method-flow', 2),
        ask('prob-space-table', 2),
        ask('prob-at-least-one', 2),
        ask('prob-outcome-count', 2),
        ask('prob-rel-freq', 2),
        ask('prob-cancel-tiles', 2),
        ask('prob-twoway-fill', 2),
        ask('prob-complement-flow', 2),
        ask('prob-space-event', 2),
        ask('prob-missing-expected', 2),
      ],
    },
    {
      id: 'pb-l2',
      title: 'Combining Events',
      lessons: [
        {
          id: 'pb-l2-exclusive',
          title: 'Mutually Exclusive Events',
          slides: [
            teach(
              prose(
                'Two events are **mutually exclusive** when they cannot both happen at once. Rolling a 2 and rolling a 5 on one die are; rolling an even number and rolling a 2 are not, since a 2 is both.',
              ),
              prose('For mutually exclusive events, the chance of one **or** the other is found by adding:'),
              maths('P(A \\text{ or } B) = P(A) + P(B)'),
              prose('On a die, $P(2 \\text{ or } 5) = \\frac{1}{6} + \\frac{1}{6} = \\frac{1}{3}$.'),
            ),
            ask('prob-exclusive-flow'),
            ask('prob-add-tiles'),
            ask('prob-exclusive-choice'),
            teach(
              prose(
                'When a list of outcomes is mutually exclusive and covers everything that can happen, the probabilities add up to $1$. That finds a missing one:',
              ),
              maths('\\begin{array}{l|c} \\text{Colour} & P \\\\ \\hline \\text{Red} & 0.3 \\\\ \\text{Blue} & 0.15 \\\\ \\text{Green} & x \\\\ \\text{White} & 0.4 \\end{array}'),
              working('x &= 1 - (0.3 + 0.15 + 0.4)', '&= 0.15'),
              prose('If a probability is written as $2x$ or $3x$, collect the $x$ terms first and then divide.'),
            ),
            ask('prob-spinner-missing'),
            ask('prob-add-tiles', 2),
            ask('prob-exclusive-flow', 2),
            teach(
              prose(
                'Adding only works for mutually exclusive events. For "even or a 2" on a die, $\\frac{3}{6} + \\frac{1}{6}$ counts the 2 twice; the right answer is $\\frac{3}{6}$, since the 2 is already even.',
              ),
              prose('The rule that fixes the double count comes with Venn diagrams, in the next lesson.'),
            ),
            ask('prob-exclusive-choice', 2),
            ask('prob-spinner-missing+choice', 2),
          ],
          skillCheck: [ask('prob-add-tiles', 2), ask('prob-spinner-missing', 2), ask('prob-exclusive-flow', 2)],
        },
        {
          id: 'pb-l2-venn',
          title: 'Venn Diagrams',
          slides: [
            teach(
              prose(
                'A **Venn diagram** puts each event in a circle inside a box holding everything. Here 20 people are sorted by whether they play football ($A$) and tennis ($B$):',
              ),
              diagram(vennSvg(['A', 'B'], ['5', '3', '7', '5'])),
              prose(
                'The overlap is **both**, $A \\cap B$ ("A and B"): 3 people. Everything inside either circle is $A \\cup B$ ("A or B"): $5 + 3 + 7 = 15$. Outside $A$ is $A\'$: $7 + 5 = 12$. So $P(A \\cap B) = \\frac{3}{20}$.',
              ),
            ),
            ask('prob-venn-region'),
            ask('prob-venn-union'),
            ask('prob-venn-tree'),
            teach(
              prose(
                'Adding $P(A)$ and $P(B)$ counts the overlap twice, once in each circle. Take it away once and you have the **addition rule**, which works for any two events:',
              ),
              working('P(A \\cup B) = {} & P(A) + P(B)', '& - P(A \\cap B)'),
              prose('From the diagram: $\\frac{8}{20} + \\frac{10}{20} - \\frac{3}{20} = \\frac{15}{20}$, the same as counting the three regions.'),
            ),
            ask('prob-venn-rule-tiles'),
            ask('prob-venn-region', 2),
            ask('prob-venn-union+choice', 2),
            teach(
              prose(
                'The rule runs backwards too. Given $P(A)$, $P(B)$ and $P(A \\cup B)$, rearrange for the overlap:',
              ),
              working('P(A \\cap B) = {} & P(A) + P(B)', '& - P(A \\cup B)'),
              prose(
                'And "neither" is the complement of "at least one": whatever is outside both circles. When a count is given as "$A$" rather than "only $A$", take the overlap off it before writing it in its region.',
              ),
            ),
            ask('prob-venn-tree', 2),
            ask('prob-venn-rule-tiles', 2),
          ],
          skillCheck: [ask('prob-venn-union', 2), ask('prob-venn-rule-tiles', 2), ask('prob-venn-tree', 2)],
        },
        {
          id: 'pb-l2-independence',
          title: 'Independent Events',
          slides: [
            teach(
              prose(
                'Two events are **independent** when one happening makes no difference to the chance of the other: two separate coin flips, or a die and a spinner. For independent events, "and" is found by multiplying:',
              ),
              maths('P(A \\cap B) = P(A) \\times P(B)'),
              prose(
                'A head and a six: $\\frac{1}{2} \\times \\frac{1}{6} = \\frac{1}{12}$. It works for three or more too: three heads is $\\left(\\frac{1}{2}\\right)^{3} = \\frac{1}{8}$.',
              ),
            ),
            ask('prob-indep-and'),
            ask('prob-indep-tiles'),
            ask('prob-repeat-steps'),
            teach(
              prose('To test whether two events are independent, compare the product with the overlap:'),
              working('P(A) \\times P(B) &= 0.4 \\times 0.5', '&= 0.2', 'P(A \\cap B) &= 0.2'),
              prose(
                'They match, so $A$ and $B$ are independent; if they differ, they are not. The rule rearranges as well: $P(B) = P(A \\cap B) \\div P(A)$.',
              ),
            ),
            ask('prob-indep-flow'),
            ask('prob-indep-and+choice', 2),
            ask('prob-indep-tiles', 2),
            teach(
              prose(
                'Sometimes the overlap has to be found first, from the addition rule: $P(A \\cap B) = P(A) + P(B) - P(A \\cup B)$.',
              ),
              prose(
                '"Neither" or "none" multiplies the complements. If three people each score with probability $0.2$, $0.5$ and $0.6$, the chance none of them does is $0.8 \\times 0.5 \\times 0.4 = 0.16$.',
              ),
            ),
            ask('prob-indep-flow', 2),
            ask('prob-repeat-steps', 2),
          ],
          skillCheck: [ask('prob-indep-and', 2), ask('prob-indep-tiles', 2), ask('prob-repeat-steps', 2)],
        },
        {
          id: 'pb-l2-trees',
          title: 'Tree Diagrams',
          slides: [
            teach(
              prose(
                'A **tree diagram** shows two events one after the other. Each branch carries its probability, and the branches from any one point add up to $1$:',
              ),
              diagram(
                treeSvg({
                  first: ['0.3', '0.7'],
                  second: [
                    ['0.6', '0.4'],
                    ['0.6', '0.4'],
                  ],
                  names: ['A', "A'", 'B', "B'"],
                }),
              ),
              prose(
                '**Multiply along** a path for "this and then that": $P(A \\cap B\') = 0.3 \\times 0.4 = 0.12$. **Add** the ends of different paths for "this or that".',
              ),
            ),
            ask('prob-tree-read'),
            ask('prob-tree-exactly-tiles'),
            ask('prob-tree-read+choice', 2),
            teach(
              prose(
                'For "at least one", work from the one path that has neither: in the tree above, $P(A\' \\cap B\') = 0.7 \\times 0.4 = 0.28$, so',
              ),
              working('P(\\text{at least one}) &= 1 - 0.28', '&= 0.72'),
              prose('"Both or neither" is two paths added: $0.3 \\times 0.6 + 0.7 \\times 0.4 = 0.18 + 0.28 = 0.46$.'),
            ),
            ask('prob-tree-atleast'),
            ask('prob-tree-same-steps'),
            ask('prob-tree-exactly-tiles', 2),
            teach(
              prose(
                'A quick check: the four ends of a two-stage tree cover every outcome, so they add up to $1$. Above, $0.18 + 0.12 + 0.42 + 0.28 = 1$.',
              ),
              prose('A missing branch is $1$ minus the branch beside it, so a tree can be finished from one number at each point.'),
            ),
            ask('prob-tree-same-steps', 2),
            ask('prob-tree-atleast', 2),
          ],
          skillCheck: [ask('prob-tree-read', 2), ask('prob-tree-atleast', 2), ask('prob-tree-exactly-tiles', 2)],
        },
        {
          id: 'pb-l2-conditional',
          title: 'Given That, and Without Replacement',
          slides: [
            teach(
              prose(
                '"Given that" narrows the choice to one group. In the lunch table, given that a pupil is a boy, only the Boys row counts:',
              ),
              lunchTable,
              maths('P(\\text{hot} \\mid \\text{boy}) = \\frac{18}{30} = \\frac{3}{5}'),
              prose('The bar reads "given". The denominator is the size of the group you were told about, not the grand total.'),
            ),
            ask('prob-cond-table'),
            ask('prob-cond-which'),
            ask('prob-cond-table+choice', 2),
            teach(
              prose(
                'Taking two things **without replacement** changes the second pick. A jar holds 5 yellow and 2 red counters. After a yellow is taken, 4 yellow are left out of 6:',
              ),
              diagram(
                treeSvg({
                  first: ['5/7', '2/7'],
                  second: [
                    ['4/6', '2/6'],
                    ['5/6', '1/6'],
                  ],
                  names: ['Y', 'R', 'Y', 'R'],
                }),
              ),
              working('P(\\text{both yellow}) &= \\frac{5}{7} \\times \\frac{4}{6}', '&= \\frac{20}{42} = \\frac{10}{21}'),
            ),
            ask('prob-norepl-tiles'),
            ask('prob-norepl-tree'),
            ask('prob-cond-which', 2),
            teach(
              prose('"One of each" can happen two ways, yellow then red or red then yellow. Find each path and add:'),
              working('& \\frac{5}{7} \\times \\frac{2}{6} + \\frac{2}{7} \\times \\frac{5}{6}', '= {} & \\frac{10}{42} + \\frac{10}{42} = \\frac{10}{21}'),
            ),
            ask('prob-norepl-tree', 2),
            ask('prob-norepl-tiles', 2),
          ],
          skillCheck: [ask('prob-cond-table', 2), ask('prob-norepl-tree', 2), ask('prob-norepl-tiles', 2)],
        },
      ],
      levelCheck: [
        ask('prob-add-tiles', 2),
        ask('prob-venn-union', 2),
        ask('prob-indep-and+choice', 2),
        ask('prob-tree-atleast', 2),
        ask('prob-cond-table', 2),
        ask('prob-exclusive-flow', 2),
        ask('prob-venn-rule-tiles', 2),
        ask('prob-repeat-steps', 2),
        ask('prob-tree-read+choice', 2),
        ask('prob-norepl-tree', 2),
        ask('prob-spinner-missing', 2),
        ask('prob-venn-region', 2),
        ask('prob-indep-flow', 2),
        ask('prob-tree-exactly-tiles', 2),
        ask('prob-norepl-tiles', 2),
      ],
    },
    {
      id: 'pb-l4',
      title: 'Conditional Probability',
      lessons: [
        {
          id: 'pb-l4-formula',
          title: 'The Formula',
          slides: [
            teach(
              prose(
                'Given That, and Without Replacement found "given that" from a table by keeping only one group. The same idea works as a formula for any two events:',
              ),
              maths('P(A \\mid B) = \\frac{P(A \\cap B)}{P(B)}'),
              lunchTable,
              prose('With $A$ a hot lunch and $B$ a boy, $P(A \\cap B) = \\frac{18}{60}$ and $P(B) = \\frac{30}{60}$, so'),
              working('P(A \\mid B) &= \\frac{18}{60} \\div \\frac{30}{60}', '&= \\frac{18}{30} = \\frac{3}{5}'),
            ),
            ask('prob-cf-table-tiles'),
            ask('prob-cf-formula'),
            ask('prob-cf-joint-which'),
            teach(
              prose('The formula needs no counts at all. When $P(R) = 0.4$ and $P(R \\cap L) = 0.12$:'),
              working('P(L \\mid R) &= \\frac{0.12}{0.4}', '&= 0.3'),
              prose(
                'The event you are told has happened goes after the bar, and its probability goes on the bottom. In a table of probabilities, that is its row or column total.',
              ),
            ),
            ask('prob-cf-formula+choice', 2),
            ask('prob-cf-table-tiles', 2),
            ask('prob-cf-joint-which', 2),
            teach(
              prose('Multiply both sides by $P(B)$ and the formula turns round into a multiplication rule for any two events:'),
              working('P(A \\cap B) = {} & P(B)', '& \\times P(A \\mid B)'),
              prose(
                'If $P(R) = 0.4$, and on a rainy day Sam is late with probability $0.3$, then $P(R \\cap L) = 0.4 \\times 0.3 = 0.12$. For independent events $P(A \\mid B)$ is just $P(A)$, which gives back the rule from Independent Events.',
              ),
            ),
            ask('prob-cf-and-tree'),
            ask('prob-cf-and-tree', 2),
          ],
          skillCheck: [ask('prob-cf-formula', 2), ask('prob-cf-table-tiles', 2), ask('prob-cf-and-tree', 2)],
        },
        {
          id: 'pb-l4-venn',
          title: 'Given That on a Venn Diagram',
          slides: [
            teach(
              prose(
                'On a Venn diagram, "given $T$" means keep only the circle $T$ and ignore the rest. Here 30 people are sorted by whether they play football, $F$, and tennis, $T$:',
              ),
              diagram(vennSvg(['F', 'T'], ['9', '3', '7', '11'])),
              prose('Given $T$, only the $3 + 7 = 10$ tennis players count, and $3$ of them play football:'),
              maths('P(F \\mid T) = \\frac{3}{10}'),
            ),
            ask('prob-cv-count'),
            ask('prob-cv-restrict-flow'),
            ask('prob-cv-given-tiles'),
            teach(
              prose(
                'The other way round is a different question. Given $F$, the circle $F$ holds $9 + 3 = 12$, so $P(T \\mid F) = \\frac{3}{12} = \\frac{1}{4}$, not $\\frac{3}{10}$.',
              ),
              prose(
                'The overlap is on top both times; only the part you keep changes. With probabilities in the regions it works the same way: divide the region you want by the total of the part you keep.',
              ),
            ),
            ask('prob-cv-fill'),
            ask('prob-cv-count+choice', 2),
            ask('prob-cv-restrict-flow', 2),
            teach(
              prose(
                '"Given not $T$", $T\'$, keeps everything outside $T$: the $9$ who play football only and the $11$ who play neither, $20$ people in all.',
              ),
              maths("P(F \\mid T') = \\frac{9}{20}"),
              prose('Outside a circle is a region of the other circle and the corner of the box, so add both before dividing.'),
            ),
            ask('prob-cv-given-tiles', 2),
            ask('prob-cv-fill', 2),
          ],
          skillCheck: [ask('prob-cv-count', 2), ask('prob-cv-given-tiles', 2), ask('prob-cv-fill', 2)],
        },
        {
          id: 'pb-l4-branches',
          title: 'Branches That Depend',
          slides: [
            teach(
              prose(
                'When the second event depends on the first, the second-stage branches change with the first. $R$ is rain on a school day and $L$ is Sam being late:',
              ),
              diagram(
                treeSvg({
                  first: ['0.4', '0.6'],
                  second: [
                    ['0.3', '0.7'],
                    ['0.1', '0.9'],
                  ],
                  names: ['R', "R'", 'L', "L'"],
                }),
              ),
              prose(
                'Each second branch is a conditional probability, given the branch it hangs from. The top pair says $P(L \\mid R) = 0.3$, the bottom pair $P(L \\mid R\') = 0.1$. "On a dry day, the probability Sam is late is $0.1$" is a sentence about the bottom pair.',
              ),
            ),
            ask('prob-cb-words'),
            ask('prob-cb-fill'),
            ask('prob-cb-path'),
            teach(
              prose('Multiplying along a path still gives "this and then that": $P(R \\cap L) = 0.4 \\times 0.3 = 0.12$. Sam can be late on two paths, so $P(L)$ adds them:'),
              working('P(L) &= 0.4 \\times 0.3 + 0.6 \\times 0.1', '&= 0.12 + 0.06 = 0.18'),
            ),
            ask('prob-cb-total-tree'),
            ask('prob-cb-words', 2),
            ask('prob-cb-fill', 2),
            teach(
              prose(
                'The branches from each point still add up to $1$, and so do the four ends: $0.12 + 0.28 + 0.06 + 0.54 = 1$. A sentence that gives the "not" outcome, such as Sam being on time, fills the other branch of its pair.',
              ),
            ),
            ask('prob-cb-total-tree', 2),
            ask('prob-cb-path', 2),
          ],
          skillCheck: [ask('prob-cb-fill', 2), ask('prob-cb-total-tree', 2), ask('prob-cb-words', 2)],
        },
        {
          id: 'pb-l4-independence',
          title: 'Testing for Independence',
          slides: [
            teach(
              prose('$A$ and $B$ are independent when knowing that $B$ happened leaves the chance of $A$ as it was:'),
              maths('P(A \\mid B) = P(A)'),
              prose(
                'A club has $50$ members: $20$ juniors, $8$ of whom swim, and $30$ adults, $12$ of whom swim. $P(\\text{swim}) = \\frac{20}{50} = \\frac{2}{5}$ and $P(\\text{swim} \\mid \\text{junior}) = \\frac{8}{20} = \\frac{2}{5}$, so swimming and being a junior are independent.',
              ),
            ),
            ask('prob-ci-given'),
            ask('prob-ci-table-flow'),
            ask('prob-ci-venn-tiles'),
            teach(
              prose(
                'On a tree, independence shows in the second stage: the events are independent exactly when the branches are the same under both first branches, $P(B \\mid A) = P(B \\mid A\')$.',
              ),
              diagram(
                treeSvg({
                  first: ['0.3', '0.7'],
                  second: [
                    ['0.6', '0.4'],
                    ['0.6', '0.4'],
                  ],
                  names: ['A', "A'", 'B', "B'"],
                }),
              ),
              prose('Independent Events drew its trees this way, and that is why they could be multiplied straight along.'),
            ),
            ask('prob-ci-tree-choice'),
            ask('prob-ci-given+choice', 2),
            ask('prob-ci-table-flow', 2),
            teach(
              prose(
                'The test from Independent Events says the same thing. If $P(A \\mid B) = P(A)$, then $P(A \\cap B) = P(B) \\times P(A \\mid B) = P(A) \\times P(B)$.',
              ),
              prose('Use whichever fits the numbers. On a Venn diagram of probabilities, add each circle\'s two regions for $P(A)$ and $P(B)$ first.'),
            ),
            ask('prob-ci-venn-tiles', 2),
            ask('prob-ci-tree-choice', 2),
          ],
          skillCheck: [ask('prob-ci-given', 2), ask('prob-ci-venn-tiles', 2), ask('prob-ci-table-flow', 2)],
        },
        {
          id: 'pb-l4-reverse',
          title: 'Working Back Up a Tree',
          slides: [
            teach(
              prose('A tree runs forwards: rain or not, then late or not. Told how it ended, run it backwards. Given $L$, only the paths ending in $L$ are left:'),
              diagram(
                treeSvg({
                  first: ['0.4', '0.6'],
                  second: [
                    ['0.3', '0.7'],
                    ['0.1', '0.9'],
                  ],
                  names: ['R', "R'", 'L', "L'"],
                }),
              ),
              working('P(R \\mid L) &= \\frac{P(R \\cap L)}{P(L)}', '&= \\frac{0.12}{0.12 + 0.06} = \\frac{2}{3}'),
              prose('Sam is late on only $0.3$ of rainy days, yet $\\frac{2}{3}$ of the days Sam is late are rainy. $P(R \\mid L)$ and $P(L \\mid R)$ are different questions.'),
            ),
            ask('prob-cr-which'),
            ask('prob-cr-tiles'),
            ask('prob-cr-bayes-tree'),
            teach(
              prose(
                'This is why a positive test can mislead. Say $P(I) = 0.02$ for an illness $I$, a test is positive for $0.9$ of those who have it, and for $0.1$ of those who do not:',
              ),
              prose('The two paths that end in a positive test are $0.02 \\times 0.9 = 0.018$ and $0.98 \\times 0.1 = 0.098$, so'),
              working('P(I \\mid +) &= \\frac{0.018}{0.018 + 0.098}', '&= \\frac{0.018}{0.116} = \\frac{9}{58}'),
              prose('Fewer than one in six people who test positive have the illness, because there are so many more healthy people.'),
            ),
            ask('prob-cr-counters'),
            ask('prob-cr-bayes-tree', 2),
            ask('prob-cr-which', 2),
            teach(
              prose(
                'Without replacement works the same way. A bag holds 4 red and 3 blue counters, and two are taken. The second is red on two paths: red then red, $\\frac{4}{7} \\times \\frac{3}{6} = \\frac{12}{42}$, and blue then red, $\\frac{3}{7} \\times \\frac{4}{6} = \\frac{12}{42}$.',
              ),
              prose('So $P(\\text{2nd red}) = \\frac{24}{42}$, and red then red is $\\frac{12}{42}$ of that:'),
              working('& P(\\text{1st red} \\mid \\text{2nd red})', '&= \\frac{12}{24} = \\frac{1}{2}'),
            ),
            ask('prob-cr-counters+choice', 2),
            ask('prob-cr-tiles', 2),
          ],
          skillCheck: [ask('prob-cr-tiles', 2), ask('prob-cr-bayes-tree', 2), ask('prob-cr-counters', 2)],
        },
      ],
      levelCheck: [
        ask('prob-cf-formula', 2),
        ask('prob-cv-count', 2),
        ask('prob-cb-fill', 2),
        ask('prob-ci-table-flow', 2),
        ask('prob-cr-bayes-tree', 2),
        ask('prob-cf-table-tiles', 2),
        ask('prob-cv-fill', 2),
        ask('prob-cb-words', 2),
        ask('prob-ci-venn-tiles', 2),
        ask('prob-cr-counters', 2),
        ask('prob-cf-and-tree', 2),
        ask('prob-cv-given-tiles', 2),
        ask('prob-cb-total-tree', 2),
        ask('prob-ci-given', 2),
        ask('prob-cr-which', 2),
      ],
    },
  ],
};
