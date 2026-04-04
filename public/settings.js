import { initializeApp }   from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
  import {
    getAuth, onAuthStateChanged, signOut,
    EmailAuthProvider, reauthenticateWithCredential,
    updatePassword, sendEmailVerification, deleteUser
  } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
  import {
    getFirestore, doc, getDoc, setDoc, serverTimestamp
  } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

  const firebaseConfig = {
    apiKey: "AIzaSyD4q_KzBCxVtS6mjH6Xh6-Bd1u-21RSNG4",
    authDomain: "portfoliox-2e787.firebaseapp.com",
    projectId: "portfoliox-2e787",
    storageBucket: "portfoliox-2e787.firebasestorage.app",
    messagingSenderId: "562709786891",
    appId: "1:562709786891:web:2d0f575ab7d3bda5fdf20e"
  };
  const app  = initializeApp(firebaseConfig);
  const auth = getAuth(app);
  const db   = getFirestore(app);

  /* ── Toast ── */
  function showToast(msg, type = 'success') {
    const t    = document.getElementById('toast');
    const icon = document.getElementById('toastIcon');
    document.getElementById('toastMsg').textContent = msg;
    t.className = `toast ${type}`;
    icon.className = type === 'success' ? 'fas fa-check-circle'
                   : type === 'error'   ? 'fas fa-times-circle'
                   :                      'fas fa-triangle-exclamation';
    t.classList.add('show');
    setTimeout(() => t.classList.remove('show'), 3400);
  }

  /* ── Password strength ── */
  const pwInput   = document.getElementById('newPasswordInline');
  const pwStrBox  = document.getElementById('pwStrength');
  const pwBarFill = document.getElementById('pwBarFill');
  const pwHint    = document.getElementById('pwHint');

  const checks_pw = [
    { re: /.{8,}/,           label: '8+ chars' },
    { re: /[A-Z]/,           label: 'Uppercase' },
    { re: /[a-z]/,           label: 'Lowercase' },
    { re: /[0-9]/,           label: 'Number' },
    { re: /[@$!%*?&#^()_+]/, label: 'Symbol' },
  ];

  pwInput.addEventListener('input', () => {
    const val = pwInput.value;
    if (!val) { pwStrBox.style.display = 'none'; return; }
    pwStrBox.style.display = 'block';
    const met   = checks_pw.filter(c => c.re.test(val)).length;
    const pct   = (met / checks_pw.length) * 100;
    const colors = ['#ef4444','#f97316','#f59e0b','#84cc16','#22c55e'];
    const labels = ['Very Weak','Weak','Fair','Strong','Very Strong'];
    pwBarFill.style.width      = pct + '%';
    pwBarFill.style.background = colors[met - 1] || '#ef4444';
    pwHint.textContent         = labels[met - 1] || '';
    pwHint.style.color         = colors[met - 1] || '#ef4444';
  });

  /* Password visibility toggles */
  function bindPwToggle(btnId, inputId) {
    document.getElementById(btnId).addEventListener('click', () => {
      const inp = document.getElementById(inputId);
      const btn = document.getElementById(btnId);
      inp.type = inp.type === 'password' ? 'text' : 'password';
      btn.querySelector('i').className = inp.type === 'password' ? 'fas fa-eye' : 'fas fa-eye-slash';
    });
  }
  bindPwToggle('pwToggleInline',  'newPasswordInline');
  bindPwToggle('pwToggleCurrent', 'currentPasswordInline');

  /* ── Confirm modal ── */
  let confirmResolve = null;
  function openConfirm({ title, desc, okLabel = 'Confirm', type = 'danger' }) {
    return new Promise(resolve => {
      confirmResolve = resolve;
      document.getElementById('confirmTitle').textContent  = title;
      document.getElementById('confirmDesc').textContent   = desc;
      document.getElementById('confirmOkLabel').textContent = okLabel;
      const icon  = document.getElementById('confirmIcon');
      const iconI = document.getElementById('confirmIconI');
      const okBtn = document.getElementById('confirmOk');
      icon.className  = `confirm-icon ${type === 'warning' ? 'orange' : 'red'}`;
      iconI.className = type === 'warning' ? 'fas fa-eye-slash' : 'fas fa-triangle-exclamation';
      okBtn.className = `btn ${type === 'warning' ? 'btn-warning' : 'btn-danger'}`;
      okBtn.style.flex = '1'; okBtn.style.justifyContent = 'center';
      document.getElementById('confirmModal').classList.add('open');
    });
  }
  document.getElementById('confirmCancel').addEventListener('click', () => {
    document.getElementById('confirmModal').classList.remove('open');
    if (confirmResolve) { confirmResolve(false); confirmResolve = null; }
  });
  document.getElementById('confirmOk').addEventListener('click', () => {
    document.getElementById('confirmModal').classList.remove('open');
    if (confirmResolve) { confirmResolve(true); confirmResolve = null; }
  });
  document.getElementById('confirmModal').addEventListener('click', e => {
    if (e.target === document.getElementById('confirmModal')) {
      document.getElementById('confirmModal').classList.remove('open');
      if (confirmResolve) { confirmResolve(false); confirmResolve = null; }
    }
  });

  /* ── Theme toggle ── */
  function applyTheme(isDark) {
    document.body.classList.toggle('light-mode', !isDark);
  }

  /* ── Save settings helper ── */
  let settingsRef;
  const toggleIds = ['visibilityToggle','editToggle','seoToggle','analyticsToggle',
                     'notifyToggle','autosaveToggle','darkToggle','socialToggle'];

  async function saveSettings() {
    if (!settingsRef) return;
    const data = {
      visibility:   document.getElementById('visibilityToggle').checked,
      allowEdits:   document.getElementById('editToggle').checked,
      seoIndexing:  document.getElementById('seoToggle').checked,
      analytics:    document.getElementById('analyticsToggle').checked,
      notifications:document.getElementById('notifyToggle').checked,
      autosave:     document.getElementById('autosaveToggle').checked,
      darkMode:     document.getElementById('darkToggle').checked,
      showSocial:   document.getElementById('socialToggle').checked,
      updatedAt:    serverTimestamp()
    };
    try {
      await setDoc(settingsRef, data);
      showToast('Settings saved automatically ✓');
    } catch { showToast('Failed to save settings', 'error'); }
  }

  toggleIds.forEach(id => {
    document.getElementById(id)?.addEventListener('change', (e) => {
      if (id === 'darkToggle') {
        applyTheme(e.target.checked);
      }
      saveSettings();
    });
  });

  /* ── Auth ── */
  onAuthStateChanged(auth, async user => {
    if (!user) { window.location.href = 'loginpage.html'; return; }

    settingsRef = doc(db, 'users', user.uid, 'settings', 'preferences');

    /* Populate account section */
    document.getElementById('userEmail').value    = user.email;
    document.getElementById('accountEmail').textContent = user.email;

    const initial = user.email.charAt(0).toUpperCase();
    document.getElementById('accountAvatar').textContent = initial;

    /* Name from profile */
    try {
      const profileSnap = await getDoc(doc(db, 'users', user.uid));
      if (profileSnap.exists()) {
        document.getElementById('accountName').textContent = profileSnap.data().fullName || user.email.split('@')[0];
      } else {
        document.getElementById('accountName').textContent = user.email.split('@')[0];
      }
    } catch { document.getElementById('accountName').textContent = user.email.split('@')[0]; }

    /* Email verification badge */
    const badge = document.getElementById('verifyBadge');
    if (user.emailVerified) {
      badge.className = 'verify-badge verified';
      badge.innerHTML = '<i class="fas fa-circle-check"></i> Verified';
    }

    /* Load settings */
    try {
      const snap = await getDoc(settingsRef);
      if (snap.exists()) {
        const s = snap.data();
        document.getElementById('visibilityToggle').checked  = s.visibility    ?? true;
        document.getElementById('editToggle').checked        = s.allowEdits    ?? true;
        document.getElementById('seoToggle').checked         = s.seoIndexing   ?? true;
        document.getElementById('analyticsToggle').checked   = s.analytics     ?? false;
        document.getElementById('notifyToggle').checked      = s.notifications ?? true;
        document.getElementById('autosaveToggle').checked    = s.autosave      ?? true;
        document.getElementById('darkToggle').checked        = s.darkMode      ?? true;
        document.getElementById('socialToggle').checked      = s.showSocial    ?? true;
        applyTheme(s.darkMode ?? true);
      } else {
        applyTheme(true); // default dark
      }
    } catch {
      applyTheme(true);
    }
  });

  /* ── Update Password ── */
  document.getElementById('savePasswordBtn').addEventListener('click', async () => {
    const user    = auth.currentUser;
    const newPwd  = document.getElementById('newPasswordInline').value.trim();
    const currPwd = document.getElementById('currentPasswordInline').value.trim();
    const btn     = document.getElementById('savePasswordBtn');

    if (!newPwd || !currPwd) { showToast('Please fill in both password fields', 'warn'); return; }

    const strong = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#^()_+]).{8,}$/.test(newPwd);
    if (!strong) { showToast('New password is too weak — must have 8+ chars, uppercase, number & symbol', 'warn'); return; }

    btn.classList.add('loading'); btn.disabled = true;
    try {
      const cred = EmailAuthProvider.credential(user.email, currPwd);
      await reauthenticateWithCredential(user, cred);
      await updatePassword(user, newPwd);
      document.getElementById('newPasswordInline').value     = '';
      document.getElementById('currentPasswordInline').value = '';
      document.getElementById('pwStrength').style.display    = 'none';
      showToast('Password updated successfully ✅');
    } catch (err) {
      const msg = err.code === 'auth/wrong-password' ? 'Current password is incorrect'
                : err.code === 'auth/too-many-requests' ? 'Too many attempts. Please try later.'
                : err.message;
      showToast(msg, 'error');
    } finally {
      btn.classList.remove('loading'); btn.disabled = false;
    }
  });

  /* ── Resend Verification ── */
  document.getElementById('resendVerifyBtn').addEventListener('click', async () => {
    const user = auth.currentUser;
    if (user.emailVerified) { showToast('Your email is already verified ✓'); return; }
    try {
      await sendEmailVerification(user);
      showToast('Verification email sent! Check Spam too 📧');
    } catch (err) {
      showToast(err.message, 'error');
    }
  });

  /* ── Unpublish ── */
  document.getElementById('unpublishBtn').addEventListener('click', async () => {
    const ok = await openConfirm({
      title: 'Unpublish Portfolio?',
      desc:  'Your portfolio will go offline. You can republish any time from the Publish page.',
      okLabel: 'Unpublish',
      type: 'warning'
    });
    if (!ok) return;
    localStorage.removeItem('portfolioStatus');
    showToast('Portfolio unpublished successfully', 'warn');
  });

  /* ── Reset All Data ── */
  document.getElementById('resetBtn').addEventListener('click', async () => {
    const ok = await openConfirm({
      title: 'Reset All Portfolio Data?',
      desc:  'This will permanently clear all your skills, projects, education and profile data. This cannot be undone.',
      okLabel: 'Reset Everything'
    });
    if (!ok) return;
    localStorage.clear();
    showToast('All portfolio data has been reset', 'warn');
  });

  /* ── Delete Account ── */
  document.getElementById('deleteBtn').addEventListener('click', async () => {
    const ok = await openConfirm({
      title: 'Delete Account Permanently?',
      desc:  'Your account, portfolio and all associated data will be deleted forever. This action is irreversible.',
      okLabel: 'Delete Forever'
    });
    if (!ok) return;
    const user = auth.currentUser;
    try {
      await deleteUser(user);
      localStorage.clear();
      window.location.href = 'loginpage.html';
    } catch (err) {
      if (err.code === 'auth/requires-recent-login') {
        showToast('Please log out and log back in, then try again.', 'error');
      } else {
        showToast(err.message, 'error');
      }
    }
  });

  /* ── Logout ── */
  document.getElementById('logoutBtn').addEventListener('click', async () => {
    await signOut(auth);
    localStorage.clear();
    window.location.href = 'loginpage.html';
  });