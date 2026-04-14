const fs = require('fs');
const path = require('path');
const dir = path.join(__dirname, 'public', 'templates');

if (!fs.existsSync(dir)) {
  console.error('Directory not found:', dir);
  process.exit(1);
}

const files = fs.readdirSync(dir).filter(f => f.endsWith('.html'));
let modifiedCount = 0;

for (const file of files) {
  const filePath = path.join(dir, file);
  let content = fs.readFileSync(filePath, 'utf-8');

  // Detect and replace the line
  const regex = /if\s*\(\s*!user\s*\)\s*return;/;
  if (regex.test(content)) {
    // Check if already patched to prevent double patching
    if (content.includes('new URLSearchParams(window.location.search).get(\"uid\")')) {
      console.log('Already patched:', file);
      modifiedCount++;
      continue;
    }

    const replacement = `
  const _pubUid = new URLSearchParams(window.location.search).get("uid");
  if (_pubUid) user = { uid: _pubUid };
  if (!user) return;`;

    content = content.replace(regex, replacement.trim());
    fs.writeFileSync(filePath, content, 'utf-8');
    console.log('Patched:', file);
    modifiedCount++;
  } else {
    console.log('Warning: Pattern not found in', file);
  }
}
console.log('Done patching', modifiedCount, 'files.');
