const fs = require('fs');
const path = require('path');
function writeFile(relPath, content) {
  const fullPath = path.resolve(__dirname, '..', relPath);
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.writeFileSync(fullPath, content, 'utf8');
  console.log('[OK]', relPath);
}
module.exports = { writeFile };
