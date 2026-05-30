import { expect, test, type Page } from '@playwright/test';

const OWNER_EMAIL = 'owner-e2e@example.com';
const OWNER_PASSWORD = 'Passw0rd!';
const RECIPIENT_EMAIL = 'recipient-e2e@example.com';
const RECIPIENT_PASSWORD = 'Passw0rd!';

const PROJECT_ID = 'todo-app-e2e';
const FIRESTORE_EMULATOR_BASE_URL = `http://127.0.0.1:8080/emulator/v1/projects/${PROJECT_ID}/databases/(default)/documents`;
const AUTH_EMULATOR_BASE_URL = `http://127.0.0.1:9099/emulator/v1/projects/${PROJECT_ID}`;

const resetEmulators = async () => {
  await fetch(FIRESTORE_EMULATOR_BASE_URL, { method: 'DELETE' });
  await fetch(`${AUTH_EMULATOR_BASE_URL}/accounts`, { method: 'DELETE' });
};

const signUp = async (page: Page, email: string, password: string) => {
  await page.goto('/');
  await page.getByRole('button', { name: "Don't have an account? Create one" }).click();
  await page.getByPlaceholder('name@example.com').fill(email);
  await page.getByPlaceholder('••••••••').fill(password);
  await page.getByRole('button', { name: 'Create account' }).click();
  await expect(page.getByRole('button', { name: 'Log out' })).toBeVisible();
};

test.beforeEach(async () => {
  await resetEmulators();
});

test('shared dashboard members can comment on cards they did not create', async ({ browser }) => {
  const ownerContext = await browser.newContext();
  const ownerPage = await ownerContext.newPage();
  const recipientContext = await browser.newContext();
  const recipientPage = await recipientContext.newPage();

  const dashboardName = `Shared board ${Date.now()}`;
  const cardTitle = `Card ${Date.now()}`;
  const commentText = `Comment from recipient ${Date.now()}`;

  await signUp(ownerPage, OWNER_EMAIL, OWNER_PASSWORD);

  await ownerPage.getByTestId('new-dashboard-button').click();
  await ownerPage.getByPlaceholder('Product roadmap').fill(dashboardName);
  await ownerPage.getByPlaceholder('Backlog').fill('To do');
  await ownerPage.getByRole('button', { name: 'Add' }).click();
  await ownerPage.getByRole('button', { name: 'Create dashboard' }).click();

  await ownerPage.getByText(dashboardName).first().click();

  await ownerPage.locator('[data-testid^="share-dashboard-button-"]').first().click();
  await ownerPage
    .getByPlaceholder('hardcorovec@ya.ru, other@example.com')
    .fill(RECIPIENT_EMAIL);
  await ownerPage.getByRole('button', { name: 'Save access' }).click();

  await ownerPage.locator('[data-testid$="-todo"][data-testid^="new-card-button-"]').first().click();
  await ownerPage.getByTestId('create-card-title').fill(cardTitle);
  await ownerPage.getByTestId('create-card-submit').click();

  await expect(ownerPage.getByText(cardTitle)).toBeVisible();

  await signUp(recipientPage, RECIPIENT_EMAIL, RECIPIENT_PASSWORD);

  await recipientPage.getByText(dashboardName).first().click();
  await recipientPage.getByText(cardTitle).first().click();

  await recipientPage.getByPlaceholder('Add a comment...').fill(commentText);
  await recipientPage.getByRole('button', { name: 'Send' }).click();
  await expect(recipientPage.getByText(commentText)).toBeVisible();

  await ownerPage.reload();
  await ownerPage.getByText(dashboardName).first().click();
  await ownerPage.getByText(cardTitle).first().click();
  await expect(ownerPage.getByText(commentText)).toBeVisible();

  await ownerContext.close();
  await recipientContext.close();
});
