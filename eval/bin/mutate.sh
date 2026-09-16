#!/usr/bin/env bash
# Prove a guard fails against the old code, mechanically.
#
# PREFLIGHT.md says "prove a new guard fails against the old code before
# keeping it" — a rule that existed in a prior task's context and did not
# fire: that task's own scratch oracle grew an unauthorised tolerance that
# turned 13 genuine disagreements into 0, and the rule caught nothing because
# nothing ran it. This script makes the rule a check: it mutates one file,
# runs one command against the mutation, restores the file on every exit
# path, and reports whether the command still passed.
#
# Usage: eval/bin/mutate.sh <file> <sed-expression> -- <command> [args...]
#   <file>           path relative to the repository root
#   <sed-expression>  a GNU sed -e expression, applied with `sed -i`
#   <command>         the check to run against the mutated file
#
# Exit codes:
#   0  mutant killed    — the command failed with the file mutated (good: the
#                         guard caught the mutation)
#   1  MUTANT SURVIVED  — the command passed with the file mutated (bad: the
#                         guard is blind to it)
#   2  harness error    — the file was not clean before mutating, or the sed
#                         expression matched nothing
#
# Requires GNU sed (tested against 4.9); a BSD sed's -i takes a different
# argument form and this script does not detect that.
#
# Example (kill — the suite catches a perturbed answer):
#   eval/bin/mutate.sh src/content/generators/differentiation.ts \
#     "s/answer: termAnswer(-a \* n, -(n + 1)),$/answer: termAnswer(a * n, -(n + 1)),/" \
#     -- npx vitest run src/content/generators/generators.test.ts -t 'df-index-form'
#
# Example (survive — a guard blind to a domain flip):
#   eval/bin/mutate.sh src/content/generators/differentiation.ts \
#     "/id: 'df-index-form'/,/id: 'df-chain-root'/ s/domain: 'positive'/domain: 'real'/" \
#     -- npx vitest run src/content/generators/generators.test.ts -t 'df-index-form'
set -uo pipefail

if [ "$#" -lt 4 ] || [ "$1" = "--" ] || [ "$2" = "--" ]; then
  echo "usage: mutate.sh <file> <sed-expression> -- <command> [args...]" >&2
  exit 2
fi

file="$1"
expr="$2"
shift 2

if [ "$1" != "--" ]; then
  echo "usage: mutate.sh <file> <sed-expression> -- <command> [args...]" >&2
  exit 2
fi
shift

REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$REPO"

# `git diff --quiet` exits 0 for a nonexistent or untracked path too, which is
# the wrong way round for a guard — a mistyped path would sail through this
# check, then fail an empty `cp`, and the EXIT trap would write a 0-byte file
# back at that path. Ruled out explicitly rather than trusted to the diff check.
if [ ! -f "$file" ]; then
  echo "no such file: $file (path is relative to $REPO)" >&2
  exit 2
fi
if ! git ls-files --error-unmatch -- "$file" >/dev/null 2>&1; then
  echo "not tracked: $file" >&2
  exit 2
fi

if ! git diff --quiet -- "$file"; then
  echo "refusing: $file has uncommitted changes — the only change this script may revert is its own" >&2
  exit 2
fi

backup="$(mktemp)"
cp "$file" "$backup"
trap 'cp "$backup" "$file"; rm -f "$backup"' EXIT

if ! sed -i -e "$expr" "$file"; then
  echo "sed failed on '$expr'" >&2
  exit 2
fi

if cmp -s "$backup" "$file"; then
  echo "mutation did not change $file: the sed expression matched nothing" >&2
  exit 2
fi

git --no-pager diff -- "$file"

"$@"
status=$?

if [ "$status" -eq 0 ]; then
  echo "MUTANT SURVIVED: the command passed with $file mutated"
  exit 1
else
  echo "mutant killed: the command exited $status"
  exit 0
fi
