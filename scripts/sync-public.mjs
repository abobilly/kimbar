#!/usr/bin/env node
/**
 * sync-public.mjs - Sync generated/ and vendor/props/ to public/
 * 
 * Copies all build outputs from generated/ to public/generated/
 * and procedural props from vendor/props/ to public/assets/props/
 * so they're available at runtime via Phaser loaders.
 */

import { promises as fs } from "node:fs";
import path from "node:path";

const GENERATED_SRC = path.resolve("generated");
const GENERATED_DST = path.resolve("public", "generated");

const PROPS_SRC = path.resolve("vendor", "props");
const PROPS_DST = path.resolve("public", "assets", "props");

const TILESETS_SRC = path.resolve("vendor", "tilesets");
const TILESETS_DST = path.resolve("public", "assets", "tilesets");

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

try {
  // Sync generated/ -> public/generated/
  await fs.rm(GENERATED_DST, { recursive: true, force: true });
  await copyDir(GENERATED_SRC, GENERATED_DST);
  console.log(`✅ Synced ${GENERATED_SRC} -> ${GENERATED_DST}`);

  // Sync vendor/props/ -> public/assets/props/
  try {
    await fs.rm(PROPS_DST, { recursive: true, force: true });
    await copyDir(PROPS_SRC, PROPS_DST);
    console.log(`✅ Synced ${PROPS_SRC} -> ${PROPS_DST}`);
  } catch (e) {
    if (e.code === 'ENOENT') {
      console.warn(`⚠️ sync:public skipped props (missing ${PROPS_SRC})`);
    } else {
      throw e;
    }
  }

  // Sync vendor/tilesets/ -> public/assets/tilesets/
  try {
    await fs.rm(TILESETS_DST, { recursive: true, force: true });
    await copyDir(TILESETS_SRC, TILESETS_DST);
    console.log(`✅ Synced ${TILESETS_SRC} -> ${TILESETS_DST}`);
  } catch (e) {
    if (e.code === 'ENOENT') {
      console.warn(`⚠️ sync:public skipped tilesets (missing ${TILESETS_SRC})`);
    } else {
      throw e;
    }
  }
} catch (e) {
  // Allow dev server to run even if generated/ doesn't exist yet
  if (e.code === 'ENOENT') {
    console.warn(`⚠️ sync:public skipped (missing ${GENERATED_SRC})`);
  } else {
    throw e;
  }
}
