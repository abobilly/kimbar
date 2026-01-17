#!/usr/bin/env node
/**
 * scripts/create-character.js
 * 
 * Generates a new NPC definition file in content/characters/
 * with randomized or specified LPC attributes.
 * 
 * Usage:
 *   node scripts/create-character.js "Justice Thomas" --body=male --role=justice
 *   node scripts/create-character.js "Clerk" --random
 */

import { writeFileSync } from 'fs';
import { join } from 'path';

// Configuration options - MUST match actual LPC asset paths!
// See vendor/lpc/Universal-LPC-Spritesheet-Character-Generator/spritesheets/
const OPTIONS = {
  body: ['male', 'female'],
  // Skin colors from body/bodies/{gender}/*.png
  skin: ['light', 'bronze', 'brown', 'olive', 'taupe', 'amber', 'black'],
  // Hair styles from hair/{style}/{gender}/
  hair: ['long', 'messy', 'mohawk', 'page', 'parted', 'pixie', 'ponytail', 'plain', 'bedhead'],
  // Hair colors (common across styles)
  hairColor: ['black', 'blonde', 'brown', 'gray', 'white', 'red'],
  // Torso options - use full path from torso/clothes/
  torso: ['longsleeve/longsleeve', 'longsleeve/formal', 'blouse', 'blouse_longsleeve', 'vest'],
  // Common colors available for clothing
  torsoColor: ['white', 'black', 'blue', 'brown', 'green', 'maroon', 'navy', 'gray', 'red', 'teal', 'charcoal'],
  // Legs options - use full path from legs/
  legs: ['pants', 'formal', 'skirts/slit', 'skirts/straight'],
  legsColor: ['white', 'black', 'blue', 'brown', 'green', 'maroon', 'navy', 'gray', 'charcoal', 'teal'],
  feet: ['shoes', 'boots', 'sandals'],
  feetColor: ['black', 'brown', 'maroon']
};

// Helper to pick random item
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

function parseArgs() {
  const args = process.argv.slice(2);
  const config = {
    name: '',
    id: '',
    role: 'npc',
    ulpcArgs: {}
  };

  if (args.length === 0) {
    console.error('Usage: node scripts/create-character.js "Name" [options]');
    process.exit(1);
  }

  // First arg is usually name
  if (!args[0].startsWith('--')) {
    config.name = args[0];
    args.shift();
  }

  // Parse flags
  for (const arg of args) {
    if (arg.startsWith('--')) {
      const [key, val] = arg.slice(2).split('=');
      
      if (key === 'role') config.role = val;
      else if (key === 'id') config.id = val;
      else if (OPTIONS[key]) {
        config.ulpcArgs[key] = val;
      }
    }
  }

  return config;
}

function generateRandomAttributes(base = {}) {
  const gender = base.body || pick(['male', 'female']);
  
  return {
    body: gender,
    skin: base.skin || pick(OPTIONS.skin),
    hair: base.hair || pick(OPTIONS.hair),
    hairColor: base.hairColor || pick(OPTIONS.hairColor),
    torso: base.torso || pick(OPTIONS.torso),
    torsoColor: base.torsoColor || pick(OPTIONS.torsoColor),
    legs: base.legs || pick(OPTIONS.legs),
    legsColor: base.legsColor || pick(OPTIONS.legsColor),
    feet: base.feet || pick(OPTIONS.feet),
    feetColor: base.feetColor || pick(OPTIONS.feetColor),
    ...base // Overrides win
  };
}

function normalizeId(name) {
  return 'npc.' + name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
}

function main() {
  const config = parseArgs();
  
  if (!config.name) {
    console.error('Error: Character name is required');
    process.exit(1);
  }

  const id = config.id || normalizeId(config.name);
  const ulpcArgs = generateRandomAttributes(config.ulpcArgs);

  const charSpec = {
    "$schema": "../../schemas/CharacterSpec.schema.json",
    "id": id,
    "name": config.name,
    "description": `Auto-generated character: ${config.name}`,
    "ulpcArgs": ulpcArgs,
    "animations": [
      "idle_down", "idle_left", "idle_right", "idle_up",
      "walk_down", "walk_left", "walk_right", "walk_up"
    ],
    // Standard animation definitions
    "anims": {
      "idle_up": { "frames": [91], "frameRate": 1, "repeat": 0 },
      "idle_left": { "frames": [104], "frameRate": 1, "repeat": 0 },
      "idle_down": { "frames": [117], "frameRate": 1, "repeat": 0 },
      "idle_right": { "frames": [130], "frameRate": 1, "repeat": 0 },
      "walk_up": { "frames": [91,92,93,94,95,96,97,98,99], "frameRate": 10, "repeat": -1 },
      "walk_left": { "frames": [104,105,106,107,108,109,110,111,112], "frameRate": 10, "repeat": -1 },
      "walk_down": { "frames": [117,118,119,120,121,122,123,124,125], "frameRate": 10, "repeat": -1 },
      "walk_right": { "frames": [130,131,132,133,134,135,136,137,138], "frameRate": 10, "repeat": -1 }
    },
    "metadata": {
      "role": config.role,
      "generated": true
    }
  };

  const outputPath = join('content', 'characters', `${id}.json`);
  
  writeFileSync(outputPath, JSON.stringify(charSpec, null, 4));
  
  console.log(`\n✅ Created character spec: ${outputPath}`);
  console.log(`   ID: ${id}`);
  console.log('   Attributes:', ulpcArgs);
  console.log('\nTo generate sprites, run:');
  console.log(`   npm run gen:sprites -- ${id}`);
}

main();
