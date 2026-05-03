import {
  argument,
  type BuildArg,
  type Container,
  dag,
  type Directory,
  object,
  func
} from "@dagger.io/dagger";

import { NODE_ALPINE_DISTRIBUTION } from "./images"
import { IUtils } from "./interfaces"
@object()
export class Utils implements IUtils {
  source: Directory

  /**
   * Class with utility functions for other modules
   * @param source path of the monorepo's root
   */
  constructor(
    @argument({
      defaultPath: "../../", ignore: ["**/.next", "**/node_modules", "**/.turbo", "**/dist", "**/coverage"]
    })
    source: Directory
  ){
    this.source = source
  }

  private resolveVersions() {
    return Promise.all([
      this.source.file(".nvmrc").contents().catch(e => {
        throw new Error(`Failed to extract node version:\n${e}`)
      }),
      this.source.file("package.json").contents().then(raw => {
        const pkg = JSON.parse(raw)
        const v = pkg.packageManager ?? pkg.engines?.pnpm
        if (!v) throw new Error("pnpm version not found in package.json (checked packageManager and engines)")
        return v.includes("@") ? v.split("@")[1] : v
      }).catch(e => {
        throw new Error(`Failed to extract pnpm version:\n${e}`)
      })
    ])
  }

  async nodeContainer(distribution = NODE_ALPINE_DISTRIBUTION): Promise<Container> {

    const [nodeVersion, pnpmVersion] = await this.resolveVersions()
    const libs = ["git"]
    const imageName = `node:${nodeVersion}-${distribution}`

    const command = distribution.includes('alpine') ? 
      ["apk", "add", "--no-cache", "libc6-compat", ...libs] :
      ["sh", "-c", `apt-get update && apt-get install -y ${libs.join(" ")} && rm -rf /var/lib/apt/lists/*`]

    const pnpmCache = dag.cacheVolume("pnpm-store");
    const turboCache = dag.cacheVolume("turbo-cache");

    const container = dag
      .container()
      .from(imageName)
      .withEnvVariable("PNPM_HOME", "/pnpm")
      .withEnvVariable("PATH", "/$PNPM_HOME:$PATH", { expand: true })
      .withEnvVariable("TURBO_TELEMETRY_DISABLED", "1")
      .withMountedCache("/pnpm/store", pnpmCache)
      .withMountedCache("/app/.turbo", turboCache)
      .withExec(command)
      .withExec(["sh", "-c", `corepack enable && corepack prepare pnpm@${pnpmVersion} --activate`])

    return container
  }

  @func()
  async baseEnvironment(): Promise<Container> {

    const nodeContainer = await this.nodeContainer()

    return nodeContainer
      .withDirectory("/app", this.source) 
      .withWorkdir("/app")
      .withExec(["pnpm", "install", "--frozen-lockfile", "--ignore-scripts"])
  }

  @func()
  async testEnvironment(): Promise<Container> {

    const nodeContainer = await this.nodeContainer('slim')

    const playwrightCache = dag.cacheVolume("playwright-browsers")

    return nodeContainer
      .withEnvVariable('CI', 'true')
      .withEnvVariable("PLAYWRIGHT_BROWSERS_PATH", "/ms-playwright")
      .withMountedCache("/ms-playwright", playwrightCache)
      .withDirectory("/app", this.source) 
      .withWorkdir("/app")
      .withExec(["pnpm", "install", "--frozen-lockfile"])
  }

  @func()
  async buildImage(
    dockerfile: string
  ): Promise<Container> {

    const [nodeVersion, pnpmVersion] = await this.resolveVersions()

    const buildArgs: BuildArg[] = [
      { name: 'NODE_VERSION', value: nodeVersion },
      { name: 'PNPM_VERSION', value: pnpmVersion }
    ]

    return this.source.dockerBuild({ dockerfile, buildArgs })
  }

  @func()
  async ttlShPublish(
    image: Container,
    name: string,
    ttl: string
  ): Promise<string> {
    return image.publish(`ttl.sh/${name}:${ttl}`)
  }

  @func()
  async collectPlaywrightReports(container: Container): Promise<Directory> {
    const appsOutput = await container
      .withExec(["sh", "-c", "ls apps/ | grep -E '.*-e2e$' || true"])
      .stdout()

    const e2eApps = appsOutput.trim().split('\n').filter(Boolean)

    let reportsDir = dag.directory()

    for (const app of e2eApps) {
      reportsDir = reportsDir.withDirectory(`playwright-reports/${app}`, container.directory(`apps/${app}/playwright-report`))
    }

    return reportsDir
  }

}
