import { reactConfig } from '@repo/vitest-config'
import react from '@vitejs/plugin-react'
import { defineProject, mergeConfig } from 'vitest/config'

export default mergeConfig(
	reactConfig,
	defineProject({
		plugins: [react()],
		test: {
			name: 'web'
		}
	})
)
