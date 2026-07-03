#!/usr/bin/env bash
# Build and publish dist/ to the gh-pages branch (incremental history, so
# GitHub Pages deploys diffs instead of rebuilding a disconnected tree).
set -euo pipefail
cd "$(dirname "$0")/.."

npm run build
touch dist/.nojekyll

WORKTREE=.git/gh-pages-worktree
git fetch origin gh-pages 2>/dev/null || true
git worktree remove --force "$WORKTREE" 2>/dev/null || true
if git show-ref --quiet refs/remotes/origin/gh-pages; then
  git worktree add -B gh-pages "$WORKTREE" origin/gh-pages
else
  git worktree add --orphan -b gh-pages "$WORKTREE"
fi

rm -rf "${WORKTREE:?}"/*
cp -R dist/. "$WORKTREE"/
git -C "$WORKTREE" add --all
git -C "$WORKTREE" -c user.name="Nacho2027" -c user.email="ijl27@cornell.edu" \
  commit -m "deploy $(git rev-parse --short HEAD)" || echo "nothing to deploy"
git -C "$WORKTREE" push origin gh-pages
git worktree remove --force "$WORKTREE"
echo "deployed"
