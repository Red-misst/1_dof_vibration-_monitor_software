/**
 * server/routes/sessions.js
 * REST API routes for test session management.
 */

import express from 'express';
import * as db from '../db.js';

const router = express.Router();

// GET all sessions
router.get('/', (req, res) => {
  try {
    res.json(db.getAllSessions());
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET recent N sessions
router.get('/recent/:limit', (req, res) => {
  try {
    const limit = parseInt(req.params.limit) || 5;
    res.json(db.getAllSessions().slice(0, limit));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET single session
router.get('/:id', (req, res) => {
  try {
    const session = db.getSessionById(req.params.id);
    if (!session) return res.status(404).json({ error: 'Session not found' });
    res.json(session);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET session vibration data
router.get('/:id/data', (req, res) => {
  try {
    const session = db.getSessionById(req.params.id);
    if (!session) return res.status(404).json({ error: 'Session not found' });
    const vibData = db.getVibrationData(req.params.id);
    res.json({
      zAxisData: vibData,
      resonanceData: {
        naturalFrequency: session.naturalFrequency,
        peakAmplitude: session.peakAmplitude,
        analysisComplete: session.frequencyAnalysisComplete
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET frequency data for a session
router.get('/:id/frequency', (req, res) => {
  try {
    const session = db.getSessionById(req.params.id);
    if (!session) return res.status(404).json({ error: 'Session not found' });
    res.json({
      frequency: session.naturalFrequency,
      amplitude: session.peakAmplitude,
      ...session.mechanicalProperties
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE session
router.delete('/:id', (req, res) => {
  try {
    const deleted = db.deleteSession(req.params.id);
    if (!deleted) return res.status(404).json({ error: 'Session not found' });
    res.json({ success: true, message: 'Session deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
