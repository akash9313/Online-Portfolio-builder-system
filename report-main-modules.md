# Portfolio Builder Report - Main Modules

## Module: public/settings.html

This is the export/report UI section. It includes the buttons that trigger report generation.

```html
<section class="settings-card reveal reveal-delay-3">
  <div class="card-header">
    <div class="card-header-icon fi-yellow"><i class="fas fa-database"></i></div>
    <div>
      <h3 class="card-title">Data & Export</h3>
      <p class="card-sub">Download or manage your portfolio data</p>
    </div>
  </div>

  <div class="export-grid">
    <div class="export-item">
      <div class="export-icon fi-blue"><i class="fas fa-file-code"></i></div>
      <div class="export-text">
        <strong>Export as JSON</strong>
        <span>All profile, skills & project data</span>
      </div>
      <button class="btn btn-ghost btn-sm" id="exportJsonBtn">
        <i class="fas fa-download"></i> Export
      </button>
    </div>
    <div class="export-item">
      <div class="export-icon fi-green"><i class="fas fa-file-csv"></i></div>
      <div class="export-text">
        <strong>Export as CSV</strong>
        <span>Skills and projects in spreadsheet format</span>
      </div>
      <button class="btn btn-ghost btn-sm" id="exportCsvBtn">
        <i class="fas fa-download"></i> Export
      </button>
    </div>
    <div class="export-item">
      <div class="export-icon fi-pink"><i class="fas fa-file-pdf"></i></div>
      <div class="export-text">
        <strong>Export as PDF</strong>
        <span>Download portfolio as a PDF resume</span>
      </div>
      <button class="btn btn-ghost btn-sm" id="exportPdfBtn">
        <i class="fas fa-download"></i> Export
      </button>
    </div>
  </div>
</section>
```

---

## Module: public/settings.js

This is the main report/export module. It loads the user data and exports it as JSON or CSV, and opens the preview page for PDF export.

```js
async function fetchAllData(uid) {
  const [profileSnap, skillsSnap, eduSnap, projSnap] = await Promise.all([
    getDoc(doc(db, 'users', uid)),
    getDoc(doc(db, 'users', uid, 'skills', 'data')),
    getDoc(doc(db, 'users', uid, 'education', 'data')),
    getDoc(doc(db, 'users', uid, 'projects', 'data')),
  ]);

  return {
    profile:   profileSnap.exists()  ? profileSnap.data()  : {},
    skills:    skillsSnap.exists()   ? skillsSnap.data()   : {},
    education: eduSnap.exists()      ? eduSnap.data()      : {},
    projects:  projSnap.exists()     ? projSnap.data()     : {},
    exportedAt: new Date().toISOString(),
  };
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a   = document.createElement('a');
  a.href    = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function exportJson(data) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  downloadBlob(blob, `portfolio-report-${Date.now()}.json`);
}

function exportCsv(data) {
  let csv = 'Section,Key,Value\n';

  Object.entries(data.profile).forEach(([k, v]) => {
    csv += `Profile,${escapeCsv(k)},${escapeCsv(String(v))}\n`;
  });

  const skills = data.skills.list || data.skills.items || [];
  if (Array.isArray(skills)) {
    skills.forEach(s => {
      csv += `Skills,${escapeCsv(s.name || '')},${escapeCsv(s.level || '')}\n`;
    });
  }

  const projects = data.projects.list || data.projects.items || [];
  if (Array.isArray(projects)) {
    projects.forEach(p => {
      csv += `Projects,${escapeCsv(p.title || p.name || '')},${escapeCsv(p.description || '')}\n`;
    });
  }

  const blob = new Blob([csv], { type: 'text/csv' });
  downloadBlob(blob, `portfolio-report-${Date.now()}.csv`);
}

function escapeCsv(value) {
  return `"${String(value).replace(/"/g, '""')}"`;
}

exportJsonBtn.addEventListener('click', async () => {
  const data = await fetchAllData(currentUser.uid);
  exportJson(data);
});

exportCsvBtn.addEventListener('click', async () => {
  const data = await fetchAllData(currentUser.uid);
  exportCsv(data);
});

exportPdfBtn.addEventListener('click', () => {
  window.open('preview.html', '_blank');
});
```

---

## Notes

- These are the most important report modules for submission.
- `settings.html` contains the export interface.
- `settings.js` contains the main export logic.
- `preview.html` is used only for the PDF export path, so it is secondary.
