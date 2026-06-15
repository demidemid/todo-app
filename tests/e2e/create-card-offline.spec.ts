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

test.describe('Create card offline flow', () => {
  test.beforeEach(async ({ request }) => {
    await request
      .delete(`http://127.0.0.1:8080/emulator/v1/projects/${PROJECT_ID}/databases/(default)/documents`)
      .catch(() => undefined);
    await request
      .delete(`http://127.0.0.1:9099/emulator/v1/projects/${PROJECT_ID}/accounts`)
      .catch(() => undefined);
  });

  test('closes create-card modal while offline and shows created card after reconnect', async ({ page }) => {
    const email = `offline-owner-${Date.now()}@example.com`;
    const password = 'Passw0rd!';
    const dashboardName = `Offline board ${Date.now()}`;
    const cardTitle = `Offline card ${Date.now()}`;

    await signUp(page, email, password);

    await page.getByTestId('new-dashboard-button').click();
    await page.getByPlaceholder('Product roadmap').fill(dashboardName);
    await page.getByRole('button', { name: 'Create dashboard' }).click();

    await page.getByText(dashboardName).first().click();

    await page.locator('[data-testid^="new-card-button-"]').first().click();
    await page.getByTestId('create-card-title').fill(cardTitle);

    await page.context().setOffline(true);
    await page.getByTestId('create-card-submit').click();

    await expect(page.getByTestId('create-card-modal')).toHaveCount(0);

    await page.context().setOffline(false);
    await expect(page.getByText(cardTitle).first()).toBeVisible({ timeout: 20_000 });
  });
});
