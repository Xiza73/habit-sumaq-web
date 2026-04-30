import { expect, test } from '../fixtures/authenticated-page';

test.describe('Quick tasks — create', () => {
  test('creates a task via the form and shows it in the pending section', async ({
    auth,
  }, testInfo) => {
    const title = `Comprar leche ${testInfo.testId}`;

    await auth.page.goto('/quick-tasks');
    await auth.page.getByRole('button', { name: /nueva tarea/i }).click();

    await auth.page.getByLabel(/^título$/i).fill(title);
    await auth.page.getByRole('button', { name: /^crear$/i }).click();

    // Task card surfaces in the Pendientes section.
    await expect(auth.page.getByText(title)).toBeVisible();
    await expect(auth.page.getByRole('heading', { name: /pendientes/i })).toBeVisible();
  });

  test('rejects an empty title', async ({ auth }) => {
    await auth.page.goto('/quick-tasks');
    await auth.page.getByRole('button', { name: /nueva tarea/i }).click();

    // Submit without filling the title.
    await auth.page.getByRole('button', { name: /^crear$/i }).click();

    // Inline error surfaces and the dialog stays open.
    await expect(auth.page.getByText(/título es obligatorio/i)).toBeVisible();
    await expect(auth.page.getByRole('dialog')).toBeVisible();
  });
});
