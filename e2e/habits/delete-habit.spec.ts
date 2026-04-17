import { expect, test } from '../fixtures/authenticated-page';
import { createHabit } from '../helpers/habits-api';

test.describe('Habits — delete', () => {
  test('deletes a habit after confirmation', async ({ auth }, testInfo) => {
    const habit = await createHabit(auth.api, { name: `Del ${testInfo.testId}` });

    await auth.page.goto('/habits');
    await expect(auth.page.getByText(habit.name)).toBeVisible();

    // Open the card menu and choose delete
    await auth.page.getByRole('button', { name: /habit actions/i }).click();
    await auth.page.getByRole('button', { name: /eliminar hábito/i }).click();

    // The menu has closed; now the only "Eliminar hábito" button belongs to
    // the ConfirmDialog. Use .last() to be safe.
    await auth.page
      .getByRole('button', { name: /eliminar hábito/i })
      .last()
      .click();

    await expect(auth.page.getByText(habit.name)).toHaveCount(0);
  });
});
