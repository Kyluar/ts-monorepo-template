import { 
  argument, 
  check,
  dag,
  type Directory, 
  object, 
  func 
} from "@dagger.io/dagger";

import { ICiModule } from "./interfaces";

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
  async semgrepScan(): Promise<string> {
    const rules = ["typescript", "react", "javascript", "nodejs", "owasp-top-ten", "secrets"]
    const ruleSet = rules.map(str => `--config p/${str}`).join(" ")
    return dag
    .container()
    .from("semgrep/semgrep")
    .withMountedDirectory("/src", this.source)
    .withWorkdir("/src")
    .withExec(
      ["sh", "-c", `semgrep scan --error ${ruleSet} .`],
    ).stderr()
  }

  @func()
  async trufflehogScan(sinceCommit: string = "HEAD"): Promise<string> {
    const args = `--since-commit ${sinceCommit} --results=verified,unknown --fail`
    return dag
    .container()
    .from("trufflesecurity/trufflehog:3.94.3")
    .withMountedDirectory("/src", this.source)
    .withWorkdir("/src")
    .withExec(
      ["sh", "-c", `trufflehog git file://. ${args}`],
    ).stderr()
  }

  @func()
  async testCoverage(): Promise<Directory> {
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
}
