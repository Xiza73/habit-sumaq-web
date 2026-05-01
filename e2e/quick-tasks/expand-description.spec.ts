import { expect, test } from '../fixtures/authenticated-page';
import { createQuickTask, deleteQuickTask } from '../helpers/quick-tasks-api';

test.describe('Quick tasks — expand description', () => {
  test('clicking the title expands the card and renders markdown', async ({ auth }, testInfo) => {
    const title = `Pagar recibo ${testInfo.testId}`;
    const description = 'Ir al **banco** y pagar.';
    const task = await createQuickTask(auth.api, { title, description });

    try {
      await auth.page.goto('/quick-tasks');

      // Description is not visible until the card is expanded.
      await expect(auth.page.locator('strong', { hasText: 'banco' })).not.toBeVisible();

      // Click the card's title button to expand.
      const card = auth.page.locator('div.group', { hasText: title }).first();
      await card.getByRole('button', { expanded: false }).click();

      // Now the markdown body is rendered.
      await expect(auth.page.locator('strong', { hasText: 'banco' })).toBeVisible();

      // Clicking again collapses it.
      await card.getByRole('button', { expanded: true }).click();
      await expect(auth.page.locator('strong', { hasText: 'banco' })).not.toBeVisible();
    } finally {
      await deleteQuickTask(auth.api, task.id);
    }
  });

  test('tasks without description have no chevron affordance', async ({ auth }, testInfo) => {
    const title = `Sin detalles ${testInfo.testId}`;
    const task = await createQuickTask(auth.api, { title });

    try {
      await auth.page.goto('/quick-tasks');

      // The title button should NOT be aria-expanded (no collapsible content).
      const titleButton = auth.page
        .locator('div.group', { hasText: title })
        .first()
        .getByRole('button', { name: title });
      await expect(titleButton).not.toHaveAttribute('aria-expanded', /.*/);
    } finally {
      await deleteQuickTask(auth.api, task.id);
    }
  });
});
