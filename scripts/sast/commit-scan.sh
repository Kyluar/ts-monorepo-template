#!/usr/bin/env sh
set -e

REPO_ROOT=$(git rev-parse --show-toplevel)
staged_files=$(git diff --cached --name-only --diff-filter=d)
[ -z "$staged_files" ] && exit 0

rules=""
while IFS= read -r rule; do
  [ -n "$rule" ] && rules="$rules --config p/$rule"
done < "$REPO_ROOT/config/semgrep-rules.txt"

file_args=$(echo "$staged_files" | tr '\n' ' ')

MSYS_NO_PATHCONV=1 docker run --rm \
  -v "$REPO_ROOT:/src" \
  -w /src \
  semgrep/semgrep \
  sh -c "semgrep scan --error$rules $file_args"
