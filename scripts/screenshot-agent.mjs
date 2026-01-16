import { unlinkSync, existsSync, statSync } from 'fs';
import { spawnSync } from 'child_process';

const TARGETS = [
    'test-results/camera-zoom-test.png',
    'test-results/encounter-zoom-test.png'
];

export function runScreenshotPipeline(targets = TARGETS, runner = spawnSync, fsOps = { unlinkSync, existsSync, statSync }) {
    console.log('🤖 Screenshot Agent: Initializing...');

    // 1. Invalidate Cache (Delete old)
    console.log('🧹 Invalidating cache...');
    for (const file of targets) {
        if (fsOps.existsSync(file)) {
            try {
                fsOps.unlinkSync(file);
                console.log(`   🗑️  Deleted: ${file}`);
            } catch (e) {
                console.error(`   ❌ Failed to delete ${file}:`, e);
                return { success: false, error: e };
            }
        }
    }

    // 2. Run Generation
    console.log('📸 Acquiring new targets (running E2E tests)...');
    const start = Date.now();
    const result = runner('npm', ['run', 'test:e2e'], { 
        stdio: 'inherit', 
        shell: true 
    });

    // 3. Verify Replacement
    console.log('🕵️  Verifying updates...');
    let success = true;
    let verifyCount = 0;

    for (const file of targets) {
        if (fsOps.existsSync(file)) {
            const stats = fsOps.statSync(file);
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
    }

    if (result.status !== 0) {
        console.log('⚠️  Tests finished with errors (see above). Checking if artifacts survived...');
    }

    if (success && verifyCount === targets.length) {
        console.log(`✨ Success! All ${verifyCount} screenshots updated atomically.`);
        return { success: true };
    } else {
        console.error('💥 Verification failed. Some assets are missing or stale.');
        return { success: false, error: new Error('Verification failed') };
    }
}

// Only execute if run directly
import { fileURLToPath } from 'url';
if (process.argv[1] === fileURLToPath(import.meta.url)) {
    const result = runScreenshotPipeline();
    process.exit(result.success ? 0 : 1);
}