/**
 * server/routes/ai.js
 * AI chat and PDF report generation routes.
 * Falls back to rule-based analysis when DeepSeek is offline.
 */

import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import * as db from '../db.js';
import DeepseekService from '../../utils/deepseekService.js';
import { generateFallbackChatResponse } from '../../utils/fallbackReport.js';
import { setAiStatus } from './diagnostics.js';

const router = express.Router();
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const deepseek = new DeepseekService(process.env.DEEPSEEK_API_KEY);

// ── Chat History ─────────────────────────────────────────────────────────

router.get('/chat/:sessionId', (req, res) => {
  try {
    const session = db.getSessionById(req.params.sessionId);
    if (!session) return res.status(404).json({ error: 'Session not found' });
    const messages = db.getChatMessages(req.params.sessionId);
    res.json({ sessionId: req.params.sessionId, sessionName: session.name, messages });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Send Chat Message ─────────────────────────────────────────────────────

router.post('/chat/message', async (req, res) => {
  const { sessionId, message } = req.body;
  if (!sessionId || !message) return res.status(400).json({ error: 'sessionId and message required' });

  const session = db.getSessionById(sessionId);
  if (!session) return res.status(404).json({ error: 'Session not found' });

  db.insertChatMessage({ sessionId, role: 'user', content: message });

  const history = db.getRecentChatMessages(sessionId, 10);
  const systemPrompt = `You are a vibration analysis assistant for session "${session.name}".
Natural Frequency: ${session.naturalFrequency?.toFixed(2) || 'N/A'} Hz
Peak Amplitude: ${session.peakAmplitude?.toFixed(3) || 'N/A'} g
Session Status: ${session.isActive ? 'Active' : 'Completed'}
Focus on Z-axis vibration analysis, resonance, and practical mechanical advice.
Format with **bold**, ### headings, and bullet lists.`;

  let reply;
  try {
    const completion = await deepseek.chatCompletion({
      messages: history.map(m => ({ role: m.role, content: m.content })),
      systemPrompt,
      temperature: 0.7
    });
    reply = completion.choices?.[0]?.message?.content || generateFallbackChatResponse(session, message);
    setAiStatus(true, 'Online');
  } catch (err) {
    console.warn('[AI] DeepSeek unavailable, using fallback:', err.message);
    setAiStatus(false, err.message);
    reply = generateFallbackChatResponse(session, message);
  }

  const msgId = db.insertChatMessage({ sessionId, role: 'assistant', content: reply });
  res.json({ message: reply, messageId: msgId });
});

// ── Generate Report ───────────────────────────────────────────────────────

router.post('/reports/generate', async (req, res) => {
  const { sessionId, authorName } = req.body;
  if (!sessionId) return res.status(400).json({ error: 'sessionId required' });

  const session = db.getSessionById(sessionId);
  if (!session) return res.status(404).json({ error: 'Session not found' });

  try {
    const pdfBuffer = await deepseek.generateReport(session);
    setAiStatus(true, 'Online');

    const fileName = `vibration_report_${session.id}_${Date.now()}.pdf`;
    const filePath = path.join(db.REPORTS_DIR, fileName);
    fs.writeFileSync(filePath, pdfBuffer);

    const report = db.createReport({
      sessionId,
      name: `Report for ${session.name}`,
      fileName,
      filePath,
      metadata: {
        naturalFrequency: session.naturalFrequency || 0,
        peakAmplitude: session.peakAmplitude || 0,
        qFactor: session.mechanicalProperties?.qFactor || 0,
        authorName: authorName || 'Vibration Analysis Team'
      }
    });

    res.json({ reportId: report.id, message: 'Report generated successfully' });
  } catch (err) {
    console.warn('[AI] Report generation fell back to rule-based:', err.message);
    setAiStatus(false, err.message);

    // Use fallback PDF generator
    const pdfBuffer = await deepseek.generateFallbackPDF(session);
    const fileName = `vibration_report_${session.id}_${Date.now()}.pdf`;
    const filePath = path.join(db.REPORTS_DIR, fileName);
    fs.writeFileSync(filePath, pdfBuffer);

    const report = db.createReport({
      sessionId,
      name: `Report for ${session.name} (Offline)`,
      fileName,
      filePath,
      metadata: { authorName: authorName || 'Vibration Analysis Team', offline: true }
    });

    res.json({ reportId: report.id, message: 'Report generated (offline mode)' });
  }
});

// ── List Reports ──────────────────────────────────────────────────────────

router.get('/reports', (req, res) => {
  try {
    res.json({ reports: db.getAllReports() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Get Report ────────────────────────────────────────────────────────────

router.get('/reports/:reportId', (req, res) => {
  try {
    const report = db.getReportById(req.params.reportId);
    if (!report) return res.status(404).json({ error: 'Report not found' });
    res.json({ report });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Download Report ───────────────────────────────────────────────────────

router.get('/reports/:reportId/download', (req, res) => {
  try {
    const report = db.getReportById(req.params.reportId);
    if (!report) return res.status(404).json({ error: 'Report not found' });
    if (!fs.existsSync(report.filePath)) return res.status(404).json({ error: 'PDF file not found on disk' });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${report.fileName}"`);
    fs.createReadStream(report.filePath).pipe(res);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Delete Report ─────────────────────────────────────────────────────────

router.delete('/reports/:reportId', (req, res) => {
  try {
    const deleted = db.deleteReport(req.params.reportId);
    if (!deleted) return res.status(404).json({ error: 'Report not found' });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
