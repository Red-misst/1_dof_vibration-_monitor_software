/**
 * server/db.js
 * SQLite database layer — replaces MongoDB/Mongoose.
 * All tables are created on first run. No configuration needed.
 */

import Database from 'better-sqlite3';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, '..', 'data');
const REPORTS_DIR = path.join(DATA_DIR, 'reports');
const DB_PATH = path.join(DATA_DIR, 'vibrations.db');

// Ensure data directories exist
fs.mkdirSync(DATA_DIR, { recursive: true });
fs.mkdirSync(REPORTS_DIR, { recursive: true });

const db = new Database(DB_PATH);

// Enable WAL mode for better concurrent performance
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// ─── Schema ────────────────────────────────────────────────────────────────

db.exec(`
  CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    name TEXT UNIQUE NOT NULL,
    test_mass REAL DEFAULT 1.0,
    start_time INTEGER NOT NULL,
    end_time INTEGER,
    is_active INTEGER DEFAULT 1,
    natural_frequency REAL,
    peak_amplitude REAL,
    frequency_analysis_complete INTEGER DEFAULT 0,
    mechanical_properties TEXT DEFAULT '{}',
    created_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS vibration_data (
    id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL,
    device_id TEXT DEFAULT 'unknown',
    timestamp INTEGER NOT NULL,
    delta_z REAL NOT NULL,
    frequency REAL DEFAULT 0,
    amplitude REAL DEFAULT 0,
    raw_acceleration REAL DEFAULT 0,
    received_at INTEGER NOT NULL,
    FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS chat_messages (
    id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL,
    role TEXT NOT NULL CHECK(role IN ('user','assistant','system')),
    content TEXT NOT NULL,
    timestamp INTEGER NOT NULL,
    FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS reports (
    id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL,
    name TEXT NOT NULL,
    file_name TEXT NOT NULL,
    file_path TEXT NOT NULL,
    metadata TEXT DEFAULT '{}',
    created_at INTEGER NOT NULL,
    FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS idx_vibration_session ON vibration_data(session_id, timestamp);
  CREATE INDEX IF NOT EXISTS idx_chat_session ON chat_messages(session_id, timestamp);
  CREATE INDEX IF NOT EXISTS idx_reports_session ON reports(session_id);
`);

// ─── Sessions ──────────────────────────────────────────────────────────────

export function createSession({ name, testMass = 1.0 }) {
  const id = uuidv4();
  const now = Date.now();
  db.prepare(`
    INSERT INTO sessions (id, name, test_mass, start_time, is_active, created_at)
    VALUES (?, ?, ?, ?, 1, ?)
  `).run(id, name, testMass, now, now);
  return getSessionById(id);
}

export function getAllSessions() {
  return db.prepare(`SELECT * FROM sessions ORDER BY created_at DESC`).all()
    .map(deserializeSession);
}

export function getSessionById(id) {
  const row = db.prepare(`SELECT * FROM sessions WHERE id = ?`).get(id);
  return row ? deserializeSession(row) : null;
}

export function stopSession(id) {
  db.prepare(`UPDATE sessions SET is_active = 0, end_time = ? WHERE id = ?`)
    .run(Date.now(), id);
  return getSessionById(id);
}

export function updateSessionAnalysis(id, { naturalFrequency, peakAmplitude, mechanicalProperties }) {
  db.prepare(`
    UPDATE sessions SET
      natural_frequency = ?,
      peak_amplitude = ?,
      frequency_analysis_complete = 1,
      mechanical_properties = ?
    WHERE id = ?
  `).run(naturalFrequency, peakAmplitude, JSON.stringify(mechanicalProperties || {}), id);
}

export function deleteSession(id) {
  const result = db.prepare(`DELETE FROM sessions WHERE id = ?`).run(id);
  return result.changes > 0;
}

// ─── Vibration Data ─────────────────────────────────────────────────────────

export function insertVibrationData({ sessionId, deviceId, timestamp, deltaZ, frequency, amplitude, rawAcceleration }) {
  const id = uuidv4();
  db.prepare(`
    INSERT INTO vibration_data (id, session_id, device_id, timestamp, delta_z, frequency, amplitude, raw_acceleration, received_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, sessionId, deviceId || 'unknown', timestamp || Date.now(), deltaZ, frequency || 0, amplitude || 0, rawAcceleration || 0, Date.now());
  return id;
}

export function getVibrationData(sessionId) {
  return db.prepare(`
    SELECT * FROM vibration_data WHERE session_id = ? ORDER BY timestamp ASC
  `).all(sessionId).map(row => ({
    id: row.id,
    sessionId: row.session_id,
    deviceId: row.device_id,
    timestamp: row.timestamp,
    deltaZ: row.delta_z,
    frequency: row.frequency,
    amplitude: row.amplitude,
    rawAcceleration: row.raw_acceleration,
    receivedAt: row.received_at
  }));
}

export function getVibrationCount(sessionId) {
  return db.prepare(`SELECT COUNT(*) as count FROM vibration_data WHERE session_id = ?`).get(sessionId)?.count || 0;
}

// ─── Chat Messages ──────────────────────────────────────────────────────────

export function insertChatMessage({ sessionId, role, content }) {
  const id = uuidv4();
  db.prepare(`
    INSERT INTO chat_messages (id, session_id, role, content, timestamp)
    VALUES (?, ?, ?, ?, ?)
  `).run(id, sessionId, role, content, Date.now());
  return id;
}

export function getChatMessages(sessionId, limit = 50) {
  return db.prepare(`
    SELECT * FROM chat_messages WHERE session_id = ? ORDER BY timestamp ASC LIMIT ?
  `).all(sessionId, limit).map(row => ({
    id: row.id,
    sessionId: row.session_id,
    role: row.role,
    content: row.content,
    timestamp: row.timestamp
  }));
}

export function getRecentChatMessages(sessionId, limit = 10) {
  const rows = db.prepare(`
    SELECT * FROM chat_messages WHERE session_id = ? ORDER BY timestamp DESC LIMIT ?
  `).all(sessionId, limit);
  return rows.reverse().map(row => ({
    id: row.id,
    sessionId: row.session_id,
    role: row.role,
    content: row.content,
    timestamp: row.timestamp
  }));
}

// ─── Reports ────────────────────────────────────────────────────────────────

export function createReport({ sessionId, name, fileName, filePath, metadata }) {
  const id = uuidv4();
  db.prepare(`
    INSERT INTO reports (id, session_id, name, file_name, file_path, metadata, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(id, sessionId, name, fileName, filePath, JSON.stringify(metadata || {}), Date.now());
  return getReportById(id);
}

export function getAllReports() {
  return db.prepare(`SELECT * FROM reports ORDER BY created_at DESC`).all()
    .map(deserializeReport);
}

export function getReportById(id) {
  const row = db.prepare(`SELECT * FROM reports WHERE id = ?`).get(id);
  return row ? deserializeReport(row) : null;
}

export function deleteReport(id) {
  const report = getReportById(id);
  if (!report) return false;
  // Delete file from disk
  try { fs.unlinkSync(report.filePath); } catch (_) {}
  db.prepare(`DELETE FROM reports WHERE id = ?`).run(id);
  return true;
}

export { REPORTS_DIR };

// ─── Health Check ───────────────────────────────────────────────────────────

export function dbHealthCheck() {
  try {
    db.prepare('SELECT 1').get();
    return true;
  } catch (_) {
    return false;
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function deserializeSession(row) {
  return {
    id: row.id,
    _id: row.id, // compatibility alias
    name: row.name,
    testMass: row.test_mass,
    startTime: row.start_time,
    endTime: row.end_time || null,
    isActive: row.is_active === 1,
    naturalFrequency: row.natural_frequency,
    peakAmplitude: row.peak_amplitude,
    frequencyAnalysisComplete: row.frequency_analysis_complete === 1,
    mechanicalProperties: JSON.parse(row.mechanical_properties || '{}'),
    createdAt: row.created_at
  };
}

function deserializeReport(row) {
  return {
    id: row.id,
    _id: row.id,
    sessionId: row.session_id,
    name: row.name,
    fileName: row.file_name,
    filePath: row.file_path,
    metadata: JSON.parse(row.metadata || '{}'),
    createdAt: row.created_at
  };
}

export default db;
