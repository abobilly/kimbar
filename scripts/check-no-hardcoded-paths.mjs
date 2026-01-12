#!/usr/bin/env node
/**
 * Fast pre-commit check: ensure no hardcoded /content/ paths outside loader.
 * Runs in <1s. If this fails, commit is blocked.
 * 
 * INVARIANT: Registry-Driven Routing (SACRED)
 * Runtime code NEVER constructs content paths manually.
 * All content accessed via typed registry accessors.
 */
import { execSync } from 'child_process';
import { existsSync } from 'fs';
import path from 'path';

// Files/directories where /content/ paths ARE allowed
const ALLOWED_PATTERNS = [
  'src/content/',           // ContentLoader itself
  'scripts/',               // Build scripts
  '.github/',               // CI/docs
  'docs/',                  // Documentation
  'NEXT_SESSION.md',        // Handoff doc
  'AGENT_TASK_',            // Task specs
  'test',                   // Test files
  '.test.',                 // Test files
  '.spec.',                 // Test files
];

// Patterns that are OK even in game code (comments, registry access)
const ALLOWED_CONTENT_PATTERNS = [
  '/generated/',            // Registry paths (these come FROM registry, not hardcoded)
  '// ',                    // Comments
  '* ',                     // JSDoc comments
  'registry',               // Registry access
  'getRoom',                // Registry accessor
  'getFlashcard',           // Registry accessor
  'getInkStory',            // Registry accessor
  'loadFlashcards',         // Registry loader
  'loadRoomData',           // Registry loader
];

console.log('🔍 Checking for hardcoded content paths...\n');

try {
  // Check if src/game exists
  if (!existsSync('src/game')) {
    console.log('✓ No src/game directory found, skipping check');
    process.exit(0);
  }

  // Grep for /content/ in src/game/ (TypeScript files only)
  let result = '';
  try {
    // Use PowerShell-compatible command on Windows
    if (process.platform === 'win32') {
      result = execSync(
        'powershell -Command "Get-ChildItem -Path src/game -Recurse -Include *.ts | Select-String -Pattern \'/content/\' | ForEach-Object { $_.Path + \':\' + $_.LineNumber + \':\' + $_.Line }"',
        { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }
      );
    } else {
      result = execSync(
        'grep -rn "/content/" src/game/ --include="*.ts" || true',
        { encoding: 'utf8' }
      );
    }
  } catch (e) {
    // grep returns exit code 1 if no matches, which is fine
    if (e.status !== 1) {
      throw e;
    }
    result = '';
  }

  if (!result.trim()) {
    console.log('✓ No /content/ paths found in src/game/');
    process.exit(0);
  }

  // Filter out allowed patterns
  const lines = result.trim().split('\n');
  const violations = [];

  for (const line of lines) {
    // Skip if file is in allowed list
    const isAllowedFile = ALLOWED_PATTERNS.some(pattern => line.includes(pattern));
    if (isAllowedFile) continue;

    // Skip if line contains allowed content pattern (comments, registry access)
    const isAllowedContent = ALLOWED_CONTENT_PATTERNS.some(pattern => line.includes(pattern));
    if (isAllowedContent) continue;

    violations.push(line);
  }

  if (violations.length === 0) {
    console.log('✓ No hardcoded content paths detected');
    console.log(`  (${lines.length} matches were in allowed contexts)`);
    process.exit(0);
  }

  // Report violations
  console.error('❌ INVARIANT VIOLATION: Hardcoded /content/ paths found in game code!\n');
  console.error('The following lines contain hardcoded content paths:');
  console.error('─'.repeat(60));
  
  for (const violation of violations) {
    console.error(`  ${violation}`);
  }
  
  console.error('─'.repeat(60));
  console.error(`\n${violations.length} violation(s) found.\n`);
  console.error('FIX: Use registry accessors instead of hardcoded paths:');
  console.error('  ✗ fetch(\'/content/ldtk/room.json\')');
  console.error('  ✓ const room = content.getRoom(\'room_id\');');
  console.error('     fetch(room.ldtkUrl);');
  console.error('\nSee docs/INVARIANTS.md for details.');
  
  process.exit(1);

} catch (e) {
  console.error('❌ Check failed:', e.message);
  // Don't block commit if check itself fails - let CI catch it
  console.error('⚠️  Allowing commit, but please verify manually or check CI.');
  process.exit(0);
}
