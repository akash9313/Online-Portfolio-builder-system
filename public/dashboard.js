import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore, collection, getDocs, doc, getDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
const firebaseConfig = {
  apiKey: "AIzaSyD4q_KzBCxVtS6mjH6Xh6-Bd1u-21RSNG4",
  authDomain: "portfoliox-2e787.firebaseapp.com",
  projectId: "portfoliox-2e787",
  storageBucket: "portfoliox-2e787.firebasestorage.app",
  messagingSenderId: "562709786891",
  appId: "1:562709786891:web:2d0f575ab7d3bda5fdf20e"
};
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const logoutBtn = document.getElementById("logoutBtn");
const loadingOverlay = document.getElementById("loadingOverlay");
const skillsCountEl = document.getElementById("skillsCount");
const educationCountEl = document.getElementById("educationCount");
const projectsCountEl = document.getElementById("projectsCount");
const profileStatusEl = document.getElementById("profileStatus");
const progressFill = document.getElementById("progressFill");
const progressPercent = document.getElementById("progressPercent");
const sidebarProgress = document.getElementById("sidebarProgress");
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "index.html";
    return;
  }
  // Hide loading
  loadingOverlay.style.opacity = "0";
  setTimeout(() => {
    loadingOverlay.style.display = "none";
  }, 300);
  await loadDashboard(user.uid);
  document.getElementById("welcomeText").textContent = `Welcome back, ${user.email.split('@')[0]}! 👋`;
});
async function loadDashboard(uid) {
  const skillsSnap = await getDocs(collection(db, "users", uid, "skills"));
  const eduSnap = await getDocs(collection(db, "users", uid, "education"));
  const projSnap = await getDocs(collection(db, "users", uid, "projects"));
  const skillsCount = skillsSnap.size;
  const eduCount = eduSnap.size;
  const projCount = projSnap.size;
  skillsCountEl.textContent = `${skillsCount} Skills Added`;
  educationCountEl.textContent = `${eduCount} Records Added`;
  projectsCountEl.textContent = `${projCount} Projects Added`;
  const profileDoc = await getDoc(doc(db, "users", uid));
  const profileCompleted = profileDoc.exists();
  profileStatusEl.textContent = profileCompleted ? "✅ Completed" : "⚠️ Incomplete";
  let completed = 0;
  if (profileCompleted) completed += 25;
  if (skillsCount > 0) completed += 25;
  if (eduCount > 0) completed += 25;
  if (projCount > 0) completed += 25;
  progressFill.style.width = completed + "%";
  progressPercent.textContent = completed + "%";
  sidebarProgress.style.width = completed + "%";
}
logoutBtn.addEventListener("click", async () => {
  await signOut(auth);
  localStorage.clear();
  window.location.href = "index.html";
});
