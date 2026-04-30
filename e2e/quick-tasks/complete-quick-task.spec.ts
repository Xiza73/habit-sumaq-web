import { expect, test } from '../fixtures/authenticated-page';
import { createQuickTask, deleteQuickTask } from '../helpers/quick-tasks-api';

test.describe('Quick tasks — complete / uncomplete', () => {
  test('checking the checkbox moves the task to "Completadas hoy"', async ({ auth }, testInfo) => {
    const title = `Pagar luz ${testInfo.testId}`;
    const task = await createQuickTask(auth.api, { title });

    try {
      await auth.page.goto('/quick-tasks');

      // Task starts under Pendientes, unchecked.
      const card = auth.page.locator('div.group', { hasText: title }).first();
      await expect(card).toBeVisible();
      await expect(card.getByRole('checkbox')).not.toBeChecked();

      await card.getByRole('checkbox').check();

      // After optimistic update, the same title now appears under "Completadas hoy".
      await expect(auth.page.getByRole('heading', { name: /completadas hoy/i })).toBeVisible();
      // And the checkbox in the card is now checked.
      await expect(
        auth.page.locator('div.group', { hasText: title }).first().getByRole('checkbox'),
      ).toBeChecked();
    } finally {
      await deleteQuickTask(auth.api, task.id);
    }
  });

  test('unchecking a completed task sends it back to Pendientes', async ({ auth }, testInfo) => {
    const title = `Ir al gym ${testInfo.testId}`;
    const task = await createQuickTask(auth.api, { title });

    try {
      await auth.page.goto('/quick-tasks');

      const card = () => auth.page.locator('div.group', { hasText: title }).first();
      await card().getByRole('checkbox').check();
      await expect(auth.page.getByRole('heading', { name: /completadas hoy/i })).toBeVisible();

      // Un-check it.
      await card().getByRole('checkbox').uncheck();

      // The "Completadas hoy" header disappears when the last completed task
      // is unchecked (only one task in this test).
      await expect(auth.page.getByRole('heading', { name: /completadas hoy/i })).not.toBeVisible();
      await expect(card().getByRole('checkbox')).not.toBeChecked();
    } finally {
      await deleteQuickTask(auth.api, task.id);
    }
  });
});
