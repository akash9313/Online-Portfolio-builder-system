const selectedTemplate = localStorage.getItem('finalTemplate');

  const templateMap = {
    'Classic Developer':   'templates/classic.html',
    'Modern Professional': 'templates/modern.html',
    'Creative Designer':   'templates/creative.html',
    'Minimal Resume':      'templates/minimal.html'
  };

  const iframe        = document.getElementById('previewIframe');
  const overlay       = document.getElementById('iframeOverlay');
  const controlBar    = document.getElementById('controlBar');
  const browserWrap   = document.getElementById('browserWrap');
  const emptyState    = document.getElementById('emptyState');
  const browserChrome = document.getElementById('browserChrome');
  const templateName  = document.getElementById('templateName');
  const urlBarText    = document.getElementById('urlBarText');

  /* ── Toast ── */
  function showToast(msg) {
    const t = document.getElementById('toast');
    document.getElementById('toastMsg').textContent = msg;
    t.classList.add('show');
    setTimeout(() => t.classList.remove('show'), 3000);
  }

  /* ── Init ── */
  if (!selectedTemplate) {
    emptyState.style.display = 'flex';
  } else {
    controlBar.style.display  = 'flex';
    browserWrap.style.display = 'flex';

    templateName.textContent = selectedTemplate;
    urlBarText.textContent   = `portfoliox.app/u/${selectedTemplate.toLowerCase().replace(/\s+/g,'-')}`;

    const file = templateMap[selectedTemplate] || 'templates/classic.html';
    loadIframe(file);
  }

  /* ── Load iframe ── */
  function loadIframe(src) {
    overlay.classList.remove('hidden');
    iframe.src = src;
    iframe.onload = () => {
      setTimeout(() => overlay.classList.add('hidden'), 400);
    };
  }

  /* ── Viewport toggle ── */
  document.querySelectorAll('.vp-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.vp-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const vp = btn.dataset.vp;
      browserChrome.className = `browser-chrome ${vp}`;

      // Adjust iframe wrap height for mobile/tablet
      const wrap = document.getElementById('iframeWrap');
      if (vp === 'mobile')       wrap.style.minHeight = '844px';
      else if (vp === 'tablet')  wrap.style.minHeight = '1024px';
      else                       wrap.style.minHeight = '';
    });
  });

  /* ── Zoom ── */
  document.getElementById('zoomSelect').addEventListener('change', e => {
    const z = parseFloat(e.target.value);
    iframe.style.transform = `scale(${z})`;
    iframe.style.width     = z < 1 ? `${100 / z}%` : '100%';
    iframe.style.height    = z < 1 ? `${100 / z}%` : '100%';
    iframe.style.transformOrigin = 'top left';
  });

  /* ── Read-only toggle ── */
  let isReadOnly = false;
  document.getElementById('readonlyToggle').addEventListener('click', () => {
    isReadOnly = !isReadOnly;
    document.getElementById('readonlyToggle').classList.toggle('on', isReadOnly);
    const base = iframe.src.split('?')[0];
    loadIframe(isReadOnly ? `${base}?mode=readonly` : base);
    showToast(isReadOnly ? 'Read-only mode enabled' : 'Edit mode enabled');
  });

  /* ── Refresh ── */
  document.getElementById('refreshBtn').addEventListener('click', () => {
    overlay.classList.remove('hidden');
    iframe.src = iframe.src;
    iframe.onload = () => setTimeout(() => overlay.classList.add('hidden'), 400);
    showToast('Preview refreshed');
  });

  /* ── Copy URL ── */
  document.getElementById('copyUrlBtn').addEventListener('click', () => {
    navigator.clipboard.writeText(urlBarText.textContent).catch(() => {});
    showToast('URL copied to clipboard!');
  });

  /* ── Logout ── */
  document.getElementById('logoutBtn').addEventListener('click', () => {
    localStorage.clear();
    window.location.href = 'loginpage.html';
  });