import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, getDocs, query, orderBy, deleteDoc, doc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { firebaseConfig } from "./firebase-config.js";

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

let isAdmin = false;

onAuthStateChanged(auth, (user) => {
  if (user && user.email === 'akashuchachariya9313@gmail.com') {
    isAdmin = true;
  } else {
    isAdmin = false;
  }
  fetchAllReviews();
});

const allReviewsContainer = document.getElementById('allReviewsContainer');
const loading = document.getElementById('allReviewsLoading');

function getInitials(name) {
  return name ? name.charAt(0).toUpperCase() : '?';
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

async function fetchAllReviews() {
  try {
    const q = query(collection(db, "reviews"), orderBy("createdAt", "desc"));
    const snapshot = await getDocs(q);
    
    if (loading) loading.style.display = 'none';

    if (snapshot.empty) {
      allReviewsContainer.innerHTML = '<p style="text-align:center; color:var(--muted); grid-column: 1 / -1;">No reviews yet. Be the first to leave one on the homepage!</p>';
      return;
    }

    allReviewsContainer.innerHTML = '';
    
    snapshot.forEach(docSnap => {
      const data = docSnap.data();
      const div = document.createElement('div');
      div.className = `testimonial-card`;
      const dateStr = data.createdAt ? data.createdAt.toDate().toLocaleString(undefined, {
        year: 'numeric', month: 'short', day: 'numeric', 
        hour: '2-digit', minute: '2-digit'
      }) : 'Just now';

      div.innerHTML = `
        ${isAdmin ? `<button class="delete-review-btn" data-id="${docSnap.id}" title="Delete review"><i class="fas fa-trash"></i></button>` : ''}
        <div class="t-stars">${renderStars(data.rating)}</div>
        <p class="t-text">"${data.text}"</p>
        <div class="t-author">
          <div class="t-avatar" style="background:${getRandomColor()}">${getInitials(data.name)}</div>
          <div>
            <div class="t-name">${data.name}</div>
            <div class="t-role">${data.role}</div>
            <div style="font-size: 0.75rem; color: var(--muted); margin-top: 2px;">${dateStr}</div>
          </div>
        </div>
      `;
      allReviewsContainer.appendChild(div);
    });

    // Add delete listeners
    document.querySelectorAll('.delete-review-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = e.currentTarget.getAttribute('data-id');
        const cardElement = e.currentTarget.closest('.testimonial-card');
        if (window.openConfirmModal) {
          window.openConfirmModal(id, cardElement);
        }
      });
    });

  } catch (err) {
    console.error("Failed to fetch reviews:", err);
    if (loading) {
      if (err.message && err.message.includes("Missing or insufficient permissions")) {
        loading.innerHTML = '<div style="color:#ef4444; max-width: 600px; margin: 0 auto; padding: 20px; background: rgba(239,68,68,0.1); border: 1px solid #ef4444; border-radius: 8px;"><strong>Firestore Security Rules Error:</strong><br>Your Firebase database is blocking read access. To fix this, open your Firebase Console > Firestore Database > Rules, and set:<br><br><code>match /databases/{database}/documents {<br>&nbsp;&nbsp;match /reviews/{document=**} {<br>&nbsp;&nbsp;&nbsp;&nbsp;allow read, write: if true;<br>&nbsp;&nbsp;}<br>}</code></div>';
      } else {
        loading.innerHTML = `<p style="color:#ef4444;">Failed to load reviews. ${err.message}</p>`;
      }
    }
  }
}

// fetchAllReviews is now called in onAuthStateChanged

/* ── Custom Confirm Modal Logic ── */
const confirmModal = document.getElementById('confirmModal');
const confirmCancelBtn = document.getElementById('confirmCancelBtn');
const confirmDeleteBtn = document.getElementById('confirmDeleteBtn');
const confirmError = document.getElementById('confirmError');

let reviewToDeleteId = null;
let reviewToDeleteElement = null;

// The delete listeners setup in fetchAllReviews() will call this
window.openConfirmModal = function(id, element) {
  reviewToDeleteId = id;
  reviewToDeleteElement = element;
  confirmError.style.display = 'none';
  confirmDeleteBtn.textContent = 'Delete';
  confirmDeleteBtn.disabled = false;
  confirmModal.classList.add('show');
}

function closeConfirmModal() {
  confirmModal.classList.remove('show');
  reviewToDeleteId = null;
  reviewToDeleteElement = null;
}

if (confirmCancelBtn) {
  confirmCancelBtn.addEventListener('click', closeConfirmModal);
}

if (confirmDeleteBtn) {
  confirmDeleteBtn.addEventListener('click', async () => {
    if (!reviewToDeleteId || !reviewToDeleteElement) return;
    
    confirmDeleteBtn.textContent = 'Deleting...';
    confirmDeleteBtn.disabled = true;
    confirmError.style.display = 'none';
    
    try {
      await deleteDoc(doc(db, "reviews", reviewToDeleteId));
      reviewToDeleteElement.remove();
      if (allReviewsContainer.children.length === 0) {
        allReviewsContainer.innerHTML = '<p style="text-align:center; color:var(--muted); grid-column: 1 / -1;">No reviews yet. Be the first to leave one on the homepage!</p>';
      }
      closeConfirmModal();
    } catch (error) {
      console.error("Error deleting review:", error);
      confirmError.textContent = "Failed to delete review: " + error.message;
      confirmError.style.display = 'block';
      confirmDeleteBtn.textContent = 'Try Again';
      confirmDeleteBtn.disabled = false;
    }
  });
}

// Close modal on outside click
window.addEventListener('click', (e) => {
  if (e.target === confirmModal) {
    closeConfirmModal();
  }
});

/* ── Custom cursor & Interactive Elements ── */
const cursor = document.getElementById('cursor');
const ring   = document.getElementById('cursorRing');
let mx=0,my=0,rx=0,ry=0;

document.addEventListener('mousemove', e=>{
  mx=e.clientX; my=e.clientY;
  if(cursor) {
    cursor.style.left=mx+'px'; cursor.style.top=my+'px';
  }
});

(function animRing(){
  rx+=(mx-rx)*0.12; ry+=(my-ry)*0.12;
  if(ring) {
    ring.style.left=rx+'px'; ring.style.top=ry+'px';
  }
  requestAnimationFrame(animRing);
})();
