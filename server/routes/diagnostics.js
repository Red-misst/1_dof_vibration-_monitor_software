/**
 * server/routes/diagnostics.js
 * Returns system health status for the diagnostic panel.
 */

import express from 'express';
import os from 'os';
import { dbHealthCheck } from '../db.js';
import { getConnectedDevices, getWebClientCount } from '../../websocket/index.js';
import llmManager from '../../utils/llmManager.js';

const router = express.Router();

// Track AI status
let aiStatus = { ok: null, lastCheck: null, message: 'Not checked yet' };
export function setAiStatus(ok, message) {
  aiStatus = { ok, message, lastCheck: Date.now() };
}
export function getAiStatus() {
  return aiStatus;
}

// Get local network IPs
function getLocalIPs() {
  const interfaces = os.networkInterfaces();
  const ips = [];
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        ips.push({ name, address: iface.address });
      }
    }
  }
  return ips;
}

router.get('/', (req, res) => {
  const localIPs = getLocalIPs();
  const hotspotIP = localIPs.find(i => i.address.startsWith('192.168.137.'))?.address 
                 || localIPs.find(i => i.address.startsWith('10.42.0.'))?.address 
                 || (localIPs.length > 0 ? localIPs[0].address : null);

  res.json({
    server: { ok: true, uptime: Math.floor(process.uptime()) },
    database: { ok: dbHealthCheck() },
    devices: {
      connected: getConnectedDevices(),
      count: getConnectedDevices().length
    },
    webClients: getWebClientCount(),
    ai: {
      ...aiStatus,
      provider: llmManager.provider,
      model: llmManager.model
    },
    network: {
      localIPs,
      hotspotIP,
      mdnsName: 'vibration-monitor.local'
    },
    timestamp: Date.now()
  });
});

export default router;
