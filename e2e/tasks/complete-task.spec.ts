import { expect, test } from '../fixtures/authenticated-page';
import {
  createSection,
  createTask,
  deleteSection,
  listSections,
  listTasks,
} from '../helpers/tasks-api';

test.describe('Tasks — complete', () => {
  /**
   * Toggling the checkbox on a task fires the optimistic update in
   * `useUpdateTask` — the card UI flips to "completed" before the network
   * round-trip. We verify both:
   *  - The UI shows the line-through/check (visible state change).
   *  - The backend persists `completed: true` + `completedAt: <date>`.
   */
  test('toggling the checkbox marks the task completed and persists it', async ({
    auth,
  }, testInfo) => {
    for (const s of await listSections(auth.api)) await deleteSection(auth.api, s.id);

    const sectionName = `Personal ${testInfo.testId}`;
    const taskTitle = `Comprar pan ${testInfo.testId}`;

    const section = await createSection(auth.api, { name: sectionName });
    const task = await createTask(auth.api, { sectionId: section.id, title: taskTitle });

    try {
      await auth.page.goto('/tasks');

      // The task row exposes a checkbox accessible by role. Filter by the
      // task title's ancestor row so we don't accidentally hit a different
      // task's checkbox if more were on screen.
      const row = auth.page.locator('div.group', { hasText: taskTitle }).first();
      await expect(row).toBeVisible();

      const checkbox = row.getByRole('checkbox');
      await expect(checkbox).not.toBeChecked();

      await checkbox.click();

      // Optimistic update — checkbox flips before the PATCH lands.
      await expect(checkbox).toBeChecked();

      // Backend persists the toggle. Poll because the optimistic UI may
      // have already moved past the PATCH; we want to confirm the server
      // saw it.
      await expect
        .poll(
          async () => {
            const tasks = await listTasks(auth.api);
            return tasks.find((t) => t.id === task.id)?.completed;
          },
          { message: 'backend did not persist completed=true', timeout: 5_000 },
        )
        .toBe(true);
    } finally {
      // Cascade — deleting the section wipes the task.
      await deleteSection(auth.api, section.id);
    }
  });
});
