#!/usr/bin/env node
/**
 * Check Boundaries - Enforces agent editing restrictions via git diff
 * 
 * Usage: node scripts/check-boundaries.js
 * 
 * Fails if git diff shows changes to forbidden paths defined in content_contract.json
 */

import { execSync } from 'child_process';
import { readFile, access } from 'fs/promises';
import { constants } from 'fs';

const CONTRACT_PATH = './content/content_contract.json';

// Default forbidden paths if no contract
const DEFAULT_FORBIDDEN = [
  'generated/',
  'vendor/',
  'node_modules/',
  'public/content/art/'
];

async function loadContract() {
  try {
    await access(CONTRACT_PATH, constants.R_OK);
    const content = await readFile(CONTRACT_PATH, 'utf-8');
    return JSON.parse(content);
  } catch {
    return null;
  }
}

function getChangedFiles() {
  try {
    // Get staged and unstaged changes
    const staged = execSync('git diff --cached --name-only', { encoding: 'utf-8' }).trim();
    const unstaged = execSync('git diff --name-only', { encoding: 'utf-8' }).trim();
    
    const files = new Set();
    if (staged) staged.split('\n').forEach(f => files.add(f));
    if (unstaged) unstaged.split('\n').forEach(f => files.add(f));
    
    return [...files].filter(f => f.length > 0);
  } catch (e) {
    console.error('Warning: Could not get git diff (not a git repo or no changes)');
    return [];
  }
}

function matchesForbiddenPath(file, forbiddenPaths) {
  for (const forbidden of forbiddenPaths) {
    // Normalize path separators
    const normalizedForbidden = forbidden.replace(/\\/g, '/');
    const normalizedFile = file.replace(/\\/g, '/');
    
    if (normalizedFile.startsWith(normalizedForbidden)) {
      return forbidden;
    }
  }
  return null;
}

async function main() {
  console.log('🚧 Checking Agent Boundaries\n');
  console.log('=' .repeat(50));
  
  // Load contract
  const contract = await loadContract();
  const forbiddenPaths = contract?.agentBoundaries?.forbidden || DEFAULT_FORBIDDEN;
  
  console.log('\nForbidden paths:');
  forbiddenPaths.forEach(p => console.log(`  🚫 ${p}`));
  
  // Get changed files
  const changedFiles = getChangedFiles();
  
  if (changedFiles.length === 0) {
    console.log('\n✅ No changed files to check');
    return;
  }
  
  console.log(`\nChecking ${changedFiles.length} changed file(s)...`);
  
  // Check for violations
  const violations = [];
  
  for (const file of changedFiles) {
    const forbiddenMatch = matchesForbiddenPath(file, forbiddenPaths);
    if (forbiddenMatch) {
      violations.push({ file, rule: forbiddenMatch });
    }
  }
  
  console.log('\n' + '=' .repeat(50));
  
  if (violations.length > 0) {
    console.log('\n❌ Boundary Violations Found:\n');
    violations.forEach(v => {
      console.log(`  🚫 ${v.file}`);
      console.log(`     Violated rule: ${v.rule}`);
    });
    console.log('\nThese paths are forbidden. Revert changes or update content_contract.json.');
    process.exit(1);
  } else {
    console.log('\n✅ All changes are within allowed boundaries');
  }
}

main().catch(e => {
  console.error('Fatal error:', e);
  process.exit(1);
});
