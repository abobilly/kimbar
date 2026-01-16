import { unlinkSync, existsSync, statSync } from 'fs';
import { spawnSync } from 'child_process';
import { join } from 'path';

const TARGETS = [
    'test-results/camera-zoom-test.png',
    'test-results/encounter-zoom-test.png'
];

console.log('🤖 Screenshot Agent: Initializing...');

// 1. Invalidate Cache (Delete old)
console.log('🧹 Invalidating cache...');
TARGETS.forEach(file => {
    if (existsSync(file)) {
        try {
            unlinkSync(file);
            console.log(`   🗑️  Deleted: ${file}`);
        } catch (e) {
            console.error(`   ❌ Failed to delete ${file}:`, e);
            process.exit(1);
        }
    }
});

// 2. Run Generation
console.log('📸 Acquiring new targets (running E2E tests)...');
const start = Date.now();
// We use inherit to show the test output to the user
const result = spawnSync('npm', ['run', 'test:e2e'], { 
    stdio: 'inherit', 
    shell: true 
});

// 3. Verify Replacement
console.log('🕵️  Verifying updates...');
let success = true;
let verifyCount = 0;

TARGETS.forEach(file => {
    if (existsSync(file)) {
        const stats = statSync(file);
        // Add a small buffer or just check existence since we deleted them
        if (stats.mtimeMs > start) {
            console.log(`   ✅ Verified: ${file} (Size: ${stats.size}b, Generated in ${(stats.mtimeMs - start)/1000}s)`);
            verifyCount++;
        } else {
            console.error(`   ❌ Stale file detected (Time paradox?): ${file}`);
            success = false;
        }
    } else {
        console.error(`   ❌ Missing target: ${file}`);
        success = false;
    }
});

if (result.status !== 0) {
    console.log('⚠️  Tests finished with errors (see above). checking if artifacts survived...');
}

if (success && verifyCount === TARGETS.length) {
    console.log(`✨ Success! All ${verifyCount} screenshots updated atomically.`);
    process.exit(0);
} else {
    console.error('💥 Verification failed. Some assets are missing or stale.');
    process.exit(1);
}
