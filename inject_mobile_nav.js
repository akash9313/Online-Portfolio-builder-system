const fs = require('fs');
const path = require('path');
const dir = path.join(__dirname, 'public');

const targets = [
  'dashboard.html',
  'profile.html',
  'skills.html',
  'projects.html',
  'education.html',
  'templates.html',
  'publish.html',
  'settings.html',
  'preview.html'
];

let modifiedCount = 0;

for (const file of targets) {
  const filePath = path.join(dir, file);
  if (!fs.existsSync(filePath)) {
    console.log('Skipping missing:', file);
    continue;
  }
  
  let content = fs.readFileSync(filePath, 'utf-8');

  // Prevent double injection
  if (!content.includes('mobile-nav.css')) {
    content = content.replace('</head>', '  <link rel="stylesheet" href="mobile-nav.css">\n</head>');
  }

  if (!content.includes('id="mobileMenuBtn"')) {
    content = content.replace(
      '<div class="nav-container">',
      '<div class="nav-container">\n      <button class="mobile-menu-btn" id="mobileMenuBtn" title="Menu"><i class="fas fa-bars"></i></button>'
    );
  }

  if (!content.includes('mobile-nav.js')) {
    content = content.replace('</body>', '<script src="mobile-nav.js"></script>\n</body>');
  }

  fs.writeFileSync(filePath, content, 'utf-8');
  console.log('Injected mobile nav into:', file);
  modifiedCount++;
}

console.log(`Successfully patched ${modifiedCount} files.`);
