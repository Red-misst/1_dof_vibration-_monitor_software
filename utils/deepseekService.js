/**
 * utils/deepseekService.js
 * DeepSeek AI API Service with 8-second timeout and offline fallback.
 */

import fetch from 'node-fetch';
import PDFDocument from 'pdfkit';
import { generateFallbackAnalysis } from './fallbackReport.js';

const API_BASE = 'https://api.deepseek.com/v1';
const TIMEOUT_MS = 8000;

class DeepseekService {
  constructor(apiKey) {
    this.apiKey = apiKey;
    if (!this.apiKey) {
      console.warn('[AI] No DEEPSEEK_API_KEY set — AI features will use offline fallback.');
    }
  }

  // ── Helpers ─────────────────────────────────────────────────────────────

  async _fetchWithTimeout(url, options) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    try {
      const response = await fetch(url, { ...options, signal: controller.signal });
      clearTimeout(timer);
      return response;
    } catch (err) {
      clearTimeout(timer);
      throw err;
    }
  }

  // ── Chat Completion ──────────────────────────────────────────────────────

  async chatCompletion({ messages, systemPrompt, temperature = 0.7 }) {
    if (!this.apiKey) throw new Error('No API key configured');

    const formattedMessages = [];
    if (systemPrompt) formattedMessages.push({ role: 'system', content: systemPrompt });
    formattedMessages.push(...messages);

    const response = await this._fetchWithTimeout(`${API_BASE}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${this.apiKey}` },
      body: JSON.stringify({ model: 'deepseek-chat', messages: formattedMessages, temperature, max_tokens: 2048 })
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`DeepSeek API Error (${response.status}): ${text}`);
    }

    return response.json();
  }

  // ── Report Generation ────────────────────────────────────────────────────

  async generateReport(sessionData) {
    const stats = this._calcStats(sessionData.zAxisData || []);
    const context = this._buildContext(sessionData, stats);
    const analysis = await this._generateAIAnalysis(context); // may throw → caller uses fallbackPDF
    return this._buildPDF(context, analysis);
  }

  async generateFallbackPDF(sessionData) {
    const stats = this._calcStats(sessionData.zAxisData || []);
    const context = this._buildContext(sessionData, stats);
    const analysis = generateFallbackAnalysis(context);
    return this._buildPDF(context, analysis);
  }

  // ── AI Analysis ──────────────────────────────────────────────────────────

  async _generateAIAnalysis(context) {
    if (!this.apiKey) throw new Error('No API key');

    const prompt = `Generate a comprehensive vibration analysis report in markdown format.

Session: ${context.sessionName}
Date: ${new Date(context.startTime).toLocaleDateString()}
Duration: ${context.duration || 'N/A'}
Readings: ${context.readings}
Natural Frequency: ${context.naturalFrequency?.toFixed(4) || 'Not detected'} Hz
Peak Amplitude: ${context.peakAmplitude?.toFixed(4) || 'N/A'} g
Q Factor: ${context.mechanicalProperties.qFactor?.toFixed(2) || 'N/A'}
RMS: ${context.rmsValue?.toFixed(4) || 'N/A'} g
Bandwidth: ${context.mechanicalProperties.bandwidth?.toFixed(4) || 'N/A'} Hz

Include: Summary, Technical Analysis, Possible Causes, Recommendations, Conclusion.
Use markdown: **bold**, ### headings, bullet lists, --- separators.`;

    const response = await this._fetchWithTimeout(`${API_BASE}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${this.apiKey}` },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          { role: 'system', content: 'You are a vibration analysis expert. Generate accurate technical reports.' },
          { role: 'user', content: prompt }
        ],
        max_tokens: 2000
      })
    });

    const data = await response.json();
    if (!data.choices?.[0]?.message?.content) throw new Error('Empty AI response');
    return data.choices[0].message.content;
  }

  // ── PDF Builder ──────────────────────────────────────────────────────────

  _buildPDF(context, analysisMarkdown) {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ margins: { top: 50, bottom: 50, left: 72, right: 72 }, size: 'A4' });
        const buffers = [];
        doc.on('data', b => buffers.push(b));
        doc.on('end', () => resolve(Buffer.concat(buffers)));

        doc.registerFont('Heading', 'Helvetica-Bold');
        doc.registerFont('Regular', 'Helvetica');
        doc.registerFont('Bold', 'Helvetica-Bold');
        doc.registerFont('Italic', 'Helvetica-Oblique');

        // Header
        doc.font('Heading').fontSize(18).fillColor('#2563eb')
          .text('Z-Axis Vibration Analysis Report', { align: 'center' });
        doc.moveDown(1);

        // Session info
        doc.font('Heading').fontSize(14).fillColor('#000').text('Session Information:');
        doc.font('Regular').fontSize(11).fillColor('#333')
          .text(`Session: ${context.sessionName}`)
          .text(`Start: ${new Date(context.startTime).toLocaleString()}`);
        if (context.endTime) doc.text(`End: ${new Date(context.endTime).toLocaleString()}`);
        doc.moveDown(1);

        // Metrics
        doc.font('Heading').fontSize(14).fillColor('#000').text('Frequency Analysis:');
        doc.font('Regular').fontSize(11).fillColor('#333').moveDown(0.5);
        if (context.naturalFrequency) doc.text(`Natural Frequency: ${context.naturalFrequency.toFixed(2)} Hz`);
        if (context.peakAmplitude) doc.text(`Peak Amplitude: ${context.peakAmplitude.toFixed(3)} g`);
        if (context.mechanicalProperties.qFactor) doc.text(`Q Factor: ${context.mechanicalProperties.qFactor.toFixed(2)}`);
        if (context.mechanicalProperties.bandwidth) doc.text(`Bandwidth: ${context.mechanicalProperties.bandwidth.toFixed(3)} Hz`);
        doc.moveDown(1);

        // AI/Fallback Analysis
        doc.font('Heading').fontSize(14).fillColor('#000').text('Analysis:');
        doc.moveDown(0.5);
        this._renderMarkdown(doc, analysisMarkdown);
        doc.end();
      } catch (err) {
        reject(err);
      }
    });
  }

  // ── Markdown Renderer ────────────────────────────────────────────────────

  _renderMarkdown(doc, markdown) {
    if (!markdown) return;
    const lines = markdown.split('\n');
    let codeBlock = false;

    for (const line of lines) {
      if (line.trim() === '---') {
        doc.moveDown(0.5);
        doc.lineWidth(1).moveTo(72, doc.y).lineTo(doc.page.width - 72, doc.y).stroke('#ccc');
        doc.moveDown(0.5);
        continue;
      }
      if (line.startsWith('```')) { codeBlock = !codeBlock; continue; }
      if (codeBlock) { doc.font('Courier').fontSize(10).fillColor('#666').text(line); continue; }

      if (line.startsWith('### ')) { doc.font('Heading').fontSize(12).fillColor('#444').text(line.slice(4)); }
      else if (line.startsWith('## ')) { doc.font('Heading').fontSize(14).fillColor('#333').text(line.slice(3)); }
      else if (line.startsWith('# ')) { doc.font('Heading').fontSize(16).fillColor('#000').text(line.slice(2)); }
      else if (line.match(/^[-*] /)) {
        doc.font('Regular').fontSize(11).fillColor('#333').text(`• ${line.slice(2)}`, { indent: 10 });
      } else if (line.trim()) {
        doc.font('Regular').fontSize(11).fillColor('#333').text(line.replace(/\*\*([^*]+)\*\*/g, '$1'));
      } else {
        doc.moveDown(0.5);
      }
    }
  }

  // ── Context Builder ──────────────────────────────────────────────────────

  _buildContext(session, stats) {
    return {
      sessionName: session.name,
      startTime: session.startTime,
      endTime: session.endTime,
      duration: session.endTime ? this._formatDuration(session.startTime, session.endTime) : null,
      readings: (session.zAxisData || []).length,
      naturalFrequency: session.naturalFrequency,
      peakAmplitude: session.peakAmplitude,
      mechanicalProperties: session.mechanicalProperties || {},
      rmsValue: stats.rms,
      meanValue: stats.mean
    };
  }

  _calcStats(zAxisData) {
    if (!zAxisData?.length) return { mean: 0, rms: 0 };
    const values = zAxisData.map(d => d.deltaZ || 0);
    const mean = values.reduce((a, v) => a + v, 0) / values.length;
    const rms = Math.sqrt(values.reduce((a, v) => a + v * v, 0) / values.length);
    return { mean, rms };
  }

  _formatDuration(start, end) {
    const ms = new Date(end) - new Date(start);
    const s = Math.floor(ms / 1000) % 60;
    const m = Math.floor(ms / 60000);
    return `${m}:${String(s).padStart(2, '0')}`;
  }
}

export default DeepseekService;
