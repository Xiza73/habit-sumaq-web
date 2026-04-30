import { expect, test } from '../fixtures/authenticated-page';
import { createBudget, deleteBudget, listBudgets } from '../helpers/budgets-api';

test.describe('Budgets — delete', () => {
  /**
   * Confirms the cascade-soft-delete UX: user clicks "Eliminar", confirms in
   * the dialog, the dashboard returns to the empty state, and the backend
   * `GET /budgets` no longer lists this id.
   */
  test('deletes the current budget after confirm and returns to the empty CTA', async ({
    auth,
  }) => {
    // Wipe + seed a fresh budget for the current month in PEN. We don't pass
    // year/month — backend defaults to the user's current month.
    for (const b of await listBudgets(auth.api)) await deleteBudget(auth.api, b.id);
    const seeded = await createBudget(auth.api, { currency: 'PEN', amount: 2000 });

    try {
      await auth.page.goto('/budgets');

      // KPI card visible (sanity check the seed landed).
      await expect(auth.page.getByRole('heading', { name: /tu mes/i })).toBeVisible();

      // KPI card has 3 action buttons: add movement, edit, delete. Only one
      // matches the exact "eliminar" name (case-insensitive) — `aria-label`
      // on the icon button gives us the click target.
      await auth.page.getByRole('button', { name: /^eliminar$/i }).click();

      // ConfirmDialog asks for confirmation with the destructive message.
      // We click the second "Eliminar" — the one INSIDE the dialog (no aria-label).
      await auth.page
        .getByRole('dialog')
        .getByRole('button', { name: /^eliminar$/i })
        .click();

      // Dashboard returns to the empty CTA.
      await expect(auth.page.getByRole('heading', { name: /no tenés presupuesto/i })).toBeVisible();

      // Backend no longer lists the deleted budget.
      const remaining = await listBudgets(auth.api);
      expect(remaining.find((b) => b.id === seeded.id)).toBeUndefined();
    } finally {
      // Idempotent — if the test already deleted via UI, this is a no-op.
      await deleteBudget(auth.api, seeded.id);
    }
  });
});
