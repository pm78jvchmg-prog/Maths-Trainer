# fix-collide-tiles: a Momentum tiles question with no wrong tile

Status: done
Branch: `claude/roadmap-c21-forces-l5-1qzcnm`

`generators.test.ts > force-collide-tiles > renders a well-formed slide for
every seed` failed on main after C21-l5 (#160): some draws offered a bank
holding the answer's tiles and nothing else.

- An unknown velocity after of zero let any tile stand as the mass beside it,
  so `soleExtras` refused every distractor. `force-collide-tiles` now draws
  only collisions where neither velocity after is zero.
- `soleExtras` tops the bank up with near misses of the answer's own numbers
  (one or two either side, spelled for their blank) whenever the named slips
  leave fewer than two, which also covers the rare `force-impulse-ij-tiles`
  draw that had none.
