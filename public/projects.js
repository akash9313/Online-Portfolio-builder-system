import { initializeApp }      from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
    import { getAuth, onAuthStateChanged, signOut }
      from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
    import { getFirestore, collection, addDoc, getDocs, deleteDoc, doc, serverTimestamp }
      from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
    import { aiService } from "./aiService.js";

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

    let currentUser      = null;
    let allProjects      = [];
    let pendingDeleteId  = null;
    let pendingDeleteName= null;
    let isListView       = false;

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

    /* ── Tech preview ── */
    document.getElementById('projTech').addEventListener('input', e => {
      const tags = e.target.value.split(',').map(s => s.trim()).filter(Boolean);
      document.getElementById('techPreview').innerHTML =
        tags.map(t => `<span class="tech-chip"><i class="fas fa-code"></i>${t}</span>`).join('');
    });

    /* ── Char count ── */
    document.getElementById('projDesc').addEventListener('input', e => {
      const len = e.target.value.length;
      const el  = document.getElementById('descCount');
      el.textContent = `${len} / 400`;
      el.className   = 'char-count' + (len > 380 ? ' over' : len > 320 ? ' warn' : '');
    });

    /* AI Description Improver */
    document.getElementById('improveDescBtn').addEventListener('click', async () => {
      const title = document.getElementById('projTitle').value.trim();
      const tech  = document.getElementById('projTech').value.trim();
      const desc  = document.getElementById('projDesc').value.trim();

      if (!title || !desc) {
        showToast('Please enter at least a Title and some Basic Description first.', true);
        return;
      }

      const btn = document.getElementById('improveDescBtn');
      const originalHtml = btn.innerHTML;
      btn.disabled = true;
      btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Refining...';

      try {
        const improved = await aiService.improveProjectDesc(title, tech || 'Various technologies', desc);
        document.getElementById('projDesc').value = improved;
        // Trigger input to update char count
        document.getElementById('projDesc').dispatchEvent(new Event('input'));
        showToast('Project description professionalized! ✨');
      } catch (err) {
        showToast(err.message, true);
      } finally {
        btn.disabled = false;
        btn.innerHTML = originalHtml;
      }
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
      document.getElementById('countBadge').textContent = `${allProjects.length} ${allProjects.length === 1 ? 'project' : 'projects'}`;

      grid.innerHTML = '';

      if (filtered.length === 0) {
        empty.style.display = 'flex';
        empty.querySelector('.empty-title').textContent = allProjects.length === 0 ? 'No projects yet' : 'No matching projects';
        empty.querySelector('.empty-sub').innerHTML     = allProjects.length === 0
          ? 'Add your first project using the form above<br>and watch your portfolio come to life.'
          : 'Try a different search term.';
        return;
      }
      empty.style.display = 'none';

      filtered.forEach((proj, i) => {
        const tags    = proj.tech.split(',').map(s => s.trim()).filter(Boolean);
        const initial = proj.title.trim().charAt(0).toUpperCase();
        let dateStr   = 'Recently';
        try {
          if (proj.createdAt?.toDate) dateStr = proj.createdAt.toDate().toLocaleDateString('en-US',{month:'short',year:'numeric'});
          else if (proj.createdAt instanceof Date) dateStr = proj.createdAt.toLocaleDateString('en-US',{month:'short',year:'numeric'});
        } catch {}

        const card = document.createElement('div');
        card.className = 'proj-card';
        card.style.animationDelay = (i * 0.06) + 's';

        if (isListView) {
          card.innerHTML = `
            <div class="proj-initial">${initial}</div>
            <div class="proj-body">
              <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:0.8rem;">
                <div class="proj-title">${proj.title}</div>
                <div class="proj-actions">
                  ${proj.link ? `<a href="${proj.link}" target="_blank" class="proj-link-btn" title="View project"><i class="fas fa-external-link-alt"></i></a>` : ''}
                  <button class="proj-del-btn" data-id="${proj.id}" data-name="${proj.title}" title="Delete"><i class="fas fa-trash"></i></button>
                </div>
              </div>
              <div class="proj-desc">${proj.description}</div>
              <div class="proj-techs">${tags.map(t=>`<span class="proj-tech">${t}</span>`).join('')}</div>
              <div class="proj-footer">
                <span class="proj-date"><i class="fas fa-clock"></i>${dateStr}</span>
                ${proj.link ? `<a href="${proj.link}" target="_blank" class="proj-link-chip"><i class="fas fa-external-link-alt"></i>Live</a>` : ''}
              </div>
            </div>`;
        } else {
          card.innerHTML = `
            <div class="proj-card-top">
              <div class="proj-initial">${initial}</div>
              <div class="proj-actions">
                ${proj.link ? `<a href="${proj.link}" target="_blank" class="proj-link-btn" title="View project"><i class="fas fa-external-link-alt"></i></a>` : ''}
                <button class="proj-del-btn" data-id="${proj.id}" data-name="${proj.title}" title="Delete"><i class="fas fa-trash"></i></button>
              </div>
            </div>
            <div class="proj-title">${proj.title}</div>
            <div class="proj-desc">${proj.description}</div>
            <div class="proj-techs">${tags.map(t=>`<span class="proj-tech">${t}</span>`).join('')}</div>
            <div class="proj-footer">
              <span class="proj-date"><i class="fas fa-clock"></i>${dateStr}</span>
              ${proj.link ? `<a href="${proj.link}" target="_blank" class="proj-link-chip"><i class="fas fa-external-link-alt"></i>Live</a>` : ''}
            </div>`;
        }

        card.querySelector('.proj-del-btn').addEventListener('click', () => {
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
      allProjects.sort((a,b) => {
        const ta = a.createdAt?.toDate?.() || new Date(0);
        const tb = b.createdAt?.toDate?.() || new Date(0);
        return tb - ta;
      });
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
        const now = new Date();
        const ref = await addDoc(collection(db, 'users', currentUser.uid, 'projects'), {
          title, tech, link, description: desc, createdAt: serverTimestamp()
        });
        allProjects.unshift({ id: ref.id, title, tech, link, description: desc, createdAt: { toDate: () => now } });
        renderProjects();

        // Reset form
        ['projTitle','projTech','projLink','projDesc'].forEach(id => document.getElementById(id).value = '');
        document.getElementById('techPreview').innerHTML = '';
        document.getElementById('descCount').textContent = '0 / 400';
        document.getElementById('descCount').className   = 'char-count';

        showToast(`"${title}" added successfully! 🚀`);
      } catch (err) {
        console.error(err);
        showToast('Failed to add project. Try again.', true);
      } finally {
        btn.classList.remove('loading');
        spin.style.display = 'none'; icon.style.display = 'inline'; txt.textContent = 'Add Project';
      }
    });

    /* ── Reset ── */
    document.getElementById('resetBtn').addEventListener('click', () => {
      ['projTitle','projTech','projLink','projDesc'].forEach(id => document.getElementById(id).value = '');
      document.getElementById('techPreview').innerHTML = '';
      document.getElementById('descCount').textContent = '0 / 400';
      document.getElementById('descCount').className   = 'char-count';
    });

    /* ── Enter shortcut ── */
    document.getElementById('projTitle').addEventListener('keydown', e => {
      if (e.key === 'Enter') document.getElementById('addProjectBtn').click();
    });

    /* ── Delete modal ── */
    document.getElementById('modalCancel').addEventListener('click',  () => document.getElementById('deleteModal').classList.remove('open'));
    document.getElementById('deleteModal').addEventListener('click', e => { if (e.target === e.currentTarget) e.currentTarget.classList.remove('open'); });
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

      const name = user.displayName || user.email || 'User';
      const av   = document.getElementById('spAvatar');
      const sn   = document.getElementById('spName');
      if (av) av.textContent = name.charAt(0).toUpperCase();
      if (sn) sn.textContent = name.split(' ')[0] || name;

      await loadProjects();
      const ol = document.getElementById('loadingOverlay');
      ol.style.opacity = '0';
      setTimeout(() => ol.style.display = 'none', 400);
    });

    /* ── Logout ── */
    document.getElementById('logoutBtn').addEventListener('click', async () => {
      await signOut(auth);
      localStorage.clear();
      window.location.href = 'loginpage.html';
    });
  
    // Cursor
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

    // Navbar scroll
    window.addEventListener('scroll', () => {
      document.getElementById('navbar').classList.toggle('scrolled', window.scrollY > 20);
    });
    // Reveal on scroll
    const revealEls = document.querySelectorAll('.reveal');
    const obs = new IntersectionObserver(entries => {
      entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('visible'); });
    }, { threshold: 0.08 });
    revealEls.forEach(el => obs.observe(el));