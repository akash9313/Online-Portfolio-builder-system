const fs = require('fs');

const files = [
  'public/templates.css',
  'public/skills.css',
  'public/publish.css',
  'public/settings.css',
  'public/projects.css',
  'public/profile.css',
  'public/preview.css',
  'public/education.css',
  'public/dashboard.css',
  'public/loginpage.css'
];

const newCursorCSS = `
.cursor {
  position: fixed; width: 10px; height: 10px; border-radius: 50%;
  background: var(--accent); pointer-events: none; z-index: 99999;
  transform: translate(-50%,-50%); 
  transition: width 0.3s cubic-bezier(0.2, 0, 0, 1), height 0.3s cubic-bezier(0.2, 0, 0, 1), background 0.3s, opacity 0.3s, transform 0.3s cubic-bezier(0.2, 0, 0, 1);
  mix-blend-mode: screen;
}
.cursor-ring {
  position: fixed; width: 38px; height: 38px; border-radius: 50%;
  border: 1px solid rgba(56,189,248,0.6); pointer-events: none; z-index: 99998;
  transform: translate(-50%,-50%); 
  transition: width 0.3s cubic-bezier(0.2, 0, 0, 1), height 0.3s cubic-bezier(0.2, 0, 0, 1), border-color 0.3s, background 0.3s, opacity 0.3s, transform 0.3s cubic-bezier(0.2, 0, 0, 1);
  backdrop-filter: blur(2px);
}
body:has(a:hover) .cursor, body:has(button:hover) .cursor, body:has(.magnetic:hover) .cursor, body:has(.hover-target:hover) .cursor { 
  opacity: 0; transform: translate(-50%, -50%) scale(0);
}
body:has(a:hover) .cursor-ring, body:has(button:hover) .cursor-ring, body:has(.magnetic:hover) .cursor-ring, body:has(.hover-target:hover) .cursor-ring { 
  opacity: 0; transform: translate(-50%, -50%) scale(0);
}

a, button, .magnetic, .hover-target {
  cursor: pointer;
}
`;

files.forEach(file => {
  if (!fs.existsSync(file)) return;
  let content = fs.readFileSync(file, 'utf8');
  
  // Regex to match the cursor CSS block. It usually starts with .cursor { and ends after the body:has(...) .cursor-ring {...} block
  // We can look for .cursor { ... } to the last } of body:has(a:hover) .cursor-ring
  const cursorRegex = /\.cursor\s*\{[\s\S]*?body:has\(a:hover\)[^{]*\{[^}]*\}/g;
  
  if (cursorRegex.test(content)) {
    content = content.replace(cursorRegex, newCursorCSS.trim());
    fs.writeFileSync(file, content);
    console.log(`Updated ${file}`);
  } else {
    // If we missed something
    console.log(`Could not match regex in ${file}`);
  }
});
