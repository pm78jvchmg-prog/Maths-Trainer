# Probability: level plan

Written by C16.

Has: Outcomes and Sample Spaces (probability as favourable over total and the
0 to 1 scale, listing and counting a sample space, the complement and "at least
one", two-way tables, relative frequency and the expected number); Combining
Events (mutually exclusive events and the addition rule, Venn diagrams and
P(A ∪ B) = P(A) + P(B) − P(A ∩ B), independence and the multiplication rule,
two-stage tree diagrams, "given that" from a table and picking without
replacement); Tree and Venn Diagrams (trees built from words, with and without
replacement and with a three-way first stage, three-stage trees with "at
least one" and "exactly one", two-set Venn diagrams filled from totals overlap
first, three-set Venn diagrams filled outward from the triple overlap, and
reading union, "exactly one" and "none" probabilities off a filled diagram).

Tree and Venn Diagrams draws its figures as file-local SVG (`stagedTreeSvg`,
`venn3Svg`) because the C16-widget tree and Venn kinds had not landed. Once
they have, the two-stage fills in `pb-l3-words` (`prob-tree-branches`,
`prob-branch-missing`) and the two-set regions in `pb-l3-venn-two`
(`prob-venn-regions-table`) can move onto them; the three-stage trees and
three-set diagrams stay as pictures unless the widgets grow a third stage or
set.

Needs: Conditional Probability (P(A | B) = P(A ∩ B) / P(B),
conditional branches on a tree, reading it off a Venn diagram, testing
independence with P(A | B) = P(A)); Arrangements (ordered and unordered
selections, nPr and nCr as probabilities, repeated letters, pointing at
`be-l2-ncr` rather than re-teaching it); Discrete Random Variables
(probability distributions as tables, a missing probability, E(X) and Var(X),
the cumulative function); Expectation in Games (fair games, expected winnings,
comparing strategies by expected value).
