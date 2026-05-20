/**
 * server/mdns.js
 * Advertises the server as "vibration-monitor.local" on the local network.
 * The ESP8266 can discover the server without knowing its IP address.
 */

import { Bonjour } from 'bonjour-service';

let bonjourInstance = null;
let service = null;

export function startMDNS(port = 3000) {
  try {
    bonjourInstance = new Bonjour();
    service = bonjourInstance.publish({
      name: 'vibration-monitor',
      type: 'http',
      port,
      txt: { path: '/', version: '2.0' }
    });

    // Also advertise WebSocket service explicitly
    bonjourInstance.publish({
      name: 'vibration-monitor-ws',
      type: 'ws',
      port,
    });

    console.log(`[mDNS] Service advertised as "vibration-monitor.local:${port}"`);
    console.log(`[mDNS] ESP8266 should connect to: ws://vibration-monitor.local:${port}`);
    console.log(`[mDNS] Fallback (Windows hotspot): ws://192.168.137.1:${port}`);
    console.log(`[mDNS] Fallback (Linux hotspot):   ws://10.42.0.1:${port}`);
  } catch (err) {
    console.warn('[mDNS] Could not start mDNS advertisement:', err.message);
    console.warn('[mDNS] ESP8266 should use the fallback IP shown in the diagnostic panel.');
  }
}

export function stopMDNS() {
  if (service) {
    try { service.stop(); } catch (_) {}
  }
  if (bonjourInstance) {
    try { bonjourInstance.destroy(); } catch (_) {}
  }
}
