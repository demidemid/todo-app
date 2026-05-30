import path from 'node:path';
import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';

async function signUpAndSignIn(page: Page, email: string, password: string) {
  await page.goto('/login');
  await page.getByPlaceholder('Email').fill(email);
  await page.getByPlaceholder('Password').fill(password);
  await page.getByRole('button', { name: 'Sign Up' }).click();

  await expect(page.getByRole('button', { name: 'Sign Out' })).toBeVisible();
}

test.describe('Shared dashboard files', () => {
  test.beforeEach(async ({ request }) => {
    const projectId = process.env.FIREBASE_PROJECT_ID ?? 'todo-app-e2e';
    await request.delete(`http://127.0.0.1:8080/emulator/v1/projects/${projectId}/databases/(default)/documents`);
  });

  test('owner can upload file, see it on card, and delete it', async ({ page }) => {
    const email = `files-owner-${Date.now()}@example.com`;
    const password = 'Password123!';
    const fixturePath = path.resolve(process.cwd(), 'tests/e2e/fixtures/sample.txt');

    await signUpAndSignIn(page, email, password);

    await page.getByPlaceholder('Create dashboard').fill('Files Board');
    await page.getByRole('button', { name: 'Create Dashboard' }).click();
    await page.getByTestId('dashboard-option-dashboard-files-board').click();

    await page.getByPlaceholder('Add a new todo').fill('Todo with files');
    await page.getByRole('button', { name: 'Add' }).click();

    await page.getByText('Todo with files').click();
    await page.getByTestId('todo-actions-trigger').click();
    await page.getByRole('menuitem', { name: 'Добавить файл' }).click();
    await page.getByTestId('todo-file-input').setInputFiles(fixturePath);

    await expect(page.getByRole('link', { name: 'sample.txt' })).toBeVisible();

    await page.getByRole('button', { name: 'Close' }).click();
    await expect(page.getByRole('link', { name: 'sample.txt' })).toBeVisible();

    await page.getByText('Todo with files').click();
    await page.getByLabel('Delete file sample.txt').click();

    await expect(page.getByRole('link', { name: 'sample.txt' })).toHaveCount(0);
    await page.getByRole('button', { name: 'Close' }).click();
    await expect(page.getByRole('link', { name: 'sample.txt' })).toHaveCount(0);
  });
});
