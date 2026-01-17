/**
 * UI Smoke Test with Screenshots
 * 
 * Takes screenshots at key states for visual regression testing.
 * Screenshots saved to artifacts/ui-smoke/
 */

import { test, expect, Page } from '@playwright/test';

const ARTIFACTS_DIR = 'artifacts/ui-smoke';

// Wait for game to be ready using DEV hook
async function waitForKimbarReady(page: Page): Promise<string | null> {
    // Navigate with smoke flag
    await page.goto('/?smoke=1');

    // Wait for canvas
    await page.locator('canvas').waitFor({ state: 'visible', timeout: 30000 });

    // Wait a moment for MainMenu
    await page.waitForTimeout(1500);

    // Click NEW GAME
    const canvas = page.locator('canvas');
    const box = await canvas.boundingBox();
    if (box) {
        await page.mouse.click(box.x + box.width / 2, box.y + box.height * 0.52);
    }

    // Wait for __KIMBAR_READY__ signal
    try {
        await page.waitForFunction(() => (window as any).__KIMBAR_READY__ === true, {
            timeout: 15000
        });
    } catch {
        console.warn('__KIMBAR_READY__ signal not received, continuing anyway');
    }

    await page.waitForTimeout(500);

    // Get scene name if available
    const sceneName = await page.evaluate(() => (window as any).__KIMBAR_SCENE__ || null);
    return sceneName;
}

test.describe('UI Screenshot Smoke Test', () => {
    test('capture initial world state', async ({ page }) => {
        const sceneName = await waitForKimbarReady(page);

        // Screenshot: Initial world view
        await page.screenshot({
            path: `${ARTIFACTS_DIR}/01-world-initial.png`,
            fullPage: false
        });

        console.log(`Scene loaded: ${sceneName || 'unknown'}`);
        expect(sceneName).not.toBeNull();
    });

    test('capture menu open state', async ({ page }) => {
        await waitForKimbarReady(page);

        const canvas = page.locator('canvas');
        const box = await canvas.boundingBox();

        // Click menu button (top-right)
        await page.mouse.click(box!.x + box!.width - 50, box!.y + 50);
        await page.waitForTimeout(500);

        // Screenshot: Menu open
        await page.screenshot({
            path: `${ARTIFACTS_DIR}/02-menu-open.png`,
            fullPage: false
        });

        // Close with ESC
        await page.keyboard.press('Escape');
        await page.waitForTimeout(300);
    });

    test('capture encounter modal', async ({ page }) => {
        await waitForKimbarReady(page);

        // Open encounter via E key (dev mode)
        await page.keyboard.press('e');
        await page.waitForTimeout(1500);

        // Screenshot: Encounter modal
        await page.screenshot({
            path: `${ARTIFACTS_DIR}/03-encounter-modal.png`,
            fullPage: false
        });

        // Close with ESC
        await page.keyboard.press('Escape');
        await page.waitForTimeout(300);
    });

    test('capture zoomed state', async ({ page }) => {
        await waitForKimbarReady(page);

        // Toggle zoom with Z key (dev mode)
        await page.keyboard.press('z');
        await page.waitForTimeout(500);

        // Screenshot: World zoomed (UI should stay normal)
        await page.screenshot({
            path: `${ARTIFACTS_DIR}/04-world-zoomed.png`,
            fullPage: false
        });

        // Reset zoom
        await page.keyboard.press('z');
        await page.waitForTimeout(300);
    });

    test('capture dialogue state', async ({ page }) => {
        await waitForKimbarReady(page);

        const canvas = page.locator('canvas');
        const box = await canvas.boundingBox();

        // Click in center where NPC typically is
        await page.mouse.click(box!.x + box!.width / 2 - 100, box!.y + box!.height / 2 - 50);
        await page.waitForTimeout(1000);

        // Screenshot: Dialogue (if NPC was there)
        await page.screenshot({
            path: `${ARTIFACTS_DIR}/05-dialogue-attempt.png`,
            fullPage: false
        });

        // ESC to close any dialogue
        await page.keyboard.press('Escape');
        await page.waitForTimeout(300);
    });

    test('capture resize behavior', async ({ page }) => {
        await waitForKimbarReady(page);

        // Resize to smaller viewport
        await page.setViewportSize({ width: 800, height: 600 });
        await page.waitForTimeout(500);

        // Screenshot: Small viewport
        await page.screenshot({
            path: `${ARTIFACTS_DIR}/06-viewport-800x600.png`,
            fullPage: false
        });

        // Resize to larger
        await page.setViewportSize({ width: 1280, height: 720 });
        await page.waitForTimeout(500);

        // Screenshot: Large viewport
        await page.screenshot({
            path: `${ARTIFACTS_DIR}/07-viewport-1280x720.png`,
            fullPage: false
        });
    });
});
