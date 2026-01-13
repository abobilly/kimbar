#!/usr/bin/env node
/**
 * generate-ai-assets.mjs - Generate game assets via ComfyUI
 *
 * Usage:
 *   node scripts/generate-ai-assets.mjs              # Generate all jobs
 *   node scripts/generate-ai-assets.mjs --dry-run   # Validate without generating
 *   node scripts/generate-ai-assets.mjs --job=props # Generate specific job
 *
 * Prerequisites:
 *   - ComfyUI running on http://127.0.0.1:8188
 *   - Required nodes installed (PixelArt Processing, etc.)
 *   - SDXL or compatible checkpoint
 *
 * Output:
 *   - generated/ai-sprites/*.png
 *   - generated/ai-manifest.json
 */

import { readFile, writeFile, readdir, mkdir, copyFile, unlink } from 'fs/promises';
import { existsSync } from 'fs';
import { join, basename } from 'path';
import { createHash } from 'crypto';

// Configuration
const COMFYUI_URL = process.env.COMFYUI_URL || 'http://127.0.0.1:8188';
const JOBS_DIR = './content/ai_jobs';
const WORKFLOWS_DIR = './comfyui/workflows';
const OUTPUT_DIR = './generated/ai-sprites';
const MANIFEST_PATH = './generated/ai-manifest.json';
const DEFAULT_CHECKPOINT = process.env.COMFYUI_CHECKPOINT || 'sd_xl_base_1.0.safetensors';

// Parse CLI args
const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const jobFilter = args.find(a => a.startsWith('--job='))?.split('=')[1];
const verbose = args.includes('-v') || args.includes('--verbose');

// Utility functions
function log(msg) {
  console.log(msg);
}

function logVerbose(msg) {
  if (verbose) console.log(`  [DEBUG] ${msg}`);
}

function error(msg) {
  console.error(`❌ ${msg}`);
}

function warn(msg) {
  console.warn(`⚠️  ${msg}`);
}

function ok(msg) {
  console.log(`  ✅ ${msg}`);
}

function hashString(str) {
  return createHash('sha256').update(str).digest('hex').substring(0, 16);
}

/**
 * Load all job specs from content/ai_jobs/
 */
async function loadJobSpecs() {
  if (!existsSync(JOBS_DIR)) {
    warn(`No AI jobs directory at ${JOBS_DIR}`);
    return [];
  }

  const files = await readdir(JOBS_DIR);
  const jsonFiles = files.filter(f => f.endsWith('.json'));

  const jobs = [];
  for (const file of jsonFiles) {
    try {
      const content = await readFile(join(JOBS_DIR, file), 'utf-8');
      const job = JSON.parse(content);
      job._sourceFile = file;
      jobs.push(job);
      logVerbose(`Loaded job: ${job.setId} (${job.items.length} items)`);
    } catch (e) {
      error(`Failed to load ${file}: ${e.message}`);
    }
  }

  return jobs;
}

/**
 * Load a workflow template
 */
async function loadWorkflow(workflowId) {
  const path = join(WORKFLOWS_DIR, `${workflowId}.json`);
  if (!existsSync(path)) {
    throw new Error(`Workflow not found: ${path}`);
  }

  const content = await readFile(path, 'utf-8');
  return JSON.parse(content);
}

/**
 * Substitute placeholders in workflow
 */
function substituteWorkflow(workflow, params) {
  let json = JSON.stringify(workflow);

  // Remove _meta section (not part of ComfyUI API)
  const parsed = JSON.parse(json);
  delete parsed._meta;
  json = JSON.stringify(parsed);

  // Replace placeholders
  for (const [key, value] of Object.entries(params)) {
    const placeholder = `{{${key}}}`;
    json = json.split(placeholder).join(String(value));
  }

  // Check for unreplaced placeholders
  const remaining = json.match(/\{\{[A-Z_]+\}\}/g);
  if (remaining) {
    throw new Error(`Unreplaced placeholders: ${remaining.join(', ')}`);
  }

  return JSON.parse(json);
}

/**
 * Check if ComfyUI is running
 */
async function checkComfyUI() {
  try {
    const response = await fetch(`${COMFYUI_URL}/system_stats`);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const stats = await response.json();
    return {
      running: true,
      version: stats.system?.comfyui_version || 'unknown'
    };
  } catch (e) {
    return { running: false, error: e.message };
  }
}

/**
 * Queue a prompt in ComfyUI
 */
async function queuePrompt(workflow) {
  const response = await fetch(`${COMFYUI_URL}/prompt`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt: workflow })
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`ComfyUI error: ${response.status} - ${text}`);
  }

  const result = await response.json();
  return result.prompt_id;
}

/**
 * Wait for a prompt to complete
 */
async function waitForCompletion(promptId, timeoutMs = 120000) {
  const startTime = Date.now();

  while (Date.now() - startTime < timeoutMs) {
    const response = await fetch(`${COMFYUI_URL}/history/${promptId}`);
    if (!response.ok) {
      await new Promise(r => setTimeout(r, 1000));
      continue;
    }

    const history = await response.json();
    const entry = history[promptId];

    if (entry?.status?.completed) {
      // Get output images
      const outputs = entry.outputs || {};
      const images = [];

      for (const nodeOutput of Object.values(outputs)) {
        if (nodeOutput.images) {
          images.push(...nodeOutput.images);
        }
      }

      return { success: true, images };
    }

    if (entry?.status?.status_str === 'error') {
      return { success: false, error: 'Generation failed' };
    }

    await new Promise(r => setTimeout(r, 1000));
  }

  return { success: false, error: 'Timeout' };
}

/**
 * Download an image from ComfyUI output
 */
async function downloadImage(imageInfo, destPath) {
  const { filename, subfolder, type } = imageInfo;
  const url = `${COMFYUI_URL}/view?filename=${encodeURIComponent(filename)}&subfolder=${encodeURIComponent(subfolder || '')}&type=${encodeURIComponent(type || 'output')}`;

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to download: ${response.status}`);
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  await writeFile(destPath, buffer);
}

/**
 * Process a single job item
 */
async function processItem(item, job, workflow, manifest) {
  const id = item.id;
  const outputPath = join(OUTPUT_DIR, `${id}.png`);

  // Build prompt with style suffix
  let prompt = item.prompt;
  if (job.defaults?.style) {
    prompt = `${prompt}, ${job.defaults.style}`;
  }

  const negativePrompt = item.negativePrompt || job.defaults?.negativePrompt || '';
  const seed = item.seed ?? Math.floor(Math.random() * 2147483647);
  const checkpoint = job.defaults?.checkpoint || DEFAULT_CHECKPOINT;

  // Substitute workflow
  const params = {
    POSITIVE_PROMPT: prompt,
    NEGATIVE_PROMPT: negativePrompt,
    SEED: seed,
    OUTPUT_FILENAME: id,
    CHECKPOINT: checkpoint
  };

  logVerbose(`Params: ${JSON.stringify(params)}`);

  const substituted = substituteWorkflow(workflow, params);

  if (dryRun) {
    ok(`[DRY RUN] Would generate: ${id}`);
    return {
      id,
      kind: getKindFromId(id),
      url: `/generated/ai-sprites/${id}.png`,
      frameWidth: item.size || job.defaults?.size || 64,
      frameHeight: item.size || job.defaults?.size || 64,
      anchor: item.anchor || job.defaults?.anchor || [0.5, 1.0],
      tags: item.tags || [],
      source: {
        generator: 'comfyui',
        workflow: job.workflow,
        promptHash: `sha256:${hashString(prompt)}`,
        seed,
        dryRun: true
      }
    };
  }

  // Queue and wait
  log(`  🎨 Generating: ${id}`);
  const promptId = await queuePrompt(substituted);
  logVerbose(`Queued prompt: ${promptId}`);

  const result = await waitForCompletion(promptId);

  if (!result.success) {
    error(`Failed to generate ${id}: ${result.error}`);
    return null;
  }

  if (result.images.length === 0) {
    error(`No images returned for ${id}`);
    return null;
  }

  // Download the first image
  await downloadImage(result.images[0], outputPath);
  ok(`Generated: ${id}`);

  return {
    id,
    kind: getKindFromId(id),
    url: `/generated/ai-sprites/${id}.png`,
    frameWidth: item.size || job.defaults?.size || 64,
    frameHeight: item.size || job.defaults?.size || 64,
    anchor: item.anchor || job.defaults?.anchor || [0.5, 1.0],
    tags: item.tags || [],
    source: {
      generator: 'comfyui',
      workflow: job.workflow,
      promptHash: `sha256:${hashString(prompt)}`,
      seed
    }
  };
}

/**
 * Get asset kind from ID prefix
 */
function getKindFromId(id) {
  if (id.startsWith('prop.')) return 'sprite';
  if (id.startsWith('tile.')) return 'tile';
  if (id.startsWith('portrait.')) return 'portrait';
  if (id.startsWith('icon.')) return 'icon';
  return 'sprite';
}

/**
 * Main entry point
 */
async function main() {
  console.log('🤖 Kim Bar AI Asset Generator\n');
  console.log('='.repeat(50));

  // Check ComfyUI
  if (!dryRun) {
    log('\n🔌 Checking ComfyUI connection...');
    const status = await checkComfyUI();
    if (!status.running) {
      error(`ComfyUI not running at ${COMFYUI_URL}`);
      error(`Error: ${status.error}`);
      error('Start ComfyUI and try again, or use --dry-run to validate jobs.');
      process.exit(1);
    }
    ok(`Connected to ComfyUI ${status.version}`);
  } else {
    log('\n📋 Dry run mode - validating jobs without generation');
  }

  // Load jobs
  log('\n📂 Loading job specs...');
  const allJobs = await loadJobSpecs();

  if (allJobs.length === 0) {
    warn('No job specs found in content/ai_jobs/');
    warn('Create a job spec file to define assets to generate.');
    process.exit(0);
  }

  // Filter jobs if requested
  const jobs = jobFilter
    ? allJobs.filter(j => j.setId.includes(jobFilter) || j._sourceFile.includes(jobFilter))
    : allJobs;

  if (jobs.length === 0) {
    error(`No jobs matching filter: ${jobFilter}`);
    process.exit(1);
  }

  log(`  Found ${jobs.length} job(s) with ${jobs.reduce((n, j) => n + j.items.length, 0)} total items`);

  // Ensure output directory
  await mkdir(OUTPUT_DIR, { recursive: true });

  // Process jobs
  const manifest = {
    generatedAt: new Date().toISOString(),
    comfyuiUrl: COMFYUI_URL,
    dryRun,
    entries: []
  };

  for (const job of jobs) {
    log(`\n📦 Processing job: ${job.setId}`);

    // Load workflow
    let workflow;
    try {
      workflow = await loadWorkflow(job.workflow);
      ok(`Loaded workflow: ${job.workflow}`);
    } catch (e) {
      error(`Failed to load workflow: ${e.message}`);
      continue;
    }

    // Process items
    for (const item of job.items) {
      if (item.skip) {
        log(`  ⏭️  Skipping: ${item.id}`);
        continue;
      }

      try {
        const entry = await processItem(item, job, workflow, manifest);
        if (entry) {
          manifest.entries.push(entry);
        }
      } catch (e) {
        error(`Failed to process ${item.id}: ${e.message}`);
        if (verbose) console.error(e);
      }
    }
  }

  // Write manifest
  log('\n📝 Writing manifest...');
  await writeFile(MANIFEST_PATH, JSON.stringify(manifest, null, 2));
  ok(`Wrote: ${MANIFEST_PATH}`);

  // Summary
  console.log('\n' + '='.repeat(50));
  console.log(`\n✨ Generation complete!`);
  console.log(`   ${manifest.entries.length} assets ${dryRun ? 'validated' : 'generated'}`);
  console.log(`   Manifest: ${MANIFEST_PATH}`);

  if (!dryRun) {
    console.log(`\nNext steps:`);
    console.log(`  1. Run: npm run sync:public`);
    console.log(`  2. Run: npm run build:chars`);
    console.log(`  3. Check generated/registry.json for new sprites`);
  }
}

main().catch(e => {
  console.error('\n❌ Fatal error:', e.message);
  if (verbose) console.error(e);
  process.exit(1);
});
