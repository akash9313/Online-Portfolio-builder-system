// mobile-nav.js - Logic for Mobile Navigation

const initMobileNav = () => {
  const menuBtn = document.getElementById('mobileMenuBtn');
  const sidebar = document.querySelector('.sidebar');
  let overlay = document.querySelector('.mobile-overlay');

  if (!overlay) {
    overlay = document.createElement('div');
    overlay.className = 'mobile-overlay';
    document.body.appendChild(overlay);
  }

  if (menuBtn && sidebar) {
    const toggleMenu = () => {
      const isOpen = sidebar.classList.contains('open');
      if (isOpen) {
        sidebar.classList.remove('open');
        menuBtn.classList.remove('active');
        overlay.classList.remove('open');
      } else {
        sidebar.classList.add('open');
        menuBtn.classList.add('active');
        overlay.classList.add('open');
      }
    };

    menuBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleMenu();
    });

    overlay.addEventListener('click', toggleMenu);

    sidebar.addEventListener('click', (e) => {
      if (e.target.closest('.nav-item') && window.innerWidth <= 768) {
        setTimeout(() => {
          sidebar.classList.remove('open');
          menuBtn.classList.remove('active');
          overlay.classList.remove('open');
        }, 150);
      }
    });
  }
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initMobileNav);
} else {
  initMobileNav();
}
