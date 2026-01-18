#!/usr/bin/env node
/**
 * Door Validator Script
 *
 * Validates door entities across all room specs according to the door contract.
 *
 * Usage: node scripts/validate-doors.mjs
 *
 * Contract: Every door must have doorId, fromRoomId, toRoomId, toSpawnTag (or coordinates).
 * Validates: toRoomId exists, spawn target exists, doorId unique, door within bounds.
 */

import { readFile, readdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';

const ROOMS_DIR = path.join(process.cwd(), 'content', 'rooms');

/**
 * Load all room specs and build registries
 */
async function loadRooms() {
  const rooms = {};
  const roomIds = new Set();

  if (!existsSync(ROOMS_DIR)) {
    console.error(`Rooms directory not found: ${ROOMS_DIR}`);
    process.exit(1);
  }

  const files = await readdir(ROOMS_DIR);
  const jsonFiles = files.filter(f => f.endsWith('.json'));

  for (const file of jsonFiles) {
    const filePath = path.join(ROOMS_DIR, file);
    const content = await readFile(filePath, 'utf8');
    const room = JSON.parse(content);

    const roomId = room.id;
    if (!roomId) {
      console.error(`Room missing id: ${file}`);
      continue;
    }

    roomIds.add(roomId);
    rooms[roomId] = room;
  }

  return { rooms, roomIds };
}

/**
 * Extract spawn points from a room
 */
function getSpawnPoints(room) {
  const spawns = {};
  for (const entity of room.entities || []) {
    if (entity.type === 'PlayerSpawn' && entity.id) {
      spawns[entity.id] = { x: entity.x, y: entity.y };
    }
  }
  return spawns;
}

/**
 * Extract doors from a room
 */
function getDoors(room, roomId) {
  const doors = [];
  for (const entity of room.entities || []) {
    if (entity.type === 'Door') {
      doors.push({
        roomId,
        entity,
        x: entity.x,
        y: entity.y
      });
    }
  }
  return doors;
}

/**
 * Validate a single door
 */
function validateDoor(door, allDoors, rooms, roomIds) {
  const errors = [];
  const entity = door.entity;
  const properties = entity.properties || {};

  // Check required fields
  if (!properties.doorId) {
    errors.push(`Missing doorId for door in ${door.roomId} at (${door.x},${door.y})`);
    return errors; // Can't continue without doorId
  }

  const doorId = properties.doorId;

  // Check doorId uniqueness
  const duplicate = allDoors.find(d =>
    d !== door && (d.entity.properties?.doorId === doorId)
  );
  if (duplicate) {
    errors.push(`Duplicate doorId '${doorId}' found in ${door.roomId} and ${duplicate.roomId}`);
  }

  // Check toRoomId
  const toRoomId = properties.toRoomId;
  if (!toRoomId) {
    errors.push(`Missing toRoomId for door '${doorId}' in ${door.roomId}`);
  } else if (!roomIds.has(toRoomId)) {
    errors.push(`Invalid toRoomId '${toRoomId}' for door '${doorId}' in ${door.roomId} - room does not exist`);
  } else {
    // Check spawn target
    const destRoom = rooms[toRoomId];
    const spawns = getSpawnPoints(destRoom);
    const spawnTag = properties.toSpawnTag;
    const spawnX = properties.toSpawnX;
    const spawnY = properties.toSpawnY;

    if (spawnTag) {
      if (!spawns[spawnTag]) {
        errors.push(`Invalid toSpawnTag '${spawnTag}' for door '${doorId}' in ${door.roomId} - spawn point does not exist in ${toRoomId}`);
      }
    } else if (spawnX !== undefined && spawnY !== undefined) {
      // Coordinates are allowed but we don't validate them beyond existing
    } else {
      errors.push(`Missing spawn target for door '${doorId}' in ${door.roomId} - need toSpawnTag or toSpawnX/toSpawnY`);
    }

    // Check environment transition
    const fromRoom = rooms[door.roomId];
    if (fromRoom.environment === 'exterior' && destRoom.environment === 'exterior') {
      const notes = properties.notes || '';
      if (!notes.includes('allowed') && !notes.includes('exception')) {
        errors.push(`Exterior to exterior transition for door '${doorId}' from ${door.roomId} to ${toRoomId} - document as allowed in notes if intentional`);
      }
    }
  }

  // Check bounds (basic room bounds since no collision layer yet)
  const room = rooms[door.roomId];
  if (room && (door.x < 0 || door.x >= room.width || door.y < 0 || door.y >= room.height)) {
    errors.push(`Door '${doorId}' in ${door.roomId} at (${door.x},${door.y}) is outside room bounds (${room.width}x${room.height})`);
  }

  return errors;
}

/**
 * Main validation function
 */
async function validateDoors() {
  console.log('Loading rooms...');
  const { rooms, roomIds } = await loadRooms();

  console.log(`Found ${Object.keys(rooms).length} rooms`);

  // Collect all doors
  const allDoors = [];
  for (const [roomId, room] of Object.entries(rooms)) {
    const doors = getDoors(room, roomId);
    allDoors.push(...doors);
  }

  console.log(`Found ${allDoors.length} doors to validate`);

  // Validate each door
  const allErrors = [];
  for (const door of allDoors) {
    const errors = validateDoor(door, allDoors, rooms, roomIds);
    allErrors.push(...errors);
  }

  // Report results
  if (allErrors.length === 0) {
    console.log('✅ All doors validated successfully!');
    process.exit(0);
  } else {
    console.error('❌ Door validation failed:');
    for (const error of allErrors) {
      console.error(`  - ${error}`);
    }
    console.error(`\nFound ${allErrors.length} validation errors`);
    process.exit(1);
  }
}

// Run validation
validateDoors().catch(error => {
  console.error('Validation script failed:', error);
  process.exit(1);
});