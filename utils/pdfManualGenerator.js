import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const LOGO_PATH = path.join(__dirname, '..', 'public', 'images', 'logo.png');

/**
 * Generates a professional academic/technical PDF Manual for Theory & DSP.
 * @returns {Promise<Buffer>}
 */
export async function generatePDFManual() {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        margins: { top: 54, bottom: 54, left: 54, right: 54 },
        size: 'A4',
        bufferPages: true
      });

      const buffers = [];
      doc.on('data', b => buffers.push(b));
      doc.on('end', () => resolve(Buffer.concat(buffers)));

      // --- PAGE 1: TITLE & PIPELINE ---
      drawHeader(doc, 'ACADEMIC MANUAL', 'FM: MU-MPE-SV-M01');

      doc.font('Helvetica-Bold').fontSize(18).fillColor('#0f172a')
        .text('Theory, Mathematics & DSP Manual');
      doc.font('Helvetica').fontSize(10).fillColor('#475569')
        .text('Z-Axis Structural Resonance & Dynamic Vibration Analysis');
      doc.moveDown(1.2);

      drawHeading(doc, '1. System Pipeline & Data Flow', 1);
      doc.font('Helvetica').fontSize(9).fillColor('#334155').lineGap(3)
        .text('This offline desktop system monitors physical vertical vibration using low-cost hardware and computes structural mechanical parameters in real time. The signal acquisition, transmission, and processing steps are organized as follows:');
      doc.moveDown(0.8);

      // Flowchart layout
      drawFlowNode(doc, 'MPU9250 Accelerometer', 'Measures proper vertical acceleration in Z-axis at 500 Hz.');
      drawFlowArrow(doc, 'High-Speed WebSockets');
      drawFlowNode(doc, 'Node.js Express Server', 'Applies Hamming Window, Cooley-Tukey FFT, and Damping estimation.');
      drawFlowArrow(doc, 'JSON Feeds & SQLite');
      drawFlowNode(doc, 'Web Dashboard & PDF Report', 'Renders live charts, diagnostic reports, and AI analytics.');

      doc.moveDown(1.5);
      drawHeading(doc, '2. Time-Domain Filtering & Calibration', 1);
      drawHeading(doc, '2.1 Gravity Calibration', 2);
      doc.font('Helvetica').fontSize(9).fillColor('#334155')
        .text('At rest, the sensor reports gravitational acceleration of approximately 1g (9.81 m/s²). To isolate dynamic structure vibration, the baseline gravity component is calculated as the arithmetic mean of the first N = 1000 resting samples:');
      doc.moveDown(0.6);

      drawMathBlock(doc, 'Baseline = ( 1 / N ) * sum_{i=1}^{N} ( Z_i )', 'Computes the constant gravity bias offset.');

      // --- PAGE 2: EMA, JERK & FREQUENCY DOMAIN ---
      doc.addPage();
      drawHeader(doc, 'ACADEMIC MANUAL', 'FM: MU-MPE-SV-M01');

      drawHeading(doc, '2.2 Exponential Moving Average (EMA)', 2);
      doc.font('Helvetica').fontSize(9).fillColor('#334155')
        .text('To compensate for low-frequency thermal drift, structural tilt, or orientation change, the baseline is continuously updated in the background using an Exponential Moving Average (EMA) filter:');
      doc.moveDown(0.6);

      drawMathBlock(doc, 'MA_t = alpha * Z_t + ( 1 - alpha ) * MA_{t-1}', 'EMA baseline update equation with smoothing parameter alpha = 0.15.');
      doc.moveDown(0.8);

      drawHeading(doc, '2.3 Variance-Based Jerk Detection', 2);
      doc.font('Helvetica').fontSize(9).fillColor('#334155')
        .text('To save host processing power, spectral analysis is only triggered when significant dynamic movement is detected. The ESP8266 monitors standard deviation (variance) over a rolling 64-sample window:');
      doc.moveDown(0.6);

      drawMathBlock(doc, 'sigma^2 = ( 1 / N ) * sum_{i=1}^{N} ( Z_i - MA_t )^2', 'Calculates rolling signal variance. The active trigger threshold is set to 1.5 * sigma.');
      doc.moveDown(1.2);

      drawHeading(doc, '3. Frequency-Domain Analysis', 1);
      drawHeading(doc, '3.1 Spectral Leakage & Hamming Windowing', 2);
      doc.font('Helvetica').fontSize(9).fillColor('#334155')
        .text('Because the captured time buffer is finite (N = 128 samples), direct FFT computation causes severe spectral leakage at window boundaries. To mitigate this, a Hamming Window is applied to pre-taper the dataset:');
      doc.moveDown(0.6);

      drawMathBlock(doc, 'W(n) = 0.54 - 0.46 * cos( ( 2 * pi * n ) / ( N - 1 ) )', 'Hamming coefficients applied as: Z_windowed[n] = Z[n] * W(n).');

      // --- PAGE 3: FFT, SCALING & RESONANCE ---
      doc.addPage();
      drawHeader(doc, 'ACADEMIC MANUAL', 'FM: MU-MPE-SV-M01');

      drawHeading(doc, '3.2 Cooley-Tukey Radix-2 FFT', 2);
      doc.font('Helvetica').fontSize(9).fillColor('#334155')
        .text('The server transforms windowed acceleration data using the Decimation-in-Time Cooley-Tukey FFT algorithm, reducing computational complexity from O(N²) to O(N log N):');
      doc.moveDown(0.6);

      drawMathBlock(doc, 'X_k = sum_{n=0}^{N-1} ( x_n * e^{ -j * 2 * pi * k * n / N } )', 'Discrete Fourier Transform computed recursively.');
      doc.moveDown(0.8);

      drawHeading(doc, '3.3 Scaling & Nyquist Criterion', 2);
      doc.font('Helvetica').fontSize(9).fillColor('#334155')
        .text('To output true physical G-forces on the charts, complex FFT outputs are scaled. Based on the Nyquist criterion, with a sampling rate of Fs = 500 Hz, the maximum resolved frequency is 250 Hz. The frequency spacing between bins is:');
      doc.moveDown(0.6);

      drawMathBlock(doc, 'delta_f = Fs / N = 500 / 128 = 3.906 Hz', 'Magnitude scaling: Amplitude_k = ( 2 / N ) * sqrt( Re(X_k)^2 + Im(X_k)^2 )');
      doc.moveDown(1.2);

      drawHeading(doc, '4. Structural Resonance & Damping', 1);
      drawHeading(doc, '4.1 Half-Power Bandwidth (Q-Factor)', 2);
      doc.font('Helvetica').fontSize(9).fillColor('#334155')
        .text('Resonance is identified as the highest peak frequency (fn) in the magnitude spectrum. The Quality Factor (Q), representing the sharpness of resonance and system energy storage, is determined by:');
      doc.moveDown(0.6);

      drawMathBlock(doc, 'Q = fn / ( f2 - f1 )', 'Where f1 and f2 are the frequencies where response falls to 0.707 * A_max.');

      // --- PAGE 4: DAMPING TABLE & CALCULATOR ---
      doc.addPage();
      drawHeader(doc, 'ACADEMIC MANUAL', 'FM: MU-MPE-SV-M01');

      drawHeading(doc, '4.2 Damping Ratio (ζ)', 2);
      doc.font('Helvetica').fontSize(9).fillColor('#334155')
        .text('The mechanical damping ratio (zeta) dictates the decay of transient oscillations. For light structural damping, it is computed directly from Q:');
      doc.moveDown(0.6);

      drawMathBlock(doc, 'zeta = 1 / ( 2 * Q )', 'Used to classify structural integrity as follows:');
      doc.moveDown(0.8);

      // Render Table
      drawDampingTable(doc);
      doc.moveDown(1.5);

      drawHeading(doc, '5. Interactive Calculator Guide', 1);
      doc.font('Helvetica').fontSize(9).fillColor('#334155')
        .text('The dashboard manual contains an Interactive DSP Playground to simulate resonance parameters. Entering the peak resonance frequency fn, cutoff limits f1 and f2, and peak amplitude yields the damping coefficient. Robust validation checks ensure f1 < fn < f2 and prevent arithmetic boundary overflows.');

      // Page numbers & footers on all pages
      drawPageNumbers(doc);

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

// ─── Formatting Helpers ──────────────────────────────────────────────────
function drawHeader(doc, rightLabel, rightSub) {
  const topY = doc.y;

  // Add Logo if it exists
  if (fs.existsSync(LOGO_PATH)) {
    doc.image(LOGO_PATH, 54, topY, { width: 36 });
  }

  // Header Title Info (aligned right to logo)
  doc.font('Helvetica-Bold').fontSize(11).fillColor('#1e3a8a')
    .text('MOI UNIVERSITY', 100, topY, { align: 'left' });
  doc.font('Helvetica').fontSize(8).fillColor('#475569')
    .text('Department of Mechanical & Production Engineering', 100, topY + 13, { align: 'left' })
    .text('Structural Resonance & Vibration DSP Group', 100, topY + 23, { align: 'left' });

  // Right-aligned document label
  doc.font('Helvetica-Bold').fontSize(8.5).fillColor('#64748b')
    .text(rightLabel, 400, topY + 4, { align: 'right', width: 140 });
  doc.font('Helvetica').fontSize(7.5).fillColor('#94a3b8')
    .text(rightSub, 400, topY + 15, { align: 'right', width: 140 });

  doc.y = topY + 42;
  doc.lineWidth(0.75).strokeColor('#cbd5e1').moveTo(54, doc.y).lineTo(541, doc.y).stroke();
  doc.moveDown(1.2);
}

function drawHeading(doc, text, level) {
  doc.moveDown(level === 1 ? 1.0 : 0.6);
  const size = level === 1 ? 13 : level === 2 ? 10 : 8.5;
  const color = level === 1 ? '#1e3a8a' : level === 2 ? '#0f172a' : '#475569';
  doc.font('Helvetica-Bold').fontSize(size).fillColor(color).text(text);
  doc.moveDown(0.3);
}

function drawMathBlock(doc, formula, description) {
  const startY = doc.y;
  doc.rect(74, startY, 447, 28).fill('#f8fafc');
  doc.rect(74, startY, 447, 28).lineWidth(0.5).stroke('#cbd5e1');
  doc.font('Courier-Bold').fontSize(9).fillColor('#1e293b').text(formula, 84, startY + 10, { width: 427, align: 'center' });
  
  doc.y = startY + 34;
  if (description) {
    doc.font('Helvetica-Oblique').fontSize(7.5).fillColor('#64748b').text(description, 74, doc.y, { width: 447, align: 'left' });
    doc.moveDown(0.4);
  }
}

function drawFlowNode(doc, title, desc) {
  const startY = doc.y;
  doc.rect(74, startY, 447, 22).fill('#f1f5f9');
  doc.rect(74, startY, 447, 22).lineWidth(0.5).stroke('#cbd5e1');
  
  doc.font('Helvetica-Bold').fontSize(8).fillColor('#1e3a8a').text(title, 84, startY + 7, { continued: true });
  doc.font('Helvetica').fontSize(7.5).fillColor('#475569').text('  —  ' + desc);
  
  doc.y = startY + 22;
}

function drawFlowArrow(doc, text) {
  doc.moveDown(0.15);
  doc.font('Helvetica-Bold').fontSize(7).fillColor('#94a3b8').text('↓  ' + text, 74, doc.y, { align: 'center', width: 447 });
  doc.moveDown(0.15);
}

function drawDampingTable(doc) {
  doc.font('Helvetica-Bold').fontSize(9.5).fillColor('#0f172a').text('Structural Damping Classifications');
  doc.moveDown(0.4);

  const tableTop = doc.y;
  const colWidths = [90, 60, 95, 242];
  const colPositions = [54, 54 + colWidths[0], 54 + colWidths[0] + colWidths[1], 54 + colWidths[0] + colWidths[1] + colWidths[2]];
  const rowHeight = 22;

  // Header row
  doc.rect(54, tableTop, 487, rowHeight).fill('#1e3a8a');
  doc.font('Helvetica-Bold').fontSize(8).fillColor('#ffffff');
  doc.text('Damping Ratio (ζ)', colPositions[0] + 6, tableTop + 7);
  doc.text('Q-Factor', colPositions[1] + 6, tableTop + 7);
  doc.text('Classification', colPositions[2] + 6, tableTop + 7);
  doc.text('Structural Interpretation & Action', colPositions[3] + 6, tableTop + 7);

  doc.y = tableTop + rowHeight;

  const rows = [
    { zeta: 'ζ < 0.01', q: 'Q > 50', cls: 'Critically Light', desc: 'Severe resonant risk. Damping plates or stiffness gussets required.' },
    { zeta: '0.01 ≤ ζ < 0.05', q: '10 ≤ Q ≤ 50', cls: 'Low Damping', desc: 'Common in welded steel structures. Avoid resonance bands.' },
    { zeta: '0.05 ≤ ζ < 0.15', q: '3.3 ≤ Q < 10', cls: 'Moderate Damping', desc: 'Standard bolted joints, composite frames, elastomeric pads.' },
    { zeta: 'ζ ≥ 0.15', q: 'Q < 3.3', cls: 'High Damping', desc: 'Heavily isolated foundation pads. Oscillations decay instantly.' }
  ];

  let currentY = doc.y;
  rows.forEach((r, idx) => {
    if (idx % 2 === 1) {
      doc.rect(54, currentY, 487, rowHeight).fill('#f8fafc');
    }

    doc.font('Helvetica-Bold').fontSize(7.5).fillColor('#334155').text(r.zeta, colPositions[0] + 6, currentY + 7);
    doc.font('Helvetica').fontSize(7.5).fillColor('#0f172a').text(r.q, colPositions[1] + 6, currentY + 7);
    doc.font('Helvetica-Bold').fontSize(7.5).fillColor('#1e3a8a').text(r.cls, colPositions[2] + 6, currentY + 7);
    doc.font('Helvetica').fontSize(7.5).fillColor('#475569').text(r.desc, colPositions[3] + 6, currentY + 7, { width: colWidths[3] - 12 });

    doc.lineWidth(0.5).strokeColor('#e2e8f0').moveTo(54, currentY + rowHeight).lineTo(541, currentY + rowHeight).stroke();
    currentY += rowHeight;
  });

  doc.y = currentY;
}

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
    if (fs.existsSync(LOGO_PATH)) {
      doc.image(LOGO_PATH, 54, 790, { width: 14 });
      textX = 74;
    }
    
    // Just put the developer attribution on the left and page numbers on the right
    doc.text('Developed by I. Muigai, M. Akinyi & E. Barake', textX, 793, { align: 'left' });
    doc.text(`Page ${i + 1} of ${pages.count}`, 400, 793, { align: 'right', width: 141 });

    // Thin top header watermarks on sub pages (from page 2 onwards)
    if (i > 0) {
      doc.font('Helvetica-Oblique').fontSize(7.5).fillColor('#94a3b8')
        .text('Moi University Mechanical Engineering Department — Structural Vibration Theory & Manual', 54, 36);
      doc.lineWidth(0.5).strokeColor('#e2e8f0').moveTo(54, 46).lineTo(541, 46).stroke();
    }
    
    // Restore bottom margin
    doc.page.margins.bottom = oldBottomMargin;
  }
}
