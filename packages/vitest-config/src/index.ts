import { mergeConfig, type UserWorkspaceConfig } from 'vitest/config'

export const baseConfig: UserWorkspaceConfig = {
	test: {
		globals: true,
		setupFiles: ['./src/test/setup.ts'],
		include: ['src/**/*.{test,spec}.{ts,tsx}']
	}
}

export const reactConfig: UserWorkspaceConfig = mergeConfig(baseConfig, {
	test: {
		environment: 'happy-dom'
	}
} as UserWorkspaceConfig)
