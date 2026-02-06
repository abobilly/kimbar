#!/usr/bin/env node
/**
 * build-tiled-world.mjs
 * 
 * Generates a Tiled .world file for spatial organization of all playable rooms.
 * Reads room entries from specs/room_entries/*.json and TMX files from
 * public/content/tiled/rooms/*.tmx to create a world manifest.
 * 
 * Usage: node scripts/build-tiled-world.mjs
 */

import { readdir, readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = join(__dirname, '..');

// Paths
const ROOM_ENTRIES_DIR = join(PROJECT_ROOT, 'specs/room_entries');
const WORLD_GRAPH_PATH = join(PROJECT_ROOT, 'specs/world_graph.json');
const ROOMS_DIR = join(PROJECT_ROOT, 'public/content/tiled/rooms');
const TMX_ZONE_DIR = join(ROOMS_DIR, 'scotus_zones');
const OUTPUT_DIR = join(PROJECT_ROOT, 'public/content/tiled/worlds');
const OUTPUT_FILE = join(OUTPUT_DIR, 'scotus.world');

// Layout configuration
const MAPS_PER_ROW = 4;
const PADDING = 64; // pixels between maps
const DEFAULT_WIDTH = 640; // 20 tiles * 32px
const DEFAULT_HEIGHT = 480; // 15 tiles * 32px

/**
 * Parse TMX file to extract map dimensions
 * @param {string} tmxPath - Path to TMX file
 * @returns {Promise<{width: number, height: number, tilewidth: number, tileheight: number}>}
 */
async function parseTmxDimensions(tmxPath) {
    try {
        const content = await readFile(tmxPath, 'utf-8');

        // Extract attributes from <map> element using regex
        const widthMatch = content.match(/\bwidth="(\d+)"/);
        const heightMatch = content.match(/\bheight="(\d+)"/);
        const tilewidthMatch = content.match(/\btilewidth="(\d+)"/);
        const tileheightMatch = content.match(/\btileheight="(\d+)"/);

        const width = widthMatch ? parseInt(widthMatch[1], 10) : 20;
        const height = heightMatch ? parseInt(heightMatch[1], 10) : 15;
        const tilewidth = tilewidthMatch ? parseInt(tilewidthMatch[1], 10) : 32;
        const tileheight = tileheightMatch ? parseInt(tileheightMatch[1], 10) : 32;

        return {
            width: width * tilewidth,
            height: height * tileheight,
            tilewidth,
            tileheight
        };
    } catch (err) {
        console.warn(`  ⚠ Could not parse TMX ${tmxPath}: ${err.message}`);
        return {
            width: DEFAULT_WIDTH,
            height: DEFAULT_HEIGHT,
            tilewidth: 32,
            tileheight: 32
        };
    }
}

/**
 * Load world graph for position hints
 * @returns {Promise<Object|null>}
 */
async function loadWorldGraph() {
    try {
        const content = await readFile(WORLD_GRAPH_PATH, 'utf-8');
        return JSON.parse(content);
    } catch (err) {
        console.warn(`⚠ Could not load world graph: ${err.message}`);
        return null;
    }
}

/**
 * Load room entry JSON
 * @param {string} filePath - Path to room entry JSON
 * @returns {Promise<Object|null>}
 */
async function loadRoomEntry(filePath) {
    try {
        const content = await readFile(filePath, 'utf-8');
        return JSON.parse(content);
    } catch (err) {
        console.error(`  Error loading room entry ${filePath}:`, err.message);
        return null;
    }
}

/**
 * Calculate grid positions for maps
 * @param {Array<{id: string, width: number, height: number}>} maps - Map data
 * @returns {Array<{id: string, x: number, y: number, width: number, height: number}>}
 */
function calculateGridPositions(maps) {
    const positioned = [];
    let currentX = 0;
    let currentY = 0;
    let rowMaxHeight = 0;
    let mapsInRow = 0;

    for (const map of maps) {
        // Start new row if needed
        if (mapsInRow >= MAPS_PER_ROW) {
            currentX = 0;
            currentY += rowMaxHeight + PADDING;
            rowMaxHeight = 0;
            mapsInRow = 0;
        }

        positioned.push({
            id: map.id,
            fileName: map.fileName,
            x: currentX,
            y: currentY,
            width: map.width,
            height: map.height
        });

        currentX += map.width + PADDING;
        rowMaxHeight = Math.max(rowMaxHeight, map.height);
        mapsInRow++;
    }

    return positioned;
}

/**
 * Resolve TMX path for a room ID.
 * Prefers root rooms dir, then scotus_zones fallback.
 * @param {string} roomId
 * @returns {string|null}
 */
function resolveTmxPath(roomId) {
    const candidates = [
        join(ROOMS_DIR, `${roomId}.tmx`),
        join(TMX_ZONE_DIR, `${roomId}.tmx`)
    ];

    for (const candidate of candidates) {
        if (existsSync(candidate)) {
            return candidate;
        }
    }

    return null;
}

/**
 * Generate the .world JSON structure
 * @param {Array<{id: string, x: number, y: number, width: number, height: number}>} maps
 * @returns {Object}
 */
function generateWorldJson(maps) {
    return {
        maps: maps.map(map => ({
            fileName: map.fileName,
            x: map.x,
            y: map.y,
            width: map.width,
            height: map.height
        })),
        type: 'world'
    };
}

/**
 * Main generation function
 */
async function main() {
    console.log('Tiled World Generation Script');
    console.log('==============================\n');

    // Ensure output directory exists
    if (!existsSync(OUTPUT_DIR)) {
        await mkdir(OUTPUT_DIR, { recursive: true });
        console.log(`Created output directory: ${OUTPUT_DIR}\n`);
    }

    // Load world graph for potential position hints
    const worldGraph = await loadWorldGraph();
    const worldGraphNodes = worldGraph?.nodes || [];
    const nodeMap = new Map(worldGraphNodes.map(n => [n.id, n]));

    // Read all room entry files
    const roomEntryFiles = (await readdir(ROOM_ENTRIES_DIR))
        .filter(f => f.endsWith('.json'))
        .sort(); // Alphabetical sort for deterministic output

    console.log(`Found ${roomEntryFiles.length} room entries\n`);

    // Collect map data
    const mapData = [];

    for (const entryFile of roomEntryFiles) {
        const entryPath = join(ROOM_ENTRIES_DIR, entryFile);
        const roomEntry = await loadRoomEntry(entryPath);

        if (!roomEntry || !roomEntry.id) {
            console.log(`⚠ Skipping ${entryFile}: Invalid room entry`);
            continue;
        }

        const roomId = roomEntry.id;
        const tmxPath = resolveTmxPath(roomId);

        // Check if TMX file exists
        if (!tmxPath) {
            console.log(`⚠ Skipping ${roomId}: TMX file not found`);
            continue;
        }

        console.log(`Processing: ${roomId}`);

        // Parse TMX dimensions
        const dimensions = await parseTmxDimensions(tmxPath);
        console.log(`  ✓ Dimensions: ${dimensions.width}x${dimensions.height}px`);

        // Check for world graph position hints
        const graphNode = nodeMap.get(roomId);
        if (graphNode?.bounds) {
            console.log(`  ✓ Found world graph bounds: ${graphNode.bounds.width}x${graphNode.bounds.height} tiles`);
        }

        mapData.push({
            id: roomId,
            width: dimensions.width,
            height: dimensions.height,
            fileName: `../rooms/${relative(ROOMS_DIR, tmxPath).replace(/\\/g, '/')}`
        });
    }

    console.log(`\nCollected ${mapData.length} maps for world file\n`);

    // Sort alphabetically for deterministic output
    mapData.sort((a, b) => a.id.localeCompare(b.id));

    // Calculate grid positions
    const positionedMaps = calculateGridPositions(mapData);

    // Generate world JSON
    const worldJson = generateWorldJson(positionedMaps);

    // Write output file with deterministic formatting
    const outputContent = JSON.stringify(worldJson, null, 2) + '\n';
    await writeFile(OUTPUT_FILE, outputContent, 'utf-8');

    console.log('='.repeat(50));
    console.log('Summary');
    console.log('='.repeat(50));
    console.log(`✓ Generated: ${OUTPUT_FILE}`);
    console.log(`✓ Maps included: ${positionedMaps.length}`);
    console.log('');
    console.log('Maps in world:');
    for (const map of positionedMaps) {
        console.log(`  - ${map.id}: (${map.x}, ${map.y}) ${map.width}x${map.height}px`);
    }
}

main().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
});
