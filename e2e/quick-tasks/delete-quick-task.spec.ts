import { expect, test } from '../fixtures/authenticated-page';
import { createQuickTask, deleteQuickTask, listQuickTasks } from '../helpers/quick-tasks-api';

test.describe('Quick tasks — delete', () => {
  test('delete requires confirmation and then removes the card', async ({
    auth,
  }, testInfo) => {
    const title = `Por borrar ${testInfo.testId}`;
    const task = await createQuickTask(auth.api, { title });

    try {
      await auth.page.goto('/quick-tasks');
      const card = () => auth.page.locator('div.group', { hasText: title }).first();
      await expect(card()).toBeVisible();

      // Click the trash icon — the confirm dialog should pop up and the
      // task must still exist on the page until confirm.
      await card().getByRole('button', { name: /eliminar tarea/i }).click();
      await expect(auth.page.getByText(/es definitiva/i)).toBeVisible();
      await expect(card()).toBeVisible();

      // Confirm the deletion.
      await auth.page.getByRole('button', { name: /^eliminar$/i }).click();

      // Card is gone from the UI.
      await expect(auth.page.getByText(title)).not.toBeVisible();

      // And gone from the backend.
      const remaining = await listQuickTasks(auth.api);
      expect(remaining.find((t) => t.id === task.id)).toBeUndefined();
    } finally {
      // Idempotent — delete is a no-op if already gone.
      await deleteQuickTask(auth.api, task.id);
    }
  });

  test('cancelling the confirm dialog keeps the task', async ({ auth }, testInfo) => {
    const title = `No borrar ${testInfo.testId}`;
    const task = await createQuickTask(auth.api, { title });

    try {
      await auth.page.goto('/quick-tasks');
      await auth.page
        .locator('div.group', { hasText: title })
        .first()
        .getByRole('button', { name: /eliminar tarea/i })
        .click();

      await auth.page.getByRole('button', { name: /cancelar/i }).click();

      // Task is still there.
      await expect(auth.page.getByText(title)).toBeVisible();
    } finally {
      await deleteQuickTask(auth.api, task.id);
    }
  });
});
