/**
 * public/js/report/generator.js
 * Handles PDF report generation requests and report listing.
 */

let reportSessionSelect;
let generateReportBtn;
let reportStatus;
let reportsContainer;

export function initReportGenerator() {
  reportSessionSelect = document.getElementById('reportSessionSelect');
  generateReportBtn = document.getElementById('generateReportBtn');
  reportStatus = document.getElementById('reportStatus');
  reportsContainer = document.getElementById('reportsContainer');

  if (generateReportBtn) generateReportBtn.disabled = true;

  reportSessionSelect?.addEventListener('change', () => {
    if (generateReportBtn) generateReportBtn.disabled = !reportSessionSelect.value;
  });

  generateReportBtn?.addEventListener('click', generateReport);

  loadSessions();
  loadReports();
}

async function loadSessions() {
  try {
    const res = await fetch('/api/sessions');
    if (!res.ok) throw new Error('Failed to load sessions');
    const sessions = await res.json();
    updateSessionsDropdown(sessions);
  } catch (err) {
    console.error('Error loading sessions:', err);
  }
}

export function updateSessionsDropdown(sessions) {
  if (!reportSessionSelect) return;
  while (reportSessionSelect.options.length > 1) {
    reportSessionSelect.remove(1);
  }

  if (!sessions || sessions.length === 0) {
    const option = document.createElement('option');
    option.value = '';
    option.text = 'No sessions available';
    option.disabled = true;
    reportSessionSelect.add(option);
    return;
  }

  sessions.forEach(session => {
    const option = document.createElement('option');
    option.value = session.id || session._id;
    const startTime = new Date(session.startTime).toLocaleString();
    option.text = `${session.name} (${startTime})`;
    reportSessionSelect.add(option);
  });
}

async function loadReports() {
  try {
    const res = await fetch('/api/reports');
    if (!res.ok) throw new Error('Failed to load reports');
    const data = await res.json();
    updateReportsList(data.reports);
  } catch (err) {
    console.error('Error loading reports:', err);
  }
}

function updateReportsList(reports) {
  if (!reportsContainer) return;
  reportsContainer.innerHTML = '';

  if (!reports || reports.length === 0) {
    reportsContainer.innerHTML = '<div class="text-gray-400 text-sm p-2">No reports available</div>';
    return;
  }

  reports.forEach(report => {
    const card = document.createElement('div');
    card.className = 'report-card flex justify-between items-center p-3 hover:bg-gray-600';
    card.style.cssText = 'display:flex;justify-content:space-between;align-items:center;padding:12px;border-bottom:1px solid #374151;';

    const createdDate = new Date(report.createdAt).toLocaleString();

    card.innerHTML = `
      <div>
        <div class="font-medium text-gray-200" style="font-weight:500;">${report.name}</div>
        <div class="text-xs text-gray-400" style="font-size:11px;color:#9ca3af;">Created: ${createdDate}</div>
      </div>
      <div style="display:flex;gap:8px;">
        <a href="/api/reports/${report.id}/download" target="_blank"
           style="background:#2563eb;color:white;padding:4px 8px;border-radius:4px;font-size:11px;text-decoration:none;">
           <i class="fas fa-download"></i> Download
        </a>
        <button class="delete-report" data-report-id="${report.id}"
                style="background:#dc2626;color:white;border:none;padding:4px 8px;border-radius:4px;font-size:11px;cursor:pointer;">
           <i class="fas fa-trash"></i> Delete
        </button>
      </div>
    `;

    card.querySelector('.delete-report').addEventListener('click', () => deleteReport(report.id));
    reportsContainer.appendChild(card);
  });
}

async function generateReport() {
  const sessionId = reportSessionSelect.value;
  const authorName = document.getElementById('reportAuthorName').value.trim() || 'Vibration Analysis Team';

  if (!sessionId) return;

  if (reportStatus) {
    reportStatus.innerHTML = '<span style="color:#60a5fa;"><i class="fas fa-circle-notch fa-spin"></i> Generating report...</span>';
  }
  if (generateReportBtn) generateReportBtn.disabled = true;

  try {
    const res = await fetch('/api/reports/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId, authorName })
    });

    if (!res.ok) throw new Error('Failed to generate report');

    if (reportStatus) {
      reportStatus.innerHTML = '<span style="color:#34d399;"><i class="fas fa-check"></i> Report generated successfully!</span>';
    }
    setTimeout(() => {
      loadReports();
      if (reportStatus) reportStatus.innerHTML = '';
    }, 2500);
  } catch (err) {
    console.error('Error generating report:', err);
    if (reportStatus) {
      reportStatus.innerHTML = `<span style="color:#f87171;">Error: ${err.message}</span>`;
    }
  } finally {
    if (generateReportBtn) generateReportBtn.disabled = false;
  }
}

async function deleteReport(reportId) {
  if (!confirm('Are you sure you want to delete this report?')) return;

  try {
    const res = await fetch(`/api/reports/${reportId}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Failed to delete report');
    loadReports();
  } catch (err) {
    console.error('Error deleting report:', err);
  }
}
