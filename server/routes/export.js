/**
 * server/routes/export.js
 * CSV and JSON export routes for session data.
 */

import express from 'express';
import * as db from '../db.js';
import { generatePDFManual } from '../../utils/pdfManualGenerator.js';

const router = express.Router();

router.get('/manual/pdf', async (req, res) => {
  try {
    const pdfBuffer = await generatePDFManual();
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="Moi_University_Structural_Vibration_Manual.pdf"');
    res.send(pdfBuffer);
  } catch (err) {
    console.error('[Export] Failed to generate Manual PDF:', err);
    res.status(500).json({ error: err.message });
  }
});

router.get('/:sessionId', (req, res) => {
  try {
    const session = db.getSessionById(req.params.sessionId);
    if (!session) return res.status(404).json({ error: 'Session not found' });

    const vibData = db.getVibrationData(req.params.sessionId);
    const format = req.query.format || 'json';

    if (format === 'csv') {
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="vibration-${session.id}.csv"`);
      let csv = 'Timestamp,Frequency (Hz),Amplitude,Raw Z-Axis (g),Delta Z (g)\n';
      vibData.forEach(p => {
        csv += `${new Date(p.timestamp).toISOString()},${p.frequency || 0},${p.amplitude || 0},${p.rawAcceleration || 0},${p.deltaZ || 0}\n`;
      });
      return res.send(csv);
    }

    res.json({
      sessionInfo: {
        id: session.id,
        name: session.name,
        startTime: session.startTime,
        endTime: session.endTime,
        isActive: session.isActive
      },
      zAxisData: vibData,
      resonanceData: {
        naturalFrequency: session.naturalFrequency,
        peakAmplitude: session.peakAmplitude
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
