import { spawnSync, execSync } from 'child_process';
import { writeFileSync, readFileSync, existsSync, mkdirSync, appendFileSync } from 'fs';
import { join } from 'path';

// --- Configuration & Constants ---

const ARTIFACTS = {
  SUPERVISOR: '.bounce.supervisor.txt',
  WORKER: '.bounce.worker.txt',
  TESTS: '.bounce.tests.txt',
  VERDICT: '.bounce.verdict.txt',
  DIFF: '.bounce.diff.patch',
  SUMMARY: '.bounce.summary.txt',
  COMMANDS: '.bounce.commands.txt'
};

const GATE_CMD = 'npm run verify'; 
const DEFAULT_MAX_ITERS = 5;

// --- Helpers ---

function log(msg) {
  console.log(msg);
  try {
    appendFileSync(ARTIFACTS.COMMANDS, `[LOG] ${msg}\n`);
  } catch (e) {}
}

function run(cmd, args = [], opts = {}) {
  const cmdStr = `${cmd} ${args.join(' ')}`;
  try {
    appendFileSync(ARTIFACTS.COMMANDS, `[RUN] ${cmdStr}\n`);
  } catch (e) {}

  // Pass opts (including input) to spawnSync
  const result = spawnSync(cmd, args, { shell: true, encoding: 'utf8', ...opts });
  
  try {
    const status = result.status === 0 ? 'PASS' : 'FAIL';
    appendFileSync(ARTIFACTS.COMMANDS, `[END] ${cmdStr} -> ${status} (Exit: ${result.status})\n`);
  } catch (e) {}

  return result;
}

function ensureDir(path) {
  if (!existsSync(path)) mkdirSync(path, { recursive: true });
}

function generateSlug(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 50) || 'bounce-task';
}

function writeArtifact(path, content, append = false) {
  if (append) appendFileSync(path, content);
  else writeFileSync(path, content);
}

// --- Modes ---

function check() {
  console.log('🔍 Running Bounce Check...');
  let failed = false;

  // 1. Git Repo & Status
  try {
    execSync('git rev-parse --is-inside-work-tree', { stdio: 'ignore' });
    console.log('✅ Git repo detected');
    
    const status = execSync('git status --porcelain', { encoding: 'utf8' });
    if (status.trim()) {
      console.warn('⚠️  WARNING: Git working tree is dirty. Review changes carefully.');
    } else {
      console.log('✅ Git working tree is clean');
    }
  } catch (e) {
    console.log('❌ Not a git repo');
    failed = true;
  }

  // 2. Node & NPM
  const node = run('node', ['-v']);
  const npm = run('npm', ['-v']);
  if (node.status === 0 && npm.status === 0) {
    console.log(`✅ Node ${node.stdout.trim()}, NPM ${npm.stdout.trim()}`);
  } else {
    console.log('❌ Node/NPM check failed');
    failed = true;
  }

  // 3. Package.json Scripts
  try {
    const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
    if (pkg.scripts && pkg.scripts.bounce && pkg.scripts['bounce:check']) {
      console.log('✅ bounce scripts found in package.json');
    } else {
      console.log('❌ bounce scripts missing from package.json');
      failed = true;
    }
  } catch (e) {
    console.log('❌ Could not read package.json');
    failed = true;
  }

  // 4. Codex
  const codex = run('codex', ['--version']);
  if (codex.status === 0) {
    console.log(`✅ Codex CLI detected: ${codex.stdout.trim()}`);
  } else {
    console.log('❌ Codex CLI missing');
    failed = true;
  }

  // 5. Ollama & Model
  const ollama = run('ollama', ['--version']);
  if (ollama.status === 0) {
    console.log(`✅ Ollama detected: ${ollama.stdout.trim()}`);
    
    const list = run('ollama', ['list']);
    if (list.stdout.includes('qwen2.5-coder:7b')) {
      console.log('✅ Model qwen2.5-coder:7b found');
    } else {
      console.log('❌ Model qwen2.5-coder:7b NOT found in ollama list');
      failed = true;
    }
  } else {
    console.log('❌ Ollama missing or not running');
    failed = true;
  }

  if (failed) {
    console.log('\n❌ CHECK FAILED');
    process.exit(1);
  } else {
    console.log('\n✅ CHECK PASSED');
    process.exit(0);
  }
}

function bounce(options) {
  const { goal, maxIterations, aiArtifacts, slug } = options;

  if (!goal) {
    console.error('❌ Error: Goal argument required');
    process.exit(1);
  }

  // Initialize Artifacts
  writeFileSync(ARTIFACTS.COMMANDS, `[START] ${new Date().toISOString()}\nGOAL: ${goal}\n`);
  writeFileSync(ARTIFACTS.SUMMARY, `BOUNCE SUMMARY\nGOAL: ${goal}\nDATE: ${new Date().toISOString()}\n\n`);
  writeFileSync(ARTIFACTS.DIFF, ''); 

  log(`🚀 Starting Bounce Loop for: "${goal}"`);
  log(`   Options: max-iters=${maxIterations}, ai-artifacts=${aiArtifacts}, slug=${slug}`);
  log(`   Gate Command: ${GATE_CMD}`);

  let currentSlug = slug || generateSlug(goal);
  if (aiArtifacts) {
    ensureDir('.ai/plans');
    ensureDir('.ai/reviews');
  }

  for (let i = 1; i <= maxIterations; i++) {
    log(`\n🔄 Iteration ${i}/${maxIterations}`);
    writeArtifact(ARTIFACTS.SUMMARY, `--- Iteration ${i} ---\n`, true);

    // 1. Supervisor Plan (passed via stdin)
    log('   👤 Supervisor planning...');
    const supPrompt = `
    You are the Supervisor.
    GOAL: ${goal}
    CONTEXT:
    - Current iteration: ${i}
    - Gate command: ${GATE_CMD}

    INSTRUCTIONS:
    Provide clear, step-by-step instructions for the Worker to implement the goal.
    Do not write code yourself. Focus on what needs to be done.
        `.trim();
    
    // Pass prompt via stdin to avoid shell argument parsing issues
    const supRes = run('codex', ['exec', '-p', 'supervisor'], { input: supPrompt });
    
    if (supRes.status !== 0) {
        console.error('❌ Supervisor failed:', supRes.stderr || supRes.stdout);
        writeArtifact(ARTIFACTS.SUMMARY, `FAIL: Supervisor crash\n`, true);
        process.exit(1);
    }
    
    // Supervisor output is in stdout
    const workerInstructions = supRes.stdout;
    writeFileSync(ARTIFACTS.SUPERVISOR, workerInstructions);
    
    if (aiArtifacts) {
      writeFileSync(join('.ai/plans', `${currentSlug}-iter${i}.md`), workerInstructions);
    }

    // 2. Worker Implementation
    log('   👷 Worker implementing...');
    const workPrompt = `
    You are the Worker.
    INSTRUCTIONS:
    ${workerInstructions}

    Implement the changes in the codebase.
        `.trim();
    
    const workRes = run('codex', ['exec', '-p', 'worker_qwen'], { input: workPrompt });
    writeFileSync(ARTIFACTS.WORKER, workRes.stdout || workRes.stderr); 

    // 3. Gate Check
    log('   🛡️ Running gate...');
    const gateRes = run(GATE_CMD);
    writeFileSync(ARTIFACTS.TESTS, gateRes.stdout + '\n' + gateRes.stderr);
    const gatePassed = gateRes.status === 0;
    log(`      Gate status: ${gatePassed ? 'PASS' : 'FAIL'}`);
    writeArtifact(ARTIFACTS.SUMMARY, `GATE: ${gatePassed ? 'PASS' : 'FAIL'}\n`, true);

    // 4. Supervisor Review & Diff
    log('   ⚖️ Supervisor reviewing...');
    const diff = execSync('git diff HEAD', { encoding: 'utf8' });
    writeFileSync(ARTIFACTS.DIFF, diff);

    const revPrompt = `
    You are the Supervisor.
    GOAL: ${goal}
    STATUS: ${gatePassed ? 'Gate PASSED' : 'Gate FAILED'}

    CHANGES (Diff):
    ${diff.slice(0, 10000)}

    TEST OUTPUT:
    ${(gateRes.stdout + gateRes.stderr).slice(0, 5000)}

    VERDICT:
    If the goal is met and gate passed, output exactly: APPROVE
    If changes are needed, list the FIXES.
        `.trim();

    const revRes = run('codex', ['exec', '-p', 'supervisor'], { input: revPrompt });
    const verdict = revRes.stdout.trim();
    writeFileSync(ARTIFACTS.VERDICT, verdict);
    
    if (aiArtifacts) {
      writeFileSync(join('.ai/reviews', `${currentSlug}-iter${i}.md`), verdict);
    }

    if (verdict.includes('APPROVE') && gatePassed) {
      log('✅ Goal Accomplished & Approved!');
      writeArtifact(ARTIFACTS.SUMMARY, `RESULT: APPROVED\n`, true);
      process.exit(0);
    }

    log('   ⚠️ Issues detected. Continuing...');
    writeArtifact(ARTIFACTS.SUMMARY, `RESULT: CONTINUING (Verdict: ${verdict.slice(0, 50)}...)\n`, true);
    
    if (i === maxIterations) {
      log('❌ Max iterations reached without approval.');
      writeArtifact(ARTIFACTS.SUMMARY, `RESULT: FAILED (Max iterations)\n`, true);
      process.exit(1);
    }
  }
}

// --- CLI Entry Point ---

function main() {
  const args = process.argv.slice(2);
  const options = {
    check: false,
    maxIterations: DEFAULT_MAX_ITERS,
    aiArtifacts: false,
    slug: null,
    goal: null
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--check') {
      options.check = true;
    } else if (arg === '--max-iterations') {
      options.maxIterations = parseInt(args[++i], 10);
    } else if (arg === '--ai-artifacts') {
      options.aiArtifacts = true;
    } else if (arg === '--slug') {
      options.slug = args[++i];
    } else if (!arg.startsWith('-')) {
      if (!options.goal) options.goal = arg;
    }
  }

  if (options.check) {
    check();
  } else {
    bounce(options);
  }
}

main();
