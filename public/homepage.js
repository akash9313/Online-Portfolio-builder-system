import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
  import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
  import { firebaseConfig } from "./firebase-config.js";

  const app  = initializeApp(firebaseConfig);
  const auth = getAuth(app);

  /* ── Auth state ── */
  const loginBtn    = document.getElementById('loginBtn');
  const signupBtn   = document.getElementById('signupBtn');
  const profilePill = document.getElementById('profilePill');
  const profileAv   = document.getElementById('profileAvatar');
  const profileEm   = document.getElementById('profileEmail');

  onAuthStateChanged(auth, user => {
    if (user) {
      if (loginBtn) loginBtn.style.display  = 'none';
      if (signupBtn) signupBtn.style.display = 'none';
      if (profilePill) profilePill.style.display = 'flex';
      if (profileAv) profileAv.textContent   = (user.displayName || user.email).charAt(0).toUpperCase();
      if (profileEm) profileEm.textContent   = user.displayName || user.email;
    } else {
      if (loginBtn) loginBtn.style.display  = 'flex';
      if (signupBtn) signupBtn.style.display = 'flex';
      if (profilePill) profilePill.style.display = 'none';
    }

    // Hide loader
    const ol = document.getElementById('loadingOverlay');
    if (ol) {
      ol.style.opacity = '0';
      setTimeout(() => ol.style.display = 'none', 400);
    }
  });

  document.getElementById('logoutBtn').addEventListener('click', async () => {
    await signOut(auth);
    localStorage.clear();
  });

  /* ── CTA / Get Started ── */
  function handleCTA(e) {
    if (e && e.preventDefault) e.preventDefault();
    const user = auth.currentUser;
    window.location.href = user ? 'dashboard.html' : 'loginpage.html';
  }
  document.getElementById('getStartedBtn').addEventListener('click', handleCTA);
  document.getElementById('ctaBtn').addEventListener('click', handleCTA);
  if (signupBtn) signupBtn.addEventListener('click', handleCTA);

  /* ── Custom cursor ── */
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

  /* ── Navbar scroll ── */
  window.addEventListener('scroll',()=>{
    document.getElementById('navbar').classList.toggle('scrolled', window.scrollY>80);
  });

  /* ── Scroll reveal ── */
  const io = new IntersectionObserver(entries=>{
    entries.forEach(e=>{ if(e.isIntersecting) e.target.classList.add('visible'); });
  },{threshold:0.1});
  document.querySelectorAll('.reveal').forEach(el=>io.observe(el));

  /* ── Smooth anchors ── */
  document.querySelectorAll('a[href^="#"]').forEach(a=>{
    a.addEventListener('click',e=>{
      const target=document.querySelector(a.getAttribute('href'));
      if(target){e.preventDefault();target.scrollIntoView({behavior:'smooth'});}
    });
  });

  /* ── Counter animation ── */
  const counters=[
    {id:'c1', target:10000, suffix:'+'  },
    {id:'c2', target:4,     suffix:''   },
    {id:'c3', target:50,    suffix:'+'  },
    {id:'c4', target:2400,  suffix:'+'  },
  ];
  const cIO = new IntersectionObserver(entries=>{
    entries.forEach(e=>{
      if(!e.isIntersecting) return;
      const conf = counters.find(c=>c.id===e.target.id);
      if(!conf) return;
      const el=e.target; let start=0;
      const duration=1800;
      const step=timestamp=>{
        if(!start) start=timestamp;
        const prog=Math.min((timestamp-start)/duration,1);
        const ease=1-Math.pow(1-prog,3);
        el.textContent=Math.floor(ease*conf.target).toLocaleString()+conf.suffix;
        if(prog<1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
      cIO.unobserve(e.target);
    });
  },{threshold:0.5});
  counters.forEach(c=>{
    const el=document.getElementById(c.id);
    if(el) cIO.observe(el);
  });
// Mobile Nav Logic
const homeMobileBtn = document.getElementById('homeMobileBtn');
const navLinks = document.querySelector('.nav-links');
const navActions = document.querySelector('.nav-actions');
const overlay = document.getElementById('homeMobileOverlay');

if (homeMobileBtn) {
  const t = () => {
    navLinks.classList.toggle('open');
    navActions.classList.toggle('mobile-view');
    overlay.classList.toggle('open');
    
    // Copy nav actions inside navLinks if not there
    if (!navLinks.querySelector('.nav-actions')) {
      const clone = navActions.cloneNode(true);
      clone.classList.remove('nav-actions');
      clone.classList.add('mobile-view-actions');
      clone.style.display = 'flex';
      clone.style.flexDirection = 'column';
      clone.style.gap = '1rem';
      clone.style.marginTop = '2rem';
      clone.style.width = '100%';
      navLinks.appendChild(clone);
      
      // Fix logout button in cloned nav
      const clonedLogout = clone.querySelector('#logoutBtn');
      if (clonedLogout) {
          clonedLogout.removeAttribute('id');
          clonedLogout.addEventListener('click', async () => {
              if (window.signOut && window.auth) {
                  await window.signOut(window.auth);
                  window.location.reload();
              }
          });
      }
    }
  };
  homeMobileBtn.addEventListener('click', t);
  overlay.addEventListener('click', t);
  navLinks.querySelectorAll('a').forEach(a => a.addEventListener('click', () => {
    if(window.innerWidth <= 768) t();
  }));
}
