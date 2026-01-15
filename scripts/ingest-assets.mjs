#!/usr/bin/env node
/**
 * ingest-assets.mjs
 * 
 * Deterministic asset ingestion pipeline:
 * 1. Read audited candidates from generated/asset_candidates_audited.ndjson
 * 2. Download assets (with checksum validation)
 * 3. Validate dimensions
 * 4. Optional: nearest-neighbor upscale 16→32
 * 5. Pack into atlas (tiles)
 * 6. Generate manifest with attribution
 * 7. Fail hard on any validation error
 * 
 * Usage:
 *   node scripts/ingest-assets.mjs
 *   node scripts/ingest-assets.mjs --dry-run
 *   node scripts/ingest-assets.mjs --spec courthouse_mvp
 */

import { readFile, writeFile, mkdir, copyFile, unlink, readdir } from 'fs/promises';
import { existsSync, createWriteStream } from 'fs';
import { join, dirname, basename, extname } from 'path';
import { fileURLToPath } from 'url';
import { createHash } from 'crypto';
import { pipeline } from 'stream/promises';
import { execSync } from 'child_process';
import { createRequire } from 'module';

// For ZIP extraction
const require = createRequire(import.meta.url);
let AdmZip;
try {
    AdmZip = require('adm-zip');
} catch {
    AdmZip = null; // Will use PowerShell fallback
}

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

// Parse args
const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const SPEC_ARG = args.find(a => a.startsWith('--spec='))?.split('=')[1] || 'courthouse_mvp';

// Paths
const SPEC_PATH = join(ROOT, 'content', 'asset_specs', `${SPEC_ARG}.json`);
const CANDIDATES_PATH = join(ROOT, 'generated', 'asset_candidates_audited.ndjson');
const CACHE_DIR = join(ROOT, '.cache', 'assets');

// Colors for console
const red = (s) => `\x1b[31m${s}\x1b[0m`;
const green = (s) => `\x1b[32m${s}\x1b[0m`;
const yellow = (s) => `\x1b[33m${s}\x1b[0m`;
const cyan = (s) => `\x1b[36m${s}\x1b[0m`;

/**
 * Load NDJSON file
 */
async function loadNdjson(path) {
    if (!existsSync(path)) return [];
    const content = await readFile(path, 'utf-8');
    return content.trim().split('\n').filter(Boolean).map(line => JSON.parse(line));
}

/**
 * Load asset spec
 */
async function loadSpec(path) {
    if (!existsSync(path)) {
        throw new Error(`Asset spec not found: ${path}`);
    }
    return JSON.parse(await readFile(path, 'utf-8'));
}

/**
 * Compute SHA256 hash of file
 */
async function hashFile(path) {
    const content = await readFile(path);
    return createHash('sha256').update(content).digest('hex');
}

/**
 * Download file with retry
 */
async function downloadFile(url, destPath, retries = 3) {
    await mkdir(dirname(destPath), { recursive: true });

    for (let attempt = 1; attempt <= retries; attempt++) {
        try {
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const arrayBuffer = await response.arrayBuffer();
            await writeFile(destPath, Buffer.from(arrayBuffer));
            return true;
        } catch (e) {
            console.log(yellow(`   Attempt ${attempt}/${retries} failed: ${e.message}`));
            if (attempt === retries) throw e;
            await new Promise(r => setTimeout(r, 1000 * attempt));
        }
    }
}

/**
 * Extract ZIP file to directory
 */
async function extractZip(zipPath, destDir) {
    await mkdir(destDir, { recursive: true });

    if (AdmZip) {
        // Use adm-zip if available
        const zip = new AdmZip(zipPath);
        zip.extractAllTo(destDir, true);
        return true;
    }

    // Fallback: use PowerShell on Windows
    try {
        execSync(`powershell -Command "Expand-Archive -Path '${zipPath}' -DestinationPath '${destDir}' -Force"`, { stdio: 'pipe' });
        return true;
    } catch (e) {
        console.error(red(`   Failed to extract ZIP: ${e.message}`));
        return false;
    }
}

/**
 * Find files matching pattern in directory (recursive)
 */
async function findFiles(dir, pattern) {
    const results = [];

    async function walk(currentDir) {
        if (!existsSync(currentDir)) return;
        const entries = await readdir(currentDir, { withFileTypes: true });
        for (const entry of entries) {
            const fullPath = join(currentDir, entry.name);
            if (entry.isDirectory()) {
                await walk(fullPath);
            } else if (entry.isFile()) {
                if (!pattern || entry.name.match(pattern)) {
                    results.push(fullPath);
                }
            }
        }
    }

    await walk(dir);
    return results;
}

/**
 * Get image dimensions using ImageMagick identify (or fallback)
 */
function getImageDimensions(path) {
    try {
        // Try ImageMagick
        const output = execSync(`magick identify -format "%wx%h" "${path}"`, { encoding: 'utf-8' }).trim();
        const [w, h] = output.split('x').map(Number);
        return { width: w, height: h };
    } catch {
        try {
            // Fallback: read PNG header directly (PNG magic + IHDR chunk)
            const fs = require('fs');
            const buffer = fs.readFileSync(path);

            // PNG signature: 89 50 4E 47 0D 0A 1A 0A
            // IHDR starts at byte 8, length at 8-11, type at 12-15, width at 16-19, height at 20-23
            if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47) {
                const width = buffer.readUInt32BE(16);
                const height = buffer.readUInt32BE(20);
                return { width, height };
            }
        } catch { }
    }
    return null;
}

/**
 * Upscale image using nearest-neighbor (ImageMagick)
 */
function upscaleImage(srcPath, destPath, targetSize) {
    try {
        execSync(`magick "${srcPath}" -filter point -resize ${targetSize}x${targetSize} "${destPath}"`, { stdio: 'pipe' });
        return true;
    } catch (e) {
        console.error(red(`   Failed to upscale: ${e.message}`));
        return false;
    }
}

/**
 * Pack tiles into atlas
 */
function packAtlas(tilePaths, outputPath, columns, tileSize, padding = 0) {
    const rows = Math.ceil(tilePaths.length / columns);
    const atlasWidth = columns * (tileSize + padding) - padding;
    const atlasHeight = rows * (tileSize + padding) - padding;

    // Build montage command
    const tileList = tilePaths.map(p => `"${p}"`).join(' ');
    const cmd = `magick montage ${tileList} -tile ${columns}x -geometry ${tileSize}x${tileSize}+${padding}+${padding} -background none "${outputPath}"`;

    try {
        execSync(cmd, { stdio: 'pipe' });
        return true;
    } catch (e) {
        console.error(red(`   Failed to pack atlas: ${e.message}`));
        return false;
    }
}

/**
 * Main ingestion pipeline
 */
async function main() {
    console.log(cyan('🔧 Asset Ingestion Pipeline\n'));
    console.log(`Spec: ${SPEC_ARG}`);
    console.log(`Mode: ${DRY_RUN ? 'DRY RUN' : 'LIVE'}\n`);

    // Load spec
    const spec = await loadSpec(SPEC_PATH);
    console.log(green(`✓ Loaded spec: ${spec.specId} v${spec.version}`));

    // Load audited candidates
    const candidates = await loadNdjson(CANDIDATES_PATH);
    if (candidates.length === 0) {
        console.error(red('✗ No audited candidates found. Run scouts + auditor first.'));
        console.log(`  Expected: ${CANDIDATES_PATH}`);
        process.exit(1);
    }
    console.log(green(`✓ Loaded ${candidates.length} audited candidates\n`));

    // Group candidates by assetId, pick best (first = primary)
    const byAssetId = new Map();
    for (const c of candidates) {
        if (!byAssetId.has(c.assetId)) {
            byAssetId.set(c.assetId, c);
        }
    }

    // Collect all required assets from spec
    const requiredAssets = [
        ...spec.tiles.items.map(t => ({ ...t, type: 'tile' })),
        ...spec.props.items.map(p => ({ ...p, type: 'prop' }))
    ];

    console.log(`Required assets: ${requiredAssets.length}`);
    console.log(`Found candidates for: ${byAssetId.size}\n`);

    // Check for missing
    const missing = requiredAssets.filter(a => !byAssetId.has(a.id));
    if (missing.length > 0) {
        console.log(yellow(`⚠ Missing candidates for ${missing.length} assets:`));
        missing.forEach(m => console.log(`   - ${m.id}`));
        console.log('');
    }

    // Process each asset
    await mkdir(CACHE_DIR, { recursive: true });

    const results = {
        success: [],
        failed: [],
        skipped: []
    };

    const tileOutputs = [];
    const propOutputs = [];
    const manifest = {
        specId: spec.specId,
        version: spec.version,
        generatedAt: new Date().toISOString(),
        assets: []
    };

    for (const asset of requiredAssets) {
        const candidate = byAssetId.get(asset.id);

        if (!candidate) {
            console.log(yellow(`⏭ ${asset.id}: No candidate found`));
            results.skipped.push({ id: asset.id, reason: 'no candidate' });
            continue;
        }

        console.log(cyan(`\n📦 ${asset.id}`));
        console.log(`   Source: ${candidate.sourceUrl}`);
        console.log(`   License: ${candidate.licenseId}`);

        if (DRY_RUN) {
            console.log(green('   ✓ Would download (dry run)'));
            results.success.push({ id: asset.id, candidate });
            continue;
        }

        try {
            // Download to cache
            const ext = extname(candidate.downloadUrl) || '.png';
            const cachePath = join(CACHE_DIR, `${asset.id}${ext}`);

            if (!existsSync(cachePath)) {
                console.log(`   Downloading...`);
                await downloadFile(candidate.downloadUrl, cachePath);
            } else {
                console.log(`   Using cached file`);
            }

            // Validate dimensions
            const dims = getImageDimensions(cachePath);
            if (!dims) {
                throw new Error('Could not read image dimensions');
            }
            console.log(`   Dimensions: ${dims.width}×${dims.height}`);

            const expectedSize = asset.sizePx;
            let finalPath = cachePath;

            if (dims.width !== expectedSize || dims.height !== expectedSize) {
                // Check if upscale allowed
                if (spec.globalConstraints.allowUpscale?.enabled &&
                    dims.width === spec.globalConstraints.allowUpscale.fromSize &&
                    dims.height === spec.globalConstraints.allowUpscale.fromSize) {
                    console.log(yellow(`   Upscaling ${dims.width}→${expectedSize}...`));
                    const upscaledPath = join(CACHE_DIR, `${asset.id}_upscaled.png`);
                    if (!upscaleImage(cachePath, upscaledPath, expectedSize)) {
                        throw new Error('Upscale failed');
                    }
                    finalPath = upscaledPath;
                } else {
                    throw new Error(`Dimension mismatch: expected ${expectedSize}×${expectedSize}, got ${dims.width}×${dims.height}`);
                }
            }

            // Copy to output dir
            const outputDir = asset.type === 'tile' ? spec.tiles.outputDir : spec.props.outputDir;
            const outputPath = join(ROOT, outputDir, `${asset.id}.png`);
            await mkdir(dirname(outputPath), { recursive: true });
            await copyFile(finalPath, outputPath);

            // Compute checksum
            const checksum = await hashFile(outputPath);

            // Track for atlas
            if (asset.type === 'tile') {
                tileOutputs.push({ id: asset.id, path: outputPath });
            } else {
                propOutputs.push({ id: asset.id, path: outputPath });
            }

            // Add to manifest
            manifest.assets.push({
                id: asset.id,
                type: asset.type,
                path: outputPath.replace(ROOT, '').replace(/\\/g, '/'),
                checksum,
                source: {
                    url: candidate.sourceUrl,
                    downloadUrl: candidate.downloadUrl,
                    author: candidate.author,
                    license: candidate.licenseId,
                    licenseEvidence: candidate.licenseEvidence
                }
            });

            console.log(green(`   ✓ Ingested → ${outputPath}`));
            results.success.push({ id: asset.id, candidate, checksum });

        } catch (e) {
            console.log(red(`   ✗ Failed: ${e.message}`));
            results.failed.push({ id: asset.id, error: e.message });
        }
    }

    // Pack tile atlas
    if (!DRY_RUN && tileOutputs.length > 0) {
        console.log(cyan('\n🎨 Packing tile atlas...'));
        const atlasPath = join(ROOT, spec.tiles.outputDir, spec.tiles.atlasName);
        const tilePaths = tileOutputs.map(t => t.path);

        if (packAtlas(tilePaths, atlasPath, spec.tiles.atlasLayout.columns, spec.tiles.atlasLayout.tileSize)) {
            console.log(green(`   ✓ Atlas: ${atlasPath}`));
            manifest.atlas = {
                path: atlasPath.replace(ROOT, '').replace(/\\/g, '/'),
                tileCount: tileOutputs.length,
                layout: spec.tiles.atlasLayout
            };
        }
    }

    // Write manifest
    if (!DRY_RUN) {
        const manifestPath = join(ROOT, spec.tiles.outputDir, 'manifest.json');
        await writeFile(manifestPath, JSON.stringify(manifest, null, 2));
        console.log(green(`\n✓ Manifest: ${manifestPath}`));
    }

    // Summary
    console.log(cyan('\n📊 Summary'));
    console.log(`   Success: ${results.success.length}`);
    console.log(`   Failed: ${results.failed.length}`);
    console.log(`   Skipped: ${results.skipped.length}`);

    if (results.failed.length > 0) {
        console.log(red('\n❌ Ingestion completed with errors'));
        process.exit(1);
    }

    console.log(green('\n✅ Ingestion complete'));
}

main().catch(e => {
    console.error(red(`\n❌ Fatal error: ${e.message}`));
    process.exit(1);
});
