import { initializeApp }      from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
    import { getAuth, onAuthStateChanged, signOut }
      from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
    import { getFirestore, collection, addDoc, getDocs, deleteDoc, doc, getDoc, updateDoc, serverTimestamp }
      from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
    import { aiService } from "./aiService.js";
    import { firebaseConfig } from "./firebase-config.js";

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

      const filtered = allProjects.filter(p => {
        const title = (p.title || '').toLowerCase();
        const tech = (Array.isArray(p.tech) ? p.tech.join(', ') : (p.tech || '')).toLowerCase();
        const desc = (p.description || p.desc || '').toLowerCase();
        
        return title.includes(search) || tech.includes(search) || desc.includes(search);
      });

      // Stats
      const statTotalEl    = document.getElementById('statTotal');
      const statGithubEl   = document.getElementById('statGithub');
      const statLiveEl     = document.getElementById('statLive');
      const statFeaturedEl = document.getElementById('statFeatured');

      if (statTotalEl)    statTotalEl.textContent    = allProjects.length;
      if (statGithubEl)   statGithubEl.textContent   = allProjects.filter(p => p.githubLink || p.github).length;
      if (statLiveEl)     statLiveEl.textContent     = allProjects.filter(p => p.liveLink || p.link).length;
      if (statFeaturedEl) statFeaturedEl.textContent = allProjects.filter(p => p.isFeatured || p.featured).length;

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
        const rawTech     = Array.isArray(proj.tech) ? proj.tech.join(', ') : (proj.tech || '');
        const tags        = rawTech.split(',').map(s => s.trim()).filter(Boolean);
        const title       = proj.title || 'Untitled Project';
        const description = proj.description || proj.desc || 'No description provided.';
        const initial     = title.trim().charAt(0).toUpperCase();

        const githubUrl   = proj.githubLink || proj.github || '';
        const liveUrl     = proj.liveLink || proj.link || '';
        const isFeatured  = !!(proj.isFeatured || proj.featured);

        let dateStr = 'Recently';
        try {
          if (proj.createdAt?.toDate) dateStr = proj.createdAt.toDate().toLocaleDateString('en-US',{month:'short',year:'numeric'});
          else if (proj.createdAt instanceof Date) dateStr = proj.createdAt.toLocaleDateString('en-US',{month:'short',year:'numeric'});
        } catch {}

        const card = document.createElement('div');
        card.className = 'proj-card' + (isFeatured ? ' is-featured' : '');
        card.style.animationDelay = (i * 0.06) + 's';

        const featuredBadgeHtml = isFeatured ? `<span class="featured-badge"><i class="fas fa-star"></i> Featured</span>` : '';
        const githubBtnHtml = githubUrl ? `<a href="${githubUrl}" target="_blank" class="proj-github-btn" title="GitHub Repo"><i class="fab fa-github"></i> Code</a>` : '';
        const liveBtnHtml = liveUrl ? `<a href="${liveUrl}" target="_blank" class="proj-live-btn" title="Live Demo"><i class="fas fa-external-link-alt"></i> Live</a>` : '';
        const featureBtnHtml = `<button class="proj-feature-btn ${isFeatured ? 'active' : ''}" data-id="${proj.id}" title="${isFeatured ? 'Unfeature project' : 'Mark as Featured'}"><i class="fas fa-star"></i></button>`;

        if (isListView) {
          card.innerHTML = `
            <div class="proj-initial">${initial}</div>
            <div class="proj-body">
              <div style="display:flex;align-items:center;justify-content:space-between;gap:0.8rem;flex-wrap:wrap;">
                <div style="display:flex;align-items:center;gap:8px;">
                  <div class="proj-title">${title}</div>
                  ${featuredBadgeHtml}
                </div>
                <div class="proj-actions">
                  ${featureBtnHtml}
                  ${githubBtnHtml}
                  ${liveBtnHtml}
                  <button class="proj-del-btn" data-id="${proj.id}" data-name="${title}" title="Delete"><i class="fas fa-trash"></i></button>
                </div>
              </div>
              <div class="proj-desc">${description}</div>
              <div class="proj-techs">${tags.map(t=>`<span class="proj-tech">${t}</span>`).join('')}</div>
              <div class="proj-footer">
                <span class="proj-date"><i class="fas fa-clock"></i>${dateStr}</span>
                <div style="display:flex;gap:6px;align-items:center;">
                  ${githubUrl ? `<a href="${githubUrl}" target="_blank" class="proj-github-btn"><i class="fab fa-github"></i> GitHub</a>` : ''}
                  ${liveUrl ? `<a href="${liveUrl}" target="_blank" class="proj-link-chip"><i class="fas fa-external-link-alt"></i>Live Demo</a>` : ''}
                </div>
              </div>
            </div>`;
        } else {
          card.innerHTML = `
            <div class="proj-card-top">
              <div class="proj-initial">${initial}</div>
              <div class="proj-actions">
                ${featureBtnHtml}
                <button class="proj-del-btn" data-id="${proj.id}" data-name="${title}" title="Delete"><i class="fas fa-trash"></i></button>
              </div>
            </div>
            <div style="display:flex;align-items:center;gap:8px;margin-top:4px;">
              <div class="proj-title">${title}</div>
              ${featuredBadgeHtml}
            </div>
            <div class="proj-desc">${description}</div>
            <div class="proj-techs">${tags.map(t=>`<span class="proj-tech">${t}</span>`).join('')}</div>
            <div class="proj-footer">
              <span class="proj-date"><i class="fas fa-clock"></i>${dateStr}</span>
              <div style="display:flex;gap:6px;align-items:center;">
                ${githubUrl ? `<a href="${githubUrl}" target="_blank" class="proj-github-btn"><i class="fab fa-github"></i> Code</a>` : ''}
                ${liveUrl ? `<a href="${liveUrl}" target="_blank" class="proj-link-chip"><i class="fas fa-external-link-alt"></i>Live</a>` : ''}
              </div>
            </div>`;
        }

        // Feature toggle event
        card.querySelector('.proj-feature-btn').addEventListener('click', async (e) => {
          e.stopPropagation();
          const nextFeatured = !isFeatured;
          try {
            await updateDoc(doc(db, 'users', currentUser.uid, 'projects', proj.id), {
              isFeatured: nextFeatured,
              featured: nextFeatured
            });
            proj.isFeatured = nextFeatured;
            proj.featured = nextFeatured;
            renderProjects();
            showToast(`"${title}" ${nextFeatured ? 'marked as Featured ⭐' : 'removed from Featured'}`);
          } catch (err) {
            console.error("Error updating project featured status:", err);
            showToast("Failed to update featured status.", true);
          }
        });

        // Delete event
        card.querySelector('.proj-del-btn').addEventListener('click', (e) => {
          e.stopPropagation();
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
      allProjects = snap.docs.map(d => {
        const data = d.data();
        return { 
          id: d.id, 
          ...data,
          title: data.title || 'Untitled Project',
          tech: Array.isArray(data.tech) ? data.tech.join(', ') : (data.tech || ''),
          description: data.description || data.desc || '',
          githubLink: data.githubLink || data.github || '',
          liveLink: data.liveLink || data.link || '',
          isFeatured: !!(data.isFeatured || data.featured)
        };
      });
      allProjects.sort((a,b) => {
        const ta = (a.createdAt && typeof a.createdAt.toDate === 'function') ? a.createdAt.toDate() : new Date(0);
        const tb = (b.createdAt && typeof b.createdAt.toDate === 'function') ? b.createdAt.toDate() : new Date(0);
        return tb - ta;
      });
      renderProjects();
    }

    /* ── Add ── */
    document.getElementById('addProjectBtn').addEventListener('click', async () => {
      const title    = document.getElementById('projTitle').value.trim();
      const tech     = document.getElementById('projTech').value.trim();
      const github   = (document.getElementById('projGithub') ? document.getElementById('projGithub').value.trim() : '');
      const live     = (document.getElementById('projLive') ? document.getElementById('projLive').value.trim() : '');
      const featured = (document.getElementById('projFeatured') ? document.getElementById('projFeatured').checked : false);
      const desc     = document.getElementById('projDesc').value.trim();

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
        const projectData = {
          title, 
          tech, 
          githubLink: github,
          github: github,
          liveLink: live,
          link: live,
          isFeatured: featured,
          featured: featured,
          description: desc, 
          createdAt: serverTimestamp()
        };
        const ref = await addDoc(collection(db, 'users', currentUser.uid, 'projects'), projectData);
        allProjects.unshift({ id: ref.id, ...projectData, createdAt: { toDate: () => now } });
        renderProjects();

        // Reset form
        ['projTitle','projTech','projGithub','projLive','projLink','projDesc'].forEach(id => {
          const el = document.getElementById(id);
          if (el) el.value = '';
        });
        if (document.getElementById('projFeatured')) document.getElementById('projFeatured').checked = false;
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
      ['projTitle','projTech','projGithub','projLive','projLink','projDesc'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = '';
      });
      if (document.getElementById('projFeatured')) document.getElementById('projFeatured').checked = false;
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

      const av   = document.getElementById('spAvatar');
      const sn   = document.getElementById('spName');

      try {
        const profileSnap = await getDoc(doc(db,'users',user.uid));
        if (profileSnap.exists()) {
          const d = profileSnap.data();
          if (sn) sn.textContent = d.fullName || user.email.split('@')[0];
          if (d.avatarUrl) {
            if (av) av.innerHTML = `<img src="${d.avatarUrl}" alt="avatar" style="width:100%;height:100%;object-fit:cover;border-radius:inherit;">`;
          } else {
            if (av) av.textContent = (d.fullName || user.email).charAt(0).toUpperCase();
          }
        } else {
          if (sn) sn.textContent = user.email.split('@')[0];
          if (av) av.textContent = user.email.charAt(0).toUpperCase();
        }
      } catch (e) {
        if (sn) sn.textContent = user.email.split('@')[0];
        if (av) av.textContent = user.email.charAt(0).toUpperCase();
      }

      try {
        await loadProjects();
      } catch (err) {
        console.error("Error loading projects:", err);
        showToast("Error loading projects. Some work might be missing.", true);
      } finally {
        const ol = document.getElementById('loadingOverlay');
        if (ol) {
          ol.style.opacity = '0';
          setTimeout(() => ol.style.display = 'none', 400);
        }
      }
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