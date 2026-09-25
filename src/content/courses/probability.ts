/**
 * Probability.
 *
 * Level 1 is outcomes and sample spaces: probability as favourable over total
 * and its place on the 0 to 1 scale, listing a sample space and counting it,
 * the complement and "at least one", two-way tables, and relative frequency
 * with the expected number. Level 2 combines events: mutually exclusive
 * events and the addition rule, Venn diagrams, independence and the
 * multiplication rule, tree diagrams, and a first look at "given that" and
 * picking without replacement. Level 3 builds the diagrams themselves: trees
 * from words, including a three-way first stage and three stages, Venn
 * diagrams of two and three sets filled from their totals, and probabilities
 * read off a filled diagram.
 *
 * Level 4 is conditional probability: the formula P(A | B) = P(A ∩ B) / P(B)
 * and its turned-round form, reading it off a Venn diagram, conditional
 * branches on a tree, testing independence with P(A | B) = P(A), and working
 * back up a tree from the outcome. It follows level 2's "given that" lesson
 * (`pb-l2-conditional`) rather than teaching that again.
 *
 * Level 5 is arrangements: n things in a line as n! and with a rule to keep,
 * ordered selections as nPr, unordered ones as nCr, the words made from
 * letters that repeat, choosing from two groups, and a probability as the
 * arrangements or selections that fit over all of them.
 *
 * Counting selections with nCr belongs to Binomial Expansion (`be-l2-ncr`)
 * and percentages to Exponents & Radicals (`er-l7-percent`); both are pointed
 * at, not taught again. Later levels are in `docs/roadmap/levels/probability.md`.
 *
 * Each level closes with a level check: fifteen questions, no teaching
 * slides, one attempt each.
 */
import type { Block, Course, SlideRef } from '../types';
import { scaleSvg, spinnerSvg, stagedTreeSvg, treeSvg, venn3Svg, vennSvg } from '../generators/probability';

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
  position: 20,
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
              prose(
                'A bag holds 4 red, 6 blue and 2 green counters, 12 in all. One is taken at random. 4 of the 12 are red, and 4 and 12 both divide by 4, so the fraction cancels:',
              ),
              working('P(\\text{red}) &= \\frac{4}{12}', '&= \\frac{1}{3}'),
              prose('"Red or green" counts both colours, $4 + 2 = 6$. "Not green" counts every other counter, $12 - 2 = 10$:'),
              working('P(\\text{red or green}) &= \\tfrac{6}{12} = \\tfrac{1}{2}', 'P(\\text{not green}) &= \\tfrac{10}{12} = \\tfrac{5}{6}'),
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
              prose(
                'The same "adds up to $1$" finds a probability from a comparison. A biased coin is 4 times as likely to land heads as tails. Call $P(\\text{tails}) = p$, so $P(\\text{heads}) = 4p$:',
              ),
              working('4p + p &= 1', '5p &= 1', 'p &= \\tfrac{1}{5}'),
              prose('So $P(\\text{tails}) = \\frac{1}{5}$ and $P(\\text{heads}) = 4 \\times \\frac{1}{5} = \\frac{4}{5}$.'),
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
              prose(
                '"Not all sixes" works the same way from the one outcome it leaves out, a six every time: $1 - \\left(\\frac{1}{6}\\right)^{2} = 1 - \\frac{1}{36} = \\frac{35}{36}$.',
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
              prose(
                'For "not", count the trials that did not give it: the pin landed some other way $60 - 36 = 24$ times, so $P(\\text{not point up}) \\approx \\frac{24}{60} = 0.4$. With a table of results, add up every row for the number of trials first.',
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
              prose('An estimate from trials works the same way. The pin above lands point up with relative frequency $0.6$, so in 200 more drops expect $200 \\times 0.6 = 120$.'),
            ),
            ask('prob-expected'),
            ask('prob-expected+choice', 2),
            ask('prob-method-flow', 2),
            teach(
              prose(
                'The probability may have to be found first. When a spinner lands on red, blue or green only, and $P(\\text{red}) = 0.2$ and $P(\\text{blue}) = 0.45$, then',
              ),
              working('P(\\text{green}) &= 1 - (0.2 + 0.45)', '&= 0.35'),
              prose('So in 200 spins, expect $200 \\times 0.35 = 70$ greens.'),
            ),
            ask('prob-missing-expected'),
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
              prose('"Neither red nor blue" is everything else, so it is what the two leave of $1$:'),
              working('P(\\text{neither}) &= 1 - 0.3 - 0.15', '&= 0.55'),
            ),
            ask('prob-spinner-missing'),
            ask('prob-add-tiles', 2),
            ask('prob-exclusive-flow', 2),
            teach(
              prose(
                'Adding only works for mutually exclusive events. For "even or a 2" on a die, $\\frac{3}{6} + \\frac{1}{6}$ counts the 2 twice; the right answer is $\\frac{3}{6}$, since the 2 is already even.',
              ),
              prose('The rule that fixes the double count comes with Venn diagrams, in the next lesson.'),
              prose(
                'A missing probability can also come as a multiple of $x$. If red is $0.2$, blue $0.35$, green $x$ and white $2x$, the four still add up to $1$. Collect the $x$ terms, then divide:',
              ),
              working('0.2 + 0.35 + x + 2x &= 1', '0.55 + 3x &= 1', '3x &= 0.45', 'x &= 0.15'),
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
                'The overlap is **both**, $A \\cap B$ ("A and B"): 3 people. Everything inside either circle is $A \\cup B$ ("A or B"): $5 + 3 + 7 = 15$. Outside $A$ is $A\'$: $7 + 5 = 12$. Outside both circles is $(A \\cup B)\'$, "neither": $5$. So $P(A \\cap B) = \\frac{3}{20}$ and $P((A \\cup B)\') = \\frac{5}{20} = \\frac{1}{4}$.',
              ),
              prose(
                'Often you are told the totals instead: 8 play football, 10 play tennis and 3 play both. The 8 and the 10 each include the 3, so take the overlap off each, then the rest of the 20 go outside:',
              ),
              working('\\text{football only} &= 8 - 3 = 5', '\\text{tennis only} &= 10 - 3 = 7', '\\text{at least one} &= 5 + 3 + 7 = 15', '\\text{neither} &= 20 - 15 = 5'),
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
              prose(
                'A "not" is $1$ minus, and then multiply as before. With $P(A) = 0.3$ and $P(B) = 0.6$, independent:',
              ),
              working("P(A \\cap B') &= 0.3 \\times (1 - 0.6)", '&= 0.3 \\times 0.4 = 0.12', "P(A' \\cap B') &= 0.7 \\times 0.4 = 0.28"),
            ),
            ask('prob-indep-and'),
            ask('prob-indep-tiles'),
            ask('prob-repeat-steps'),
            teach(
              prose('To test whether two events are independent, compare the product with the overlap:'),
              working('P(A) \\times P(B) &= 0.4 \\times 0.5', '&= 0.2', 'P(A \\cap B) &= 0.2'),
              prose(
                'They match, so $A$ and $B$ are independent; if they differ, they are not. The rule rearranges as well: $P(B) = P(A \\cap B) \\div P(A)$, here $0.2 \\div 0.4 = 0.5$. With fractions, divide by multiplying by the flipped fraction: $\\frac{1}{6} \\div \\frac{1}{2} = \\frac{1}{6} \\times \\frac{2}{1} = \\frac{1}{3}$.',
              ),
            ),
            ask('prob-indep-flow'),
            ask('prob-indep-and+choice', 2),
            ask('prob-indep-tiles', 2),
            teach(
              prose(
                'Sometimes the overlap has to be found first, from the addition rule. With $P(A) = 0.4$, $P(B) = 0.3$ and $P(A \\cup B) = 0.58$:',
              ),
              working('P(A \\cap B) &= 0.4 + 0.3 - 0.58', '&= 0.12', 'P(A) \\times P(B) &= 0.4 \\times 0.3', '&= 0.12'),
              prose('They match, so $A$ and $B$ are independent.'),
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
              prose('"Exactly one" happens on two paths, $A$ then $B\'$ or $A\'$ then $B$. Multiply along each, then add:'),
              working("& P(A \\cap B') + P(A' \\cap B)", '= {} & 0.3 \\times 0.4 + 0.7 \\times 0.6', '= {} & 0.12 + 0.42 = 0.54'),
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
      id: 'pb-l3',
      title: 'Tree and Venn Diagrams',
      lessons: [
        {
          id: 'pb-l3-words',
          title: 'Trees from Words',
          slides: [
            teach(
              prose(
                'To draw a tree from words, give each pick or event a **stage**, one branch for each outcome, and write each probability on its branch. A bag holds 3 red and 5 green counters; one is taken and put back, then a second is taken:',
              ),
              diagram(
                stagedTreeSvg({
                  stages: [
                    ['R', 'G'],
                    ['R', 'G'],
                  ],
                  labels: [
                    ['3/8', '5/8'],
                    ['3/8', '5/8', '3/8', '5/8'],
                  ],
                }),
              ),
              prose('The branches from any one point add up to $1$. Multiply along a path: $P(\\text{red then green}) = \\frac{3}{8} \\times \\frac{5}{8} = \\frac{15}{64}$.'),
            ),
            ask('prob-tree-branches'),
            ask('prob-tree-words'),
            teach(
              prose(
                'If the first counter is **not** put back, the second stage changes. After a red there are 7 left, 2 of them red; after a green, 7 left with 4 green:',
              ),
              diagram(
                stagedTreeSvg({
                  stages: [
                    ['R', 'G'],
                    ['R', 'G'],
                  ],
                  labels: [
                    ['3/8', '5/8'],
                    ['2/7', '5/7', '3/7', '4/7'],
                  ],
                }),
              ),
              working(
                '& P(\\text{one of each})',
                '= {} & \\tfrac{3}{8} \\times \\tfrac{5}{7} + \\tfrac{5}{8} \\times \\tfrac{3}{7}',
                '= {} & \\tfrac{15}{56} + \\tfrac{15}{56} = \\tfrac{15}{28}',
              ),
              working(
                '& P(\\text{same colour})',
                '= {} & \\tfrac{3}{8} \\times \\tfrac{2}{7} + \\tfrac{5}{8} \\times \\tfrac{4}{7}',
                '= {} & \\tfrac{6}{56} + \\tfrac{20}{56} = \\tfrac{13}{28}',
              ),
            ),
            ask('prob-replace-flow'),
            ask('prob-tree-branches', 2),
            ask('prob-tree-words+choice', 2),
            ask('prob-replace-flow', 2),
            teach(
              prose(
                'A stage can have more than two outcomes. Jess takes the bus, walks or cycles, and $L$ is being late. The first-stage branches still add up to $1$, so the missing one is $1 - 0.5 - 0.3 = 0.2$:',
              ),
              diagram(
                stagedTreeSvg({
                  stages: [
                    ['B', 'W', 'C'],
                    ['L', "L'"],
                  ],
                  labels: [
                    ['0.5', '0.3', '?'],
                    ['0.2', '0.8', '0.1', '0.9', '0.3', '0.7'],
                  ],
                }),
              ),
              prose('Then multiply along the path as usual: $P(C \\cap L) = 0.2 \\times 0.3 = 0.06$.'),
            ),
            ask('prob-branch-missing'),
            ask('prob-branch-missing', 2),
          ],
          skillCheck: [ask('prob-tree-branches', 2), ask('prob-tree-words', 2), ask('prob-branch-missing', 2)],
        },
        {
          id: 'pb-l3-three',
          title: 'Three-Stage Trees',
          slides: [
            teach(
              prose(
                'Three events in a row make a tree of three stages and eight paths. Ria wins each game of chess with probability $0.6$, independently; $W$ is a win and $L$ a loss:',
              ),
              diagram(
                stagedTreeSvg({
                  stages: [
                    ['W', 'L'],
                    ['W', 'L'],
                    ['W', 'L'],
                  ],
                  labels: [
                    ['0.6', '0.4'],
                    ['0.6', '0.4', '0.6', '0.4'],
                    ['0.6', '0.4', '0.6', '0.4', '0.6', '0.4', '0.6', '0.4'],
                  ],
                }),
              ),
              prose(
                'Multiply along a path: $P(W, L, W) = 0.6 \\times 0.4 \\times 0.6 = 0.144$. Add across paths: all three the same is $0.6^3 + 0.4^3 = 0.216 + 0.064 = 0.28$.',
              ),
            ),
            ask('prob-three-path'),
            ask('prob-three-same-steps'),
            ask('prob-three-path+choice', 2),
            teach(
              prose(
                '"At least one win" covers seven of the eight paths. Only one path has no win at all, $L, L, L$, so work from that one:',
              ),
              working('& P(\\text{at least one } W)', '= {} & 1 - P(L, L, L)', '= {} & 1 - 0.4^3 = 0.936'),
              prose('When the stages differ, multiply the three misses as they are: lights red with $0.7$, $0.5$ and $0.2$ give $1 - 0.7 \\times 0.5 \\times 0.2 = 1 - 0.07 = 0.93$.'),
            ),
            ask('prob-three-atleast'),
            ask('prob-three-same-steps', 2),
            teach(
              prose(
                '"Exactly two wins" happens on three paths: $W, W, L$ and $W, L, W$ and $L, W, W$. Here each is $0.6 \\times 0.6 \\times 0.4 = 0.144$, so the answer is $3 \\times 0.144 = 0.432$.',
              ),
              prose(
                'When the stages have different probabilities the paths are no longer equal: work out each one, then add. Three sets of lights are green with $0.3$, $0.5$ and $0.8$. Exactly one green:',
              ),
              working(
                'G, R, R &: 0.3 \\times 0.5 \\times 0.2 = 0.03',
                'R, G, R &: 0.7 \\times 0.5 \\times 0.2 = 0.07',
                'R, R, G &: 0.7 \\times 0.5 \\times 0.8 = 0.28',
                '\\text{total} &: 0.03 + 0.07 + 0.28 = 0.38',
              ),
            ),
            ask('prob-three-exactly-tiles'),
            ask('prob-three-exactly-tiles', 2),
            ask('prob-three-atleast', 2),
          ],
          skillCheck: [ask('prob-three-path', 2), ask('prob-three-atleast', 2), ask('prob-three-exactly-tiles', 2)],
        },
        {
          id: 'pb-l3-venn-two',
          title: 'Venn Diagrams from Totals',
          slides: [
            teach(
              prose(
                'Of 30 students, 18 play football, 12 play tennis and 5 play both. The 18 **include** the 5 who play both, so fill the overlap first, then the rest of each circle, then the outside:',
              ),
              diagram(vennSvg(['F', 'T'], ['13', '5', '7', '5'])),
              prose(
                '$18 - 5 = 13$ play football only, $12 - 5 = 7$ tennis only, and $30 - 25 = 5$ play neither. $n(F)$ means the number in $F$: here $n(F) = 18$, $n(F \\cap T) = 5$ and $n((F \\cup T)\') = 5$.',
              ),
            ),
            ask('prob-venn-regions-table'),
            ask('prob-venn-start-flow'),
            ask('prob-venn-count'),
            teach(
              prose(
                'Writing 18 and 12 straight into the circles counts the 5 twice: the diagram would hold $18 + 5 + 12 = 35$ students, more than there are.',
              ),
              prose(
                'Sometimes the overlap is what you have to find. With 18 football, 12 tennis and 5 neither, $30 - 5 = 25$ play at least one. But $18 + 12 = 30$, which is 5 too many: those 5 were counted twice, so 5 play both.',
              ),
            ),
            ask('prob-venn-match'),
            ask('prob-venn-regions-table', 2),
            ask('prob-venn-count+choice', 2),
            teach(
              prose('Two checks catch most slips. The four regions add up to the total, and each circle adds up to its own count:'),
              working('13 + 5 + 7 + 5 &= 30', '13 + 5 &= 18 = n(F)', '5 + 7 &= 12 = n(T)'),
            ),
            ask('prob-venn-start-flow', 2),
            ask('prob-venn-match', 2),
          ],
          skillCheck: [ask('prob-venn-regions-table', 2), ask('prob-venn-count', 2), ask('prob-venn-match', 2)],
        },
        {
          id: 'pb-l3-venn-three',
          title: 'Three-Set Venn Diagrams',
          slides: [
            teach(
              prose(
                'Three circles make **eight** regions: one in the middle for all three, three for exactly two, three for one only, and the outside. Here 40 students are sorted by French, German and Spanish:',
              ),
              diagram(venn3Svg(['F', 'G', 'S'], ['8', '6', '5', '4', '3', '2', '1', '11'])),
              prose('Fill a diagram **from the middle outward**: all three first, then the two-only regions, then each set only, then the outside.'),
              prose(
                'A set-only region is what is left of that set once the rest of its circle is taken off. $16$ study French, and $4$, $3$ and $1$ of them are in the other regions of $F$. The outside is what the seven inner regions leave of the $40$:',
              ),
              working('F \\text{ only} &= 16 - 4 - 3 - 1 = 8', '\\text{inside} &= 8 + 6 + 5 + 4', '&\\quad + 3 + 2 + 1 = 29', '\\text{outside} &= 40 - 29 = 11'),
            ),
            ask('prob-venn3-where'),
            ask('prob-venn3-fill'),
            ask('prob-venn3-missing'),
            teach(
              prose(
                'A count like "5 study French and German" includes the 1 who study all three, so the region for French and German only holds $5 - 1 = 4$.',
              ),
              prose('French only is then what is left of $n(F) = 16$ once the other regions of $F$ are taken off:'),
              maths('16 - 4 - 3 - 1 = 8'),
            ),
            ask('prob-venn3-outward'),
            ask('prob-venn3-where', 2),
            ask('prob-venn3-fill', 2),
            teach(
              prose(
                'A missing region comes from a total. The four regions inside $F$ add up to $n(F)$: if French only were unknown, $x + 4 + 3 + 1 = 16$ gives $x = 8$.',
              ),
              prose('The seven regions inside the circles add up to how many are in **at least one** set, $40 - 11 = 29$; the outside is not part of that.'),
            ),
            ask('prob-venn3-missing', 2),
            ask('prob-venn3-outward', 2),
          ],
          skillCheck: [ask('prob-venn3-fill', 2), ask('prob-venn3-outward', 2), ask('prob-venn3-missing', 2)],
        },
        {
          id: 'pb-l3-reading',
          title: 'Probabilities from a Diagram',
          slides: [
            teach(
              prose(
                'Once a diagram is filled, a probability is the count in the regions the event covers over **everyone**, inside the circles and out. With the 30 students:',
              ),
              diagram(vennSvg(['F', 'T'], ['13', '5', '7', '5'])),
              working(
                'P(F \\cup T) &= \\tfrac{13 + 5 + 7}{30} = \\tfrac{5}{6}',
                'P(\\text{exactly one}) &= \\tfrac{13 + 7}{30} = \\tfrac{2}{3}',
                'P(\\text{neither}) &= \\tfrac{5}{30} = \\tfrac{1}{6}',
                "P(T') &= \\tfrac{13 + 5}{30} = \\tfrac{3}{5}",
              ),
            ),
            ask('prob-venn-events-table'),
            ask('prob-venn-read-flow'),
            teach(
              prose('Three sets work the same way. For the 40 language students:'),
              diagram(venn3Svg(['F', 'G', 'S'], ['8', '6', '5', '4', '3', '2', '1', '11'])),
              working(
                'P(F) &= \\tfrac{8 + 4 + 3 + 1}{40} = \\tfrac{2}{5}',
                'P(\\text{all three}) &= \\tfrac{1}{40}',
                'P(\\text{exactly one}) &= \\tfrac{8 + 6 + 5}{40} = \\tfrac{19}{40}',
                'P(\\text{exactly two}) &= \\tfrac{4 + 3 + 2}{40} = \\tfrac{9}{40}',
                'P(\\text{at least two}) &= \\tfrac{9 + 1}{40} = \\tfrac{1}{4}',
              ),
              prose(
                '"$F$ and $G$" takes in the middle too. "$F$ but not $G$" is the part of $F$ outside $G$. "Not $F$" and "$F$ or $G$" are easiest from what they leave out:',
              ),
              working(
                'P(F \\cap G) &= \\tfrac{4 + 1}{40} = \\tfrac{1}{8}',
                "P(F \\cap G') &= \\tfrac{8 + 3}{40} = \\tfrac{11}{40}",
                "P(F') &= 1 - \\tfrac{16}{40} = \\tfrac{3}{5}",
                'P(F \\cup G) &= 1 - \\tfrac{5 + 11}{40} = \\tfrac{3}{5}',
              ),
            ),
            ask('prob-venn3-chance'),
            ask('prob-venn3-chance+choice', 2),
            ask('prob-venn-events-table', 2),
            ask('prob-venn-read-flow', 2),
            teach(
              prose(
                'A Venn diagram can hold probabilities instead of counts. Then every region is already a probability, and all of them add up to $1$:',
              ),
              diagram(vennSvg(['F', 'T'], ['0.35', '0.15', '0.2', '0.3'])),
              prose('$P(F \\cup T) = 0.35 + 0.15 + 0.2 = 0.7$, which is $1 - 0.3$, one minus the outside.'),
            ),
            ask('prob-venn-sum-tiles'),
            ask('prob-venn-sum-tiles', 2),
          ],
          skillCheck: [ask('prob-venn3-chance', 2), ask('prob-venn-events-table', 2), ask('prob-venn-sum-tiles', 2)],
        },
      ],
      levelCheck: [
        ask('prob-tree-branches', 2),
        ask('prob-three-path+choice', 2),
        ask('prob-venn-count', 2),
        ask('prob-three-atleast', 2),
        ask('prob-venn3-fill', 2),
        ask('prob-branch-missing', 2),
        ask('prob-venn3-chance', 2),
        ask('prob-venn-match', 2),
        ask('prob-venn3-outward', 2),
        ask('prob-three-exactly-tiles', 2),
        ask('prob-venn-events-table', 2),
        ask('prob-tree-words+choice', 2),
        ask('prob-venn3-missing', 2),
        ask('prob-venn-sum-tiles', 2),
        ask('prob-venn-regions-table', 2),
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
                'The event you are told has happened goes after the bar, and its probability goes on the bottom. In a table of probabilities, that is its row or column total. Given the same thing, "not late" is the rest of $1$: $P(L\' \\mid R) = 1 - 0.3 = 0.7$.',
              ),
              prose('Told $P(R \\cap L) = 0.12$ and $P(L \\mid R) = 0.3$ instead, the same line finds $P(R)$: divide the "and" by the "given that" probability.'),
              working('P(R) &= \\frac{0.12}{0.3}', '&= 0.4'),
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
              prose(
                'If the sentence gives the other outcome, take it from $1$ first. On a dry day, $P(R\') = 0.6$, Sam is on time with probability $0.9$, so late with $1 - 0.9 = 0.1$, and $P(R\' \\cap L) = 0.6 \\times 0.1 = 0.06$.',
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
              prose('Given $T$, only the $3 + 7 = 10$ tennis players count, and $3$ of them play football. The other way round, given $F$, the circle $F$ holds $9 + 3 = 12$:'),
              working('P(F \\mid T) &= \\tfrac{3}{10}', 'P(T \\mid F) &= \\tfrac{3}{12} = \\tfrac{1}{4}'),
              prose(
                'The overlap is on top both times; only the part you keep changes. With probabilities in the regions it is the same: if the overlap is $0.1$ and the rest of $T$ is $0.4$, then $P(F \\mid T) = \\frac{0.1}{0.1 + 0.4} = 0.2$.',
              ),
            ),
            ask('prob-cv-count'),
            ask('prob-cv-restrict-flow'),
            ask('prob-cv-given-tiles'),
            teach(
              prose(
                '"Given not $T$", $T\'$, keeps everything outside $T$: the $9$ who play football only and the $11$ who play neither, $20$ people in all. Outside a circle is a region of the other circle and the corner of the box, so add both before dividing.',
              ),
              prose('"Not $F$, given $T$" keeps the circle $T$ as before, and asks for the part of it outside $F$: the $7$ tennis-only players.'),
              working("P(F \\mid T') &= \\tfrac{9}{20}", "P(F' \\mid T) &= \\tfrac{7}{10}"),
            ),
            ask('prob-cv-given-tiles', 2),
            ask('prob-cv-count+choice', 2),
            ask('prob-cv-restrict-flow', 2),
            teach(
              prose(
                'To fill a diagram from a "given that", find the overlap first with the formula turned round, $P(A \\cap B) = P(B) \\times P(A \\mid B)$. With $P(A) = 0.5$, $P(B) = 0.4$ and $P(A \\mid B) = 0.3$:',
              ),
              working(
                'P(A \\cap B) &= 0.4 \\times 0.3 = 0.12',
                'A \\text{ only} &= 0.5 - 0.12 = 0.38',
                'B \\text{ only} &= 0.4 - 0.12 = 0.28',
                '\\text{outside} &= 1 - 0.5 - 0.28 = 0.22',
              ),
              diagram(vennSvg(['A', 'B'], ['0.38', '0.12', '0.28', '0.22'])),
              prose(
                'Given the overlap and two conditionals instead, turn each one round for its circle. With $P(A \\cap B) = 0.12$, $P(A \\mid B) = 0.3$ and $P(B \\mid A) = 0.24$:',
              ),
              working('P(B) &= 0.12 \\div 0.3 = 0.4', 'P(A) &= 0.12 \\div 0.24 = 0.5'),
            ),
            ask('prob-cv-fill'),
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
              prose(
                'The branches from each point add up to $1$, so each sentence fills a pair. A sentence can give the "not" outcome instead: "on a rainy day, Sam is on time with probability $0.7$" is the $L\'$ branch of the top pair, and its partner is $1 - 0.7 = 0.3$.',
              ),
            ),
            ask('prob-cb-words'),
            ask('prob-cb-fill'),
            ask('prob-cb-words', 2),
            teach(
              prose('Multiplying along a path still gives "this and then that": $P(R \\cap L) = 0.4 \\times 0.3 = 0.12$. Sam can be late on two paths, so $P(L)$ adds them:'),
              working('P(L) &= 0.4 \\times 0.3 + 0.6 \\times 0.1', '&= 0.12 + 0.06 = 0.18'),
            ),
            ask('prob-cb-path'),
            ask('prob-cb-total-tree'),
            ask('prob-cb-fill', 2),
            teach(
              prose('The four ends cover every outcome, so they add up to $1$:'),
              working("R \\cap L &= 0.4 \\times 0.3 = 0.12", "R \\cap L' &= 0.4 \\times 0.7 = 0.28", "R' \\cap L &= 0.6 \\times 0.1 = 0.06", "R' \\cap L' &= 0.6 \\times 0.9 = 0.54"),
              prose(
                'The least likely outcome is the smallest end, $R\' \\cap L$. Sam is on time on the two paths ending in $L\'$: $P(L\') = 0.28 + 0.54 = 0.82$, which is $1 - 0.18$.',
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
              prose(
                'Knowing $A$ did **not** happen changes nothing either, and a "not" is $1$ minus. Say $A$ and $B$ are independent, $P(A) = 0.6$ and $P(A \\cap B) = 0.18$. Find $P(B)$ first:',
              ),
              working(
                'P(B) &= 0.18 \\div 0.6 = 0.3',
                'P(B \\mid A) &= P(B) = 0.3',
                "P(B' \\mid A') &= 1 - 0.3 = 0.7",
                "P(A' \\mid B) &= 1 - 0.6 = 0.4",
              ),
            ),
            ask('prob-ci-given'),
            ask('prob-ci-table-flow'),
            ask('prob-ci-given+choice', 2),
            teach(
              prose(
                'The test from Independent Events says the same thing. If $P(A \\mid B) = P(A)$, then $P(A \\cap B) = P(B) \\times P(A \\mid B) = P(A) \\times P(B)$. On a Venn diagram of probabilities, add each circle\'s two regions first:',
              ),
              diagram(vennSvg(['A', 'B'], ['0.18', '0.12', '0.28', '0.42'])),
              working('P(A) &= 0.18 + 0.12 = 0.3', 'P(B) &= 0.12 + 0.28 = 0.4', 'P(A) \\times P(B) &= 0.3 \\times 0.4', '&= 0.12 = P(A \\cap B)'),
              prose('They match, so $A$ and $B$ are independent. The other test agrees: $P(A \\mid B) = \\frac{0.12}{0.4} = 0.3 = P(A)$.'),
            ),
            ask('prob-ci-venn-tiles'),
            ask('prob-ci-table-flow', 2),
            ask('prob-ci-venn-tiles', 2),
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
              prose(
                'Independent Events drew its trees this way, and that is why they could be multiplied straight along. If a branch is missing, take its partner from $1$ first: under $A\'$, a $B\'$ of $0.4$ means $B$ is $1 - 0.4 = 0.6$.',
              ),
            ),
            ask('prob-ci-tree-choice'),
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
              prose(
                'Any end works the same way. Of the same $0.116$, the healthy path is $0.098$, so $P(I\' \\mid +) = \\frac{0.098}{0.116} = \\frac{49}{58}$. Given a negative test, the bottom is the two paths ending in a negative instead.',
              ),
            ),
            ask('prob-cr-tiles', 2),
            ask('prob-cr-bayes-tree', 2),
            ask('prob-cr-which', 2),
            teach(
              prose('Without replacement works the same way. A bag holds 4 red and 3 blue counters, and two are taken one after the other:'),
              working(
                'P(\\text{RR}) &= \\tfrac{4}{7} \\times \\tfrac{3}{6} = \\tfrac{12}{42}',
                'P(\\text{BB}) &= \\tfrac{3}{7} \\times \\tfrac{2}{6} = \\tfrac{6}{42}',
                'P(\\text{BR}) &= \\tfrac{3}{7} \\times \\tfrac{4}{6} = \\tfrac{12}{42}',
              ),
              prose(
                'Put the part asked about over the part you are told; the 42s cancel. "Same colour" is RR or BB. "2nd red" is RR or BR:',
              ),
              working(
                'P(\\text{RR} \\mid \\text{same}) &= \\tfrac{12}{12 + 6} = \\tfrac{2}{3}',
                'P(\\text{RR} \\mid \\text{2nd R}) &= \\tfrac{12}{12 + 12} = \\tfrac{1}{2}',
              ),
              prose(
                '"At least one red" is everything except BB, found from its complement: $42 - 6 = 36$. So given at least one red, $P(\\text{RR}) = \\frac{12}{36} = \\frac{1}{3}$.',
              ),
            ),
            ask('prob-cr-counters'),
            ask('prob-cr-counters+choice', 2),
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
    {
      id: 'pb-l5',
      title: 'Arrangements',
      lessons: [
        {
          id: 'pb-l5-line',
          title: 'Arranging Everything',
          slides: [
            teach(
              prose('Jo, Sam and Ria can stand in a line in six orders:'),
              maths('\\begin{gathered} \\text{JSR, JRS, SJR,} \\\\ \\text{SRJ, RJS, RSJ} \\end{gathered}'),
              prose(
                'The 1st place can go to any of the 3, the 2nd to either of the 2 left, and the last to the 1 left: $3 \\times 2 \\times 1 = 6$. For $n$ different things that product is $n!$, said "$n$ factorial".',
              ),
              working('5! &= 5 \\times 4 \\times 3 \\times 2 \\times 1', '&= 120'),
            ),
            ask('prob-ar-line'),
            ask('prob-ar-slots-table'),
            ask('prob-ar-line+choice'),
            teach(
              prose(
                'A rule changes the count, so deal with the rule first. When two people must stand **together**, glue them into one block. With 5 people that leaves 4 things to arrange, and the pair can stand either way round inside the block:',
              ),
              maths('4! \\times 2! = 24 \\times 2 = 48'),
              prose('When one person must be **at an end**, place them first: 2 ends to choose from, then the other 4 in any order, $2 \\times 4! = 48$.'),
              prose(
                'When someone will **not** go 1st, fill the 1st place first. With 5 people and Jo not 1st, any of the other 4 can go 1st. Jo is back in for the 2nd place, so that has 4 choices too:',
              ),
              maths('4 \\times 4 \\times 3 \\times 2 \\times 1 = 96'),
            ),
            ask('prob-ar-together-tiles'),
            ask('prob-ar-end-tree'),
            ask('prob-ar-slots-table', 2),
            teach(
              prose('**Not together** is easier the other way round: every order, take away the together ones. With 5 people that is $5! - 48 = 72$.'),
              prose(
                'Two people at the two ends take them in 2 ways, and the other 3 fill the middle in $3!$ ways: $2 \\times 3! = 12$. Someone **not** at either end has 3 middle places to choose from, then $4!$ for the rest: $3 \\times 4! = 72$.',
              ),
            ),
            ask('prob-ar-together-tiles', 2),
            ask('prob-ar-end-tree', 2),
          ],
          skillCheck: [ask('prob-ar-line', 2), ask('prob-ar-together-tiles', 2), ask('prob-ar-end-tree', 2)],
        },
        {
          id: 'pb-l5-ordered',
          title: 'Ordered Selections',
          slides: [
            teach(
              prose(
                'Sometimes only some are chosen, but order still matters. 8 runners race for gold, silver and bronze: any of the 8 can win gold, then 7 are left for silver, then 6 for bronze.',
              ),
              maths('8 \\times 7 \\times 6 = 336'),
              prose('That is the start of $8!$, stopping after 3 factors.'),
            ),
            ask('prob-ar-npr'),
            ask('prob-ar-npr-tiles'),
            ask('prob-ar-method-flow'),
            teach(
              prose('Written with factorials, the $5!$ left over cancels:'),
              maths('\\dfrac{8!}{5!} = \\dfrac{8 \\times 7 \\times 6 \\times 5!}{5!} = 336'),
              prose('This is written $^{8}P_{3}$, the ordered selections of 3 from 8. In general'),
              maths('{}^{n}P_{r} = \\dfrac{n!}{(n - r)!}'),
            ),
            ask('prob-ar-cancel-steps'),
            ask('prob-ar-npr+choice', 2),
            ask('prob-ar-npr-tiles', 2),
            teach(
              prose(
                'Before counting, ask two questions. Does the order matter? For a podium, a code or a row of books, yes. Are all of them used? If so it is $n!$, which is $^{n}P_{n}$ since $0! = 1$.',
              ),
              prose('If only $r$ of the $n$ are used, it is $^{n}P_{r}$: the first $r$ factors of $n!$.'),
            ),
            ask('prob-ar-cancel-steps', 2),
            ask('prob-ar-method-flow'),
          ],
          skillCheck: [ask('prob-ar-npr', 2), ask('prob-ar-npr-tiles', 2), ask('prob-ar-cancel-steps', 2)],
        },
        {
          id: 'pb-l5-unordered',
          title: 'Unordered Selections',
          slides: [
            teach(
              prose(
                'A team of 3 from 8 players has no gold or bronze: the same three people make one team in any order. Counting in order gives $^{8}P_{3} = 336$, but each team is counted once for each of its $3! = 6$ orders:',
              ),
              maths('\\dfrac{336}{6} = 56'),
              prose('Factorials and nCr, in Binomial Expansion, met this number as $^{8}C_{3}$.'),
            ),
            ask('prob-ar-divide-tree'),
            ask('prob-ar-ncr'),
            ask('prob-ar-pair-table'),
            teach(
              maths('{}^{n}C_{r} = \\dfrac{n!}{r!\\,(n - r)!}'),
              prose('It is $^{n}P_{r}$ divided by $r!$. For the same $n$ and $r$, the ordered count is always $r!$ times the unordered one.'),
            ),
            ask('prob-ar-method-flow', 2),
            ask('prob-ar-ncr+choice', 2),
            ask('prob-ar-divide-tree', 2),
            teach(
              prose(
                'To tell which you need, swap two of the chosen ones round. If that gives something different, as a 1st and a 2nd place do, order matters: use $^{n}P_{r}$. If it gives the same team, hand or group, it does not: use $^{n}C_{r}$.',
              ),
            ),
            ask('prob-ar-pair-table', 2),
            ask('prob-ar-method-flow', 2),
          ],
          skillCheck: [ask('prob-ar-ncr', 2), ask('prob-ar-divide-tree', 2), ask('prob-ar-pair-table', 2)],
        },
        {
          id: 'pb-l5-repeats',
          title: 'Repeated Letters',
          slides: [
            teach(
              prose(
                'The letters of BOOK make fewer than $4! = 24$ words, because the two Os look the same. Swapping them changes nothing, so every word has been counted twice:',
              ),
              maths('\\dfrac{4!}{2!} = \\dfrac{24}{2} = 12'),
              prose('Divide by the factorial of how many times a letter appears: $3!$ for three of a letter.'),
            ),
            ask('prob-ar-word'),
            ask('prob-ar-repeats-tree'),
            ask('prob-ar-word-which'),
            teach(
              prose('With more than one letter repeated, divide by each. BANANA has 3 As and 2 Ns:'),
              maths('\\dfrac{6!}{3!\\,2!} = \\dfrac{720}{12} = 60'),
            ),
            ask('prob-ar-repeats-tree', 2),
            ask('prob-ar-word+choice', 2),
            ask('prob-ar-word-which', 2),
            teach(
              prose('Choosing from two groups is two choices, one after the other, so multiply. For 2 of 5 boys and 1 of 4 girls:'),
              maths('{}^{5}C_{2} \\times {}^{4}C_{1} = 10 \\times 4 = 40'),
              prose('Every one of the 10 pairs of boys goes with every one of the 4 girls.'),
            ),
            ask('prob-ar-groups-tiles'),
            ask('prob-ar-groups-tiles', 2),
          ],
          skillCheck: [ask('prob-ar-word', 2), ask('prob-ar-repeats-tree', 2), ask('prob-ar-groups-tiles', 2)],
        },
        {
          id: 'pb-l5-chance',
          title: 'Counting to Find a Probability',
          slides: [
            teach(
              prose(
                'When every order is equally likely, a probability is the orders that fit over all the orders. Five people sit in a row at random, in any of $5! = 120$ orders. Count the ones that fit as Arranging Everything did:',
              ),
              working(
                'P(\\text{Jo, Sam together}) &= \\tfrac{2 \\times 4!}{120}',
                '&= \\tfrac{48}{120} = \\tfrac{2}{5}',
                'P(\\text{Jo in seat 1}) &= \\tfrac{4!}{120}',
                '&= \\tfrac{24}{120} = \\tfrac{1}{5}',
                'P(\\text{Jo, Sam at ends}) &= \\tfrac{2 \\times 3!}{120}',
                '&= \\tfrac{12}{120} = \\tfrac{1}{10}',
              ),
              prose(
                'Jo and Sam **not** together is the rest: $1 - \\frac{2}{5} = \\frac{3}{5}$. Letters work the same way: BRAKE has 2 vowels, so a random order of its 5 letters starts with a vowel in $2 \\times 4! = 48$ of the $120$ orders, $\\frac{2}{5}$.',
              ),
            ),
            ask('prob-ar-side'),
            ask('prob-ar-chance-flow'),
            ask('prob-ar-side+choice', 2),
            teach(
              prose(
                'Selections work the same way. A committee of 3 is chosen at random from 6 people. There are $^{6}C_{3} = 20$ committees, and the ones with Ria on take her, then 2 of the other 5, in $^{5}C_{2} = 10$ ways:',
              ),
              maths('P = \\dfrac{10}{20} = \\dfrac{1}{2}'),
              prose(
                'For two named people, place them first. A committee of 4 from 7 people can be chosen in $^{7}C_{4} = 35$ ways. With both Ria and Jo on, the other 2 come from the 5 left; with neither on, all 4 do:',
              ),
              working('P(\\text{both}) &= \\tfrac{{}^{5}C_{2}}{35} = \\tfrac{10}{35} = \\tfrac{2}{7}', 'P(\\text{neither}) &= \\tfrac{{}^{5}C_{4}}{35} = \\tfrac{5}{35} = \\tfrac{1}{7}'),
            ),
            ask('prob-ar-committee-tiles'),
            ask('prob-ar-chance-flow', 2),
            ask('prob-ar-committee-tiles', 2),
            teach(
              prose(
                'Three counters taken from a bag all at once are a selection too. A bag holds 5 red and 3 blue counters, and $^{8}C_{3} = 56$ sets of three can be taken. All three red means 3 of the 5 red:',
              ),
              maths('P = \\dfrac{{}^{5}C_{3}}{{}^{8}C_{3}} = \\dfrac{10}{56} = \\dfrac{5}{28}'),
              prose('Exactly two red means 2 of the 5 red and 1 of the 3 blue:'),
              maths('P = \\dfrac{{}^{5}C_{2} \\times {}^{3}C_{1}}{{}^{8}C_{3}} = \\dfrac{30}{56} = \\dfrac{15}{28}'),
            ),
            ask('prob-ar-bag-tree'),
            ask('prob-ar-bag-tree', 2),
          ],
          skillCheck: [ask('prob-ar-side', 2), ask('prob-ar-committee-tiles', 2), ask('prob-ar-bag-tree', 2)],
        },
      ],
      levelCheck: [
        ask('prob-ar-line', 2),
        ask('prob-ar-together-tiles', 2),
        ask('prob-ar-npr', 2),
        ask('prob-ar-cancel-steps', 2),
        ask('prob-ar-ncr', 2),
        ask('prob-ar-divide-tree', 2),
        ask('prob-ar-method-flow', 2),
        ask('prob-ar-word', 2),
        ask('prob-ar-repeats-tree', 2),
        ask('prob-ar-groups-tiles', 2),
        ask('prob-ar-side', 2),
        ask('prob-ar-committee-tiles', 2),
        ask('prob-ar-bag-tree', 2),
        ask('prob-ar-chance-flow', 2),
        ask('prob-ar-pair-table', 2),
      ],
    },
  ],
};
