#!/usr/bin/env node
/**
 * fix-tmx-entities.mjs
 * 
 * Fixes TMX entity properties to match the validation schema requirements:
 * - PlayerSpawn: adds spawnId property (uses object name)
 * - Door: converts targetLevel to toMap, adds toSpawn (default)
 * - NPC: ensures characterId exists
 * - EncounterTrigger: ensures once property exists
 * 
 * Usage: node scripts/fix-tmx-entities.mjs
 */

import { readdir, readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = join(__dirname, '..');
const ROOMS_DIR = join(PROJECT_ROOT, 'public/content/tiled/rooms');

let fixedCount = 0;
let totalFiles = 0;

/**
 * Parse a property element from TMX XML
 */
function parseProperty(propMatch) {
    const nameMatch = propMatch.match(/name="([^"]+)"/);
    const typeMatch = propMatch.match(/type="([^"]+)"/);
    const valueMatch = propMatch.match(/value="([^"]*)"/);

    return {
        name: nameMatch ? nameMatch[1] : '',
        type: typeMatch ? typeMatch[1] : 'string',
        value: valueMatch ? valueMatch[1] : ''
    };
}

/**
 * Build a property XML element
 */
function buildProperty(name, type, value) {
    return `<property name="${name}" type="${type}" value="${value}"/>`;
}

/**
 * Fix PlayerSpawn entity - add spawnId if missing
 */
function fixPlayerSpawn(objectXml, objectName) {
    // Check if spawnId already exists
    if (objectXml.includes('name="spawnId"')) {
        return objectXml;
    }

    // Derive spawnId from object name
    const spawnId = objectName || 'default';
    const newProp = buildProperty('spawnId', 'string', spawnId);

    // Check if object has properties block
    if (objectXml.includes('<properties>')) {
        // Add to existing properties
        return objectXml.replace(
            /<properties>/,
            `<properties>\n     ${newProp}`
        );
    } else {
        // Add new properties block before closing tag
        const propsBlock = `\n   <properties>\n     ${newProp}\n   </properties>\n  `;

        // Handle self-closing object tag (check for /> anywhere, not just at end)
        if (/\/>/.test(objectXml) && !objectXml.includes('</object>')) {
            return objectXml.replace(/\/>/, `>${propsBlock}</object>`);
        } else if (objectXml.includes('></object>')) {
            return objectXml.replace('></object>', `>${propsBlock}</object>`);
        }
    }

    return objectXml;
}

/**
 * Fix Door entity - convert targetLevel to toMap/toSpawn
 */
function fixDoor(objectXml, objectName) {
    let modified = objectXml;

    // Check if toMap already exists
    const hasToMap = objectXml.includes('name="toMap"');
    const hasToSpawn = objectXml.includes('name="toSpawn"');

    if (hasToMap && hasToSpawn) {
        return objectXml;
    }

    // Extract targetLevel if it exists
    const targetLevelMatch = objectXml.match(/name="targetLevel"[^>]*value="([^"]*)"/);
    const targetLevel = targetLevelMatch ? targetLevelMatch[1] : '';

    // Build new properties
    const toMapValue = targetLevel || 'scotus_lobby';
    const toSpawnValue = 'default';

    // Check if object has properties block
    if (objectXml.includes('<properties>')) {
        // Add missing properties
        let propsToAdd = '';
        if (!hasToMap) {
            propsToAdd += `\n     ${buildProperty('toMap', 'string', toMapValue)}`;
        }
        if (!hasToSpawn) {
            propsToAdd += `\n     ${buildProperty('toSpawn', 'string', toSpawnValue)}`;
        }

        modified = modified.replace(
            /<properties>/,
            `<properties>${propsToAdd}`
        );
    } else {
        // Add new properties block
        const propsBlock = `\n   <properties>\n     ${buildProperty('toMap', 'string', toMapValue)}\n     ${buildProperty('toSpawn', 'string', toSpawnValue)}\n   </properties>\n  `;

        if (/\/>/.test(modified) && !modified.includes('</object>')) {
            modified = modified.replace(/\/>/, `>${propsBlock}</object>`);
        } else if (modified.includes('></object>')) {
            modified = modified.replace('></object>', `>${propsBlock}</object>`);
        }
    }

    return modified;
}

/**
 * Fix NPC entity - ensure characterId exists
 */
function fixNPC(objectXml, objectName) {
    if (objectXml.includes('name="characterId"')) {
        return objectXml;
    }

    // Derive characterId from object name
    const characterId = objectName?.replace(/^npc[._]?/i, 'npc.') || 'npc.unknown';
    const newProp = buildProperty('characterId', 'string', characterId);

    if (objectXml.includes('<properties>')) {
        return objectXml.replace(
            /<properties>/,
            `<properties>\n     ${newProp}`
        );
    } else {
        const propsBlock = `\n   <properties>\n     ${newProp}\n   </properties>\n  `;

        if (/\/>/.test(objectXml) && !objectXml.includes('</object>')) {
            return objectXml.replace(/\/>/, `>${propsBlock}</object>`);
        } else if (objectXml.includes('></object>')) {
            return objectXml.replace('></object>', `>${propsBlock}</object>`);
        }
    }

    return objectXml;
}

/**
 * Fix EncounterTrigger entity - ensure once property exists
 */
function fixEncounterTrigger(objectXml) {
    if (objectXml.includes('name="once"')) {
        return objectXml;
    }

    const newProp = buildProperty('once', 'bool', 'true');

    if (objectXml.includes('<properties>')) {
        return objectXml.replace(
            /<properties>/,
            `<properties>\n     ${newProp}`
        );
    } else {
        const propsBlock = `\n   <properties>\n     ${newProp}\n   </properties>\n  `;

        if (/\/>/.test(objectXml) && !objectXml.includes('</object>')) {
            return objectXml.replace(/\/>/, `>${propsBlock}</object>`);
        } else if (objectXml.includes('></object>')) {
            return objectXml.replace('></object>', `>${propsBlock}</object>`);
        }
    }

    return objectXml;
}

/**
 * Process a single TMX file
 */
async function processTmxFile(filePath) {
    const content = await readFile(filePath, 'utf-8');
    let modified = content;
    let hasChanges = false;

    // Find all object elements
    const objectRegex = /<object[^>]*>[\s\S]*?<\/object>|<object[^>]*\/>/g;

    modified = content.replace(objectRegex, (objectXml) => {
        // Extract type and name
        const typeMatch = objectXml.match(/type="([^"]+)"/);
        const nameMatch = objectXml.match(/name="([^"]+)"/);
        const classMatch = objectXml.match(/class="([^"]+)"/);

        const objType = typeMatch ? typeMatch[1] : (classMatch ? classMatch[1] : '');
        const objName = nameMatch ? nameMatch[1] : '';

        let fixedXml = objectXml;

        switch (objType) {
            case 'PlayerSpawn':
                fixedXml = fixPlayerSpawn(objectXml, objName);
                break;
            case 'Door':
                fixedXml = fixDoor(objectXml, objName);
                break;
            case 'NPC':
                fixedXml = fixNPC(objectXml, objName);
                break;
            case 'EncounterTrigger':
                fixedXml = fixEncounterTrigger(objectXml);
                break;
        }

        if (fixedXml !== objectXml) {
            hasChanges = true;
        }

        return fixedXml;
    });

    if (hasChanges) {
        await writeFile(filePath, modified, 'utf-8');
        return true;
    }

    return false;
}

/**
 * Main entry point
 */
async function main() {
    console.log('🔧 TMX Entity Property Fixer');
    console.log('============================\n');

    if (!existsSync(ROOMS_DIR)) {
        console.error(`❌ Rooms directory not found: ${ROOMS_DIR}`);
        process.exit(1);
    }

    const entries = await readdir(ROOMS_DIR, { withFileTypes: true });
    const tmxFiles = entries
        .filter(e => e.isFile() && e.name.endsWith('.tmx') && !e.name.startsWith('_'))
        .map(e => join(ROOMS_DIR, e.name));

    console.log(`Found ${tmxFiles.length} TMX files to process\n`);

    for (const filePath of tmxFiles) {
        totalFiles++;
        const fileName = filePath.split(/[/\\]/).pop();

        try {
            const wasFixed = await processTmxFile(filePath);
            if (wasFixed) {
                console.log(`✓ Fixed: ${fileName}`);
                fixedCount++;
            } else {
                console.log(`  Unchanged: ${fileName}`);
            }
        } catch (err) {
            console.error(`✗ Error processing ${fileName}: ${err.message}`);
        }
    }

    console.log(`\n============================`);
    console.log(`Processed: ${totalFiles} files`);
    console.log(`Fixed: ${fixedCount} files`);
    console.log(`Unchanged: ${totalFiles - fixedCount} files`);

    if (fixedCount > 0) {
        console.log(`\n✅ Run 'npm run validate:tiled' to verify fixes`);
    }
}

main().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
});
