#!/usr/bin/env node
/**
 * Build Asset Index - Scans vendor/ and creates searchable asset index
 *
 * Usage: node scripts/build-asset-index.mjs [options]
 *
 * Options:
 *   --skip-dimensions  Skip image dimension validation (faster)
 *   --fast             Alias for --skip-dimensions
 *   --include-ulpc     Include ULPC files (adds ~50k files, slow)
 *   --manifest-only    Only index files listed in manifests
 *
 * By default, ULPC is EXCLUDED to keep index size manageable.
 * Use --include-ulpc for full asset discovery (takes several minutes).
 *
 * Outputs:
 *   - generated/asset_index.ndjson (passing assets)
 *   - generated/quarantine.ndjson (failing assets)
 */

import { readdir, readFile, writeFile, mkdir, stat } from 'fs/promises';
import { existsSync } from 'fs';
import { join, extname, basename, dirname } from 'path';

const VENDOR_DIR = './vendor';
const GENERATED_DIR = './generated';
const CONTRACT_PATH = './content/content_contract.json';
const ULPC_MANIFEST_PATH = './content/ulpc_manifest.json';
const ARGS = process.argv.slice(2);
const SKIP_DIMENSIONS = ARGS.includes('--skip-dimensions') || ARGS.includes('--fast');
const INCLUDE_ULPC = ARGS.includes('--include-ulpc');
const MANIFEST_ONLY = ARGS.includes('--manifest-only');

// Paths to exclude by default (massive directories that slow down indexing)
// ULPC and extended ULPC contain 50k+ layer files - only needed for sprite generation
const EXCLUDED_PATHS = [
  'vendor/lpc/Universal-LPC-Spritesheet-Character-Generator',
  'vendor/eulpc'
];

// Try to load sharp for image dimension checking
let sharp = null;
if (!SKIP_DIMENSIONS) {
  try {
    sharp = (await import('sharp')).default;
  } catch (e) {
    console.warn('Sharp not available - dimension validation will be skipped');
  }
} else {
  console.log('⚡ Fast mode: skipping dimension validation');
}

async function loadContract() {
  if (!existsSync(CONTRACT_PATH)) {
    return null;
  }
  const content = await readFile(CONTRACT_PATH, 'utf-8');
  return JSON.parse(content);
}

function normalizePath(filePath) {
  return filePath.replace(/\\/g, '/').replace(/^\.\//, '');
}

function globToRegExp(glob) {
  const escaped = glob
    .replace(/[.+^${}()|[\]\\]/g, '\\$&')
    .replace(/\*\*/g, '__GLOBSTAR__')
    .replace(/\*/g, '[^/]*')
    .replace(/__GLOBSTAR__/g, '.*')
    .replace(/\?/g, '.');
  return new RegExp(`^${escaped}$`);
}

function getGlobBase(glob) {
  const normalized = normalizePath(glob);
  const wildcardIndex = normalized.search(/[\*\?]/);
  if (wildcardIndex === -1) {
    return dirname(normalized);
  }
  const slashIndex = normalized.lastIndexOf('/', wildcardIndex);
  if (slashIndex === -1) {
    return '.';
  }
  const base = normalized.slice(0, slashIndex);
  return base || '.';
}

async function loadUlpcManifest() {
  if (!existsSync(ULPC_MANIFEST_PATH)) {
    console.warn(`⚠️ ULPC manifest not found at ${ULPC_MANIFEST_PATH}`);
    return { files: [], globs: [] };
  }

  try {
    const content = await readFile(ULPC_MANIFEST_PATH, 'utf-8');
    const manifest = JSON.parse(content);
    const files = Array.isArray(manifest.files) ? manifest.files : [];
    const globs = Array.isArray(manifest.globs) ? manifest.globs : [];
    return { files, globs };
  } catch (e) {
    console.warn(`⚠️ Failed to parse ULPC manifest: ${e.message}`);
    return { files: [], globs: [] };
  }
}

async function resolveUlpcManifestFiles() {
  const manifest = await loadUlpcManifest();
  const matches = new Set();

  for (const file of manifest.files) {
    const normalized = normalizePath(file);
    if (!existsSync(normalized)) {
      console.warn(`⚠️ ULPC manifest file missing: ${normalized}`);
      continue;
    }
    matches.add(normalized);
  }

  for (const pattern of manifest.globs) {
    const normalized = normalizePath(pattern);
    const regex = globToRegExp(normalized);
    const baseDir = getGlobBase(normalized);
    if (!existsSync(baseDir)) {
      console.warn(`⚠️ ULPC manifest base directory missing: ${baseDir}`);
      continue;
    }
    const files = await scanDirectory(baseDir, [], { excludeUlpc: false, silentSkip: true });
    for (const filePath of files) {
      const candidate = normalizePath(filePath);
      if (regex.test(candidate)) {
        matches.add(candidate);
      }
    }
  }

  return [...matches];
}

async function scanDirectory(dir, files = [], options = {}) {
  if (!existsSync(dir)) return files;

  // Check if this directory should be excluded (e.g., ULPC)
  // Normalize to forward slashes for comparison
  const normalizedDir = normalizePath(dir);

  if (options.excludeUlpc) {
    for (const excluded of EXCLUDED_PATHS) {
      const normalizedExcluded = normalizePath(excluded);
      // Check if current dir IS the excluded path or is inside it
      if (normalizedDir === normalizedExcluded ||
        normalizedDir.startsWith(normalizedExcluded + '/')) {
        if (!options.silentSkip) {
          console.log(`   ⏭️  Skipping LPC/ULPC layer assets (use --include-ulpc to include ~50k files)`);
          options.silentSkip = true;  // Only log once
        }
        return files;
      }
    }
  }

  const entries = await readdir(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = join(dir, entry.name);

    if (entry.isDirectory()) {
      // Pre-check before recursing to avoid unnecessary work
      const nextNormalized = normalizePath(fullPath);
      let shouldSkip = false;
      if (options.excludeUlpc) {
        for (const excluded of EXCLUDED_PATHS) {
          const normalizedExcluded = normalizePath(excluded);
          if (nextNormalized === normalizedExcluded ||
            nextNormalized.startsWith(normalizedExcluded + '/')) {
            if (!options.silentSkip) {
              console.log(`   ⏭️  Skipping LPC/ULPC layer assets (use --include-ulpc to include ~50k files)`);
              options.silentSkip = true;
            }
            shouldSkip = true;
            break;
          }
        }
      }
      if (!shouldSkip) {
        await scanDirectory(fullPath, files, options);
      }
    } else if (entry.isFile()) {
      const ext = extname(entry.name).toLowerCase();
      if (['.png', '.jpg', '.jpeg', '.gif'].includes(ext)) {
        files.push(fullPath);
      }
    }
  }

  return files;
}

function classifyAsset(filePath, contract) {
  const name = basename(filePath, extname(filePath)).toLowerCase();
  const dir = dirname(filePath).toLowerCase();

  // Simple classification based on path/name patterns
  if (dir.includes('character') || dir.includes('char') || name.includes('character')) {
    return 'character_sheet';
  }
  // Generated tiles have specific naming: tile.floor.*, tile.wall.*, etc.
  if (dir.includes('generated/tiles') || dir.includes('generated\\tiles') || name.startsWith('tile.')) {
    return 'tile';
  }
  if (dir.includes('tileset') || dir.includes('tiles')) {
    return 'tileset';
  }
  if (dir.includes('prop') || dir.includes('object')) {
    return 'prop';
  }
  if (dir.includes('ui') || dir.includes('interface')) {
    return 'ui';
  }

  return 'unknown';
}

function generateId(filePath, kind) {
  const name = basename(filePath, extname(filePath));

  // For generated tiles, preserve the full tile.* ID
  if (kind === 'tile' && name.startsWith('tile.')) {
    return name;
  }

  const cleanName = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '');

  const normalized = cleanName.replace(/_proc$/, '') || cleanName;

  const prefix = {
    'character_sheet': 'char',
    'tileset': 'tileset',
    'tile': 'tile',
    'prop': 'prop',
    'ui': 'ui',
    'unknown': 'asset'
  }[kind] || 'asset';

  return `${prefix}.${normalized}`;
}

function getProvenance(filePath) {
  // Extract pack/source info from path
  // e.g., vendor/lpc/Universal-LPC-Spritesheet-Character-Generator/spritesheets/body/...
  const parts = filePath.replace(/\\/g, '/').split('/');

  if (parts[0] === 'vendor' || parts[0] === './vendor') {
    const vendorParts = parts.slice(1);

    // Check for known sources
    if (vendorParts[0] === 'lpc' && vendorParts[1]?.includes('Universal-LPC')) {
      return {
        source: 'ulpc-generator',
        packId: 'ulpc',
        license: 'CC-BY-SA 3.0 / GPL 3.0'
      };
    }

    // Generic vendor source
    return {
      source: vendorParts[0] || 'unknown',
      packId: vendorParts[1] || 'base',
      license: 'unknown'
    };
  }

  return {
    source: 'local',
    packId: 'custom',
    license: 'proprietary'
  };
}

/**
 * Validate asset dimensions and compliance.
 * Uses sharp to read actual PNG dimensions.
 */
async function validateAsset(filePath, kind, contract) {
  const notes = [];
  let dimensions = null;

  if (!sharp || SKIP_DIMENSIONS) {
    if (!sharp && !SKIP_DIMENSIONS) {
      notes.push('sharp not available, dimensions not verified');
    } else if (SKIP_DIMENSIONS) {
      notes.push('dimension validation skipped');
    }
    return {
      compliance: 'pass',
      notes,
      dimensions
    };
  }

  // Try to get actual dimensions using sharp
  if (sharp) {
    try {
      const metadata = await sharp(filePath).metadata();
      dimensions = {
        width: metadata.width,
        height: metadata.height
      };

      // Validate character sheets
      if (kind === 'character_sheet') {
        const expectedWidth = 832; // 13 columns x 64px
        const expectedHeight = 1344; // 21 rows x 64px
        const maxFrameSize = contract?.characters?.maxFrameSize || 64;

        // Check if dimensions are compatible with LPC format
        if (dimensions.width !== expectedWidth) {
          // Allow alternative widths that are multiples of 64
          if (dimensions.width % 64 !== 0) {
            notes.push(`width ${dimensions.width}px not multiple of 64`);
          }
        }

        // Height can vary, but should be multiple of 64
        if (dimensions.height % 64 !== 0) {
          notes.push(`height ${dimensions.height}px not multiple of 64`);
        }
      }

      // Validate generated sprites
      if (filePath.includes('generated/sprites/')) {
        const expectedWidth = 832;
        const expectedHeight = 1344;

        if (dimensions.width !== expectedWidth || dimensions.height !== expectedHeight) {
          notes.push(`expected ${expectedWidth}x${expectedHeight}, got ${dimensions.width}x${dimensions.height}`);
        }
      }

      // Validate portraits
      if (filePath.includes('generated/portraits/')) {
        const expectedSize = 64;
        if (dimensions.width !== expectedSize || dimensions.height !== expectedSize) {
          notes.push(`portrait expected ${expectedSize}x${expectedSize}, got ${dimensions.width}x${dimensions.height}`);
        }
      }

      // Validate generated tiles (must be 32x32)
      if (filePath.includes('generated/tiles/') || filePath.includes('generated\\tiles\\')) {
        const expectedSize = 32;
        if (dimensions.width !== expectedSize || dimensions.height !== expectedSize) {
          notes.push(`tile expected ${expectedSize}x${expectedSize}, got ${dimensions.width}x${dimensions.height}`);
        }
      }
    } catch (e) {
      notes.push(`failed to read dimensions: ${e.message}`);
    }
  }

  return {
    compliance: notes.length === 0 ? 'pass' : 'pending',
    notes,
    dimensions
  };
}

async function main() {
  console.log('🗂️ Build Asset Index\n');
  console.log('='.repeat(50));

  // Load contract
  const contract = await loadContract();
  if (contract) {
    console.log(`\n✅ Loaded contract v${contract.version}`);
  }

  // Ensure generated directory exists
  await mkdir(GENERATED_DIR, { recursive: true });

  // Scan vendor directory (ULPC excluded by default)
  const vendorFiles = MANIFEST_ONLY ? [] : await (async () => {
    console.log('\n📁 Scanning vendor/ for assets...');
    const results = await scanDirectory(VENDOR_DIR, [], { excludeUlpc: true });
    console.log(`   Found ${results.length} image file(s) in vendor/`);
    return results;
  })();

  // Scan generated directory (sprites, portraits, tiles)
  const generatedFiles = MANIFEST_ONLY ? [] : await (async () => {
    console.log('\n📁 Scanning generated/ for assets...');
    const results = await scanDirectory(GENERATED_DIR, [], { excludeUlpc: false });
    console.log(`   Found ${results.length} image file(s) in generated/`);
    return results;
  })();

  // Count tiles specifically
  const tileFiles = generatedFiles.filter(f => f.includes('generated/tiles/') || f.includes('generated\\tiles\\'));
  if (tileFiles.length > 0) {
    console.log(`   - ${tileFiles.length} tile(s) in generated/tiles/`);
  }

  // ULPC opt-in via manifest
  let ulpcFiles = [];
  if (INCLUDE_ULPC) {
    console.log('\n📁 Loading ULPC manifest...');
    ulpcFiles = await resolveUlpcManifestFiles();
    if (ulpcFiles.length === 0) {
      console.log('   ⚠️ No ULPC files matched manifest (add files/globs to content/ulpc_manifest.json)');
    } else {
      console.log(`   Included ${ulpcFiles.length} ULPC file(s) from manifest`);
    }
  }

  if (MANIFEST_ONLY && !INCLUDE_ULPC) {
    console.log('\n⚠️ Manifest-only mode enabled with no ULPC manifest entries. No files will be indexed.');
  }

  const allFiles = [...vendorFiles, ...generatedFiles, ...ulpcFiles];

  if (allFiles.length === 0) {
    console.log('\n⚠️ No image files found');
    console.log('   Run: npm run fetch-vendor to download assets');
    console.log('   Run: npm run gen:sprites to generate sprites');
    return;
  }

  // Process each file
  const passing = [];
  const failing = [];

  // Process in batches to avoid memory issues with large sets
  const batchSize = 100;
  let processed = 0;

  for (let i = 0; i < allFiles.length; i += batchSize) {
    const batch = allFiles.slice(i, i + batchSize);

    for (const filePath of batch) {
      const kind = classifyAsset(filePath, contract);
      const id = generateId(filePath, kind);
      const { compliance, notes, dimensions } = await validateAsset(filePath, kind, contract);
      const provenance = getProvenance(filePath);

      // Determine runtime URL
      const normalizedPath = filePath.replace(/\\/g, '/');
      let url = normalizedPath;
      if (normalizedPath.startsWith('generated/')) {
        url = '/' + normalizedPath;
      } else if (normalizedPath.startsWith('./generated/')) {
        url = normalizedPath.replace('./generated/', '/generated/');
      }

      const entry = {
        id,
        label: basename(filePath, extname(filePath)),
        source: provenance.source,
        packId: provenance.packId,
        license: provenance.license,
        path: normalizedPath,
        url,
        kind,
        type: kind, // Alias for compatibility
        tags: extractTags(filePath, kind),
        frameWidth: kind === 'character_sheet' ? 64 : undefined,
        frameHeight: kind === 'character_sheet' ? 64 : undefined,
        width: dimensions?.width,
        height: dimensions?.height,
        compliance,
        notes: notes.length > 0 ? notes : undefined
      };

      // Remove undefined fields
      Object.keys(entry).forEach(k => entry[k] === undefined && delete entry[k]);

      if (compliance === 'pass') {
        passing.push(entry);
      } else {
        failing.push(entry);
      }

      processed++;
    }

    // Progress indicator for large sets
    if (allFiles.length > 1000) {
      process.stdout.write(`\r   Processing: ${processed}/${allFiles.length}`);
    }
  }

  if (allFiles.length > 1000) {
    console.log(''); // Newline after progress
  }

  // Write outputs
  const indexPath = join(GENERATED_DIR, 'asset_index.ndjson');
  const quarantinePath = join(GENERATED_DIR, 'quarantine.ndjson');

  await writeFile(indexPath, passing.map(e => JSON.stringify(e)).join('\n') + '\n');
  await writeFile(quarantinePath, failing.map(e => JSON.stringify(e)).join('\n') + '\n');

  console.log('\n' + '='.repeat(50));
  console.log('\n📊 Index Summary:');
  console.log(`   ✅ Passing: ${passing.length}`);
  console.log(`   ⚠️ Pending/Failed: ${failing.length}`);
  console.log(`\n   Index: ${indexPath}`);
  console.log(`   Quarantine: ${quarantinePath}`);
}

function extractTags(filePath, kind) {
  const tags = [kind];
  const path = filePath.toLowerCase();

  if (path.includes('char.') || path.includes('character')) tags.push('character');
  if (path.includes('npc.')) tags.push('npc');
  if (path.includes('portrait')) tags.push('portrait');
  if (path.includes('lpc') || path.includes('ulpc')) tags.push('lpc');
  if (path.includes('sprites')) tags.push('spritesheet');

  return tags;
}

main().catch(e => {
  console.error('Fatal error:', e);
  process.exit(1);
});
