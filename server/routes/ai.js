import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import * as db from '../db.js';
import llmManager from '../../utils/llmManager.js';
import { generateFallbackChatResponse } from '../../utils/fallbackReport.js';
import { setAiStatus, getAiStatus } from './diagnostics.js';
import { generatePDFReport } from '../../utils/pdfReportGenerator.js';

const router = express.Router();
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Initialize status on startup
if (llmManager.apiKey) {
  setAiStatus(null, 'Key configured but not tested');
} else {
  setAiStatus(false, 'No API key configured');
}

// ── AI Configuration ──────────────────────────────────────────────────────

router.get('/ai/config', (req, res) => {
  res.json({
    provider: llmManager.provider,
    hasKey: !!llmManager.apiKey,
    model: llmManager.model,
    connected: !!llmManager.apiKey && getAiStatus().ok === true
  });
});

router.post('/ai/config', async (req, res) => {
  const { provider, apiKey, model } = req.body;
  if (!provider || !apiKey) {
    return res.status(400).json({ error: 'provider and apiKey are required' });
  }

  try {
    // Validate by attempting a simple test completion
    await llmManager.testConnection(provider, apiKey, model);

    // Key is verified and working! Update active service and persist
    llmManager.updateConfig(provider, apiKey, model);
    setAiStatus(true, 'Online');
    
    res.json({ 
      success: true, 
      message: `Successfully connected to ${provider === 'openai' ? 'OpenAI' : 'DeepSeek'} AI` 
    });
  } catch (err) {
    console.error('[AI] API key validation failed:', err.message);
    res.status(400).json({ error: `Connection failed: ${err.message}` });
  }
});

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
    const completion = await llmManager.chatCompletion({
      messages: history.map(m => ({ role: m.role, content: m.content })),
      systemPrompt,
      temperature: 0.7
    });
    reply = completion.choices?.[0]?.message?.content || generateFallbackChatResponse(session, message);
    setAiStatus(true, 'Online');
  } catch (err) {
    console.warn('[AI] LLM unavailable, using fallback:', err.message);
    setAiStatus(false, err.message);
    reply = generateFallbackChatResponse(session, message);
  }

  const msgId = db.insertChatMessage({ sessionId, role: 'assistant', content: reply });
  res.json({ message: reply, messageId: msgId });
});

// ── Generate Report ───────────────────────────────────────────────────────

router.post('/reports/generate', async (req, res) => {
  const { sessionId, authorName, useAi } = req.body;
  if (!sessionId) return res.status(400).json({ error: 'sessionId required' });

  const session = db.getSessionById(sessionId);
  if (!session) return res.status(404).json({ error: 'Session not found' });

  // Load Z-Axis raw data and attach to session
  const zAxisData = db.getVibrationData(sessionId) || [];
  session.zAxisData = zAxisData;

  let analysisText = null;
  let isAiGenerated = false;

  // Check if AI is requested and a key is available
  if (useAi && llmManager.apiKey) {
    try {
      const values = zAxisData.map(d => d.deltaZ || 0);
      const mean = values.length ? values.reduce((a, v) => a + v, 0) / values.length : 0;
      const rms = values.length ? Math.sqrt(values.reduce((a, v) => a + v * v, 0) / values.length) : 0;
      
      analysisText = await llmManager.generateReportText(session, { mean, rms });
      isAiGenerated = true;
      setAiStatus(true, 'Online');
    } catch (err) {
      console.warn('[AI] Report generation call failed, falling back to template mode:', err.message);
      setAiStatus(false, err.message);
      analysisText = null;
      isAiGenerated = false;
    }
  }

  try {
    const pdfBuffer = await generatePDFReport(session, zAxisData, analysisText, authorName, isAiGenerated);
    
    // Create professional sequential reference naming
    const reportCount = db.getAllReports().length;
    const refNum = String(reportCount + 1).padStart(3, '0');
    
    // Helper to sanitize session name for safe, readable downloaded file name
    const safeSessionName = session.name
      .replace(/[^a-zA-Z0-9\s-_]/g, '')
      .trim()
      .replace(/\s+/g, '_');
      
    const suffix = isAiGenerated ? 'AI' : 'Template';
    const fileName = `Report_${refNum}_${safeSessionName}_${suffix}.pdf`;
    const filePath = path.join(db.REPORTS_DIR, fileName);
    fs.writeFileSync(filePath, pdfBuffer);

    const reportName = `${session.name} — Report #${refNum}`;

    const report = db.createReport({
      sessionId,
      name: reportName,
      fileName,
      filePath,
      metadata: {
        naturalFrequency: session.naturalFrequency || 0,
        peakAmplitude: session.peakAmplitude || 0,
        qFactor: session.mechanicalProperties?.qFactor || 0,
        authorName: authorName || 'Vibration Analysis Team',
        mode: isAiGenerated ? 'AI' : 'Template'
      }
    });

    res.json({ 
      reportId: report.id, 
      message: isAiGenerated ? 'Report generated successfully with AI Analysis' : 'Report generated in offline Template Mode' 
    });
  } catch (err) {
    console.error('[AI] Failed to generate PDF Report:', err.message);
    res.status(500).json({ error: `PDF generation failed: ${err.message}` });
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
