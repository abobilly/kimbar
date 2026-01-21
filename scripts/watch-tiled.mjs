#!/usr/bin/env node
/**
 * Tiled File Watcher
 * 
 * Watches public/content/tiled/** for changes to TMX, TSX, and .world files.
 * On change, runs the Tiled build pipeline:
 *   1. validate:tiled - Validate changed files
 *   2. compile:tiled - Compile to JSON
 *   3. build:tiled-world - Rebuild world manifest
 *   4. build:levels - Rebuild level index
 * 
 * Usage:
 *   node scripts/watch-tiled.mjs
 *   node scripts/watch-tiled.mjs --no-validate
 *   node scripts/watch-tiled.mjs --verbose
 */

import { spawn } from 'child_process';
import { watch } from 'chokidar';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.join(__dirname, '..');

// Configuration
const WATCH_DIR = path.join(PROJECT_ROOT, 'public', 'content', 'tiled');
const WATCH_PATTERNS = [
  '**/*.tmx',
  '**/*.tsx',
  '**/*.world'
];
const DEBOUNCE_MS = 300;

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m'
};

// Parse command line arguments
const args = process.argv.slice(2);
const skipValidation = args.includes('--no-validate');
const verbose = args.includes('--verbose');

/**
 * Run an npm script and capture output
 * @param {string} scriptName - npm script name
 * @returns {Promise<{success: boolean, output: string, duration: number}>}
 */
function runNpmScript(scriptName) {
  return new Promise((resolve) => {
    const startTime = Date.now();
    const isWindows = process.platform === 'win32';
    const npmCmd = isWindows ? 'npm.cmd' : 'npm';
    
    const child = spawn(npmCmd, ['run', scriptName], {
      cwd: PROJECT_ROOT,
      stdio: ['ignore', 'pipe', 'pipe'],
      shell: isWindows
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    child.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    child.on('close', (code) => {
      const duration = Date.now() - startTime;
      resolve({
        success: code === 0,
        output: stdout + stderr,
        duration
      });
    });

    child.on('error', (err) => {
      const duration = Date.now() - startTime;
      resolve({
        success: false,
        output: err.message,
        duration
      });
    });
  });
}

/**
 * Extract summary count from script output
 * @param {string} output - Script output
 * @param {string} scriptName - Script name for context
 * @returns {string} Summary string
 */
function extractSummary(output, scriptName) {
  // Try to extract meaningful counts from output
  const lines = output.split('\n');
  
  switch (scriptName) {
    case 'validate:tiled': {
      // Look for "X maps validated" or similar
      const validatedMatch = output.match(/(\d+)\s+(?:maps?\s+)?validated/i);
      const passedMatch = output.match(/(\d+)\s+passed/i);
      if (validatedMatch) return `${validatedMatch[1]} maps validated`;
      if (passedMatch) return `${passedMatch[1]} passed`;
      // Count checkmarks
      const checkmarks = (output.match(/✓/g) || []).length;
      if (checkmarks > 0) return `${checkmarks} maps validated`;
      return 'validated';
    }
    case 'compile:tiled': {
      // Look for "X succeeded" or count checkmarks
      const succeededMatch = output.match(/(\d+)\s+succeeded/i);
      const compiledMatch = output.match(/(\d+)\s+(?:maps?\s+)?compiled/i);
      if (succeededMatch) return `${succeededMatch[1]} maps compiled`;
      if (compiledMatch) return `${compiledMatch[1]} maps compiled`;
      const checkmarks = (output.match(/✓/g) || []).length;
      if (checkmarks > 0) return `${checkmarks} maps compiled`;
      return 'compiled';
    }
    case 'build:tiled-world': {
      // Look for "Maps included: X"
      const mapsMatch = output.match(/Maps included:\s*(\d+)/i);
      const collectedMatch = output.match(/Collected\s+(\d+)\s+maps/i);
      if (mapsMatch) return `${mapsMatch[1]} maps in world`;
      if (collectedMatch) return `${collectedMatch[1]} maps in world`;
      return 'world rebuilt';
    }
    case 'build:levels': {
      // Look for "Tiled: X" or count indexed levels
      const tiledMatch = output.match(/Tiled:\s*(\d+)/i);
      const indexedMatch = output.match(/(\d+)\s+levels?\s+indexed/i);
      if (tiledMatch) return `${tiledMatch[1]} levels indexed`;
      if (indexedMatch) return `${indexedMatch[1]} levels indexed`;
      return 'levels indexed';
    }
    default:
      return 'done';
  }
}

/**
 * Extract error message from script output
 * @param {string} output - Script output
 * @returns {string} Error message
 */
function extractError(output) {
  const lines = output.split('\n');
  
  // Look for ERROR: lines
  for (const line of lines) {
    if (line.includes('ERROR:')) {
      return line.trim();
    }
    if (line.includes('✗')) {
      return line.trim();
    }
  }
  
  // Look for any line with "error" (case insensitive)
  for (const line of lines) {
    if (/error/i.test(line) && line.trim().length > 0) {
      return line.trim();
    }
  }
  
  return 'Unknown error (check output above)';
}

/**
 * Run the full Tiled build pipeline
 * @param {string} changedFile - Path to the changed file
 */
async function runPipeline(changedFile) {
  const relativePath = path.relative(PROJECT_ROOT, changedFile);
  const startTime = Date.now();
  
  console.log(`\n${colors.blue}📝${colors.reset} Changed: ${colors.cyan}${relativePath}${colors.reset}`);
  
  // Define pipeline steps
  const steps = [];
  
  if (!skipValidation) {
    steps.push({ name: 'validate:tiled', label: 'validate:tiled' });
  }
  
  steps.push(
    { name: 'compile:tiled', label: 'compile:tiled' },
    { name: 'build:tiled-world', label: 'build:tiled-world' },
    { name: 'build:levels', label: 'build:levels' }
  );
  
  let pipelineFailed = false;
  
  for (let i = 0; i < steps.length; i++) {
    const step = steps[i];
    const isLast = i === steps.length - 1;
    const prefix = isLast ? '   └─' : '   ├─';
    
    process.stdout.write(`${prefix} ${step.label} ... `);
    
    const result = await runNpmScript(step.name);
    
    if (result.success) {
      const summary = extractSummary(result.output, step.name);
      console.log(`${colors.green}✓${colors.reset} ${summary}`);
      
      if (verbose) {
        const indentedOutput = result.output
          .split('\n')
          .filter(line => line.trim())
          .map(line => `   ${colors.dim}│${colors.reset}  ${colors.gray}${line}${colors.reset}`)
          .join('\n');
        if (indentedOutput) {
          console.log(indentedOutput);
        }
      }
    } else {
      console.log(`${colors.red}✗${colors.reset} ${colors.red}Failed${colors.reset}`);
      
      // Show error details
      const errorMsg = extractError(result.output);
      console.log(`   ${colors.dim}│${colors.reset}  ${colors.red}${errorMsg}${colors.reset}`);
      
      if (verbose) {
        const indentedOutput = result.output
          .split('\n')
          .filter(line => line.trim())
          .map(line => `   ${colors.dim}│${colors.reset}  ${colors.gray}${line}${colors.reset}`)
          .join('\n');
        if (indentedOutput) {
          console.log(indentedOutput);
        }
      }
      
      console.log(`   ${colors.dim}└─${colors.reset} ${colors.yellow}Pipeline stopped. Fix errors and save again.${colors.reset}`);
      pipelineFailed = true;
      break;
    }
  }
  
  if (!pipelineFailed) {
    const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`   ${colors.dim}⏱️${colors.reset}  Done in ${colors.green}${totalTime}s${colors.reset}`);
  }
}

/**
 * Debounce function to prevent multiple rapid executions
 */
function debounce(fn, delay) {
  let timeoutId = null;
  let pendingFile = null;
  
  return (file) => {
    pendingFile = file;
    
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    
    timeoutId = setTimeout(() => {
      timeoutId = null;
      fn(pendingFile);
    }, delay);
  };
}

/**
 * Main entry point
 */
async function main() {
  console.log(`${colors.bold}🔍 Tiled File Watcher${colors.reset}`);
  console.log(`${colors.dim}${'─'.repeat(50)}${colors.reset}`);
  console.log(`${colors.gray}Watching: ${WATCH_DIR}${colors.reset}`);
  console.log(`${colors.gray}Patterns: ${WATCH_PATTERNS.join(', ')}${colors.reset}`);
  
  if (skipValidation) {
    console.log(`${colors.yellow}⚠ Validation skipped (--no-validate)${colors.reset}`);
  }
  if (verbose) {
    console.log(`${colors.cyan}ℹ Verbose mode enabled${colors.reset}`);
  }
  
  console.log(`\n${colors.green}👀 Watching for changes...${colors.reset} ${colors.dim}(Ctrl+C to stop)${colors.reset}\n`);
  
  // Create debounced pipeline runner
  const debouncedPipeline = debounce(runPipeline, DEBOUNCE_MS);
  
  // Set up file watcher
  const watcher = watch(WATCH_PATTERNS, {
    cwd: WATCH_DIR,
    ignoreInitial: true,
    persistent: true,
    awaitWriteFinish: {
      stabilityThreshold: 100,
      pollInterval: 50
    }
  });
  
  // Handle file changes
  watcher.on('change', (relativePath) => {
    const fullPath = path.join(WATCH_DIR, relativePath);
    debouncedPipeline(fullPath);
  });
  
  watcher.on('add', (relativePath) => {
    const fullPath = path.join(WATCH_DIR, relativePath);
    debouncedPipeline(fullPath);
  });
  
  // Handle watcher errors
  watcher.on('error', (error) => {
    console.error(`${colors.red}Watcher error: ${error.message}${colors.reset}`);
  });
  
  // Handle graceful shutdown
  process.on('SIGINT', () => {
    console.log(`\n\n${colors.yellow}👋 Stopping watcher...${colors.reset}`);
    watcher.close().then(() => {
      console.log(`${colors.green}✓ Watcher stopped${colors.reset}`);
      process.exit(0);
    });
  });
  
  process.on('SIGTERM', () => {
    watcher.close().then(() => {
      process.exit(0);
    });
  });
}

main().catch((err) => {
  console.error(`${colors.red}Fatal error: ${err.message}${colors.reset}`);
  process.exit(1);
});
