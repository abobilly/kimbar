#!/usr/bin/env node
/**
 * sync-public.mjs - Sync private assets and generated content to public/
 * 
 * Copies:
 * - private/assets/ -> public/assets/ (static assets)
 * - private/generated/ -> public/generated/ (build outputs)
 * - content/tilesets/ -> public/content/tilesets/ (tileset metadata)
 * 
 * private/ is the source folder, public/ is what Vite serves.
 */

import { promises as fs } from "node:fs";
import path from "node:path";

const ASSETS_SRC = path.resolve("private", "assets");
const ASSETS_DST = path.resolve("public", "assets");

const GENERATED_SRC = path.resolve("private", "generated");
const GENERATED_DST = path.resolve("public", "generated");

const TILESET_CONTENT_SRC = path.resolve("content", "tilesets");
const TILESET_CONTENT_DST = path.resolve("public", "content", "tilesets");

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
  // Sync assets/ -> public/assets/ (replace to ensure clean state)
  if (await dirExists(ASSETS_SRC)) {
    await fs.rm(ASSETS_DST, { recursive: true, force: true });
    await copyDir(ASSETS_SRC, ASSETS_DST);
    console.log(`✅ Synced assets: ${ASSETS_SRC} -> ${ASSETS_DST}`);
  } else {
    console.warn(`⚠️ sync:public skipped assets (missing ${ASSETS_SRC})`);
  }

  // Sync generated/ -> public/generated/ (replace since it's all generated)
  if (await dirExists(GENERATED_SRC)) {
    await fs.rm(GENERATED_DST, { recursive: true, force: true });
    await copyDir(GENERATED_SRC, GENERATED_DST);
    console.log(`✅ Synced generated: ${GENERATED_SRC} -> ${GENERATED_DST}`);
  } else {
    console.warn(`⚠️ sync:public skipped generated (missing ${GENERATED_SRC})`);
  }

  // Sync tileset content metadata
  await syncDir(TILESET_CONTENT_SRC, TILESET_CONTENT_DST, "tileset content");

} catch (e) {
  console.error(`❌ sync:public failed:`, e.message);
  throw e;
}
