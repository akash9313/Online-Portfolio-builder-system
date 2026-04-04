import { initializeApp }      from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
  import { getAuth, onAuthStateChanged, signOut }
    from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
  import { getFirestore, collection, addDoc, getDocs, deleteDoc, doc }
    from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

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

  let currentUser = null;
  let allProjects = [];
  let pendingDeleteId   = null;
  let pendingDeleteName = null;
  let isListView = false;

  /* ── Toast ── */
  function showToast(msg, isError = false) {
    const t  = document.getElementById('toast');
    const tm = document.getElementById('toastMsg');
    const ti = document.getElementById('toastIcon');
    tm.textContent = msg;
    ti.className   = isError ? 'fas fa-times-circle' : 'fas fa-check-circle';
    t.className    = 'toast' + (isError ? ' error' : '');
    t.classList.add('show');
    setTimeout(() => t.classList.remove('show'), 3200);
  }

  /* ── Tech tag preview ── */
  document.getElementById('projTech').addEventListener('input', e => {
    const tags = e.target.value.split(',').map(s => s.trim()).filter(Boolean);
    document.getElementById('techPreview').innerHTML =
      tags.map(t => `<span class="tech-tag"><i class="fas fa-code" style="font-size:0.65rem"></i>${t}</span>`).join('');
  });

  /* ── Char count ── */
  document.getElementById('projDesc').addEventListener('input', e => {
    const len = e.target.value.length;
    const el = document.getElementById('descCount');
    el.textContent = `${len} / 400`;
    el.className = 'char-count' + (len > 380 ? ' over' : len > 320 ? ' warn' : '');
  });

  /* ── View toggle ── */
  document.getElementById('gridViewBtn').addEventListener('click', () => {
    isListView = false;
    document.getElementById('gridViewBtn').classList.add('active');
    document.getElementById('listViewBtn').classList.remove('active');
    document.getElementById('projectsGrid').classList.remove('list-view');
  });
  document.getElementById('listViewBtn').addEventListener('click', () => {
    isListView = true;
    document.getElementById('listViewBtn').classList.add('active');
    document.getElementById('gridViewBtn').classList.remove('active');
    document.getElementById('projectsGrid').classList.add('list-view');
  });

  /* ── Render ── */
  function renderProjects() {
    const grid   = document.getElementById('projectsGrid');
    const empty  = document.getElementById('emptyState');
    const search = document.getElementById('searchInput').value.toLowerCase();

    const filtered = allProjects.filter(p =>
      p.title.toLowerCase().includes(search) ||
      p.tech.toLowerCase().includes(search)   ||
      p.description.toLowerCase().includes(search)
    );

    // Stats
    document.getElementById('statTotal').textContent = allProjects.length;
    document.getElementById('statLive').textContent  = allProjects.filter(p => p.link).length;
    const allTech = allProjects.flatMap(p => p.tech.split(',').map(s=>s.trim()).filter(Boolean));
    document.getElementById('statTech').textContent  = new Set(allTech).size;

    const badge = document.getElementById('countBadge');
    badge.textContent = allProjects.length + (allProjects.length === 1 ? ' project' : ' projects');

    grid.innerHTML = '';
    if (filtered.length === 0) {
      empty.style.display = 'flex';
      empty.querySelector('h3').textContent = allProjects.length === 0 ? 'No projects yet' : 'No matching projects';
      empty.querySelector('p').textContent  = allProjects.length === 0
        ? 'Add your first project using the form above.'
        : 'Try a different search term.';
      return;
    }
    empty.style.display = 'none';

    filtered.forEach((proj, i) => {
      const tags = proj.tech.split(',').map(s => s.trim()).filter(Boolean);
      const initial = proj.title.trim().charAt(0).toUpperCase();
      const dateStr = proj.createdAt?.toDate
        ? proj.createdAt.toDate().toLocaleDateString('en-US', { month:'short', year:'numeric' })
        : 'Recently';

      const card = document.createElement('div');
      card.className = 'proj-card';
      card.style.animationDelay = (i * 0.05) + 's';
      card.innerHTML = `
        <div class="proj-card-header">
          <div class="proj-card-icon">${initial}</div>
          <div class="proj-card-actions">
            ${proj.link
              ? `<a href="${proj.link}" target="_blank" class="proj-link-btn" title="View project"><i class="fas fa-external-link-alt"></i></a>`
              : ''}
            <button class="proj-delete-btn" data-id="${proj.id}" data-name="${proj.title}" title="Delete project">
              <i class="fas fa-trash"></i>
            </button>
          </div>
        </div>
        <div class="proj-card-body">
          <div class="proj-card-title">${proj.title}</div>
          <div class="proj-card-desc">${proj.description}</div>
          <div class="proj-tech-tags" style="margin-top:0.7rem">
            ${tags.map(t => `<span class="proj-tech-tag">${t}</span>`).join('')}
          </div>
        </div>
        <div class="proj-card-footer">
          <span class="proj-date"><i class="fas fa-clock"></i>${dateStr}</span>
        </div>`;

      card.querySelector('.proj-delete-btn').addEventListener('click', () => {
        pendingDeleteId   = proj.id;
        pendingDeleteName = proj.title;
        document.getElementById('deleteProjectName').textContent = proj.title;
        document.getElementById('deleteModal').classList.add('open');
      });

      grid.appendChild(card);
    });
  }

  /* ── Load ── */
  async function loadProjects() {
    const snap  = await getDocs(collection(db, 'users', currentUser.uid, 'projects'));
    allProjects = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    renderProjects();
  }

  /* ── Add ── */
  document.getElementById('addProjectBtn').addEventListener('click', async () => {
    const title = document.getElementById('projTitle').value.trim();
    const tech  = document.getElementById('projTech').value.trim();
    const link  = document.getElementById('projLink').value.trim();
    const desc  = document.getElementById('projDesc').value.trim();

    if (!title) { showToast('Please enter a project title.', true);       return; }
    if (!tech)  { showToast('Please enter technologies used.', true);     return; }
    if (!desc)  { showToast('Please enter a project description.', true); return; }

    const btn  = document.getElementById('addProjectBtn');
    const spin = document.getElementById('addSpin');
    const icon = document.getElementById('addIcon');
    const txt  = document.getElementById('addTxt');
    btn.classList.add('loading');
    spin.style.display = 'block'; icon.style.display = 'none'; txt.textContent = 'Adding…';

    try {
      const ref = await addDoc(collection(db, 'users', currentUser.uid, 'projects'), {
        title, tech, link, description: desc, createdAt: new Date()
      });
      allProjects.unshift({ id: ref.id, title, tech, link, description: desc, createdAt: { toDate: () => new Date() } });
      renderProjects();

      // reset
      document.getElementById('projTitle').value = '';
      document.getElementById('projTech').value  = '';
      document.getElementById('projLink').value  = '';
      document.getElementById('projDesc').value  = '';
      document.getElementById('techPreview').innerHTML = '';
      document.getElementById('descCount').textContent = '0 / 400';
      document.getElementById('descCount').className   = 'char-count';

      showToast(`"${title}" added successfully! 🚀`);
    } catch {
      showToast('Failed to add project. Try again.', true);
    } finally {
      btn.classList.remove('loading');
      spin.style.display = 'none'; icon.style.display = 'inline'; txt.textContent = 'Add Project';
    }
  });

  /* ── Reset form ── */
  document.getElementById('resetBtn').addEventListener('click', () => {
    ['projTitle','projTech','projLink','projDesc'].forEach(id => document.getElementById(id).value = '');
    document.getElementById('techPreview').innerHTML  = '';
    document.getElementById('descCount').textContent  = '0 / 400';
    document.getElementById('descCount').className    = 'char-count';
  });

  /* ── Enter shortcut ── */
  document.getElementById('projTitle').addEventListener('keydown', e => {
    if (e.key === 'Enter') document.getElementById('addProjectBtn').click();
  });

  /* ── Delete modal ── */
  document.getElementById('modalCancel').addEventListener('click', () => {
    document.getElementById('deleteModal').classList.remove('open');
  });
  document.getElementById('modalConfirm').addEventListener('click', async () => {
    document.getElementById('deleteModal').classList.remove('open');
    if (!pendingDeleteId) return;
    try {
      await deleteDoc(doc(db, 'users', currentUser.uid, 'projects', pendingDeleteId));
      allProjects = allProjects.filter(p => p.id !== pendingDeleteId);
      renderProjects();
      showToast(`"${pendingDeleteName}" deleted.`);
    } catch {
      showToast('Failed to delete project.', true);
    }
    pendingDeleteId = pendingDeleteName = null;
  });

  /* ── Search ── */
  document.getElementById('searchInput').addEventListener('input', renderProjects);

  /* ── Auth ── */
  onAuthStateChanged(auth, async user => {
    if (!user) { window.location.href = 'loginpage.html'; return; }
    currentUser = user;
    await loadProjects();
    const ol = document.getElementById('loadingOverlay');
    ol.style.opacity = '0';
    setTimeout(() => ol.style.display = 'none', 400);
  });

  /* ── Logout ── */
  document.getElementById('logoutBtn').addEventListener('click', async () => {
    await signOut(auth); localStorage.clear();
    window.location.href = 'loginpage.html';
  });