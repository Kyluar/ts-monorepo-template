#!/usr/bin/env sh
set -e

REPO_ROOT=$(git rev-parse --show-toplevel)

rules=""
while IFS= read -r rule; do
  [ -n "$rule" ] && rules="$rules --config p/$rule"
done < "$REPO_ROOT/config/semgrep-rules.txt"

MSYS_NO_PATHCONV=1 docker run --rm \
  -v "$REPO_ROOT:/src" \
  -w /src \
  semgrep/semgrep \
  sh -c "semgrep scan --error$rules ."
