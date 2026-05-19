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

      // ==========================================
      // PAGE 1: HEADER, PIPELINE & TIME DOMAIN
      // ==========================================
      drawHeader(doc, 'ACADEMIC MANUAL', 'FM: MU-MPE-SV-M01');

      doc.font('Helvetica-Bold').fontSize(16).fillColor('#0f172a')
        .text('Theory, Mathematics & DSP Manual');
      doc.font('Helvetica').fontSize(9.5).fillColor('#475569')
        .text('Z-Axis Structural Resonance & Dynamic Vibration Analysis');
      doc.moveDown(0.8);

      drawHeading(doc, '1. System Pipeline & Data Flow', 1);
      doc.font('Helvetica').fontSize(9).fillColor('#334155')
        .text('This offline desktop system monitors physical vertical vibration using low-cost hardware and computes structural mechanical parameters in real time. The signal acquisition, transmission, and processing steps are organized as follows:', { align: 'justify', lineGap: 2.5 });
      doc.moveDown(0.6);

      // Render Pipeline Steps (Compact List with left border lines)
      drawPipelineStep(doc, 1, 'MPU9250 Accelerometer', 'Measures proper vertical acceleration in the Z-axis at a sample rate of 500 Hz.');
      drawPipelineStep(doc, 2, 'Node.js Express Server', 'Ingests raw batches over WebSockets, applying Hamming Windowing, Cooley-Tukey FFT, and Damping estimation.');
      drawPipelineStep(doc, 3, 'Dashboard & Report Exports', 'Renders real-time charts, manages session history, and compiles analytical PDF reports.');
      doc.moveDown(0.6);

      drawHeading(doc, '2. Time-Domain Filtering & Calibration', 1);
      
      drawHeading(doc, '2.1 Gravity Calibration', 2);
      doc.font('Helvetica').fontSize(9).fillColor('#334155')
        .text('At rest, the sensor reports gravitational acceleration of approximately 1g (9.81 m/s²). To isolate dynamic structure vibration, the baseline gravity component is calculated as the arithmetic mean of the first N = 1000 resting samples:', { align: 'justify', lineGap: 2.5 });
      doc.moveDown(0.4);

      const parts1 = [
        { text: 'Baseline = ( 1 / N ) ' },
        { text: 'S', font: 'Symbol' }, // Sigma
        { text: 'i=1', sub: true },
        { text: 'N', sup: true },
        { text: ' Z[i]' }
      ];
      drawMathBlock(doc, parts1, 'Computes the constant gravity bias offset.');

      drawHeading(doc, '2.2 Exponential Moving Average (EMA)', 2);
      doc.font('Helvetica').fontSize(9).fillColor('#334155')
        .text('To compensate for low-frequency thermal drift, structural tilt, or orientation change, the baseline is continuously updated in the background using an Exponential Moving Average (EMA) filter:', { align: 'justify', lineGap: 2.5 });
      doc.moveDown(0.4);

      const parts2 = [
        { text: 'MA[t] = ' },
        { text: 'a', font: 'Symbol' }, // alpha
        { text: ' Z[t] + ( 1 - ' },
        { text: 'a', font: 'Symbol' }, // alpha
        { text: ' ) MA[t-1]' }
      ];
      drawMathBlock(doc, parts2, 'EMA baseline update equation with smoothing parameter alpha = 0.15.');

      drawHeading(doc, '2.3 Variance-Based Jerk Detection', 2);
      doc.font('Helvetica').fontSize(9).fillColor('#334155')
        .text('To save host processing power, spectral analysis is only triggered when significant dynamic movement is detected. The ESP8266 monitors standard deviation (variance) over a rolling 64-sample window:', { align: 'justify', lineGap: 2.5 });
      doc.moveDown(0.4);

      const parts3 = [
        { text: 's', font: 'Symbol' }, // sigma
        { text: '\xb2 = ( 1 / N ) ', font: 'Helvetica-Bold' }, // σ²
        { text: 'S', font: 'Symbol' }, // Sigma
        { text: 'i=1', sub: true },
        { text: 'N', sup: true },
        { text: ' ( Z[i] - MA[t] )\xb2', font: 'Helvetica-Bold' }
      ];
      drawMathBlock(doc, parts3, 'Calculates rolling signal variance. The active trigger threshold is set to 1.5 * sigma.');

      // ==========================================
      // PAGE 2: FREQUENCY-DOMAIN ANALYSIS
      // ==========================================
      doc.addPage();
      doc.y = 64;

      drawHeading(doc, '3. Frequency-Domain Analysis', 1);
      
      drawHeading(doc, '3.1 Spectral Leakage & Hamming Windowing', 2);
      doc.font('Helvetica').fontSize(9).fillColor('#334155')
        .text('Because the captured time buffer is finite (N = 128 samples), direct FFT computation causes severe spectral leakage at window boundaries. To mitigate this, a Hamming Window is applied to pre-taper the dataset:', { align: 'justify', lineGap: 2.5 });
      doc.moveDown(0.4);

      const parts4 = [
        { text: 'W[n] = 0.54 - 0.46 cos( ( 2' },
        { text: 'p', font: 'Symbol' }, // pi
        { text: ' n ) / ( N - 1 ) )' }
      ];
      drawMathBlock(doc, parts4, 'Hamming coefficients applied as: Z_windowed[n] = Z[n] * W(n).');

      drawHeading(doc, '3.2 Cooley-Tukey Radix-2 FFT', 2);
      doc.font('Helvetica').fontSize(9).fillColor('#334155')
        .text('The server transforms windowed acceleration data using the Decimation-in-Time Cooley-Tukey FFT algorithm, reducing computational complexity from O(N²) to O(N log N):', { align: 'justify', lineGap: 2.5 });
      doc.moveDown(0.4);

      const parts5 = [
        { text: 'X[k] = ' },
        { text: 'S', font: 'Symbol' }, // Sigma
        { text: 'n=0', sub: true },
        { text: 'N-1', sup: true },
        { text: ' x[n] e' },
        { text: '-j 2', sup: true },
        { text: 'p', font: 'Symbol', sup: true }, // pi
        { text: ' k n / N', sup: true }
      ];
      drawMathBlock(doc, parts5, 'Discrete Fourier Transform computed recursively.');

      drawHeading(doc, '3.3 Scaling & Nyquist Criterion', 2);
      doc.font('Helvetica').fontSize(9).fillColor('#334155')
        .text('To output true physical G-forces on the charts, complex FFT outputs are scaled. Based on the Nyquist criterion, with a sampling rate of Fs = 500 Hz, the maximum resolved frequency is 250 Hz. The frequency spacing between bins is:', { align: 'justify', lineGap: 2.5 });
      doc.moveDown(0.4);

      const parts6a = [
        { text: 'D', font: 'Symbol' }, // Delta
        { text: 'f = F' },
        { text: 's', sub: true },
        { text: ' / N = 500 / 128 = 3.906 Hz' }
      ];
      drawMathBlock(doc, parts6a, 'Frequency resolution bin width equation.');

      const parts6b = [
        { text: 'Amplitude[k] = ( 2 / N ) ' },
        { text: '\xd6', font: 'Symbol' }, // √
        { text: '[ Re(X[k])\xb2 + Im(X[k])\xb2 ]' }
      ];
      drawMathBlock(doc, parts6b, 'Magnitude scaling to compute true physical G-force amplitude.');

      drawHeading(doc, '4. Structural Resonance & Damping', 1);
      
      drawHeading(doc, '4.1 Half-Power Bandwidth (Q-Factor)', 2);
      doc.font('Helvetica').fontSize(9).fillColor('#334155')
        .text('Resonance is identified as the highest peak frequency (fn) in the magnitude spectrum. The Quality Factor (Q), representing the sharpness of resonance and system energy storage, is determined by:', { align: 'justify', lineGap: 2.5 });
      doc.moveDown(0.4);

      const parts7 = [
        { text: 'Q = f' },
        { text: 'n', sub: true },
        { text: ' / ( f' },
        { text: '2', sub: true },
        { text: ' - f' },
        { text: '1', sub: true },
        { text: ' )' }
      ];
      drawMathBlock(doc, parts7, 'Where f1 and f2 are the frequencies where response falls to 0.707 * A_max.');

      // ==========================================
      // PAGE 3: DAMPING RATIO, TABLE & CALCULATOR
      // ==========================================
      doc.addPage();
      doc.y = 64;

      // Draw Heading 4.2 with ζ (Zeta) Symbol
      const headingY = doc.y;
      doc.font('Helvetica-Bold').fontSize(9.5).fillColor('#0f172a');
      doc.text('4.2 Damping Ratio (', 54, headingY, { lineBreak: false });
      let curX = 54 + doc.widthOfString('4.2 Damping Ratio (');
      doc.font('Symbol').fontSize(9.5);
      doc.text('z', curX, headingY, { lineBreak: false });
      curX += doc.widthOfString('z');
      doc.font('Helvetica-Bold').fontSize(9.5);
      doc.text(')', curX, headingY);
      doc.y = headingY + 12;
      doc.moveDown(0.25);

      doc.font('Helvetica').fontSize(9).fillColor('#334155')
        .text('The mechanical damping ratio (zeta) dictates the decay of transient oscillations. For light structural damping, it is computed directly from Q:', { align: 'justify', lineGap: 2.5 });
      doc.moveDown(0.4);

      const parts8 = [
        { text: 'z', font: 'Symbol' }, // zeta
        { text: ' = 1 / ( 2 Q )' }
      ];
      drawMathBlock(doc, parts8, 'Damping ratio calculation.');
      doc.moveDown(0.6);

      // Damping Table
      drawDampingTable(doc);
      doc.moveDown(1.2);

      drawHeading(doc, '5. Interactive Calculator Guide', 1);
      doc.font('Helvetica').fontSize(9).fillColor('#334155')
        .text('The dashboard manual contains an Interactive DSP Playground to simulate resonance parameters. Entering the peak resonance frequency fn, cutoff limits f1 and f2, and peak amplitude yields the damping coefficient. Robust validation checks ensure f1 < fn < f2 and prevent arithmetic boundary overflows. The calculated damping ratio is matched against the classifications table to provide structural recommendations.', { align: 'justify', lineGap: 2.5 });

      // Page numbers, footers & headers on all pages
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
  if (doc.y > 680) {
    doc.addPage();
    doc.y = 64; // Reset to top printable space on new page
  }
  doc.moveDown(level === 1 ? 0.9 : 0.5);
  const size = level === 1 ? 12 : level === 2 ? 9.5 : 8.5;
  const color = level === 1 ? '#1e3a8a' : level === 2 ? '#0f172a' : '#475569';
  doc.font('Helvetica-Bold').fontSize(size).fillColor(color).text(text);
  doc.moveDown(0.25);
}

function drawPipelineStep(doc, stepNum, title, desc) {
  const startY = doc.y;
  doc.lineWidth(1.5).strokeColor('#1e3a8a').moveTo(54, startY).lineTo(54, startY + 24).stroke();
  doc.font('Helvetica-Bold').fontSize(9).fillColor('#0f172a').text(`STEP ${stepNum}: ${title.toUpperCase()}`, 64, startY + 2);
  doc.font('Helvetica').fontSize(8.5).fillColor('#475569').text(desc, 64, startY + 13);
  doc.y = startY + 28;
}

function drawMathEquation(doc, blockY, parts, blockWidth = 487, blockLeft = 54) {
  const size = 9.5;
  const subSize = 6.5;
  
  // Calculate total width of all parts
  let totalWidth = 0;
  parts.forEach(p => {
    const font = p.font || 'Helvetica-Bold';
    const fontSize = p.sub || p.sup ? subSize : size;
    doc.font(font).fontSize(fontSize);
    totalWidth += doc.widthOfString(p.text);
  });
  
  // Start X for centering
  let currentX = blockLeft + (blockWidth - totalWidth) / 2;
  
  // Draw each part sequentially
  parts.forEach(p => {
    const font = p.font || 'Helvetica-Bold';
    const fontSize = p.sub || p.sup ? subSize : size;
    const yOffset = p.sub ? 3 : p.sup ? -3 : 0;
    const textY = blockY + 11 + yOffset; // Vertical centering offset in a 34px box
    
    doc.font(font).fontSize(fontSize).fillColor('#1e293b');
    doc.text(p.text, currentX, textY, { lineBreak: false });
    
    currentX += doc.widthOfString(p.text);
  });
}

function drawMathBlock(doc, parts, description) {
  const startY = doc.y;
  
  // Outer equation box
  doc.rect(54, startY, 487, 34).fill('#f8fafc');
  doc.rect(54, startY, 487, 34).lineWidth(0.5).stroke('#cbd5e1');
  
  // Render equation centered in box
  drawMathEquation(doc, startY, parts, 487, 54);
  
  doc.y = startY + 38;
  if (description) {
    doc.font('Helvetica-Oblique').fontSize(8).fillColor('#64748b').text(description, 54, doc.y, { width: 487, align: 'left' });
    doc.moveDown(0.5);
  }
  doc.moveDown(0.2);
}

function drawRichTextCell(doc, parts, x, y, size = 7.5, color = '#334155') {
  let currentX = x;
  parts.forEach(p => {
    const font = p.font || 'Helvetica';
    doc.font(font).fontSize(size).fillColor(color);
    doc.text(p.text, currentX, y, { lineBreak: false });
    currentX += doc.widthOfString(p.text);
  });
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
  
  // Header text parts
  // 1st Column Header: Damping Ratio (ζ)
  drawRichTextCell(doc, [
    { text: 'Damping Ratio (', font: 'Helvetica-Bold' },
    { text: 'z', font: 'Symbol' },
    { text: ')', font: 'Helvetica-Bold' }
  ], colPositions[0] + 6, tableTop + 7, 8, '#ffffff');

  // 2nd Column Header: Q-Factor
  doc.font('Helvetica-Bold').fontSize(8).fillColor('#ffffff').text('Q-Factor', colPositions[1] + 6, tableTop + 7);

  // 3rd Column Header: Classification
  doc.font('Helvetica-Bold').fontSize(8).fillColor('#ffffff').text('Classification', colPositions[2] + 6, tableTop + 7);

  // 4th Column Header: Interpretation
  doc.font('Helvetica-Bold').fontSize(8).fillColor('#ffffff').text('Structural Interpretation & Action', colPositions[3] + 6, tableTop + 7);

  doc.y = tableTop + rowHeight;

  const rows = [
    {
      zeta: [{ text: 'z', font: 'Symbol' }, { text: ' < 0.01' }],
      q: [{ text: 'Q > 50' }],
      cls: 'Critically Light',
      desc: 'Severe resonant risk. Damping plates or stiffness gussets required.'
    },
    {
      zeta: [{ text: '0.01 ' }, { text: '\xa3', font: 'Symbol' }, { text: ' z', font: 'Symbol' }, { text: ' < 0.05' }],
      q: [{ text: '10 ' }, { text: '\xa3', font: 'Symbol' }, { text: ' Q ' }, { text: '\xa3', font: 'Symbol' }, { text: ' 50' }],
      cls: 'Low Damping',
      desc: 'Common in welded steel structures. Avoid resonance bands.'
    },
    {
      zeta: [{ text: '0.05 ' }, { text: '\xa3', font: 'Symbol' }, { text: ' z', font: 'Symbol' }, { text: ' < 0.15' }],
      q: [{ text: '3.3 ' }, { text: '\xa3', font: 'Symbol' }, { text: ' Q < 10' }],
      cls: 'Moderate Damping',
      desc: 'Standard bolted joints, composite frames, elastomeric pads.'
    },
    {
      zeta: [{ text: 'z', font: 'Symbol' }, { text: ' ' }, { text: '\xb3', font: 'Symbol' }, { text: ' 0.15' }],
      q: [{ text: 'Q < 3.3' }],
      cls: 'High Damping',
      desc: 'Heavily isolated foundation pads. Oscillations decay instantly.'
    }
  ];

  let currentY = doc.y;
  rows.forEach((r, idx) => {
    if (idx % 2 === 1) {
      doc.rect(54, currentY, 487, rowHeight).fill('#f8fafc');
    }

    drawRichTextCell(doc, r.zeta, colPositions[0] + 6, currentY + 7, 7.5, '#334155');
    drawRichTextCell(doc, r.q, colPositions[1] + 6, currentY + 7, 7.5, '#0f172a');
    
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
    doc.lineWidth(0.5).strokeColor('#cbd5e1').moveTo(54, 788).lineTo(541, 788).stroke();

    // Footer Text
    doc.font('Helvetica').fontSize(7.5).fillColor('#64748b');
    
    let textX = 54;
    if (fs.existsSync(LOGO_PATH)) {
      doc.image(LOGO_PATH, 54, 792, { width: 12 });
      textX = 70;
    }
    
    doc.text('Moi University (MPE) — Developed by I. Muigai, M. Akinyi & E. Barake', textX, 794, { align: 'left' });
    doc.text(`Page ${i + 1} of ${pages.count}`, 400, 794, { align: 'right', width: 141 });

    // Thin running headers on sub pages (page 2 and onwards)
    if (i > 0) {
      doc.font('Helvetica-Oblique').fontSize(8).fillColor('#64748b')
        .text('Moi University Department of Mechanical & Production Engineering', 54, 34);
      doc.font('Helvetica-Bold').fontSize(8).fillColor('#1e3a8a')
        .text('ACADEMIC MANUAL', 400, 34, { align: 'right', width: 141 });
      doc.lineWidth(0.5).strokeColor('#cbd5e1').moveTo(54, 46).lineTo(541, 46).stroke();
    }
    
    // Restore bottom margin
    doc.page.margins.bottom = oldBottomMargin;
  }
}
