/**
 * server/index.js
 * Main entry point — starts Express server, WebSocket server, and mDNS.
 * All logic is delegated to focused modules.
 */

import 'dotenv/config';
import express from 'express';
import http from 'http';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

import { createWebSocketServer } from '../websocket/index.js';
import { startMDNS, stopMDNS } from './mdns.js';
import sessionRoutes from './routes/sessions.js';
import exportRoutes from './routes/export.js';
import aiRoutes from './routes/ai.js';
import diagnosticsRoutes from './routes/diagnostics.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = path.join(__dirname, '..', 'public');
const PORT = process.env.PORT || 3000;

const app = express();
const server = http.createServer(app);

// ── Middleware ────────────────────────────────────────────────────────────

app.use(cors());
app.use(express.json());

// ── Static Files ──────────────────────────────────────────────────────────

if (!fs.existsSync(PUBLIC_DIR)) fs.mkdirSync(PUBLIC_DIR, { recursive: true });
app.use(express.static(PUBLIC_DIR));

app.get('/', (req, res) => {
  const indexPath = path.join(PUBLIC_DIR, 'index.html');
  if (fs.existsSync(indexPath)) return res.sendFile(indexPath);
  res.status(404).send('Web interface not found. Check the public/ directory.');
});

// ── API Routes ────────────────────────────────────────────────────────────

app.use('/api/sessions', sessionRoutes);
app.use('/api/export', exportRoutes);
app.use('/api', aiRoutes);
app.use('/api/diagnostics', diagnosticsRoutes);

// ── WebSocket ─────────────────────────────────────────────────────────────

createWebSocketServer(server);

// ── Start ─────────────────────────────────────────────────────────────────

server.listen(PORT, () => {
  console.log('');
  console.log('╔══════════════════════════════════════════════════╗');
  console.log('║       Z-Axis Vibration Monitor v2.0 (Offline)   ║');
  console.log('╠══════════════════════════════════════════════════╣');
  console.log(`║  Web UI:  http://localhost:${PORT}                   ║`);
  console.log(`║  mDNS:    vibration-monitor.local:${PORT}            ║`);
  console.log('║  DB:      data/vibrations.db (local SQLite)      ║');
  console.log('╚══════════════════════════════════════════════════╝');
  console.log('');
  startMDNS(PORT);
});

// ── Graceful Shutdown ─────────────────────────────────────────────────────

function shutdown() {
  console.log('\n[Server] Shutting down...');
  stopMDNS();
  server.close(() => {
    console.log('[Server] Stopped.');
    process.exit(0);
  });
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
