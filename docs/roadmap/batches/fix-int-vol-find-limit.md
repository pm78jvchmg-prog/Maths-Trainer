# Fix: int-vol-find-limit

Status: claimed
Branch: `claude/fix-int-vol-find-limit-arccyy`

The worked solution of `int-vol-find-limit` (Integration, Volumes of Revolution) glues `\pi` to the letter `h`, giving TeX like `25\pih`, which KaTeX reads as an unknown command and prints red under Show me (246 of 400 draws on main). Nothing rendered `solution()` text, so no test saw it.
