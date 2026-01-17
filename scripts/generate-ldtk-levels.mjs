import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOMS_DIR = path.join(__dirname, '../content/rooms');
const OUTPUT_DIR = path.join(__dirname, '../public/content/ldtk');
const PLACEMENT_DRAFT_PATH = path.join(__dirname, '../content/placement_drafts/prop_placements.json');
const TILE_SIZE = 32;
const TILE_MAPPING_PATH = path.join(__dirname, '../public/content/ldtk/_tile_mapping.json');

// Ensure output directory exists
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

// Helper to read JSON
function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

// Helper to write JSON
function writeJson(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

function loadPlacementDrafts() {
  if (!fs.existsSync(PLACEMENT_DRAFT_PATH)) {
    return null;
  }

  try {
    const draft = readJson(PLACEMENT_DRAFT_PATH);
    return draft.placements || null;
  } catch (err) {
    console.warn(`Failed to load placement drafts: ${err.message}`);
    return null;
  }
}

function buildPlacementEntities(roomId, drafts) {
  if (!drafts || !drafts[roomId]) return [];
  const entries = drafts[roomId] || [];

  return entries.map((entry, idx) => {
    const zoneToken = (entry.zone || 'zone').toLowerCase().replace(/[^a-z0-9_]+/g, '_');
    const baseId = (entry.id || 'prop').replace(/^prop\./, 'prop_');
    const uniqueId = `${baseId}__${zoneToken}__${idx + 1}`;
    const spriteKey = entry.properties?.sprite || entry.id;

    const properties = {};
    if (spriteKey) properties.sprite = spriteKey;
    if (typeof entry.properties?.collision === 'boolean') {
      properties.collision = entry.properties.collision;
    }
    if (entry.id) properties.propId = entry.id;

    return {
      type: entry.type || 'Prop',
      x: entry.x,
      y: entry.y,
      id: uniqueId,
      properties
    };
  });
}

const ROOM_FLOOR_OVERRIDES = {
  cafeteria: 'tile.floor.cafeteria_tile_base',
  courtroom_main: 'tile.floor.court_carpet_runner_base',
  library: 'tile.floor.library_wood_base',
  records_vault: 'tile.floor.vault_stone_base',
  robing_room: 'tile.floor.robing_rug_base',
  press_room: 'tile.floor.press_carpet_base',
  scotus_lobby: 'tile.floor.lobby_mosaic_base',
  'room.scotus_hall_01': 'tile.floor.hall_marble_base'
};

function collectDoorCoords(roomSpec) {
  const coords = new Set();
  for (const entity of roomSpec.entities || []) {
    if (entity.type === 'Door' && Number.isInteger(entity.x) && Number.isInteger(entity.y)) {
      coords.add(`${entity.x},${entity.y}`);
    }
  }
  return coords;
}

function chooseTileName(roomSpec, x, y, width, height, doorCoords) {
  const isDoor = doorCoords.has(`${x},${y}`);
  const isTop = y === 0;
  const isBottom = y === height - 1;
  const isLeft = x === 0;
  const isRight = x === width - 1;
  const isEdge = isTop || isBottom || isLeft || isRight;

  if (isDoor) {
    if (roomSpec.id === 'courthouse_exterior') {
      return 'tile.ground.sidewalk_stone_base';
    }
    return ROOM_FLOOR_OVERRIDES[roomSpec.id] || 'tile.floor.marble.white_base';
  }

  if (roomSpec.id === 'courthouse_exterior') {
    const center = Math.floor(width / 2);
    if (Math.abs(x - center) <= 1 && y >= 3 && y <= height - 2) {
      return 'tile.ground.sidewalk_stone_base';
    }
  }

  if (isEdge) {
    if ((isTop && isLeft) || (isTop && isRight) || (isBottom && isLeft) || (isBottom && isRight)) {
      return 'tile.wall.interior_stone_corner_outer';
    }
    return 'tile.wall.interior_stone_straight';
  }

  const override = ROOM_FLOOR_OVERRIDES[roomSpec.id];
  if (override) {
    return override;
  }

  return roomSpec.id === 'records_vault' ? 'tile.floor.vault_stone_base' : 'tile.floor.marble.white_base';
}

function buildGridTiles(roomSpec, tileMapping) {
  if (!tileMapping || Object.keys(tileMapping).length === 0) {
    return [];
  }

  const width = roomSpec.width;
  const height = roomSpec.height;
  const doorCoords = collectDoorCoords(roomSpec);
  const tiles = [];

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const tileName = chooseTileName(roomSpec, x, y, width, height, doorCoords);
      const tileInfo = tileMapping[tileName];
      if (!tileInfo) continue;
      tiles.push({
        tileId: tileInfo.tileId,
        px: [x * TILE_SIZE, y * TILE_SIZE],
        srcRect: [tileInfo.x, tileInfo.y, TILE_SIZE, TILE_SIZE],
        tUid: tileInfo.tileId + 1000,
        f: 0,
        d: 0,
        __grid: [x, y]
      });
    }
  }

  return tiles;
}

// 1. Define LDtk Definitions (Layers, Entities, Fields)
// Using stable IDs for determinism
const DEFS = {
  layers: [
    {
      __type: "Entities",
      identifier: "Entities",
      type: "Entities",
      uid: 100,
      gridSize: TILE_SIZE,
      displayOpacity: 1,
      pxOffsetX: 0,
      pxOffsetY: 0,
      requiredTags: [],
      doc: "Game entities",
      intGridValues: []
    },
    {
      __type: "IntGrid",
      identifier: "Collisions",
      type: "IntGrid",
      uid: 101,
      gridSize: TILE_SIZE,
      displayOpacity: 0.5,
      pxOffsetX: 0,
      pxOffsetY: 0,
      requiredTags: [],
      doc: "Collision map (1 = wall)",
      intGridValues: [{ value: 1, identifier: "Wall", color: "#ff0000" }]
    },
    {
      __type: "IntGrid",
      identifier: "Floor",
      type: "IntGrid",
      uid: 102,
      gridSize: TILE_SIZE,
      displayOpacity: 1,
      pxOffsetX: 0,
      pxOffsetY: 0,
      requiredTags: [],
      doc: "Visual floor tiles",
      intGridValues: [{ value: 1, identifier: "Ground", color: "#7f7f7f" }]
    }
  ],
  entities: [
    {
      identifier: "PlayerSpawn",
      uid: 200,
      width: 32,
      height: 32,
      color: "#00ff00",
      fieldDefs: []
    },
    {
      identifier: "NPC",
      uid: 201,
      width: 32,
      height: 32,
      color: "#0000ff",
      fieldDefs: [
        { identifier: "name", uid: 301, type: "F_String", __type: "String" },
        { identifier: "storyKnot", uid: 302, type: "F_String", __type: "String" },
        { identifier: "characterId", uid: 303, type: "F_String", __type: "String" },
        { identifier: "sprite", uid: 304, type: "F_String", __type: "String" }
      ]
    },
    {
      identifier: "EncounterTrigger",
      uid: 202,
      width: 32,
      height: 32,
      color: "#ff00ff",
      fieldDefs: [
        { identifier: "deckTag", uid: 310, type: "F_String", __type: "String" },
        { identifier: "count", uid: 311, type: "F_Int", __type: "Int" },
        { identifier: "rewardId", uid: 312, type: "F_String", __type: "String" },
        { identifier: "once", uid: 313, type: "F_Bool", __type: "Bool" },
        { identifier: "name", uid: 314, type: "F_String", __type: "String" },
        { identifier: "justiceId", uid: 315, type: "F_String", __type: "String" }
      ]
    },
    {
      identifier: "Door",
      uid: 203,
      width: 32,
      height: 32,
      color: "#ffff00",
      fieldDefs: [
        { identifier: "targetLevel", uid: 320, type: "F_String", __type: "String" },
        { identifier: "locked", uid: 321, type: "F_Bool", __type: "Bool" },
        { identifier: "requiredItem", uid: 322, type: "F_String", __type: "String" }
      ]
    },
    {
      identifier: "OutfitChest",
      uid: 204,
      width: 32,
      height: 32,
      color: "#00ffff",
      fieldDefs: [
        { identifier: "outfitId", uid: 330, type: "F_String", __type: "String" }
      ]
    },
    {
      identifier: "Prop",
      uid: 205,
      width: 32,
      height: 32,
      color: "#8bc34a",
      fieldDefs: [
        { identifier: "sprite", uid: 340, type: "F_String", __type: "String" },
        { identifier: "collision", uid: 341, type: "F_Bool", __type: "Bool" },
        { identifier: "propId", uid: 342, type: "F_String", __type: "String" }
      ]
    }
  ],
  tilesets: [],
  enums: [],
  externalEnums: [],
  levelFields: []
};

// 2. Generate Template
const template = {
  __header__: {
    fileType: "LDtk Project JSON",
    app: "LDtk",
    doc: "https://ldtk.io/json",
    schema: "https://ldtk.io/files/JSON_SCHEMA.json",
    appAuthor: "Sebastien 'deepnight' Benard",
    appVersion: "1.5.3",
    url: "https://ldtk.io"
  },
  iid: "PROJECT_TEMPLATE_UID",
  jsonVersion: "1.5.3",
  appBuildId: 473703,
  nextUid: 1000,
  identifierStyle: "Capitalize",
  toc: [],
  worldLayout: "Free",
  worldGridWidth: 256,
  worldGridHeight: 256,
  defaultLevelWidth: 256,
  defaultLevelHeight: 256,
  defaultPivotX: 0,
  defaultPivotY: 0,
  defaultGridSize: TILE_SIZE,
  bgColor: "#40465B",
  defaultLevelBgColor: "#40465B",
  minifyJson: false,
  externalLevels: false,
  exportTiled: false,
  imageExportMode: "None",
  exportLevelBg: true,
  pngFilePattern: null,
  backupOnSave: false,
  backupLimit: 10,
  backupRelPath: null,
  levelNamePattern: "Level_%idx",
  tutorialDesc: null,
  customCommands: [],
  flags: [],
  defs: DEFS,
  levels: []
};

// Write template
writeJson(path.join(OUTPUT_DIR, '_template.ldtk'), template);
console.log(`Generated ${path.join(OUTPUT_DIR, '_template.ldtk')}`);

// 3. Process Rooms
const roomFiles = fs.readdirSync(ROOMS_DIR).filter(f => f.endsWith('.json'));
const placementDrafts = loadPlacementDrafts();
const tileMapping = fs.existsSync(TILE_MAPPING_PATH) ? readJson(TILE_MAPPING_PATH) : {};

roomFiles.sort(); // Stable order

roomFiles.forEach(file => {
  const roomSpec = readJson(path.join(ROOMS_DIR, file));
  const roomId = roomSpec.id;
  const placementEntities = buildPlacementEntities(roomId, placementDrafts);
  const combinedEntities = (roomSpec.entities || []).concat(placementEntities);

  // Clone template
  const ldtkProject = JSON.parse(JSON.stringify(template));
  ldtkProject.iid = `PROJECT_${roomId}`;

  // Create Level
  const level = {
    identifier: roomId,
    iid: `LEVEL_${roomId}`,
    uid: 500, // In a real project with multiple levels, this needs to be unique. Here it's 1 level per project.
    worldX: 0,
    worldY: 0,
    worldDepth: 0,
    pxWid: roomSpec.width * TILE_SIZE,
    pxHei: roomSpec.height * TILE_SIZE,
    __bgColor: roomSpec.background || "#000000",
    bgColor: roomSpec.background || "#000000",
    useAutoIdentifier: false,
    bgRelPath: null,
    bgPos: null,
    bgPivotX: 0.5,
    bgPivotY: 0.5,
    __smartColor: "#ADADB5",
    __bgPos: null,
    externalRelPath: null,
    fieldInstances: [],
    layerInstances: []
  };

  // Create Layer Instances
  // 1. Entities
  const entityInstances = combinedEntities.map((ent, idx) => {
    // Find def
    const def = DEFS.entities.find(d => d.identifier === ent.type);
    if (!def) {
      console.warn(`Unknown entity type ${ent.type} in ${roomId}`);
      return null;
    }

    // Convert fields
    const fieldInstances = [];
    if (ent.properties) {
      for (const [key, value] of Object.entries(ent.properties)) {
        const fieldDef = def.fieldDefs.find(fd => fd.identifier === key);
        if (fieldDef) {
          fieldInstances.push({
            __identifier: key,
            __type: fieldDef.__type,
            __value: value,
            __tile: null,
            defUid: fieldDef.uid,
            realEditorValues: []
          });
        }
      }
    }

    // Convert coords (RoomSpec uses grid coords, LDtk uses px coords bottom-center usually, but here we can just map to grid * tile)
    // ldtk-normalizer logic: 
    // if __worldX/Y undefined, check px. if px undefined, check __grid.
    // We will provide __grid and px for completeness.
    
    // LDtk Entity default pivot is (0.5, 1) -> Bottom Center.
    // If we put it at Grid(x,y), the pixel coord is:
    // x = gridX * 32
    // y = gridY * 32
    // But since pivot is (0.5, 1), the "position" in LDtk editor terms usually refers to that pivot point.
    // Let's stick to simple Top-Left grid mapping if possible, but LDtk is specific.
    // We will inject `__grid` which normalizer supports.
    
    return {
      __identifier: ent.type,
      __grid: [ent.x, ent.y],
      __pivot: [0, 0], // Force top-left pivot for simplicity with grid coords
      __tags: [],
      __tile: null,
      __smartColor: "#BEBEBE",
      iid: ent.id || `Entity_${roomId}_${idx}`,
      width: 32,
      height: 32,
      defUid: def.uid,
      px: [ent.x * TILE_SIZE, ent.y * TILE_SIZE],
      fieldInstances: fieldInstances
    };
  }).filter(e => e !== null);

  level.layerInstances.push({
    __identifier: "Entities",
    __type: "Entities",
    __cWid: roomSpec.width,
    __cHei: roomSpec.height,
    __gridSize: TILE_SIZE,
    __opacity: 1,
    __pxTotalOffsetX: 0,
    __pxTotalOffsetY: 0,
    __tilesetDefUid: null,
    __tilesetRelPath: null,
    iid: "LAYER_ENTITIES",
    levelId: level.uid,
    layerDefUid: 100,
    pxOffsetX: 0,
    pxOffsetY: 0,
    visible: true,
    optionalRules: [],
    intGridCsv: [],
    autoLayerTiles: [],
    seed: 0,
    overrideTilesetUid: null,
    gridTiles: [],
    entityInstances: entityInstances
  });

  // 2. Collisions (IntGrid)
  // Create an empty grid
  const gridCount = roomSpec.width * roomSpec.height;
  const collisionsCsv = new Array(gridCount).fill(0);
  
  // Fill boundaries if desired? No, just empty for now unless we want to assume walls.
  // Let's leave it empty (0) to match the spec which doesn't specify collisions explicitly in grid.
  
  level.layerInstances.push({
    __identifier: "Collisions",
    __type: "IntGrid",
    __cWid: roomSpec.width,
    __cHei: roomSpec.height,
    __gridSize: TILE_SIZE,
    __opacity: 1,
    __pxTotalOffsetX: 0,
    __pxTotalOffsetY: 0,
    __tilesetDefUid: null,
    __tilesetRelPath: null,
    iid: "LAYER_COLLISIONS",
    levelId: level.uid,
    layerDefUid: 101,
    pxOffsetX: 0,
    pxOffsetY: 0,
    visible: true,
    optionalRules: [],
    intGridCsv: collisionsCsv,
    autoLayerTiles: [],
    seed: 0,
    overrideTilesetUid: null,
    gridTiles: [],
    entityInstances: []
  });

  // 3. Floor (IntGrid) - fill with tile value 1 (Ground) for all cells
  const floorCsv = new Array(gridCount).fill(1);

  const floorTiles = buildGridTiles(roomSpec, tileMapping);

  level.layerInstances.push({
    __identifier: "Floor",
    __type: "IntGrid",
    __cWid: roomSpec.width,
    __cHei: roomSpec.height,
    __gridSize: TILE_SIZE,
    __opacity: 1,
    __pxTotalOffsetX: 0,
    __pxTotalOffsetY: 0,
    __tilesetDefUid: null,
    __tilesetRelPath: null,
    iid: "LAYER_FLOOR",
    levelId: level.uid,
    layerDefUid: 102,
    pxOffsetX: 0,
    pxOffsetY: 0,
    visible: true,
    optionalRules: [],
    intGridCsv: floorCsv,
    autoLayerTiles: [],
    seed: 0,
    overrideTilesetUid: null,
    gridTiles: floorTiles,
    entityInstances: []
  });

  ldtkProject.levels.push(level);

  const outFile = path.join(OUTPUT_DIR, `${roomId}.ldtk`);
  writeJson(outFile, ldtkProject);
  console.log(`Generated ${outFile}`);
});
