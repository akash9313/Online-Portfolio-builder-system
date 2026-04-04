import { initializeApp }   from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
  import { getAuth, onAuthStateChanged, signOut }
    from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
  import { getFirestore, doc, getDoc, collection, getDocs }
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

  const CIRCUMFERENCE = 2 * Math.PI * 36; // 226.2

  /* ── Toast ── */
  function showToast(msg) {
    const t = document.getElementById('toast');
    document.getElementById('toastMsg').textContent = msg;
    t.classList.add('show');
    setTimeout(() => t.classList.remove('show'), 3200);
  }

  /* ── Checklist data ── */
  const checks = [
    { key: 'profile',   label: 'Profile Completed',  desc: 'Name, role, bio added',      icon: 'fas fa-user' },
    { key: 'skills',    label: 'Skills Added',        desc: 'At least 1 skill listed',    icon: 'fas fa-brain' },
    { key: 'projects',  label: 'Projects Added',      desc: 'At least 1 project listed',  icon: 'fas fa-project-diagram' },
    { key: 'education', label: 'Education Added',     desc: 'Education details provided', icon: 'fas fa-graduation-cap' },
    { key: 'template',  label: 'Template Selected',   desc: 'A portfolio design chosen',  icon: 'fas fa-palette' },
  ];

  let checkStatus = { profile: false, skills: false, projects: false, education: false, template: false };

  function renderChecklist() {
    const container = document.getElementById('checklist');
    container.innerHTML = checks.map(c => {
      const done = checkStatus[c.key];
      const cls  = done ? 'done' : 'fail';
      const icon = done ? 'fas fa-check' : 'fas fa-times';
      const badge = done ? 'Ready' : 'Pending';
      return `
        <div class="check-item ${cls}">
          <div class="check-icon"><i class="${icon}"></i></div>
          <div class="check-text">
            <strong>${c.label}</strong>
            <span>${c.desc}</span>
          </div>
          <span class="check-badge">${badge}</span>
        </div>`;
    }).join('');
  }

  function updateScore() {
    const done  = Object.values(checkStatus).filter(Boolean).length;
    const total = checks.length;
    const pct   = Math.round((done / total) * 100);
    const offset = CIRCUMFERENCE - (pct / 100) * CIRCUMFERENCE;

    document.getElementById('scoreRingFill').style.strokeDashoffset = offset;
    document.getElementById('scoreNum').textContent = pct + '%';

    const titles = ['Profile Incomplete','Getting Started','Almost Ready!','Looking Great!','Ready to Publish!'];
    const descs  = [
      'Complete your checklist to publish',
      'Keep filling in your details',
      'Just a few more items to go',
      'Almost there — finish the last steps',
      'Everything looks great. Go live!'
    ];
    const idx = pct === 100 ? 4 : pct >= 80 ? 3 : pct >= 60 ? 2 : pct >= 30 ? 1 : 0;
    document.getElementById('scoreTitle').textContent = titles[idx];
    document.getElementById('scoreDesc').textContent  = descs[idx];

    const btn  = document.getElementById('publishBtn');
    const note = document.getElementById('publishNote');
    if (pct === 100) {
      btn.disabled = false;
      note.innerHTML = '<i class="fas fa-check-circle"></i> All checks passed. Ready to go live!';
    } else {
      btn.disabled = true;
      note.innerHTML = `<i class="fas fa-shield-alt"></i> Complete ${total - done} more item${total - done > 1 ? 's' : ''} to enable publishing.`;
    }
  }

  /* ── Visibility selector ── */
  document.querySelectorAll('.vis-option').forEach(opt => {
    opt.addEventListener('click', () => {
      document.querySelectorAll('.vis-option').forEach(o => o.classList.remove('active'));
      opt.classList.add('active');
    });
  });

  /* ── Slug input cleanup ── */
  document.getElementById('slugInput').addEventListener('input', e => {
    e.target.value = e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '');
  });

  /* ── Publish button ── */
  document.getElementById('publishBtn').addEventListener('click', async () => {
    const btn = document.getElementById('publishBtn');
    btn.classList.add('loading'); btn.disabled = true;

    await new Promise(r => setTimeout(r, 1800)); // simulate deploy

    btn.classList.remove('loading');
    btn.classList.add('published');
    btn.innerHTML = '<i class="fas fa-check"></i>&nbsp; Published!';

    localStorage.setItem('portfolioStatus', 'published');
    showPublicLink();
    showToast('🎉 Your portfolio is now live!');
  });

  function showPublicLink() {
    const slug = document.getElementById('slugInput').value ||
      (localStorage.getItem('email') || 'user').split('@')[0].replace(/[^a-z0-9]/gi,'').toLowerCase();
    const url = `https://portfoliox.web.app/${slug}`;
    document.getElementById('linkInput').value = url;
    document.getElementById('liveLinkCard').classList.add('show');

    // Share buttons
    document.getElementById('shareTwitter').onclick  = () =>
      window.open(`https://twitter.com/intent/tweet?text=Check+out+my+portfolio!&url=${encodeURIComponent(url)}`,'_blank');
    document.getElementById('shareLinkedIn').onclick = () =>
      window.open(`https://www.linkedin.com/shareArticle?url=${encodeURIComponent(url)}`,'_blank');
    document.getElementById('shareWhatsapp').onclick = () =>
      window.open(`https://wa.me/?text=${encodeURIComponent('Check out my portfolio: ' + url)}`,'_blank');
  }

  /* ── Copy ── */
  document.getElementById('copyBtn').addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(document.getElementById('linkInput').value);
      showToast('Portfolio link copied! 📋');
    } catch { showToast('Please copy the link manually.'); }
  });

  /* ── Firebase Auth + Data ── */
  onAuthStateChanged(auth, async user => {
    if (!user) { window.location.href = 'loginpage.html'; return; }

    const email = user.email || '';
    const slug  = email.split('@')[0].replace(/[^a-z0-9]/gi,'').toLowerCase();
    document.getElementById('slugInput').value = slug;

    // Profile check
    const profileSnap = await getDoc(doc(db, 'users', user.uid));
    if (profileSnap.exists()) {
      const d = profileSnap.data();
      checkStatus.profile = !!(d.fullName && d.role && d.about);
    }

    // Sub-collections
    const [skillsSnap, projSnap, eduSnap] = await Promise.all([
      getDocs(collection(db, 'users', user.uid, 'skills')),
      getDocs(collection(db, 'users', user.uid, 'projects')),
      getDocs(collection(db, 'users', user.uid, 'education')),
    ]);
    checkStatus.skills    = skillsSnap.size > 0;
    checkStatus.projects  = projSnap.size > 0;
    checkStatus.education = eduSnap.size > 0;

    document.getElementById('statSkills').textContent   = skillsSnap.size;
    document.getElementById('statProjects').textContent = projSnap.size;
    document.getElementById('statEdu').textContent      = eduSnap.size;

    // Template
    const template = localStorage.getItem('finalTemplate');
    checkStatus.template = !!template;
    if (template) {
      document.getElementById('templateNameEl').textContent = template;
    }

    renderChecklist();
    updateScore();

    // If already published
    if (localStorage.getItem('portfolioStatus') === 'published') {
      const btn = document.getElementById('publishBtn');
      btn.classList.add('published');
      btn.innerHTML = '<i class="fas fa-check"></i>&nbsp; Published!';
      btn.disabled = true;
      showPublicLink();
    }
  });

  /* ── Logout ── */
  document.getElementById('logoutBtn').addEventListener('click', async () => {
    await signOut(auth);
    localStorage.clear();
    window.location.href = 'loginpage.html';
  });