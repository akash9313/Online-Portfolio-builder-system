const fs = require('fs');

let html = fs.readFileSync('public/index.html', 'utf-8');

// Inject hamburger button to index.html
if (!html.includes('id="homeMobileBtn"')) {
  html = html.replace('<div class="nav-actions">', '<button class="mobile-menu-btn" id="homeMobileBtn"><i class="fas fa-bars"></i></button>\n    <div class="nav-actions">');
}

// Inject overlay
if (!html.includes('id="homeMobileOverlay"')) {
  html = html.replace('<!-- ════════════════ HERO', '<!-- Mobile Menu Overlay -->\n<div class="mobile-overlay" id="homeMobileOverlay"></div>\n<!-- ════════════════ HERO');
}

fs.writeFileSync('public/index.html', html);

// Inject css into homepage.css
let css = fs.readFileSync('public/homepage.css', 'utf-8');
if (!css.includes('#homeMobileBtn')) {
  const cssAdd = `

/* Landing Page Mobile Nav */
#homeMobileBtn {
  display: none;
  background: none;
  border: none;
  color: white;
  font-size: 1.5rem;
  cursor: pointer;
  z-index: 2000;
  margin-left: auto;
}
.mobile-overlay {
  position: fixed; top: 70px; left: 0; right: 0; bottom: 0;
  background: rgba(0,0,0,0.8); backdrop-filter: blur(5px);
  z-index: 1500; opacity: 0; pointer-events: none; transition: 0.3s;
}
.mobile-overlay.open { opacity: 1; pointer-events: auto; }

@media(max-width:768px) {
  #homeMobileBtn { display: block; }
  .nav-actions { display: none; }
  
  .nav-links {
    position: fixed; top: 70px; left: -100%; width: 250px;
    height: calc(100vh - 70px); background: #0a0e17;
    flex-direction: column; align-items: flex-start;
    padding: 2rem; display: flex !important;
    transition: left 0.3s ease; z-index: 1600;
    border-right: 1px solid #1f2937;
  }
  .nav-links.open { left: 0; }
  
  /* Bring actions into the mobile sidebar too! */
  .nav-actions.mobile-view {
    display: flex; flex-direction: column; width: 100%;
    margin-top: 2rem; gap: 1rem;
  }
}
`;
  fs.appendFileSync('public/homepage.css', cssAdd);
}

// Inject JS
let js = fs.readFileSync('public/homepage.js', 'utf-8');
if (!js.includes('homeMobileBtn')) {
  const jsAdd = `
// Mobile Nav Logic
const homeMobileBtn = document.getElementById('homeMobileBtn');
const navLinks = document.querySelector('.nav-links');
const navActions = document.querySelector('.nav-actions');
const overlay = document.getElementById('homeMobileOverlay');

if (homeMobileBtn) {
  const t = () => {
    navLinks.classList.toggle('open');
    navActions.classList.toggle('mobile-view');
    overlay.classList.toggle('open');
    
    // Copy nav actions inside navLinks if not there
    if (!navLinks.querySelector('.nav-actions')) {
      const clone = navActions.cloneNode(true);
      clone.classList.remove('nav-actions');
      clone.classList.add('mobile-view-actions');
      clone.style.display = 'flex';
      clone.style.flexDirection = 'column';
      clone.style.gap = '1rem';
      clone.style.marginTop = '2rem';
      clone.style.width = '100%';
      navLinks.appendChild(clone);
      
      // Fix logout button in cloned nav
      const clonedLogout = clone.querySelector('#logoutBtn');
      if (clonedLogout) {
          clonedLogout.removeAttribute('id');
          clonedLogout.addEventListener('click', async () => {
              if (window.signOut && window.auth) {
                  await window.signOut(window.auth);
                  window.location.reload();
              }
          });
      }
    }
  };
  homeMobileBtn.addEventListener('click', t);
  overlay.addEventListener('click', t);
  navLinks.querySelectorAll('a').forEach(a => a.addEventListener('click', () => {
    if(window.innerWidth <= 768) t();
  }));
}
`;
  fs.appendFileSync('public/homepage.js', jsAdd);
}
console.log('Landing page patched.');
