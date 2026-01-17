# LPC Character Builder

A dual-mode tool for creating custom LPC (Liberated Pixel Cup) spritesheets using real ULPC sprites.

## Modes

### 1. Visual UI Mode (for humans)
```bash
npm run lpc:ui
# or: python tools/lpc-builder/lpc-builder.py --ui
```
Opens a visual picker in your browser where you can:
- Select body type, skin color, hair, clothes, etc.
- Preview animations in real-time (fetched from server)
- Export full spritesheet PNG or copy config JSON

### 2. CLI Mode (for AI agents)

#### List available options
```bash
npm run lpc:list
# or: python tools/lpc-builder/lpc-builder.py --list-options
```

#### Generate from config (file or inline JSON)
```bash
python tools/lpc-builder/lpc-builder.py --config mychar.json --output character.png
python tools/lpc-builder/lpc-builder.py -c '{"body_type":"male","skin_color":"light"}' -o char.png
```

#### Generate random character
```bash
npm run lpc:random
# or: python tools/lpc-builder/lpc-builder.py --random --output random.png
```

#### Batch generation
```bash
python tools/lpc-builder/lpc-builder.py --batch batch.json --output-dir ./characters/
```

## Config Format

```json
{
  "name": "lawyer_frank",
  "body_type": "male",
  "skin_color": "light",
  "eye_color": "blue",
  "hair_style": "plain",
  "hair_color": "dark brown",
  "beard_style": "beard",
  "beard_color": "dark brown",
  "torso": "torso_clothes_longsleeve_formal",
  "torso_color": "white",
  "legs": "legs_pants_formal",
  "legs_color": "black",
  "feet": "feet_shoes",
  "feet_color": "black"
}
```

## AI Agent Commands

Simple commands for AI agents to generate characters:

### Quick Generate
```bash
python tools/lpc-builder/lpc-builder.py --random -o char_001.png
```

### Specific Character
```bash
python tools/lpc-builder/lpc-builder.py -c '{"body_type":"female","skin_color":"olive","hair_style":"long","hair_color":"black"}' -o judge.png
```

### List All Options
```bash
python tools/lpc-builder/lpc-builder.py --list-options
```

### Batch Multiple Characters
```bash
python tools/lpc-builder/lpc-builder.py --batch batch.json --output-dir ./generated/sprites/
```

## Available Options

Run `--list-options` for the complete list. Common options:

### Body Types
- male, female, muscular, teen, child

### Skin Colors  
- light, amber, olive, taupe, bronze, brown, black
- lavender, blue, green, zombie_green
- fur_black, fur_brown, fur_tan, etc.

### Hair Styles (90+)
- plain, long, short, ponytail, mohawk, afro, curly, etc.

### Hair Colors
- black, brown, dark brown, light brown, chestnut, auburn
- red, ginger, blonde, platinum, white, gray
- blue, green, purple, pink (fantasy colors)

### Eye Colors
- blue, green, brown, grey, amber, red, purple, yellow

### Clothing (examples)
- Torso: longsleeve, shortsleeve, sleeveless, robe, vest
- Legs: pants, shorts, skirt
- Feet: shoes, boots, sandals

### Accessories
- Headwear: cap, hood, helmet, crown
- Belts: leather, sash
- Capes: solid, tattered

## Integration with Kimbar

Generated spritesheets are saved to `generated/sprites/` and automatically picked up by the content pipeline:

```bash
# After generating characters
npm run prepare:content
```

This will:
1. Index the new spritesheets
2. Generate portraits
3. Update the asset registry

## Examples

### Corporate Lawyer
```json
{
  "name": "corporate_lawyer",
  "body_type": "male",
  "skin_color": "light",
  "hair_style": "short",
  "hair_color": "grey",
  "torso_item": "torso_clothes_longsleeve_formal",
  "torso_color": "white",
  "legs_item": "legs_pants",
  "legs_color": "black"
}
```

### Public Defender
```json
{
  "name": "public_defender",
  "body_type": "female",
  "skin_color": "bronze",
  "hair_style": "ponytail",
  "hair_color": "black",
  "torso_item": "torso_clothes_shortsleeve",
  "torso_color": "blue",
  "legs_item": "legs_skirt",
  "legs_color": "grey"
}
```

### Judge
```json
{
  "name": "judge_williams",
  "body_type": "male",
  "skin_color": "brown",
  "hair_style": "short",
  "hair_color": "white",
  "torso_item": "torso_clothes_robe",
  "torso_color": "black"
}
```
