const fs = require('fs');
const path = require('path');

const dataFile = process.argv[2] || 'tools/data.json';
const files = JSON.parse(fs.readFileSync(dataFile, 'utf8'));

for (const [relPath, b64] of Object.entries(files)) {
  const full = path.resolve(__dirname, '..', relPath);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, Buffer.from(b64, 'base64').toString('utf8'), 'utf8');
  console.log('[OK]', relPath);
}
console.log('All files unpacked successfully');
