import { initializeApp }      from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
    import { getAuth, onAuthStateChanged, signOut }
      from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
    import { getFirestore, doc, setDoc, getDoc, collection, getDocs }
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

    /* ── Toast ── */
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

    /* ── Filled input highlight ── */
    function trackFilled() {
      document.querySelectorAll('.field-input').forEach(inp => {
        const update = () => inp.classList.toggle('filled', inp.value.trim().length > 0);
        inp.addEventListener('input', update);
        update();
      });
    }

    /* ── Render timeline ── */
    function renderTimeline(data) {
      const timeline    = document.getElementById('eduTimeline');
      const emptyState  = document.getElementById('emptyState');
      const badge       = document.getElementById('timelineBadge');
      const countEl     = document.getElementById('timelineCount');

      const u = data?.university || {};
      const s = data?.school     || {};
      const hasUni    = !!(u.degree || u.name);
      const hasSchool = !!s.name;
      const count = (hasUni ? 1 : 0) + (hasSchool ? 1 : 0);

      timeline.innerHTML = '';

      if (!hasUni && !hasSchool) {
        emptyState.style.display = 'block';
        badge.style.display      = 'none';
        countEl.textContent      = 'No records yet';
        return;
      }

      emptyState.style.display = 'none';
      badge.style.display      = 'inline-flex';
      countEl.textContent      = `${count} record${count > 1 ? 's' : ''} saved`;

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

    /* ── Populate inputs ── */
    function populateInputs(data) {
      const u = data?.university || {};
      const s = data?.school     || {};
      if (u.degree)   document.getElementById('uniDegree').value   = u.degree;
      if (u.name)     document.getElementById('uniName').value     = u.name;
      if (u.year)     document.getElementById('uniYear').value     = u.year;
      if (u.grade)    document.getElementById('uniGrade').value    = u.grade;
      if (u.location) document.getElementById('uniLocation').value = u.location;
      if (s.name)     document.getElementById('schoolName').value     = s.name;
      if (s.board)    document.getElementById('schoolBoard').value    = s.board;
      if (s.location) document.getElementById('schoolLocation').value = s.location;
      if (s.year)     document.getElementById('schoolYear').value     = s.year;
      if (s.grade)    document.getElementById('schoolGrade').value    = s.grade;
      trackFilled();
    }

    /* ── Load ── */
    async function loadEducation() {
      const eduSnap = await getDocs(collection(db, 'users', currentUser.uid, 'education'));
      let universityData = null, schoolData = null;

      eduSnap.forEach(docSnap => {
        const entry = docSnap.data();
        if (entry.type === 'university') universityData = entry;
        else if (entry.type === 'school') schoolData = entry;
        else if (entry.university && entry.school) {
          universityData = entry.university;
          schoolData = entry.school;
        }
      });

      if (universityData || schoolData) {
        const combined = { university: universityData || {}, school: schoolData || {} };
        populateInputs(combined);
        renderTimeline(combined);
        return;
      }

      const snap = await getDoc(doc(db, 'users', currentUser.uid, 'education', 'main'));
      if (!snap.exists()) { renderTimeline(null); return; }
      const data = snap.data() || null;
      populateInputs(data);
      renderTimeline(data);
    }

    /* ── Auth ── */
    onAuthStateChanged(auth, async user => {
      if (!user) { window.location.href = 'loginpage.html'; return; }
      currentUser = user;

      // Sidebar avatar
      const name = user.displayName || user.email || 'User';
      const avatar = document.getElementById('spAvatar');
      const spName = document.getElementById('spName');
      if (avatar) avatar.textContent = name.charAt(0).toUpperCase();
      if (spName) spName.textContent = name.split(' ')[0] || name;

      await loadEducation();
      trackFilled();

      const ol = document.getElementById('loadingOverlay');
      ol.style.opacity = '0';
      setTimeout(() => ol.style.display = 'none', 400);
    });

    /* ── Save ── */
    document.getElementById('saveBtn').addEventListener('click', async () => {
      if (!currentUser) return;
      const btn  = document.getElementById('saveBtn');
      const spin = document.getElementById('saveSpin');
      const icon = document.getElementById('saveIcon');
      const txt  = document.getElementById('saveTxt');

      btn.classList.add('loading');
      spin.style.display = 'block';
      icon.style.display = 'none';
      txt.textContent = 'Saving…';

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
        }
      };

      try {
        await setDoc(doc(db, 'users', currentUser.uid, 'education', 'main'), educationData, { merge: true });
        await setDoc(doc(db, 'users', currentUser.uid, 'education', 'university'), {
          type: 'university',
          degree: educationData.university.degree || '',
          institute: educationData.university.name || '',
          year: educationData.university.year || '',
          grade: educationData.university.grade || ''
        });
        await setDoc(doc(db, 'users', currentUser.uid, 'education', 'school'), {
          type: 'school',
          degree: educationData.school.name || '',
          institute: educationData.school.board || '',
          year: educationData.school.year || '',
          grade: educationData.school.grade || ''
        });
        renderTimeline(educationData);
        showToast('Education saved successfully! 🎓');
      } catch (err) {
        console.error(err);
        showToast('Failed to save. Please try again.', true);
      } finally {
        btn.classList.remove('loading');
        spin.style.display = 'none';
        icon.style.display = 'inline';
        txt.textContent = 'Save Education';
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
    document.addEventListener('mousemove', e => {
      cursor.style.left = e.clientX + 'px'; cursor.style.top = e.clientY + 'px';
      ring.style.left   = e.clientX + 'px'; ring.style.top   = e.clientY + 'px';
    });
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