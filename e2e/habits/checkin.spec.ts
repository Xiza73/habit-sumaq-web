import { expect, test } from '../fixtures/authenticated-page';
import { createHabit } from '../helpers/habits-api';

test.describe('Habits — check-in', () => {
  test('registers a check-in and undoes it', async ({ auth }, testInfo) => {
    const habit = await createHabit(auth.api, {
      name: `Check ${testInfo.testId}`,
      targetCount: 3,
    });

    await auth.page.goto('/habits');
    await expect(auth.page.getByText(habit.name)).toBeVisible();

    // Check-in button has aria-label "Registrar"
    await auth.page.getByRole('button', { name: /^registrar$/i }).click();
    await expect(auth.page.getByText('1/3')).toBeVisible();

    // Undo button has aria-label "Deshacer registro"
    await auth.page.getByRole('button', { name: /deshacer registro/i }).click();
    await expect(auth.page.getByText('0/3')).toBeVisible();
  });
});
