const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, 'public');
const files = fs.readdirSync(dir).filter(f => f.endsWith('.html') && f !== 'experience.html');

let modifiedCount = 0;

for (const file of files) {
  const filePath = path.join(dir, file);
  let content = fs.readFileSync(filePath, 'utf8');

  // Find where education ends and projects begins in the sidebar nav
  const searchPattern = /<a href="education\.html"[^>]*>[\s\S]*?<\/a>\s*<a href="projects\.html"/;
  
  if (searchPattern.test(content)) {
    const replacement = content.replace(/(<a href="education\.html"[^>]*>[\s\S]*?<\/a>)(\s*)(<a href="projects\.html")/g, (match, p1, p2, p3) => {
      return p1 + p2 + '        <a href="experience.html" class="nav-item" data-page="experience">\n          <span class="nav-icon"><i class="fas fa-briefcase"></i></span>\n          <span class="nav-label">Experience</span>\n        </a>\n' + p3;
    });

    if (replacement !== content) {
      fs.writeFileSync(filePath, replacement, 'utf8');
      console.log(`Updated ${file}`);
      modifiedCount++;
    }
  } else {
    // try a different pattern if it's slightly different
    const searchPattern2 = /<a href="education\.html" class="nav-item">.*?<\/a>\s*<a href="projects\.html" class="nav-item">/i;
    if (searchPattern2.test(content)) {
      const replacement = content.replace(/(<a href="education\.html" class="nav-item">.*?<\/a>)(\s*)(<a href="projects\.html" class="nav-item">)/i, (match, p1, p2, p3) => {
        return p1 + p2 + '<a href="experience.html" class="nav-item"><span class="nav-icon"><i class="fas fa-briefcase"></i></span><span class="nav-label">Experience</span></a>' + p3;
      });
      if (replacement !== content) {
        fs.writeFileSync(filePath, replacement, 'utf8');
        console.log(`Updated ${file} (inline pattern)`);
        modifiedCount++;
      }
    }
  }
}

console.log(`Updated ${modifiedCount} files.`);
