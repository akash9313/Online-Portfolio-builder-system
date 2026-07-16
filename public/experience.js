import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut }
  from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore, collection, addDoc, getDocs, deleteDoc, doc, getDoc, serverTimestamp }
  from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { aiService } from "./aiService.js";
import { firebaseConfig } from "./firebase-config.js";

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

let currentUser = null;
let allExperiences = [];
let pendingDeleteId = null;
let pendingDeleteName = null;

/* ── Toast ── */
function showToast(msg, isError = false) {
  const t = document.getElementById('toast');
  const tm = document.getElementById('toastMsg');
  const ti = document.getElementById('toastIcon');
  tm.textContent = msg;
  ti.className = isError ? 'fas fa-times-circle' : 'fas fa-check-circle';
  t.className = 'toast' + (isError ? ' error' : '');
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 3200);
}

/* ── Char count ── */
document.getElementById('expDesc').addEventListener('input', e => {
  const len = e.target.value.length;
  const el = document.getElementById('descCount');
  el.textContent = `${len} / 600`;
  el.className = 'char-count' + (len > 580 ? ' over' : len > 500 ? ' warn' : '');
});

/* AI Description Improver */
document.getElementById('improveDescBtn').addEventListener('click', async () => {
  const type = document.querySelector('input[name="expType"]:checked')?.value || 'job';
  const isFresher = (type === 'fresher');
  const title = isFresher ? 'Fresher' : document.getElementById('expTitle').value.trim();
  const company = isFresher ? 'N/A' : document.getElementById('expCompany').value.trim();
  const desc = document.getElementById('expDesc').value.trim();

  if (!desc || (!isFresher && !title)) {
    showToast(isFresher ? 'Please enter a summary first.' : 'Please enter at least a Job Title and some Basic Description first.', true);
    return;
  }

  const btn = document.getElementById('improveDescBtn');
  const originalHtml = btn.innerHTML;
  btn.disabled = true;
  btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Refining...';

  try {
    const promptTitle = isFresher ? 'Academic / Fresher Objective' : title;
    const promptCompany = isFresher ? 'N/A' : (company || 'Various');
    const improved = await aiService.improveExperienceDesc(promptTitle, promptCompany, desc);
    document.getElementById('expDesc').value = improved;
    // Trigger input to update char count
    document.getElementById('expDesc').dispatchEvent(new Event('input'));
    showToast(isFresher ? 'Objective professionalized! ✨' : 'Experience description professionalized! ✨');
  } catch (err) {
    showToast(err.message, true);
  } finally {
    btn.disabled = false;
    btn.innerHTML = originalHtml;
  }
});

/* ── Render ── */
function renderExperiences() {
  const list = document.getElementById('experienceList');
  const empty = document.getElementById('emptyState');
  const search = document.getElementById('searchInput').value.toLowerCase();

  const filtered = allExperiences.filter(exp => {
    const title = (exp.title || '').toLowerCase();
    const company = (exp.company || '').toLowerCase();
    const desc = (exp.description || '').toLowerCase();
    return title.includes(search) || company.includes(search) || desc.includes(search);
  });

  document.getElementById('countBadge').textContent = `${filtered.length} roles`;
  document.getElementById('statTotal').textContent = allExperiences.length;

  const uniqueCompanies = new Set(allExperiences.map(e => e.company).filter(Boolean));
  document.getElementById('statCompanies').textContent = uniqueCompanies.size;

  if (filtered.length === 0) {
    list.style.display = 'none';
    empty.style.display = 'flex';
    empty.querySelector('.empty-title').textContent = allExperiences.length ? 'No matches found' : 'No experience added yet';
    return;
  }

  list.style.display = 'flex';
  empty.style.display = 'none';
  list.innerHTML = '';

  filtered.forEach(exp => {
    const title = exp.title;
    const company = exp.company;
    const desc = exp.description;

    // Format dates nicely
    let addDateStr = 'Added just now';
    if (exp.createdAt && typeof exp.createdAt.toDate === 'function') {
      const d = exp.createdAt.toDate();
      addDateStr = `Added ${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
    }

    let typeBadge = '';
    const typeStr = exp.type || 'job';
    if (typeStr === 'job') {
      typeBadge = '<span class="type-badge job"><i class="fas fa-briefcase"></i> Job</span>';
    } else if (typeStr === 'internship') {
      typeBadge = '<span class="type-badge internship"><i class="fas fa-user-graduate"></i> Internship</span>';
    } else if (typeStr === 'fresher') {
      typeBadge = '<span class="type-badge fresher"><i class="fas fa-seedling"></i> Fresher</span>';
    }
    const isFresher = (typeStr === 'fresher');

    const card = document.createElement('div');
    card.className = 'exp-card';
    card.innerHTML = `
      <div class="exp-card-top">
        <div class="exp-body">
          <div style="display:flex; align-items:center; gap:10px; margin-bottom:6px; flex-wrap:wrap;">
            <div class="exp-title" style="margin-bottom:0;">${title}</div>
            ${typeBadge}
          </div>
          ${!isFresher ? `<div class="exp-company"><i class="fas fa-building"></i> ${company}</div>` : ''}
          <div class="exp-desc">${desc}</div>
        </div>
        <div class="exp-actions">
          <button class="exp-del-btn" data-id="${exp.id}" data-name="${title}" title="Delete"><i class="fas fa-trash"></i></button>
        </div>
      </div>
      <div class="exp-footer">
        <div style="display:flex; gap:10px; flex-wrap:wrap;">
          ${!isFresher ? `<span class="exp-meta"><i class="fas fa-calendar-alt"></i> ${exp.duration || 'N/A'}</span>` : ''}
          ${!isFresher && exp.location ? `<span class="exp-meta"><i class="fas fa-map-marker-alt"></i> ${exp.location}</span>` : ''}
        </div>
        <span style="font-size:0.75rem; color:var(--muted); font-family:'JetBrains Mono',monospace;">${addDateStr}</span>
      </div>
    `;

    card.querySelector('.exp-del-btn').addEventListener('click', () => {
      pendingDeleteId = exp.id;
      pendingDeleteName = exp.title;
      document.getElementById('deleteExpName').textContent = exp.title;
      document.getElementById('deleteModal').classList.add('open');
    });

    list.appendChild(card);
  });
}

/* ── Load ── */
async function loadExperiences() {
  const snap = await getDocs(collection(db, 'users', currentUser.uid, 'experience'));
  allExperiences = snap.docs.map(d => {
    const data = d.data();
    return {
      id: d.id,
      ...data,
      title: data.title || 'Untitled Role',
      company: data.company || 'Unknown Company',
      description: data.description || ''
    };
  });
  // Sort descending by creation date
  allExperiences.sort((a, b) => {
    const ta = (a.createdAt && typeof a.createdAt.toDate === 'function') ? a.createdAt.toDate() : new Date(0);
    const tb = (b.createdAt && typeof b.createdAt.toDate === 'function') ? b.createdAt.toDate() : new Date(0);
    return tb - ta;
  });
  renderExperiences();
}

/* ── UI Toggles ── */
document.querySelectorAll('input[name="expType"]').forEach(radio => {
  radio.addEventListener('change', (e) => {
    const val = e.target.value;
    const stdFields = document.getElementById('standardFields');
    const descLabel = document.getElementById('descLabel');
    if (val === 'fresher') {
      stdFields.style.display = 'none';
      if (descLabel) descLabel.innerHTML = 'Objective / Academic Summary <span class="req">*</span>';
      document.getElementById('expDesc').placeholder = 'Describe your career objectives or key academic achievements...';
    } else {
      stdFields.style.display = 'grid';
      if (descLabel) descLabel.innerHTML = 'Description <span class="req">*</span>';
      document.getElementById('expDesc').placeholder = 'Describe your key responsibilities and achievements...';
    }
  });
});

/* ── Add ── */
document.getElementById('addExpBtn').addEventListener('click', async () => {
  const type = document.querySelector('input[name="expType"]:checked').value;
  const isFresher = (type === 'fresher');
  const title = isFresher ? 'Fresher' : document.getElementById('expTitle').value.trim();
  const company = isFresher ? 'No Experience' : document.getElementById('expCompany').value.trim();
  const duration = isFresher ? 'N/A' : document.getElementById('expDuration').value.trim();
  const loc = isFresher ? '' : document.getElementById('expLocation').value.trim();
  const desc = document.getElementById('expDesc').value.trim();

  if (!isFresher) {
    if (!title) { showToast('Please enter a job title.', true); return; }
    if (!company) { showToast('Please enter a company name.', true); return; }
    if (!duration) { showToast('Please enter the duration.', true); return; }
  }
  if (!desc) { showToast('Please enter a description.', true); return; }

  const btn = document.getElementById('addExpBtn');
  const spin = document.getElementById('addSpin');
  const icon = document.getElementById('addIcon');
  const txt = document.getElementById('addTxt');
  btn.classList.add('loading');
  spin.style.display = 'block'; icon.style.display = 'none'; txt.textContent = 'Adding…';

  try {
    const now = new Date();
    const payload = {
      type, title, company, duration, location: loc, description: desc, createdAt: serverTimestamp()
    };
    const ref = await addDoc(collection(db, 'users', currentUser.uid, 'experience'), payload);

    allExperiences.unshift({ id: ref.id, ...payload, createdAt: { toDate: () => now } });
    renderExperiences();

    // Reset form
    ['expTitle', 'expCompany', 'expDuration', 'expLocation', 'expDesc'].forEach(id => document.getElementById(id).value = '');
    document.getElementById('descCount').textContent = '0 / 600';
    document.getElementById('descCount').className = 'char-count';

    showToast(`"${title}" added successfully! 🚀`);
  } catch (err) {
    console.error(err);
    showToast('Failed to add experience. Try again.', true);
  } finally {
    btn.classList.remove('loading');
    spin.style.display = 'none'; icon.style.display = 'inline'; txt.textContent = 'Add Experience';
  }
});

/* ── Reset ── */
document.getElementById('resetBtn').addEventListener('click', () => {
  ['expTitle', 'expCompany', 'expDuration', 'expLocation', 'expDesc'].forEach(id => document.getElementById(id).value = '');
  document.querySelector('input[name="expType"][value="job"]').checked = true;
  document.getElementById('standardFields').style.display = 'grid';
  document.getElementById('descLabel').innerHTML = 'Description <span class="req">*</span>';
  document.getElementById('expDesc').placeholder = 'Describe your key responsibilities and achievements...';
  document.getElementById('descCount').textContent = '0 / 600';
  document.getElementById('descCount').className = 'char-count';
});

/* ── Search ── */
document.getElementById('searchInput').addEventListener('input', renderExperiences);

/* ── Delete Modal ── */
document.getElementById('modalCancel').addEventListener('click', () => {
  document.getElementById('deleteModal').classList.remove('open');
  pendingDeleteId = null;
});
document.getElementById('modalConfirm').addEventListener('click', async () => {
  if (!pendingDeleteId) return;
  const btn = document.getElementById('modalConfirm');
  const orig = btn.innerHTML;
  btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Deleting...';
  btn.disabled = true;

  try {
    await deleteDoc(doc(db, 'users', currentUser.uid, 'experience', pendingDeleteId));
    allExperiences = allExperiences.filter(e => e.id !== pendingDeleteId);
    renderExperiences();
    showToast('Experience deleted.');
    document.getElementById('deleteModal').classList.remove('open');
  } catch (e) {
    console.error(e);
    showToast('Failed to delete experience.', true);
  } finally {
    btn.innerHTML = orig;
    btn.disabled = false;
    pendingDeleteId = null;
  }
});

/* ── Auth State & Init ── */
onAuthStateChanged(auth, async (user) => {
  if (user) {
    currentUser = user;
    try {
      // Load user profile info for sidebar
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (userDoc.exists()) {
        const d = userDoc.data();
        const fullName = d.fullName || user.email.split('@')[0];
        document.getElementById('spName').textContent = fullName;
        const spAvatar = document.getElementById('spAvatar');
        if (d.avatarUrl) {
          spAvatar.innerHTML = `<img src="${d.avatarUrl}" alt="avatar" style="width:100%;height:100%;object-fit:cover;border-radius:inherit;">`;
        } else {
          spAvatar.textContent = fullName.charAt(0).toUpperCase();
        }
      } else {
        document.getElementById('spName').textContent = user.email.split('@')[0];
        document.getElementById('spAvatar').textContent = user.email.charAt(0).toUpperCase();
      }
    } catch (e) {
      console.error('Error fetching user info:', e);
    }

    // Load experiences
    await loadExperiences();
    document.getElementById('loadingOverlay').style.opacity = '0';
    setTimeout(() => document.getElementById('loadingOverlay').style.display = 'none', 400);

    // Stagger reveal animations
    setTimeout(() => {
      document.querySelectorAll('.reveal').forEach(el => el.classList.add('visible'));
    }, 100);
  } else {
    window.location.href = 'loginpage.html';
  }
});

document.getElementById('logoutBtn').addEventListener('click', () => {
  signOut(auth).then(() => { window.location.href = 'loginpage.html'; });
});

/* ── Custom Cursor ── */
const cursor = document.getElementById('cursor');
const ring = document.getElementById('cursorRing');
let mx = 0, my = 0, rx = 0, ry = 0;
if (cursor && ring) {
  document.addEventListener('mousemove', e => {
    mx = e.clientX; my = e.clientY;
    cursor.style.left = mx + 'px';
    cursor.style.top = my + 'px';
  });
  (function animRing() {
    rx += (mx - rx) * 0.12;
    ry += (my - ry) * 0.12;
    ring.style.left = rx + 'px';
    ring.style.top = ry + 'px';
    requestAnimationFrame(animRing);
  })();
}
