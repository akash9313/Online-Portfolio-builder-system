import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyD4q_KzBCxVtS6mjH6Xh6-Bd1u-21RSNG4",
  authDomain: "portfoliox-2e787.firebaseapp.com",
  projectId: "portfoliox-2e787",
  storageBucket: "portfoliox-2e787.firebasestorage.app",
  messagingSenderId: "562709786891",
  appId: "1:562709786891:web:2d0f575ab7d3bda5fdf20e"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
let currentUser = null;
let selectedTemplate = '';

async function saveTemplateSelection(name) {
  if (!currentUser) return;
  try {
    await setDoc(doc(db, 'users', currentUser.uid), {
      template: name,
      templateFile: getTemplateFileByName(name)
    }, { merge: true });
  } catch (err) {
    console.error('Failed to save template selection:', err);
  }
}

/* ── Cursor ── */
    const cursor = document.getElementById('cursor');
    const ring   = document.getElementById('cursorRing');
    document.addEventListener('mousemove', e => {
      cursor.style.left = e.clientX + 'px'; cursor.style.top = e.clientY + 'px';
      ring.style.left   = e.clientX + 'px'; ring.style.top   = e.clientY + 'px';
    });

    /* ── Navbar scroll ── */
    window.addEventListener('scroll', () => {
      document.getElementById('navbar').classList.toggle('scrolled', window.scrollY > 20);
    });

    /* ── Reveal on scroll ── */
    const revealEls = document.querySelectorAll('.reveal');
    const obs = new IntersectionObserver(entries => {
      entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('visible'); });
    }, { threshold: 0.08 });
    revealEls.forEach(el => obs.observe(el));

    /* ── Toast ── */
    function showToast(msg) {
      const t = document.getElementById('toast');
      document.getElementById('toastMsg').textContent = msg;
      t.classList.add('show');
      setTimeout(() => t.classList.remove('show'), 3000);
    }

    const templateFileMap = {
      'Classic Developer': 'templates/classic.html',
      'Modern Professional': 'templates/modern.html',
      'Creative Designer': 'templates/creative.html',
      'Minimal Resume': 'templates/minimal.html',
      'Neon Dark': 'templates/neon-dark.html',
      'Glass Morph': 'templates/glass-morph.html',
      'Terminal Hacker': 'templates/terminal-hacker.html',
      'Gradient Splash': 'templates/gradient-splash.html',
      'Executive Pro': 'templates/executive-pro.html',
      'Bento Grid': 'templates/bento-grid.html'
    };

    function getTemplateFileByName(name) {
      return templateFileMap[name] || 'templates/classic.html';
    }

    /* ── Apply selection ── */
    function applySelection(name, toast) {
      selectedTemplate = name;

      document.querySelectorAll('.template-card').forEach(card => {
        const isThis = card.dataset.template === name;
        card.classList.toggle('selected', isThis);
        const btn = card.querySelector('.btn-select');
        if (isThis) {
          btn.innerHTML = '<i class="fas fa-check"></i> Selected';
          btn.classList.add('selected-btn');
        } else {
          btn.innerHTML = '<i class="fas fa-check"></i> Select Template';
          btn.classList.remove('selected-btn');
        }
      });

      document.getElementById('bannerTemplateName').textContent = name;
      const banner = document.getElementById('selectedBanner');
      banner.classList.remove('hidden');
      banner.classList.add('visible'); // trigger reveal

      if (currentUser) {
        saveTemplateSelection(name);
      }

      if (toast) showToast(`"${name}" template selected ✅`);
    }

    /* ── Load current user template if authenticated ── */
    onAuthStateChanged(auth, async user => {
      currentUser = user;
      if (!user) return;
      try {
        const profileSnap = await getDoc(doc(db, 'users', user.uid));
        if (!profileSnap.exists()) return;
        const data = profileSnap.data();
        if (data.template) {
          applySelection(data.template, false);
        }
        if (data.fullName) {
          const avatar = document.getElementById('spAvatar');
          const nameEl = document.getElementById('spName');
          if (avatar) avatar.textContent = data.fullName.charAt(0).toUpperCase();
          if (nameEl) nameEl.textContent = data.fullName.split(' ')[0];
        }
      } catch (err) {
        console.error('Failed to load saved template:', err);
      }
    });

    /* ── Select buttons ── */
    document.querySelectorAll('.btn-select').forEach(btn => {
      btn.addEventListener('click', e => {
        e.stopPropagation();
        applySelection(btn.dataset.template, true);
      });
    });

    /* ── Card click selects ── */
    document.querySelectorAll('.template-card').forEach(card => {
      card.addEventListener('click', () => applySelection(card.dataset.template, true));
    });

    /* ── Filter chips ── */
    document.querySelectorAll('.filter-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        document.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        const filter = chip.dataset.filter;
        document.querySelectorAll('.template-card').forEach(card => {
          const tags = card.dataset.tags || '';
          const show = filter === 'all' || tags.includes(filter);
          card.classList.toggle('hidden-card', !show);
        });
      });
    });

    /* ── Preview button ── */
    document.querySelectorAll('.btn-preview-card').forEach(btn => {
      btn.addEventListener('click', e => {
        e.stopPropagation();
        showToast('Preview coming soon! 👀');
      });
    });

    /* ── Logout ── */
    document.getElementById('logoutBtn').addEventListener('click', async () => {
      await signOut(auth);
      window.location.href = 'loginpage.html';
    });
