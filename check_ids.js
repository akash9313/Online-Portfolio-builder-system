const fs = require('fs');
const js = fs.readFileSync('public/settings.js', 'utf8');
const html = fs.readFileSync('public/settings.html', 'utf8');

const regex = /getElementById\(['"]([^'"]+)['"]\)/g;
let match;
const missing = [];

while ((match = regex.exec(js)) !== null) {
  const id = match[1];
  if (!html.includes('id="' + id + '"') && !html.includes('id=\'' + id + '\'')) {
    missing.push(id);
  }
}
console.log('Missing IDs:', [...new Set(missing)]);
