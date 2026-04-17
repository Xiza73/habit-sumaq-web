import { expect, test } from '../fixtures/authenticated-page';
import { createHabit } from '../helpers/habits-api';

test.describe('Habits — detail navigation', () => {
  test('navigates to the habit detail page and keeps the session on reload', async ({
    auth,
  }, testInfo) => {
    const habit = await createHabit(auth.api, { name: `Nav ${testInfo.testId}` });

    await auth.page.goto('/habits');
    await expect(auth.page.getByText(habit.name)).toBeVisible();

    // The card wraps the habit content in <Link href="/habits/{id}">.
    await auth.page.getByRole('link').filter({ hasText: habit.name }).first().click();

    await expect(auth.page).toHaveURL(new RegExp(`/habits/${habit.id}`));
    await expect(auth.page.getByText(habit.name)).toBeVisible();

    // Reload: the refresh_token cookie should let the session survive.
    await auth.page.reload();
    await expect(auth.page).toHaveURL(new RegExp(`/habits/${habit.id}`));
    await expect(auth.page.getByText(habit.name)).toBeVisible();
  });
});
