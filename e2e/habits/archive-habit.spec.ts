import { expect, test } from '../fixtures/authenticated-page';
import { createHabit } from '../helpers/habits-api';

test.describe('Habits — archive', () => {
  test('archives a habit and surfaces it under the archived filter', async ({ auth }, testInfo) => {
    const habit = await createHabit(auth.api, { name: `Arch ${testInfo.testId}` });

    await auth.page.goto('/habits');
    await expect(auth.page.getByText(habit.name)).toBeVisible();

    // Archive via actions menu
    await auth.page.getByRole('button', { name: /habit actions/i }).click();
    await auth.page.getByRole('button', { name: /^archivar$/i }).click();

    // Disappears from the default (daily) view
    await expect(auth.page.getByText(habit.name)).toHaveCount(0);

    // Toggle "Show archived" — button has title="Show archived" when not showing
    await auth.page.getByTitle('Show archived').click();
    await expect(auth.page.getByText(habit.name)).toBeVisible();

    // Unarchive via actions menu
    await auth.page.getByRole('button', { name: /habit actions/i }).click();
    await auth.page.getByRole('button', { name: /desarchivar/i }).click();

    // Toggle back to daily view — button flipped to "Hide archived"
    await auth.page.getByTitle('Hide archived').click();
    await expect(auth.page.getByText(habit.name)).toBeVisible();
  });
});
