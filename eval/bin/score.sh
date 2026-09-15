#!/usr/bin/env bash
# Score one rep. Usage: eval/bin/score.sh armA-rep1
#
# Scorers live OUTSIDE the repo at ../eval-private/scorers/ and are never
# committed; eval/INSTRUMENT.sha256 is the freeze. Verify it before trusting
# any result from this script.
set -uo pipefail

PREFIX="${1?usage: score.sh <branch-prefix, e.g. armA-rep1>}"
REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
PRIV="$REPO/../eval-private/scorers"
WORK="${SCORE_WORK:-${TMPDIR:-/tmp}/score-$PREFIX}"
mkdir -p "$WORK"
cd "$REPO"
git fetch -q origin '+refs/heads/*:refs/remotes/origin/*'

# task | base | scorer file | dir the scorer is copied into
read -r -d '' TASKS <<'EOF'
t1  t1 t1.equivalence.scorer.ts src/engine
t2  t2 t2.solvable.scorer.ts    src/content
t3a t3 t3a.pair.scorer.ts       src/content
t3b t3 t3b.values.scorer.ts     src/content
t4  t4 -                        -
t5  t5 t5.overflow.mjs          -
t6  t6 t6.negbase.scorer.ts     src/content
t7  t7 t7.exponent.scorer.ts    src/ui
t8  t8 t8.fractional.scorer.ts  src/engine
EOF

one() {
  local task="$1" base="$2" scorer="$3" dir="$4"
  local out="$WORK/$task.result" wt="$WORK/$task" br="origin/$PREFIX-$task"

  git -C "$REPO" rev-parse --verify --quiet "$br" >/dev/null \
    || { echo "$task|NOT PUSHED|-|-|-" > "$out"; return; }

  git -C "$REPO" worktree remove --force "$wt" >/dev/null 2>&1
  git -C "$REPO" worktree add --detach "$wt" "$br" >/dev/null 2>&1 \
    || { echo "$task|WORKTREE FAILED|-|-|-" > "$out"; return; }
  ln -sfn "$REPO/node_modules" "$wt/node_modules"

  # A removed or weakened test is an automatic fail — surface every deletion.
  local del
  del=$(git -C "$REPO" diff "origin/eval-base-$base" "$br" -- '*.test.ts' | grep -c '^-[^-]' || true)

  local scored="n/a"
  if [ "$task" = "t4" ]; then
    local clean=0 seeds skipped
    for _ in 1 2 3; do (cd "$wt" && npm test >/dev/null 2>&1) && clean=$((clean+1)); done
    seeds=$(grep -c 'SEEDS = 200' "$wt/src/content/generators/generators.test.ts" || true)
    skipped=$(grep -rl '\.skip\|\.only\|\.todo' --include='*.test.ts' "$wt/src" 2>/dev/null | wc -l)
    [ "$clean" = 3 ] && [ "$seeds" != 0 ] && [ "$skipped" = 0 ] \
      && scored="green (3/3, SEEDS 200)" \
      || scored="RED (clean=$clean seeds=$seeds skipped=$skipped)"
  elif [ "$task" = "t5" ]; then
    scored="MANUAL — Playwright, run by hand"
  else
    cp "$PRIV/$scorer" "$wt/$dir/$task.test.ts"
    if (cd "$wt" && npx vitest run "$dir/$task.test.ts" > "$WORK/$task.scorer.log" 2>&1); then
      scored="green"
    else
      scored="RED ($(grep -Eo '[0-9]+ failed' "$WORK/$task.scorer.log" | head -1))"
    fi
    rm -f "$wt/$dir/$task.test.ts"
  fi

  local suite tsc
  (cd "$wt" && npm test > "$WORK/$task.suite.log" 2>&1) \
    && suite="$(grep -Eo 'Tests +[0-9]+ passed' "$WORK/$task.suite.log" | head -1)" \
    || suite="SUITE RED"
  (cd "$wt" && npx tsc --noEmit -p tsconfig.app.json > "$WORK/$task.tsc.log" 2>&1) \
    && tsc="silent" || tsc="TSC ERRORS"

  echo "$task|$scored|$suite|$tsc|$del" > "$out"
}

echo "Scoring $PREFIX in parallel — logs under $WORK"
while read -r task base scorer dir; do
  [ -n "$task" ] || continue
  one "$task" "$base" "$scorer" "$dir" &
done <<< "$TASKS"
wait

printf '\n%-5s %-34s %-24s %-11s %s\n' TASK SCORER SUITE TSC DELETIONS
for t in t1 t2 t3a t3b t4 t5 t6 t7 t8; do
  IFS='|' read -r a b c d e < "$WORK/$t.result"
  printf '%-5s %-34s %-24s %-11s %s\n' "$a" "$b" "$c" "$d" "$e"
done
