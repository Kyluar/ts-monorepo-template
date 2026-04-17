import { type Directory } from "@dagger.io/dagger"

export interface ICiModule {
    /**
     * Runs turbo lint and check-types
     */
    codeQuality(): Promise<void>

    /**
     * Runs turbo build
     */
    buildProject(): Promise<void>

    /**
     * Runs pnpm test:coverage and returns de coverage result folder
     */
    testCoverage(): Promise<Directory>

    /**
     * Runs E2E tests and returns a report folder
     * @param smoke enable smoke tests (default=false)
     */
    e2eTests(smoke:boolean): Promise<Directory>

    /**
     * Validates a single commit message string against standard rules
     * * @param message the commit message text to be checked.
     */
    commitlintMessage(message: string): Promise<string>

    /**
     * Validates a range of commits in the git history between two references.
     * @param from The starting git reference (e.g., "HEAD~5" or a branch name).
     * @param to The ending git reference (defaults to "HEAD").
     */
    commitlintRange(from: string, to?: string): Promise<string>

    /**
     * Builds and publishs an app from the monorepo (Dockerfile required)
     * @param app name of the app to build
     * @param ttl time to image expire (5m | 1h | 24h)
     */
    buildAndPublishApp(app: string, ttl: string): Promise<string>

    /**
     * Runs Semgrep SAST scan on the monorepo source code
     * @param error defines wheter to throw an error or not (defaults to true)
     */
    semgrepScan(error:boolean): Promise<string>
}