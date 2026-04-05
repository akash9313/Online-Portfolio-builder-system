import { initializeApp }   from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
  import { getAuth, onAuthStateChanged, signOut }
    from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
  import { getFirestore, doc, getDoc, setDoc, getDocs, collection, query, where, serverTimestamp }
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

  const CIRCUMFERENCE = 226.2;
  let currentUser = null;

  /* ── Toast ── */
  function showToast(msg, type = 'success') {
    const t = document.getElementById('toast');
    const icon = document.getElementById('toastIcon');
    document.getElementById('toastMsg').textContent = msg;
    icon.className = type === 'error' ? 'fas fa-times-circle' : 'fas fa-check-circle';
    icon.style.color = type === 'error' ? 'var(--danger)' : 'var(--accent-3)';
    t.classList.add('show');
    setTimeout(() => t.classList.remove('show'), 3500);
  }

  /* ── Checklist ── */
  const checks = [
    { key:'profile',   label:'Profile Completed',  desc:'Name, role, bio added' },
    { key:'skills',    label:'Skills Added',        desc:'At least 1 skill listed' },
    { key:'projects',  label:'Projects Added',      desc:'At least 1 project listed' },
    { key:'education', label:'Education Added',     desc:'Education details provided' },
    { key:'template',  label:'Template Selected',   desc:'A portfolio design chosen' },
  ];
  let checkStatus = { profile:false, skills:false, projects:false, education:false, template:false };

  function renderChecklist() {
    document.getElementById('checklist').innerHTML = checks.map(c => {
      const done = checkStatus[c.key];
      return `<div class="check-item ${done?'done':'fail'}">
        <div class="check-icon"><i class="${done?'fas fa-check':'fas fa-times'}"></i></div>
        <div class="check-text"><strong>${c.label}</strong><span>${c.desc}</span></div>
        <span class="check-badge">${done?'Ready':'Pending'}</span>
      </div>`;
    }).join('');
  }

  function updateScore() {
    const done  = Object.values(checkStatus).filter(Boolean).length;
    const total = checks.length;
    const pct   = Math.round((done/total)*100);
    document.getElementById('scoreRingFill').style.strokeDashoffset = CIRCUMFERENCE - (pct/100)*CIRCUMFERENCE;
    document.getElementById('scoreNum').textContent = pct+'%';
    const titles = ['Profile Incomplete','Getting Started','Almost Ready!','Looking Great!','Ready to Publish!'];
    const descs  = ['Complete your checklist to publish','Keep filling in your details','Just a few more items to go','Almost there — finish the last steps','Everything looks great. Go live!'];
    const idx = pct===100?4:pct>=80?3:pct>=60?2:pct>=30?1:0;
    document.getElementById('scoreTitle').textContent = titles[idx];
    document.getElementById('scoreDesc').textContent  = descs[idx];
    const btn  = document.getElementById('publishBtn');
    const note = document.getElementById('publishNote');
    if (pct===100) {
      btn.disabled = false;
      note.innerHTML = '<i class="fas fa-check-circle"></i> All checks passed. Ready to go live!';
    } else {
      btn.disabled = true;
      note.innerHTML = `<i class="fas fa-shield-alt"></i> Complete ${total-done} more item${total-done>1?'s':''} to enable publishing.`;
    }
  }

  /* ── Visibility selector ── */
  document.querySelectorAll('.vis-option').forEach(opt => {
    opt.addEventListener('click', () => {
      document.querySelectorAll('.vis-option').forEach(o => o.classList.remove('active'));
      opt.classList.add('active');
    });
  });

  /* ── Slug validation ── */
  let slugTimer = null;
  const slugInput  = document.getElementById('slugInput');
  const slugStatus = document.getElementById('slugStatus');

  slugInput.addEventListener('input', e => {
    e.target.value = e.target.value.toLowerCase().replace(/[^a-z0-9-]/g,'');
    clearTimeout(slugTimer);
    const val = e.target.value.trim();
    if (!val) { slugStatus.className='slug-status'; return; }
    slugStatus.className = 'slug-status checking';
    slugStatus.textContent = 'Checking availability…';
    slugTimer = setTimeout(() => checkSlug(val), 700);
  });

  async function checkSlug(slug) {
    if (!currentUser) return;
    try {
      // Check if another user already has this username
      const q = query(collection(db,'users'), where('username','==',slug));
      const snap = await getDocs(q);
      const takenByOther = snap.docs.some(d => d.id !== currentUser.uid);
      if (takenByOther) {
        slugStatus.className = 'slug-status taken';
        slugStatus.textContent = `✗ "${slug}" is already taken`;
      } else {
        slugStatus.className = 'slug-status available';
        slugStatus.textContent = `✓ "${slug}" is available!`;
      }
    } catch { slugStatus.className='slug-status'; }
  }

  /* ── Publish ── */
  document.getElementById('publishBtn').addEventListener('click', async () => {
    const btn  = document.getElementById('publishBtn');
    const slug = slugInput.value.trim();

    if (!slug) { showToast('Please enter a URL slug first', 'error'); return; }

    // Final slug conflict check
    const q = query(collection(db,'users'), where('username','==',slug));
    const snap = await getDocs(q);
    const takenByOther = snap.docs.some(d => d.id !== currentUser.uid);
    if (takenByOther) { showToast(`"${slug}" is already taken. Choose another.`, 'error'); return; }

    btn.classList.add('loading'); btn.disabled = true;

    try {
      const template    = localStorage.getItem('finalTemplate') || 'Classic Developer';
      const visibility  = document.querySelector('.vis-option.active')?.dataset.vis || 'public';
      const templateMap = {
        'Classic Developer':   'templates/classic.html',
        'Modern Professional': 'templates/modern.html',
        'Creative Designer':   'templates/creative.html',
        'Minimal Resume':      'templates/minimal.html',
      };

      // ✅ WRITE username, template, visibility & published status to Firestore
      await setDoc(doc(db,'users',currentUser.uid), {
        username:        slug,
        template:        template,
        templateFile:    templateMap[template] || 'templates/classic.html',
        visibility:      visibility,
        published:       true,
        publishedAt:     serverTimestamp(),
        updatedAt:       serverTimestamp(),
      }, { merge: true });  // merge:true so we don't overwrite profile fields

      localStorage.setItem('portfolioStatus', 'published');
      localStorage.setItem('portfolioSlug',   slug);

      btn.classList.remove('loading');
      btn.classList.add('published');
      btn.innerHTML = '<i class="fas fa-check"></i>&nbsp; Published!';

      showPublicLink(slug);
      showToast('🎉 Your portfolio is now live!');

    } catch (err) {
      console.error(err);
      showToast('Publish failed: ' + err.message, 'error');
      btn.classList.remove('loading'); btn.disabled = false;
    }
  });

  /* ── Show public link ── */
  function showPublicLink(slug) {
    const url = `https://portfoliox.web.app/u/${slug}`;
    document.getElementById('linkInput').value = url;
    document.getElementById('liveLinkCard').classList.add('show');
    document.getElementById('shareTwitter').onclick  = () => window.open(`https://twitter.com/intent/tweet?text=Check+out+my+portfolio!&url=${encodeURIComponent(url)}`,'_blank');
    document.getElementById('shareLinkedIn').onclick = () => window.open(`https://www.linkedin.com/shareArticle?url=${encodeURIComponent(url)}`,'_blank');
    document.getElementById('shareWhatsapp').onclick = () => window.open(`https://wa.me/?text=${encodeURIComponent('Check out my portfolio: '+url)}`,'_blank');
  }

  /* ── Copy ── */
  document.getElementById('copyBtn').addEventListener('click', async () => {
    try { await navigator.clipboard.writeText(document.getElementById('linkInput').value); showToast('Link copied! 📋'); }
    catch { showToast('Please copy manually.'); }
  });

  /* ── Auth ── */
  onAuthStateChanged(auth, async user => {
    if (!user) { window.location.href='loginpage.html'; return; }
    currentUser = user;

    // Pre-fill slug from Firestore (saved username) or derive from email
    const profileSnap = await getDoc(doc(db,'users',user.uid));
    let slug = '';
    if (profileSnap.exists()) {
      const d = profileSnap.data();
      slug = d.username || user.email.split('@')[0].replace(/[^a-z0-9]/gi,'').toLowerCase();

      checkStatus.profile = !!(d.fullName && d.role && d.about);

      // Restore published state
      if (d.published && d.username) {
        const btn = document.getElementById('publishBtn');
        btn.classList.add('published');
        btn.innerHTML = '<i class="fas fa-check"></i>&nbsp; Published!';
        btn.disabled = true;
        showPublicLink(d.username);
      }
      if (d.template) {
        document.getElementById('templateNameEl').textContent = d.template;
      }
    } else {
      slug = user.email.split('@')[0].replace(/[^a-z0-9]/gi,'').toLowerCase();
    }

    slugInput.value = slug;

    // Sub-collections
    const [skillsSnap, projSnap, eduSnap] = await Promise.all([
      getDocs(collection(db,'users',user.uid,'skills')),
      getDocs(collection(db,'users',user.uid,'projects')),
      getDocs(collection(db,'users',user.uid,'education')),
    ]);
    checkStatus.skills    = skillsSnap.size > 0;
    checkStatus.projects  = projSnap.size > 0;
    checkStatus.education = eduSnap.size > 0;

    document.getElementById('statSkills').textContent   = skillsSnap.size;
    document.getElementById('statProjects').textContent = projSnap.size;
    document.getElementById('statEdu').textContent      = eduSnap.size;

    // Template from localStorage
    const template = localStorage.getItem('finalTemplate');
    checkStatus.template = !!template;
    if (template) document.getElementById('templateNameEl').textContent = template;

    renderChecklist();
    updateScore();
  });

  /* ── Logout ── */
  document.getElementById('logoutBtn').addEventListener('click', async () => {
    await signOut(auth); localStorage.clear(); window.location.href='loginpage.html';
  });