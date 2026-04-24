import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import {
  getFirestore, doc, getDoc, collection, getDocs, setDoc, addDoc, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { aiService } from "./aiService.js";
import { firebaseConfig } from "./firebase-config.js";

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
      getDoc(doc(db, "users", uid, "education", "main")),
      getDocs(collection(db, "users", uid, "projects")),
      getDoc(doc(db, "users", uid))
    ]);

    const numSkills = skillsSnap.size;
    
    // Count education records from the main document
    let numEdu = 0;
    if (eduSnap.exists()) {
      const eData = eduSnap.data();
      const hasData = (obj) => obj && Object.values(obj).some(v => String(v).trim() !== '');
      if (hasData(eData.university)) numEdu++;
      if (hasData(eData.school)) numEdu++;
    }

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

/* AI Portfolio Scoring */
async function runPortfolioAudit() {
  const user = auth.currentUser;
  if (!user) return;

  const btn = document.getElementById('analyzePortfolioBtn');
  btn.disabled = true;
  btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Auditing...';

  try {
    // Collect data for audit
    const [profile, skills, edu, proj] = await Promise.all([
      getDoc(doc(db, 'users', user.uid)),
      getDocs(collection(db, 'users', user.uid, 'skills')),
      getDoc(doc(db, 'users', user.uid, 'education', 'main')),
      getDocs(collection(db, 'users', user.uid, 'projects'))
    ]);

    let eduCount = 0;
    if (edu.exists()) {
      const eData = edu.data();
      const hasData = (obj) => obj && Object.values(obj).some(v => String(v).trim() !== '');
      if (hasData(eData.university)) eduCount++;
      if (hasData(eData.school)) eduCount++;
    }

    const auditData = {
      profile: profile.exists() ? profile.data() : {},
      skillsCount: skills.size,
      eduCount: eduCount,
      projectsCount: proj.size,
      projects: proj.docs.map(d => ({ title: d.data().title, description: d.data().description || d.data().desc || '' }))
    };

    const analysis = await aiService.analyzePortfolioScore(auditData);
    
    // Update UI
    const scoreVal = document.getElementById('aiScoreVal');
    const scoreFill = document.getElementById('aiScoreFill');
    const rankEl = document.getElementById('aiScoreRank');
    const feedbackEl = document.getElementById('aiScoreFeedback');
    const tipsContainer = document.getElementById('aiTipsContainer');

    scoreVal.textContent = analysis.score;
    const offset = 282.7 - (282.7 * analysis.score / 100);
    scoreFill.style.strokeDashoffset = offset;
    
    rankEl.textContent = analysis.score > 80 ? 'Exceptional' : analysis.score > 60 ? 'Professional' : 'Needs Improvement';
    rankEl.style.color = analysis.score > 80 ? 'var(--accent-3)' : analysis.score > 60 ? 'var(--accent)' : 'var(--yellow)';
    
    feedbackEl.textContent = analysis.feedback;

    tipsContainer.innerHTML = analysis.tips.map(tip => `
      <div class="ai-tip">
        <i class="fas fa-lightbulb"></i>
        <span>${tip}</span>
      </div>
    `).join('');

    // Save score to Firestore for persistence
    await setDoc(doc(db, 'users', user.uid, 'settings', 'ai_score'), {
      score: analysis.score,
      analysis,
      updatedAt: new Date().toISOString()
    });

  } catch (err) {
    console.error(err);
    alert('AI Audit failed: ' + err.message);
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<i class="fas fa-magnifying-glass-chart"></i> Run Fresh Audit';
  }
}

document.getElementById('analyzePortfolioBtn').addEventListener('click', runPortfolioAudit);

/* Resume Parsing */
document.getElementById('parseResumeBtn').addEventListener('click', async () => {
  const text = document.getElementById('resumeText').value.trim();
  if (!text) {
    alert('Please paste some resume text first!');
    return;
  }

  const btn = document.getElementById('parseResumeBtn');
  const status = document.getElementById('parseStatus');
  
  btn.disabled = true;
  status.style.display = 'flex';

  try {
    const data = await aiService.parseResume(text);
    const user = auth.currentUser;

    // 1. Profile
    if (data.FullName || data.Role || data.Summary) {
      await setDoc(doc(db, 'users', user.uid), {
        fullName: data.FullName || '',
        role: data.role || data.Role || '',
        bio: data.Summary || ''
      }, { merge: true });
    }

    // 2. Skills
    if (data.Skills && Array.isArray(data.Skills)) {
      for (const s of data.Skills) {
        await addDoc(collection(db, 'users', user.uid, 'skills'), {
          name: s,
          level: 'Beginner', // Default
          category: 'Core'
        });
      }
    }

    // 3. Projects
    if (data.Projects && Array.isArray(data.Projects)) {
      for (const p of data.Projects) {
        await addDoc(collection(db, 'users', user.uid, 'projects'), {
          title: p.title || p.name || 'Untitled Project',
          description: p.description || p.desc || '',
          tech: Array.isArray(p.technologies || p.tech) ? (p.technologies || p.tech).join(', ') : (p.technologies || p.tech || ''),
          createdAt: serverTimestamp()
        });
      }
    }

    // 4. Education
    if (data.Education && Array.isArray(data.Education)) {
      const eduData = { university: {}, school: {} };
      if (data.Education[0]) {
        const e = data.Education[0];
        eduData.university = {
          degree: e.degree || '',
          name: e.school || e.university || '',
          year: e.duration || e.year || '',
          grade: e.grade || '',
          location: e.location || ''
        };
      }
      if (data.Education[1]) {
        const e = data.Education[1];
        eduData.school = {
          name: e.school || '',
          board: e.board || 'State Board',
          location: e.location || '',
          year: e.duration || e.year || '',
          grade: e.grade || ''
        };
      }
      await setDoc(doc(db, 'users', user.uid, 'education', 'main'), eduData);
    }

    alert('Resume parsed and data imported! Recalculating your dashboard...');
    window.location.reload();

  } catch (err) {
    alert('Parsing failed: ' + err.message);
  } finally {
    btn.disabled = false;
    status.style.display = 'none';
  }
});

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
