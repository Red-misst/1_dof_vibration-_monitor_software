/**
 * public/js/app/sessions.js
 * Session list rendering, view, and delete UI logic.
 */

import { sendMessage } from './websocket.js';

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

  // Update report + chat session dropdowns
  if (typeof window.updateReportSessions === 'function') window.updateReportSessions(sessions);
  if (typeof window.updateChatSessionSelector === 'function') window.updateChatSessionSelector(sessions);
  document.dispatchEvent(new CustomEvent('sessionsListUpdated', { detail: { sessions } }));
}

function buildSessionRow(session) {
  const row = document.createElement('tr');
  const startStr = new Date(session.startTime).toLocaleString();
  const statusCls = session.isActive ? 'bg-green-600' : 'bg-blue-600';
  const actionBtn = session.isActive
    ? `<button class="text-red-400 hover:text-red-300 p-1" onclick="window._stopSession('${session._id || session.id}')"><i class="fas fa-stop"></i></button>`
    : `<button class="text-red-400 hover:text-red-300 p-1" onclick="window._openDeleteModal('${session._id || session.id}')"><i class="fas fa-trash"></i></button>`;

  row.innerHTML = `
    <td class="px-4 py-3">${session.name}</td>
    <td class="px-4 py-3">${startStr}</td>
    <td class="px-4 py-3"><span class="px-2 py-1 text-xs rounded ${statusCls}">${session.isActive ? 'Active' : 'Completed'}</span></td>
    <td class="px-4 py-3 flex space-x-2">
      <button class="text-blue-400 hover:text-blue-300 p-1" onclick="window._viewSession('${session._id || session.id}')"><i class="fas fa-eye"></i></button>
      <button class="text-green-400 hover:text-green-300 p-1" onclick="window._exportSession('${session._id || session.id}')"><i class="fas fa-download"></i></button>
      ${actionBtn}
    </td>`;
  return row;
}

export function onSessionDeleted(data) {
  if (data.success) {
    showNotification('Session deleted', 'success');
    sendMessage({ type: 'get_sessions' });
  } else {
    showNotification('Delete failed: ' + (data.error || 'Unknown error'), 'error');
  }
}

// Global session action handlers
window._viewSession = (id) => {
  showNotification('Loading session data...', 'info');
  sendMessage({ type: 'get_session_data', sessionId: id });
  document.getElementById('sessionId').textContent = id;
};

window._exportSession = (id) => {
  window.open(`/api/export/${id}?format=csv`, '_blank');
};

window._stopSession = (id) => {
  sendMessage({ type: 'stop_test' });
};

window._openDeleteModal = (id) => {
  pendingDeleteId = id;
  const modal = document.getElementById('deleteModal');
  if (modal) modal.style.display = 'flex';
};

window.closeDeleteModal = () => {
  pendingDeleteId = null;
  const modal = document.getElementById('deleteModal');
  if (modal) modal.style.display = 'none';
};

window.confirmDeleteSession = () => {
  if (pendingDeleteId) {
    sendMessage({ type: 'delete_session', sessionId: pendingDeleteId });
    window.closeDeleteModal();
  }
};
