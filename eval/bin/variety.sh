#!/usr/bin/env bash
# How repetitive each lesson's guided deck is, and which skill-check and
# level-check questions ask a family the deck never practised.
#
# A report, deliberately not a gate: at the time of writing 83 of 105 lessons
# lean on one generator family for 70% or more of their questions, and the
# owner has chosen to fix that course by course. This is what makes the rest
# a measured backlog rather than a number that lives in one conversation.
#
# Usage: eval/bin/variety.sh [--course <course id>] [--threshold 0.7] [--min 5]
# Exit codes: 0 report printed / 2 harness error, or nothing to measure.
set -uo pipefail
REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
exec npx vite-node "$REPO/eval/bin/variety.ts" "$@"
