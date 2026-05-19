/**
 * websocket/espHandler.js
 * Handles all messages received from ESP8266 devices.
 * Persists FFT data to SQLite and broadcasts to web clients.
 */

import * as db from '../server/db.js';

// Shared state references (injected from WS index)
let espClients;
let getCurrentSession;
let broadcastToWebClients;

export function init(shared) {
  espClients = shared.espClients;
  getCurrentSession = shared.getCurrentSession;
  broadcastToWebClients = shared.broadcastToWebClients;
}

export function handleESPConnection(ws) {
  console.log('[ESP] New ESP8266 connection');

  ws.on('message', async (raw) => {
    let data;
    try {
      data = JSON.parse(raw);
    } catch {
      console.warn('[ESP] Invalid JSON received');
      return;
    }

    if (data.type === 'device_connected') {
      espClients.set(data.deviceId, ws);
      console.log(`[ESP] Device registered: ${data.deviceId}`);
      broadcastToWebClients({
        type: 'device_status',
        deviceId: data.deviceId,
        status: 'connected'
      });
      return;
    }

    if (data.type === 'fft_result') {
      const session = getCurrentSession();
      if (!session || !session.isActive) return;

      try {
        db.insertVibrationData({
          sessionId: session.id,
          deviceId: data.deviceId || 'unknown',
          timestamp: data.timestamp || Date.now(),
          deltaZ: data.deltaZ || 0,
          frequency: data.frequency || 0,
          amplitude: data.amplitude || 0,
          rawAcceleration: data.raw_acceleration || 0
        });

        broadcastToWebClients({
          type: 'vibration_data',
          sessionId: session.id,
          deviceId: data.deviceId,
          timestamp: data.timestamp || Date.now(),
          deltaZ: data.deltaZ || 0,
          frequency: data.frequency || 0,
          amplitude: data.amplitude || 0,
          rawAcceleration: data.raw_acceleration || 0,
          receivedAt: new Date().toISOString(),
          isActive: true
        });
      } catch (err) {
        console.error('[ESP] Error saving vibration data:', err.message);
      }
    }
  });

  ws.on('close', () => {
    for (const [deviceId, client] of espClients.entries()) {
      if (client === ws) {
        espClients.delete(deviceId);
        console.log(`[ESP] Device disconnected: ${deviceId}`);
        broadcastToWebClients({
          type: 'device_status',
          deviceId,
          status: 'disconnected'
        });
        break;
      }
    }
  });

  ws.on('error', (err) => {
    console.error('[ESP] WebSocket error:', err.message);
  });
}
