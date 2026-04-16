import { vi } from 'vitest'

vi.mock('next/font/local', () => ({
	default: () => ({ variable: '--mock-font', className: 'mock-font' })
}))

import { describe, expect, it } from 'vitest'
import { metadata } from './layout'

describe('metadata', () => {
	it('has a title', () => {
		expect(metadata.title).toBeDefined()
	})

	it('has a description', () => {
		expect(metadata.description).toBeDefined()
	})

	it('title is a non-empty string', () => {
		expect(typeof metadata.title).toBe('string')
		expect((metadata.title as string).length).toBeGreaterThan(0)
	})
})
