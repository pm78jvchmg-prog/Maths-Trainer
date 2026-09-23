# fix-duplicate-tiles: Two tiles that look the same

Status: done
Branch: `claude/fix-duplicate-tiles-3s9uce`

Tile banks mixed `- 8` and `-8`, which TeX draws alike, so a learner saw two identical tiles and only one graded right. A test in generators.test.ts now renders every tile (generated and authored) and fails on two that look the same; eight generators fixed at the source: bin-expand-tiles, lin-words, log-transform-tiles, param-tangent, impl-tangent-tiles, quad-model-fit-abc, fun-inverse-form, and mod-transform-tiles (Inequalities & Modulus, landed meanwhile).
