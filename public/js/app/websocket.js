/**
 * public/js/app/websocket.js
 * WebSocket connection management and message dispatcher.
 */

import { updateVibrationCharts, loadHistoricalCharts, clearAllCharts } from './charts.js';
import { updateSessionsList, onSessionDeleted } from './sessions.js';
import { onTestStarted, onTestStopped, updateDeviceStatus } from './controls.js';

let socket = null;
let reconnectAttempts = 0;
const MAX_RECONNECT = 10;

export function connectWebSocket() {
  if (socket && socket.readyState !== WebSocket.CLOSED) socket.close();

  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const wsUrl = `${protocol}//${window.location.host}/web?client=true`;
  console.log('[WS] Connecting to:', wsUrl);

  try {
    socket = new WebSocket(wsUrl);

    socket.addEventListener('open', () => {
      console.log('[WS] Connected');
      reconnectAttempts = 0;
      setConnectionStatus('connected');
      sendMessage({ type: 'get_device_list' });
      sendMessage({ type: 'get_sessions' });
    });

    socket.addEventListener('close', (e) => {
      setConnectionStatus('disconnected');
      console.warn('[WS] Disconnected:', e.code);
      scheduleReconnect();
    });

    socket.addEventListener('error', () => {
      setConnectionStatus('error');
    });

    socket.addEventListener('message', (e) => {
      try {
        handleMessage(JSON.parse(e.data));
      } catch (err) {
        console.error('[WS] Parse error:', err);
      }
    });
  } catch (err) {
    console.error('[WS] Connection failed:', err);
    scheduleReconnect();
  }
}

function scheduleReconnect() {
  if (reconnectAttempts >= MAX_RECONNECT) {
    showNotification('Connection lost. Please refresh the page.', 'error');
    return;
  }
  const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), 15000);
  reconnectAttempts++;
  console.log(`[WS] Reconnecting in ${delay}ms (attempt ${reconnectAttempts})`);
  setTimeout(connectWebSocket, delay);
}

function handleMessage(data) {
  switch (data.type) {
    case 'vibration_data':
      window._dataPointCount = (window._dataPointCount || 0) + 1;
      document.getElementById('dataPointCount').textContent = window._dataPointCount;
      document.getElementById('currentZValue').textContent = (data.deltaZ || 0).toFixed(3);
      document.getElementById('amplitudeValue').textContent = (data.amplitude || 0).toFixed(3);
      document.getElementById('frequencyValue').textContent = (data.frequency || 0).toFixed(2);
      updateVibrationCharts(data);
      break;

    case 'session_status':
      if (data.isActive) onTestStarted({ sessionId: data.sessionId });
      break;

    case 'device_status':
      updateDeviceStatus(data.deviceId, data.status);
      break;

    case 'device_list':
      (data.devices || []).forEach(d => updateDeviceStatus(d, 'connected'));
      break;

    case 'test_started':
      window._dataPointCount = 0;
      clearAllCharts();
      onTestStarted(data);
      break;

    case 'test_stopped':
      onTestStopped(data);
      setTimeout(() => sendMessage({ type: 'get_session_data', sessionId: data.sessionId }), 1000);
      break;

    case 'sessions_list':
      updateSessionsList(data.sessions);
      break;

    case 'session_data':
      loadHistoricalCharts(data.data || [], data.frequencyData || {});
      document.getElementById('dataPointCount').textContent = (data.data || []).length;
      showNotification('Session data loaded', 'success');
      break;

    case 'session_deleted':
      onSessionDeleted(data);
      break;

    case 'frequency_data':
      if (data.frequency) document.getElementById('frequencyValue').textContent = data.frequency.toFixed(2);
      if (data.qFactor) document.getElementById('qFactorValue').textContent = data.qFactor.toFixed(1);
      if (data.amplitude) document.getElementById('amplitudeValue').textContent = data.amplitude.toFixed(3);
      break;

    case 'error':
      showNotification(data.message, 'error');
      break;
  }
}

export function sendMessage(data) {
  if (socket && socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify(data));
  } else {
    console.warn('[WS] Cannot send — not connected');
  }
}

function setConnectionStatus(status) {
  const indicator = document.getElementById('connectionIndicator');
  const text = document.getElementById('connectionStatus');
  if (!indicator || !text) return;
  const map = {
    connected: ['connected', 'Connected', 'text-green-400'],
    disconnected: ['disconnected', 'Disconnected', 'text-red-400'],
    error: ['disconnected', 'Connection Error', 'text-red-400']
  };
  const [cls, label, color] = map[status] || map.disconnected;
  indicator.className = `status-indicator ${cls}`;
  text.textContent = label;
  text.className = `ml-2 font-semibold ${color}`;
}
