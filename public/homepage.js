import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
  import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

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

  /* ── Auth state ── */
  const loginBtn    = document.getElementById('loginBtn');
  const signupBtn   = document.getElementById('signupBtn');
  const profilePill = document.getElementById('profilePill');
  const profileAv   = document.getElementById('profileAvatar');
  const profileEm   = document.getElementById('profileEmail');

  onAuthStateChanged(auth, user => {
    if (user) {
      loginBtn.style.display  = 'none';
      signupBtn.style.display = 'none';
      profilePill.style.display = 'flex';
      profileAv.textContent   = (user.displayName || user.email).charAt(0).toUpperCase();
      profileEm.textContent   = user.displayName || user.email;
    } else {
      loginBtn.style.display  = 'flex';
      signupBtn.style.display = 'flex';
      profilePill.style.display = 'none';
    }
  });

  document.getElementById('logoutBtn').addEventListener('click', async () => {
    await signOut(auth);
    localStorage.clear();
  });

  /* ── CTA / Get Started ── */
  function handleCTA() {
    const user = auth.currentUser;
    window.location.href = user ? 'dashboard.html' : 'usersignup.html';
  }
  document.getElementById('getStartedBtn').addEventListener('click', handleCTA);
  document.getElementById('ctaBtn').addEventListener('click', handleCTA);

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