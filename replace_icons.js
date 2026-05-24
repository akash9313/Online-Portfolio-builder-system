const fs = require('fs');
const path = 'public/templates/gradient-splash.html';
let content = fs.readFileSync(path, 'utf8');
// Replace stylesheet
content = content.replace(
  '<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">',
  '<script src="https://unpkg.com/@phosphor-icons/web"></script>'
);
// Map FA to Phosphor
const replacements = {
  'fas fa-bolt': 'ph-fill ph-lightning',
  'fab fa-github': 'ph-fill ph-github-logo',
  'fas fa-map-marker-alt': 'ph-fill ph-map-pin',
  'fab fa-linkedin': 'ph-fill ph-linkedin-logo',
  'fab fa-linkedin-in': 'ph-fill ph-linkedin-logo',
  'fas fa-arrow-down': 'ph-bold ph-arrow-down',
  'fas fa-code': 'ph-fill ph-code',
  'fas fa-rocket': 'ph-fill ph-rocket-launch',
  'fas fa-arrow-right': 'ph-bold ph-arrow-right',
  'fas fa-graduation-cap': 'ph-fill ph-graduation-cap',
  'fas fa-calendar-alt': 'ph-fill ph-calendar-blank'
};
for (const [fa, ph] of Object.entries(replacements)) {
  const regex = new RegExp(fa, 'g');
  content = content.replace(regex, ph);
}
// In JS blocks, there are icon variables used dynamically:
content = content.replace(/fas fa-code/g, 'ph-fill ph-code');
content = content.replace(/fas fa-rocket/g, 'ph-fill ph-rocket-launch');
content = content.replace(/fas fa-graduation-cap/g, 'ph-fill ph-graduation-cap');
content = content.replace(/fas fa-arrow-right/g, 'ph-bold ph-arrow-right');
content = content.replace(/fas fa-calendar-alt/g, 'ph-fill ph-calendar-blank');
fs.writeFileSync(path, content, 'utf8');
console.log('Icons successfully replaced with Phosphor icons!');