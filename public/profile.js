import { initializeApp }    from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut }
  from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore, doc, setDoc, getDoc, collection, getDocs }
  from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

/* ─── Firebase init ──────────────────────────────────────────────────────── */
const firebaseConfig = {
  apiKey:            "AIzaSyD4q_KzBCxVtS6mjH6Xh6-Bd1u-21RSNG4",
  authDomain:        "portfoliox-2e787.firebaseapp.com",
  projectId:         "portfoliox-2e787",
  storageBucket:     "portfoliox-2e787.firebasestorage.app",
  messagingSenderId: "562709786891",
  appId:             "1:562709786891:web:2d0f575ab7d3bda5fdf20e"
};
const app     = initializeApp(firebaseConfig);
const auth    = getAuth(app);
const db      = getFirestore(app);

/* ─── State (declared first so all functions below can reference them) ────── */
let isDirty              = false;
let savedData            = {};
let pendingAvatarBase64  = null; // Changed from pendingAvatarFile

/* ─── DOM shortcuts ──────────────────────────────────────────────────────── */
const aboutEl = document.getElementById('about');
const charEl  = document.getElementById('charCount');

/* ════════════════════════════════════════════════════════════════════════════
   HELPER FUNCTIONS  (all declared before any event-listener / async code)
   ════════════════════════════════════════════════════════════════════════════ */

/* Toast notification */
function showToast(msg, isError = false) {
  const t = document.getElementById('toast');
  document.getElementById('toastMsg').textContent = msg;
  document.getElementById('toastIcon').className  = isError
    ? 'fas fa-times-circle' : 'fas fa-check-circle';
  t.className = 'toast' + (isError ? ' error' : '');
  void t.offsetWidth;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 3500);
}

/* Dirty-state helpers */
function markDirty() {
  if (!isDirty) {
    isDirty = true;
    document.getElementById('unsavedBar').classList.add('show');
  }
}
function clearDirty() {
  isDirty = false;
  document.getElementById('unsavedBar').classList.remove('show');
}

/* Avatar helpers */
function applyAvatar(src) {
  const html = `<img src="${src}" alt="avatar"
    style="width:100%;height:100%;object-fit:cover;border-radius:inherit;">`;
  document.getElementById('avatarEl').innerHTML = html;
  document.getElementById('spAvatar').innerHTML  = html;
}
function resetAvatarToLetter(letter) {
  document.getElementById('avatarEl').textContent = letter;
  document.getElementById('spAvatar').textContent  = letter;
}

/* Field status tick / cross */
function setFieldStatus(id, type) {
  const el = document.getElementById('fs-' + id);
  if (!el) return;
  if (!type) { el.className = 'field-status'; el.textContent = ''; return; }
  el.className = `field-status show ${type}`;
  el.innerHTML = type === 'ok'
    ? '<i class="fas fa-check-circle"></i>'
    : '<i class="fas fa-exclamation-circle"></i>';
}

/* URL preview strip */
function showUrlPreview(inputId, previewId, textId) {
  const val  = document.getElementById(inputId)?.value.trim();
  const prev = document.getElementById(previewId);
  const text = document.getElementById(textId);
  if (!prev) return;
  if (val && val.startsWith('http')) {
    prev.classList.add('visible');
    if (text) text.textContent = val;
  } else {
    prev.classList.remove('visible');
  }
}

/* Completion ring, chips, badges */
const FIELDS  = [
  { id: 'fullName', label: 'Name'     },
  { id: 'phone',    label: 'Phone'    },
  { id: 'location', label: 'Location' },
  { id: 'role',     label: 'Role'     },
  { id: 'about',    label: 'About'    },
  { id: 'github',   label: 'GitHub'   },
  { id: 'linkedin', label: 'LinkedIn' },
];
const CIRC_CT = 2 * Math.PI * 28;
const CIRC_SB = 188.5;

function updateCompletion() {
  const filled = FIELDS.filter(f => document.getElementById(f.id)?.value.trim());
  const pct    = Math.round((filled.length / FIELDS.length) * 100);

  document.getElementById('ctArc').style.strokeDashoffset      = CIRC_CT - (pct / 100) * CIRC_CT;
  document.getElementById('ctPct').textContent                  = pct + '%';
  document.getElementById('ctBarFill').style.width              = pct + '%';
  document.getElementById('ctBarPct').textContent               = `${filled.length} / ${FIELDS.length} fields`;
  document.getElementById('navPFill').style.width               = pct + '%';
  document.getElementById('navPText').textContent               = pct + '%';
  document.getElementById('sidebarRing').style.strokeDashoffset = CIRC_SB - (pct / 100) * CIRC_SB;
  document.getElementById('sidebarPct').textContent             = pct + '%';

  const msgs = [
    'Fill in all fields to complete your profile',
    'Great start — keep going!',
    "Almost there, you're doing great!",
    '🎉 Profile complete — ready to publish!'
  ];
  document.getElementById('ctMsg').textContent =
    msgs[pct === 100 ? 3 : pct >= 70 ? 2 : pct >= 30 ? 1 : 0];

  document.getElementById('ctChips').innerHTML = FIELDS.map(f => {
    const done = document.getElementById(f.id)?.value.trim();
    return `<span class="chip ${done ? 'done' : 'pending'}">${done ? '✓' : '○'} ${f.label}</span>`;
  }).join('');

  const pFilled = ['fullName','phone','location','role','about']
    .filter(id => document.getElementById(id)?.value.trim()).length;
  document.getElementById('personalBadge').textContent = `${pFilled} / 5`;

  const sFilled = ['github','linkedin','twitter','dribbble']
    .filter(id => document.getElementById(id)?.value.trim()).length;
  document.getElementById('socialBadge').textContent = `${sFilled} / 4`;

  // Hero social tags
  document.getElementById('heroTags').innerHTML =
    [{ id:'github',   i:'fab fa-github',   t:'GitHub'   },
     { id:'linkedin', i:'fab fa-linkedin',  t:'LinkedIn' },
     { id:'twitter',  i:'fab fa-twitter',   t:'Twitter'  },
     { id:'dribbble', i:'fab fa-dribbble',  t:'Dribbble' }]
    .filter(x => document.getElementById(x.id)?.value.trim())
    .map(x => `<span class="hero-tag"><i class="${x.i}"></i> ${x.t}</span>`)
    .join('');
}

/* ════════════════════════════════════════════════════════════════════════════
   SAVE  &  DISCARD
   ════════════════════════════════════════════════════════════════════════════ */
async function saveProfile() {
  const user = auth.currentUser;
  if (!user) { showToast('Not signed in — please refresh the page.', true); return; }

  const saveBtn = document.getElementById('saveBtn');
  const spinner = document.getElementById('saveSpinner');
  const originalText = saveBtn.textContent;

  saveBtn.disabled      = true;
  saveBtn.textContent    = 'Saving...';
  spinner.style.display = 'block';

  try {
    // 1. Handle avatar (store as base64 in Firestore instead of Firebase Storage)
    let avatarUrl = savedData.avatarUrl || null;
    if (pendingAvatarBase64) {
      showToast('Processing avatar...', false);
      try {
        // Store the base64 directly in Firestore (no Firebase Storage needed)
        avatarUrl = pendingAvatarBase64;
        pendingAvatarBase64 = null;
        console.log('[saveProfile] Avatar processed successfully, base64 length:', avatarUrl.length);
        showToast('Avatar processed successfully!', false);
      } catch (avatarErr) {
        console.error('[saveProfile] Avatar processing failed:', avatarErr);
        showToast('Avatar processing failed: ' + avatarErr.message, true);
        throw avatarErr;
      }
    }

    // 2. Build data object
    const data = {
      fullName:  document.getElementById('fullName').value.trim(),
      email:     user.email,
      phone:     document.getElementById('phone').value.trim(),
      about:     document.getElementById('about').value.trim(),
      location:  document.getElementById('location').value.trim(),
      role:      document.getElementById('role').value.trim(),
      github:    document.getElementById('github').value.trim(),
      linkedin:  document.getElementById('linkedin').value.trim(),
      twitter:   document.getElementById('twitter').value.trim(),
      dribbble:  document.getElementById('dribbble').value.trim(),
      website:   document.getElementById('website').value.trim(),
      avatarUrl: avatarUrl,
      updatedAt: new Date().toISOString(),
    };

    // 3. Save to Firestore with timeout
    showToast('Saving profile data...', false);
    const savePromise = setDoc(doc(db, 'users', user.uid), data, { merge: true });
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Save timeout - please try again')), 30000)
    );
    await Promise.race([savePromise, timeoutPromise]);

    // 4. Update in-memory snapshot & clear dirty state
    savedData = { ...data };
    clearDirty();
    showToast('Profile saved successfully! ✅');

  } catch (err) {
    console.error('[saveProfile] Error:', err);
    showToast('Save failed: ' + (err.message || 'Unknown error'), true);
  } finally {
    saveBtn.disabled      = false;
    saveBtn.textContent    = originalText;
    spinner.style.display = 'none';
  }
}

function discardChanges() {
  // Restore text fields
  ['fullName','phone','location','role','about',
   'github','linkedin','twitter','dribbble','website'].forEach(k => {
    const el = document.getElementById(k);
    if (el) el.value = savedData[k] || '';
  });

  // Hero live values
  document.getElementById('heroName').textContent = savedData.fullName || 'Your Name';
  document.getElementById('heroRole').textContent = savedData.role     || 'Your Role';
  document.getElementById('heroLoc').textContent  = savedData.location || 'Location';
  document.getElementById('spName').textContent   =
    savedData.fullName || auth.currentUser?.email?.split('@')[0] || '';

  // Char count
  const len = (savedData.about || '').length;
  charEl.textContent = `${len} / 500`;
  charEl.className   = 'char-count' + (len > 480 ? ' over' : len > 420 ? ' warn' : '');

  // Avatar
  if (savedData.avatarUrl) {
    applyAvatar(savedData.avatarUrl);
  } else {
    resetAvatarToLetter(auth.currentUser?.email?.charAt(0).toUpperCase() || '?');
  }
  pendingAvatarBase64 = null;

  // Field statuses & URL previews
  ['fullName','phone','location','role','website',
   'github','linkedin','twitter','dribbble'].forEach(id =>
    setFieldStatus(id, savedData[id] ? 'ok' : null));
  ['website','github','linkedin'].forEach(id =>
    showUrlPreview(id, id + 'Preview', id + 'PreviewText'));

  updateCompletion();
  clearDirty();
  showToast('Changes discarded.');
}

/* ════════════════════════════════════════════════════════════════════════════
   EVENT LISTENERS
   ════════════════════════════════════════════════════════════════════════════ */

/* Save / Discard buttons */
document.getElementById('saveBtn').addEventListener('click',   saveProfile);
document.getElementById('ubSave').addEventListener('click',    saveProfile);
document.getElementById('cancelBtn').addEventListener('click', discardChanges);
document.getElementById('ubDiscard').addEventListener('click', discardChanges);

/* Logout */
document.getElementById('logoutBtn').addEventListener('click', async () => {
  await signOut(auth);
  localStorage.clear();
  window.location.href = 'loginpage.html';
});

/* Avatar picker — compress to ≤400px before keeping in memory */
document.getElementById('avatarInput').addEventListener('change', e => {
  const file = e.target.files[0];
  if (!file) return;

  // Check file size (max 10MB)
  if (file.size > 10 * 1024 * 1024) {
    showToast('Image file is too large (max 10MB)', true);
    return;
  }

  const reader = new FileReader();
  reader.onload = ev => {
    const img  = new Image();
    img.onload = () => {
      const canvas  = document.createElement('canvas');
      const maxSize = 400;
      const ratio   = Math.min(maxSize / img.width, maxSize / img.height, 1);
      canvas.width  = Math.round(img.width  * ratio);
      canvas.height = Math.round(img.height * ratio);
      canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);

      // Store as base64 for Firestore storage (no Firebase Storage needed)
      pendingAvatarBase64 = canvas.toDataURL('image/jpeg', 0.82);
      applyAvatar(pendingAvatarBase64);
      markDirty();
      console.log('[avatar] Processed image, base64 length:', pendingAvatarBase64.length);
    };
    img.onerror = () => {
      showToast('Invalid image file - please select a valid image', true);
    };
    img.src = ev.target.result;
  };
  reader.onerror = () => {
    showToast('Failed to read image file', true);
  };
  reader.readAsDataURL(file);
});

/* About char count */
aboutEl.addEventListener('input', () => {
  const len = aboutEl.value.length;
  charEl.textContent = `${len} / 500`;
  charEl.className   = 'char-count' + (len > 480 ? ' over' : len > 420 ? ' warn' : '');
  updateCompletion();
  markDirty();
});

/* Live hero preview */
document.getElementById('fullName').addEventListener('input', e => {
  document.getElementById('heroName').textContent = e.target.value || 'Your Name';
  document.getElementById('spName').textContent   =
    e.target.value || auth.currentUser?.email?.split('@')[0] || '';
  setFieldStatus('fullName', e.target.value.trim() ? 'ok' : null);
  updateCompletion(); markDirty();
});
document.getElementById('role').addEventListener('input', e => {
  document.getElementById('heroRole').textContent = e.target.value || 'Your Role';
  setFieldStatus('role', e.target.value.trim() ? 'ok' : null);
  updateCompletion(); markDirty();
});
document.getElementById('location').addEventListener('input', e => {
  document.getElementById('heroLoc').textContent = e.target.value || 'Location';
  setFieldStatus('location', e.target.value.trim() ? 'ok' : null);
  updateCompletion(); markDirty();
});
document.getElementById('phone').addEventListener('input', e => {
  setFieldStatus('phone', e.target.value.trim() ? 'ok' : null);
  updateCompletion(); markDirty();
});
document.getElementById('website').addEventListener('input', e => {
  showUrlPreview('website', 'websitePreview', 'websitePreviewText');
  setFieldStatus('website', e.target.value.trim() ? 'ok' : null);
  markDirty();
});
['github','linkedin','twitter','dribbble'].forEach(id => {
  document.getElementById(id)?.addEventListener('input', () => {
    showUrlPreview(id, id + 'Preview', id + 'PreviewText');
    setFieldStatus(id, document.getElementById(id).value.trim() ? 'ok' : null);
    updateCompletion(); markDirty();
  });
});

/* ════════════════════════════════════════════════════════════════════════════
   AUTH → LOAD DATA
   ════════════════════════════════════════════════════════════════════════════ */
onAuthStateChanged(auth, async user => {
  if (!user) { window.location.href = 'loginpage.html'; return; }

  // Set email field & initial avatar letter right away
  document.getElementById('email').value = user.email;
  const initial = user.email.charAt(0).toUpperCase();
  resetAvatarToLetter(initial);
  document.getElementById('spName').textContent = user.email.split('@')[0];

  // Load profile document
  try {
    const snap = await getDoc(doc(db, 'users', user.uid));
    if (snap.exists()) {
      const d   = snap.data();
      savedData = d;

      // Fill form fields
      ['fullName','phone','location','role','about',
       'github','linkedin','twitter','dribbble','website'].forEach(k => {
        if (d[k]) document.getElementById(k).value = d[k];
      });

      // Hero live values
      document.getElementById('heroName').textContent = d.fullName || 'Your Name';
      document.getElementById('heroRole').textContent = d.role     || 'Your Role';
      document.getElementById('heroLoc').textContent  = d.location || 'Location';
      document.getElementById('spName').textContent   = d.fullName || user.email.split('@')[0];

      // Char count
      const len = (d.about || '').length;
      charEl.textContent = `${len} / 500`;
      charEl.className   = 'char-count' + (len > 480 ? ' over' : len > 420 ? ' warn' : '');

      // Field statuses
      ['fullName','phone','location','role','website',
       'github','linkedin','twitter','dribbble'].forEach(id => {
        if (d[id]) setFieldStatus(id, 'ok');
      });

      // URL previews
      ['website','github','linkedin'].forEach(id =>
        showUrlPreview(id, id + 'Preview', id + 'PreviewText'));

      // ✅ Restore avatar from Firebase Storage URL
      if (d.avatarUrl) applyAvatar(d.avatarUrl);
    }
  } catch (err) {
    console.error('[load] Firestore error:', err);
    showToast('Could not load saved profile.', true);
  }

  // Load section counts (non-critical — wrap separately)
  try {
    const [sk, pr, ed] = await Promise.all([
      getDocs(collection(db, 'users', user.uid, 'skills')),
      getDocs(collection(db, 'users', user.uid, 'projects')),
      getDocs(collection(db, 'users', user.uid, 'education')),
    ]);
    ['hsgSkills',   'navSkills'  ].forEach(id => document.getElementById(id).textContent = sk.size);
    ['hsgProjects', 'navProjects'].forEach(id => document.getElementById(id).textContent = pr.size);
    ['hsgEdu',      'navEdu'     ].forEach(id => document.getElementById(id).textContent = ed.size);
  } catch (_) { /* counts are non-critical */ }

  updateCompletion();

  // Hide loading overlay
  const ol = document.getElementById('loadingOverlay');
  ol.style.opacity = '0';
  setTimeout(() => ol.style.display = 'none', 400);
});

/* ════════════════════════════════════════════════════════════════════════════
   UI EXTRAS
   ════════════════════════════════════════════════════════════════════════════ */

/* Custom cursor */
const cursorEl = document.getElementById('cursor');
const ringEl   = document.getElementById('cursorRing');
document.addEventListener('mousemove', e => {
  cursorEl.style.left = e.clientX + 'px';
  cursorEl.style.top  = e.clientY + 'px';
  ringEl.style.left   = e.clientX + 'px';
  ringEl.style.top    = e.clientY + 'px';
});

/* Navbar shadow on scroll */
window.addEventListener('scroll', () =>
  document.getElementById('navbar').classList.toggle('scrolled', window.scrollY > 20));

/* Reveal-on-scroll */
const revealObs = new IntersectionObserver(
  entries => entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('visible'); }),
  { threshold: 0.07 }
);
document.querySelectorAll('.reveal').forEach(el => revealObs.observe(el));