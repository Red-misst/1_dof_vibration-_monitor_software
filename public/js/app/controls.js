/**
 * public/js/app/controls.js
 * Start/stop/export buttons, session state, device status display.
 */

import { sendMessage } from './websocket.js';
import { clearAllCharts } from './charts.js';

let isRecording = false;
let connectedDevices = new Set();

export function initControls() {
  document.getElementById('startTest')?.addEventListener('click', handleStartTest);
  document.getElementById('startSessionBtn')?.addEventListener('click', handleStartTest);
  document.getElementById('stopTest')?.addEventListener('click', handleStopTest);
  document.getElementById('exportData')?.addEventListener('click', handleExport);
}

function handleStartTest() {
  const name = document.getElementById('sessionName')?.value?.trim();
  const mass = parseFloat(document.getElementById('testMass')?.value) || 1.0;

  if (!name) {
    const errEl = document.getElementById('sessionNameError');
    if (errEl) { errEl.textContent = 'Session name is required'; errEl.classList.remove('hidden'); }
    showNotification('Please enter a session name', 'error');
    return;
  }

  const errEl = document.getElementById('sessionNameError');
  if (errEl) errEl.classList.add('hidden');

  sendMessage({ type: 'start_test', sessionName: name, testMass: mass });
}

function handleStopTest() {
  sendMessage({ type: 'stop_test' });
}

function handleExport() {
  const sessionId = document.getElementById('sessionId')?.textContent;
  if (!sessionId || sessionId === 'None') {
    showNotification('No active session to export', 'error');
    return;
  }
  window.open(`/api/export/${sessionId}?format=csv`, '_blank');
}

export function onTestStarted(data) {
  isRecording = true;
  window._dataPointCount = 0;
  document.getElementById('dataPointCount').textContent = '0';
  document.getElementById('sessionId').textContent = data.sessionId || 'Active';
  document.getElementById('currentZValue').textContent = '0.000';
  document.getElementById('amplitudeValue').textContent = '0.000';
  clearAllCharts();
  setButtonStates(true);
  sendMessage({ type: 'get_sessions' });
}

export function onTestStopped(data) {
  isRecording = false;
  setButtonStates(false);
  showNotification('Processing frequency analysis...', 'info');
  sendMessage({ type: 'get_sessions' });
}

export function updateDeviceStatus(deviceId, status) {
  if (status === 'connected') {
    connectedDevices.add(deviceId);
  } else {
    connectedDevices.delete(deviceId);
  }
  refreshDeviceDisplay();
}

function refreshDeviceDisplay() {
  const indicator = document.getElementById('deviceIndicator');
  const text = document.getElementById('deviceStatus');
  if (!indicator || !text) return;

  if (connectedDevices.size > 0) {
    indicator.className = 'status-indicator connected';
    text.textContent = `${connectedDevices.size} device(s)`;
    text.className = 'ml-2 font-semibold text-green-400';
  } else {
    indicator.className = 'status-indicator disconnected';
    text.textContent = 'No devices';
    text.className = 'ml-2 font-semibold text-red-400';
  }
}

function setButtonStates(recording) {
  const startBtn = document.getElementById('startTest');
  const stopBtn = document.getElementById('stopTest');
  const exportBtn = document.getElementById('exportData');
  const startSessionBtn = document.getElementById('startSessionBtn');

  [startBtn, startSessionBtn].forEach(b => {
    if (!b) return;
    b.disabled = recording;
    b.classList.toggle('opacity-50', recording);
  });
  if (stopBtn) { stopBtn.disabled = !recording; stopBtn.classList.toggle('opacity-50', !recording); }
  if (exportBtn) { exportBtn.disabled = recording; exportBtn.classList.toggle('opacity-50', recording); }
}
