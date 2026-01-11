# LPC Vendor Assets

Drop third-party LPC asset packs here **unchanged**. Keep license/credits files alongside.

## Structure

```
vendor/lpc/<pack-name>/
├── CREDITS.txt or LICENSE.txt
├── sprites/
├── tilesets/
└── ...
```

## Rules

1. **Never modify files in vendor/** — they are immutable source drops
2. **Always keep attribution/license files** with each pack
3. **Run ingest script** to normalize and index assets:
   ```bash
   npm run build:asset-index
   ```

## Common Sources

- [OpenGameArt LPC Collection](https://opengameart.org/content/liberated-pixel-cup-lpc-base-assets-sprites-map-tiles)
- [LPC Sprite Generator](https://sanderfrenken.github.io/Universal-LPC-Spritesheet-Character-Generator/)

## License Notes

Most LPC assets are dual-licensed:
- **CC-BY-SA 3.0** — Attribution + ShareAlike
- **GPL 3.0** — GNU General Public License

Check each pack's CREDITS.txt for specific attribution requirements.
