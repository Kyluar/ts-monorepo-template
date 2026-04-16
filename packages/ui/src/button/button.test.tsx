import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { Button } from '.'

describe('Button', () => {
	it('renders children', () => {
		render(<Button appName="test">Click me</Button>)
		expect(screen.getByRole('button', { name: 'Click me' })).toBeInTheDocument()
	})
	it('calls alert with app name on click', async () => {
		const alertSpy = vi.spyOn(window, 'alert')
		render(<Button appName="web">Click me</Button>)
		const user = userEvent.setup()
		await user.click(screen.getByRole('button'))
		expect(alertSpy).toHaveBeenCalledWith('Hello from your web app!')
		alertSpy.mockRestore()
	})
	it('applies className prop', () => {
		render(
			<Button appName="test" className="custom-class">
				Styled
			</Button>
		)
		expect(screen.getByRole('button')).toHaveClass('custom-class')
	})
})
