---
description: Run all three Maths-Trainer reviewers in parallel and merge their reports
---

Launch these subagents **in parallel**, each on the whole repo (or on $ARGUMENTS if given):
- code-reviewer
- maths-content-reviewer
- player-experience-reviewer

When all return:
1. Merge findings into one list sorted by severity; keep each finding's Verified/Suspected label and source agent.
2. Flag any findings that overlap or contradict each other.
3. Do not fix anything. Ask me which findings to act on.
