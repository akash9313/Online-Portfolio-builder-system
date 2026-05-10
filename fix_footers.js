const fs = require('fs');
const path = require('path');
const dir = 'c:/Users/Akash/Documents/Online-Portfolio-builder-system/public/templates';
const files = fs.readdirSync(dir).filter(f => f.endsWith('.html'));

files.forEach(f => {
  const filePath = path.join(dir, f);
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Find the primary color variable
  let colorMatch = content.match(/--(lime|accent|primary|brand|main-color|neon|primary-color):\s*([^;]+);/);
  let accentColor = 'currentColor'; // fallback
  if (colorMatch) {
    accentColor = `var(--${colorMatch[1]})`;
  }
  
  const footerText = `© <span id="fyear"></span> &nbsp;&middot;&nbsp; Crafted with <span style="color:${accentColor}">&hearts;</span> using <span style="color:${accentColor}">PortfolioX</span>`;
  
  // Replace the copyright text inside the footer
  // It varies by template:
  // modern: <p>© 2026 &nbsp;·&nbsp; Crafted with <span>♥</span> using <span>PortfolioX</span></p>
  // classic: <div class="footer-note">© <span id="fyear"></span>m</div>
  // others might just have © 2026 PortfolioX
  
  // Let's use a regex to find the typical copyright line
  // and replace it with our new line.
  let hasReplaced = false;
  
  if (content.includes('footer-note')) {
    content = content.replace(/<div class="footer-note">[\s\S]*?<\/div>/, `<div class="footer-note">${footerText}</div>`);
    hasReplaced = true;
  } else if (content.match(/<footer[^>]*>[\s\S]*?©[\s\S]*?<\/footer>/i)) {
     // replace the paragraph or div containing the copyright symbol inside the footer
     content = content.replace(/(<footer[^>]*>[\s\S]*?<p[^>]*>)([\s\S]*?)(<\/p>)/i, (match, p1, p2, p3) => {
        if(p2.includes('©')) {
            return p1 + footerText + p3;
        }
        return match;
     });
     
     content = content.replace(/(<footer[^>]*>[\s\S]*?<div[^>]*>)([\s\S]*?)(<\/div>)/i, (match, p1, p2, p3) => {
        if(p2.includes('©') && !hasReplaced) {
            hasReplaced = true;
            return p1 + footerText + p3;
        }
        return match;
     });
  }
  
  // Specific catch for modern.html which already has it but hardcoded 2026
  if (f === 'modern.html') {
      content = content.replace(/<p>© 2026.*?<\/p>/, `<p>${footerText}</p>`);
  }
  
  // ensure there's a script setting fyear
  if (content.includes('id="fyear"') && !content.includes('getElementById("fyear")')) {
     content = content.replace('</script>\n</body>', 'document.getElementById("fyear").textContent = new Date().getFullYear();\n</script>\n</body>');
     // Some templates might not have it in the exact place, but we'll try our best.
  }

  fs.writeFileSync(filePath, content);
  console.log('Updated ' + f);
});
