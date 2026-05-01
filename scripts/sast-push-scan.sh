#!/usr/bin/env sh
set -e

REPO_ROOT=$(git rev-parse --show-toplevel)

rules=""
while IFS= read -r rule; do
  [ -n "$rule" ] && rules="$rules --config p/$rule"
done < "$REPO_ROOT/config/semgrep-rules.txt"

while IFS=' ' read -r local_ref local_sha remote_ref remote_sha; do
  if [ -z "$remote_sha" ] || [ "$remote_sha" = "0000000000000000000000000000000000000000" ]; then
    base=$(git merge-base "$local_sha" origin/HEAD 2>/dev/null) || true
    if [ -n "$base" ]; then
      changed_files=$(git diff --name-only --diff-filter=d "$base" "$local_sha")
    else
      changed_files=$(git diff --name-only --diff-filter=d HEAD)
    fi
  else
    changed_files=$(git diff --name-only --diff-filter=d "$remote_sha" "$local_sha")
  fi

  [ -z "$changed_files" ] && continue

  file_args=$(echo "$changed_files" | tr '\n' ' ')

  MSYS_NO_PATHCONV=1 docker run --rm \
    -v "$REPO_ROOT:/src" \
    -w /src \
    semgrep/semgrep \
    sh -c "semgrep scan --error$rules $file_args"
done
