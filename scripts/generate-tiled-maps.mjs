#!/usr/bin/env node
/**
 * generate-tiled-maps.mjs
 * 
 * Generates TMX files for all playable rooms defined in specs/room_entries/*.json.
 * Extracts dimensions and entities from corresponding LDtk JSON files when available.
 * 
 * Usage: node scripts/generate-tiled-maps.mjs
 */

import { readdir, readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, basename, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = join(__dirname, '..');

// Paths
const ROOM_ENTRIES_DIR = join(PROJECT_ROOT, 'specs/room_entries');
const LDTK_DIR = join(PROJECT_ROOT, 'public/content/ldtk');
const OUTPUT_DIR = join(PROJECT_ROOT, 'public/content/tiled/rooms');

// Default dimensions (in tiles)
const DEFAULT_WIDTH = 20;
const DEFAULT_HEIGHT = 15;
const TILE_SIZE = 32;

// Tileset configuration (firstgid values)
const TILESETS = [
    { firstgid: 1, source: '../tilesets/scotus_floors.tsx' },
    { firstgid: 1001, source: '../tilesets/scotus_structures.tsx' },
    { firstgid: 2001, source: '../tilesets/scotus_decor.tsx' },
    { firstgid: 3001, source: '../tilesets/collision.tsx' }
];

// Layer names in order
const TILE_LAYERS = ['Floor', 'Walls', 'Trim', 'Overlays', 'Collision'];

/**
 * Escape XML special characters
 */
function escapeXml(str) {
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
}

/**
 * Generate CSV data for an empty tile layer
 */
function generateEmptyLayerData(width, height) {
    const rows = [];
    for (let y = 0; y < height; y++) {
        rows.push(Array(width).fill(0).join(','));
    }
    return rows.join(',\n');
}

/**
 * Parse LDtk JSON to extract dimensions and entities
 */
function parseLdtkData(ldtkJson) {
    const result = {
        width: DEFAULT_WIDTH,
        height: DEFAULT_HEIGHT,
        entities: []
    };

    if (!ldtkJson || !ldtkJson.levels || ldtkJson.levels.length === 0) {
        return result;
    }

    const level = ldtkJson.levels[0];

    // Extract dimensions from pxWid/pxHei
    if (level.pxWid && level.pxHei) {
        result.width = Math.floor(level.pxWid / TILE_SIZE);
        result.height = Math.floor(level.pxHei / TILE_SIZE);
    }

    // Extract entities from layerInstances
    if (level.layerInstances) {
        for (const layer of level.layerInstances) {
            if (layer.__type === 'Entities' && layer.entityInstances) {
                for (const entity of layer.entityInstances) {
                    const entityData = {
                        type: entity.__identifier,
                        iid: entity.iid || `entity_${result.entities.length + 1}`,
                        x: entity.px ? entity.px[0] : 0,
                        y: entity.px ? entity.px[1] : 0,
                        width: entity.width || 32,
                        height: entity.height || 32,
                        properties: {}
                    };

                    // Extract field instances as properties
                    if (entity.fieldInstances) {
                        for (const field of entity.fieldInstances) {
                            if (field.__value !== null && field.__value !== undefined) {
                                entityData.properties[field.__identifier] = {
                                    type: mapLdtkTypeToTiled(field.__type),
                                    value: field.__value
                                };
                            }
                        }
                    }

                    result.entities.push(entityData);
                }
            }
        }
    }

    return result;
}

/**
 * Map LDtk field types to Tiled property types
 */
function mapLdtkTypeToTiled(ldtkType) {
    switch (ldtkType) {
        case 'Int':
            return 'int';
        case 'Bool':
            return 'bool';
        case 'Float':
            return 'float';
        case 'String':
        default:
            return 'string';
    }
}

/**
 * Generate TMX XML content
 */
function generateTmx(roomId, ldtkData) {
    const { width, height, entities } = ldtkData;

    let nextLayerId = 1;
    let nextObjectId = 1;

    // Build tilesets XML
    const tilesetsXml = TILESETS.map(ts =>
        ` <tileset firstgid="${ts.firstgid}" source="${ts.source}"/>`
    ).join('\n');

    // Build tile layers XML
    const tileLayersXml = TILE_LAYERS.map(layerName => {
        const layerId = nextLayerId++;
        const data = generateEmptyLayerData(width, height);
        return ` <layer id="${layerId}" name="${layerName}" width="${width}" height="${height}">
  <data encoding="csv">
${data}
  </data>
 </layer>`;
    }).join('\n');

    // Build entities/objects XML
    const objectsXml = [];

    // Always add a default PlayerSpawn if none exists
    const hasSpawn = entities.some(e => e.type === 'PlayerSpawn');
    if (!hasSpawn) {
        const spawnX = Math.floor(width / 2) * TILE_SIZE;
        const spawnY = Math.floor(height * 0.8) * TILE_SIZE;
        objectsXml.push(`  <object id="${nextObjectId++}" name="spawn_default" type="PlayerSpawn" x="${spawnX}" y="${spawnY}" width="32" height="32">
   <properties>
    <property name="spawnId" type="string" value="default"/>
   </properties>
  </object>`);
    }

    // Add entities from LDtk
    for (const entity of entities) {
        const objId = nextObjectId++;
        const name = entity.iid || `${entity.type.toLowerCase()}_${objId}`;

        let propsXml = '';
        const propEntries = Object.entries(entity.properties);
        if (propEntries.length > 0) {
            const propsContent = propEntries.map(([key, prop]) => {
                const value = escapeXml(String(prop.value));
                return `    <property name="${key}" type="${prop.type}" value="${value}"/>`;
            }).join('\n');
            propsXml = `\n   <properties>\n${propsContent}\n   </properties>\n  `;
        }

        objectsXml.push(`  <object id="${objId}" name="${escapeXml(name)}" type="${entity.type}" x="${entity.x}" y="${entity.y}" width="${entity.width}" height="${entity.height}">${propsXml}</object>`);
    }

    const entitiesLayerId = nextLayerId++;
    const entitiesLayerXml = ` <objectgroup id="${entitiesLayerId}" name="Entities">
${objectsXml.join('\n')}
 </objectgroup>`;

    // Assemble full TMX
    const tmx = `<?xml version="1.0" encoding="UTF-8"?>
<map version="1.10" tiledversion="1.10.2" orientation="orthogonal" renderorder="right-down" width="${width}" height="${height}" tilewidth="${TILE_SIZE}" tileheight="${TILE_SIZE}" infinite="0" nextlayerid="${nextLayerId}" nextobjectid="${nextObjectId}">
${tilesetsXml}
${tileLayersXml}
${entitiesLayerXml}
</map>
`;

    return tmx;
}

/**
 * Load room entry JSON
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
 * Load LDtk JSON for a room
 */
async function loadLdtkJson(roomId, ldtkUrl) {
    // Try multiple possible file paths
    const possiblePaths = [
        join(LDTK_DIR, `${roomId}.json`),
        join(PROJECT_ROOT, 'public', ldtkUrl?.replace(/^\//, '') || ''),
        join(LDTK_DIR, `room.${roomId}.json`),
        join(LDTK_DIR, ldtkUrl?.split('/').pop() || '')
    ].filter(p => p && p !== join(PROJECT_ROOT, 'public'));

    for (const ldtkPath of possiblePaths) {
        if (existsSync(ldtkPath)) {
            try {
                const content = await readFile(ldtkPath, 'utf-8');
                return JSON.parse(content);
            } catch (err) {
                // Continue to next path
            }
        }
    }

    return null;
}

/**
 * Main generation function
 */
async function main() {
    console.log('TMX Generation Script');
    console.log('=====================\n');

    // Ensure output directory exists
    if (!existsSync(OUTPUT_DIR)) {
        await mkdir(OUTPUT_DIR, { recursive: true });
        console.log(`Created output directory: ${OUTPUT_DIR}\n`);
    }

    // Read all room entry files
    const roomEntryFiles = (await readdir(ROOM_ENTRIES_DIR))
        .filter(f => f.endsWith('.json'))
        .sort();

    console.log(`Found ${roomEntryFiles.length} room entries\n`);

    const results = {
        success: [],
        failed: []
    };

    for (const entryFile of roomEntryFiles) {
        const entryPath = join(ROOM_ENTRIES_DIR, entryFile);
        const roomEntry = await loadRoomEntry(entryPath);

        if (!roomEntry || !roomEntry.id) {
            console.log(`⚠ Skipping ${entryFile}: Invalid room entry`);
            results.failed.push({ file: entryFile, reason: 'Invalid room entry' });
            continue;
        }

        const roomId = roomEntry.id;
        const outputPath = join(OUTPUT_DIR, `${roomId}.tmx`);

        console.log(`Processing: ${roomId}`);

        // Load LDtk data if available
        const ldtkJson = await loadLdtkJson(roomId, roomEntry.ldtkUrl);
        const ldtkData = parseLdtkData(ldtkJson);

        if (ldtkJson) {
            console.log(`  ✓ Found LDtk data: ${ldtkData.width}x${ldtkData.height} tiles, ${ldtkData.entities.length} entities`);
        } else {
            console.log(`  ⚠ No LDtk data found, using defaults: ${ldtkData.width}x${ldtkData.height} tiles`);
        }

        // Generate TMX
        const tmxContent = generateTmx(roomId, ldtkData);

        // Write TMX file
        try {
            await writeFile(outputPath, tmxContent, 'utf-8');
            console.log(`  ✓ Generated: ${outputPath}`);
            results.success.push(roomId);
        } catch (err) {
            console.error(`  ✗ Failed to write ${outputPath}:`, err.message);
            results.failed.push({ file: entryFile, reason: err.message });
        }

        console.log('');
    }

    // Summary
    console.log('='.repeat(50));
    console.log('Summary');
    console.log('='.repeat(50));
    console.log(`✓ Successfully generated: ${results.success.length} TMX files`);
    if (results.failed.length > 0) {
        console.log(`✗ Failed: ${results.failed.length} files`);
        for (const fail of results.failed) {
            console.log(`  - ${fail.file}: ${fail.reason}`);
        }
    }
    console.log('');
    console.log('Generated files:');
    for (const roomId of results.success) {
        console.log(`  - public/content/tiled/rooms/${roomId}.tmx`);
    }
}

main().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
});
