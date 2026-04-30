import { type Locator, type Page } from '@playwright/test';

import { expect, test } from '../fixtures/authenticated-page';
import { createQuickTask, deleteQuickTask, listQuickTasks } from '../helpers/quick-tasks-api';

// ---------------------------------------------------------------------------
// Drag-and-drop helper for @dnd-kit/sortable
//
// page.dragTo() does NOT work with dnd-kit's PointerSensor because the sensor
// listens to raw pointer events (pointerdown + pointermove) rather than the
// HTML5 drag-and-drop API.  We simulate the gesture manually:
//   1. Move to the source element's centre.
//   2. Press the pointer button.
//   3. Move in small increments to the target centre (gives dnd-kit enough
//      pointermove events to exceed its activationConstraint.distance of 6px
//      and register the drag).
//   4. Release the pointer.
// ---------------------------------------------------------------------------
async function dragByPointer(page: Page, from: Locator, to: Locator) {
  const fromBox = await from.boundingBox();
  const toBox = await to.boundingBox();
  if (!fromBox || !toBox) throw new Error('dragByPointer: locator not visible');

  const startX = fromBox.x + fromBox.width / 2;
  const startY = fromBox.y + fromBox.height / 2;
  const endX = toBox.x + toBox.width / 2;
  const endY = toBox.y + toBox.height / 2;

  await page.mouse.move(startX, startY);
  await page.mouse.down();

  // 20 steps ≫ 6 px activation threshold — gives dnd-kit plenty of
  // pointermove events to register the drag start before we reach the target.
  const steps = 20;
  for (let i = 1; i <= steps; i++) {
    await page.mouse.move(
      startX + (endX - startX) * (i / steps),
      startY + (endY - startY) * (i / steps),
    );
  }

  await page.mouse.up();
}

// Returns the ordered list of task titles currently shown inside the
// "Pendientes" section of the page.
async function pendingTitlesInDOM(page: Page): Promise<string[]> {
  // Each pending card is a `div.group` inside the first <section> on the page.
  // We read the title <span> (first `.truncate` span child of the card).
  const cards = page.locator('section').first().locator('div.group');
  const count = await cards.count();
  const titles: string[] = [];
  for (let i = 0; i < count; i++) {
    const text = await cards.nth(i).locator('span.truncate').first().textContent();
    titles.push(text?.trim() ?? '');
  }
  return titles;
}

test.describe('Quick tasks — reorder via drag-and-drop', () => {
  test('dragging the last card to the top persists the new order in the backend', async ({
    auth,
  }, testInfo) => {
    // ------------------------------------------------------------------
    // 1. Seed: create tasks A, B, C via the API (isolated by testId).
    // ------------------------------------------------------------------
    const suffix = testInfo.testId;
    const titleA = `Tarea A ${suffix}`;
    const titleB = `Tarea B ${suffix}`;
    const titleC = `Tarea C ${suffix}`;

    const taskA = await createQuickTask(auth.api, { title: titleA });
    const taskB = await createQuickTask(auth.api, { title: titleB });
    const taskC = await createQuickTask(auth.api, { title: titleC });

    try {
      // ----------------------------------------------------------------
      // 2. Navigate and verify initial order: A → B → C.
      // ----------------------------------------------------------------
      await auth.page.goto('/quick-tasks');
      // Wait for the list to render.
      await expect(auth.page.locator('div.group', { hasText: titleA }).first()).toBeVisible();

      const initialOrder = await pendingTitlesInDOM(auth.page);
      // The API returns tasks ordered by position; the three tasks we just
      // created should appear in creation order A, B, C.
      expect(initialOrder).toEqual([titleA, titleB, titleC]);

      // ----------------------------------------------------------------
      // 3. Drag C (bottom) to the top, above A.
      //    The drag handle is the GripVertical button (aria-label="Reordenar").
      // ----------------------------------------------------------------
      const cardA = auth.page.locator('div.group', { hasText: titleA }).first();
      const cardC = auth.page.locator('div.group', { hasText: titleC }).first();

      const handleC = cardC.getByRole('button', { name: /reordenar/i });
      const handleA = cardA.getByRole('button', { name: /reordenar/i });

      await dragByPointer(auth.page, handleC, handleA);

      // ----------------------------------------------------------------
      // 4. Wait for UI to reflect the new order: C → A → B.
      //    dnd-kit applies an optimistic update on drop, so the DOM should
      //    update without a network round-trip.
      // ----------------------------------------------------------------
      await expect
        .poll(async () => pendingTitlesInDOM(auth.page), {
          message: 'UI did not reorder tasks to C → A → B within timeout',
          timeout: 5_000,
        })
        .toEqual([titleC, titleA, titleB]);

      // ----------------------------------------------------------------
      // 5. Verify that the backend persisted the new order.
      //    Give the mutation a moment to finish (optimistic update is
      //    instant, but the PATCH request is async).
      // ----------------------------------------------------------------
      await expect
        .poll(
          async () => {
            const tasks = await listQuickTasks(auth.api);
            // Filter only our three test tasks and return their titles in
            // position order.
            return tasks
              .filter((t) => [taskA.id, taskB.id, taskC.id].includes(t.id))
              .map((t) => t.title);
          },
          {
            message: 'Backend did not persist order C → A → B within timeout',
            timeout: 5_000,
            intervals: [500, 500, 1_000, 1_000],
          },
        )
        .toEqual([titleC, titleA, titleB]);
    } finally {
      // ----------------------------------------------------------------
      // 6. Cleanup — always runs, even if the test fails.
      // ----------------------------------------------------------------
      await deleteQuickTask(auth.api, taskA.id);
      await deleteQuickTask(auth.api, taskB.id);
      await deleteQuickTask(auth.api, taskC.id);
    }
  });
});
