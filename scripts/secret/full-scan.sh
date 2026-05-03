#!/usr/bin/env sh
set -e

REPO_ROOT=$(git rev-parse --show-toplevel)

git -C "$REPO_ROOT" ls-files -z | xargs -0 trufflehog filesystem --no-update --results=verified,unknown --fail
