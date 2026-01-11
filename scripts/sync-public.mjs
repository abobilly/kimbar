#!/usr/bin/env node
/**
 * sync-public.mjs - Sync generated/ to public/generated/
 * 
 * Copies all build outputs from generated/ to public/generated/
 * so they're available at runtime via Phaser loaders.
 */

import { promises as fs } from "node:fs";
import path from "node:path";

const SRC = path.resolve("generated");
const DST = path.resolve("public", "generated");

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
  await fs.rm(DST, { recursive: true, force: true });
  await copyDir(SRC, DST);
  console.log(`✅ Synced ${SRC} -> ${DST}`);
} catch (e) {
  // Allow dev server to run even if generated/ doesn't exist yet
  if (e.code === 'ENOENT') {
    console.warn(`⚠️ sync:public skipped (missing ${SRC})`);
  } else {
    throw e;
  }
}
