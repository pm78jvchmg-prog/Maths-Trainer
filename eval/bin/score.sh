#!/usr/bin/env bash
# Score one arm/rep of the eval suite, all tasks in parallel.
#
#   eval/bin/score.sh <suffix>       e.g.  -r3   or  -b1   (rep 1 of arm A is "")
#
# Each task gets its own worktree off origin/eval/tN<suffix>, sharing this
# repo's node_modules by symlink. Scorer, full suite and typecheck run
# concurrently across tasks; the eight suites are the slow part and they no
# longer queue behind each other. Results land in one table at the end.
#
# The scorer file is copied in, run, and DELETED before the full suite, so the
# suite never counts the scorer's own assertions.
set -uo pipefail

SUFFIX="${1?usage: score.sh <suffix, e.g. -r3>}"
REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
WORK="${SCORE_WORK:-${TMPDIR:-/tmp}/score$SUFFIX}"
mkdir -p "$WORK"

cd "$REPO"
git fetch -q origin 'refs/heads/eval/*:refs/remotes/origin/eval/*'

# task → scorer file → directory the scorer is copied into
read -r -d '' TASKS <<'EOF'
1 t1.equivalence.scorer.ts src/engine
2 t2.solvable.scorer.ts    src/content
3 t3.pair.scorer.ts        src/content
4 -                        -
5 t5.overflow.mjs          -
6 t6.negbase.scorer.ts     src/content
7 t7.exponent.scorer.ts    src/ui
8 t8.fractional.scorer.ts  src/engine
EOF

one_task() {
  local n="$1" scorer="$2" dir="$3" out="$WORK/t$n.result"
  local wt="$WORK/t$n" branch="origin/eval/t$n$SUFFIX"

  if ! git -C "$REPO" rev-parse --verify --quiet "$branch" >/dev/null; then
    echo "t$n|NOT PUSHED|-|-|-" > "$out"; return
  fi

  git -C "$REPO" worktree remove --force "$wt" >/dev/null 2>&1
  git -C "$REPO" worktree add --detach "$wt" "$branch" >/dev/null 2>&1 || {
    echo "t$n|WORKTREE FAILED|-|-|-" > "$out"; return
  }
  ln -sfn "$REPO/node_modules" "$wt/node_modules"

  # A deleted or weakened test is an automatic fail, so surface every deletion.
  local deletions
  deletions=$(git -C "$REPO" diff "origin/eval-base-t$n" "$branch" -- '*.test.ts' \
    | grep -c '^-[^-]' || true)

  local scored="n/a"
  if [ "$n" = "4" ]; then
    # Run discipline: three clean suites, SEEDS untouched, nothing skipped.
    local clean=0 seeds skipped
    for _ in 1 2 3; do
      (cd "$wt" && npm test >/dev/null 2>&1) && clean=$((clean + 1))
    done
    seeds=$(grep -c 'SEEDS = 200' "$wt/src/content/generators/generators.test.ts" || true)
    skipped=$(grep -rc '\.skip\|\.only\|\.todo' --include='*.test.ts' "$wt/src" 2>/dev/null | grep -vc ':0$' || true)
    if [ "$clean" = "3" ] && [ "$seeds" != "0" ] && [ "$skipped" = "0" ]; then
      scored="green (3/3, SEEDS 200)"
    else
      scored="RED (clean=$clean seeds=$seeds skipped=$skipped)"
    fi
  elif [ "$n" = "5" ]; then
    scored="SKIPPED — run t5.overflow.mjs by hand (needs a dev server + playwright-core)"
  else
    cp "$REPO/eval/scorers/$scorer" "$wt/$dir/t$n.test.ts"
    if (cd "$wt" && npx vitest run "$dir/t$n.test.ts" > "$WORK/t$n.scorer.log" 2>&1); then
      scored="green"
    else
      scored="RED ($(grep -Eo '[0-9]+ failed' "$WORK/t$n.scorer.log" | head -1))"
    fi
    rm -f "$wt/$dir/t$n.test.ts"
  fi

  local suite tsc
  if (cd "$wt" && npm test > "$WORK/t$n.suite.log" 2>&1); then
    suite="$(grep -Eo 'Tests +[0-9]+ passed' "$WORK/t$n.suite.log" | head -1)"
  else
    suite="SUITE RED"
  fi
  if (cd "$wt" && npx tsc --noEmit -p tsconfig.app.json > "$WORK/t$n.tsc.log" 2>&1); then
    tsc="silent"
  else
    tsc="TSC ERRORS"
  fi

  echo "t$n|$scored|$suite|$tsc|$deletions" > "$out"
}

echo "Scoring '$SUFFIX' in parallel — logs under $WORK"
while read -r n scorer dir; do
  [ -n "$n" ] || continue
  one_task "$n" "$scorer" "$dir" &
done <<< "$TASKS"
wait

printf '\n%-4s %-34s %-24s %-11s %s\n' TASK SCORER SUITE TSC 'TEST-LINE DELETIONS'
for n in 1 2 3 4 5 6 7 8; do
  IFS='|' read -r t s q c d < "$WORK/t$n.result"
  printf '%-4s %-34s %-24s %-11s %s\n' "$t" "$s" "$q" "$c" "$d"
done
echo
echo "Any non-zero deletion count needs reading by hand: git diff origin/eval-base-tN origin/eval/tN$SUFFIX -- '*.test.ts'"
