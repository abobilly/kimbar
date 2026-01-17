# LPC Character Builder

A dual-mode tool for creating custom LPC (Liberated Pixel Cup) spritesheets.

## Modes

### 1. Visual UI Mode (for humans)
```bash
# Launch the web UI
python tools/lpc-builder/lpc-builder.py --ui
```
Opens a visual picker in your browser where you can:
- Select body type, skin color, hair, clothes, etc.
- Preview animations in real-time
- Export config JSON or download spritesheet

### 2. CLI Mode (for AI agents)

#### List available options
```bash
python tools/lpc-builder/lpc-builder.py --list-options
```

#### Generate from config
```bash
python tools/lpc-builder/lpc-builder.py --config mychar.json --output character.png
```

#### Generate random character
```bash
python tools/lpc-builder/lpc-builder.py --random --output random.png
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
  "hair_style": "short",
  "hair_color": "brown",
  "beard_style": "",
  "torso_item": "torso_clothes_longsleeve_formal",
  "torso_color": "white",
  "legs_item": "legs_pants",
  "legs_color": "black",
  "feet_item": "feet_shoes",
  "belt_item": "belt_leather",
  "head_item": "",
  "cape_item": ""
}
```

## AI Agent Commands

Simple commands for AI agents to generate characters:

### Quick Generate
```
lpc-builder random --output char_001.png
```

### Specific Character
```
lpc-builder config '{"body_type":"female","skin_color":"olive","hair_style":"long","hair_color":"black"}' --output judge.png
```

### List All Options
```
lpc-builder list
```

### Batch Multiple Characters
```
lpc-builder batch configs/*.json --output-dir ./generated/sprites/
```

## Available Options

### Body Types
- male, female, muscular, teen, child

### Skin Colors
- light, amber, olive, taupe, bronze, brown, black
- lavender, blue, green, zombie_green

### Hair Styles
- bangs, long, short, ponytail, mohawk, afro, curly, etc.

### Hair Colors
- black, brown, brunette, auburn, red, ginger, blonde, platinum, white, grey
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
