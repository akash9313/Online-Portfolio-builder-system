const fs = require('fs');
const path = require('path');
const dir = path.join(__dirname, 'public', 'templates');

const files = fs.readdirSync(dir).filter(f => f.endsWith('.html'));

for (const file of files) {
  const filePath = path.join(dir, file);
  let content = fs.readFileSync(filePath, 'utf-8');

  // Skip already patched files
  if (content.includes('const _pubUid =')) {
    continue;
  }

  // We want to find "if(!user)" with any spaces
  const regex = /if\s*\(\s*!user\s*\)/;
  if (regex.test(content)) {
    const replacement = `
  const _pubUid = new URLSearchParams(window.location.search).get("uid");
  if (_pubUid) user = { uid: _pubUid };
  if (!user)`;

    content = content.replace(regex, replacement.trim());
    fs.writeFileSync(filePath, content, 'utf-8');
    console.log('Patched:', file);
  } else {
    console.log('Not patched:', file);
  }
}
