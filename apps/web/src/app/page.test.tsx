import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import Home from './page'

describe('Home page', () => {
	it('renders the Button from @repo/ui', () => {
		render(<Home />)
		expect(
			screen.getByRole('button', { name: 'Open alert' })
		).toBeInTheDocument()
	})

	it('shows alert with web app name when Button is clicked', async () => {
		window.alert = vi.fn()
		render(<Home />)
		const user = userEvent.setup()
		await user.click(screen.getByRole('button'))
		expect(window.alert).toHaveBeenCalledWith('Hello from your web app!')
	})

	it('renders footer navigation links', () => {
		render(<Home />)
		expect(screen.getByRole('link', { name: /examples/i })).toBeInTheDocument()
		expect(screen.getByRole('link', { name: /turborepo/i })).toBeInTheDocument()
	})
})
