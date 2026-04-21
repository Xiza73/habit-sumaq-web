import { expect, test } from '../fixtures/authenticated-page';
import { createQuickTask, deleteQuickTask } from '../helpers/quick-tasks-api';

test.describe('Quick tasks — edit', () => {
  test('updates the title via the form and the card reflects it', async ({ auth }, testInfo) => {
    const originalTitle = `Original ${testInfo.testId}`;
    const newTitle = `Renombrado ${testInfo.testId}`;
    const task = await createQuickTask(auth.api, { title: originalTitle });

    try {
      await auth.page.goto('/quick-tasks');
      await expect(auth.page.getByText(originalTitle)).toBeVisible();

      // Open the edit dialog for this specific card.
      await auth.page
        .locator('div.group', { hasText: originalTitle })
        .first()
        .getByRole('button', { name: /editar tarea/i })
        .click();

      // Field is pre-populated with the current title.
      const titleField = auth.page.getByLabel(/^título$/i);
      await expect(titleField).toHaveValue(originalTitle);

      await titleField.fill(newTitle);
      await auth.page.getByRole('button', { name: /^guardar$/i }).click();

      await expect(auth.page.getByText(newTitle)).toBeVisible();
      await expect(auth.page.getByText(originalTitle)).not.toBeVisible();
    } finally {
      await deleteQuickTask(auth.api, task.id);
    }
  });

  test('preview toggle in the description editor renders markdown live', async ({
    auth,
  }, testInfo) => {
    const title = `Con descripción ${testInfo.testId}`;
    const task = await createQuickTask(auth.api, { title });

    try {
      await auth.page.goto('/quick-tasks');
      await auth.page
        .locator('div.group', { hasText: title })
        .first()
        .getByRole('button', { name: /editar tarea/i })
        .click();

      // Type markdown into the description textarea.
      await auth.page.getByLabel(/^descripción$/i).fill('Ir al **mercado**');

      // Switch to preview mode — the **bold** should render as <strong>.
      await auth.page.getByRole('button', { name: /vista previa/i }).click();

      const bold = auth.page.locator('strong', { hasText: 'mercado' });
      await expect(bold).toBeVisible();

      // Back to edit mode — the textarea should still have the raw markdown.
      await auth.page.getByRole('button', { name: /^editar$/i }).click();
      await expect(auth.page.getByLabel(/^descripción$/i)).toHaveValue('Ir al **mercado**');
    } finally {
      await deleteQuickTask(auth.api, task.id);
    }
  });
});
