#!/usr/bin/env bash
# Reconciles a plan's and a report's counted claims (lessons, lesson ids,
# level checks, generators, tests) against the live tree and a captured
# `npx vitest run` log, exiting non-zero on any disagreement and, separately,
# non-zero when a supplied document yielded nothing to check.
#
# Usage:
#   eval/bin/counts.sh <plan.md> [<report.md>] [--suite-log <file>]
#   eval/bin/counts.sh --dump-facts
#
# Exit codes: 0 agree / 1 disagree / 2 nothing to check, or a harness error.
#
# Runs the TypeScript core through `npx vite-node`, cached after first use;
# a failure to fetch it is a non-zero exit, never a silent pass.
#
# Examples:
#   eval/bin/counts.sh eval/plans/TASK5-PLAN.md eval/reports/TASK5-REPORT.md --suite-log /tmp/suite.txt
#   eval/bin/counts.sh --dump-facts
set -uo pipefail

REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
export COUNTS_REPO="$REPO"
exec npx vite-node "$REPO/eval/bin/counts.ts" "$@"
