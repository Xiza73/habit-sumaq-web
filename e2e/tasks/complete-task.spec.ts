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
   * The checkbox cycles PENDING -> IN_REVIEW -> DONE, so reaching "done"
   * takes two clicks, and the middle state renders as `indeterminate`
   * rather than checked.
   *
   * Both hops are verified against the browser AND the backend: the
   * optimistic update in `useUpdateTask` flips the control before the PATCH
   * lands, so asserting only the UI would pass even if nothing persisted.
   */
  test('cycles the checkbox through review to done and persists each hop', async ({
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

      // First hop: pending -> in review. Indeterminate, NOT checked — saying
      // "done" here would be the bug the third state exists to avoid.
      await checkbox.click();
      await expect(checkbox).not.toBeChecked();
      await expect
        .poll(
          async () => {
            const tasks = await listTasks(auth.api);
            return tasks.find((t) => t.id === task.id)?.status;
          },
          { message: 'backend did not persist IN_REVIEW', timeout: 5_000 },
        )
        .toBe('IN_REVIEW');

      // `completedAt` must still be null: it is what the weekly cleanup
      // measures against, so stamping it mid-validation would make an
      // unfinished task sweepable.
      const inReview = (await listTasks(auth.api)).find((t) => t.id === task.id);
      expect(inReview?.completedAt).toBeNull();

      // Second hop: in review -> done.
      await checkbox.click();
      await expect(checkbox).toBeChecked();
      await expect
        .poll(
          async () => {
            const tasks = await listTasks(auth.api);
            return tasks.find((t) => t.id === task.id)?.status;
          },
          { message: 'backend did not persist DONE', timeout: 5_000 },
        )
        .toBe('DONE');

      const done = (await listTasks(auth.api)).find((t) => t.id === task.id);
      expect(done?.completedAt).not.toBeNull();
    } finally {
      // Cascade — deleting the section wipes the task.
      await deleteSection(auth.api, section.id);
    }
  });
});
