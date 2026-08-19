import { type APIRequestContext, type Page } from '@playwright/test';

import { expect, test } from '../fixtures/authenticated-page';
import { createChore } from '../helpers/chores-api';

/**
 * Geometry of the portalled row-actions menu.
 *
 * This is the one behaviour vitest cannot reach: jsdom has no layout engine,
 * so `getBoundingClientRect` is all zeros there and every assertion below
 * would pass vacuously. Flip-up, viewport clamping and escaping the table's
 * scroll container only mean anything in a browser that actually lays out.
 *
 * The bug being guarded: the menu used to render inside the table, so the
 * table's `overflow` clipped it — the last row's menu was cut off or
 * invisible entirely.
 */
test.describe('Row actions menu — geometry', () => {
  /** Enough rows that the last one sits near the bottom of the viewport. */
  const ROW_COUNT = 14;

  async function seedAndOpenTable(auth: { api: APIRequestContext; page: Page }, testId: string) {
    for (let i = 0; i < ROW_COUNT; i++) {
      await createChore(auth.api, {
        name: `Quehacer ${i.toString().padStart(2, '0')} ${testId}`,
        // Spread the due dates so the list is not one homogeneous status block.
        intervalValue: i + 1,
        intervalUnit: 'weeks',
      });
    }

    // The view mode is a localStorage preference; set it before the app reads
    // it rather than clicking the toggle, so the test is about geometry and
    // not about the toggle.
    await auth.page.addInitScript(() => {
      window.localStorage.setItem('habit-sumaq:view-mode:chores', 'table');
    });

    await auth.page.goto('/chores');
    await expect(auth.page.getByRole('table')).toBeVisible();
  }

  test('opens the last row upwards so it is never cut off at the bottom', async ({
    auth,
  }, testInfo) => {
    await seedAndOpenTable(auth, testInfo.testId);

    const triggers = auth.page.getByRole('button', { name: /acciones/i });
    const lastTrigger = triggers.last();
    await lastTrigger.scrollIntoViewIfNeeded();

    const triggerBox = await lastTrigger.boundingBox();
    expect(triggerBox, 'the last row must have an actions trigger').not.toBeNull();

    await lastTrigger.click();
    const menu = auth.page.getByRole('menu');
    await expect(menu).toBeVisible();

    const menuBox = await menu.boundingBox();
    expect(menuBox).not.toBeNull();

    // Flipped: the menu sits ABOVE the trigger, not below it.
    expect(menuBox!.y + menuBox!.height).toBeLessThanOrEqual(triggerBox!.y + 1);
  });

  test('opens the first row downwards, where there is room', async ({ auth }, testInfo) => {
    await seedAndOpenTable(auth, testInfo.testId);

    const firstTrigger = auth.page.getByRole('button', { name: /acciones/i }).first();
    const triggerBox = await firstTrigger.boundingBox();

    await firstTrigger.click();
    const menu = auth.page.getByRole('menu');
    await expect(menu).toBeVisible();

    const menuBox = await menu.boundingBox();
    expect(menuBox!.y).toBeGreaterThanOrEqual(triggerBox!.y + triggerBox!.height - 1);
  });

  test('renders outside the table so the scroll container cannot clip it', async ({
    auth,
  }, testInfo) => {
    await seedAndOpenTable(auth, testInfo.testId);

    await auth.page
      .getByRole('button', { name: /acciones/i })
      .last()
      .click();
    const menu = auth.page.getByRole('menu');
    await expect(menu).toBeVisible();

    // The actual invariant behind the fix: the menu is NOT a descendant of the
    // table, so no ancestor's `overflow` applies to it.
    const insideTable = await menu.evaluate((el) => el.closest('table') !== null);
    expect(insideTable, 'the menu must be portalled out of the table').toBe(false);
  });

  test('stays inside the viewport horizontally', async ({ auth }, testInfo) => {
    // Narrow enough that a right-aligned menu would hang off the left edge
    // without the clamp.
    await auth.page.setViewportSize({ width: 800, height: 700 });
    await seedAndOpenTable(auth, testInfo.testId);

    await auth.page
      .getByRole('button', { name: /acciones/i })
      .last()
      .click();
    const menu = auth.page.getByRole('menu');
    await expect(menu).toBeVisible();

    const menuBox = await menu.boundingBox();
    const viewport = auth.page.viewportSize()!;

    expect(menuBox!.x).toBeGreaterThanOrEqual(0);
    expect(menuBox!.x + menuBox!.width).toBeLessThanOrEqual(viewport.width);
  });

  test('follows the trigger when the page scrolls', async ({ auth }, testInfo) => {
    await seedAndOpenTable(auth, testInfo.testId);

    const trigger = auth.page.getByRole('button', { name: /acciones/i }).first();
    await trigger.click();
    const menu = auth.page.getByRole('menu');
    await expect(menu).toBeVisible();

    const before = await menu.boundingBox();
    await auth.page.mouse.wheel(0, 300);
    // Give the scroll listener a frame to reposition.
    await auth.page.waitForTimeout(200);

    // The component repositions on scroll rather than closing (a `scroll`
    // listener in capture phase, so inner containers count too). So this is
    // asserted unconditionally — wrapping it in an `isVisible()` check would
    // let the test pass silently if the menu ever started closing instead.
    await expect(menu).toBeVisible();

    const after = await menu.boundingBox();
    const triggerBox = await trigger.boundingBox();

    // It moved with the page...
    expect(after!.y).not.toBe(before!.y);
    // ...and it is still glued to its trigger, not floating where the row
    // used to be. That drift is exactly what `position: fixed` causes without
    // the scroll listener.
    expect(Math.abs(after!.y - (triggerBox!.y + triggerBox!.height))).toBeLessThan(80);
  });
});
