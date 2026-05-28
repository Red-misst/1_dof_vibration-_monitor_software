import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { generateFallbackAnalysis } from './fallbackReport.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const LOGO_PATH = path.join(__dirname, '..', 'public', 'images', 'logo.png');

/**
 * Generates a highly professional PDF Report.
 * @param {Object} session - Session metadata
 * @param {Array} zAxisData - Raw vibration data
 * @param {String} analysisText - LLM markdown text or null (for template mode)
 * @param {String} authorName - Author name
 * @param {Boolean} isAi - Whether report is AI-generated
 */
export async function generatePDFReport(session, zAxisData, analysisText, authorName, isAi) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        margins: { top: 54, bottom: 54, left: 54, right: 54 },
        size: 'A4',
        bufferPages: true // Enable double-pass to write page numbers at the end
      });

      const buffers = [];
      doc.on('data', b => buffers.push(b));
      doc.on('end', () => resolve(Buffer.concat(buffers)));

      // 1. Title Header with Logo
      drawHeader(doc);

      // 2. Metadata details
      drawMetadataSection(doc, session, zAxisData, authorName, isAi);

      // 3. Technical Parameters Table
      drawParametersTable(doc, session, zAxisData);

      // 4. Draw Vector Charts (Oscilloscope and FFT)
      doc.moveDown(1.5);
      drawChartsSection(doc, session, zAxisData);

      // New Page for Analysis text
      doc.addPage();

      // 5. Render Report Content (LLM analysis or fallback template analysis)
      const contentText = analysisText || generateFallbackAnalysis(buildReportContext(session, zAxisData));
      
      doc.font('Helvetica-Bold').fontSize(14).fillColor('#0f172a').text('Technical Assessment & Recommendations');
      doc.moveDown(0.5);
      
      if (!isAi) {
        drawTemplateNotice(doc);
      }

      renderMarkdown(doc, contentText);

      // Finalize and draw footers/headers on all pages
      drawPageNumbers(doc);

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

// ─── Header drawing ────────────────────────────────────────────────────────
function drawHeader(doc) {
  const topY = doc.y;

  // Add Logo if exists
  if (fs.existsSync(LOGO_PATH)) {
    doc.image(LOGO_PATH, 54, topY, { width: 50 });
  }

  // Header Title Info (aligned right to logo)
  doc.font('Helvetica-Bold').fontSize(13).fillColor('#1e3a8a')
    .text('MOI UNIVERSITY', 114, topY, { align: 'left' });
  doc.font('Helvetica').fontSize(9).fillColor('#475569')
    .text('Department of Mechanical & Production Engineering', 114, topY + 16, { align: 'left' })
    .text('Structural Resonance & Dynamic Vibration Analysis', 114, topY + 28, { align: 'left' });

  // Right-aligned report label
  doc.font('Helvetica-Bold').fontSize(8).fillColor('#64748b')
    .text('TECHNICAL REPORT', 400, topY + 5, { align: 'right', width: 140 });
  doc.font('Helvetica').fontSize(7).fillColor('#94a3b8')
    .text('FM: MU-MPE-SV-02', 400, topY + 17, { align: 'right', width: 140 });

  doc.y = topY + 55;
  doc.lineWidth(1).strokeColor('#e2e8f0').moveTo(54, doc.y).lineTo(541, doc.y).stroke();
  doc.moveDown(1.5);
}

// ─── Metadata Cards ────────────────────────────────────────────────────────
function drawMetadataSection(doc, session, zAxisData, author, isAi) {
  const startY = doc.y;

  // Document Title
  doc.font('Helvetica-Bold').fontSize(18).fillColor('#0f172a')
    .text(session.name, 54, startY);
  doc.moveDown(0.5);

  const colY = doc.y;

  // Column 1
  doc.font('Helvetica-Bold').fontSize(8).fillColor('#64748b').text('DATE GENERATED', 54, colY);
  doc.font('Helvetica').fontSize(9).fillColor('#334155').text(new Date().toLocaleString(), 54, colY + 12);

  doc.font('Helvetica-Bold').fontSize(8).fillColor('#64748b').text('TEST AUTHOR', 54, colY + 34);
  doc.font('Helvetica').fontSize(9).fillColor('#334155').text(author || 'Vibration Analysis Team', 54, colY + 46);

  // Column 2
  doc.font('Helvetica-Bold').fontSize(8).fillColor('#64748b').text('TEST DURATION', 230, colY);
  const durationText = session.endTime ? formatDuration(session.startTime, session.endTime) : 'Running / N/A';
  doc.font('Helvetica').fontSize(9).fillColor('#334155').text(durationText, 230, colY + 12);

  doc.font('Helvetica-Bold').fontSize(8).fillColor('#64748b').text('DATA POINTS', 230, colY + 34);
  doc.font('Helvetica').fontSize(9).fillColor('#334155').text(`${zAxisData.length} samples`, 230, colY + 46);

  // Column 3 - AI Status badge
  doc.font('Helvetica-Bold').fontSize(8).fillColor('#64748b').text('ANALYSIS MODE', 400, colY);
  const modeText = isAi ? 'AI ANALYSIS (DEEPSEEK)' : 'TEMPLATE MODE (OFFLINE)';
  const badgeColor = isAi ? '#dbeafe' : '#fef3c7';
  const badgeTextCol = isAi ? '#1e40af' : '#92400e';

  doc.rect(400, colY + 10, 140, 18).fill(badgeColor);
  doc.font('Helvetica-Bold').fontSize(7.5).fillColor(badgeTextCol)
    .text(modeText, 400, colY + 15, { width: 140, align: 'center' });

  doc.y = colY + 68;
}

// ─── Parameters Table ──────────────────────────────────────────────────────
function drawParametersTable(doc, session, zAxisData) {
  doc.font('Helvetica-Bold').fontSize(11).fillColor('#0f172a').text('Measured Dynamic Parameters');
  doc.moveDown(0.4);

  const tableTop = doc.y;
  const colWidths = [150, 100, 237];
  const colPositions = [54, 54 + colWidths[0], 54 + colWidths[0] + colWidths[1]];
  const rowHeight = 20;

  // Header row
  doc.rect(54, tableTop, 487, rowHeight).fill('#1e3a8a');
  doc.font('Helvetica-Bold').fontSize(8.5).fillColor('#ffffff');
  doc.text('PARAMETER', colPositions[0] + 8, tableTop + 6);
  doc.text('MEASURED VALUE', colPositions[1] + 8, tableTop + 6);
  doc.text('SPECIFICATION & INTERPRETATION', colPositions[2] + 8, tableTop + 6);

  doc.y = tableTop + rowHeight;

  const stats = calcStats(zAxisData);
  const qFactor = session.mechanicalProperties?.qFactor;
  const bandwidth = session.mechanicalProperties?.bandwidth;
  const dampingRatio = session.mechanicalProperties?.dampingRatio || (qFactor ? 1 / (2 * qFactor) : null);

  const rows = [
    { name: 'Natural Frequency (fn)', val: session.naturalFrequency ? `\${session.naturalFrequency.toFixed(2)} Hz` : 'N/A', desc: 'Primary dynamic resonance peak of the structural system.' },
    { name: 'Peak Amplitude', val: session.peakAmplitude ? `\${(session.peakAmplitude * 9806.65).toFixed(4)} mm/s²` : 'N/A', desc: 'Maximum single vertical shock or cycle deviation.' },
    { name: 'Q Factor (Quality Coefficient)', val: qFactor ? qFactor.toFixed(2) : 'N/A', desc: 'Energy retention index; higher indicates sharp resonance.' },
    { name: 'Damping Ratio (ζ)', val: dampingRatio ? dampingRatio.toFixed(4) : 'N/A', desc: 'Determines rate of decaying vibration transients.' },
    { name: 'Half-Power Bandwidth', val: bandwidth ? `\${bandwidth.toFixed(3)} Hz` : 'N/A', desc: 'Frequency span representing -3 dB energy drop-off.' },
    { name: 'RMS Acceleration', val: `\${(stats.rms * 9806.65).toFixed(4)} mm/s²`, desc: 'Average continuous kinetic energy equivalent.' }
  ];

  let currentY = doc.y;
  rows.forEach((r, idx) => {
    // Row background zebra striping
    if (idx % 2 === 1) {
      doc.rect(54, currentY, 487, rowHeight).fill('#f8fafc');
    }

    doc.font('Helvetica-Bold').fontSize(8.5).fillColor('#334155').text(r.name, colPositions[0] + 8, currentY + 6);
    doc.font('Helvetica').fontSize(8.5).fillColor('#0f172a').text(r.val, colPositions[1] + 8, currentY + 6);
    doc.font('Helvetica').fontSize(8.5).fillColor('#475569').text(r.desc, colPositions[2] + 8, currentY + 6);

    // Border bottom
    doc.lineWidth(0.5).strokeColor('#e2e8f0').moveTo(54, currentY + rowHeight).lineTo(541, currentY + rowHeight).stroke();
    currentY += rowHeight;
  });

  doc.y = currentY;
}

// ─── Vector Charts ─────────────────────────────────────────────────────────
function drawChartsSection(doc, session, zAxisData) {
  const chartW = 230;
  const chartH = 120;
  const chart1X = 54;
  const chart2X = 311;
  const chartY = doc.y;

  // 1. Time-Domain raw Z-Axis G-force
  const sampledZData = sampleData(zAxisData.map(d => (d.deltaZ || 0) * 9806.65), 100);
  const timeLabels = Array.from({ length: sampledZData.length }, (_, i) => i);
  drawVectorLineChart(doc, 'Time-Domain Vibration Waveform (mm/s² vs. index)', timeLabels, sampledZData, chart1X, chartY, chartW, chartH, '#2563eb');

  // 2. Frequency-Domain FFT Spectrum
  const freqs = session.mechanicalProperties?.frequencies || [];
  const mags = session.mechanicalProperties?.magnitudes || [];
  if (freqs.length > 0 && mags.length > 0) {
    const sampledFreqs = sampleData(freqs, 100);
    const sampledMags = sampleData(mags.map(m => m * 9806.65), 100);
    drawVectorLineChart(doc, 'FFT Frequency Spectrum (Amplitude vs. Hz)', sampledFreqs, sampledMags, chart2X, chartY, chartW, chartH, '#818cf8');
  } else {
    // Fallback if no FFT data is present
    doc.font('Helvetica-Bold').fontSize(9).fillColor('#64748b').text('FFT Spectrum (Amplitude vs. Hz)', chart2X, chartY - 15);
    doc.rect(chart2X, chartY, chartW, chartH).fill('#f8fafc');
    doc.rect(chart2X, chartY, chartW, chartH).lineWidth(0.5).stroke('#e2e8f0');
    doc.font('Helvetica-Oblique').fontSize(8.5).fillColor('#94a3b8')
      .text('No FFT frequency data recorded.', chart2X + 20, chartY + 50, { width: chartW - 40, align: 'center' });
  }

  doc.y = chartY + chartH + 20;
}

// Draw a beautiful vector line chart inside PDFKit without canvas dependencies
function drawVectorLineChart(doc, title, xLabels, yValues, x, y, width, height, strokeColor) {
  // Title
  doc.font('Helvetica-Bold').fontSize(9).fillColor('#1e293b').text(title, x, y);

  const plotY = y + 15;
  const plotH = height - 15;

  // Chart Box Background
  doc.rect(x, plotY, width, plotH).fill('#ffffff');
  doc.rect(x, plotY, width, plotH).lineWidth(0.5).stroke('#cbd5e1');

  if (!yValues || yValues.length === 0) {
    doc.font('Helvetica').fontSize(8).fillColor('#94a3b8').text('No data', x + width / 2 - 15, plotY + plotH / 2 - 4);
    return;
  }

  // Draw Grid Lines (Y-Axis)
  const padLeft = 26;
  const padBottom = 16;
  const padRight = 10;
  const padTop = 10;

  const graphX = x + padLeft;
  const graphY = plotY + padTop;
  const graphW = width - padLeft - padRight;
  const graphH = plotH - padTop - padBottom;

  let maxVal = Math.max(...yValues);
  let minVal = Math.min(...yValues);

  if (maxVal === minVal) {
    maxVal += 0.5;
    minVal -= 0.5;
  }

  // Force min val to be 0 if mostly positive
  if (minVal > 0) minVal = 0;

  const range = maxVal - minVal;

  // Horizontal Gridlines & Y axis labels
  doc.lineWidth(0.3).dash(1, { space: 1.5 }).strokeColor('#e2e8f0');
  for (let i = 0; i <= 3; i++) {
    const ratio = i / 3;
    const gridY = graphY + graphH * (1 - ratio);
    const val = minVal + range * ratio;

    doc.moveTo(graphX, gridY).lineTo(graphX + graphW, gridY).stroke();
    doc.undash().font('Helvetica').fontSize(6).fillColor('#64748b')
      .text(val.toFixed(2), x + 2, gridY - 2.5, { width: padLeft - 5, align: 'right' });
    doc.dash(1, { space: 1.5 }).strokeColor('#e2e8f0');
  }

  // X Axis Labels (Draw 4 points)
  doc.undash().font('Helvetica').fontSize(6).fillColor('#64748b');
  const numLabels = Math.min(xLabels.length, 4);
  for (let i = 0; i < numLabels; i++) {
    const idx = Math.floor((i / (numLabels - 1)) * (xLabels.length - 1));
    const ratio = i / (numLabels - 1);
    const gridX = graphX + graphW * ratio;
    const lbl = typeof xLabels[idx] === 'number' ? xLabels[idx].toFixed(1) : String(xLabels[idx]);
    doc.text(lbl, gridX - 15, graphY + graphH + 4, { width: 30, align: 'center' });
  }

  // Draw Data Line
  doc.lineWidth(0.85).strokeColor(strokeColor);
  doc.moveTo(graphX, graphY + graphH - ((yValues[0] - minVal) / range) * graphH);

  for (let i = 1; i < yValues.length; i++) {
    const ratio = i / (yValues.length - 1);
    const plotPtX = graphX + graphW * ratio;
    const plotPtY = graphY + graphH - ((yValues[i] - minVal) / range) * graphH;
    doc.lineTo(plotPtX, plotPtY);
  }
  doc.stroke();
}

// ─── Warning Notices ───────────────────────────────────────────────────────
function drawTemplateNotice(doc) {
  const boxY = doc.y;
  doc.rect(54, boxY, 487, 34).fill('#f1f5f9');
  doc.rect(54, boxY, 487, 34).lineWidth(0.5).stroke('#cbd5e1');

  doc.font('Helvetica-Bold').fontSize(8.5).fillColor('#1e293b').text('STANDARD ENGINEERING TEMPLATE REPORT', 64, boxY + 7);
  doc.font('Helvetica').fontSize(8).fillColor('#475569')
    .text('This dynamic engineering analysis was generated using standard rule-based models. Toggle the AI Copilot to generate customized qualitative recommendations.', 64, boxY + 18);

  doc.y = boxY + 45;
}

// ─── Markdown Renderer ─────────────────────────────────────────────────────
function renderMarkdown(doc, markdown) {
  if (!markdown) return;
  const lines = markdown.split('\n');
  let codeBlock = false;

  for (const line of lines) {
    if (line.trim() === '---') {
      doc.moveDown(0.4);
      doc.lineWidth(0.5).strokeColor('#e2e8f0').moveTo(54, doc.y).lineTo(541, doc.y).stroke();
      doc.moveDown(0.4);
      continue;
    }
    if (line.startsWith('```')) {
      codeBlock = !codeBlock;
      continue;
    }
    if (codeBlock) {
      doc.font('Courier').fontSize(8).fillColor('#475569').text(line);
      continue;
    }

    if (line.startsWith('### ')) {
      doc.moveDown(0.8);
      doc.font('Helvetica-Bold').fontSize(11).fillColor('#1e3a8a').text(line.slice(4));
      doc.moveDown(0.3);
    } else if (line.startsWith('## ')) {
      doc.moveDown(1.0);
      doc.font('Helvetica-Bold').fontSize(13).fillColor('#0f172a').text(line.slice(3));
      doc.moveDown(0.4);
    } else if (line.startsWith('# ')) {
      doc.moveDown(1.2);
      doc.font('Helvetica-Bold').fontSize(15).fillColor('#0f172a').text(line.slice(2));
      doc.moveDown(0.5);
    } else if (line.match(/^[-*] /)) {
      // Bold rendering inside bullets
      const text = line.slice(2);
      doc.font('Helvetica').fontSize(9.5).fillColor('#334155').text('• ', { continued: true, indent: 10 });
      renderInlineFormatting(doc, text);
      doc.moveDown(0.2);
    } else if (line.trim()) {
      // Normal paragraph
      doc.font('Helvetica').fontSize(9.5).fillColor('#334155');
      renderInlineFormatting(doc, line);
      doc.moveDown(0.4);
    } else {
      doc.moveDown(0.25);
    }
  }
}

// Simple inline bold formatter helper
function renderInlineFormatting(doc, text) {
  const parts = text.split('**');
  let isBold = false;
  parts.forEach((part, idx) => {
    if (idx === parts.length - 1) {
      doc.font(isBold ? 'Helvetica-Bold' : 'Helvetica').text(part);
    } else {
      doc.font(isBold ? 'Helvetica-Bold' : 'Helvetica').text(part, { continued: true });
    }
    isBold = !isBold;
  });
}

// ─── Headers and Footers ───────────────────────────────────────────────────
function drawPageNumbers(doc) {
  const pages = doc.bufferedPageRange();
  
  for (let i = 0; i < pages.count; i++) {
    doc.switchToPage(i);
    
    // Save and temporarily clear bottom margin to prevent PDFKit from spawning extra empty pages
    const oldBottomMargin = doc.page.margins.bottom;
    doc.page.margins.bottom = 0;
    
    // Bottom border line
    doc.lineWidth(0.5).strokeColor('#e2e8f0').moveTo(54, 788).lineTo(541, 788).stroke();

    // Footer Text
    doc.font('Helvetica').fontSize(7.5).fillColor('#64748b');
    
    let textX = 54;
    if (i > 0 && fs.existsSync(LOGO_PATH)) {
      doc.image(LOGO_PATH, 54, 790, { width: 20 });
      textX = 80;
    }
    
    // Just put the developer attribution on the left and page numbers on the right
    doc.text('Developed by I. Muigai, M. Akinyi & E. Barake', textX, 794, { align: 'left' });
    doc.text(`Page ${i + 1} of ${pages.count}`, 400, 794, { align: 'right', width: 141 });

    // Thin top header watermarks on sub pages (from page 2 onwards)
    if (i > 0) {
      doc.font('Helvetica-Oblique').fontSize(7.5).fillColor('#94a3b8')
        .text('Moi University Mechanical Engineering Department — Structural Vibration Report', 54, 36);
      doc.lineWidth(0.5).strokeColor('#e2e8f0').moveTo(54, 46).lineTo(541, 46).stroke();
    }
    
    // Restore bottom margin
    doc.page.margins.bottom = oldBottomMargin;
  }
}

// ─── Helpers ───────────────────────────────────────────────────────────────
function buildReportContext(session, zAxisData) {
  const stats = calcStats(zAxisData);
  return {
    sessionName: session.name,
    startTime: session.startTime,
    endTime: session.endTime,
    readings: zAxisData.length,
    naturalFrequency: session.naturalFrequency,
    peakAmplitude: session.peakAmplitude,
    mechanicalProperties: session.mechanicalProperties || {},
    rmsValue: stats.rms,
    meanValue: stats.mean
  };
}

function calcStats(zAxisData) {
  if (!zAxisData || !zAxisData.length) return { mean: 0, rms: 0 };
  const values = zAxisData.map(d => d.deltaZ || 0);
  const mean = values.reduce((a, v) => a + v, 0) / values.length;
  const rms = Math.sqrt(values.reduce((a, v) => a + v * v, 0) / values.length);
  return { mean, rms };
}

function formatDuration(start, end) {
  const ms = new Date(end) - new Date(start);
  const s = Math.floor(ms / 1000) % 60;
  const m = Math.floor(ms / 60000);
  return `${m}:${String(s).padStart(2, '0')} min`;
}

function sampleData(array, targetCount) {
  if (array.length <= targetCount) return array;
  const sampled = [];
  const step = array.length / targetCount;
  for (let i = 0; i < targetCount; i++) {
    sampled.push(array[Math.floor(i * step)]);
  }
  return sampled;
}
