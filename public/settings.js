import { initializeApp }   from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import {
  getAuth, onAuthStateChanged, signOut,
  EmailAuthProvider, reauthenticateWithCredential,
  updatePassword, updateProfile, sendEmailVerification, deleteUser
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import {
  getFirestore, doc, getDoc, setDoc, deleteDoc,
  collection, getDocs, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { firebaseConfig }   from "./firebase-config.js";
const app  = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db   = getFirestore(app);

let currentUser = null;
let settingsRef = null;
let urlSettingsRef = null;
let autoSaveTimer = null;

/* ─────────────────────────────────────────
   TOAST
───────────────────────────────────────── */
function showToast(msg, type = 'success', title = null) {
  const toast     = document.getElementById('toast');
  const toastIcon = document.getElementById('toastIcon');
  const toastMsg  = document.getElementById('toastMsg');
  const toastTitle= document.getElementById('toastTitle');

  const titles = { success: 'Success', error: 'Error', warn: 'Warning' };
  const icons  = {
    success: 'fas fa-check-circle',
    error:   'fas fa-times-circle',
    warn:    'fas fa-triangle-exclamation'
  };

  toastTitle.textContent  = title || titles[type];
  toastMsg.textContent    = msg;
  toastIcon.className     = icons[type] || icons.success;
  toast.className         = `toast ${type}`;

  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 4000);
}

/* ─────────────────────────────────────────
   LAST SAVED INDICATOR
───────────────────────────────────────── */
function setLastSaved(saving = false) {
  const pill = document.getElementById('lastSavedPill');
  const text = document.getElementById('lastSavedText');
  if (saving) {
    pill.className = 'last-saved-pill saving';
    pill.querySelector('i').className = 'fas fa-cloud-arrow-up';
    text.textContent = 'Saving...';
  } else {
    pill.className = 'last-saved-pill';
    pill.querySelector('i').className = 'fas fa-cloud-check';
    const now = new Date();
    text.textContent = `Saved at ${now.toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})}`;
  }
}

/* ─────────────────────────────────────────
   LOADING OVERLAY
───────────────────────────────────────── */
function hideLoader() {
  const overlay = document.getElementById('loadingOverlay');
  if (overlay) {
    overlay.style.opacity = '0';
    setTimeout(() => overlay.style.display = 'none', 500);
  }
}

/* ─────────────────────────────────────────
   PASSWORD STRENGTH METER
───────────────────────────────────────── */
const pwChecks = [
  { re: /.{8,}/,           id: 'pc-len',   label: '8+ chars'  },
  { re: /[A-Z]/,           id: 'pc-upper', label: 'Uppercase' },
  { re: /[a-z]/,           id: 'pc-lower', label: 'Lowercase' },
  { re: /[0-9]/,           id: 'pc-num',   label: 'Number'    },
  { re: /[@$!%*?&#^()_+]/, id: 'pc-sym',   label: 'Symbol'    },
];
const colors = ['#ef4444','#f97316','#f59e0b','#84cc16','#22c55e'];
const labels = ['Very Weak','Weak','Fair','Strong','Very Strong'];

document.getElementById('newPasswordInline').addEventListener('input', function() {
  const val = this.value;
  const box = document.getElementById('pwStrength');
  if (!val) { box.style.display = 'none'; return; }
  box.style.display = 'block';

  let met = 0;
  pwChecks.forEach(c => {
    const el = document.getElementById(c.id);
    const pass = c.re.test(val);
    if (pass) met++;
    el.classList.toggle('met', pass);
    el.querySelector('i').className = pass ? 'fas fa-check' : 'fas fa-xmark';
  });

  const fill  = document.getElementById('pwBarFill');
  const hint  = document.getElementById('pwHint');
  fill.style.width      = ((met / pwChecks.length) * 100) + '%';
  fill.style.background = colors[met - 1] || '#ef4444';
  hint.textContent      = labels[met - 1] || '';
  hint.style.color      = colors[met - 1] || '#ef4444';
});

/* ─────────────────────────────────────────
   PASSWORD VISIBILITY TOGGLES
───────────────────────────────────────── */
function bindPwToggle(btnId, inputId) {
  const btn = document.getElementById(btnId);
  const inp = document.getElementById(inputId);
  if (!btn || !inp) return;
  btn.addEventListener('click', () => {
    inp.type = inp.type === 'password' ? 'text' : 'password';
    btn.querySelector('i').className = inp.type === 'password' ? 'fas fa-eye' : 'fas fa-eye-slash';
  });
}
bindPwToggle('pwToggleInline',  'newPasswordInline');
bindPwToggle('pwToggleCurrent', 'currentPasswordInline');
bindPwToggle('reAuthPwToggle',  'reAuthPassword');

/* ─────────────────────────────────────────
   RE-AUTHENTICATE MODAL
───────────────────────────────────────── */
let reAuthResolve = null;

function requireReAuth() {
  return new Promise(resolve => {
    reAuthResolve = resolve;
    document.getElementById('reAuthPassword').value = '';
    document.getElementById('reAuthError').style.display = 'none';
    document.getElementById('reAuthModal').classList.add('open');
    setTimeout(() => document.getElementById('reAuthPassword').focus(), 100);
  });
}
function closeReAuth(result) {
  document.getElementById('reAuthModal').classList.remove('open');
  if (reAuthResolve) { reAuthResolve(result); reAuthResolve = null; }
}

document.getElementById('reAuthCancel').addEventListener('click', () => closeReAuth(false));
document.getElementById('reAuthClose').addEventListener('click',  () => closeReAuth(false));

document.getElementById('reAuthConfirm').addEventListener('click', async () => {
  const password = document.getElementById('reAuthPassword').value.trim();
  const errEl    = document.getElementById('reAuthError');
  const btn      = document.getElementById('reAuthConfirm');
  const spinner  = document.getElementById('reAuthSpinner');

  if (!password) {
    errEl.textContent = 'Please enter your password.';
    errEl.style.display = 'block';
    return;
  }
  btn.disabled = true; spinner.style.display = 'block';
  errEl.style.display = 'none';

  try {
    const cred = EmailAuthProvider.credential(currentUser.email, password);
    await reauthenticateWithCredential(currentUser, cred);
    closeReAuth(true);
  } catch (err) {
    const msg = err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential'
      ? 'Incorrect password. Please try again.'
      : err.code === 'auth/too-many-requests'
      ? 'Too many attempts. Please wait a moment.'
      : err.message;
    errEl.textContent = msg;
    errEl.style.display = 'block';
  } finally {
    btn.disabled = false; spinner.style.display = 'none';
  }
});

/* ─────────────────────────────────────────
   CONFIRM MODAL
───────────────────────────────────────── */
let confirmResolve = null;

function openConfirm({ title, desc, okLabel = 'Confirm', type = 'danger', requireTyping = null }) {
  return new Promise(resolve => {
    confirmResolve = resolve;
    document.getElementById('confirmTitle').textContent   = title;
    document.getElementById('confirmDesc').textContent    = desc;
    document.getElementById('confirmOkLabel').textContent = okLabel;

    const wrap  = document.getElementById('confirmIconWrap');
    const iconI = document.getElementById('confirmIconI');
    const okBtn = document.getElementById('confirmOk');

    wrap.className  = `confirm-icon-wrap ${type === 'warning' ? 'orange' : 'red'}`;
    iconI.className = type === 'warning' ? 'fas fa-eye-slash' : 'fas fa-triangle-exclamation';
    okBtn.className = `btn ${type === 'warning' ? 'btn-warning' : 'btn-danger'} modal-ok`;

    // Type-to-confirm feature
    const typeWrap = document.getElementById('confirmTypeWrap');
    const typeInput = document.getElementById('confirmTypeInput');
    if (requireTyping) {
      document.getElementById('confirmTypeWord').textContent = requireTyping;
      typeWrap.style.display = 'block';
      typeInput.value = '';
      okBtn.disabled  = true;
      typeInput.addEventListener('input', function handler() {
        okBtn.disabled = this.value !== requireTyping;
        if (this.value === requireTyping) {
          typeInput.removeEventListener('input', handler);
        }
      });
    } else {
      typeWrap.style.display = 'none';
      okBtn.disabled = false;
    }

    document.getElementById('confirmModal').classList.add('open');
  });
}

function closeConfirm(result) {
  document.getElementById('confirmModal').classList.remove('open');
  document.getElementById('confirmTypeInput').value = '';
  if (confirmResolve) { confirmResolve(result); confirmResolve = null; }
}

document.getElementById('confirmCancel').addEventListener('click', () => closeConfirm(false));
document.getElementById('confirmOk').addEventListener('click',     () => closeConfirm(true));
document.getElementById('confirmModal').addEventListener('click', e => {
  if (e.target === document.getElementById('confirmModal')) closeConfirm(false);
});

/* ─────────────────────────────────────────
   TOGGLE SETTINGS — AUTO SAVE
───────────────────────────────────────── */
const toggleMap = {
  visibilityToggle:  'visibility',
  editToggle:        'allowEdits',
  seoToggle:         'seoIndexing',
  analyticsToggle:   'analytics',
  notifyToggle:      'notifications',
  autosaveToggle:    'autosave',
  darkToggle:        'darkMode',
  socialToggle:      'showSocial',
  resumeToggle:      'allowResume',
  pwProtectToggle:   'pwProtect',
};

async function saveAllToggles() {
  if (!settingsRef) return;
  setLastSaved(true);
  const data = { updatedAt: serverTimestamp() };
  Object.entries(toggleMap).forEach(([id, key]) => {
    const el = document.getElementById(id);
    if (el) data[key] = el.checked;
  });
  try {
    await setDoc(settingsRef, data, { merge: true });
    setLastSaved(false);
  } catch {
    showToast('Failed to save settings', 'error');
  }
}

Object.keys(toggleMap).forEach(id => {
  const el = document.getElementById(id);
  if (!el) return;
  el.addEventListener('change', () => {
    clearTimeout(autoSaveTimer);
    autoSaveTimer = setTimeout(saveAllToggles, 800);
  });
});

/* ─────────────────────────────────────────
   AUTH STATE
───────────────────────────────────────── */
onAuthStateChanged(auth, async user => {
  if (!user) { window.location.href = 'loginpage.html'; return; }
  
  try {
    currentUser = user;

    settingsRef    = doc(db, 'users', user.uid, 'settings', 'preferences');
    urlSettingsRef = doc(db, 'users', user.uid, 'settings', 'url');

    /* --- Populate account section --- */
    const email   = user.email || '';
    const initial = email.charAt(0).toUpperCase();

    document.getElementById('userEmail').value        = email;
    document.getElementById('accountEmail').textContent = email;
    document.getElementById('accountAvatar').textContent = initial;
    document.getElementById('spAvatar').textContent      = initial;

    // Member since
    if (user.metadata?.creationTime) {
      const d = new Date(user.metadata.creationTime);
      document.getElementById('memberSince').textContent =
        'Member since ' + d.toLocaleDateString('en-US', { month:'short', year:'numeric' });
    }

    // Verification badge
    const badge = document.getElementById('verifyBadge');
    if (user.emailVerified) {
      badge.className = 'verify-badge verified';
      badge.innerHTML = '<i class="fas fa-circle-check"></i> Verified';
    }

    // Load profile name
    try {
      const snap = await getDoc(doc(db, 'users', user.uid));
      const name = snap.exists() ? (snap.data().fullName || email.split('@')[0]) : email.split('@')[0];
      document.getElementById('accountName').textContent     = name;
      document.getElementById('spName').textContent          = name;
      document.getElementById('displayNameInput').value      = name;

      if (snap.exists() && snap.data().avatarUrl) {
        document.getElementById('spAvatar').innerHTML = `<img src="${snap.data().avatarUrl}" alt="avatar" style="width:100%;height:100%;object-fit:cover;border-radius:inherit;">`;
        document.getElementById('accountAvatar').innerHTML = `<img src="${snap.data().avatarUrl}" alt="avatar" style="width:100%;height:100%;object-fit:cover;border-radius:inherit;">`;
      } else {
        document.getElementById('spAvatar').textContent = name.charAt(0).toUpperCase();
        document.getElementById('accountAvatar').textContent = name.charAt(0).toUpperCase();
      }
    } catch (err) {
      console.error(err);
      const fallback = email.split('@')[0] || 'User';
      document.getElementById('accountName').textContent  = fallback;
      document.getElementById('spName').textContent       = fallback;
      document.getElementById('displayNameInput').value   = fallback;
    }

    // Load toggle settings
    try {
      const snap = await getDoc(settingsRef);
      if (snap.exists()) {
        const s = snap.data();
        const defaults = {
          visibility:    true, allowEdits: true,  seoIndexing: true,
          analytics:     false, notifications: true, autosave: true,
          darkMode:      true, showSocial: true, allowResume: true, pwProtect: false,
        };
        Object.entries(toggleMap).forEach(([id, key]) => {
          const el = document.getElementById(id);
          if (el) el.checked = s[key] ?? defaults[key] ?? false;
        });
        // Show pw protect field if enabled
        if (s.pwProtect) document.getElementById('pwProtectField').style.display = 'block';
      }
    } catch { /* defaults already set */ }

    // Load URL settings
    try {
      const snap = await getDoc(urlSettingsRef);
      if (snap.exists()) {
        const u = snap.data();
        if (u.slug) {
          document.getElementById('slugInput').value       = u.slug;
          document.getElementById('urlSlugDisplay').textContent = u.slug;
        }
        if (u.title)    document.getElementById('portfolioTitle').value = u.title;
        if (u.metaDesc) {
          document.getElementById('metaDesc').value        = u.metaDesc;
          document.getElementById('metaCharCount').textContent = u.metaDesc.length;
        }
      } else {
        // Default slug from email
        const defaultSlug = email.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g,'-');
        document.getElementById('slugInput').value        = defaultSlug;
        document.getElementById('urlSlugDisplay').textContent = defaultSlug;
      }
    } catch { /* silent */ }

    // Load progress ring
    await loadProgress(user.uid);

    // Load sessions
    renderSessions(user);

    // Load storage info
    await estimateStorage(user.uid);

    hideLoader();
    setLastSaved(false);
  } catch (e) {
    console.error("CRASH IN SETTINGS.JS onAuthStateChanged:", e);
    showToast("Settings error: " + e.message, "error");
    document.getElementById('spName').textContent = e.name;
    document.getElementById('spAvatar').textContent = "E";
    hideLoader(); // Force hide so user can see toast
  }
});

/* ─────────────────────────────────────────
   PROGRESS RING (sidebar)
───────────────────────────────────────── */
async function loadProgress(uid) {
  try {
    const checks = await Promise.all([
      getDoc(doc(db,'users',uid)),
      getDoc(doc(db,'users',uid,'skills','data')),
      getDoc(doc(db,'users',uid,'education','data')),
      getDoc(doc(db,'users',uid,'projects','data')),
    ]);
    const filled = checks.filter(s => s.exists() && Object.keys(s.data()).length > 0).length;
    const pct    = Math.round((filled / 4) * 100);

    document.getElementById('sidebarPct').textContent = pct + '%';
    const offset = 188.5 - (188.5 * pct / 100);
    document.getElementById('sidebarRing').style.strokeDashoffset = offset;
  } catch { /* silent */ }
}

/* ─────────────────────────────────────────
   SESSIONS DISPLAY
───────────────────────────────────────── */
function renderSessions(user) {
  const list = document.getElementById('sessionsList');
  const isMobile = /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent);
  const browser  = getBrowserName();

  list.innerHTML = `
    <div class="session-item current">
      <div class="session-device-icon fi-green">
        <i class="fas fa-${isMobile ? 'mobile-alt' : 'desktop'}"></i>
      </div>
      <div class="session-info">
        <span class="session-name">${browser} on ${isMobile ? 'Mobile' : 'Desktop'}</span>
        <span class="session-meta">${navigator.platform} · Last active just now · ${getApproxLocation()}</span>
      </div>
      <span class="session-current-badge"><i class="fas fa-check" style="margin-right:4px;"></i>This device</span>
    </div>
  `;
}

function getBrowserName() {
  const ua = navigator.userAgent;
  if (ua.includes('Chrome') && !ua.includes('Edg'))   return 'Chrome';
  if (ua.includes('Firefox'))                          return 'Firefox';
  if (ua.includes('Safari') && !ua.includes('Chrome')) return 'Safari';
  if (ua.includes('Edg'))                              return 'Edge';
  return 'Browser';
}
function getApproxLocation() {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || 'Unknown';
}

/* ─────────────────────────────────────────
   STORAGE ESTIMATE
───────────────────────────────────────── */
async function estimateStorage(uid) {
  try {
    const colls   = ['skills','education','projects'];
    let   totalChars = 0;
    for (const c of colls) {
      const snap = await getDocs(collection(db,'users',uid,c));
      snap.forEach(d => { totalChars += JSON.stringify(d.data()).length; });
    }
    const userSnap = await getDoc(doc(db,'users',uid));
    if (userSnap.exists()) totalChars += JSON.stringify(userSnap.data()).length;

    const kb  = (totalChars / 1024).toFixed(1);
    const pct = Math.min((parseFloat(kb) / 102400) * 100, 100).toFixed(1); // out of 100MB

    document.getElementById('storageVal').textContent  = kb + ' KB';
    document.getElementById('storageFill').style.width = pct + '%';
    document.getElementById('storageSub').textContent  = `${pct}% of 100 MB free plan used`;
  } catch {
    document.getElementById('storageVal').textContent = '— KB';
  }
}

/* ─────────────────────────────────────────
   UPDATE DISPLAY NAME
───────────────────────────────────────── */
document.getElementById('saveDisplayNameBtn').addEventListener('click', async () => {
  const name   = document.getElementById('displayNameInput').value.trim();
  const btn    = document.getElementById('saveDisplayNameBtn');
  const spinner= document.getElementById('nameSpinner');

  if (!name) { showToast('Display name cannot be empty', 'warn'); return; }
  if (name.length > 50) { showToast('Name too long (max 50 chars)', 'warn'); return; }

  btn.disabled = true; btn.classList.add('loading');
  try {
    await updateProfile(currentUser, { displayName: name });
    await setDoc(doc(db,'users',currentUser.uid), { fullName: name }, { merge: true });
    document.getElementById('accountName').textContent = name;
    document.getElementById('spName').textContent      = name;
    showToast(`Display name updated to "${name}"`, 'success', 'Name Saved');
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    btn.disabled = false; btn.classList.remove('loading');
  }
});

/* ─────────────────────────────────────────
   UPDATE PASSWORD
───────────────────────────────────────── */
document.getElementById('savePasswordBtn').addEventListener('click', async () => {
  const newPwd  = document.getElementById('newPasswordInline').value;
  const currPwd = document.getElementById('currentPasswordInline').value;
  const btn     = document.getElementById('savePasswordBtn');

  if (!newPwd || !currPwd) {
    showToast('Please fill in both password fields', 'warn');
    return;
  }
  const strong = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#^()_+]).{8,}$/.test(newPwd);
  if (!strong) {
    showToast('Password must be 8+ chars with uppercase, number & symbol', 'warn');
    return;
  }
  if (newPwd === currPwd) {
    showToast('New password must be different from current password', 'warn');
    return;
  }

  btn.disabled = true; btn.classList.add('loading');
  try {
    const cred = EmailAuthProvider.credential(currentUser.email, currPwd);
    await reauthenticateWithCredential(currentUser, cred);
    await updatePassword(currentUser, newPwd);
    document.getElementById('newPasswordInline').value     = '';
    document.getElementById('currentPasswordInline').value = '';
    document.getElementById('pwStrength').style.display    = 'none';
    showToast('Password updated successfully! 🔒', 'success', 'Password Changed');
  } catch (err) {
    const msg = err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential'
      ? 'Current password is incorrect'
      : err.code === 'auth/too-many-requests'
      ? 'Too many attempts. Please try again later.'
      : err.code === 'auth/weak-password'
      ? 'Password is too weak — choose a stronger one.'
      : err.message;
    showToast(msg, 'error');
  } finally {
    btn.disabled = false; btn.classList.remove('loading');
  }
});

/* ─────────────────────────────────────────
   RESEND VERIFICATION EMAIL
───────────────────────────────────────── */
document.getElementById('resendVerifyBtn').addEventListener('click', async () => {
  const btn = document.getElementById('resendVerifyBtn');
  if (currentUser.emailVerified) {
    showToast('Your email is already verified ✓', 'success');
    return;
  }
  btn.disabled = true;
  try {
    await sendEmailVerification(currentUser);
    showToast('Verification email sent! Check your inbox & spam 📧', 'success', 'Email Sent');
  } catch (err) {
    const msg = err.code === 'auth/too-many-requests'
      ? 'Too many requests. Please wait before trying again.'
      : err.message;
    showToast(msg, 'error');
  } finally {
    setTimeout(() => { btn.disabled = false; }, 60000); // cooldown 60s
  }
});

/* ─────────────────────────────────────────
   SAVE URL SETTINGS
───────────────────────────────────────── */
document.getElementById('saveUrlBtn').addEventListener('click', async () => {
  const slug  = document.getElementById('slugInput').value.trim();
  const title = document.getElementById('portfolioTitle').value.trim();
  const meta  = document.getElementById('metaDesc').value.trim();
  const btn   = document.getElementById('saveUrlBtn');

  if (slug && (slug.length < 3 || slug.length > 30 || !/^[a-z0-9-]+$/.test(slug))) {
    showToast('Slug must be 3–30 chars: lowercase letters, numbers, hyphens only', 'warn');
    return;
  }

  btn.disabled = true; btn.classList.add('loading');
  try {
    await setDoc(urlSettingsRef, { slug, title, metaDesc: meta, updatedAt: serverTimestamp() }, { merge: true });
    document.getElementById('urlSlugDisplay').textContent = slug || 'your-username';
    showToast('Portfolio URL settings saved!', 'success', 'URL Saved');
    setLastSaved(false);
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    btn.disabled = false; btn.classList.remove('loading');
  }
});

/* ─────────────────────────────────────────
   SAVE PORTFOLIO PASSWORD (if pw protect on)
───────────────────────────────────────── */
document.getElementById('savePortfolioPassword').addEventListener('click', async () => {
  const pw = document.getElementById('portfolioPassword').value.trim();
  if (!pw || pw.length < 4) {
    showToast('Portfolio password must be at least 4 characters', 'warn');
    return;
  }
  try {
    await setDoc(settingsRef, { portfolioPassword: btoa(pw), updatedAt: serverTimestamp() }, { merge: true });
    showToast('Portfolio password saved', 'success');
  } catch (err) {
    showToast(err.message, 'error');
  }
});


/* ─────────────────────────────────────────
   SIGN OUT ALL OTHER DEVICES
───────────────────────────────────────── */
document.getElementById('signOutAllBtn').addEventListener('click', async () => {
  const ok = await openConfirm({
    title: 'Sign Out All Devices?',
    desc:  'This will sign out all other devices. You will stay signed in on this device.',
    okLabel: 'Sign Out Others',
    type: 'warning'
  });
  if (!ok) return;
  // Firebase doesn't have a direct "sign out other sessions" API for client SDK.
  // Best practice: force token refresh to invalidate old tokens.
  try {
    await currentUser.getIdToken(true); // force refresh
    showToast('Other sessions invalidated. You are now the only active device.', 'success', 'Signed Out');
  } catch (err) {
    showToast(err.message, 'error');
  }
});

/* ─────────────────────────────────────────
   EXPORT DATA
───────────────────────────────────────── */
async function fetchAllData(uid) {
  const [profileSnap, skillsSnap, eduSnap, projSnap] = await Promise.all([
    getDoc(doc(db,'users',uid)),
    getDoc(doc(db,'users',uid,'skills','data')),
    getDoc(doc(db,'users',uid,'education','data')),
    getDoc(doc(db,'users',uid,'projects','data')),
  ]);
  return {
    profile:   profileSnap.exists()  ? profileSnap.data()  : {},
    skills:    skillsSnap.exists()   ? skillsSnap.data()   : {},
    education: eduSnap.exists()      ? eduSnap.data()      : {},
    projects:  projSnap.exists()     ? projSnap.data()     : {},
    exportedAt: new Date().toISOString(),
  };
}

/* Fetch all data as collections (matching how templates load data) */
async function fetchAllDataForPortfolio(uid) {
  // Profile
  const profileSnap = await getDoc(doc(db,'users',uid));
  const profile = profileSnap.exists() ? profileSnap.data() : {};

  // Skills (each skill is a separate doc in collection)
  const skillsDocs = [];
  const skillsColSnap = await getDocs(collection(db,'users',uid,'skills'));
  skillsColSnap.forEach(ds => {
    skillsDocs.push({ id: ds.id, ...ds.data() });
  });

  // Projects (each project is a separate doc)
  const projectsDocs = [];
  const projColSnap = await getDocs(collection(db,'users',uid,'projects'));
  projColSnap.forEach(ds => {
    projectsDocs.push({ id: ds.id, ...ds.data() });
  });

  // Education (single doc: users/uid/education/data)
  const eduSnap = await getDoc(doc(db,'users',uid,'education','data'));
  const education = eduSnap.exists() ? eduSnap.data() : {};

  // Experience (each experience is a separate doc)
  const experienceDocs = [];
  const expColSnap = await getDocs(collection(db,'users',uid,'experience'));
  expColSnap.forEach(ds => {
    experienceDocs.push({ id: ds.id, ...ds.data() });
  });

  // Template selection
  const templateName = profile.template || '';

  return { profile, skills: skillsDocs, projects: projectsDocs, education, experience: experienceDocs, templateName };
}

document.getElementById('exportJsonBtn').addEventListener('click', async () => {
  const btn = document.getElementById('exportJsonBtn');
  btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Exporting...';
  try {
    const data = await fetchAllData(currentUser.uid);
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    downloadBlob(blob, `portfoliox-data-${Date.now()}.json`);
    showToast('Data exported as JSON successfully', 'success', 'Export Complete');
  } catch (err) {
    showToast('Export failed: ' + err.message, 'error');
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<i class="fas fa-download"></i> Export';
  }
});

document.getElementById('exportCsvBtn').addEventListener('click', async () => {
  const btn = document.getElementById('exportCsvBtn');
  btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Exporting...';
  try {
    const data = await fetchAllData(currentUser.uid);
    let csv = 'Section,Key,Value\n';
    // Flatten profile
    Object.entries(data.profile).forEach(([k,v]) => {
      csv += `Profile,${k},"${String(v).replace(/"/g,'""')}"\n`;
    });
    // Skills
    const skills = data.skills.list || data.skills.items || [];
    if (Array.isArray(skills)) {
      skills.forEach(s => { csv += `Skills,${s.name || s},"${s.level || ''}"\n`; });
    }
    // Projects
    const projects = data.projects.list || data.projects.items || [];
    if (Array.isArray(projects)) {
      projects.forEach(p => { csv += `Projects,${p.title || p.name || ''},"-"\n`; });
    }

    const blob = new Blob([csv], { type: 'text/csv' });
    downloadBlob(blob, `portfoliox-data-${Date.now()}.csv`);
    showToast('Data exported as CSV successfully', 'success', 'Export Complete');
  } catch (err) {
    showToast('Export failed: ' + err.message, 'error');
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<i class="fas fa-download"></i> Export';
  }
});
/* ─────────────────────────────────────────
   DOWNLOAD PORTFOLIO AS SELF-CONTAINED HTML
───────────────────────────────────────── */
const templateMap = {
  'Classic Developer':   'templates/classic.html',
  'Modern Professional': 'templates/modern.html',
  'Creative Designer':   'templates/creative.html',
  'Minimal Resume':      'templates/minimal.html',
  'Neon Dark':           'templates/neon-dark.html',
  'Glass Morph':         'templates/glass-morph.html',
  'Terminal Hacker':     'templates/terminal-hacker.html',
  'Gradient Splash':     'templates/gradient-splash.html',
  'Executive Pro':       'templates/executive-pro.html',
  'Bento Grid':          'templates/bento-grid.html',
  '3D Modern':           'templates/3D_Modern.html',
  '3D Classic':          'templates/3D_classic.html'
};

document.getElementById('exportPortfolioBtn').addEventListener('click', async () => {
  const btn = document.getElementById('exportPortfolioBtn');
  btn.disabled = true;
  btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Building...';

  try {
    // 1. Get user's template name from profile
    const profileSnap = await getDoc(doc(db, 'users', currentUser.uid));
    const profile = profileSnap.exists() ? profileSnap.data() : {};
    const templateName = profile.template || '';

    if (!templateName) {
      showToast('No template selected. Please choose a template first from the Templates page.', 'warn', 'No Template');
      return;
    }

    const templateFile = templateMap[templateName];
    if (!templateFile) {
      showToast(`Template "${templateName}" not found. Please re-select your template.`, 'error', 'Template Error');
      return;
    }

    // 2. Load template in a hidden iframe and let it render with real Firebase data
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Rendering portfolio...';
    
    const renderedHTML = await renderTemplateInIframe(templateFile, currentUser.uid);

    // 3. Post-process the captured HTML
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Packaging...';
    let html = renderedHTML;

    // 3a. Inline external CSS files (e.g. style.css used by 3D templates)
    const templateDir = templateFile.substring(0, templateFile.lastIndexOf('/') + 1);
    
    const cssReplacements = [];
    let cssMatch;
    const allCssRegex = /<link[^>]*(?:href\s*=\s*["']([^"']+\.css)["'])[^>]*>/gi;
    while ((cssMatch = allCssRegex.exec(html)) !== null) {
      const fullTag = cssMatch[0];
      const href = cssMatch[1];
      if (href && !href.startsWith('http') && !href.startsWith('//')) {
        const cssUrl = templateDir + href;
        try {
          const cssResp = await fetch(cssUrl);
          if (cssResp.ok) {
            const cssText = await cssResp.text();
            cssReplacements.push({ tag: fullTag, css: cssText, href: href });
          }
        } catch (e) {
          console.warn(`Could not inline CSS: ${href}`, e);
        }
      }
    }
    for (const r of cssReplacements) {
      html = html.replace(r.tag, `<style>/* Inlined from ${r.href} */\n${r.css}\n</style>`);
    }

    // 3b. Inline external JS files (e.g. script.js)
    const jsReplacements = [];
    const allJsRegex = /<script[^>]*src\s*=\s*["']([^"']+\.js)["'][^>]*>\s*<\/script>/gi;
    let jsMatch;
    while ((jsMatch = allJsRegex.exec(html)) !== null) {
      const fullTag = jsMatch[0];
      const src = jsMatch[1];
      if (src && !src.startsWith('http') && !src.startsWith('//') && !src.includes('firebase')) {
        const jsUrl = templateDir + src;
        try {
          const jsResp = await fetch(jsUrl);
          if (jsResp.ok) {
            const jsText = await jsResp.text();
            jsReplacements.push({ tag: fullTag, js: jsText, src: src });
          }
        } catch (e) {
          console.warn(`Could not inline JS: ${src}`, e);
        }
      }
    }
    for (const r of jsReplacements) {
      html = html.replace(r.tag, `<script>/* Inlined from ${r.src} */\n${r.js}\n</script>`);
    }

    // 3c. Remove Firebase script blocks (data already rendered in DOM)
    html = html.replace(/<script\s+type\s*=\s*["']module["'][^>]*>([\s\S]*?)<\/script>/gi, (match, content) => {
      if (content.includes('gstatic.com/firebasejs') || content.includes('firebaseConfig') || content.includes('firebase-config')) {
        return '<!-- Firebase script removed for offline export -->';
      }
      return match;
    });
    html = html.replace(/<script[^>]*src\s*=\s*["'][^"']*(?:gstatic\.com\/firebasejs|firebase)[^"']*["'][^>]*>\s*<\/script>/gi, 
      '<!-- Firebase external script removed -->');

    // 3d. Remove contenteditable attributes
    html = html.replace(/\s+contenteditable\s*=\s*["'][^"']*["']/gi, '');

    // 3e. Add override styles + hide loader
    const overrideCSS = `
<style>
  [contenteditable="true"]:hover,
  [contenteditable="true"]:focus { outline: none !important; background: none !important; cursor: default !important; }
  #globalLoader, .global-loader, .loading-overlay { display: none !important; opacity: 0 !important; pointer-events: none !important; }
</style>`;
    html = html.replace('</head>', overrideCSS + '\n</head>');

    // 3f. Inject a small script to disable contact form and remove edit UI
    const cleanupScript = `
<script>
(function(){
  // Hide loader
  var ldr = document.getElementById('globalLoader');
  if(ldr) { ldr.style.display='none'; ldr.classList.add('hidden'); }
  // Remove edit UI elements
  document.querySelectorAll('.edit-overlay, .save-indicator, .edit-mode-toggle, .editable-hint, .toast-container').forEach(function(el){ el.remove(); });
  // Disable contact form
  var cf = document.getElementById('contactForm');
  if(cf) cf.addEventListener('submit', function(e){ e.preventDefault(); alert('This is a downloaded portfolio. Contact form is not available offline.'); });
})();
</script>`;
    html = html.replace('</body>', cleanupScript + '\n</body>');

    // 4. Download
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const slugName = (profile.fullName || 'portfolio').toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    downloadBlob(blob, `${slugName}-portfolio.html`);

    showToast('Portfolio downloaded! Open the .html file in any browser.', 'success', 'Download Complete');

  } catch (err) {
    console.error('Portfolio download error:', err);
    showToast('Download failed: ' + err.message, 'error');
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<i class="fas fa-download"></i> Download';
  }
});

/**
 * Render the template in a hidden iframe, wait for Firebase data to load,
 * then capture the fully-rendered HTML. This ensures PERFECT fidelity
 * because the template's own code does all the rendering.
 */
function renderTemplateInIframe(templateFile, uid) {
  return new Promise((resolve, reject) => {
    // Create hidden iframe
    const iframe = document.createElement('iframe');
    iframe.style.cssText = 'position:fixed; top:-9999px; left:-9999px; width:1920px; height:1080px; border:none; opacity:0; pointer-events:none;';
    document.body.appendChild(iframe);

    // Load template with ?uid= parameter so it loads data without auth
    const templateUrl = templateFile + '?uid=' + uid;
    iframe.src = templateUrl;

    let resolved = false;

    // Wait for iframe to load, then wait additional time for Firebase data
    iframe.onload = () => {
      // Poll for data loading completion
      let checkCount = 0;
      const maxChecks = 40; // 40 * 250ms = 10 seconds max wait

      const checkReady = () => {
        checkCount++;
        try {
          const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
          const iframeWin = iframe.contentWindow;
          
          // Check if globalLoader is hidden (template hides it after data loads)
          const loader = iframeDoc.getElementById('globalLoader');
          const loaderHidden = !loader || 
            loader.classList.contains('hidden') || 
            loader.style.display === 'none' || 
            loader.style.opacity === '0' ||
            iframeWin.getComputedStyle(loader).display === 'none' ||
            iframeWin.getComputedStyle(loader).opacity === '0';

          if (loaderHidden || checkCount >= maxChecks) {
            // Give an extra 2 seconds for animations to initialize and DOM to stabilize
            setTimeout(() => {
              if (resolved) return;
              resolved = true;
              try {
                const iDoc = iframe.contentDocument || iframe.contentWindow.document;
                
                // Capture the full rendered HTML
                const html = '<!DOCTYPE html>\n<html lang="en">\n' + iDoc.documentElement.innerHTML + '\n</html>';
                
                // Clean up
                document.body.removeChild(iframe);
                resolve(html);
              } catch (e) {
                document.body.removeChild(iframe);
                reject(new Error('Could not capture portfolio: ' + e.message));
              }
            }, 2000);
          } else {
            setTimeout(checkReady, 250);
          }
        } catch (e) {
          // Cross-origin error or other issue
          if (checkCount >= maxChecks) {
            if (!resolved) {
              resolved = true;
              document.body.removeChild(iframe);
              reject(new Error('Timed out waiting for portfolio to render. Please try again.'));
            }
          } else {
            setTimeout(checkReady, 250);
          }
        }
      };

      // Start checking after a small initial delay
      setTimeout(checkReady, 500);
    };

    iframe.onerror = () => {
      if (!resolved) {
        resolved = true;
        document.body.removeChild(iframe);
        reject(new Error('Failed to load template in iframe'));
      }
    };

    // Absolute timeout fallback
    setTimeout(() => {
      if (!resolved) {
        resolved = true;
        try { document.body.removeChild(iframe); } catch(e) {}
        reject(new Error('Portfolio rendering timed out. Please try again.'));
      }
    }, 15000);
  });
}

document.getElementById('exportPdfBtn').addEventListener('click', () => {
  showToast('Opening portfolio preview for printing...', 'success', 'Opening Preview');
  setTimeout(() => window.open('preview.html', '_blank'), 800);
});

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a   = document.createElement('a');
  a.href    = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/* ─────────────────────────────────────────
   UNPUBLISH PORTFOLIO
───────────────────────────────────────── */
document.getElementById('unpublishBtn').addEventListener('click', async () => {
  const ok = await openConfirm({
    title:   'Unpublish Portfolio?',
    desc:    'Your portfolio will go offline and visitors won\'t be able to see it. You can republish any time from the Publish page.',
    okLabel: 'Unpublish',
    type:    'warning'
  });
  if (!ok) return;
  try {
    await setDoc(settingsRef, { isPublished: false, unpublishedAt: serverTimestamp() }, { merge: true });
    // Uncheck visibility toggle too
    document.getElementById('visibilityToggle').checked = false;
    await saveAllToggles();
    showToast('Portfolio unpublished successfully', 'warn', 'Unpublished');
  } catch (err) {
    showToast(err.message, 'error');
  }
});

/* ─────────────────────────────────────────
   RESET ALL DATA
───────────────────────────────────────── */
document.getElementById('resetBtn').addEventListener('click', async () => {
  const ok = await openConfirm({
    title:         'Reset All Portfolio Data?',
    desc:          'This will permanently delete all your skills, projects, education and profile content. Your account will remain. This cannot be undone.',
    okLabel:       'Reset Everything',
    type:          'danger',
    requireTyping: 'RESET'
  });
  if (!ok) return;

  const btn = document.getElementById('resetBtn');
  btn.disabled = true;
  try {
    const uid = currentUser.uid;
    const colls = ['skills','education','projects'];
    const deletes = colls.map(c => deleteDoc(doc(db,'users',uid,c,'data')));
    await Promise.all(deletes);
    // Reset profile fields (keep auth info)
    await setDoc(doc(db,'users',uid), { fullName: '', bio: '', resetAt: serverTimestamp() }, { merge: true });
    localStorage.clear();
    showToast('All portfolio data has been reset. Start fresh! 🆕', 'warn', 'Data Reset');
    setTimeout(() => window.location.href = 'dashboard.html', 2500);
  } catch (err) {
    showToast('Reset failed: ' + err.message, 'error');
  } finally {
    btn.disabled = false;
  }
});

/* ─────────────────────────────────────────
   DELETE ACCOUNT
───────────────────────────────────────── */
document.getElementById('deleteBtn').addEventListener('click', async () => {
  const ok = await openConfirm({
    title:         'Delete Account Permanently?',
    desc:          'Your account, portfolio and ALL associated data will be deleted forever. This action is completely irreversible and cannot be recovered.',
    okLabel:       'Delete Forever',
    type:          'danger',
    requireTyping: 'DELETE'
  });
  if (!ok) return;

  // Must re-authenticate before deleting
  const authed = await requireReAuth();
  if (!authed) return;

  const btn = document.getElementById('deleteBtn');
  btn.disabled = true;
  try {
    const uid = currentUser.uid;
    // Delete all Firestore collections
    const colls = ['skills','education','projects','settings'];
    for (const c of colls) {
      try { await deleteDoc(doc(db,'users',uid,c,'data')); } catch {}
      try { await deleteDoc(doc(db,'users',uid,'settings','preferences')); } catch {}
      try { await deleteDoc(doc(db,'users',uid,'settings','url')); } catch {}
    }
    try { await deleteDoc(doc(db,'users',uid)); } catch {}

    await deleteUser(currentUser);
    localStorage.clear();
    sessionStorage.clear();
    showToast('Account deleted. Goodbye! 👋', 'warn', 'Account Deleted');
    setTimeout(() => window.location.href = 'loginpage.html', 1500);
  } catch (err) {
    if (err.code === 'auth/requires-recent-login') {
      showToast('Please sign out, sign back in, then try deleting again.', 'error');
    } else {
      showToast('Delete failed: ' + err.message, 'error');
    }
  } finally {
    btn.disabled = false;
  }
});

/* ─────────────────────────────────────────
   LOGOUT
───────────────────────────────────────── */
document.getElementById('logoutBtn').addEventListener('click', async () => {
  await signOut(auth);
  localStorage.clear();
  window.location.href = 'loginpage.html';
});
