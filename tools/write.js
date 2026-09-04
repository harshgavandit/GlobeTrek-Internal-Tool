const fs = require('fs');
const path = require('path');

const relPath = process.argv[2] || process.argv[1];
const b64 = process.argv[3] || process.argv[2];

if (!relPath || !b64) {
  process.exit(1);
}

const fullPath = path.resolve(__dirname, '..', relPath);
fs.mkdirSync(path.dirname(fullPath), { recursive: true });
fs.writeFileSync(fullPath, Buffer.from(b64, 'base64').toString('utf8'), 'utf8');
console.log('[OK]', relPath);