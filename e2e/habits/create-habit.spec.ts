import { expect, test } from '../fixtures/authenticated-page';

test.describe('Habits — create', () => {
  test('creates a habit via the form and shows it in the list', async ({ auth }, testInfo) => {
    const name = `Tomar agua ${testInfo.testId}`;

    await auth.page.goto('/habits');
    await auth.page
      .getByRole('button', { name: /nuevo hábito/i })
      .first()
      .click();

    await auth.page.getByLabel(/^nombre$/i).fill(name);
    await auth.page.getByLabel(/meta/i).fill('8');
    await auth.page.getByRole('button', { name: /^crear$/i }).click();

    await expect(auth.page.getByText(name)).toBeVisible();
  });
});
