import { initializeApp }     from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
    import { getAuth, onAuthStateChanged, signOut }
      from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
    import { getFirestore, doc, setDoc, getDoc, collection, getDocs }
      from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

    const firebaseConfig = {
      apiKey:            "AIzaSyD4q_KzBCxVtS6mjH6Xh6-Bd1u-21RSNG4",
      authDomain:        "portfoliox-2e787.firebaseapp.com",
      projectId:         "portfoliox-2e787",
      storageBucket:     "portfoliox-2e787.firebasestorage.app",
      messagingSenderId: "562709786891",
      appId:             "1:562709786891:web:2d0f575ab7d3bda5fdf20e"
    };

    const app  = initializeApp(firebaseConfig);
    const auth = getAuth(app);
    const db   = getFirestore(app);

    /* ─ Toast ─ */
    function showToast(msg, isError=false) {
      const t = document.getElementById('toast');
      document.getElementById('toastMsg').textContent = msg;
      document.getElementById('toastIcon').className  = isError ? 'fas fa-times-circle' : 'fas fa-check-circle';
      t.className = 'toast' + (isError ? ' error' : '');
      void t.offsetWidth;
      t.classList.add('show');
      setTimeout(() => t.classList.remove('show'), 3500);
    }

    /* ─ Completion ─ */
    const FIELDS = [
      { id:'fullName', label:'Name'     },
      { id:'phone',    label:'Phone'    },
      { id:'location', label:'Location' },
      { id:'role',     label:'Role'     },
      { id:'about',    label:'About'    },
      { id:'github',   label:'GitHub'   },
      { id:'linkedin', label:'LinkedIn' },
    ];
    const CIRC_CT = 2 * Math.PI * 28; // ≈175.93
    const CIRC_SB = 188.5;

    function updateCompletion() {
      const filled = FIELDS.filter(f => document.getElementById(f.id)?.value.trim());
      const pct    = Math.round((filled.length / FIELDS.length) * 100);
      const offset = CIRC_CT - (pct/100)*CIRC_CT;

      document.getElementById('ctArc').style.strokeDashoffset = offset;
      document.getElementById('ctPct').textContent = pct + '%';
      document.getElementById('ctBarFill').style.width = pct + '%';
      document.getElementById('ctBarPct').textContent  = `${filled.length} / ${FIELDS.length} fields`;

      // nav bar
      document.getElementById('navPFill').style.width = pct + '%';
      document.getElementById('navPText').textContent  = pct + '%';

      // sidebar ring
      const sbOffset = CIRC_SB - (pct/100)*CIRC_SB;
      document.getElementById('sidebarRing').style.strokeDashoffset = sbOffset;
      document.getElementById('sidebarPct').textContent = pct + '%';

      const msgs = [
        'Fill in all fields to complete your profile',
        'Great start — keep going!',
        "Almost there, you're doing great!",
        '🎉 Profile complete — ready to publish!'
      ];
      const idx = pct===100?3:pct>=70?2:pct>=30?1:0;
      document.getElementById('ctMsg').textContent = msgs[idx];

      // chips
      document.getElementById('ctChips').innerHTML = FIELDS.map(f => {
        const done = document.getElementById(f.id)?.value.trim();
        return `<span class="chip ${done?'done':'pending'}">${done?'✓':'○'} ${f.label}</span>`;
      }).join('');

      // personal / social badges
      const pFields = ['fullName','phone','location','role','about'];
      const pFilled = pFields.filter(id => document.getElementById(id)?.value.trim()).length;
      document.getElementById('personalBadge').textContent = `${pFilled} / ${pFields.length}`;
      const sFields = ['github','linkedin','twitter','dribbble'];
      const sFilled = sFields.filter(id => document.getElementById(id)?.value.trim()).length;
      document.getElementById('socialBadge').textContent = `${sFilled} / ${sFields.length}`;

      // hero tags
      updateHeroTags();
    }

    function updateHeroTags() {
      const tagsEl = document.getElementById('heroTags');
      const tags = [];
      if (document.getElementById('github')?.value.trim())   tags.push({i:'fab fa-github',    t:'GitHub'});
      if (document.getElementById('linkedin')?.value.trim()) tags.push({i:'fab fa-linkedin',   t:'LinkedIn'});
      if (document.getElementById('twitter')?.value.trim())  tags.push({i:'fab fa-twitter',    t:'Twitter'});
      if (document.getElementById('dribbble')?.value.trim()) tags.push({i:'fab fa-dribbble',   t:'Dribbble'});
      tagsEl.innerHTML = tags.map(tag=>`<span class="hero-tag"><i class="${tag.i}"></i> ${tag.t}</span>`).join('');
    }

    /* ─ Field status indicators ─ */
    function setFieldStatus(id, type, msg='') {
      const el = document.getElementById('fs-' + id);
      if (!el) return;
      if (!type) { el.className='field-status'; el.textContent=''; return; }
      el.className = `field-status show ${type}`;
      el.innerHTML = type==='ok'
        ? '<i class="fas fa-check-circle"></i>'
        : `<i class="fas fa-exclamation-circle"></i>`;
    }

    /* ─ URL preview ─ */
    function showUrlPreview(inputId, previewId, textId) {
      const val = document.getElementById(inputId)?.value.trim();
      const prev = document.getElementById(previewId);
      const text = document.getElementById(textId);
      if (!prev) return;
      if (val && val.startsWith('http')) {
        prev.classList.add('visible');
        if (text) text.textContent = val;
      } else {
        prev.classList.remove('visible');
      }
    }

    /* ─ Avatar ─ */
    let savedAvatarSrc = null;
    document.getElementById('avatarInput').addEventListener('change', e => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = ev => {
        document.getElementById('avatarEl').innerHTML = `<img src="${ev.target.result}" alt="avatar">`;
        document.getElementById('spAvatar').innerHTML = `<img src="${ev.target.result}" alt="avatar">`;
        markDirty();
      };
      reader.readAsDataURL(file);
    });

    /* ─ Char count ─ */
    const aboutEl = document.getElementById('about');
    const charEl  = document.getElementById('charCount');
    aboutEl.addEventListener('input', () => {
      const len = aboutEl.value.length;
      charEl.textContent = `${len} / 500`;
      charEl.className = 'char-count' + (len>480?' over':len>420?' warn':'');
      updateCompletion(); markDirty();
    });

    /* ─ Live hero preview + field tracking ─ */
    document.getElementById('fullName').addEventListener('input', e => {
      document.getElementById('heroName').textContent = e.target.value || 'Your Name';
      document.getElementById('spName').textContent   = e.target.value || 'Loading…';
      setFieldStatus('fullName', e.target.value.trim() ? 'ok' : null);
      updateCompletion(); markDirty();
    });
    document.getElementById('role').addEventListener('input', e => {
      document.getElementById('heroRole').textContent = e.target.value || 'Your Role';
      setFieldStatus('role', e.target.value.trim() ? 'ok' : null);
      updateCompletion(); markDirty();
    });
    document.getElementById('location').addEventListener('input', e => {
      document.getElementById('heroLoc').textContent = e.target.value || 'Location';
      setFieldStatus('location', e.target.value.trim() ? 'ok' : null);
      updateCompletion(); markDirty();
    });
    document.getElementById('phone').addEventListener('input', e => {
      setFieldStatus('phone', e.target.value.trim() ? 'ok' : null);
      updateCompletion(); markDirty();
    });
    document.getElementById('website').addEventListener('input', e => {
      showUrlPreview('website','websitePreview','websitePreviewText');
      setFieldStatus('website', e.target.value.trim() ? 'ok' : null);
      markDirty();
    });

    ['github','linkedin','twitter','dribbble'].forEach(id => {
      document.getElementById(id)?.addEventListener('input', e => {
        showUrlPreview(id, id+'Preview', id+'PreviewText');
        setFieldStatus(id, e.target.value.trim() ? 'ok' : null);
        updateCompletion(); markDirty();
      });
    });

    /* ─ Unsaved bar ─ */
    let isDirty = false;
    let savedData = {};

    function markDirty() {
      if (!isDirty) {
        isDirty = true;
        document.getElementById('unsavedBar').classList.add('show');
      }
    }
    function clearDirty() {
      isDirty = false;
      document.getElementById('unsavedBar').classList.remove('show');
    }

    /* ─ Auth ─ */
    onAuthStateChanged(auth, async user => {
      if (!user) { window.location.href = 'loginpage.html'; return; }

      document.getElementById('email').value = user.email;
      const initial = user.email.charAt(0).toUpperCase();
      document.getElementById('avatarEl').textContent = initial;
      document.getElementById('spAvatar').textContent = initial;

      /* Load profile */
      const snap = await getDoc(doc(db, 'users', user.uid));
      if (snap.exists()) {
        const d = snap.data();
        savedData = d;
        const keys = ['fullName','phone','location','role','about','github','linkedin','twitter','dribbble','website'];
        keys.forEach(k => { if (d[k]) { document.getElementById(k).value = d[k]; } });

        document.getElementById('heroName').textContent = d.fullName || 'Your Name';
        document.getElementById('heroRole').textContent = d.role     || 'Your Role';
        document.getElementById('heroLoc').textContent  = d.location || 'Location';
        document.getElementById('spName').textContent   = d.fullName || user.email.split('@')[0];

        const len = (d.about||'').length;
        charEl.textContent = `${len} / 500`;

        // Field statuses
        ['fullName','phone','location','role','website','github','linkedin','twitter','dribbble'].forEach(id => {
          if (d[id]) setFieldStatus(id, 'ok');
        });

        ['website','github','linkedin'].forEach(id => {
          showUrlPreview(id, id+'Preview', id+'PreviewText');
        });
      } else {
        document.getElementById('spName').textContent = user.email.split('@')[0];
      }

      /* Counts */
      const [sk, pr, ed] = await Promise.all([
        getDocs(collection(db,'users',user.uid,'skills')),
        getDocs(collection(db,'users',user.uid,'projects')),
        getDocs(collection(db,'users',user.uid,'education')),
      ]);
      ['hsgSkills','navSkills'].forEach(id => document.getElementById(id).textContent = sk.size);
      ['hsgProjects','navProjects'].forEach(id => document.getElementById(id).textContent = pr.size);
      ['hsgEdu','navEdu'].forEach(id => document.getElementById(id).textContent = ed.size);

      updateCompletion();

      /* Hide loader */
      const ol = document.getElementById('loadingOverlay');
      ol.style.opacity = '0';
      setTimeout(() => ol.style.display='none', 400);
    });

    /* ─ Save ─ */
    async function saveProfile() {
      const user = auth.currentUser;
      if (!user) return;

      const btn     = document.getElementById('saveBtn');
      const spinner = document.getElementById('saveSpinner');
      btn.disabled  = true;
      spinner.style.display = 'block';

      const data = {
        fullName: document.getElementById('fullName').value,
        email:    user.email,
        phone:    document.getElementById('phone').value,
        about:    document.getElementById('about').value,
        location: document.getElementById('location').value,
        role:     document.getElementById('role').value,
        github:   document.getElementById('github').value,
        linkedin: document.getElementById('linkedin').value,
        twitter:  document.getElementById('twitter').value,
        dribbble: document.getElementById('dribbble').value,
        website:  document.getElementById('website').value,
        updatedAt: new Date()
      };

      try {
        await setDoc(doc(db,'users',user.uid), data);
        savedData = { ...data };
        clearDirty();
        showToast('Profile saved successfully! ✅');
      } catch {
        showToast('Failed to save. Please try again.', true);
      } finally {
        btn.disabled = false;
        spinner.style.display = 'none';
      }
    }

    document.getElementById('saveBtn').addEventListener('click', saveProfile);
    document.getElementById('ubSave').addEventListener('click',  saveProfile);

    /* ─ Discard ─ */
    function discardChanges() {
      const keys = ['fullName','phone','location','role','about','github','linkedin','twitter','dribbble','website'];
      keys.forEach(k => {
        const el = document.getElementById(k);
        if (el) el.value = savedData[k] || '';
      });
      document.getElementById('heroName').textContent = savedData.fullName || 'Your Name';
      document.getElementById('heroRole').textContent = savedData.role     || 'Your Role';
      document.getElementById('heroLoc').textContent  = savedData.location || 'Location';
      charEl.textContent = `${(savedData.about||'').length} / 500`;
      updateCompletion();
      clearDirty();
      showToast('Changes discarded.');
    }
    document.getElementById('cancelBtn').addEventListener('click', discardChanges);
    document.getElementById('ubDiscard').addEventListener('click', discardChanges);

    /* ─ Logout ─ */
    document.getElementById('logoutBtn').addEventListener('click', async () => {
      await signOut(auth);
      localStorage.clear();
      window.location.href = 'loginpage.html';
    });
 
    /* ─ Cursor ─ */
    const cursor = document.getElementById('cursor');
    const ring   = document.getElementById('cursorRing');
    document.addEventListener('mousemove', e => {
      cursor.style.left = e.clientX + 'px'; cursor.style.top = e.clientY + 'px';
      ring.style.left   = e.clientX + 'px'; ring.style.top   = e.clientY + 'px';
    });

    /* ─ Navbar scroll ─ */
    window.addEventListener('scroll', () => {
      document.getElementById('navbar').classList.toggle('scrolled', window.scrollY > 20);
    });

    /* ─ Reveal on scroll ─ */
    const obs = new IntersectionObserver(entries => {
      entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('visible'); });
    }, { threshold: 0.07 });
    document.querySelectorAll('.reveal').forEach(el => obs.observe(el));