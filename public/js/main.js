/**
 * public/js/main.js
 * Application bootstrapper — initializes all modules in the correct order.
 * This is the single entry point loaded by index.html.
 */

import { initCharts } from './app/charts.js';
import { connectWebSocket } from './app/websocket.js';
import { initControls } from './app/controls.js';
import { initDiagnostics } from './diagnostics.js';

// Import Chat & Report modules
import { initChatInterface } from './chat/ui.js';
import { updateChatSessionSelector, addSessionToChat } from './chat/sessions.js';
import { initReportGenerator, updateSessionsDropdown } from './report/generator.js';

// Global notification helper (used across modules)
window.showNotification = function(message, type = 'info') {
  const colors = { success: '#10b981', error: '#ef4444', info: '#3b82f6', warning: '#f59e0b' };
  const toast = document.createElement('div');
  toast.style.cssText = `
    position:fixed;top:20px;right:20px;z-index:10000;
    background:${colors[type] || colors.info};color:white;
    padding:12px 20px;border-radius:8px;font-weight:500;font-size:14px;
    box-shadow:0 4px 12px rgba(0,0,0,0.3);
    transition: all 0.3s ease;max-width:300px;
  `;
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3500);
};

// Global loading bar helper (used across modules for asynchronous actions)
window.startLoading = function() {
  let bar = document.getElementById('topProgressBar');
  if (!bar) {
    bar = document.createElement('div');
    bar.id = 'topProgressBar';
    document.body.appendChild(bar);
  }
  bar.className = 'loading';
  bar.style.width = '30%';
  setTimeout(() => { if (bar.className === 'loading') bar.style.width = '60%'; }, 200);
  setTimeout(() => { if (bar.className === 'loading') bar.style.width = '85%'; }, 400);
};

window.stopLoading = function() {
  const bar = document.getElementById('topProgressBar');
  if (!bar) return;
  bar.className = 'complete';
  bar.style.width = '100%';
  setTimeout(() => {
    if (bar.className === 'complete') {
      bar.style.opacity = '0';
      bar.style.width = '0%';
    }
  }, 400);
};

document.addEventListener('DOMContentLoaded', () => {
  window.startLoading();
  console.log('[App] Initializing Z-Axis Vibration Monitor v2.0 (Offline)');
  initCharts();
  initControls();
  initChatInterface();
  initReportGenerator();
  connectWebSocket();
  initDiagnostics();
  console.log('[App] Ready');
});
