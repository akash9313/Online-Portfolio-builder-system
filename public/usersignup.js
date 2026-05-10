import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import {
  getAuth,
  createUserWithEmailAndPassword,
  sendEmailVerification,
  GoogleAuthProvider,
  signInWithPopup,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { firebaseConfig } from "./firebase-config.js";

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

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

const pwConfirmInput  = document.getElementById('confirmPassword');
const pwConfirmToggle = document.getElementById('pwConfirmToggle');
pwConfirmToggle.addEventListener('click', () => {
  pwConfirmInput.type = pwConfirmInput.type === 'password' ? 'text' : 'password';
  pwConfirmToggle.querySelector('i').className = pwConfirmInput.type === 'password' ? 'fas fa-eye' : 'fas fa-eye-slash';
});

/* ── Auto login ── */
onAuthStateChanged(auth, user => {
  if (user && user.emailVerified) window.location.replace('dashboard.html');
});

/* ── Error message humanizer ── */
function friendlyError(code) {
  const map = {
    'auth/email-already-in-use': 'This email is already in use. Please sign in.',
    'auth/invalid-email':       'Please enter a valid email address.',
    'auth/weak-password':       'Password is too weak.',
    'auth/network-request-failed': 'Network error. Check your connection.',
  };
  return map[code] || 'Something went wrong. Please try again.';
}

function isStrongPassword(pw) {
  return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#]).{8,}$/.test(pw);
}

/* ── Email Signup ── */
document.getElementById('signupForm').addEventListener('submit', async e => {
  e.preventDefault();
  hideAlert();

  const email = document.getElementById('email').value.trim();
  const pwd   = document.getElementById('password').value;
  const cpwd  = document.getElementById('confirmPassword').value;
  const btn   = document.getElementById('signupBtn');

  if (!email || !pwd || !cpwd) {
    showAlert('Please fill in all fields.', 'warn');
    return;
  }

  if (!isStrongPassword(pwd)) {
    showAlert('Password must be at least 8 chars with uppercase, lowercase, number, and special character.', 'warn');
    return;
  }

  if (pwd !== cpwd) {
    showAlert('Passwords do not match.', 'warn');
    return;
  }

  btn.classList.add('loading'); btn.disabled = true;
  try {
    const cred = await createUserWithEmailAndPassword(auth, email, pwd);
    await sendEmailVerification(cred.user);
    showToast('Account created! Please check your email to verify.', 'success');
    
    // Sign out the user so they can't access dashboard until verified
    await auth.signOut();
    
    setTimeout(() => window.location.replace('loginpage.html'), 3000);
  } catch (err) {
    showAlert(friendlyError(err.code), 'error');
    btn.classList.remove('loading'); btn.disabled = false;
  }
});

/* Clear error state on typing */
document.getElementById('password').addEventListener('input', hideAlert);
document.getElementById('confirmPassword').addEventListener('input', hideAlert);
document.getElementById('email').addEventListener('input', hideAlert);

/* ── Google Signup ── */
document.getElementById('googleBtn').addEventListener('click', async () => {
  const btn = document.getElementById('googleBtn');
  btn.classList.add('loading'); btn.disabled = true;
  try {
    const provider = new GoogleAuthProvider();
    await signInWithPopup(auth, provider);
    showToast('Signed up with Google!');
    setTimeout(() => window.location.replace('dashboard.html'), 700);
  } catch (err) {
    if (err.code !== 'auth/popup-closed-by-user') {
      showAlert(friendlyError(err.code), 'error');
    }
    btn.classList.remove('loading'); btn.disabled = false;
  }
});
