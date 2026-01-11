#!/usr/bin/env node
/**
 * Verify - Runs all validation checks required before commit
 * 
 * Usage: node scripts/verify.js
 * 
 * Runs:
 *   1. npm run validate (content validation)
 *   2. npm run check-boundaries (agent boundary enforcement)
 */

import { spawn } from 'child_process';

function runCommand(command, args) {
  return new Promise((resolve, reject) => {
    console.log(`\n🔄 Running: ${command} ${args.join(' ')}\n`);
    console.log('-'.repeat(50));
    
    const proc = spawn(command, args, {
      stdio: 'inherit',
      shell: true
    });
    
    proc.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`${command} ${args.join(' ')} failed with code ${code}`));
      }
    });
    
    proc.on('error', (err) => {
      reject(err);
    });
  });
}

async function main() {
  console.log('🔒 Kim Bar Verification Suite');
  console.log('=' .repeat(50));
  
  try {
    // Run validate
    await runCommand('npm', ['run', 'validate']);
    
    console.log('\n' + '=' .repeat(50));
    
    // Run check-boundaries
    await runCommand('npm', ['run', 'check-boundaries']);
    
    console.log('\n' + '=' .repeat(50));
    console.log('\n✅ All verifications passed!');
    console.log('   Safe to commit.\n');
    
  } catch (e) {
    console.log('\n' + '=' .repeat(50));
    console.log(`\n❌ Verification failed: ${e.message}`);
    console.log('   Fix errors before committing.\n');
    process.exit(1);
  }
}

main();
