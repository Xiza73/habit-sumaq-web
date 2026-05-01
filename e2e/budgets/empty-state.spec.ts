import { expect, test } from '../fixtures/authenticated-page';
import { deleteBudget, listBudgets } from '../helpers/budgets-api';

test.describe('Budgets — empty state', () => {
  /**
   * The dashboard defaults the currency picker to the user's preferred default
   * from settings (PEN unless changed). For this test we wipe any existing
   * budgets so the GET /budgets/current?currency=PEN call returns null and
   * the empty CTA renders.
   */
  test('renders the "no presupuesto" CTA when the user has no budget for the current month', async ({
    auth,
  }) => {
    // Wipe any leftover budgets from previous runs / parallel tests on the
    // same user (each testId gets its own user, so this is safe).
    const existing = await listBudgets(auth.api);
    for (const b of existing) {
      await deleteBudget(auth.api, b.id);
    }

    await auth.page.goto('/budgets');

    // EmptyBudgetCta heading copy: "No tienes presupuesto para {period} en {currency}"
    await expect(auth.page.getByRole('heading', { name: /no tienes presupuesto/i })).toBeVisible();
    await expect(auth.page.getByRole('button', { name: /crear presupuesto/i })).toBeVisible();
  });
});
