#!/usr/bin/env node
import { readdir, readFile, writeFile } from 'fs/promises';
import { join } from 'path';

const ROOT_DIR = process.cwd();
const SCOTUS_DIR = join(ROOT_DIR, 'public', 'content', 'tiled', 'rooms', 'scotus_zones');
const args = new Set(process.argv.slice(2));
const dryRun = args.has('--dry-run');

function getLineBreak(text) {
    return text.includes('\r\n') ? '\r\n' : '\n';
}

function parseMapTag(xml) {
    const match = xml.match(/<map\b[^>]*>/);
    if (!match) {
        throw new Error('Map tag not found');
    }
    return match[0];
}

function parseNumberAttr(tag, attr) {
    const match = tag.match(new RegExp(`${attr}="(\\d+)"`));
    if (!match) {
        throw new Error(`Missing ${attr} attribute on map tag`);
    }
    return Number(match[1]);
}

function parseNextLayerId(xml) {
    const match = xml.match(/nextlayerid="(\d+)"/);
    if (!match) {
        throw new Error('nextlayerid not found');
    }
    return Number(match[1]);
}

function parseMegabobFirstGid(xml) {
    const match = xml.match(/<tileset\b[^>]*firstgid="(\d+)"[^>]*source="[^"]*megabob\.tsx"[^>]*\/>/);
    if (!match) {
        throw new Error('megabob tileset not found');
    }
    return Number(match[1]);
}

function extractLayer(xml, layerName) {
    const layerRegex = new RegExp(`<layer\\b[^>]*name="${layerName}"[^>]*>[\\s\\S]*?<\\/layer>`);
    const match = layerRegex.exec(xml);
    if (!match) {
        throw new Error(`Layer "${layerName}" not found`);
    }

    const layerBlock = match[0];
    const dataMatch = layerBlock.match(/<data\b[^>]*encoding="csv"[^>]*>([\s\S]*?)<\/data>/);
    if (!dataMatch) {
        throw new Error(`Layer "${layerName}" is missing CSV data`);
    }

    const data = dataMatch[1].trim();
    const layerStartIndex = match.index ?? 0;
    const lineStart = xml.lastIndexOf('\n', layerStartIndex);
    const indent = xml.slice(lineStart + 1, layerStartIndex);
    const dataIndentMatch = layerBlock.match(/(^[\t ]*)<data\b/m);
    const dataIndent = dataIndentMatch ? dataIndentMatch[1] : `${indent} `;

    return {
        layerBlock,
        data,
        indent,
        dataIndent
    };
}

function parseCsv(data) {
    const tokens = data.split(/[\s,]+/).filter(token => token.length > 0);
    return tokens.map(value => Number(value));
}

function formatCsv(values, width, newline) {
    const rows = [];
    for (let i = 0; i < values.length; i += width) {
        rows.push(values.slice(i, i + width).join(','));
    }
    return rows.join(`,${newline}`);
}

function buildMaskLayer({ id, name, width, height, csv, indent, dataIndent, newline }) {
    const lines = [
        `${indent}<layer id="${id}" name="${name}" width="${width}" height="${height}">`,
        `${dataIndent}<data encoding="csv">`,
        csv,
        `${dataIndent}</data>`,
        `${indent}</layer>`
    ];
    return lines.join(newline);
}

async function main() {
    const entries = await readdir(SCOTUS_DIR, { withFileTypes: true });
    const files = entries
        .filter(entry => entry.isFile())
        .map(entry => entry.name)
        .filter(name => name.endsWith('.tmx'))
        .filter(name => name !== 'sample.tmx')
        .sort((a, b) => a.localeCompare(b));

    if (files.length === 0) {
        console.log('No TMX files found in scotus_zones.');
        return;
    }

    for (const name of files) {
        const filePath = join(SCOTUS_DIR, name);
        const xml = await readFile(filePath, 'utf-8');

        if (xml.includes('name="FloorMask"') || xml.includes('name="WallMask"')) {
            console.log(`⏭️  ${name}: mask layer(s) already present, skipping`);
            continue;
        }

        const newline = getLineBreak(xml);
        const mapTag = parseMapTag(xml);
        const width = parseNumberAttr(mapTag, 'width');
        const height = parseNumberAttr(mapTag, 'height');
        const nextLayerId = parseNextLayerId(xml);
        const megabobFirstGid = parseMegabobFirstGid(xml);

        const floor = extractLayer(xml, 'Floor');
        const walls = extractLayer(xml, 'Walls');

        const floorValues = parseCsv(floor.data);
        const wallValues = parseCsv(walls.data);
        const expectedCount = width * height;

        if (floorValues.length !== expectedCount) {
            throw new Error(`${name}: Floor layer has ${floorValues.length} tiles, expected ${expectedCount}`);
        }
        if (wallValues.length !== expectedCount) {
            throw new Error(`${name}: Walls layer has ${wallValues.length} tiles, expected ${expectedCount}`);
        }

        const floorMaskValues = floorValues.map(value => (value === 0 ? 0 : megabobFirstGid));
        const wallMaskValues = wallValues.map(value => (value === 0 ? 0 : megabobFirstGid));

        const floorMaskCsv = formatCsv(floorMaskValues, width, newline);
        const wallMaskCsv = formatCsv(wallMaskValues, width, newline);

        const floorMaskLayer = buildMaskLayer({
            id: nextLayerId,
            name: 'FloorMask',
            width,
            height,
            csv: floorMaskCsv,
            indent: floor.indent,
            dataIndent: floor.dataIndent,
            newline
        });

        const wallMaskLayer = buildMaskLayer({
            id: nextLayerId + 1,
            name: 'WallMask',
            width,
            height,
            csv: wallMaskCsv,
            indent: walls.indent,
            dataIndent: walls.dataIndent,
            newline
        });

        let updated = xml;
        updated = updated.replace(floor.layerBlock, `${floorMaskLayer}${newline}${floor.layerBlock}`);
        updated = updated.replace(walls.layerBlock, `${wallMaskLayer}${newline}${walls.layerBlock}`);
        updated = updated.replace(/nextlayerid="(\d+)"/, `nextlayerid="${nextLayerId + 2}"`);

        if (dryRun) {
            console.log(`🧪 ${name}: would add FloorMask/WallMask (megabob gid ${megabobFirstGid})`);
            continue;
        }

        await writeFile(filePath, updated, 'utf-8');
        console.log(`✅ ${name}: added FloorMask/WallMask (megabob gid ${megabobFirstGid})`);
    }
}

main().catch(error => {
    console.error('❌ Mask layer generation failed:', error.message);
    process.exit(1);
});
