import { expect, test } from '../fixtures/authenticated-page';
import {
  createSection,
  createTask,
  deleteSection,
  listSections,
  listTasks,
} from '../helpers/tasks-api';

test.describe('Tasks — delete section cascades to its tasks', () => {
  /**
   * Section delete is CASCADE (firmed decision B). When the user confirms,
   * the backend wipes the section AND every task inside it. The UI reflects
   * this immediately.
   *
   * The dialog is intentionally generic ("¿Eliminar X tareas?") — just the
   * confirm action drives the deletion.
   */
  test('confirming the delete dialog wipes the section + all its tasks', async ({
    auth,
  }, testInfo) => {
    for (const s of await listSections(auth.api)) await deleteSection(auth.api, s.id);

    const sectionName = `Compras ${testInfo.testId}`;
    const taskA = `Pan ${testInfo.testId}`;
    const taskB = `Leche ${testInfo.testId}`;

    const section = await createSection(auth.api, { name: sectionName });
    const seededA = await createTask(auth.api, { sectionId: section.id, title: taskA });
    const seededB = await createTask(auth.api, { sectionId: section.id, title: taskB });

    try {
      await auth.page.goto('/tasks');

      // Sanity check: section + both tasks are visible before the delete.
      await expect(auth.page.getByRole('heading', { name: sectionName })).toBeVisible();
      await expect(auth.page.getByText(taskA)).toBeVisible();
      await expect(auth.page.getByText(taskB)).toBeVisible();

      // Section header has 3 icon buttons: add task, edit, delete. Click the
      // delete one (aria-label="Eliminar sección").
      await auth.page.getByRole('button', { name: /eliminar sección/i }).click();

      // Confirm dialog uses the cascade copy. We don't assert the exact
      // count text — it varies with the i18n plural rules — but we do click
      // the destructive confirm.
      await auth.page
        .getByRole('dialog')
        .getByRole('button', { name: /^eliminar$/i })
        .click();

      // UI returns to the empty CTA (no other sections existed).
      await expect(
        auth.page.getByRole('heading', { name: /empieza creando tu primera sección/i }),
      ).toBeVisible();

      // Backend wiped the section + both tasks.
      const remainingSections = await listSections(auth.api);
      expect(remainingSections.find((s) => s.id === section.id)).toBeUndefined();

      const remainingTasks = await listTasks(auth.api);
      expect(remainingTasks.find((t) => t.id === seededA.id)).toBeUndefined();
      expect(remainingTasks.find((t) => t.id === seededB.id)).toBeUndefined();
    } finally {
      // Idempotent — if the UI already cascaded the delete, this is a no-op.
      await deleteSection(auth.api, section.id);
    }
  });
});
