/**
 * websocket/index.js
 * Creates the WebSocket server and routes connections to the correct handler.
 * Web browsers connect to /web, ESP8266 devices connect to any other path.
 */

import { WebSocketServer } from 'ws';
import { init as initESP, handleESPConnection } from './espHandler.js';
import { init as initWeb, handleWebConnection } from './webHandler.js';

// Shared mutable state
const webClients = new Set();
const espClients = new Map();
let currentSession = null;

const shared = {
  webClients,
  espClients,
  getCurrentSession: () => currentSession,
  setCurrentSession: (s) => { currentSession = s; },
  broadcastToWebClients
};

export function createWebSocketServer(httpServer) {
  // Inject shared state into handlers
  initESP(shared);
  initWeb(shared);

  const wss = new WebSocketServer({ server: httpServer });

  wss.on('connection', (ws, req) => {
    const isWebClient = req.url === '/web' || req.url.startsWith('/web?');
    if (isWebClient) {
      handleWebConnection(ws);
    } else {
      handleESPConnection(ws);
    }
  });

  console.log('[WS] WebSocket server ready');
  return wss;
}

export function broadcastToWebClients(data) {
  const message = JSON.stringify(data);
  webClients.forEach(client => {
    if (client.readyState === 1) { // OPEN
      client.send(message);
    }
  });
}

export function getConnectedDevices() {
  return Array.from(espClients.keys());
}

export function getWebClientCount() {
  return webClients.size;
}
