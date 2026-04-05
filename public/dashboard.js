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

const app  = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db   = getFirestore(app);

/* ── Element refs ── */
const loadingOverlay  = document.getElementById("loadingOverlay");
const logoutBtn       = document.getElementById("logoutBtn");
const welcomeText     = document.getElementById("welcomeText");
const spAvatar        = document.getElementById("spAvatar");
const spName          = document.getElementById("spName");
const profileStatus   = document.getElementById("profileStatus");
const skillsCount     = document.getElementById("skillsCount");
const educationCount  = document.getElementById("educationCount");
const projectsCount   = document.getElementById("projectsCount");
const progressFill    = document.getElementById("progressFill");
const progressPercent = document.getElementById("progressPercent");
const navProgressFill = document.getElementById("navProgressFill");
const navProgressText = document.getElementById("navProgressText");
const sidebarRing     = document.getElementById("sidebarRing");
const sidebarPct      = document.getElementById("sidebarPct");
const heroArc         = document.getElementById("heroArc");
const heroPct         = document.getElementById("heroPct");
const profileBar      = document.getElementById("profileBar");
const skillsBar       = document.getElementById("skillsBar");
const educationBar    = document.getElementById("educationBar");
const projectsBar     = document.getElementById("projectsBar");
const profileVal      = document.getElementById("profileVal");
const skillsVal       = document.getElementById("skillsVal");
const educationVal    = document.getElementById("educationVal");
const projectsVal     = document.getElementById("projectsVal");

/* ── Auth observer ── */
onAuthStateChanged(auth, async (user) => {
  if (!user) { window.location.href = "index.html"; return; }

  // Hide loading
  loadingOverlay.style.opacity = "0";
  setTimeout(() => { loadingOverlay.style.display = "none"; }, 400);

  // User display
  const username = user.email.split("@")[0];
  const initial  = username.charAt(0).toUpperCase();
  if (welcomeText) welcomeText.innerHTML = `Welcome back, <span style="background:var(--gradient);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;">${username}</span> 👋`;
  if (spAvatar) spAvatar.textContent = initial;
  if (spName)   spName.textContent   = username;

  await loadDashboard(user.uid);
});

/* ── Load data ── */
async function loadDashboard(uid) {
  try {
    const [skillsSnap, eduSnap, projSnap, profileDoc] = await Promise.all([
      getDocs(collection(db, "users", uid, "skills")),
      getDocs(collection(db, "users", uid, "education")),
      getDocs(collection(db, "users", uid, "projects")),
      getDoc(doc(db, "users", uid))
    ]);

    const numSkills = skillsSnap.size;
    const numEdu    = eduSnap.size;
    const numProj   = projSnap.size;
    const profileOk = profileDoc.exists();

    // Stat pills
    if (profileStatus)  profileStatus.textContent  = profileOk    ? "✅ Completed"  : "⚠️ Incomplete";
    if (skillsCount)    skillsCount.textContent     = numSkills;
    if (educationCount) educationCount.textContent  = numEdu;
    if (projectsCount)  projectsCount.textContent   = numProj;

    // Completion percentages per section
    const pProfile = profileOk    ? 100 : 0;
    const pSkills  = numSkills > 0 ? 100 : 0;
    const pEdu     = numEdu    > 0 ? 100 : 0;
    const pProj    = numProj   > 0 ? 100 : 0;
    const total    = Math.round((pProfile + pSkills + pEdu + pProj) / 4);

    // Animate after short delay so transitions fire
    setTimeout(() => animateProgress(total, pProfile, pSkills, pEdu, pProj), 350);

    appendActivity(profileOk, numSkills, numEdu, numProj);
  } catch (err) {
    console.error("Dashboard load error:", err);
  }
}

/* ── Animate all progress elements ── */
function animateProgress(total, pProfile, pSkills, pEdu, pProj) {
  // Master bar + badge
  if (progressFill)    progressFill.style.width    = total + "%";
  if (progressPercent) progressPercent.textContent = total + "%";

  // Navbar pill
  if (navProgressFill) navProgressFill.style.width = total + "%";
  if (navProgressText) navProgressText.textContent  = total + "%";

  // Sidebar ring — circumference = 2π × 30 ≈ 188.5
  if (sidebarRing) sidebarRing.style.strokeDashoffset = 188.5 - (188.5 * total / 100);
  if (sidebarPct)  sidebarPct.textContent = total + "%";

  // Hero ring — circumference = 2π × 65 ≈ 408.41
  if (heroArc) heroArc.style.strokeDashoffset = 408.41 - (408.41 * total / 100);
  if (heroPct) heroPct.textContent = total + "%";

  // Individual bars
  setBar(profileBar,   profileVal,  pProfile);
  setBar(skillsBar,    skillsVal,   pSkills);
  setBar(educationBar, educationVal, pEdu);
  setBar(projectsBar,  projectsVal,  pProj);
}

function setBar(barEl, valEl, pct) {
  if (barEl) barEl.style.width = pct + "%";
  if (valEl) valEl.textContent = pct + "%";
}

/* ── Append dynamic activity ── */
function appendActivity(profileOk, skills, edu, proj) {
  const list = document.getElementById("activityList");
  if (!list) return;

  const items = [];
  if (!profileOk) items.push({ cls: "act-warn", fa: "fa-user", text: "Profile incomplete — fill your details to continue", time: "Action needed", tag: "tag-yellow", label: "Required" });
  if (skills > 0) items.push({ cls: "act-success", fa: "fa-brain", text: `${skills} skill${skills > 1 ? "s" : ""} added to your portfolio`, time: "Updated", tag: "tag-green", label: "Done" });
  if (edu > 0)    items.push({ cls: "act-success", fa: "fa-graduation-cap", text: `${edu} education record${edu > 1 ? "s" : ""} saved`, time: "Updated", tag: "tag-green", label: "Done" });
  if (proj > 0)   items.push({ cls: "act-success", fa: "fa-project-diagram", text: `${proj} project${proj > 1 ? "s" : ""} in your portfolio`, time: "Updated", tag: "tag-green", label: "Done" });

  items.forEach(item => {
    const el = document.createElement("div");
    el.className = "activity-item";
    el.innerHTML = `
      <div class="act-icon ${item.cls}"><i class="fas ${item.fa}"></i></div>
      <div class="act-body">
        <span class="act-text">${item.text}</span>
        <span class="act-time">${item.time}</span>
      </div>
      <span class="act-tag ${item.tag}">${item.label}</span>`;
    list.appendChild(el);
  });
}

/* ── Logout ── */
logoutBtn.addEventListener("click", async () => {
  await signOut(auth);
  localStorage.clear();
  window.location.href = "index.html";
});
