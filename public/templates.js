document.addEventListener('DOMContentLoaded', () => {

  /* ── Toast ── */
  function showToast(msg) {
    const t = document.getElementById('toast');
    document.getElementById('toastMsg').textContent = msg;
    t.classList.add('show');
    setTimeout(() => t.classList.remove('show'), 3000);
  }

  /* ── Apply selection logic ── */
  function applySelection(name, toast) {
    localStorage.setItem('finalTemplate', name);
    document.querySelectorAll('.template-card').forEach(c => {
      const isThis = c.dataset.template === name;
      c.classList.toggle('selected', isThis);
      const btn = c.querySelector('.btn-select');
      if (isThis) {
        btn.innerHTML = '<i class="fas fa-check"></i> Selected';
        btn.classList.add('selected-btn');
      } else {
        btn.innerHTML = '<i class="fas fa-check"></i> Select Template';
        btn.classList.remove('selected-btn');
      }
    });
    document.getElementById('bannerTemplateName').textContent = name;
    document.getElementById('selectedBanner').classList.remove('hidden');
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

  /* ── Card click also selects ── */
  document.querySelectorAll('.template-card').forEach(card => {
    card.addEventListener('click', () => {
      applySelection(card.dataset.template, true);
    });
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
        card.style.display = show ? '' : 'none';
      });
    });
  });

  /* ── Preview button ── */
  document.querySelectorAll('.btn-preview-card').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      showToast('Preview coming soon!');
    });
  });

  /* ── Logout ── */
  document.getElementById('logoutBtn').addEventListener('click', () => {
    localStorage.clear();
    window.location.href = 'loginpage.html';
  });

}); // end DOMContentLoaded