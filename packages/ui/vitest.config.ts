import { reactConfig } from '@repo/vitest-config'
import { defineProject, mergeConfig } from 'vitest/config'

export default mergeConfig(
	reactConfig,
	defineProject({
		test: {
			name: '@repo/ui'
		}
	})
)
