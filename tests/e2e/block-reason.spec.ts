import { expect, test, type Page } from '@playwright/test';

const PROJECT_ID = 'todo-app-e2e';

const signUp = async (page: Page, email: string, password: string) => {
  await page.goto('/');
  await page.getByRole('button', { name: "Don't have an account? Create one" }).click();
  await page.getByPlaceholder('name@example.com').fill(email);
  await page.getByPlaceholder('••••••••').fill(password);
  await page.getByRole('button', { name: 'Create account' }).click();
  await expect(page.getByRole('button', { name: 'Log out' })).toBeVisible();
};

test.describe('Block reason lifecycle', () => {
  test.beforeEach(async ({ request }) => {
    const documentsResponse = await request.delete(
      `http://127.0.0.1:8080/emulator/v1/projects/${PROJECT_ID}/databases/(default)/documents`
    );
    expect(documentsResponse.ok()).toBeTruthy();

    const accountsResponse = await request.delete(
      `http://127.0.0.1:9099/emulator/v1/projects/${PROJECT_ID}/accounts`
    );
    expect(accountsResponse.ok()).toBeTruthy();
  });

  test('adds then removes block reason and hides dashboard badge', async ({ page }) => {
    const email = `block-owner-${Date.now()}@example.com`;
    const password = 'Passw0rd!';
    const dashboardName = `Block board ${Date.now()}`;
    const cardTitle = `Blocked card ${Date.now()}`;
    const blockedReason = `Blocked by dependency ${Date.now()}`;

    await signUp(page, email, password);

    await page.getByTestId('new-dashboard-button').click();
    await page.getByPlaceholder('Product roadmap').fill(dashboardName);
    await page.getByRole('button', { name: 'Create dashboard' }).click();

    await page.getByText(dashboardName).first().click();

    await page.locator('[data-testid^="new-card-button-"]').first().click();
    await page.getByTestId('create-card-title').fill(cardTitle);
    await page.getByTestId('create-card-submit').click();

    await expect(page.getByText(cardTitle).first()).toBeVisible();

    await page.getByText(cardTitle).first().click();
    await page.getByTestId('todo-card-menu-trigger').click();
    await page.getByTestId('todo-card-menu-block').click();
    await page.getByTestId('todo-block-reason-input').fill(blockedReason);
    await page.getByTestId('todo-block-reason-save').click();

    await expect(page.getByTestId('todo-block-reason-metadata')).toContainText(blockedReason);

    await page.getByRole('button', { name: 'Close' }).click();

    await expect(page.locator('[data-testid^="card-blocked-reason-"]').first()).toContainText(blockedReason);

    await page.locator('[data-testid^="card-blocked-reason-"]').first().click();
    await expect(page.getByTestId('todo-block-reason-metadata')).toContainText(blockedReason);

    await page.getByTestId('todo-block-reason-remove').click();

    await expect(page.getByTestId('todo-block-reason-metadata')).toHaveCount(0);
    await page.getByRole('button', { name: 'Close' }).click();
    await expect(page.locator('[data-testid^="card-blocked-reason-"]')).toHaveCount(0);
  });
});
