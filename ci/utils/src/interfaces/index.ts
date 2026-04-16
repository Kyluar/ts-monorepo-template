import { Container, Directory } from "@dagger.io/dagger"

export interface IUtils {
    /**
     * Reads the node version in the .nvmrc file
     */
    getNodeVersion: () => Promise<string>

    /**
     * Reads the monorepo pnpm version on package.json 
     */
    getPnpmVersion: () => Promise<string>
    
    /**
     * Returns a configured Node container
     * @param distribution node image distribution
     */
    nodeContainer: (distribution:string) => Promise<Container>

    /**
     * Returns a base container for other functions
     */
    baseEnvironment(): Promise<Container>

    /**
     * Returns a container for tests with playwright
     */
    testEnvironment(): Promise<Container>

    /**
     * Builds an image from an existing Dockerfile
     * @param dockerfile path to the Dockerfile relative to the monorepo root
     */
    buildImage(dockerfile: string): Promise<Container>

    /**
     * Publishs an image on ttl.sh
     * @param image image to publish
     * @param name name of the image
     * @param ttl time to image expire (5m | 1h | 24h)
     */
    ttlShPublish(image: Container, name: string, ttl: string): Promise<string>

    /**
     * Collects all playwright-report folders from apps/*-e2e into playwright-reports
     * Each report is stored under its app name (e.g. playwright-report → web-e2e)
     * @param container container that ran the E2E tests
     */
    collectPlaywrightReports(container: Container): Promise<Directory>
}