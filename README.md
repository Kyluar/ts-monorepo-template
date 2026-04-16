[![Commitizen friendly](https://img.shields.io/badge/commitizen-friendly-brightgreen.svg)](http://commitizen.github.io/cz-cli/)
[![Node >=24](https://img.shields.io/badge/node-%3E%3D24-brightgreen)](https://nodejs.org/)
[![pnpm 10.33.0](https://img.shields.io/badge/pnpm-10.33.0-blue)](https://pnpm.io/)

# ts-monorepo-template

Template de base para aplicações web — monorepo pnpm + Turborepo com Next.js, testes (Vitest + Playwright), CI via Dagger e qualidade de código com Biome. Pronto para começar com XP: TDD, trunk-based git e commits convencionais.

## Visão geral

Este template inclui, de saída:

- **Next.js 16** (App Router, React 19, TypeScript strict) em `apps/web`
- **Biblioteca de componentes** compartilhada em `packages/ui` (`@repo/ui`)
- **Testes unitários/integração** com Vitest + Testing Library (`happy-dom`)
- **Testes E2E** com Playwright em `apps/web-e2e` (Chromium, Firefox, WebKit)
- **Cobertura** de testes com `@vitest/coverage-v8`
- **Biome** como linter e formatter (substitui ESLint + Prettier)
- **Husky** com hooks `pre-commit` (lint-staged), `commit-msg` (commitlint) e `pre-push` (build)
- **Commits** no formato gitmoji conventional (enforced via commitizen + commitlint)
- **CI** com GitHub Actions + Dagger: qualidade de código, build, commitlint, cobertura e E2E

## Pré-requisitos

| Ferramenta | Versão mínima |
|---|---|
| Node.js | `>= 24.0.0` |
| pnpm | `10.33.0` |

> Instale o pnpm com `corepack enable && corepack prepare pnpm@10.33.0 --activate`.

## Instalação e execução local

```sh
# Clone o repositório
git clone <url-do-repo>
cd ts-monorepo-template

# Instale as dependências
pnpm install

# Inicie o servidor de desenvolvimento
pnpm dev
```

O app `web` estará disponível em `http://localhost:3000`.

Para rodar apenas o frontend:

```sh
pnpm turbo dev --filter=web
```

## Comandos principais

### Desenvolvimento

```sh
pnpm dev              # inicia todos os apps
pnpm build            # build de todos os pacotes/apps
```

### Testes unitários e integração

```sh
pnpm test             # executa todos os testes uma vez
pnpm test:watch       # modo watch
pnpm test:coverage    # executa com relatório de cobertura em /coverage

# Testar um projeto específico
pnpm vitest run --project=web
pnpm vitest run --project=@repo/ui
```

### Testes E2E (Playwright)

Execute a partir de `apps/web-e2e/`:

```sh
pnpm test:e2e         # suite completa (todos os browsers)
pnpm test:e2e:smoke   # smoke em Chromium
pnpm report           # abre o último relatório HTML
```

> O Playwright auto-inicia `pnpm --filter=web start` antes dos testes quando fora do CI. Exige que o build de `web` já tenha sido executado.

### Qualidade

```sh
pnpm lint             # biome ci em todos os pacotes
pnpm check-types      # tsc --noEmit em todos os pacotes
pnpm format           # biome format --write (auto-correção)
```

### Commits

```sh
pnpm commit           # assistente interativo gitmoji conventional (commitizen)
```

## Qualidade e convenções

### Biome

Substitui ESLint e Prettier. Configuração compartilhada em `packages/biome-config`. Largura de linha: 120, indentação: 2 espaços, regras recomendadas ativas.

### Husky hooks

| Hook | O que faz |
|---|---|
| `pre-commit` | `lint-staged` — Biome check + write nos arquivos staged |
| `commit-msg` | `commitlint` com config gitmoji — rejeita commits fora do padrão |
| `pre-push` | `turbo run build` — bloqueia o push se o build falhar |

### Formato de commits

Commits seguem o padrão **gitmoji conventional**: `<emoji> <tipo>(<escopo>): <descrição>`.

Use `pnpm commit` para o assistente interativo ou escreva manualmente seguindo o padrão.

## CI

Cinco workflows em `.github/workflows/`, todos executados via **Dagger**:

| Workflow | Trigger | O que faz |
|---|---|---|
| `check.yml` | push/PR para `main`/`develop` | Qualidade de código + build |
| `pr_commit_lint.yml` | PRs para `main`/`develop` | Lint do título e range de commits do PR |
| `coverage.yml` | PRs para `main`/`develop` | Testes com cobertura + upload de resultados |
| `e2e_smoke.yml` | PRs para `develop` | E2E smoke (Chromium) |
| `e2e_full.yml` | PRs para `main` | E2E completo (Chromium + Firefox + WebKit) |
