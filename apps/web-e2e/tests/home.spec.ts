import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

test.describe('Home page', () => {
	test.beforeEach(async ({ page }) => {
		await page.goto('/')
	})

	test('deve carregar a página com sucesso', async ({ page }) => {
		await expect(page).toHaveURL('/')
		await expect(page).toHaveTitle(/Create Next App/)
	})

	test('deve exibir o logo', async ({ page }) => {
		const logo = page.getByAltText('Turborepo logo').first()
		await expect(logo).toBeVisible()
	})

	test('deve exibir os links de CTA', async ({ page }) => {
		const deployLink = page.getByRole('link', { name: /deploy now/i })
		const docsLink = page.getByRole('link', { name: /read our docs/i })

		await expect(deployLink).toBeVisible()
		await expect(docsLink).toBeVisible()
	})

	test('links externos devem ter target _blank e rel seguro', async ({
		page
	}) => {
		const externalLinks = page.locator('a[target="_blank"]')
		const count = await externalLinks.count()

		for (let i = 0; i < count; i++) {
			const rel = await externalLinks.nth(i).getAttribute('rel')
			expect(rel).toContain('noopener')
		}
	})

	test('deve exibir o botão "Open alert"', async ({ page }) => {
		const button = page.getByRole('button', { name: /open alert/i })
		await expect(button).toBeVisible()
	})

	test('não deve ter violações de acessibilidade detectáveis', async ({
		page
	}) => {
		const results = await new AxeBuilder({ page }).analyze()
		expect(results.violations).toEqual([])
	})
})
