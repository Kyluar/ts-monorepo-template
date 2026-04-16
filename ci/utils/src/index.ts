import { 
  argument, 
  type BuildArg, 
  type Container, 
  dag, 
  type Directory, 
  object, 
  func 
} from "@dagger.io/dagger";

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

  @func()
  async getNodeVersion(): Promise<string> {
    try {
      return await this.source.file(".nvmrc").contents();
    } catch (error) {
      throw new Error(`Failed to extract node version:\n${error}`);
    }
  }

  @func()
  async getPnpmVersion(): Promise<string> {
    try {
      const packageJson = JSON.parse(
        await this.source.file("package.json").contents()
      );

      const pnpmFullString = packageJson.packageManager || packageJson.engines?.pnpm;
  
      if (!pnpmFullString) {
        throw new Error("pnpm version not found in package.json (checked packageManager and engines)");
      }
  
      const version = pnpmFullString.includes("@") 
        ? pnpmFullString.split("@")[1] 
        : pnpmFullString;
  
      return version;
    } catch (error) {
      throw new Error(`Failed to extract pnpm version:\n${error}`);
    }
  }

  async nodeContainer(distribution='alpine3.23'): Promise<Container> {

    const nodeVersion: string = await this.getNodeVersion()
    const pnpmVersion: string = await this.getPnpmVersion()
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

    const buildArgs: BuildArg[] = [
      {
        name: 'NODE_VERSION',
        value: await this.getNodeVersion()
      },
      {
        name: 'PNPM_VERSION',
        value: await this.getPnpmVersion()
      }
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
