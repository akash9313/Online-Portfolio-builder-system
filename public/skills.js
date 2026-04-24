import { initializeApp }     from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut }
  from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore, collection, addDoc, getDocs, deleteDoc, doc, getDoc }
  from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { aiService } from "./aiService.js";
import { firebaseConfig } from "./firebase-config.js";

    const app  = initializeApp(firebaseConfig);
    const auth = getAuth(app);
    const db   = getFirestore(app);

    let currentUser       = null;
    let allSkills         = [];
    let activeFilter      = 'all';
    let sortAZ            = true;
    let isListView        = false;
    let pendingDeleteId   = null;
    let pendingDeleteName = null;

    /* ── Toast ── */
    function showToast(msg, isError=false) {
      const t = document.getElementById('toast');
      document.getElementById('toastMsg').textContent = msg;
      document.getElementById('toastIcon').className  = isError ? 'fas fa-times-circle' : 'fas fa-check-circle';
      t.className = 'toast' + (isError ? ' error' : '');
      void t.offsetWidth;
      t.classList.add('show');
      setTimeout(() => t.classList.remove('show'), 3200);
    }

    /* ── Update nav / sidebar counters ── */
    function updateCounters() {
      const n = allSkills.length;
      // Nav bar — treat 10 skills as 100% (cap)
      const pct = Math.min(100, Math.round((n / 10) * 100));
      document.getElementById('navSkillBar').style.width   = pct + '%';
      document.getElementById('navSkillCount').textContent = n;
      // Sidebar ring (max fill at 10 skills)
      const circ = 188.5;
      document.getElementById('sidebarRing').style.strokeDashoffset = circ - (pct/100)*circ;
      document.getElementById('sidebarPct').textContent = n;
      // Page header count
      document.getElementById('phSkillCount').textContent = n + (n===1 ? ' skill' : ' skills');
      document.getElementById('skillCountBadge').textContent = n + (n===1 ? ' skill' : ' skills');
      // Stats
      document.getElementById('statTotal').textContent = n;
      document.getElementById('statAdv').textContent   = allSkills.filter(s=>s.level==='Advanced').length;
      document.getElementById('statInt').textContent   = allSkills.filter(s=>s.level==='Intermediate').length;
      document.getElementById('statBeg').textContent   = allSkills.filter(s=>s.level==='Beginner').length;
    }

    /* ── Render skills ── */
    function renderSkills() {
      const grid  = document.getElementById('skillsGrid');
      const empty = document.getElementById('emptyState');
      const search = document.getElementById('searchInput').value.toLowerCase().trim();

      let filtered = allSkills.filter(s => {
        const mf = activeFilter === 'all' || s.level === activeFilter;
        const ms = s.name.toLowerCase().includes(search);
        return mf && ms;
      });

      // Sort
      filtered.sort((a, b) => sortAZ
        ? a.name.localeCompare(b.name)
        : b.name.localeCompare(a.name));

      // List/Grid view
      grid.className = 'skills-grid' + (isListView ? ' list-view' : '');

      // Subtitle
      document.getElementById('listSubTitle').textContent =
        activeFilter === 'all'
          ? `All ${allSkills.length} skills`
          : `${filtered.length} ${activeFilter} skill${filtered.length!==1?'s':''}`;

      updateCounters();

      grid.innerHTML = '';
      if (filtered.length === 0) {
        empty.style.display = 'flex';
        if (allSkills.length === 0) {
          document.getElementById('emptyTitle').textContent = 'No skills added yet';
          document.getElementById('emptyMsg').textContent   = 'Add your first skill using the form above to get started.';
        } else {
          document.getElementById('emptyTitle').textContent = 'No matching skills';
          document.getElementById('emptyMsg').textContent   = 'Try a different search or filter.';
        }
        return;
      }
      empty.style.display = 'none';

      filtered.forEach((skill, i) => {
        const lvClass = 'lv-' + skill.level.toLowerCase();
        const card = document.createElement('div');
        card.className = `skill-card ${lvClass}`;
        card.style.animationDelay = (i * 0.045) + 's';
        card.innerHTML = `
          <div class="skill-card-top">
            <div class="skill-avatar">${skill.name.charAt(0).toUpperCase()}</div>
            <div class="skill-meta">
              <div class="skill-name" title="${skill.name}">${skill.name}</div>
              <span class="skill-badge"><span class="badge-dot"></span>${skill.level}</span>
            </div>
            <button class="delete-btn" title="Remove skill"><i class="fas fa-trash"></i></button>
          </div>
          <div class="skill-progress">
            <div class="sp-bar"><div class="sp-fill"></div></div>
            <div class="sp-labels"><span>Beginner</span><span>Advanced</span></div>
          </div>`;
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
      const snap = await getDocs(collection(db,'users',currentUser.uid,'skills'));
      allSkills = snap.docs.map(d => ({ id:d.id, ...d.data() }));
      renderSkills();
    }

    /* ── Custom Select ── */
    const levelSelect  = document.getElementById('levelSelect');
    const selectedText = document.getElementById('selectedText');
    const selectedDot  = document.getElementById('selectedDot');
    let   currentLevel = '';

    document.getElementById('csSelected').addEventListener('click', e => {
      e.stopPropagation();
      levelSelect.classList.toggle('open');
    });
    document.querySelectorAll('.cs-option').forEach(opt => {
      opt.addEventListener('click', () => {
        currentLevel = opt.dataset.level;
        selectedText.textContent = currentLevel;
        selectedText.style.color = 'var(--text)';
        const dotMap = { Beginner:'dot-beg', Intermediate:'dot-int', Advanced:'dot-adv' };
        selectedDot.className = 'level-dot ' + dotMap[currentLevel];
        document.querySelectorAll('.cs-option').forEach(o => o.classList.remove('selected'));
        opt.classList.add('selected');
        levelSelect.classList.remove('open');
      });
    });
    document.addEventListener('click', () => levelSelect.classList.remove('open'));

    /* ── Suggestion chips ── */
    document.querySelectorAll('.suggest-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        document.getElementById('skillName').value = chip.dataset.name;
        document.getElementById('skillName').focus();
      });
    });

    /* ── Add Skill ── */
    async function addSkill() {
      const name = document.getElementById('skillName').value.trim();
      if (!name)         { showToast('Please enter a skill name.', true); return; }
      if (!currentLevel) { showToast('Please select a proficiency level.', true); return; }
      if (allSkills.some(s => s.name.toLowerCase() === name.toLowerCase())) {
        showToast(`"${name}" is already in your skills.`, true); return;
      }

      const btn = document.getElementById('addSkillBtn');
      btn.disabled = true;
      btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Adding…';

      try {
        const ref = await addDoc(collection(db,'users',currentUser.uid,'skills'), {
          name, level: currentLevel, createdAt: new Date()
        });
        allSkills.push({ id: ref.id, name, level: currentLevel });
        renderSkills();
        // Reset
        document.getElementById('skillName').value = '';
        currentLevel = '';
        selectedText.textContent = 'Select level';
        selectedText.style.color = 'var(--muted)';
        selectedDot.className    = 'level-dot';
        document.querySelectorAll('.cs-option').forEach(o => o.classList.remove('selected'));
        showToast(`"${name}" added! 🎉`);
      } catch {
        showToast('Failed to add skill. Try again.', true);
      } finally {
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-plus"></i> Add Skill';
      }
    }

    document.getElementById('addSkillBtn').addEventListener('click', addSkill);
    document.getElementById('skillName').addEventListener('keydown', e => {
      if (e.key === 'Enter') addSkill();
    });

    /* AI Skill Suggestions */
    async function fetchAiSuggestions() {
      const btn = document.getElementById('getAiSkills');
      const box = document.getElementById('aiSkillsBox');
      const row = document.getElementById('aiSuggestRow');
      const refreshBtn = document.getElementById('refreshAiSkills');

      // Get user role from profile if possible
      let role = "Software Developer";
      try {
        const profileSnap = await getDoc(doc(db, 'users', currentUser.uid));
        if (profileSnap.exists()) {
          role = profileSnap.data().role || role;
        }
      } catch (e) {}

      const currentSkillNames = allSkills.map(s => s.name);

      btn.style.display = 'none';
      box.style.display = 'block';
      refreshBtn.disabled = true;
      refreshBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Thinking...';
      row.innerHTML = '<div style="width:100%; text-align:center; padding:10px; color:var(--muted); font-size:0.8rem;">AI is analyzing your profile...</div>';

      try {
        const suggestions = await aiService.suggestSkills(role, currentSkillNames);
        row.innerHTML = '';
        suggestions.forEach((skill, i) => {
          const chip = document.createElement('span');
          chip.className = 'suggest-chip ai-chip';
          chip.dataset.name = skill;
          chip.style.animationDelay = (i * 0.05) + 's';
          chip.innerHTML = `<i class="fas fa-plus-circle" style="font-size:0.7rem; opacity:0.6;"></i> ${skill}`;
          chip.addEventListener('click', () => {
            document.getElementById('skillName').value = skill;
            document.getElementById('skillName').focus();
          });
          row.appendChild(chip);
        });
      } catch (err) {
        showToast(err.message, true);
        box.style.display = 'none';
        btn.style.display = 'flex';
      } finally {
        refreshBtn.disabled = false;
        refreshBtn.innerHTML = '<i class="fas fa-sync-alt"></i> Refresh';
      }
    }

    document.getElementById('getAiSkills').addEventListener('click', fetchAiSuggestions);
    document.getElementById('refreshAiSkills').addEventListener('click', fetchAiSuggestions);

    /* ── Delete ── */
    document.getElementById('modalCancel').addEventListener('click', () => {
      document.getElementById('deleteModal').classList.remove('open');
    });
    document.getElementById('modalConfirm').addEventListener('click', async () => {
      document.getElementById('deleteModal').classList.remove('open');
      if (!pendingDeleteId) return;

      // Animate card out
      const cards = document.querySelectorAll('.skill-card');
      cards.forEach(c => {
        if (c.querySelector('.skill-name')?.textContent === pendingDeleteName) {
          c.classList.add('removing');
        }
      });

      try {
        await deleteDoc(doc(db,'users',currentUser.uid,'skills',pendingDeleteId));
        allSkills = allSkills.filter(s => s.id !== pendingDeleteId);
        setTimeout(() => renderSkills(), 300);
        showToast(`"${pendingDeleteName}" removed.`);
      } catch {
        showToast('Failed to remove skill.', true);
        renderSkills();
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

    /* ── Sort toggle ── */
    document.getElementById('sortBtn').addEventListener('click', () => {
      sortAZ = !sortAZ;
      document.getElementById('sortIcon').className  = sortAZ ? 'fas fa-sort-alpha-down' : 'fas fa-sort-alpha-up';
      document.getElementById('sortLabel').textContent = sortAZ ? 'A–Z' : 'Z–A';
      renderSkills();
    });

    /* ── View toggle ── */
    document.getElementById('gridViewBtn').addEventListener('click', () => {
      isListView = false;
      document.getElementById('gridViewBtn').classList.add('active');
      document.getElementById('listViewBtn').classList.remove('active');
      renderSkills();
    });
    document.getElementById('listViewBtn').addEventListener('click', () => {
      isListView = true;
      document.getElementById('listViewBtn').classList.add('active');
      document.getElementById('gridViewBtn').classList.remove('active');
      renderSkills();
    });

    /* ── Auth ── */
    onAuthStateChanged(auth, async user => {
      if (!user) { window.location.href = 'loginpage.html'; return; }
      currentUser = user;

      // Load profile name
      const profileSnap = await getDoc(doc(db,'users',user.uid));
      if (profileSnap.exists()) {
        const d = profileSnap.data();
        document.getElementById('spName').textContent   = d.fullName || user.email.split('@')[0];
        document.getElementById('spAvatar').textContent = (d.fullName || user.email).charAt(0).toUpperCase();
      } else {
        document.getElementById('spName').textContent   = user.email.split('@')[0];
        document.getElementById('spAvatar').textContent = user.email.charAt(0).toUpperCase();
      }

      await loadSkills();

      const ol = document.getElementById('loadingOverlay');
      ol.style.opacity = '0';
      setTimeout(() => ol.style.display='none', 400);
    });

    /* ── Logout ── */
    document.getElementById('logoutBtn').addEventListener('click', async () => {
      await signOut(auth);
      localStorage.clear();
      window.location.href = 'loginpage.html';
    });
  
    /* Cursor */
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
    /* Navbar scroll */
    window.addEventListener('scroll', () => {
      document.getElementById('navbar').classList.toggle('scrolled', window.scrollY > 20);
    });
    /* Reveal */
    const obs = new IntersectionObserver(entries => {
      entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('visible'); });
    }, { threshold:0.07 });
    document.querySelectorAll('.reveal').forEach(el => obs.observe(el));