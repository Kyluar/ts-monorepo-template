#!/usr/bin/env sh
set -e

local_sha="$1"
remote_sha="$2"

if [ -z "$remote_sha" ] || [ "$remote_sha" = "0000000000000000000000000000000000000000" ]; then
  base=$(git merge-base "$local_sha" origin/HEAD 2>/dev/null) || true
  if [ -n "$base" ]; then
    trufflehog git file://. --since-commit "$base" --results=verified,unknown --fail
  else
    trufflehog git file://. --results=verified,unknown --fail
  fi
else
  trufflehog git file://. --since-commit "$remote_sha" --results=verified,unknown --fail
fi
