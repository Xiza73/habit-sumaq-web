import { expect, test } from '../fixtures/authenticated-page';
import { deleteSection, listSections } from '../helpers/tasks-api';

test.describe('Tasks — create section and first task', () => {
  /**
   * First-time-user flow:
   *  1. Visit /tasks with no sections → empty CTA "Empezá creando tu primera sección".
   *  2. "Nueva tarea" header button is disabled (decision firmada — needs a section first).
   *  3. Create section via the CTA / SectionForm.
   *  4. The empty state goes away; section header renders.
   *  5. "Nueva tarea" becomes enabled. Create a task.
   *  6. Task appears inside the section.
   */
  test('first-time flow: empty → create section → enable task button → create task', async ({
    auth,
  }, testInfo) => {
    // Pre-clean any stale sections so the empty state is guaranteed.
    for (const s of await listSections(auth.api)) await deleteSection(auth.api, s.id);

    const sectionName = `Trabajo ${testInfo.testId}`;
    const taskTitle = `Llamar al banco ${testInfo.testId}`;

    let createdSectionId: string | null = null;

    try {
      await auth.page.goto('/tasks');

      // 1. Empty CTA visible.
      await expect(
        auth.page.getByRole('heading', { name: /empezá creando tu primera sección/i }),
      ).toBeVisible();

      // 2. Header "Nueva tarea" button is disabled while no sections exist.
      // The disabled button has `title="Creá una sección primero"`.
      const newTaskButton = auth.page.getByTitle(/creá una sección primero/i);
      await expect(newTaskButton).toBeDisabled();

      // 3. CTA opens the SectionForm modal.
      await auth.page.getByRole('button', { name: /crear primera sección/i }).click();
      await auth.page.getByLabel(/^nombre$/i).fill(sectionName);
      await auth.page.getByRole('button', { name: /^crear$/i }).click();

      // 4. Section header renders.
      await expect(auth.page.getByRole('heading', { name: sectionName })).toBeVisible();

      // 5. "Nueva tarea" is now enabled. Open the TaskForm.
      const enabledTaskButton = auth.page.getByRole('button', { name: /nueva tarea/i });
      await expect(enabledTaskButton).toBeEnabled();
      await enabledTaskButton.click();

      // The section is pre-selected by default. Fill title + submit.
      await auth.page.getByLabel(/^título$/i).fill(taskTitle);
      await auth.page.getByRole('button', { name: /^crear$/i }).click();

      // 6. Task surfaces inside the section.
      await expect(auth.page.getByText(taskTitle)).toBeVisible();

      // Capture the section id for cleanup. The DELETE cascades to the task.
      const sections = await listSections(auth.api);
      const created = sections.find((s) => s.name === sectionName);
      createdSectionId = created?.id ?? null;
    } finally {
      if (createdSectionId) await deleteSection(auth.api, createdSectionId);
    }
  });
});
