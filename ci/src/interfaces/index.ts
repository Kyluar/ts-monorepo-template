import { type Directory, type File, type Secret } from "@dagger.io/dagger"

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
     * Runs unit and integration tests with coverage and returns the coverage folder
     */
    fastTests(): Promise<Directory>

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
     * Runs Renovate Bot to update dependencies via the Dagger container
     * @param token PAT with repo and issues:write scopes
     * @param repository repository in "owner/repo" format
     * @param dryRun simulate without creating PRs (default=false)
     * @param gitAuthor git author in "Name <email>" format for Renovate commits (treated as secret to avoid leaking personal email in logs)
     * @param platform git hosting platform (default="github")
     * @param endpoint base API URL for self-hosted or non-GitHub platforms (e.g. "https://codeberg.org/api/v1/")
     * @param username username associated with the token — required for Renovate to find its own PRs via the platform API
     */
    renovate(token: Secret, repository: string, dryRun: boolean, gitAuthor: Secret, username: string, platform?: string, endpoint?: string): Promise<void>

    /**
     * Builds and publishs an app from the monorepo (Dockerfile required)
     * @param app name of the app to build
     * @param ttl time to image expire (5m | 1h | 24h)
     */
    buildAndPublishApp(app: string, ttl: string): Promise<string>

    /**
     * Builds and publishes an app Docker image tagged with a semantic version
     * @param app name of the app (must have a Dockerfile at apps/<app>/Dockerfile)
     * @param version semver string (e.g. "1.2.3")
     * @param ttl image TTL on ttl.sh (default "24h")
     */
    publishVersionedApp(app: string, version: string, ttl?: string): Promise<string>

    /**
     * Runs Semgrep SAST scan on files changed since a base commit and returns a SARIF report
     * @param sinceCommit scan files changed since this commit (defaults to "HEAD~1")
     */
    semgrepScan(sinceCommit?: string): Promise<File>

    /**
     * Runs TruffleHog secret scan on the git history
     * @param sinceCommit scan commits newer than this SHA (defaults to "HEAD~1")
     */
    trufflehogScan(sinceCommit?: string): Promise<string>

    /**
     * Detects pending changesets, bumps package versions, commits the changes, creates git tags, and pushes everything to the remote.
     * Does nothing when no changeset files are present.
     * @param token PAT with write access to the repository
     * @param repoUrl full repository URL (e.g. "https://codeberg.org/owner/repo")
     * @param gitAuthorName git user.name for the version bump commit (default="forgejo-actions")
     * @param gitAuthorEmail git user.email for the version bump commit (default="forgejo-actions@noreply.codeberg.org")
     */
    release(token: Secret, repoUrl: string, gitAuthorName?: string, gitAuthorEmail?: string): Promise<void>
}