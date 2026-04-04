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

  /* ─ Toast ─ */
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

  /* ─ Completion ring ─ */
  const FIELDS = [
    { id: 'fullName', label: 'Name' },
    { id: 'phone',    label: 'Phone' },
    { id: 'location', label: 'Location' },
    { id: 'role',     label: 'Role' },
    { id: 'about',    label: 'About' },
    { id: 'github',   label: 'GitHub' },
    { id: 'linkedin', label: 'LinkedIn' },
  ];
  const CIRCUMFERENCE = 2 * Math.PI * 26; // ≈ 163.36

  function updateCompletion() {
    const filled = FIELDS.filter(f => document.getElementById(f.id)?.value.trim());
    const pct    = Math.round((filled.length / FIELDS.length) * 100);
    const offset = CIRCUMFERENCE - (pct / 100) * CIRCUMFERENCE;

    document.getElementById('ringFill').style.strokeDashoffset = offset;
    document.getElementById('ringLabel').textContent = pct + '%';

    const msgs = [
      'Fill in all fields to complete your profile',
      'Great start — keep going!',
      'Almost there, you\'re doing great!',
      '🎉 Profile complete!'
    ];
    const idx = pct === 100 ? 3 : pct >= 70 ? 2 : pct >= 30 ? 1 : 0;
    document.getElementById('completionMsg').textContent = msgs[idx];

    document.getElementById('completionChips').innerHTML = FIELDS.map(f => {
      const done = document.getElementById(f.id)?.value.trim();
      return `<span class="chip ${done ? 'done' : 'pending'}">${done ? '✓' : '○'} ${f.label}</span>`;
    }).join('');
  }

  /* ─ Avatar upload ─ */
  document.getElementById('avatarInput').addEventListener('change', e => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      document.getElementById('avatarEl').innerHTML = `<img src="${ev.target.result}" alt="avatar">`;
    };
    reader.readAsDataURL(file);
  });

  /* ─ Char count ─ */
  const aboutEl     = document.getElementById('about');
  const charCountEl = document.getElementById('charCount');
  aboutEl.addEventListener('input', () => {
    const len = aboutEl.value.length;
    charCountEl.textContent = `${len} / 500`;
    charCountEl.className   = 'char-count' + (len > 480 ? ' over' : len > 420 ? ' warn' : '');
    updateCompletion();
  });

  /* ─ Live hero preview ─ */
  document.getElementById('fullName').addEventListener('input', e => {
    document.getElementById('heroName').textContent = e.target.value || 'Your Name';
    updateCompletion();
  });
  document.getElementById('role').addEventListener('input', e => {
    document.getElementById('heroRole').textContent = e.target.value || 'Your Role';
    updateCompletion();
  });
  document.getElementById('location').addEventListener('input', e => {
    document.getElementById('heroLocation').textContent = e.target.value || 'Location';
    updateCompletion();
  });
  ['phone','github','linkedin'].forEach(id => {
    document.getElementById(id)?.addEventListener('input', updateCompletion);
  });

  /* ─ Auth ─ */
  let savedData = {};

  onAuthStateChanged(auth, async user => {
    if (!user) { window.location.href = 'loginpage.html'; return; }

    document.getElementById('email').value = user.email;
    const av = document.getElementById('avatarEl');
    av.textContent = user.email.charAt(0).toUpperCase();

    /* Load profile */
    const snap = await getDoc(doc(db, 'users', user.uid));
    if (snap.exists()) {
      const d = snap.data();
      savedData = d;
      const keys = ['fullName','phone','location','role','about','github','linkedin','twitter','dribbble','website'];
      keys.forEach(k => { if (d[k]) document.getElementById(k).value = d[k]; });

      document.getElementById('heroName').textContent     = d.fullName || 'Your Name';
      document.getElementById('heroRole').textContent     = d.role     || 'Your Role';
      document.getElementById('heroLocation').textContent = d.location || 'Location';

      const len = (d.about || '').length;
      charCountEl.textContent = `${len} / 500`;
    }

    /* Load counts */
    const [skillsSnap, projSnap, eduSnap] = await Promise.all([
      getDocs(collection(db, 'users', user.uid, 'skills')),
      getDocs(collection(db, 'users', user.uid, 'projects')),
      getDocs(collection(db, 'users', user.uid, 'education')),
    ]);
    document.getElementById('statSkills').textContent   = skillsSnap.size;
    document.getElementById('statProjects').textContent = projSnap.size;
    document.getElementById('statEdu').textContent      = eduSnap.size;

    updateCompletion();

    const ol = document.getElementById('loadingOverlay');
    ol.style.opacity = '0';
    setTimeout(() => ol.style.display = 'none', 400);
  });

  /* ─ Save ─ */
  document.getElementById('profileForm').addEventListener('submit', async e => {
    e.preventDefault();
    const user = auth.currentUser;
    if (!user) return;

    const btn = document.getElementById('saveBtn');
    btn.classList.add('loading'); btn.disabled = true;

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
      await setDoc(doc(db, 'users', user.uid), data);
      savedData = { ...data };
      showToast('Profile saved successfully! ✅');
    } catch {
      showToast('Failed to save. Please try again.', true);
    } finally {
      btn.classList.remove('loading'); btn.disabled = false;
    }
  });

  /* ─ Discard ─ */
  document.getElementById('cancelBtn').addEventListener('click', () => {
    const keys = ['fullName','phone','location','role','about','github','linkedin','twitter','dribbble','website'];
    keys.forEach(k => {
      const el = document.getElementById(k);
      if (el) el.value = savedData[k] || '';
    });
    document.getElementById('heroName').textContent     = savedData.fullName || 'Your Name';
    document.getElementById('heroRole').textContent     = savedData.role     || 'Your Role';
    document.getElementById('heroLocation').textContent = savedData.location || 'Location';
    const len = (savedData.about || '').length;
    charCountEl.textContent = `${len} / 500`;
    updateCompletion();
    showToast('Changes discarded.');
  });

  /* ─ Logout ─ */
  document.getElementById('logoutBtn').addEventListener('click', async () => {
    await signOut(auth);
    localStorage.clear();
    window.location.href = 'loginpage.html';
  });