 Plano: Substituir Dependabot por Renovate Bot via Dagger          
                                      
 Context                             

 O Dependabot gera múltiplos PRs simultâneos que ficam stale quando o primeiro
 mergeia, causando re-runs desnecessários de CI. A solução adotada é o Renovate
 Bot, que oferece automerge inteligente, agrupamento semântico por
 categoria/risco, e Dependency Dashboard para visibilidade. A execução via Dagger
 mantém portabilidade para outras plataformas (GitLab, Jenkins), substituindo a
 dependência do Dependabot que é GitHub-only.

 Automerge matrix acordada:

 ┌──────────┬───────┬───────┬────────────────────┐
 │          │ patch │ minor │       major        │
 ├──────────┼───────┼───────┼────────────────────┤
 │ devDeps  │ auto  │ auto  │ manual (Dashboard) │
 ├──────────┼───────┼───────┼────────────────────┤
 │ prodDeps │ auto  │ auto  │ manual (Dashboard) │
 └──────────┴───────┴───────┴────────────────────┘

 ---
 Pré-requisito manual (antes de executar)

 Criar um GitHub Personal Access Token (PAT clássico) com escopos:
 - repo (contents write + pull-requests write)
 - issues:write (para o Dependency Dashboard)

 Salvar como secret RENOVATE_TOKEN em: Settings → Secrets and variables → Actions
 → New repository secret.

 ▎ O GITHUB_TOKEN padrão não funciona: PRs criados por ele não disparam workflows
 ▎ de CI (restrição de segurança do GitHub).

 ---
 Arquivos a modificar

 ┌──────────────────────────────────────┬──────────────────────────────────────────────────┐
 │               Arquivo                │                    Operação                      │
 ├──────────────────────────────────────┼──────────────────────────────────────────────────┤
 │ ci/src/index.ts                      │ Adicionar função renovate() + migrar .from()     │
 ├──────────────────────────────────────┼──────────────────────────────────────────────────┤
 │ ci/utils/src/index.ts                │ Importar NODE_ALPINE_DISTRIBUTION de images.ts   │
 ├──────────────────────────────────────┼──────────────────────────────────────────────────┤
 │ .github/workflows/pr_commit_lint.yml │ Remover condicional de autoria (dependabot[bot]) │
 ├──────────────────────────────────────┼──────────────────────────────────────────────────┤
 │ .github/dependabot.yml               │ Remover (Renovate cobre tudo)                    │
 └──────────────────────────────────────┴──────────────────────────────────────────────────┘

 Arquivos a criar

 ┌────────────────────────────────┬────────────────────────────────────────┐
 │            Arquivo             │               Descrição                │
 ├────────────────────────────────┼────────────────────────────────────────┤
 │ renovate.json                  │ Config do Renovate na raiz do repo     │
 ├────────────────────────────────┼────────────────────────────────────────┤
 │ .github/workflows/renovate.yml │ Workflow agendado que dispara o Dagger │
 ├────────────────────────────────┼────────────────────────────────────────┤
 │ ci/src/images.ts               │ Imagens do módulo CI com digest pinning│
 ├────────────────────────────────┼────────────────────────────────────────┤
 │ ci/utils/src/images.ts         │ Distribuição Alpine do Node            │
 └────────────────────────────────┴────────────────────────────────────────┘

 ---
 Implementação

 1. ci/src/images.ts e ci/utils/src/images.ts — Centralizar imagens com digest pinning

 Obter os digests das imagens atuais (rodar localmente):
 docker pull semgrep/semgrep && docker inspect semgrep/semgrep --format '{{index .RepoDigests 0}}'
 docker pull trufflesecurity/trufflehog:3.94.3 && docker inspect trufflesecurity/trufflehog:3.94.3 --format '{{index .RepoDigests 0}}'
 docker pull ghcr.io/renovatebot/renovate:latest && docker inspect ghcr.io/renovatebot/renovate:latest --format '{{index .RepoDigests 0}}'

 ci/src/images.ts:
 export const IMAGES = {
   semgrep:    "semgrep/semgrep@sha256:<digest-semgrep>",
   trufflehog: "trufflesecurity/trufflehog@sha256:<digest-trufflehog>",
   renovate:   "ghcr.io/renovatebot/renovate@sha256:<digest-renovate>",
 } as const

 ci/utils/src/images.ts:
 // renovate: datasource=docker depName=node
 export const NODE_ALPINE_DISTRIBUTION = "alpine3.23"

 ▎ Digest pinning garante imutabilidade — uma tag pode ser sobrescrita no registry,
 ▎ um digest não. O Renovate atualiza os digests automaticamente via customManagers.

 2. ci/src/index.ts — Adicionar import de Secret, IMAGES e função renovate

 Adicionar Secret e import de IMAGES:
 import { argument, check, dag, type Directory, type Secret, object, func } from
 "@dagger.io/dagger";
 import { IMAGES } from "./images";

 Migrar todas as chamadas .from() hardcoded para usar IMAGES:
 - semgrep/semgrep           → IMAGES.semgrep
 - trufflesecurity/trufflehog:3.94.3 → IMAGES.trufflehog

 Adicionar método ao final da classe CiModule, antes do fechamento }:
 @func()
 async renovate(token: Secret, repository: string): Promise<void> {
   await dag.container()
     .from(IMAGES.renovate)
     .withSecretVariable("RENOVATE_TOKEN", token)
     .withEnvVariable("RENOVATE_REPOSITORIES", repository)
     .withExec([])
     .sync()
 }

 ▎ Renovate clona o repo via token — não precisa montar this.source.

 3. ci/utils/src/index.ts — Importar NODE_ALPINE_DISTRIBUTION

 Adicionar import no topo do arquivo:
 import { NODE_ALPINE_DISTRIBUTION } from "./images";

 Substituir o valor padrão do parâmetro da função nodeContainer:
 async nodeContainer(distribution = NODE_ALPINE_DISTRIBUTION): Promise<Container> {

 4. renovate.json — Config na raiz do repo

 {
   "$schema": "https://docs.renovatebot.com/renovate-schema.json",
   "extends": ["config:recommended"],
   "dependencyDashboard": true,
   "schedule": ["before 8am on Monday"],
   "prConcurrentLimit": 3,
   "commitMessage": "🏗️ build(deps): update {{{depName}}} from {{{currentVersion}}} to {{{newVersion}}}",
   "customManagers": [
     {
       "customType": "regex",
       "fileMatch": ["^ci/src/images\\.ts$"],
       "matchStrings": ["\"(?<depName>[^@\"]+)@sha256:(?<currentDigest>[a-f0-9]+)\""],
       "datasourceTemplate": "docker",
       "versioningTemplate": "docker"
     },
     {
       "customType": "regex",
       "fileMatch": ["^ci/utils/src/images\\.ts$"],
       "matchStrings": ["// renovate: datasource=(?<datasource>[a-z-]+) depName=(?<depName>[^\\n]+)\\nexport const \\w+ = \"(?<currentValue>[^\"]+)\""],
       "versioningTemplate": "docker"
     }
   ],
   "packageRules": [
     {
       "matchUpdateTypes": ["patch", "minor"],
       "automerge": true
     },
     {
       "matchUpdateTypes": ["major"],
       "automerge": false,
       "dependencyDashboardApproval": true
     },
     {
       "groupName": "react",
       "matchPackageNames": ["react", "react-dom", "@types/react", "@types/react-dom"],
       "prTitle": "🏗️ build(deps): update react packages"
     },
     {
       "matchFileNames": ["ci/src/images.ts"],
       "automerge": false,
       "dependencyDashboardApproval": true,
       "description": "Imagens de segurança (semgrep, trufflehog) requerem aprovação manual"
     }
   ]
 }

 5. .github/workflows/renovate.yml — Workflow agendado

 name: Renovate

 on:
   schedule:
     - cron: '0 6 * * 1'
   workflow_dispatch:

 jobs:
   renovate:
     name: "Renovate"
     runs-on: ubuntu-24.04
     timeout-minutes: 30
     permissions:
       contents: write
       pull-requests: write
       issues: write

     runs-on: ubuntu-24.04
     runs-on: ubuntu-24.04
     timeout-minutes: 30
     permissions:
       contents: write
       pull-requests: write
       issues: write

     steps:
       - name: Checkout
         uses: actions/checkout@de0fac2e4500dabe0009e67214ff5f5447ce83dd #v6.0.2

       - name: Run Renovate
         uses: dagger/dagger-for-github@27b130bf0f79a7f6fbbbe0fbca6760dc9bb40a77 # v8.4.1
         with:
           version: "latest"
           verb: call
           args: renovate --token=env:RENOVATE_TOKEN --repository=${{ github.repository }}
         env:
           RENOVATE_TOKEN: ${{ secrets.RENOVATE_TOKEN }}

 6. .github/workflows/pr_commit_lint.yml — Remover condicional de autoria

 Remover a linha 15:
 if: github.actor != 'dependabot[bot]'

 O job passa a rodar sem restrição de autor — Renovate terá seus commits validados
 normalmente pelo commitlint.

 7. .github/dependabot.yml — Remover

 Deletar o arquivo. Renovate cobre npm e github-actions nativamente via config:recommended.

 ---
 Verificação

 1. TypeScript compila: pnpm check-types na raiz — sem erros no ci/src/index.ts
 2. Dagger function existe: dagger functions lista renovate no output
 3. Workflow aparece: Actions tab no GitHub mostra "Renovate" com trigger manual disponível
 4. Dispatch manual: Executar "Run workflow" no GitHub → verificar que o Dagger container sobe e o Renovate roda
 5. Dependency Dashboard: Após primeira execução, confirmar que uma Issue "Dependency Dashboard" foi criada no repo
 6. Automerge flow: Em um PR de patch criado pelo Renovate, verificar que após CI passar o merge acontece automaticamente