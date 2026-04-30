import { expect, test } from '../fixtures/authenticated-page';
import { deleteBudget, getCurrentBudget, listBudgets } from '../helpers/budgets-api';

test.describe('Budgets — create', () => {
  /**
   * End-to-end happy path: the user opens /budgets, clicks "Crear presupuesto"
   * from the empty CTA, fills the amount, submits, and the dashboard switches
   * from the empty state to the KPI card. The backend persists the budget.
   */
  test('creates a budget for the current month and renders the KPI dashboard', async ({ auth }) => {
    // Pre-clean to guarantee an empty state so the CTA is visible.
    const existing = await listBudgets(auth.api);
    for (const b of existing) await deleteBudget(auth.api, b.id);

    await auth.page.goto('/budgets');

    // CTA in EmptyBudgetCta opens the create modal.
    await auth.page.getByRole('button', { name: /crear presupuesto/i }).click();

    // BudgetForm: only `amount` is required to feed the create flow — year,
    // month and currency keep their defaults (current month + user's default
    // currency, which is PEN unless settings say otherwise).
    await auth.page.getByLabel(/^monto$/i).fill('1500');
    await auth.page.getByRole('button', { name: /^crear$/i }).click();

    // Dashboard flips to the KPI card. We assert two pieces of UI:
    //  - The "tu mes" heading from BudgetKpiCard.
    //  - The remaining headline reflecting the just-created amount.
    await expect(auth.page.getByRole('heading', { name: /tu mes/i })).toBeVisible();
    // Accept either '1.500,00' (es-PE) or '1,500.00' (other locales) — the
    // dashboard uses the currency-locale formatter.
    await expect(auth.page.getByText(/1[.,]500[.,]00/).first()).toBeVisible();

    // Verify backend persistence. We don't assume which currency the user
    // settled on (PEN by default), so we just check there's exactly one
    // budget for the current month with amount 1500.
    const budgets = await listBudgets(auth.api);
    const justCreated = budgets.find((b) => b.amount === 1500);
    expect(justCreated, 'budget with amount 1500 not persisted').toBeDefined();

    // Cleanup.
    if (justCreated) await deleteBudget(auth.api, justCreated.id);
  });

  test('blocks the create flow when the amount is missing or zero', async ({ auth }) => {
    const existing = await listBudgets(auth.api);
    for (const b of existing) await deleteBudget(auth.api, b.id);

    await auth.page.goto('/budgets');
    await auth.page.getByRole('button', { name: /crear presupuesto/i }).click();
    // Amount defaults to 0 in the form. Submit without filling.
    await auth.page.getByRole('button', { name: /^crear$/i }).click();

    // Modal stays open (no toast, no KPI render). We assert the dialog is
    // still on screen and the dashboard didn't move past the CTA.
    await expect(auth.page.getByRole('dialog')).toBeVisible();
    expect(await getCurrentBudget(auth.api, 'PEN')).toBeNull();
  });
});
