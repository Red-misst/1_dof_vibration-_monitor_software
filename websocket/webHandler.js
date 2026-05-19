/**
 * websocket/webHandler.js
 * Handles all messages received from web browser clients.
 * Session control, data retrieval, device queries.
 */

import * as db from '../server/db.js';

let webClients;
let espClients;
let getCurrentSession;
let setCurrentSession;
let broadcastToWebClients;

export function init(shared) {
  webClients = shared.webClients;
  espClients = shared.espClients;
  getCurrentSession = shared.getCurrentSession;
  setCurrentSession = shared.setCurrentSession;
  broadcastToWebClients = shared.broadcastToWebClients;
}

export function handleWebConnection(ws) {
  webClients.add(ws);
  console.log('[WEB] Browser client connected');

  // Send current state immediately
  const session = getCurrentSession();
  ws.send(JSON.stringify({
    type: 'session_status',
    isActive: session !== null,
    sessionId: session?.id || null,
    connectedDevices: Array.from(espClients.keys())
  }));

  ws.on('message', async (raw) => {
    let data;
    try {
      data = JSON.parse(raw);
    } catch {
      console.warn('[WEB] Invalid JSON received');
      return;
    }

    try {
      await routeMessage(ws, data);
    } catch (err) {
      console.error('[WEB] Error handling message:', err.message);
      ws.send(JSON.stringify({ type: 'error', message: err.message }));
    }
  });

  ws.on('close', () => {
    webClients.delete(ws);
    console.log('[WEB] Browser client disconnected');
  });

  ws.on('error', (err) => {
    console.error('[WEB] WebSocket error:', err.message);
  });
}

async function routeMessage(ws, data) {
  switch (data.type) {

    case 'get_device_list': {
      ws.send(JSON.stringify({
        type: 'device_list',
        devices: Array.from(espClients.keys())
      }));
      for (const deviceId of espClients.keys()) {
        ws.send(JSON.stringify({ type: 'device_status', deviceId, status: 'connected' }));
      }
      break;
    }

    case 'start_test': {
      const sessionName = data.sessionName || `Z-Axis Test ${new Date().toLocaleTimeString()}`;
      const testMass = parseFloat(data.testMass) || 1.0;
      const session = db.createSession({ name: sessionName, testMass });
      setCurrentSession(session);
      broadcastToWebClients({ type: 'test_started', sessionId: session.id, sessionName, testMass });
      break;
    }

    case 'stop_test': {
      const session = getCurrentSession();
      if (session) {
        const updated = db.stopSession(session.id);
        setCurrentSession(null);
        broadcastToWebClients({ type: 'test_stopped', sessionId: updated.id });
      }
      break;
    }

    case 'get_sessions': {
      const sessions = db.getAllSessions();
      ws.send(JSON.stringify({ type: 'sessions_list', sessions }));
      break;
    }

    case 'get_session_data': {
      const session = db.getSessionById(data.sessionId);
      if (!session) {
        ws.send(JSON.stringify({ type: 'error', message: 'Session not found' }));
        break;
      }
      const vibData = db.getVibrationData(data.sessionId);
      ws.send(JSON.stringify({
        type: 'session_data',
        sessionId: data.sessionId,
        data: vibData,
        frequencyData: {
          frequencies: vibData.map(d => d.frequency).filter(Boolean),
          amplitudes: vibData.map(d => d.amplitude).filter(Boolean),
          rawAccelerations: vibData.map(d => d.rawAcceleration).filter(Boolean),
          naturalFrequency: session.naturalFrequency,
          peakAmplitude: session.peakAmplitude,
          qFactor: session.mechanicalProperties?.qFactor,
          bandwidth: session.mechanicalProperties?.bandwidth
        }
      }));
      break;
    }

    case 'delete_session': {
      const deleted = db.deleteSession(data.sessionId);
      ws.send(JSON.stringify({ type: 'session_deleted', sessionId: data.sessionId, success: deleted }));
      if (deleted) {
        broadcastToWebClients({ type: 'session_deleted', sessionId: data.sessionId });
      }
      break;
    }

    default:
      console.warn(`[WEB] Unknown message type: ${data.type}`);
  }
}
