#!/usr/bin/env node
/**
 * sync-public.mjs - Sync generated/ and vendor assets to public/
 * 
 * Copies all build outputs from generated/ to public/generated/
 * and vendor assets (props/tilesets/ui) to public/assets/
 * so they're available at runtime via Phaser loaders.
 * 
 * IMPORTANT: Merges into destination instead of replacing, so committed
 * assets in public/ are preserved when vendor sources don't exist.
 */

import { promises as fs } from "node:fs";
import path from "node:path";

const GENERATED_SRC = path.resolve("generated");
const GENERATED_DST = path.resolve("public", "generated");

const PROPS_SRC = path.resolve("vendor", "props");
const PROPS_DST = path.resolve("public", "assets", "props");

const TILESETS_SRC = path.resolve("vendor", "tilesets");
const TILESETS_DST = path.resolve("public", "assets", "tilesets");
const UI_SRC = path.resolve("vendor", "ui");
const UI_DST = path.resolve("public", "assets", "ui");

async function copyDir(src, dst) {
  await fs.mkdir(dst, { recursive: true });
  const entries = await fs.readdir(src, { withFileTypes: true });
  for (const e of entries) {
    const s = path.join(src, e.name);
    const d = path.join(dst, e.name);
    if (e.isDirectory()) {
      await copyDir(s, d);
    } else if (e.isFile()) {
      await fs.copyFile(s, d);
    }
  }
}

/** Check if directory exists */
async function dirExists(p) {
  return fs.access(p).then(() => true).catch(() => false);
}

/** Sync src -> dst, merging instead of replacing. Only syncs if src exists. */
async function syncDir(src, dst, label) {
  if (await dirExists(src)) {
    await copyDir(src, dst);
    console.log(`✅ Synced ${label}: ${src} -> ${dst}`);
    return true;
  } else {
    console.warn(`⚠️ sync:public skipped ${label} (missing ${src})`);
    return false;
  }
}

try {
  // Sync generated/ -> public/generated/ (this one replaces since it's all generated)
  if (await dirExists(GENERATED_SRC)) {
    await fs.rm(GENERATED_DST, { recursive: true, force: true });
    await copyDir(GENERATED_SRC, GENERATED_DST);
    console.log(`✅ Synced generated: ${GENERATED_SRC} -> ${GENERATED_DST}`);
  } else {
    console.warn(`⚠️ sync:public skipped generated (missing ${GENERATED_SRC})`);
  }

  // Sync vendor dirs -> public/assets/ (merge, preserving committed assets)
  await syncDir(PROPS_SRC, PROPS_DST, "props");
  await syncDir(TILESETS_SRC, TILESETS_DST, "tilesets");
  await syncDir(UI_SRC, UI_DST, "ui");

} catch (e) {
  console.error(`❌ sync:public failed:`, e.message);
  throw e;
}
