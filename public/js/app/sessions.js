/**
 * public/js/app/sessions.js
 * Session list rendering, view, and delete UI logic.
 */

import { sendMessage } from './websocket.js';
import { updateChatSessionSelector } from '../chat/sessions.js';
import { updateSessionsDropdown as updateReportSessions } from '../report/generator.js';

let pendingDeleteId = null;

export function updateSessionsList(sessions) {
  const tbody = document.getElementById('sessionList');
  if (!tbody) return;
  tbody.innerHTML = '';

  if (!sessions?.length) {
    tbody.innerHTML = '<tr><td colspan="4" class="px-4 py-3 text-center text-gray-500">No sessions found</td></tr>';
  } else {
    sessions.forEach(session => tbody.appendChild(buildSessionRow(session)));
  }

  // Update report + chat session dropdowns using imported functions
  updateReportSessions(sessions);
  updateChatSessionSelector(sessions);
  
  document.dispatchEvent(new CustomEvent('sessionsListUpdated', { detail: { sessions } }));
}

function buildSessionRow(session) {
  const row = document.createElement('tr');
  const startStr = new Date(session.startTime).toLocaleString();
  const statusCls = session.isActive ? 'bg-green-600' : 'bg-blue-600';
  const id = session._id || session.id;
  
  const actionBtn = session.isActive
    ? `<button class="text-red-400 hover:text-red-300 p-1 stop-btn" data-id="${id}"><i class="fas fa-stop"></i></button>`
    : `<button class="text-red-400 hover:text-red-300 p-1 delete-btn" data-id="${id}"><i class="fas fa-trash"></i></button>`;

  row.innerHTML = `
    <td class="px-4 py-3">${session.name}</td>
    <td class="px-4 py-3">${startStr}</td>
    <td class="px-4 py-3"><span class="px-2 py-1 text-xs rounded ${statusCls}">${session.isActive ? 'Active' : 'Completed'}</span></td>
    <td class="px-4 py-3 flex space-x-2">
      <button class="text-blue-400 hover:text-blue-300 p-1 view-btn" data-id="${id}"><i class="fas fa-eye"></i></button>
      <button class="text-green-400 hover:text-green-300 p-1 export-btn" data-id="${id}"><i class="fas fa-download"></i></button>
      ${actionBtn}
    </td>`;
  return row;
}

export function onSessionDeleted(data) {
  if (window.stopLoading) window.stopLoading();
  if (data.success) {
    showNotification('Session deleted', 'success');
    sendMessage({ type: 'get_sessions' });
  } else {
    showNotification('Delete failed: ' + (data.error || 'Unknown error'), 'error');
  }
}

// Set up event delegation for session list actions
document.addEventListener('DOMContentLoaded', () => {
  const sessionList = document.getElementById('sessionList');
  if (sessionList) {
    sessionList.addEventListener('click', (e) => {
      const btn = e.target.closest('button');
      if (!btn) return;
      
      const id = btn.dataset.id;
      if (!id) return;

      if (btn.classList.contains('view-btn')) {
        showNotification('Loading session data...', 'info');
        if (window.startLoading) window.startLoading();
        sendMessage({ type: 'get_session_data', sessionId: id });
        const sessionIdEl = document.getElementById('sessionId');
        if (sessionIdEl) sessionIdEl.textContent = id;
      } else if (btn.classList.contains('export-btn')) {
        window.open(`/api/export/${id}?format=xls`, '_blank');
      } else if (btn.classList.contains('stop-btn')) {
        sendMessage({ type: 'stop_test' });
      } else if (btn.classList.contains('delete-btn')) {
        pendingDeleteId = id;
        const modal = document.getElementById('deleteModal');
        if (modal) modal.style.display = 'flex';
      }
    });
  }

  // Setup Delete Modal buttons
  const confirmBtn = document.getElementById('confirmDeleteBtn');
  const cancelBtn = document.getElementById('cancelDeleteBtn');

  if (confirmBtn) {
    confirmBtn.addEventListener('click', () => {
      if (pendingDeleteId) {
        if (window.startLoading) window.startLoading();
        sendMessage({ type: 'delete_session', sessionId: pendingDeleteId });
        closeDeleteModal();
      }
    });
  }

  if (cancelBtn) {
    cancelBtn.addEventListener('click', () => {
      closeDeleteModal();
    });
  }
});

function closeDeleteModal() {
  pendingDeleteId = null;
  const modal = document.getElementById('deleteModal');
  if (modal) modal.style.display = 'none';
}
