import fs from 'fs';
import https from 'https';
import crypto from 'crypto';
const localPath = 'dist/index.html';
if (!fs.existsSync(localPath)) { console.error('Local dist not found:', localPath); process.exit(2); }
const local = fs.readFileSync(localPath, 'utf8');
const localHash = crypto.createHash('sha1').update(local, 'utf8').digest('hex');
console.log('Local index.html SHA1:', localHash);
const url = 'https://kimbar.badgey.org';
let attempts = 0;
const maxAttempts = 30;
const interval = 8000;
function checkOnce() {
    attempts++;
    https.get(url, res => {
        let b = '';
        res.on('data', c => b += c);
        res.on('end', () => {
            const remoteHash = crypto.createHash('sha1').update(b, 'utf8').digest('hex');
            console.log(new Date().toISOString(), 'attempt', attempts, 'remote SHA1:', remoteHash, res.statusCode);
            if (remoteHash === localHash) {
                console.log('MATCH: deployed');
                process.exit(0);
            } else {
                console.log('DIFFER');
                if (attempts >= maxAttempts) {
                    console.log('Timed out waiting for deployment.');
                    process.exit(1);
                } else {
                    setTimeout(checkOnce, interval);
                }
            }
        });
    }).on('error', e => {
        console.error('ERR', e.message);
        if (attempts >= maxAttempts) process.exit(1);
        setTimeout(checkOnce, interval);
    });
}
checkOnce();
