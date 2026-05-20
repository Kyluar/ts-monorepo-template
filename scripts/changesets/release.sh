#!/usr/bin/env sh
set -e

# Required env vars: RELEASE_TOKEN, REPO_URL

CHANGESET_COUNT=$(find .changeset -name "*.md" ! -name "README.md" | wc -l)

if [ "$CHANGESET_COUNT" -gt "0" ]; then
  ORIGIN="https://x-token-auth:$RELEASE_TOKEN@${REPO_URL#https://}"
  pnpm changeset version
  git add .
  git commit --no-verify -m "🔖 chore(release): version packages"
  git push --no-verify "$ORIGIN" main
  pnpm changeset tag
  git push --no-verify "$ORIGIN" --tags
fi
