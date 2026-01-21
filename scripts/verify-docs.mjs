#!/usr/bin/env node
/**
 * verify-docs.mjs - Documentation gate script
 * 
 * Verifies that Tiled pipeline documentation and configuration are in place.
 * This prevents drift by checking:
 * 1. Documentation exists and contains required content
 * 2. Generated files are properly gitignored
 * 3. World manifest exists and includes all playable rooms
 */

import { readFileSync, existsSync, readdirSync } from 'fs';
import { execSync } from 'child_process';
import { join, basename } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = join(__dirname, '..');

// ANSI colors
const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const YELLOW = '\x1b[33m';
const RESET = '\x1b[0m';

const CHECK = `${GREEN}✓${RESET}`;
const CROSS = `${RED}✗${RESET}`;
const WARN = `${YELLOW}⚠${RESET}`;

let hasErrors = false;
let hasWarnings = false;

function check(condition, message, isWarning = false) {
    if (condition) {
        console.log(`${CHECK} ${message}`);
        return true;
    } else if (isWarning) {
        console.log(`${WARN} ${message}`);
        hasWarnings = true;
        return false;
    } else {
        console.log(`${CROSS} ${message}`);
        hasErrors = true;
        return false;
    }
}

function readFile(path) {
    const fullPath = join(ROOT, path);
    if (!existsSync(fullPath)) {
        return null;
    }
    return readFileSync(fullPath, 'utf-8');
}

// ============================================================================
// Check 1: docs/TILED_PIPELINE.md exists and contains required content
// ============================================================================
console.log('\n--- Check 1: TILED_PIPELINE.md Documentation ---\n');

const tiledPipelinePath = 'docs/TILED_PIPELINE.md';
const tiledPipelineContent = readFile(tiledPipelinePath);

if (check(tiledPipelineContent !== null, `${tiledPipelinePath} exists`)) {
    // Check for required content markers
    const requiredMarkers = [
        { pattern: 'specs/**', description: 'specs/** folder invariant' },
        { pattern: 'public/content/**', description: 'public/content/** folder invariant' },
        { pattern: 'public/generated/**', description: 'public/generated/** folder invariant' },
        { pattern: 'TILED_ONLY', description: 'TILED_ONLY strict mode reference' },
    ];

    for (const marker of requiredMarkers) {
        check(
            tiledPipelineContent.includes(marker.pattern),
            `Contains "${marker.pattern}" (${marker.description})`
        );
    }
}

// ============================================================================
// Check 2: public/generated/** is gitignored and has no tracked files
// ============================================================================
console.log('\n--- Check 2: public/generated/** Gitignore Status ---\n');

const gitignoreContent = readFile('.gitignore');

if (check(gitignoreContent !== null, '.gitignore exists')) {
    // Check for public/generated in gitignore
    const hasGeneratedIgnore =
        gitignoreContent.includes('public/generated') ||
        gitignoreContent.includes('public/generated/') ||
        gitignoreContent.includes('public/generated/**');

    check(hasGeneratedIgnore, 'public/generated is in .gitignore');
}

// Check for tracked files in public/generated
try {
    const trackedFiles = execSync('git ls-files public/generated/', {
        cwd: ROOT,
        encoding: 'utf-8',
        stdio: ['pipe', 'pipe', 'pipe']
    }).trim();

    // Filter out README.md which is allowed
    const trackedFilesArray = trackedFiles
        .split('\n')
        .filter(f => f && !f.endsWith('README.md'));

    check(
        trackedFilesArray.length === 0,
        `No tracked files in public/generated/ (excluding README.md)${trackedFilesArray.length > 0 ? `: found ${trackedFilesArray.join(', ')}` : ''
        }`
    );
} catch (error) {
    // git ls-files might fail if not in a git repo
    console.log(`${WARN} Could not check tracked files (not a git repo?)`);
}

// ============================================================================
// Check 3: scotus.world exists and includes playable rooms
// ============================================================================
console.log('\n--- Check 3: World Manifest Coverage ---\n');

const worldPath = 'public/content/tiled/worlds/scotus.world';
const worldContent = readFile(worldPath);

if (check(worldContent !== null, `${worldPath} exists`)) {
    try {
        const world = JSON.parse(worldContent);

        check(
            Array.isArray(world.maps) && world.maps.length > 0,
            `World manifest has ${world.maps?.length || 0} maps`
        );

        // Extract map filenames from world manifest
        const worldMaps = new Set(
            world.maps.map(m => basename(m.fileName))
        );

        // Get TMX files from rooms directory
        const roomsDir = join(ROOT, 'public/content/tiled/rooms');
        let tmxFiles = [];

        if (existsSync(roomsDir)) {
            tmxFiles = readdirSync(roomsDir)
                .filter(f => f.endsWith('.tmx'));
        }

        check(
            tmxFiles.length > 0,
            `Found ${tmxFiles.length} TMX files in public/content/tiled/rooms/`
        );

        // Find TMX files not in world manifest
        const missingFromWorld = tmxFiles.filter(f => !worldMaps.has(f));

        if (missingFromWorld.length > 0) {
            check(
                false,
                `TMX files not in world manifest: ${missingFromWorld.join(', ')}`,
                true // This is a warning, not an error
            );
        } else {
            check(true, 'All TMX files are in world manifest');
        }

        // Find world entries that don't have TMX files
        const tmxSet = new Set(tmxFiles);
        const missingTmx = [...worldMaps].filter(f => !tmxSet.has(f));

        if (missingTmx.length > 0) {
            check(
                false,
                `World manifest references missing TMX files: ${missingTmx.join(', ')}`,
                false // This is an error
            );
        }

    } catch (error) {
        check(false, `Failed to parse world manifest: ${error.message}`);
    }
}

// ============================================================================
// Summary
// ============================================================================
console.log('\n--- Summary ---\n');

if (hasErrors) {
    console.log(`${CROSS} Documentation gate FAILED - fix errors above`);
    process.exit(1);
} else if (hasWarnings) {
    console.log(`${CHECK} Documentation gate PASSED with warnings`);
    process.exit(0);
} else {
    console.log(`${CHECK} Documentation gate PASSED`);
    process.exit(0);
}
