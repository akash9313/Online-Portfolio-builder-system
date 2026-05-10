import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore, doc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { firebaseConfig } from "./firebase-config.js";

const app  = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db   = getFirestore(app);

let currentUser = null;

/* ─────────────────────────────────────────
   TOAST
───────────────────────────────────────── */
function showToast(msg, isError = false) {
  const t  = document.getElementById('toast');
  const tm = document.getElementById('toastMsg');
  const ti = document.getElementById('toastIcon');
  tm.textContent = msg;
  ti.className   = isError ? 'fas fa-times-circle' : 'fas fa-check-circle';
  t.className    = 'toast' + (isError ? ' error' : '');
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 3500);
}

/* ─────────────────────────────────────────
   SAFE VALUE HELPER
   Reads a string field safely — never treats
   a valid "0" or other falsy string as missing.
───────────────────────────────────────── */
function safeStr(val) {
  // Only fall back to '' if truly undefined or null
  return (val !== undefined && val !== null) ? String(val) : '';
}

/* ─────────────────────────────────────────
   TRACK FILLED INPUTS  (run once only)
───────────────────────────────────────── */
function trackFilled() {
  document.querySelectorAll('.field-input').forEach(inp => {
    // Guard: skip if already tracked to prevent duplicate listeners
    if (inp.dataset.tracked) return;
    inp.dataset.tracked = 'true';

    const update = () => inp.classList.toggle('filled', inp.value.trim().length > 0);
    inp.addEventListener('input', update);
    update(); // run immediately to reflect pre-filled values
  });
}

/* ─────────────────────────────────────────
   POPULATE INPUTS
───────────────────────────────────────── */
function populateInputs(data) {
  // Use empty object fallbacks so safeStr handles undefined fields
  const u = (data && data.university) ? data.university : {};
  const s = (data && data.school)     ? data.school     : {};

  // University fields
  document.getElementById('uniDegree').value   = safeStr(u.degree);
  document.getElementById('uniName').value     = safeStr(u.name);
  document.getElementById('uniYear').value     = safeStr(u.year);
  document.getElementById('uniGrade').value    = safeStr(u.grade);
  document.getElementById('uniLocation').value = safeStr(u.location);

  // School fields
  document.getElementById('schoolName').value     = safeStr(s.name);
  document.getElementById('schoolBoard').value    = safeStr(s.board);
  document.getElementById('schoolLocation').value = safeStr(s.location);
  document.getElementById('schoolYear').value     = safeStr(s.year);
  document.getElementById('schoolGrade').value    = safeStr(s.grade);

  // Update filled-state classes after values are set
  trackFilled();
}

/* ─────────────────────────────────────────
   RENDER TIMELINE
───────────────────────────────────────── */
function renderTimeline(data) {
  const timeline   = document.getElementById('eduTimeline');
  const emptyState = document.getElementById('emptyState');
  const badge      = document.getElementById('timelineBadge');
  const countEl    = document.getElementById('timelineCount');

  const u = (data && data.university) ? data.university : {};
  const s = (data && data.school)     ? data.school     : {};

  // A section has data if at least ONE field is a non-empty string
  const hasUni    = Object.values(u).some(v => String(v).trim() !== '');
  const hasSchool = Object.values(s).some(v => String(v).trim() !== '');
  const count     = (hasUni ? 1 : 0) + (hasSchool ? 1 : 0);

  timeline.innerHTML = '';

  if (!hasUni && !hasSchool) {
    emptyState.style.display = 'block';
    badge.style.display      = 'none';
    countEl.textContent      = 'No records yet';
    return;
  }

  emptyState.style.display = 'none';
  badge.style.display      = 'inline-flex';
  countEl.textContent      = `${count} record${count !== 1 ? 's' : ''} saved`;

  if (hasUni) {
    const item = document.createElement('div');
    item.className = 'timeline-item';
    item.innerHTML = `
      <div class="timeline-dot uni"><i class="fas fa-university"></i></div>
      <div class="timeline-content">
        <span class="tl-badge badge-uni"><i class="fas fa-graduation-cap"></i> University</span>
        <div class="tl-title">${u.degree || '—'}</div>
        <div class="tl-sub">${u.name || ''}</div>
        <div class="tl-meta">
          ${u.year     ? `<span class="meta-chip"><i class="fas fa-calendar"></i>${u.year}</span>` : ''}
          ${u.grade    ? `<span class="meta-chip grade-chip"><i class="fas fa-star"></i>${u.grade}</span>` : ''}
          ${u.location ? `<span class="meta-chip"><i class="fas fa-map-marker-alt"></i>${u.location}</span>` : ''}
        </div>
      </div>`;
    timeline.appendChild(item);
  }

  if (hasSchool) {
    const item = document.createElement('div');
    item.className = 'timeline-item';
    item.innerHTML = `
      <div class="timeline-dot school"><i class="fas fa-school"></i></div>
      <div class="timeline-content school-card">
        <span class="tl-badge badge-school"><i class="fas fa-school"></i> School</span>
        <div class="tl-title">${s.name || '—'}</div>
        <div class="tl-sub">${s.board || ''}</div>
        <div class="tl-meta">
          ${s.year     ? `<span class="meta-chip school-chip"><i class="fas fa-calendar-check"></i>Passed ${s.year}</span>` : ''}
          ${s.grade    ? `<span class="meta-chip grade-chip"><i class="fas fa-percent"></i>${s.grade}</span>` : ''}
          ${s.location ? `<span class="meta-chip school-chip"><i class="fas fa-map-marker-alt"></i>${s.location}</span>` : ''}
        </div>
      </div>`;
    timeline.appendChild(item);
  }
}

/* ─────────────────────────────────────────
   LOAD EDUCATION FROM FIRESTORE
───────────────────────────────────────── */
async function loadEducation() {
  if (!currentUser) return; // guard: never call without authenticated user

  try {
    const ref  = doc(db, 'users', currentUser.uid, 'education', 'main');
    const snap = await getDoc(ref);

    if (!snap.exists()) {
      // No saved data yet — clear inputs and show empty state
      populateInputs(null);
      renderTimeline(null);
      return;
    }

    // snap.data() is guaranteed non-null when snap.exists() is true
    const data = snap.data();

    // Defensive: ensure top-level keys are objects even if saved as undefined
    const safeData = {
      university: (data.university && typeof data.university === 'object') ? data.university : {},
      school:     (data.school     && typeof data.school     === 'object') ? data.school     : {},
    };

    populateInputs(safeData);
    renderTimeline(safeData);

  } catch (err) {
    console.error('loadEducation error:', err);
    showToast('Failed to load education data. Check your connection.', true);
  }
}

/* ─────────────────────────────────────────
   AUTH STATE
───────────────────────────────────────── */
onAuthStateChanged(auth, async user => {
  if (!user) {
    window.location.href = 'loginpage.html';
    return;
  }

  currentUser = user;

  // Sidebar
  const avatarEl = document.getElementById('spAvatar');
  const nameEl   = document.getElementById('spName');

  try {
    const profileSnap = await getDoc(doc(db,'users',user.uid));
    if (profileSnap.exists()) {
      const d = profileSnap.data();
      if (nameEl) nameEl.textContent = d.fullName || user.email.split('@')[0];
      if (d.avatarUrl) {
        if (avatarEl) avatarEl.innerHTML = `<img src="${d.avatarUrl}" alt="avatar" style="width:100%;height:100%;object-fit:cover;border-radius:inherit;">`;
      } else {
        if (avatarEl) avatarEl.textContent = (d.fullName || user.email).charAt(0).toUpperCase();
      }
    } else {
      if (nameEl) nameEl.textContent = user.email.split('@')[0];
      if (avatarEl) avatarEl.textContent = user.email.charAt(0).toUpperCase();
    }
  } catch (e) {
    if (nameEl) nameEl.textContent = user.email.split('@')[0];
    if (avatarEl) avatarEl.textContent = user.email.charAt(0).toUpperCase();
  }

  // Load data — await so inputs are populated before hiding overlay
  await loadEducation();

  // Hide loading overlay
  const ol = document.getElementById('loadingOverlay');
  if (ol) {
    ol.style.opacity = '0';
    setTimeout(() => { ol.style.display = 'none'; }, 400);
  }
});

/* ─────────────────────────────────────────
   SAVE EDUCATION
───────────────────────────────────────── */
document.getElementById('saveBtn').addEventListener('click', async () => {
  if (!currentUser) {
    showToast('You must be signed in to save.', true);
    return;
  }

  const btn  = document.getElementById('saveBtn');
  const spin = document.getElementById('saveSpin');
  const icon = document.getElementById('saveIcon');
  const txt  = document.getElementById('saveTxt');

  // Loading state
  btn.classList.add('loading');
  spin.style.display = 'block';
  icon.style.display = 'none';
  txt.textContent    = 'Saving…';

  // Collect ALL field values — never skip optional fields so we always
  // overwrite stale/partial data with a complete snapshot
  const educationData = {
    university: {
      degree:   document.getElementById('uniDegree').value.trim(),
      name:     document.getElementById('uniName').value.trim(),
      year:     document.getElementById('uniYear').value.trim(),
      grade:    document.getElementById('uniGrade').value.trim(),
      location: document.getElementById('uniLocation').value.trim(),
    },
    school: {
      name:     document.getElementById('schoolName').value.trim(),
      board:    document.getElementById('schoolBoard').value.trim(),
      location: document.getElementById('schoolLocation').value.trim(),
      year:     document.getElementById('schoolYear').value.trim(),
      grade:    document.getElementById('schoolGrade').value.trim(),
    },
    // Timestamp helps debug stale-read issues
    savedAt: new Date().toISOString(),
  };

  try {
    // Use setDoc WITHOUT merge so we always write a complete, clean document.
    // merge:true on nested objects in Firestore does a shallow top-level merge
    // which can leave orphaned fields from previous saves.
    const ref = doc(db, 'users', currentUser.uid, 'education', 'main');
    await setDoc(ref, educationData);

    renderTimeline(educationData);
    showToast('Education saved successfully! 🎓');

  } catch (err) {
    console.error('saveEducation error:', err);
    showToast('Failed to save. Please check your connection and try again.', true);

  } finally {
    btn.classList.remove('loading');
    spin.style.display = 'none';
    icon.style.display = 'inline';
    txt.textContent    = 'Save Education';
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

/* ─────────────────────────────────────────
   CURSOR
───────────────────────────────────────── */
const cursor = document.getElementById('cursor');
const ring   = document.getElementById('cursorRing');
let mx=0,my=0,rx=0,ry=0;
document.addEventListener('mousemove', e=>{
  mx=e.clientX; my=e.clientY;
  cursor.style.left=mx+'px'; cursor.style.top=my+'px';
});
(function animRing(){
  rx+=(mx-rx)*0.12; ry+=(my-ry)*0.12;
  ring.style.left=rx+'px'; ring.style.top=ry+'px';
  requestAnimationFrame(animRing);
})();

/* ─────────────────────────────────────────
   NAVBAR SCROLL
───────────────────────────────────────── */
window.addEventListener('scroll', () => {
  document.getElementById('navbar').classList.toggle('scrolled', window.scrollY > 20);
});

/* ─────────────────────────────────────────
   REVEAL ON SCROLL
───────────────────────────────────────── */
const revealEls = document.querySelectorAll('.reveal');
const obs = new IntersectionObserver(entries => {
  entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('visible'); });
}, { threshold: 0.08 });
revealEls.forEach(el => obs.observe(el));
