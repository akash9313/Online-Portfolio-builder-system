import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
  import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
  import { getFirestore, collection, addDoc, getDocs, query, orderBy, limit, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
  import { firebaseConfig } from "./firebase-config.js";

  const app  = initializeApp(firebaseConfig);
  const auth = getAuth(app);
  const db   = getFirestore(app);

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
      if (profileAv) {
        if (user.photoURL) {
          profileAv.innerHTML = `<img src="${user.photoURL}" alt="Profile" style="width:100%; height:100%; border-radius:50%; object-fit:cover;">`;
        } else {
          profileAv.textContent = (user.displayName || user.email || '?').charAt(0).toUpperCase();
        }
      }
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

  /* ── Custom cursor & Interactive Elements ── */
  const cursor = document.getElementById('cursor');
  const ring   = document.getElementById('cursorRing');
  let mx=0,my=0,rx=0,ry=0;

  const cards = document.querySelectorAll('.feat-card, .tpl-card, .step-card, .testimonial-card');

  document.addEventListener('mousemove', e=>{
    mx=e.clientX; my=e.clientY;
    cursor.style.left=mx+'px'; cursor.style.top=my+'px';

    // Spotlight effect for cards
    cards.forEach(card => {
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      card.style.setProperty('--mouse-x', `${x}px`);
      card.style.setProperty('--mouse-y', `${y}px`);
    });
  });

  // Removed 3D Glass Tilt Effect as per user request (they want float instead of tilt)
  
  (function animRing(){
    rx+=(mx-rx)*0.12; ry+=(my-ry)*0.12;
    ring.style.left=rx+'px'; ring.style.top=ry+'px';
    requestAnimationFrame(animRing);
  })();

  /* ── Magnetic Buttons ── */
  const magneticBtns = document.querySelectorAll('.h-btn, .nav-btn, .see-all, .social-links a');
  magneticBtns.forEach(btn => {
    btn.addEventListener('mousemove', function(e) {
      const rect = this.getBoundingClientRect();
      const h = rect.width / 2;
      const x = e.clientX - rect.left - h;
      const y = e.clientY - rect.top - rect.height / 2;
      this.style.transform = `translate(${x * 0.15}px, ${y * 0.15}px)`;
    });
    btn.addEventListener('mouseleave', function() {
      this.style.transform = '';
    });
  });

  /* ── Navbar scroll & Active State ── */
  const sections = document.querySelectorAll('section[id], div[id].marquee-section'); // marquee-section might not have id, we'll just check all sections
  const navItems = document.querySelectorAll('.nav-links a.nav-link');

  window.addEventListener('scroll', () => {
    const scrollY = window.scrollY;
    document.getElementById('navbar').classList.toggle('scrolled', scrollY > 80);

    let current = '';
    const allSections = document.querySelectorAll('.hero, section[id]');
    allSections.forEach(section => {
      const sectionTop = section.offsetTop - 120;
      const sectionHeight = section.offsetHeight;
      if (scrollY >= sectionTop && scrollY < sectionTop + sectionHeight) {
        current = section.getAttribute('id');
      }
    });

    if (scrollY < 200) current = 'home';

    navItems.forEach(a => {
      a.classList.remove('active');
      if (current && a.getAttribute('href') === `#${current}`) {
        a.classList.add('active');
      }
    });
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
      
  // Remove ID to fix logout button in cloned nav
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

/* ── REVIEWS LOGIC ── */
const openReviewModalBtn = document.getElementById('openReviewModalBtn');
const closeReviewModalBtn = document.getElementById('closeReviewModalBtn');
const reviewModalOverlay = document.getElementById('reviewModalOverlay');
const starRatingSelect = document.getElementById('starRatingSelect');
const submitReviewBtn = document.getElementById('submitReviewBtn');
const reviewError = document.getElementById('reviewError');
let currentRating = 0;

if (openReviewModalBtn && reviewModalOverlay) {
  openReviewModalBtn.addEventListener('click', () => {
    reviewModalOverlay.classList.add('open');
  });
  closeReviewModalBtn.addEventListener('click', () => {
    reviewModalOverlay.classList.remove('open');
  });
  reviewModalOverlay.addEventListener('click', (e) => {
    if (e.target === reviewModalOverlay) reviewModalOverlay.classList.remove('open');
  });
}

if (starRatingSelect) {
  const stars = starRatingSelect.querySelectorAll('i');
  stars.forEach(star => {
    star.addEventListener('mouseover', function() {
      const val = parseInt(this.getAttribute('data-val'));
      stars.forEach(s => {
        if (parseInt(s.getAttribute('data-val')) <= val) s.classList.add('hover');
        else s.classList.remove('hover');
      });
    });
    star.addEventListener('mouseout', function() {
      stars.forEach(s => s.classList.remove('hover'));
    });
    star.addEventListener('click', function() {
      currentRating = parseInt(this.getAttribute('data-val'));
      stars.forEach(s => {
        if (parseInt(s.getAttribute('data-val')) <= currentRating) s.classList.add('active');
        else s.classList.remove('active');
      });
    });
  });
}

if (submitReviewBtn) {
  submitReviewBtn.addEventListener('click', async () => {
    const name = document.getElementById('reviewName').value.trim();
    const role = document.getElementById('reviewRole').value.trim();
    const text = document.getElementById('reviewText').value.trim();

    if (!name || !role || !text || currentRating === 0) {
      reviewError.textContent = 'Please fill out all fields and select a star rating.';
      reviewError.style.display = 'block';
      return;
    }

    submitReviewBtn.disabled = true;
    submitReviewBtn.textContent = 'Submitting...';
    reviewError.style.display = 'none';

    try {
      await addDoc(collection(db, "reviews"), {
        name,
        role,
        text,
        rating: currentRating,
        createdAt: serverTimestamp()
      });
      reviewModalOverlay.classList.remove('open');
      document.getElementById('reviewName').value = '';
      document.getElementById('reviewRole').value = '';
      document.getElementById('reviewText').value = '';
      currentRating = 0;
      starRatingSelect.querySelectorAll('i').forEach(s => s.classList.remove('active'));
      submitReviewBtn.disabled = false;
      submitReviewBtn.textContent = 'Submit Review';
      fetchTopReviews(); // Reload reviews
    } catch (err) {
      console.error(err);
      if (err.message && err.message.includes("Missing or insufficient permissions")) {
        reviewError.innerHTML = '<strong>Permission Denied:</strong> Your Firebase database is blocking write access. Please update your Firestore Rules to allow read/write to the `reviews` collection.';
      } else {
        reviewError.textContent = `Failed to submit review. ${err.message}`;
      }
      reviewError.style.display = 'block';
      submitReviewBtn.disabled = false;
      submitReviewBtn.textContent = 'Submit Review';
    }
  });
}

const reviewsContainer = document.getElementById('reviewsContainer');

function getInitials(name) {
  return name.charAt(0).toUpperCase();
}

function getRandomColor() {
  const colors = [
    'linear-gradient(135deg,#38bdf8,#6366f1)',
    'linear-gradient(135deg,#22c55e,#38bdf8)',
    'linear-gradient(135deg,#ec4899,#f59e0b)',
    'linear-gradient(135deg,#8b5cf6,#d946ef)',
    'linear-gradient(135deg,#14b8a6,#3b82f6)'
  ];
  return colors[Math.floor(Math.random() * colors.length)];
}

function renderStars(rating) {
  let starsHtml = '';
  for(let i=0; i<5; i++) {
    starsHtml += i < rating ? '★' : '☆';
  }
  return starsHtml;
}

async function fetchTopReviews() {
  if (!reviewsContainer) return;
  try {
    const q = query(collection(db, "reviews"), orderBy("createdAt", "desc"), limit(3));
    const snapshot = await getDocs(q);
    
    if (snapshot.empty) {
      // If database is empty, show default fallback reviews
      reviewsContainer.innerHTML = `
        <div class="testimonial-card reveal visible">
          <div class="t-stars">★★★★★</div>
          <p class="t-text">"I landed my first dev job within 2 weeks of publishing my PortfolioX portfolio. The templates are absolutely stunning."</p>
          <div class="t-author">
            <div class="t-avatar" style="background:linear-gradient(135deg,#38bdf8,#6366f1)">K</div>
            <div><div class="t-name">Keval Bamarotiya</div><div class="t-role">Full Stack Developer</div></div>
          </div>
        </div>
        <div class="testimonial-card reveal visible" style="transition-delay: 0.1s;">
          <div class="t-stars">★★★★★</div>
          <p class="t-text">"The Classic Developer template is exactly what I needed. Clean, professional, and shows off my GitHub projects perfectly."</p>
          <div class="t-author">
            <div class="t-avatar" style="background:linear-gradient(135deg,#22c55e,#38bdf8)">M</div>
            <div><div class="t-name">Mori Umang</div><div class="t-role">Backend Engineer</div></div>
          </div>
        </div>
        <div class="testimonial-card reveal visible" style="transition-delay: 0.2s;">
          <div class="t-stars">★★★★★</div>
          <p class="t-text">"Setting up was genuinely 10 minutes. I now have a live URL I can put on my resume. This is incredible for students."</p>
          <div class="t-author">
            <div class="t-avatar" style="background:linear-gradient(135deg,#ec4899,#f59e0b)">A</div>
            <div><div class="t-name">Armaan</div><div class="t-role">CS Student</div></div>
          </div>
        </div>
      `;
      return; 
    }

    reviewsContainer.innerHTML = '';
    let delay = 1;
    snapshot.forEach(docSnap => {
      const data = docSnap.data();
      const div = document.createElement('div');
      div.className = `testimonial-card reveal reveal-delay-${delay}`;
      div.innerHTML = `
        <div class="t-stars">${renderStars(data.rating)}</div>
        <p class="t-text">"${data.text}"</p>
        <div class="t-author">
          <div class="t-avatar" style="background:${getRandomColor()}">${getInitials(data.name)}</div>
          <div><div class="t-name">${data.name}</div><div class="t-role">${data.role}</div></div>
        </div>
      `;
      reviewsContainer.appendChild(div);
      delay++;
    });
    
    // Trigger reveal for dynamically added elements
    document.querySelectorAll('#reviewsContainer .reveal').forEach(el => {
      if (typeof io !== 'undefined') io.observe(el);
    });
    
  } catch (err) {
    console.error("Failed to fetch reviews:", err);
    if (err.message && err.message.includes("Missing or insufficient permissions")) {
      reviewsContainer.innerHTML = '<div style="color:#ef4444; width:100%; grid-column: 1 / -1; padding: 20px; background: rgba(239,68,68,0.1); border: 1px solid #ef4444; border-radius: 8px;"><strong>Firestore Security Rules Error:</strong> Your database is blocking read access. Please update your Firestore Rules to allow access to the <code>reviews</code> collection.</div>';
    }
  }
}

fetchTopReviews();
