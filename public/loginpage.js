import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
  import {
    getAuth, setPersistence, browserLocalPersistence,
    signInWithEmailAndPassword, GoogleAuthProvider,
    signInWithPopup, sendPasswordResetEmail, onAuthStateChanged
  } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
  import { firebaseConfig } from "./firebase-config.js";

  const app  = initializeApp(firebaseConfig);
  const auth = getAuth(app);
  await setPersistence(auth, browserLocalPersistence);

  /* ── Particles ── */
  const pWrap = document.getElementById('particles');
  for (let i = 0; i < 18; i++) {
    const p = document.createElement('div');
    p.className = 'particle';
    const size = Math.random() * 3 + 1.5;
    p.style.cssText = `
      width:${size}px; height:${size}px;
      left:${Math.random()*100}%;
      top:${Math.random()*100}%;
      --dur:${6 + Math.random()*8}s;
      --delay:${Math.random()*8}s;
      opacity:${Math.random()*0.4};
    `;
    pWrap.appendChild(p);
  }

  /* ── Toast ── */
  function showToast(msg, type = 'success') {
    const t = document.getElementById('toast');
    document.getElementById('toastMsg').textContent = msg;
    document.getElementById('toastIcon').className  =
      type === 'success' ? 'fas fa-check-circle'
      : type === 'error' ? 'fas fa-times-circle'
      :                    'fas fa-triangle-exclamation';
    t.className = `toast ${type}`;
    t.classList.add('show');
    setTimeout(() => t.classList.remove('show'), 3500);
  }

  /* ── Alert banner ── */
  function showAlert(msg, type = 'warn') {
    const b = document.getElementById('alertBanner');
    document.getElementById('alertMsg').textContent = msg;
    b.className = `alert-banner ${type} show`;
  }
  function hideAlert() {
    document.getElementById('alertBanner').classList.remove('show');
  }

  /* ── Password toggle ── */
  const pwInput  = document.getElementById('password');
  const pwToggle = document.getElementById('pwToggle');
  pwToggle.addEventListener('click', () => {
    pwInput.type = pwInput.type === 'password' ? 'text' : 'password';
    pwToggle.querySelector('i').className = pwInput.type === 'password' ? 'fas fa-eye' : 'fas fa-eye-slash';
  });

  /* ── Auto login ── */
  onAuthStateChanged(auth, user => {
    if (user && user.emailVerified) window.location.replace('dashboard.html');
  });

  /* ── Error message humanizer ── */
  function friendlyError(code) {
    const map = {
      'auth/user-not-found':      'No account found with this email.',
      'auth/wrong-password':      'Incorrect password. Please try again.',
      'auth/invalid-email':       'Please enter a valid email address.',
      'auth/too-many-requests':   'Too many attempts. Please wait a moment.',
      'auth/user-disabled':       'This account has been disabled.',
      'auth/network-request-failed': 'Network error. Check your connection.',
      'auth/invalid-credential':  'Invalid email or password.',
    };
    return map[code] || 'Something went wrong. Please try again.';
  }

  /* ── Email login ── */
  document.getElementById('loginForm').addEventListener('submit', async e => {
    e.preventDefault();
    hideAlert();

    const email = document.getElementById('email').value.trim();
    const pwd   = document.getElementById('password').value;
    const btn   = document.getElementById('loginBtn');

    if (!email || !pwd) {
      showAlert('Please fill in both fields.', 'warn');
      return;
    }

    btn.classList.add('loading'); btn.disabled = true;
    try {
      const cred = await signInWithEmailAndPassword(auth, email, pwd);
      if (!cred.user.emailVerified) {
        showAlert('Your email is not verified. Please check your Inbox, Spam, or Promotions folder.', 'warn');
        btn.classList.remove('loading'); btn.disabled = false;
        return;
      }
      showToast('Signing you in…');
      setTimeout(() => window.location.replace('dashboard.html'), 800);
    } catch (err) {
      showAlert(friendlyError(err.code), 'error');
      document.getElementById('password').classList.add('error');
      setTimeout(() => document.getElementById('password').classList.remove('error'), 2500);
      btn.classList.remove('loading'); btn.disabled = false;
    }
  });

  /* Clear error state on typing */
  document.getElementById('password').addEventListener('input', () => {
    document.getElementById('password').classList.remove('error');
    hideAlert();
  });
  document.getElementById('email').addEventListener('input', hideAlert);

  /* ── Forgot password ── */
  document.getElementById('forgotPassword').addEventListener('click', async e => {
    e.preventDefault();
    const email = document.getElementById('email').value.trim();
    if (!email) {
      showAlert('Enter your email above first, then click Forgot Password.', 'warn');
      document.getElementById('email').focus();
      return;
    }
    try {
      await sendPasswordResetEmail(auth, email);
      showToast('Reset email sent! Check your inbox & spam.', 'success');
    } catch (err) {
      showAlert(friendlyError(err.code), 'error');
    }
  });

  /* ── Google login ── */
  document.getElementById('googleBtn').addEventListener('click', async () => {
    const btn = document.getElementById('googleBtn');
    btn.classList.add('loading'); btn.disabled = true;
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
      showToast('Signed in with Google!');
      setTimeout(() => window.location.replace('dashboard.html'), 700);
    } catch (err) {
      if (err.code !== 'auth/popup-closed-by-user') {
        showAlert(friendlyError(err.code), 'error');
      }
      btn.classList.remove('loading'); btn.disabled = false;
    }
  });