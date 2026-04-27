import { initializeApp }   from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
    import { getAuth, onAuthStateChanged, signOut }
      from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
    import { getFirestore, doc, getDoc }
      from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
    import { firebaseConfig } from "./firebase-config.js";

    const app  = initializeApp(firebaseConfig);
    const auth = getAuth(app);
    const db   = getFirestore(app);

    const templateMap = {
      'Classic Developer':   'templates/classic.html',
      'Modern Professional': 'templates/modern.html',
      'Creative Designer':   'templates/creative.html',
      'Minimal Resume':      'templates/minimal.html',
      'Neon Dark':           'templates/neon-dark.html',
      'Glass Morph':         'templates/glass-morph.html',
      'Terminal Hacker':     'templates/terminal-hacker.html',
      'Gradient Splash':     'templates/gradient-splash.html',
      'Executive Pro':       'templates/executive-pro.html',
      'Bento Grid':          'templates/bento-grid.html',
      '3D Modern':           'templates/3D_Modern.html',
      '3D Classic':          'templates/3D_classic.html'
    };

    const iframe        = document.getElementById('previewIframe');
    const overlay       = document.getElementById('iframeOverlay');
    const controlBar    = document.getElementById('controlBar');
    const browserArea   = document.getElementById('browserArea');
    const emptyState    = document.getElementById('emptyState');
    const browserChrome = document.getElementById('browserChrome');
    const loadBar       = document.getElementById('loadBar');

    let currentZoom    = 1;
    let isReadOnly     = false;
    let currentSrc     = '';
    let currentVp      = 'desktop';
    let selectedTpl    = '';
    let portfolioUrl   = '';

    /* ── Toast ── */
    function showToast(msg, type='') {
      const t = document.getElementById('toast');
      document.getElementById('toastMsg').textContent = msg;
      document.getElementById('toastIcon').className  = type === 'warn' ? 'fas fa-exclamation-triangle' : 'fas fa-check-circle';
      t.className = 'toast' + (type ? ' ' + type : '');
      void t.offsetWidth;
      t.classList.add('show');
      setTimeout(() => t.classList.remove('show'), 3200);
    }

    /* ── Load iframe ── */
    function loadIframe(src) {
      currentSrc = src;
      overlay.classList.remove('hidden');
      document.getElementById('overlayText').textContent = 'Loading preview…';
      loadBar.classList.add('loading');
      iframe.src = src;
      iframe.onload = () => {
        setTimeout(() => {
          overlay.classList.add('hidden');
          loadBar.classList.remove('loading');
          document.getElementById('loadFill').style.width = '100%';
          setTimeout(() => document.getElementById('loadFill').style.width = '0%', 600);
        }, 450);
      };
    }

    /* ── Apply zoom ── */
    function applyZoom(z) {
      currentZoom = Math.max(0.4, Math.min(1.5, z));
      document.getElementById('zoomVal').textContent = Math.round(currentZoom * 100) + '%';
      if (currentZoom < 1) {
        iframe.style.transform       = `scale(${currentZoom})`;
        iframe.style.width           = `${100 / currentZoom}%`;
        iframe.style.height          = `${100 / currentZoom}%`;
        iframe.style.transformOrigin = 'top left';
      } else {
        iframe.style.transform = `scale(${currentZoom})`;
        iframe.style.width     = '100%';
        iframe.style.height    = '100%';
        iframe.style.transformOrigin = 'top left';
      }
    }

    let currentUid = '';

    /* ── Auth + Init ── */
    onAuthStateChanged(auth, async user => {
      if (!user) { window.location.href = 'loginpage.html'; return; }

      currentUid = user.uid;

      // Load profile
      const snap = await getDoc(doc(db, 'users', user.uid));
      let userName = user.email.split('@')[0];
      if (snap.exists()) {
        const d = snap.data();
        if (d.fullName) userName = d.fullName;
      }
      document.getElementById('spName').textContent   = userName;
      document.getElementById('spAvatar').textContent = userName.charAt(0).toUpperCase();

      // Build portfolio URL slug
      const slug = userName.toLowerCase().replace(/\s+/g, '-');
      portfolioUrl = `portfoliox.app/u/${slug}`;
      document.getElementById('urlBarText').textContent  = portfolioUrl;
      document.getElementById('shareUrlText').textContent = portfolioUrl;

      // Share links
      const encoded = encodeURIComponent('https://' + portfolioUrl);
      document.getElementById('shareLinkedIn').href  = `https://www.linkedin.com/sharing/share-offsite/?url=${encoded}`;
      document.getElementById('shareTwitter').href   = `https://twitter.com/intent/tweet?url=${encoded}&text=Check+out+my+portfolio!`;
      document.getElementById('shareWhatsApp').onclick = () => window.open(`https://wa.me/?text=Check+out+my+portfolio!+https://${portfolioUrl}`, '_blank');
      document.getElementById('shareEmail').onclick    = () => window.location.href = `mailto:?subject=My+Portfolio&body=https://${portfolioUrl}`;

      // Check template — prefer templateFile from Firestore, fall back to templateMap
      if (snap.exists()) {
        const d = snap.data();
        selectedTpl = d.template || '';
      }

      if (!selectedTpl) {
        emptyState.style.display = 'flex';
      } else {
        controlBar.style.display  = 'flex';
        browserArea.style.display = 'flex';
        document.getElementById('navLiveBadge').style.display    = 'flex';
        document.getElementById('sidebarTplCard').style.display  = 'block';
        document.getElementById('stcName').textContent           = selectedTpl;
        document.getElementById('tplPillName').textContent       = selectedTpl;

        const file = templateMap[selectedTpl] || 'templates/classic.html';
        // Always pass uid so the template loads the user's real data
        loadIframe(`${file}?uid=${encodeURIComponent(currentUid)}&mode=readonly`);
      }

      // Hide loader
      const ol = document.getElementById('loadingOverlay');
      ol.style.opacity = '0';
      setTimeout(() => ol.style.display = 'none', 400);
    });

    /* ── Viewport ── */
    document.querySelectorAll('.vp-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.vp-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentVp = btn.dataset.vp;
        browserChrome.className = `browser-chrome vp-${currentVp}`;
        const wrap = document.getElementById('iframeWrap');
        if (currentVp === 'mobile')      { wrap.style.minHeight = '844px'; }
        else if (currentVp === 'tablet') { wrap.style.minHeight = '1024px'; }
        else                             { wrap.style.minHeight = ''; }
        showToast(`Switched to ${currentVp} view`);
      });
    });

    /* ── Zoom ── */
    const ZOOM_STEPS = [0.4, 0.5, 0.6, 0.75, 0.85, 1, 1.1, 1.25, 1.5];
    function stepZoom(dir) {
      const idx  = ZOOM_STEPS.findIndex(z => Math.abs(z - currentZoom) < 0.01);
      const next = dir === 'in' ? ZOOM_STEPS[Math.min(idx+1, ZOOM_STEPS.length-1)] : ZOOM_STEPS[Math.max(idx-1, 0)];
      applyZoom(next);
    }
    document.getElementById('zoomIn') .addEventListener('click', () => stepZoom('in'));
    document.getElementById('zoomOut').addEventListener('click', () => stepZoom('out'));

    /* ── Read-only ── */
    document.getElementById('roToggle').addEventListener('click', () => {
      isReadOnly = !isReadOnly;
      document.getElementById('roToggle').classList.toggle('on', isReadOnly);
      const base = currentSrc.split('?')[0];
      loadIframe(isReadOnly ? `${base}?mode=readonly` : base);
      showToast(isReadOnly ? 'Read-only mode on' : 'Interactive mode on');
    });

    /* ── Refresh ── */
    function doRefresh() {
      const btn = document.getElementById('refreshBtn');
      btn.classList.add('spinning');
      setTimeout(() => btn.classList.remove('spinning'), 650);
      overlay.classList.remove('hidden');
      loadBar.classList.add('loading');
      iframe.src = iframe.src;
      iframe.onload = () => setTimeout(() => { overlay.classList.add('hidden'); loadBar.classList.remove('loading'); }, 450);
      showToast('Preview refreshed');
    }
    document.getElementById('refreshBtn').addEventListener('click', doRefresh);
    document.getElementById('reloadBtn') .addEventListener('click', doRefresh);

    /* ── Browser URL bar copy ── */
    function copyUrl() {
      navigator.clipboard.writeText('https://' + portfolioUrl).catch(() => {});
      showToast('URL copied to clipboard!');
    }
    document.getElementById('urlBar')   .addEventListener('click', copyUrl);
    document.getElementById('copyUrlBtn').addEventListener('click', copyUrl);

    /* ── New tab ── */
    document.getElementById('newTabBtn').addEventListener('click', () => {
      if (currentSrc) window.open(currentSrc, '_blank');
    });
    document.getElementById('openTabBtn').addEventListener('click', () => {
      if (currentSrc) window.open(currentSrc, '_blank');
      else showToast('Select a template first', 'warn');
    });

    /* ── Nav back/fwd (just navigate iframe history) ── */
    document.getElementById('backBtn').addEventListener('click', () => {
      try { iframe.contentWindow.history.back(); } catch(e) {}
    });
    document.getElementById('fwdBtn').addEventListener('click', () => {
      try { iframe.contentWindow.history.forward(); } catch(e) {}
    });

    /* ── Fullscreen dot ── */
    document.getElementById('fullscreenDot').addEventListener('click', () => {
      const wrap = document.getElementById('iframeWrap');
      if (!document.fullscreenElement) wrap.requestFullscreen?.();
      else document.exitFullscreen?.();
    });

    /* ── Share modal ── */
    document.getElementById('shareBtn').addEventListener('click', () => {
      document.getElementById('shareModal').classList.add('open');
    });
    document.getElementById('closeShareModal').addEventListener('click', () => {
      document.getElementById('shareModal').classList.remove('open');
    });
    document.getElementById('shareModal').addEventListener('click', e => {
      if (e.target === document.getElementById('shareModal'))
        document.getElementById('shareModal').classList.remove('open');
    });
    document.getElementById('copyShareUrl').addEventListener('click', () => {
      navigator.clipboard.writeText('https://' + portfolioUrl).catch(() => {});
      showToast('Link copied!');
    });

    /* ── Copy URL chip button ── */
    document.getElementById('copyUrlBtn').addEventListener('click', copyUrl);

    /* ── Logout ── */
    document.getElementById('logoutBtn').addEventListener('click', async () => {
      await signOut(auth);
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
      document.getElementById('navbar').classList.toggle('scrolled', window.scrollY > 10);
    });