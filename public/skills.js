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

  let currentUser  = null;
  let allSkills    = [];       // { id, name, level }
  let activeFilter = 'all';
  let pendingDeleteId   = null;
  let pendingDeleteName = null;

  /* ── Toast ── */
  function showToast(msg, isError = false) {
    const t  = document.getElementById('toast');
    const tm = document.getElementById('toastMsg');
    const ti = document.getElementById('toastIcon');
    tm.textContent = msg;
    ti.className   = isError ? 'fas fa-times-circle' : 'fas fa-check-circle';
    t.className    = 'toast' + (isError ? ' error' : '');
    t.classList.add('show');
    setTimeout(() => t.classList.remove('show'), 3000);
  }

  /* ── Helpers ── */
  function levelClass(level) {
    return 'level-' + level.toLowerCase();
  }
  function skillInitial(name) {
    return name.trim().charAt(0).toUpperCase();
  }
  function levelIcon(level) {
    if (level === 'Beginner')     return 'fas fa-seedling';
    if (level === 'Intermediate') return 'fas fa-chart-bar';
    return 'fas fa-trophy';
  }

  /* ── Render ── */
  function renderSkills() {
    const grid  = document.getElementById('skillsGrid');
    const empty = document.getElementById('emptyState');
    const search = document.getElementById('searchInput').value.toLowerCase();

    const filtered = allSkills.filter(s => {
      const matchFilter = activeFilter === 'all' || s.level === activeFilter;
      const matchSearch = s.name.toLowerCase().includes(search);
      return matchFilter && matchSearch;
    });

    document.getElementById('skillCountBadge').textContent =
      allSkills.length + (allSkills.length === 1 ? ' skill' : ' skills');

    // Stats
    document.getElementById('statTotal').textContent        = allSkills.length;
    document.getElementById('statAdvanced').textContent     = allSkills.filter(s=>s.level==='Advanced').length;
    document.getElementById('statIntermediate').textContent = allSkills.filter(s=>s.level==='Intermediate').length;
    document.getElementById('statBeginner').textContent     = allSkills.filter(s=>s.level==='Beginner').length;

    grid.innerHTML = '';
    if (filtered.length === 0) {
      empty.style.display = 'flex';
      empty.querySelector('h3').textContent = allSkills.length === 0 ? 'No skills added yet' : 'No matching skills';
      empty.querySelector('p').textContent  = allSkills.length === 0
        ? 'Add your first skill using the form above to get started.'
        : 'Try a different search or filter.';
      return;
    }
    empty.style.display = 'none';

    filtered.forEach((skill, i) => {
      const card = document.createElement('div');
      card.className = `skill-card ${levelClass(skill.level)}`;
      card.style.animationDelay = (i * 0.04) + 's';
      card.innerHTML = `
        <div class="skill-icon-wrap">${skillInitial(skill.name)}</div>
        <div class="skill-info">
          <div class="skill-name">${skill.name}</div>
          <span class="skill-level-badge">
            <span class="skill-badge-dot"></span>${skill.level}
          </span>
          <div class="skill-actions-row">
            <div class="skill-progress-bar"><div class="skill-progress-fill"></div></div>
          </div>
        </div>
        <button class="delete-btn" title="Remove skill" data-id="${skill.id}" data-name="${skill.name}">
          <i class="fas fa-trash"></i>
        </button>`;
      card.querySelector('.delete-btn').addEventListener('click', () => {
        pendingDeleteId   = skill.id;
        pendingDeleteName = skill.name;
        document.getElementById('deleteSkillName').textContent = skill.name;
        document.getElementById('deleteModal').classList.add('open');
      });
      grid.appendChild(card);
    });
  }

  /* ── Load from Firestore ── */
  async function loadSkills() {
    const snap = await getDocs(collection(db, 'users', currentUser.uid, 'skills'));
    allSkills  = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    renderSkills();
  }

  /* ── Custom select ── */
  const levelSelect   = document.getElementById('levelSelect');
  const selectedText  = document.getElementById('selectedText');
  const selectedDot   = document.getElementById('selectedDot');
  let   currentLevel  = '';

  levelSelect.querySelector('.selected').addEventListener('click', e => {
    e.stopPropagation(); levelSelect.classList.toggle('open');
  });
  levelSelect.querySelectorAll('.option').forEach(opt => {
    opt.addEventListener('click', () => {
      currentLevel = opt.dataset.level;
      selectedText.textContent = currentLevel;
      selectedDot.className    = 'level-dot option-dot dot-' + currentLevel.toLowerCase();
      levelSelect.querySelectorAll('.option').forEach(o => o.classList.remove('selected-opt'));
      opt.classList.add('selected-opt');
      levelSelect.classList.remove('open');
    });
  });
  document.addEventListener('click', () => levelSelect.classList.remove('open'));

  /* ── Add skill ── */
  document.getElementById('addSkillBtn').addEventListener('click', async () => {
    const name  = document.getElementById('skillName').value.trim();
    if (!name)         { showToast('Please enter a skill name.', true);  return; }
    if (!currentLevel) { showToast('Please select a proficiency level.', true); return; }

    // Duplicate check
    if (allSkills.some(s => s.name.toLowerCase() === name.toLowerCase())) {
      showToast(`"${name}" is already in your skills.`, true); return;
    }

    const btn = document.getElementById('addSkillBtn');
    btn.classList.add('loading'); btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Adding…';

    try {
      const ref = await addDoc(collection(db, 'users', currentUser.uid, 'skills'), {
        name, level: currentLevel, createdAt: new Date()
      });
      allSkills.push({ id: ref.id, name, level: currentLevel });
      renderSkills();

      // Reset form
      document.getElementById('skillName').value = '';
      currentLevel = '';
      selectedText.textContent = 'Select level';
      selectedDot.className    = 'level-dot';
      levelSelect.querySelectorAll('.option').forEach(o => o.classList.remove('selected-opt'));

      showToast(`"${name}" added successfully! 🎉`);
    } catch {
      showToast('Failed to add skill. Try again.', true);
    } finally {
      btn.classList.remove('loading');
      btn.innerHTML = '<i class="fas fa-plus"></i> Add Skill';
    }
  });

  /* ── Enter key shortcut ── */
  document.getElementById('skillName').addEventListener('keydown', e => {
    if (e.key === 'Enter') document.getElementById('addSkillBtn').click();
  });

  /* ── Delete modal ── */
  document.getElementById('modalCancel').addEventListener('click', () => {
    document.getElementById('deleteModal').classList.remove('open');
  });
  document.getElementById('modalConfirm').addEventListener('click', async () => {
    document.getElementById('deleteModal').classList.remove('open');
    if (!pendingDeleteId) return;
    try {
      await deleteDoc(doc(db, 'users', currentUser.uid, 'skills', pendingDeleteId));
      allSkills = allSkills.filter(s => s.id !== pendingDeleteId);
      renderSkills();
      showToast(`"${pendingDeleteName}" removed.`);
    } catch {
      showToast('Failed to delete skill.', true);
    }
    pendingDeleteId = pendingDeleteName = null;
  });

  /* ── Search ── */
  document.getElementById('searchInput').addEventListener('input', renderSkills);

  /* ── Filter chips ── */
  document.querySelectorAll('.filter-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      document.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      activeFilter = chip.dataset.filter;
      renderSkills();
    });
  });

  /* ── Auth ── */
  onAuthStateChanged(auth, async user => {
    if (!user) { window.location.href = 'loginpage.html'; return; }
    currentUser = user;
    await loadSkills();
    const ol = document.getElementById('loadingOverlay');
    ol.style.opacity = '0';
    setTimeout(() => ol.style.display = 'none', 400);
  });

  /* ── Logout ── */
  document.getElementById('logoutBtn').addEventListener('click', async () => {
    await signOut(auth); localStorage.clear();
    window.location.href = 'loginpage.html';
  });