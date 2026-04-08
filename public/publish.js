import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  deleteDoc,
  getDocs,
  collection,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

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

const CIRC = 2 * Math.PI * 45;
let currentUser = null;
let currentUserData = null;
let skillsCount = 0, projCount = 0, eduCount = 0;

const checks = [
  { key:'profile',   label:'Profile Completed',   desc:'Name, role & bio added',     icon:'fas fa-user',              link:'profile.html' },
  { key:'skills',    label:'Skills Added',        desc:'At least 1 skill listed',    icon:'fas fa-brain',             link:'skills.html' },
  { key:'projects',  label:'Projects Added',      desc:'At least 1 project added',   icon:'fas fa-project-diagram',   link:'projects.html' },
  { key:'education', label:'Education Added',     desc:'Education details provided', icon:'fas fa-graduation-cap',    link:'education.html' },
  { key:'template',  label:'Template Selected',   desc:'A portfolio design chosen',  icon:'fas fa-palette',           link:'templates.html' }
];

let checkStatus = {
  profile: false,
  skills: false,
  projects: false,
  education: false,
  template: false
};

const slugInput = document.getElementById('slugInput');
const slugStatus = document.getElementById('slugStatus');
let slugTimer = null;

/* ───────────────── Toast ───────────────── */
function showToast(msg, type = '') {
  const t = document.getElementById('toast');
  const ic = document.getElementById('toastIcon');
  document.getElementById('toastMsg').textContent = msg;
  ic.className = type === 'error' ? 'fas fa-times-circle' : 'fas fa-check-circle';
  t.className = 'toast' + (type === 'error' ? ' error' : '');
  void t.offsetWidth;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 3500);
}

/* ───────────────── Confetti ───────────────── */
function launchConfetti() {
  const colors = ['#38bdf8','#6366f1','#22c55e','#ec4899','#f59e0b','#ffffff'];
  for (let i = 0; i < 80; i++) {
    const el = document.createElement('div');
    el.className = 'confetti-piece';
    el.style.cssText = `
      left:${Math.random()*100}vw;
      top:${-10 - Math.random()*20}px;
      background:${colors[Math.floor(Math.random()*colors.length)]};
      width:${6+Math.random()*8}px;
      height:${6+Math.random()*8}px;
      border-radius:${Math.random()>0.5?'50%':'2px'};
      animation-duration:${2.5+Math.random()*2}s;
      animation-delay:${Math.random()*0.8}s;
    `;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 5000);
  }
}

/* ───────────────── Helpers ───────────────── */
function normalizeSlug(slug) {
  return slug.toLowerCase().trim().replace(/[^a-z0-9-]/g, '').replace(/-+/g, '-');
}

function getLiveUrl(slug) {
  return `${window.location.origin}/u/${slug}`;
}

function getSelectedVisibility() {
  return document.querySelector('.vis-opt.active')?.dataset.vis || 'public';
}

function getTemplateFile() {
  const localFile = localStorage.getItem('finalTemplateFile');
  if (localFile) return localFile;
  if (currentUserData?.templateFile) return currentUserData.templateFile;
  return 'templates/classic.html';
}

function getTemplateDisplayName() {
  const localName = localStorage.getItem('finalTemplate');
  if (localName) return localName;
  return currentUserData?.template || 'Classic Developer';
}

/* ───────────────── Slug Status ───────────────── */
function setSlugStatus(type, msg) {
  slugStatus.className = 'slug-status';
  if (!type || !msg) {
    slugStatus.innerHTML = '';
    return;
  }

  const map = {
    avail: 'ss-avail',
    taken: 'ss-taken',
    check: 'ss-check'
  };

  const icon =
    type === 'avail' ? 'fas fa-check-circle' :
    type === 'taken' ? 'fas fa-times-circle' :
    'fas fa-spinner fa-spin';

  slugStatus.innerHTML = `<i class="${icon}"></i> <span class="${map[type]}">${msg}</span>`;
}

/* ───────────────── Slug Availability ───────────────── */
async function checkSlug(slug) {
  if (!currentUser) return false;

  const cleanSlug = normalizeSlug(slug);

  if (!cleanSlug || cleanSlug.length < 3) {
    setSlugStatus('taken', 'Slug must be at least 3 characters');
    return false;
  }

  try {
    const usernameRef = doc(db, 'usernames', cleanSlug);
    const usernameSnap = await getDoc(usernameRef);

    if (!usernameSnap.exists()) {
      setSlugStatus('avail', `"${cleanSlug}" is available!`);
      return true;
    }

    const data = usernameSnap.data();
    if (data.uid === currentUser.uid) {
      setSlugStatus('avail', `"${cleanSlug}" is your current username`);
      return true;
    }

    setSlugStatus('taken', `"${cleanSlug}" is already taken`);
    return false;
  } catch (err) {
    console.error('Slug check error:', err);
    setSlugStatus('', '');
    return false;
  }
}

/* ───────────────── Checklist Render ───────────────── */
function renderChecklist() {
  const done = Object.values(checkStatus).filter(Boolean).length;

  document.getElementById('checkBadge').textContent = `${done} / ${checks.length}`;
  document.getElementById('checkBadge').className = 'sc-badge' + (done === checks.length ? ' green' : '');

  document.getElementById('checklist').innerHTML = checks.map(c => {
    const ok = checkStatus[c.key];
    const cls = ok ? 'done' : 'fail';
    return `
      <div class="check-item ${cls}">
        <div class="ci-icon"><i class="${ok ? 'fas fa-check' : c.icon}"></i></div>
        <div class="ci-body">
          <div class="ci-label">${c.label}</div>
          <div class="ci-desc">${c.desc}</div>
          ${!ok ? `<a href="${c.link}" class="ci-link"><i class="fas fa-arrow-right"></i> Complete now</a>` : ''}
        </div>
        <span class="ci-badge">${ok ? 'Ready' : 'Pending'}</span>
      </div>
    `;
  }).join('');

  document.getElementById('scoreChecks').innerHTML = checks.map(c => {
    const ok = checkStatus[c.key];
    return `
      <div class="score-check-row">
        <div class="scr-dot ${ok ? 'done' : 'fail'}"></div>
        <span class="scr-label ${ok ? 'done' : ''}">${c.label}</span>
        ${ok ? '<i class="fas fa-check scr-tick"></i>' : ''}
      </div>
    `;
  }).join('');

  updateScore();
}

/* ───────────────── Score Update ───────────────── */
function updateScore() {
  const done = Object.values(checkStatus).filter(Boolean).length;
  const total = checks.length;
  const pct = Math.round((done / total) * 100);
  const offset = CIRC - (pct / 100) * CIRC;

  document.getElementById('srFill').style.strokeDashoffset = offset;
  document.getElementById('scorePct').textContent = pct + '%';

  document.getElementById('sbScoreFill').style.width = pct + '%';
  document.getElementById('sbScorePct').textContent = pct + '%';
  document.getElementById('sbScoreLeft').textContent = `${done} / ${total} complete`;

  const titles = ['Profile Incomplete','Getting Started','Almost Ready!','Looking Great!','Ready to Publish! 🚀'];
  const descs = [
    'Complete your checklist to go live.',
    'Keep filling in your portfolio details.',
    'Just a few more items to go!',
    'Almost there — finish the last steps.',
    'Everything looks great. Hit Publish!'
  ];

  const idx = pct === 100 ? 4 : pct >= 80 ? 3 : pct >= 60 ? 2 : pct >= 30 ? 1 : 0;
  document.getElementById('scoreTitle').textContent = titles[idx];
  document.getElementById('scoreDesc').textContent = descs[idx];

  const btn = document.getElementById('publishBtn');
  const note = document.getElementById('publishNote');

  if (pct === 100) {
    btn.disabled = false;
    note.innerHTML = '<i class="fas fa-check-circle"></i> All checks passed. Ready to go live!';
    note.className = 'publish-note good';
  } else {
    btn.disabled = true;
    const rem = total - done;
    note.innerHTML = `<i class="fas fa-shield-alt"></i> Complete ${rem} more item${rem > 1 ? 's' : ''} to publish.`;
    note.className = 'publish-note';
  }
}

/* ───────────────── Live Card ───────────────── */
function showLiveCard(slug) {
  const url = getLiveUrl(slug);

  document.getElementById('linkInput').value = url;
  document.getElementById('liveCard').classList.add('show');

  document.getElementById('lsSkills').textContent = skillsCount;
  document.getElementById('lsProjects').textContent = projCount;
  document.getElementById('lsEdu').textContent = eduCount;

  const enc = encodeURIComponent(url);
  document.getElementById('shareTwitter').href = `https://twitter.com/intent/tweet?text=Check+out+my+portfolio!&url=${enc}`;
  document.getElementById('shareLinkedIn').href = `https://www.linkedin.com/sharing/share-offsite/?url=${enc}`;
  document.getElementById('shareWhatsapp').href = `https://wa.me/?text=${encodeURIComponent('Check out my portfolio: ' + url)}`;
  document.getElementById('shareEmail').href = `mailto:?subject=My Portfolio&body=${encodeURIComponent('Check out my portfolio: ' + url)}`;

  const btn = document.getElementById('publishBtn');
  btn.classList.remove('loading');
  btn.classList.add('published');
  btn.disabled = false;
  btn.innerHTML = '<i class="fas fa-check"></i>&nbsp; Published!';
}

/* ───────────────── Visibility UI ───────────────── */
document.querySelectorAll('.vis-opt').forEach(opt => {
  opt.addEventListener('click', () => {
    document.querySelectorAll('.vis-opt').forEach(o => o.classList.remove('active'));
    opt.classList.add('active');
  });
});

/* ───────────────── Slug Input Events ───────────────── */
slugInput.addEventListener('input', e => {
  e.target.value = normalizeSlug(e.target.value);
  clearTimeout(slugTimer);

  const val = e.target.value.trim();
  if (!val) {
    setSlugStatus('', '');
    return;
  }

  setSlugStatus('check', 'Checking availability...');
  slugTimer = setTimeout(() => checkSlug(val), 700);
});

document.getElementById('checkSlugBtn').addEventListener('click', async () => {
  const val = normalizeSlug(slugInput.value.trim());
  if (!val) {
    showToast('Enter a slug first', 'error');
    return;
  }
  await checkSlug(val);
});

/* ───────────────── Publish ───────────────── */
document.getElementById('publishBtn').addEventListener('click', async () => {
  if (!currentUser) return;

  const slug = normalizeSlug(slugInput.value.trim());

  if (!slug) {
    showToast('Please enter a URL slug first', 'error');
    return;
  }

  if (slug.length < 3) {
    showToast('Slug must be at least 3 characters', 'error');
    return;
  }

  const slugAvailable = await checkSlug(slug);
  if (!slugAvailable) {
    showToast(`"${slug}" is already taken. Choose another.`, 'error');
    return;
  }

  const btn = document.getElementById('publishBtn');
  btn.classList.add('loading');
  btn.disabled = true;

  try {
    const visibility = getSelectedVisibility();
    const templateDisplayName = getTemplateDisplayName();
    const templateFile = getTemplateFile();

    const oldSlug = currentUserData?.username || null;

    // 1) Save username -> uid mapping
    await setDoc(doc(db, 'usernames', slug), {
      uid: currentUser.uid,
      updatedAt: serverTimestamp()
    }, { merge: true });

    // 2) If slug changed, remove old username mapping
    if (oldSlug && oldSlug !== slug) {
      try {
        await deleteDoc(doc(db, 'usernames', oldSlug));
      } catch (err) {
        console.warn('Could not delete old slug mapping:', err);
      }
    }

    // 3) Save user publish data
    await setDoc(doc(db, 'users', currentUser.uid), {
      username: slug,
      template: templateDisplayName,
      templateFile: templateFile,
      visibility: visibility,
      published: true,
      publishedAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    }, { merge: true });

    currentUserData = {
      ...(currentUserData || {}),
      username: slug,
      template: templateDisplayName,
      templateFile: templateFile,
      visibility: visibility,
      published: true
    };

    localStorage.setItem('portfolioStatus', 'published');
    localStorage.setItem('portfolioSlug', slug);

    launchConfetti();
    showLiveCard(slug);
    showToast('🎉 Your portfolio is now live!');

  } catch (err) {
    console.error('Publish failed:', err);
    showToast('Publish failed: ' + err.message, 'error');
    btn.classList.remove('loading');
    btn.disabled = false;
  }
});

/* ───────────────── Unpublish ───────────────── */
document.getElementById('unpublishBtn').addEventListener('click', async () => {
  if (!currentUser) return;

  if (!confirm('Are you sure you want to unpublish your portfolio?')) return;

  try {
    await setDoc(doc(db, 'users', currentUser.uid), {
      published: false,
      updatedAt: serverTimestamp()
    }, { merge: true });

    localStorage.removeItem('portfolioStatus');

    document.getElementById('liveCard').classList.remove('show');

    const btn = document.getElementById('publishBtn');
    btn.classList.remove('published');
    btn.classList.remove('loading');
    btn.innerHTML = '<span class="pub-label"><i class="fas fa-rocket"></i>&nbsp; Publish Portfolio</span>';

    updateScore();
    showToast('Portfolio unpublished.');

  } catch (e) {
    console.error(e);
    showToast('Failed to unpublish.', 'error');
  }
});

/* ───────────────── Copy ───────────────── */
document.getElementById('copyBtn').addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText(document.getElementById('linkInput').value);
    showToast('Link copied to clipboard! 📋');
  } catch {
    showToast('Please copy manually.');
  }
});

/* ───────────────── Auth + Load Data ───────────────── */
onAuthStateChanged(auth, async user => {
  if (!user) {
    window.location.href = 'loginpage.html';
    return;
  }

  currentUser = user;

  try {
    const profileSnap = await getDoc(doc(db, 'users', user.uid));
    let slug = user.email.split('@')[0].replace(/[^a-z0-9]/gi, '').toLowerCase();

    if (profileSnap.exists()) {
      const d = profileSnap.data();
      currentUserData = d;

      checkStatus.profile = !!(d.fullName && d.role && d.about);

      if (d.username) slug = d.username;
      if (d.template) {
        document.getElementById('tplNameEl').textContent = d.template;
        localStorage.setItem('finalTemplate', d.template);
      } else {
        localStorage.removeItem('finalTemplate');
      }
      if (d.templateFile) {
        localStorage.setItem('finalTemplateFile', d.templateFile);
      } else {
        localStorage.removeItem('finalTemplateFile');
      }

      document.getElementById('spName').textContent = d.fullName || user.email.split('@')[0];
      document.getElementById('spAvatar').textContent = (d.fullName || user.email).charAt(0).toUpperCase();

      if (d.published && d.username) {
        showLiveCard(d.username);
      }

      if (d.visibility) {
        document.querySelectorAll('.vis-opt').forEach(o => {
          o.classList.toggle('active', o.dataset.vis === d.visibility);
        });
      }
    } else {
      document.getElementById('spName').textContent = user.email.split('@')[0];
      document.getElementById('spAvatar').textContent = user.email.charAt(0).toUpperCase();
    }

    slugInput.value = slug;

    const [sk, pr, ed, mainEdu] = await Promise.all([
      getDocs(collection(db, 'users', user.uid, 'skills')),
      getDocs(collection(db, 'users', user.uid, 'projects')),
      getDocs(collection(db, 'users', user.uid, 'education')),
      getDoc(doc(db, 'users', user.uid, 'education', 'main'))
    ]);

    skillsCount = sk.size;
    projCount = pr.size;
    
    const hasMainEdu = mainEdu.exists() && (() => {
      const data = mainEdu.data();
      const hasValues = obj => obj && Object.values(obj).some(v => String(v).trim() !== '');
      return hasValues(data.university) || hasValues(data.school);
    })();

    eduCount = ed.size > 0 ? ed.size : (hasMainEdu ? 1 : 0);

    checkStatus.skills = sk.size > 0;
    checkStatus.projects = pr.size > 0;
    checkStatus.education = eduCount > 0;

    document.getElementById('statSkills').textContent = sk.size;
    document.getElementById('statProjects').textContent = pr.size;
    document.getElementById('statEdu').textContent = eduCount;

    const tplDisplay = getTemplateDisplayName();
    const tplFile = getTemplateFile();

    checkStatus.template = !!tplFile;

    if (tplDisplay) {
      document.getElementById('tplNameEl').textContent = tplDisplay;
    }

    renderChecklist();

  } catch (err) {
    console.error('Load publish page error:', err);
    showToast('Failed to load publish page', 'error');
  }

  const ol = document.getElementById('loadingOverlay');
  ol.style.opacity = '0';
  setTimeout(() => ol.style.display = 'none', 400);
});

/* ───────────────── Logout ───────────────── */
document.getElementById('logoutBtn').addEventListener('click', async () => {
  await signOut(auth);
  localStorage.clear();
  window.location.href = 'loginpage.html';
});

/* ───────────────── Cursor ───────────────── */
const cursor = document.getElementById('cursor');
const ring = document.getElementById('cursorRing');

document.addEventListener('mousemove', e => {
  cursor.style.left = e.clientX + 'px';
  cursor.style.top = e.clientY + 'px';
  ring.style.left = e.clientX + 'px';
  ring.style.top = e.clientY + 'px';
});

/* ───────────────── Navbar Scroll ───────────────── */
window.addEventListener('scroll', () => {
  document.getElementById('navbar').classList.toggle('scrolled', window.scrollY > 10);
});

/* ───────────────── Reveal Animation ───────────────── */
const obs = new IntersectionObserver(entries => {
  entries.forEach(e => {
    if (e.isIntersecting) e.target.classList.add('visible');
  });
}, { threshold: 0.07 });

document.querySelectorAll('.reveal').forEach(el => obs.observe(el));