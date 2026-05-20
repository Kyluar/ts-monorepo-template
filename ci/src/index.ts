import {
  argument,
  check,
  dag,
  type Directory,
  type File,
  type Secret,
  object,
  func
} from "@dagger.io/dagger";

import { ICiModule } from "./interfaces";
import { IMAGES } from "./images"
import { RENOVATE_ALLOWED_COMMANDS } from "./renovate";

@object()
export class CiModule implements ICiModule {

  source: Directory

  /**
   * Main module with CI functions
   * @param source path of the monorepo's root 
   */
  constructor(
    @argument({ 
      defaultPath: ".", ignore: ["**/.next", "**/node_modules", "**/.turbo", "**/dist", "**/coverage"] 
    })
    source: Directory
  ){
    this.source = source
  }

  @func()
  @check()
  async codeQuality(): Promise<void> {
    dag.utils({source: this.source}).baseEnvironment()
      .withExec(["pnpm", "turbo", "run", "lint", "check-types"])
      .sync();
  }

  @func()
  @check()
  async buildProject(): Promise<void> {
    dag.utils({source: this.source}).baseEnvironment()
      .withExec(["pnpm", "turbo", "run", "build"])
      .sync();
  }

  @func()
  async semgrepScan(sinceCommit: string = "HEAD~1"): Promise<File> {
    const rulesContent = await this.source.file("config/semgrep-rules.txt").contents()
    const rules = rulesContent.trim().split('\n').filter(Boolean)
    const ruleSet = rules.map(str => `--config p/${str}`).join(" ")
    return dag
    .container()
    .from(IMAGES.semgrep)
    .withMountedDirectory("/src", this.source)
    .withWorkdir("/src")
    .withExec(
      ["sh", "-c", `files=$(git diff --name-only --diff-filter=d ${sinceCommit} HEAD); [ -z "$files" ] && printf '{"version":"2.1.0","runs":[{"tool":{"driver":{"name":"Semgrep"}},"results":[]}]}' > /results.sarif && exit 0; semgrep scan --sarif --output /results.sarif ${ruleSet} $files`],
    )
    .file("/results.sarif")
  }

  @func()
  async trufflehogScan(sinceCommit: string = "HEAD~1"): Promise<string> {
    const args = `--since-commit ${sinceCommit} --results=verified,unknown --fail`
    return dag
    .container()
    .from(IMAGES.trufflehog)
    .withMountedDirectory("/src", this.source)
    .withWorkdir("/src")
    .withExec(
      ["sh", "-c", `trufflehog git file://. ${args}`],
    ).stderr()
  }

  @func()
  async fastTests(): Promise<Directory> {
    return dag.utils({source: this.source}).baseEnvironment()
      .withExec(["sh", "-c", "pnpm --filter=@repo/vitest-config build"])
      .withExec(["pnpm", "test:coverage"])
      .directory("/app/coverage")
  }

  @func()
  async e2eTests(smoke:boolean=false): Promise<Directory> {
    const cmd = smoke ? "test:e2e:smoke" : "test:e2e"
    const container = dag.utils({source: this.source}).testEnvironment()
      .withExec(["sh", "-c", `pnpm turbo ${cmd}`])

    return dag.utils({source: this.source}).collectPlaywrightReports(container)
  }

  @func()
  async commitlintMessage(message:string): Promise<string> {
    return await dag.utils({source: this.source}).baseEnvironment()
      .withExec(["sh", "-c", `echo "${message}" | pnpm commitlint --verbose`])
      .stdout()
  }
  
  @func()
  async commitlintRange(from: string, to: string = "HEAD"): Promise<string> {
    return await dag.utils({source: this.source}).baseEnvironment()
      .withExec(["pnpm", "commitlint", "--from", from, "--to", to, "--verbose"])
      .stdout()
  }

  @func()
  async renovate(token: Secret, repository: string, dryRun = false, gitAuthor: Secret, platform = "github", endpoint = "", username: string): Promise<void> {
    const author = await gitAuthor.plaintext()
    let base = dag.container()
      .from(IMAGES.renovate)
      .withSecretVariable("RENOVATE_TOKEN", token)
      .withEnvVariable("RENOVATE_USERNAME", username)
      .withEnvVariable("RENOVATE_REPOSITORIES", repository)
      .withEnvVariable("RENOVATE_GIT_AUTHOR", author)
      .withEnvVariable("RENOVATE_PLATFORM", platform)

    if (endpoint) base = base.withEnvVariable("RENOVATE_ENDPOINT", endpoint)
    if (dryRun) base = base.withEnvVariable("RENOVATE_DRY_RUN", "full")

    base = base.withEnvVariable("RENOVATE_ALLOWED_COMMANDS", JSON.stringify([...RENOVATE_ALLOWED_COMMANDS]))

    await base
      .withExec([])
      .sync()
  }

  @func()
  async buildAndPublishApp(app: string, ttl: string = '1h'): Promise<string> {
    const dockerfile = `/apps/${app}/Dockerfile`
    const dockerfileExists = await this.source.exists(dockerfile)

    if(!dockerfileExists) throw new Error(`Dockerfile not found on ${dockerfile}`)

    const head = this.source.asGit().head()
    const branch = (await head.ref()).replace('refs/heads/', '')
    const commitId = (await head.commit()).substring(0,7)
    const imageName = `${branch}-${app}-${commitId}`

    const image = dag.utils({source: this.source}).buildImage(dockerfile)
    return dag.utils({source: this.source}).ttlShPublish(image, imageName, ttl)
  }

  @func()
  async release(
    token: Secret,
    repoUrl: string,
    gitAuthorName: string = "forgejo-actions",
    gitAuthorEmail: string = "forgejo-actions@noreply.codeberg.org"
  ): Promise<void> {
    await dag.utils({ source: this.source })
      .baseEnvironment()
      .withSecretVariable("RELEASE_TOKEN", token)
      .withEnvVariable("REPO_URL", repoUrl)
      .withExec(["git", "config", "user.name", gitAuthorName])
      .withExec(["git", "config", "user.email", gitAuthorEmail])
      .withExec(["sh", "scripts/changesets/release.sh"])
      .sync()
  }

  @func()
  async publishVersionedApp(tag: string, ttl: string = '24h'): Promise<string> {
    const [app, version] = tag.split('@')
    const dockerfile = `/apps/${app}/Dockerfile`
    const dockerfileExists = await this.source.exists(dockerfile)
    if (!dockerfileExists) throw new Error(`Dockerfile not found on ${dockerfile}`)
    const image = dag.utils({source: this.source}).buildImage(dockerfile)
    return image.publish(`ttl.sh/${app}-${version}:${ttl}`)
  }
}
