#!/usr/bin/env bash
# Called by .github/workflows/stuck-builds.yml; the header there explains why
# it only ever re-kicks one pull request, and only when nothing is building.
#
# Needs GH_REPO, gh authenticated (GH_TOKEN), and optionally STALL_SECONDS
# (default 1200), DRY_RUN=true to report without pushing.
set -euo pipefail

stall=${STALL_SECONDS:-1200}
dry_run=${DRY_RUN:-false}
check_name='Workers Builds: maths-trainer'
# NOW exists only to rehearse a stall locally.
now=${NOW:-$(date +%s)}

# Heads worth looking at: main, every open pull request, and the pull requests
# updated most recently whatever their state, since a landed one keeps its
# build on its own head (main's merge commit carries no Cloudflare check).
open_prs=$(gh api "repos/$GH_REPO/pulls?state=open&per_page=100" \
  --jq '.[] | "\(.number) \(.draft) \(.head.sha) \(.head.ref)"')
recent_heads=$(gh api "repos/$GH_REPO/pulls?state=all&sort=updated&direction=desc&per_page=30" \
  --jq '.[].head.sha')
main_head=$(gh api "repos/$GH_REPO/commits/main" --jq .sha)
heads=$(printf '%s\n%s\n%s\n' "$main_head" "$(awk '{print $3}' <<<"$open_prs")" "$recent_heads" \
  | grep -E '^[0-9a-f]{40}$' | sort -u)

# 1. Is Cloudflare alive? The newest moment any of its runs started or finished.
latest=0
latest_sha=''
for sha in $heads; do
  t=$(gh api "repos/$GH_REPO/commits/$sha/check-runs?per_page=100" --jq "
    [.check_runs[] | select(.name == \"$check_name\")
     | (.completed_at // .started_at) | select(. != null) | fromdateiso8601] | max // 0") || {
    # Unsure is not stalled: pushing on a guess is what this job must not do.
    echo "::warning::could not read the check runs on ${sha:0:7}; doing nothing this run"
    exit 0
  }
  if [ "$t" -gt "$latest" ]; then latest=$t; latest_sha=$sha; fi
done
if [ "$latest" -gt 0 ] && [ $((now - latest)) -lt "$stall" ]; then
  echo "Cloudflare is building: a run on ${latest_sha:0:7} moved $(( (now - latest) / 60 )) minutes ago" \
    "(threshold $((stall / 60))). Queued pull requests are just waiting their turn; touching nothing."
  exit 0
fi
if [ "$latest" -gt 0 ]; then
  echo "No Cloudflare run has started or finished for $(( (now - latest) / 60 )) minutes (last on ${latest_sha:0:7})."
else
  echo "No Cloudflare run found on any recent head."
fi

# 2. The oldest open, non-draft pull request whose head has only a queued
#    Cloudflare suite, queued for longer than the threshold.
oldest_pr='' oldest_sha='' oldest_branch='' oldest_since=$now
while read -r pr draft sha branch; do
  [ -n "${pr:-}" ] && [ "$draft" = false ] || continue
  since=$(gh api "repos/$GH_REPO/commits/$sha/check-suites" --jq '
    [.check_suites[] | select(.app.slug == "cloudflare-workers-and-pages")] as $cf
    | if ($cf | length) > 0 and all($cf[]; .status == "queued" and .latest_check_runs_count == 0)
      then ($cf | map(.created_at | fromdateiso8601) | min) else empty end') || continue
  [ -n "$since" ] || continue
  echo "#$pr: ${sha:0:7} queued for $(( (now - since) / 60 )) minutes"
  if [ $((now - since)) -ge "$stall" ] && [ "$since" -lt "$oldest_since" ]; then
    oldest_pr=$pr oldest_sha=$sha oldest_branch=$branch oldest_since=$since
  fi
done <<<"$open_prs"

if [ -z "$oldest_pr" ]; then
  echo "No open pull request has been queued for $((stall / 60)) minutes; nothing to do."
  exit 0
fi
echo "Stalled: re-kicking only the oldest, #$oldest_pr (${oldest_sha:0:7}, queued $(( (now - oldest_since) / 60 )) minutes)."
if [ "$dry_run" = true ]; then
  echo "Dry run: would merge main into #$oldest_pr and start Fast checks on $oldest_branch."
  exit 0
fi

if ! gh api -X PUT "repos/$GH_REPO/pulls/$oldest_pr/update-branch" -f expected_head_sha="$oldest_sha" >/dev/null; then
  echo "::warning::#$oldest_pr: could not update the branch (see the message above); push to it by hand"
  exit 0
fi
echo "#$oldest_pr: merged main in, so the new head gets a build"
# The update is accepted before it is made, so wait for the head to move:
# dispatched any sooner, the checks would run on the old one.
head=$oldest_sha
for _ in $(seq 1 30); do
  sleep 2
  head=$(gh api "repos/$GH_REPO/pulls/$oldest_pr" --jq .head.sha) || head=$oldest_sha
  if [ "$head" != "$oldest_sha" ]; then break; fi
done
if [ "$head" = "$oldest_sha" ]; then
  echo "::warning::#$oldest_pr: the head has not moved yet; run Checks on $oldest_branch by hand"
elif gh workflow run checks.yml --ref "$oldest_branch" </dev/null; then
  echo "#$oldest_pr: started Fast checks on $oldest_branch for ${head:0:7}"
else
  echo "::warning::#$oldest_pr: could not start Fast checks (see the message above); run Checks on $oldest_branch by hand"
fi
