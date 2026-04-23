# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This repo is a **base template** for future projects. It is a **browser-based** app built as a pnpm + Turborepo monorepo. The team follows XP practices: TDD (write failing tests before implementation), trunk-based git, and gitmoji conventional commits.

## Commands

All commands run from the repo root unless noted.

### Development
```sh
pnpm dev                          # start all apps
pnpm turbo dev --filter=web       # start only the Next.js frontend
```

### Testing (unit/integration)
```sh
pnpm test                         # run all tests once (vitest run)
pnpm test:watch                   # run tests in watch mode
pnpm vitest run --project=web     # run tests for a single project (web or @repo/ui)
```

Tests live in `src/**/*.{test,spec}.{ts,tsx}` in each package. Setup file is `src/test/setup.ts` (imports `@testing-library/jest-dom/vitest`). Environment is `happy-dom` for all React tests.

### Testing (E2E — Playwright)
```sh
# from apps/web-e2e/
pnpm test:e2e                     # run all E2E tests (all browsers)
pnpm test:e2e:smoke               # run smoke suite on Chromium only
pnpm report                       # open last HTML report
```

E2E tests live in `apps/web-e2e/tests/`. `baseURL` is hardcoded to `http://localhost:3000` in `playwright.config.ts`. The config auto-starts `pnpm --filter=web start` before tests when not in CI (reuses an existing server if one is running).

### Testing (Coverage)
```sh
pnpm test:coverage                # run tests with coverage output to /coverage
```

### Build & Quality
```sh
pnpm build                        # build all packages/apps via Turbo
pnpm lint                         # biome ci on all packages
pnpm check-types                  # tsc --noEmit on all packages
pnpm format                       # biome format --write (auto-fix formatting)
```

### Committing
```sh
pnpm commit                       # interactive gitmoji conventional commit (commitizen)
```
Commits must follow gitmoji conventional format — enforced by commitlint on `commit-msg` hook and in CI for PRs. Format: `<emoji> <type>(<scope>): <description>` (e.g. `✨ feat(ui): add Button component`).

### Docker / CI (Dagger)
```sh
make build        # build Docker image via Dagger (reads Node/pnpm versions dynamically)
make up           # create and start containers
make fresh-build  # rebuild without cache
make logs         # tail container logs
make clean        # remove containers and volumes
```

## Git Hooks (Husky)

- `pre-commit`: runs `lint-staged` (biome check+write on staged `*.{js,jsx,ts,tsx,json}`), then `scripts/commit-secret-scan.sh` (TruffleHog on staged files), then `pnpm security:sast` (Semgrep)
- `commit-msg`: runs commitlint with gitmoji config
- `pre-push`: runs TruffleHog on the pushed commit range (`scripts/push-secret-scan.sh`), then `turbo run build test:e2e` — push is blocked if any step fails

## Architecture

### Monorepo Layout

```
apps/
  web/          # Next.js 16 App Router frontend (port 3000)
  web-e2e/      # Playwright E2E tests for apps/web (axe-core for a11y)
packages/
  ui/               # shared React component library (@repo/ui)
  vitest-config/    # shared vitest presets (@repo/vitest-config) — exports baseConfig and reactConfig
  typescript-config/  # shared tsconfig presets
  biome-config/       # shared biome config
ci/             # Dagger CI module (TypeScript)
  src/index.ts  # CI pipelines: codeQuality, buildProject, commitlint, buildAndPublishApp
  utils/        # Dagger utility module (base container, image build, publish)
```

### Frontend (`apps/web`)

- **Next.js 16** with App Router, React 19, TypeScript strict
- Output mode: `standalone` (Docker-optimized, includes trace root at monorepo level)
- Styling: CSS Modules (`*.module.css`)
- Consumes `@repo/ui` via deep imports (e.g. `import { Button } from '@repo/ui/button'`), transpiled via `transpilePackages`

### CI (`ci/`)

- Written in TypeScript using the Dagger SDK (`@dagger.io/dagger`)
- Five GitHub Actions workflows in `.github/workflows/`:
  - `check.yml` — runs `codeQuality` + `buildProject` Dagger checks on PRs to `main`/`develop`
  - `fast-tests.yml` — runs `fastTests` (unit + coverage), uploads coverage artifact (30-day retention)
  - `e2e-tests.yml` — runs full cross-browser E2E tests, uploads Playwright reports on failure
  - `pr_commit_lint.yml` — lints PR title and commit range with commitlint via Dagger
  - `security.yml` — two jobs: Semgrep SAST (`semgrep-scan`) + TruffleHog secret scan (`trufflehog-scan`) on PRs
- The `buildAndPublishApp` function builds a Dockerfile from `apps/<app>/Dockerfile` and publishes to ttl.sh with a tag `<branch>-<app>-<commitId>`

### Tooling

- **Biome** replaces ESLint + Prettier — line width 120, 2-space indent, recommended rules
- **Turbo** orchestrates all tasks; `build` depends on `^build`, `lint`/`check-types` depend on `^lint`/`^check-types`. Non-obvious: `web#check-types` and all `test` tasks explicitly depend on `@repo/vitest-config#build`, so the config package must compile first
- **`@repo/ui` deep imports** work because the package exports `'./*': './src/index.ts'`, allowing `import { Button } from '@repo/ui/button'` to resolve to `packages/ui/src/button.ts`
- **Node ≥ 24**, **pnpm 10.33.0** required (enforced in `package.json#engines`)
