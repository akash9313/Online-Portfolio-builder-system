const fs = require('fs');

let html = fs.readFileSync('public/templates.html', 'utf8');

const templates = [
  { cssClass: 'classic', filename: 'classic.html' },
  { cssClass: 'modern', filename: 'modern.html' },
  { cssClass: 'creative', filename: 'creative.html' },
  { cssClass: 'minimal', filename: 'minimal.html' },
  { cssClass: 'neon', filename: 'neon-dark.html' },
  { cssClass: 'glass', filename: 'glass-morph.html' },
  { cssClass: 'terminal', filename: 'terminal-hacker.html' },
  { cssClass: 'gradient-splash', filename: 'gradient-splash.html' },
  { cssClass: 'executive', filename: 'executive-pro.html' },
  { cssClass: 'bento', filename: 'bento-grid.html' }
];

for (const t of templates) {
  const regex = new RegExp(`<div class="template-preview ${t.cssClass}">[\\s\\S]*?</div>\\s*</div>`, 'g');
  const replacement = `<div class="template-preview">
            <div class="preview-inner">
              <iframe class="template-iframe" src="templates/${t.filename}" tabindex="-1"></iframe>
            </div>
          </div>`;
  html = html.replace(regex, replacement);
}

fs.writeFileSync('public/templates.html', html, 'utf8');
console.log('Done!');
