/* ── Cursor ── */
    const cursor = document.getElementById('cursor');
    const ring   = document.getElementById('cursorRing');
    document.addEventListener('mousemove', e => {
      cursor.style.left = e.clientX + 'px'; cursor.style.top = e.clientY + 'px';
      ring.style.left   = e.clientX + 'px'; ring.style.top   = e.clientY + 'px';
    });

    /* ── Navbar scroll ── */
    window.addEventListener('scroll', () => {
      document.getElementById('navbar').classList.toggle('scrolled', window.scrollY > 20);
    });

    /* ── Reveal on scroll ── */
    const revealEls = document.querySelectorAll('.reveal');
    const obs = new IntersectionObserver(entries => {
      entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('visible'); });
    }, { threshold: 0.08 });
    revealEls.forEach(el => obs.observe(el));

    /* ── Toast ── */
    function showToast(msg) {
      const t = document.getElementById('toast');
      document.getElementById('toastMsg').textContent = msg;
      t.classList.add('show');
      setTimeout(() => t.classList.remove('show'), 3000);
    }

    /* ── Apply selection ── */
    function applySelection(name, toast) {
      localStorage.setItem('finalTemplate', name);

      document.querySelectorAll('.template-card').forEach(card => {
        const isThis = card.dataset.template === name;
        card.classList.toggle('selected', isThis);
        const btn = card.querySelector('.btn-select');
        if (isThis) {
          btn.innerHTML = '<i class="fas fa-check"></i> Selected';
          btn.classList.add('selected-btn');
        } else {
          btn.innerHTML = '<i class="fas fa-check"></i> Select Template';
          btn.classList.remove('selected-btn');
        }
      });

      document.getElementById('bannerTemplateName').textContent = name;
      const banner = document.getElementById('selectedBanner');
      banner.classList.remove('hidden');
      banner.classList.add('visible'); // trigger reveal

      if (toast) showToast(`"${name}" template selected ✅`);
    }

    /* ── Restore saved selection ── */
    const saved = localStorage.getItem('finalTemplate');
    if (saved) applySelection(saved, false);

    /* ── Select buttons ── */
    document.querySelectorAll('.btn-select').forEach(btn => {
      btn.addEventListener('click', e => {
        e.stopPropagation();
        applySelection(btn.dataset.template, true);
      });
    });

    /* ── Card click selects ── */
    document.querySelectorAll('.template-card').forEach(card => {
      card.addEventListener('click', () => applySelection(card.dataset.template, true));
    });

    /* ── Filter chips ── */
    document.querySelectorAll('.filter-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        document.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        const filter = chip.dataset.filter;
        document.querySelectorAll('.template-card').forEach(card => {
          const tags = card.dataset.tags || '';
          const show = filter === 'all' || tags.includes(filter);
          card.classList.toggle('hidden-card', !show);
        });
      });
    });

    /* ── Preview button ── */
    document.querySelectorAll('.btn-preview-card').forEach(btn => {
      btn.addEventListener('click', e => {
        e.stopPropagation();
        showToast('Preview coming soon! 👀');
      });
    });

    /* ── Logout ── */
    document.getElementById('logoutBtn').addEventListener('click', () => {
      localStorage.clear();
      window.location.href = 'loginpage.html';
    });

    /* ── Sidebar avatar from localStorage ── */
    const userName = localStorage.getItem('userName') || localStorage.getItem('displayName') || '';
    if (userName) {
      const av = document.getElementById('spAvatar');
      const sn = document.getElementById('spName');
      if (av) av.textContent = userName.charAt(0).toUpperCase();
      if (sn) sn.textContent = userName.split(' ')[0];
    }