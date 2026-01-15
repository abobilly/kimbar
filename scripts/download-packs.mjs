#!/usr/bin/env node
/**
 * download-packs.mjs
 * 
 * Downloads audited asset packs to cache. Separate from tile extraction.
 * 
 * Usage:
 *   node scripts/download-packs.mjs
 */

import { readFile, writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { join, dirname, extname } from 'path';
import { fileURLToPath } from 'url';
import { createHash } from 'crypto';
import { execSync } from 'child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const CACHE_DIR = join(ROOT, '.cache', 'asset-packs');
const AUDITED_PATH = join(ROOT, 'tmp', 'asset_candidates_audited.ndjson');

const red = (s) => `\x1b[31m${s}\x1b[0m`;
const green = (s) => `\x1b[32m${s}\x1b[0m`;
const yellow = (s) => `\x1b[33m${s}\x1b[0m`;
const cyan = (s) => `\x1b[36m${s}\x1b[0m`;

async function loadNdjson(path) {
    if (!existsSync(path)) return [];
    const content = await readFile(path, 'utf-8');
    return content.trim().split('\n').filter(Boolean).map(line => JSON.parse(line));
}

async function downloadFile(url, destPath) {
    await mkdir(dirname(destPath), { recursive: true });

    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    await writeFile(destPath, Buffer.from(arrayBuffer));
    return true;
}

async function extractZip(zipPath, destDir) {
    await mkdir(destDir, { recursive: true });
    try {
        execSync(`powershell -Command "Expand-Archive -Path '${zipPath}' -DestinationPath '${destDir}' -Force"`, { stdio: 'pipe' });
        return true;
    } catch (e) {
        console.error(red(`   Failed to extract: ${e.message}`));
        return false;
    }
}

async function main() {
    console.log(cyan('📦 Asset Pack Downloader\n'));

    const candidates = await loadNdjson(AUDITED_PATH);
    if (candidates.length === 0) {
        console.error(red('No audited candidates found at ' + AUDITED_PATH));
        process.exit(1);
    }

    console.log(`Found ${candidates.length} audited packs\n`);
    await mkdir(CACHE_DIR, { recursive: true });

    const results = { success: [], failed: [] };

    for (const pack of candidates) {
        const { assetId, downloadUrl } = pack;
        console.log(cyan(`\n📥 ${assetId}`));
        console.log(`   URL: ${downloadUrl}`);

        if (!downloadUrl) {
            console.log(yellow('   ⏭ No download URL'));
            results.failed.push({ assetId, reason: 'no URL' });
            continue;
        }

        const ext = extname(downloadUrl) || '.zip';
        const destPath = join(CACHE_DIR, `${assetId}${ext}`);
        const extractDir = join(CACHE_DIR, assetId);

        try {
            // Download if not cached
            if (!existsSync(destPath)) {
                console.log('   Downloading...');
                await downloadFile(downloadUrl, destPath);
                console.log(green('   ✓ Downloaded'));
            } else {
                console.log('   Using cached file');
            }

            // Extract if ZIP
            if (ext === '.zip' && !existsSync(extractDir)) {
                console.log('   Extracting...');
                await extractZip(destPath, extractDir);
                console.log(green('   ✓ Extracted'));
            }

            results.success.push({ assetId, path: existsSync(extractDir) ? extractDir : destPath });

        } catch (e) {
            console.log(red(`   ✗ ${e.message}`));
            results.failed.push({ assetId, reason: e.message });
        }
    }

    // Summary
    console.log(cyan('\n📊 Summary'));
    console.log(`   Downloaded: ${results.success.length}`);
    console.log(`   Failed: ${results.failed.length}`);

    // List extracted directories
    console.log(cyan('\n📁 Available packs:'));
    for (const s of results.success) {
        console.log(`   ${s.assetId}: ${s.path}`);
    }

    if (results.failed.length > 0) {
        console.log(red('\n⚠ Some downloads failed'));
        process.exit(1);
    }

    console.log(green('\n✅ All packs downloaded'));
}

main().catch(e => {
    console.error(red(`Fatal: ${e.message}`));
    process.exit(1);
});
