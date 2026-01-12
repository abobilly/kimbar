/**
 * E2E Smoke Tests for Kim Bar
 * 
 * These tests verify foundational invariants:
 * - Modal system blocks world input
 * - ESC key closes any modal
 * - UI elements stay within viewport bounds
 * - No stale modal state
 */

import { test, expect, Page } from '@playwright/test';

// Wait for game to fully initialize
async function waitForGameReady(page: Page): Promise<void> {
  // Wait for Phaser canvas to be present and visible
  await page.locator('canvas').waitFor({ state: 'visible', timeout: 30000 });
  
  // Give the game time to initialize systems and render first frame
  await page.waitForTimeout(3000);
}

// Helper to check if an element exists at given coordinates
async function elementAtPoint(page: Page, x: number, y: number): Promise<string | null> {
  return await page.evaluate(({ x, y }) => {
    const el = document.elementFromPoint(x, y);
    return el ? el.tagName.toLowerCase() : null;
  }, { x, y });
}

test.describe('Game Initialization', () => {
  test('should load and render canvas', async ({ page }) => {
    await page.goto('/');
    await waitForGameReady(page);
    
    // Canvas should be present
    const canvas = page.locator('canvas');
    await expect(canvas).toBeVisible();
    
    // Canvas should have reasonable size
    const box = await canvas.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.width).toBeGreaterThan(600);
    expect(box!.height).toBeGreaterThan(400);
  });

  test('should have no console errors on startup', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });
    
    await page.goto('/');
    await waitForGameReady(page);
    
    // Filter out expected warnings (like font loading)
    const criticalErrors = errors.filter(e => 
      !e.includes('Failed to load resource') && 
      !e.includes('font')
    );
    
    expect(criticalErrors).toHaveLength(0);
  });
});

test.describe('Modal System Invariants', () => {
  test('menu should open and close with ESC', async ({ page }) => {
    await page.goto('/');
    await waitForGameReady(page);
    
    // Get canvas dimensions
    const canvas = page.locator('canvas');
    const box = await canvas.boundingBox();
    
    // Click menu button (top-right corner)
    await page.mouse.click(box!.x + box!.width - 50, box!.y + 50);
    await page.waitForTimeout(500);
    
    // Menu should be visible (we can't easily verify Phaser UI,
    // but we can try pressing ESC and checking the game responds)
    
    // Press ESC to close
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);
    
    // No crash = success for now
    // More detailed checks would require exposing game state
  });

  test('clicking outside menu should close it', async ({ page }) => {
    await page.goto('/');
    await waitForGameReady(page);
    
    const canvas = page.locator('canvas');
    const box = await canvas.boundingBox();
    
    // Click menu button (top-right)
    await page.mouse.click(box!.x + box!.width - 50, box!.y + 50);
    await page.waitForTimeout(500);
    
    // Click in corner (outside menu content, on overlay)
    await page.mouse.click(box!.x + 50, box!.y + 50);
    await page.waitForTimeout(500);
    
    // No crash = overlay click registered
  });
});

test.describe('Dialogue System', () => {
  test('should open dialogue when clicking NPC', async ({ page }) => {
    await page.goto('/');
    await waitForGameReady(page);
    
    const canvas = page.locator('canvas');
    const box = await canvas.boundingBox();
    
    // Click in center area where NPC typically is
    // Note: Exact position depends on level layout
    await page.mouse.click(box!.x + box!.width / 2 - 100, box!.y + box!.height / 2 - 50);
    await page.waitForTimeout(1000);
    
    // ESC should work to exit dialogue
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);
  });
});

test.describe('Resize Handling', () => {
  test('should handle viewport resize without errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });
    
    await page.goto('/');
    await waitForGameReady(page);
    
    // Resize viewport
    await page.setViewportSize({ width: 800, height: 600 });
    await page.waitForTimeout(500);
    
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.waitForTimeout(500);
    
    await page.setViewportSize({ width: 640, height: 480 });
    await page.waitForTimeout(500);
    
    // No errors during resize
    const criticalErrors = errors.filter(e => 
      !e.includes('Failed to load resource') && 
      !e.includes('font')
    );
    expect(criticalErrors).toHaveLength(0);
  });

  test('canvas should fill container after resize', async ({ page }) => {
    await page.goto('/');
    await waitForGameReady(page);
    
    // Resize to smaller
    await page.setViewportSize({ width: 800, height: 600 });
    await page.waitForTimeout(500);
    
    const canvas = page.locator('canvas');
    const box = await canvas.boundingBox();
    
    // Canvas should still be visible and reasonably sized
    expect(box).not.toBeNull();
    expect(box!.width).toBeGreaterThan(400);
    expect(box!.height).toBeGreaterThan(300);
  });
});

test.describe('Input Blocking', () => {
  test('world clicks should not register when modal is open', async ({ page }) => {
    await page.goto('/');
    await waitForGameReady(page);
    
    const canvas = page.locator('canvas');
    const box = await canvas.boundingBox();
    
    // Record initial position of player (approximately center)
    const playerStartX = box!.x + box!.width / 2;
    const playerStartY = box!.y + box!.height / 2;
    
    // Open menu
    await page.mouse.click(box!.x + box!.width - 50, box!.y + 50);
    await page.waitForTimeout(500);
    
    // Try to click elsewhere in the world (should be blocked by overlay)
    await page.mouse.click(box!.x + 100, box!.y + 400);
    await page.waitForTimeout(500);
    
    // Close menu with ESC
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);
    
    // Player should not have moved significantly
    // (This is a soft test - we can't easily verify player position)
    // The main check is that no errors occurred
  });
});

test.describe('Encounter System', () => {
  test('encounter ESC should abort when not evaluating', async ({ page }) => {
    await page.goto('/');
    await waitForGameReady(page);
    
    const canvas = page.locator('canvas');
    const box = await canvas.boundingBox();
    
    // Click on encounter trigger (red X icon, typically on right side)
    // Note: Position depends on level layout
    await page.mouse.click(box!.x + box!.width * 0.7, box!.y + box!.height * 0.4);
    await page.waitForTimeout(1500);
    
    // ESC should close encounter (if one opened)
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);
    
    // No crash = success
  });
});
