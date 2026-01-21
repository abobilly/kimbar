# Tiled Pipeline Verification Report

**Generated:** 2026-01-20T23:50:33Z  
**Purpose:** Document the current state of the Tiled pipeline migration and provide auditable evidence that all playable rooms have been migrated to Tiled-first.

---

## 1. Playable Rooms Truth Table

This table verifies that all rooms defined in `specs/room_entries/` have corresponding TMX files and are included in the world manifest.

| Room ID | TMX Exists | In World Manifest | In Room Entries |
|---------|------------|-------------------|-----------------|
| cafeteria | ✓ | ✓ | ✓ |
| chambers_alito | ✓ | ✓ | ✓ |
| chambers_barrett | ✓ | ✓ | ✓ |
| chambers_gorsuch | ✓ | ✓ | ✓ |
| chambers_jackson | ✓ | ✓ | ✓ |
| chambers_kagan | ✓ | ✓ | ✓ |
| chambers_kavanaugh | ✓ | ✓ | ✓ |
| chambers_roberts | ✓ | ✓ | ✓ |
| chambers_sotomayor | ✓ | ✓ | ✓ |
| chambers_thomas | ✓ | ✓ | ✓ |
| courthouse_exterior | ✓ | ✓ | ✓ |
| courtroom_main | ✓ | ✓ | ✓ |
| library | ✓ | ✓ | ✓ |
| press_room | ✓ | ✓ | ✓ |
| records_vault | ✓ | ✓ | ✓ |
| robing_room | ✓ | ✓ | ✓ |
| room_scotus_hall_01 | ✓ | ✓ | ✓ |
| scotus_lobby | ✓ | ✓ | ✓ |

### Summary

- **Room Entries:** 18
- **TMX Files (matching room entries):** 18/18 ✓
- **In World Manifest:** 18/18 ✓
- **Coverage:** 100%

### Additional TMX Files (Shell Templates)

The following TMX files exist but are not in room_entries (they are shell templates for development):

| TMX File | Purpose |
|----------|---------|
| scotus_chambers_shell.tmx | Template for chambers rooms |
| scotus_courtroom_shell.tmx | Template for courtroom |
| scotus_hallway_01.tmx | Hallway template |
| scotus_library_shell.tmx | Library template |
| scotus_lobby_small.tmx | Small lobby variant |
| scotus_office_shell.tmx | Office template |

---

## 2. World Manifest Summary

**Path:** `public/content/tiled/worlds/scotus.world`  
**Total Maps:** 18

### Maps Included

| Map | Position | Dimensions |
|-----|----------|------------|
| cafeteria.tmx | (0, 0) | 640×480px |
| chambers_alito.tmx | (704, 0) | 480×384px |
| chambers_barrett.tmx | (1248, 0) | 480×384px |
| chambers_gorsuch.tmx | (1792, 0) | 480×384px |
| chambers_jackson.tmx | (0, 544) | 480×384px |
| chambers_kagan.tmx | (544, 544) | 480×384px |
| chambers_kavanaugh.tmx | (1088, 544) | 480×384px |
| chambers_roberts.tmx | (1632, 544) | 480×384px |
| chambers_sotomayor.tmx | (0, 992) | 480×384px |
| chambers_thomas.tmx | (544, 992) | 480×384px |
| courthouse_exterior.tmx | (1088, 992) | 800×640px |
| courtroom_main.tmx | (1952, 992) | 960×640px |
| library.tmx | (0, 1696) | 640×480px |
| press_room.tmx | (704, 1696) | 480×384px |
| records_vault.tmx | (1248, 1696) | 480×384px |
| robing_room.tmx | (1792, 1696) | 480×384px |
| room_scotus_hall_01.tmx | (0, 2240) | 640×480px |
| scotus_lobby.tmx | (704, 2240) | 640×480px |

---

## 3. Validation Command Results

**Commands Run:** 2026-01-20T23:49:49Z - 2026-01-20T23:50:27Z

### 3.1 `npm run validate:tiled`

| Status | Result |
|--------|--------|
| **PASS** | ✅ All Tiled maps valid |

**Summary:**
- 24 TMX files validated
- 6 JSON files validated
- Total: 30 maps passed, 0 failed

### 3.2 `npm run compile:tiled`

| Status | Result |
|--------|--------|
| **PASS** | ✅ Compiled to public/generated/levels/tiled |

**Summary:**
- 24 TMX files compiled
- 6 JSON files compiled
- Total: 30 succeeded, 0 failed

### 3.3 `npm run build:tiled-world`

| Status | Result |
|--------|--------|
| **PASS** | ✅ Generated scotus.world |

**Summary:**
- 18 room entries processed
- 18 maps included in world file
- World graph bounds detected for: courthouse_exterior, courtroom_main, scotus_lobby

### 3.4 `npm run build:levels`

| Status | Result |
|--------|--------|
| **PASS** | ✅ Level index generated |

**Summary:**
- Tiled levels: 30
- LDtk fallback levels: 2 (legacy, not used when Tiled exists)
- All room entries have Tiled sources

### 3.5 `npm run validate`

| Status | Result |
|--------|--------|
| **PASS** | ✅ All validations passed |

**Tiled-First Summary:**
- Tiled: 18 rooms
- LDtk fallback: 0 rooms

**Warnings (non-blocking):**
- World graph node 'hallway' not found in registry
- Door position mismatches in scotus_lobby.json
- ULPC manifest is empty
- Missing tile definitions for various rooms (art assets pending)

### 3.6 `TILED_ONLY=1 npm run validate` (Strict Mode)

| Status | Result |
|--------|--------|
| **PASS** | ✅ All validations passed in strict mode |

**Summary:**
- Strict mode enabled: No LDtk fallback allowed
- All 18 rooms have Tiled source + compiled output
- Same warnings as standard validation

---

## 4. Documentation Gate Results

**Command:** `npm run verify:docs`

| Check | Status |
|-------|--------|
| TILED_PIPELINE.md exists | ✅ PASS |
| Contains specs/** folder invariant | ✅ PASS |
| Contains public/content/** folder invariant | ✅ PASS |
| Contains public/generated/** folder invariant | ✅ PASS |
| Contains TILED_ONLY strict mode reference | ✅ PASS |
| .gitignore exists | ✅ PASS |
| public/generated is in .gitignore | ✅ PASS |
| No tracked files in public/generated/ | ✅ PASS |
| World manifest exists | ✅ PASS |
| World manifest has 18 maps | ✅ PASS |

**Warning:** 6 TMX files not in world manifest (shell templates, expected)

**Overall:** ✅ Documentation gate PASSED with warnings

---

## 5. Conclusion

### Overall Status: ✅ PASS

The Tiled pipeline migration is **complete** for all playable rooms.

### Key Findings

1. **100% Coverage:** All 18 room entries have corresponding TMX files
2. **World Manifest Complete:** All 18 playable rooms are in the world manifest
3. **Strict Mode Passes:** `TILED_ONLY=1` validation succeeds with no LDtk fallbacks
4. **Pipeline Functional:** All build and validation commands pass
5. **Documentation Current:** All documentation gates pass

### Warnings (Non-Blocking)

| Category | Count | Notes |
|----------|-------|-------|
| Missing tile assets | 18 rooms | Art assets pending generation |
| Door position mismatches | 2 | scotus_lobby.json needs portal sync |
| World graph orphan | 1 | 'hallway' node not in registry |
| Shell templates | 6 | TMX files not in world manifest (expected) |

### References

- [TILED_PIPELINE.md](./TILED_PIPELINE.md) — Authoritative Tiled pipeline documentation
- [WORLD_CONTRACT.md](./WORLD_CONTRACT.md) — World manifest and room connectivity
- [MIGRATION_GUIDE.md](./MIGRATION_GUIDE.md) — Migration guidance for legacy content

---

*Report generated automatically. Re-run validation commands to verify current state.*
