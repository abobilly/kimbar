#!/usr/bin/env node
/**
 * capture-visual.mjs - Capture game screenshot for visual review
 * 
 * Usage: node scripts/capture-visual.mjs [room]
 * 
 * Starts dev server, loads game, captures screenshot, and exits.
 * Screenshot saved to test-results/visual-capture.png
 */

import { chromium } from 'playwright';
import { spawn } from 'child_process';
import { existsSync, mkdirSync } from 'fs';

const ROOM = process.argv[2] || 'scotus_lobby';
const OUTPUT = 'test-results/visual-capture.png';
const DEV_PORT = 8080;
const TIMEOUT = 60000;

async function waitForServer(port, maxWait = 30000) {
  const start = Date.now();
  while (Date.now() - start < maxWait) {
    try {
      const res = await fetch(`http://localhost:${port}`);
      if (res.ok) return true;
    } catch { /* not ready yet */ }
    await new Promise(r => setTimeout(r, 500));
  }
  return false;
}

async function main() {
  console.log('📸 Visual Capture Tool\n');

  // Ensure output directory
  if (!existsSync('test-results')) {
    mkdirSync('test-results', { recursive: true });
  }

  // Start dev server
  console.log('🚀 Starting dev server...');
  const server = spawn('npm', ['run', 'dev'], {
    shell: true,
    stdio: 'pipe',
    detached: false
  });

  let serverOutput = '';
  server.stdout?.on('data', d => serverOutput += d.toString());
  server.stderr?.on('data', d => serverOutput += d.toString());

  // Wait for server
  const serverReady = await waitForServer(DEV_PORT);
  if (!serverReady) {
    console.error('❌ Dev server failed to start');
    console.error(serverOutput);
    server.kill();
    process.exit(1);
  }
  console.log('✅ Dev server ready\n');

  // Launch browser
  console.log('🌐 Launching browser...');
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  page.setViewportSize({ width: 1280, height: 720 });

  try {
    // Navigate to game
    console.log('🎮 Loading game...');
    await page.goto(`http://localhost:${DEV_PORT}`);
    
    // Wait for canvas
    await page.locator('canvas').waitFor({ state: 'visible', timeout: TIMEOUT });
    console.log('✅ Canvas loaded');

    // Wait for MainMenu
    await page.waitForTimeout(2000);

    // Click "NEW GAME" to enter WorldScene
    const canvas = page.locator('canvas');
    const box = await canvas.boundingBox();
    if (box) {
      await page.mouse.click(box.x + box.width / 2, box.y + box.height * 0.52);
    }
    console.log('🎯 Clicked NEW GAME');

    // Wait for level to load
    await page.waitForTimeout(4000);

    // Capture screenshot
    console.log('📷 Capturing screenshot...');
    await page.screenshot({ 
      path: OUTPUT,
      fullPage: false 
    });
    console.log(`✅ Saved to ${OUTPUT}\n`);

    // Also capture console output
    const logs: string[] = [];
    page.on('console', msg => logs.push(`[${msg.type()}] ${msg.text()}`));

    // Quick summary
    console.log('📊 Game state:');
    const consoleLogs = await page.evaluate(() => {
      // @ts-ignore - accessing game instance
      const game = window.game;
      if (game?.scene?.scenes) {
        const scenes = game.scene.scenes.map((s: any) => s.scene.key);
        return { scenes, active: game.scene.getScenes(true).map((s: any) => s.scene.key) };
      }
      return null;
    });
    if (consoleLogs) {
      console.log('  Active scenes:', consoleLogs.active?.join(', ') || 'unknown');
    }

  } catch (err) {
    console.error('❌ Error:', err);
  } finally {
    await browser.close();
    server.kill();
    console.log('\n✨ Done! Check', OUTPUT);
  }
}

main().catch(console.error);
