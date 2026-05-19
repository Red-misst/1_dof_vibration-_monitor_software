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
  const container = document.getElementById('reportsContainer');
  if (container) {
    container.innerHTML = '<div style="color:var(--text-tertiary);font-size:11px;font-family:monospace;padding:12px;"><i class="fas fa-spinner fa-spin"></i> LOADING REPORTS...</div>';
  }
  try {
    const res = await fetch('/api/reports');
    if (!res.ok) throw new Error('Failed to load reports');
    const data = await res.json();
    updateReportsList(data.reports);
  } catch (err) {
    console.error('Error loading reports:', err);
    if (container) {
      container.innerHTML = '<div style="color:var(--accent-red);font-size:11px;font-family:monospace;padding:12px;">FAILED TO LOAD REPORTS</div>';
    }
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
    const mode = report.metadata?.mode || (report.metadata?.offline ? 'Template' : 'AI');
    const modeColor = mode === 'AI' ? 'var(--accent-blue)' : 'var(--text-tertiary)';
    const badge = `<span style="font-size:9px;background:${modeColor};color:white;padding:2px 6px;border-radius:4px;font-weight:600;text-transform:uppercase;">${mode}</span>`;

    card.innerHTML = `
      <div>
        <div class="font-medium text-gray-200" style="font-weight:500;display:flex;align-items:center;gap:6px;">
          <span>${report.name}</span>
          ${badge}
        </div>
        <div class="text-xs text-gray-400" style="font-size:11px;color:#9ca3af;margin-top:2px;">Created: ${createdDate}</div>
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
  const useAi = document.getElementById('useAiReportCheckbox')?.checked || false;

  if (!sessionId) return;

  if (reportStatus) {
    reportStatus.innerHTML = '<span style="color:#60a5fa;"><i class="fas fa-circle-notch fa-spin"></i> Generating report...</span>';
  }
  if (generateReportBtn) generateReportBtn.disabled = true;
  if (window.startLoading) window.startLoading();

  try {
    const res = await fetch('/api/reports/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId, authorName, useAi })
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
    if (window.stopLoading) window.stopLoading();
  }
}

async function deleteReport(reportId) {
  if (!confirm('Are you sure you want to delete this report?')) return;
  if (window.startLoading) window.startLoading();

  try {
    const res = await fetch(`/api/reports/${reportId}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Failed to delete report');
    loadReports();
  } catch (err) {
    console.error('Error deleting report:', err);
  } finally {
    if (window.stopLoading) window.stopLoading();
  }
}
