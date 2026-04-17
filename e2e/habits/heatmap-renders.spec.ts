import { expect, test } from '../fixtures/authenticated-page';
import { createHabit, logHabit } from '../helpers/habits-api';

test.describe('Habits — heatmap', () => {
  test('renders the heatmap with Historial heading and cell grid', async ({ auth }, testInfo) => {
    const habit = await createHabit(auth.api, {
      name: `Heat ${testInfo.testId}`,
      targetCount: 3,
    });

    // Seed a handful of historical logs so some cells are colored.
    await logHabit(auth.api, habit.id, '2026-04-10', 2);
    await logHabit(auth.api, habit.id, '2026-04-12', 3);
    await logHabit(auth.api, habit.id, '2026-04-15', 1);

    await auth.page.goto(`/habits/${habit.id}`);

    await expect(auth.page.getByText('Historial')).toBeVisible();

    // MIN_WEEKS=10 × 7 days = 70 cells. Using >=50 as a safer bound in case
    // responsive layout produces fewer columns on Playwright's default viewport.
    const rectCount = await auth.page.locator('svg rect').count();
    expect(rectCount).toBeGreaterThanOrEqual(50);
  });
});
