/**
 * websocket/espHandler.js
 * Handles all messages received from ESP8266 devices.
 * Persists FFT data to SQLite and broadcasts to web clients.
 */

import * as db from '../server/db.js';
import { analyzeBatch } from '../server/dsp/analyzer.js';


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
  console.log('[ESP] New ESP8266 WebSocket connection');

  ws.on('message', async (raw) => {
    let data;
    try {
      data = JSON.parse(raw);
    } catch {
      console.warn('[ESP] Invalid JSON received via WebSocket');
      return;
    }

    try {
      await processESPMessage(data, ws);
    } catch (err) {
      console.error('[ESP] Error processing WebSocket message:', err.message);
    }
  });

  ws.on('close', () => {
    for (const [deviceId, client] of espClients.entries()) {
      if (client === ws) {
        espClients.delete(deviceId);
        console.log(`[ESP] Device disconnected from WiFi: ${deviceId}`);
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

export async function processESPMessage(data, ws = null) {
  if (!data) return;

  // Auto-register device if we receive any valid telemetry but it hasn't been registered yet.
  // This handles cases where the initial handshake was sent before the server opened the port.
  if (data.deviceId && !espClients.has(data.deviceId)) {
    espClients.set(data.deviceId, ws || 'serial');
    console.log(`[ESP] Auto-registered device on telemetry: ${data.deviceId} (${ws ? 'WiFi' : 'Serial'})`);
    broadcastToWebClients({
      type: 'device_status',
      deviceId: data.deviceId,
      status: 'connected'
    });
  }

  if (data.type === 'device_connected') {
    // Already handled by auto-register above, but update client reference just in case
    espClients.set(data.deviceId, ws || 'serial');
    return;
  }

  if (data.type === 'heartbeat') {
    const session = getCurrentSession();
    if (!session || !session.isActive) return;

    try {
      db.insertVibrationData({
        sessionId: session.id,
        deviceId: data.deviceId || 'unknown',
        timestamp: data.timestamp || Date.now(),
        deltaZ: data.deltaZ || 0,
        frequency: 0,
        amplitude: 0,
        rawAcceleration: data.raw_acceleration || 0
      });

      broadcastToWebClients({
        type: 'vibration_data',
        sessionId: session.id,
        deviceId: data.deviceId,
        timestamp: data.timestamp || Date.now(),
        deltaZ: data.deltaZ || 0,
        rawAcceleration: data.raw_acceleration || 0,
        receivedAt: new Date().toISOString(),
        isActive: true
      });
    } catch (err) {
      console.error('[ESP] Error saving heartbeat data:', err.message);
    }
    return;
  }

  if (data.type === 'raw_batch') {
    const session = getCurrentSession();
    if (!session || !session.isActive) return;

    try {
      // Run High-Res FFT on Server
      const analysis = analyzeBatch(data.data, data.sampleRate || 500);

      const m = session.testMass || 1.0;
      const omega_n = 2 * Math.PI * analysis.peakFrequency;
      const stiffness = m * Math.pow(omega_n, 2);
      const dampingCoefficient = 2 * analysis.dampingRatio * Math.sqrt(stiffness * m);

      // Save mechanical properties to session for long-term storage
      db.updateSessionAnalysis(session.id, {
        naturalFrequency: analysis.peakFrequency,
        peakAmplitude: analysis.peakAmplitude,
        mechanicalProperties: {
           qFactor: analysis.qFactor,
           dampingRatio: analysis.dampingRatio,
           bandwidth: analysis.bandwidth,
           stiffness: stiffness,
           dampingCoefficient: dampingCoefficient,
           frequencies: analysis.frequencies,
           magnitudes: analysis.magnitudes
        }
      });

      // Save representative point
      db.insertVibrationData({
        sessionId: session.id,
        deviceId: data.deviceId || 'unknown',
        timestamp: data.timestamp || Date.now(),
        deltaZ: data.data[0] || 0, // approx
        frequency: analysis.peakFrequency,
        amplitude: analysis.peakAmplitude,
        rawAcceleration: data.data[0] || 0
      });

      // Broadcast to clients
      broadcastToWebClients({
        type: 'vibration_data',
        sessionId: session.id,
        deviceId: data.deviceId,
        timestamp: data.timestamp || Date.now(),
        frequency: analysis.peakFrequency,
        amplitude: analysis.peakAmplitude,
        rawAcceleration: data.data[0] || 0,
        deltaZ: data.data[0] || 0,
        receivedAt: new Date().toISOString(),
        isActive: true
      });

      // Broadcast full frequency spectrum separately if UI wants to draw it
      broadcastToWebClients({
         type: 'frequency_data',
         frequency: analysis.peakFrequency,
         amplitude: analysis.peakAmplitude,
         qFactor: analysis.qFactor,
         frequencies: analysis.frequencies,
         magnitudes: analysis.magnitudes
      });

    } catch (err) {
      console.error('[ESP] Error processing raw batch:', err.message);
    }
  }
}

export function handleESPDisconnect(deviceId) {
  if (espClients.has(deviceId)) {
    espClients.delete(deviceId);
    console.log(`[ESP] Device disconnected: ${deviceId}`);
    broadcastToWebClients({
      type: 'device_status',
      deviceId,
      status: 'disconnected'
    });
  }
}

