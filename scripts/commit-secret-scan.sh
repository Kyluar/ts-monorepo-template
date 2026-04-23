#!/usr/bin/env sh
set -e

staged_files=$(git diff --cached --name-only --diff-filter=d)
[ -z "$staged_files" ] && exit 0

echo "$staged_files" | tr '\n' '\0' | xargs -0 trufflehog filesystem --results=verified,unknown --fail
