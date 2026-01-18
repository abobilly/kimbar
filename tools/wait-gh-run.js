const { execSync } = require('child_process');
const id = process.argv[2];
const repo = process.argv[3] || 'abobilly/kimbar';
if (!id) { console.error('Usage: node wait-gh-run.js <run-id> [repo]'); process.exit(2); }
(async () => {
    for (let i = 0; i < 30; i++) {
        try {
            const out = execSync(`gh run view ${id} --repo ${repo} --json status,conclusion,headSha,url`, { stdio: ['ignore', 'pipe', 'pipe'] }).toString();
            const obj = JSON.parse(out);
            console.log(new Date().toISOString(), obj.status, obj.conclusion || '');
            if (obj.status !== 'in_progress' && obj.status !== 'queued') {
                console.log('done', JSON.stringify(obj));
                process.exit(0);
            }
        } catch (e) { console.error('err', e.message); }
        await new Promise(r => setTimeout(r, 10000));
    }
    console.log('timeout waiting for workflow');
})();
