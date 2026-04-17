import { expect, test } from '../fixtures/authenticated-page';
import { createHabit } from '../helpers/habits-api';

test.describe('Habits — edit', () => {
  test('edits a habit name via the actions menu', async ({ auth }, testInfo) => {
    const originalName = `Old ${testInfo.testId}`;
    const updatedName = `Updated ${testInfo.testId}`;

    await createHabit(auth.api, { name: originalName });

    await auth.page.goto('/habits');
    await expect(auth.page.getByText(originalName)).toBeVisible();

    await auth.page.getByRole('button', { name: /habit actions/i }).click();
    await auth.page.getByRole('button', { name: /editar hábito/i }).click();

    const nameInput = auth.page.getByLabel(/^nombre$/i);
    await nameInput.fill(updatedName);
    await auth.page.getByRole('button', { name: /guardar/i }).click();

    await expect(auth.page.getByText(updatedName)).toBeVisible();
    await expect(auth.page.getByText(originalName)).toHaveCount(0);
  });
});
