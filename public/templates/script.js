/* =====================================================
   PortfolioX — Premium 3D Portfolio Logic
   =====================================================
   INSTANT scroll-driven video mapped to Sections:
   - Video is re-encoded with ALL keyframes (I-frames).
   - Video time is interpolated based on the current
     section in the viewport, allowing sections to be
     anchored to specific video moments.
   ===================================================== */

(() => {
  // =====================================================
  // ELEMENTS
  // =====================================================
  const video         = document.getElementById('heroVideo');
  const progressFill  = document.getElementById('progressFill');
  const scrollCue     = document.getElementById('scrollCue');
  const heroSection   = document.getElementById('hero');
  const beats         = Array.from(document.querySelectorAll('.beat'));
  const navbar        = document.getElementById('navbar');
  const navLinks      = document.querySelectorAll('.nav-link');
  const navToggle     = document.getElementById('navToggle');
  const navLinksWrap  = document.getElementById('navLinks');
  const contactForm   = document.getElementById('contactForm');
  const formSuccess   = document.getElementById('formSuccess');
  const submitBtn     = document.getElementById('submitBtn');
  
  // Get all sections that have an ID
  const sections      = Array.from(document.querySelectorAll('section[id], footer[id]'));

  // =====================================================
  // 1. INSTANT SCROLL-DRIVEN VIDEO (SECTION-MAPPED)
  // =====================================================
  let videoDuration     = 0;
  let hasStartedScroll  = false;
  let lastSetTime       = -1;
  let ticking           = false;

  const beatRanges = beats.map(el => {
    const [start, end] = el.dataset.range.split(',').map(Number);
    return { el, start, end };
  });

  function whenVideoReady(cb) {
    if (video && video.readyState >= 1 && !Number.isNaN(video.duration) && video.duration > 0) {
      cb();
      return;
    }
    if (video) {
      video.addEventListener('loadedmetadata', () => {
        if (!Number.isNaN(video.duration) && video.duration > 0) cb();
      }, { once: true });
    }
  }

  function getPageScrollProgress() {
    const scrollTop = window.scrollY || document.documentElement.scrollTop;
    const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
    if (maxScroll <= 0) return 0;
    return Math.min(Math.max(scrollTop / maxScroll, 0), 1);
  }

  function getHeroScrollProgress() {
    if (!heroSection) return 0;
    const rect = heroSection.getBoundingClientRect();
    const heroHeight = heroSection.offsetHeight;
    const progress = -rect.top / heroHeight;
    return Math.min(Math.max(progress, 0), 1);
  }

  function updateBeats(heroProgress) {
    beatRanges.forEach(({ el, start, end }) => {
      el.classList.toggle('is-active', heroProgress >= start && heroProgress < end);
    });
  }

  function updateProgressRail(pageProgress) {
    if (progressFill) {
      progressFill.style.height = `${pageProgress * 100}%`;
    }
  }

  // Calculate which sections the user is between, and interpolate video time
  function calculateTargetTime() {
    const scrollY = window.scrollY;
    const viewportHeight = window.innerHeight;
    const scrollCenter = scrollY + (viewportHeight / 2); // Use center of viewport

    // Find the current section (the one whose top is closest to or above the scroll center)
    let currentIdx = 0;
    for (let i = 0; i < sections.length; i++) {
      const top = sections[i].offsetTop;
      if (scrollCenter >= top) {
        currentIdx = i;
      }
    }

    const currentSection = sections[currentIdx];
    const nextSection = sections[currentIdx + 1];

    // If there is no next section (we are at the very bottom)
    if (!nextSection) {
      return parseFloat(currentSection.getAttribute('data-video-time')) || videoDuration;
    }

    const currentTop = currentSection.offsetTop;
    const nextTop = nextSection.offsetTop;
    
    // How far are we between the current section and the next section?
    const progressBetween = Math.max(0, Math.min(1, (scrollCenter - currentTop) / (nextTop - currentTop)));
    
    const currentTimeAtSection = parseFloat(currentSection.getAttribute('data-video-time')) || 0;
    let nextTimeAtSection = parseFloat(nextSection.getAttribute('data-video-time'));
    if (isNaN(nextTimeAtSection)) nextTimeAtSection = videoDuration;

    // Linearly interpolate the video time between the two sections
    return currentTimeAtSection + (progressBetween * (nextTimeAtSection - currentTimeAtSection));
  }

  function onScroll() {
    if (!hasStartedScroll) {
      hasStartedScroll = true;
      if (scrollCue) scrollCue.style.opacity = '0';
    }

    // Use rAF to batch updates — one frame per paint
    if (!ticking) {
      requestAnimationFrame(() => {
        const pageProgress = getPageScrollProgress();
        const heroProgress = getHeroScrollProgress();
        
        // Use section-based time interpolation if video is ready
        let targetTime = pageProgress * videoDuration; // fallback
        if (videoDuration > 0) {
            targetTime = calculateTargetTime();
        }

        // DIRECT set — no LERP. Video has all-keyframe encoding
        // so seeking is instant.
        if (Math.abs(targetTime - lastSetTime) > 0.001) {
          video.currentTime = targetTime;
          lastSetTime = targetTime;
        }

        updateBeats(heroProgress);
        updateProgressRail(pageProgress);
        ticking = false;
      });
      ticking = true;
    }
  }

  // =====================================================
  // 2. INTERSECTION OBSERVER — REVEAL ANIMATIONS
  // =====================================================
  function initRevealAnimations() {
    const revealElements = document.querySelectorAll('.reveal');

    const revealObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          revealObserver.unobserve(entry.target);
        }
      });
    }, {
      threshold: 0.15,
      rootMargin: '0px 0px -50px 0px'
    });

    revealElements.forEach(el => revealObserver.observe(el));
  }

  // =====================================================
  // 3. 3D TILT EFFECT ON PROJECT CARDS
  // =====================================================
  function initTiltCards() {
    const tiltCards = document.querySelectorAll('[data-tilt]');

    tiltCards.forEach(card => {
      card.addEventListener('mousemove', (e) => {
        const rect = card.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;

        const rotateX = ((y - centerY) / centerY) * -8;
        const rotateY = ((x - centerX) / centerX) * 8;

        card.style.transform = `perspective(800px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.02, 1.02, 1.02)`;
      });

      card.addEventListener('mouseleave', () => {
        card.style.transform = 'perspective(800px) rotateX(0) rotateY(0) scale3d(1, 1, 1)';
      });
    });
  }

  // =====================================================
  // 4. ANIMATED STAT COUNTERS
  // =====================================================
  function initCounters() {
    const counters = document.querySelectorAll('.stat-box__number');
    let countersAnimated = false;

    const counterObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting && !countersAnimated) {
          countersAnimated = true;
          animateAllCounters();
          counterObserver.disconnect();
        }
      });
    }, { threshold: 0.3 });

    counters.forEach(c => counterObserver.observe(c));

    function animateAllCounters() {
      counters.forEach(counter => {
        const target = parseInt(counter.dataset.target, 10);
        const duration = 2000;
        const startTime = performance.now();

        function updateCounter(now) {
          const elapsed = now - startTime;
          const progress = Math.min(elapsed / duration, 1);
          const eased = 1 - Math.pow(1 - progress, 3);
          counter.textContent = Math.round(eased * target);
          if (progress < 1) requestAnimationFrame(updateCounter);
        }

        requestAnimationFrame(updateCounter);
      });
    }
  }

  // =====================================================
  // 5. SKILL BAR ANIMATIONS
  // =====================================================
  function initSkillBars() {
    const skillBars = document.querySelectorAll('.skill-bar__fill');

    const skillObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const bar = entry.target;
          bar.style.width = bar.dataset.width + '%';
          skillObserver.unobserve(bar);
        }
      });
    }, { threshold: 0.2 });

    skillBars.forEach(bar => skillObserver.observe(bar));
  }

  // =====================================================
  // 6. ACTIVE NAV LINK TRACKING
  // =====================================================
  function initActiveNavTracking() {
    const sectionObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const id = entry.target.id;
          navLinks.forEach(link => {
            link.classList.toggle('active', link.dataset.section === id);
          });
        }
      });
    }, {
      threshold: 0.2,
      rootMargin: '-80px 0px -50% 0px'
    });

    sections.forEach(section => sectionObserver.observe(section));
  }

  // =====================================================
  // 7. NAVBAR BACKGROUND ON SCROLL
  // =====================================================
  function initNavbarScroll() {
    window.addEventListener('scroll', () => {
      navbar.classList.toggle('is-scrolled', window.scrollY > 80);
    }, { passive: true });
  }

  // =====================================================
  // 8. SMOOTH SCROLL FOR NAV LINKS
  // =====================================================
  function initSmoothScroll() {
    navLinks.forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const targetEl = document.querySelector(link.getAttribute('href'));
        if (targetEl) {
          targetEl.scrollIntoView({ behavior: 'smooth' });
          navToggle.classList.remove('is-open');
          navLinksWrap.classList.remove('is-open');
        }
      });
    });

    document.querySelectorAll('.footer-nav__links a').forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const targetEl = document.querySelector(link.getAttribute('href'));
        if (targetEl) targetEl.scrollIntoView({ behavior: 'smooth' });
      });
    });
  }

  // =====================================================
  // 9. MOBILE NAV TOGGLE
  // =====================================================
  function initMobileNav() {
    navToggle.addEventListener('click', () => {
      navToggle.classList.toggle('is-open');
      navLinksWrap.classList.toggle('is-open');
    });
  }

  // =====================================================
  // 10. CONTACT FORM HANDLING
  // =====================================================
  function initContactForm() {
    contactForm.addEventListener('submit', (e) => {
      e.preventDefault();
      submitBtn.disabled = true;
      submitBtn.querySelector('.form-submit__text').textContent = 'Sending...';

      setTimeout(() => {
        formSuccess.classList.add('is-visible');
        submitBtn.querySelector('.form-submit__text').textContent = 'Send Message';
        submitBtn.disabled = false;
        contactForm.reset();
        setTimeout(() => formSuccess.classList.remove('is-visible'), 4000);
      }, 1200);
    });
  }

  // =====================================================
  // 11. PARTICLE BACKGROUND
  // =====================================================
  function initParticles() {
    const canvas = document.createElement('canvas');
    canvas.id = 'particleCanvas';
    canvas.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
      z-index: 1;
      opacity: 0.35;
    `;
    document.body.prepend(canvas);

    const ctx = canvas.getContext('2d');
    let particles = [];
    const PARTICLE_COUNT = 35;

    function resize() {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    }

    function createParticle() {
      return {
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        size: Math.random() * 2 + 0.5,
        speedX: (Math.random() - 0.5) * 0.25,
        speedY: (Math.random() - 0.5) * 0.25,
        opacity: Math.random() * 0.4 + 0.1,
        color: Math.random() > 0.5 ? '41, 230, 214' : '124, 58, 237'
      };
    }

    function initArray() {
      particles = [];
      for (let i = 0; i < PARTICLE_COUNT; i++) particles.push(createParticle());
    }

    function draw() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.forEach(p => {
        p.x += p.speedX;
        p.y += p.speedY;
        if (p.x < 0) p.x = canvas.width;
        if (p.x > canvas.width) p.x = 0;
        if (p.y < 0) p.y = canvas.height;
        if (p.y > canvas.height) p.y = 0;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${p.color}, ${p.opacity})`;
        ctx.fill();
      });
      requestAnimationFrame(draw);
    }

    resize();
    initArray();
    draw();
    window.addEventListener('resize', () => { resize(); initArray(); });
  }

  // =====================================================
  // INIT
  // =====================================================
  function init() {
    whenVideoReady(() => {
      videoDuration = video.duration;
      
      // Auto-assign data-video-time to sections based on total duration if they don't have it
      // This spreads the video evenly across sections by default, but allows HTML overrides!
      sections.forEach((sec, idx) => {
          if (!sec.hasAttribute('data-video-time')) {
              // Map section index to a timestamp evenly across videoDuration
              const time = (idx / (sections.length - 1)) * videoDuration;
              sec.setAttribute('data-video-time', time.toFixed(2));
          }
      });

      video.pause();

      updateBeats(0);
      updateProgressRail(0);

      // Direct scroll listener — no throttle, rAF-batched for performance
      window.addEventListener('scroll', onScroll, { passive: true });
      window.addEventListener('resize', onScroll, { passive: true });
      onScroll();
    });

    initRevealAnimations();
    initTiltCards();
    initCounters();
    initSkillBars();
    initActiveNavTracking();
    initNavbarScroll();
    initSmoothScroll();
    initMobileNav();
    initContactForm();
    initParticles();
  }

  init();
})();
