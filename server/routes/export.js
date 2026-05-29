/**
 * server/routes/export.js
 * CSV and JSON export routes for session data.
 */

import express from 'express';
import fs from 'fs';
import path from 'path';
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

    if (format === 'raw_csv') {
      const escapeCSV = (val) => {
        if (val === undefined || val === null) return '';
        let str = String(val);
        if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
          str = `"${str.replace(/"/g, '""')}"`;
        }
        return str;
      };

      const totalSamples = vibData.length;
      let maxDeltaZ = 0;
      let avgDeltaZ = 0;
      let maxAmp = 0;
      let avgAmp = 0;
      let meanRawAcc = 0;
      let maxRawAcc = -Infinity;
      let minRawAcc = Infinity;

      if (totalSamples > 0) {
        let sumDeltaZ = 0;
        let sumAmp = 0;
        let sumRawAcc = 0;
        vibData.forEach(p => {
          const dz = p.deltaZ || 0;
          const amp = p.amplitude || 0;
          const raw = p.rawAcceleration || 0;
          sumDeltaZ += dz;
          sumAmp += amp;
          sumRawAcc += raw;
          if (dz > maxDeltaZ) maxDeltaZ = dz;
          if (amp > maxAmp) maxAmp = amp;
          if (raw > maxRawAcc) maxRawAcc = raw;
          if (raw < minRawAcc) minRawAcc = raw;
        });
        avgDeltaZ = sumDeltaZ / totalSamples;
        avgAmp = sumAmp / totalSamples;
        meanRawAcc = sumRawAcc / totalSamples;
      }
      if (minRawAcc === Infinity) minRawAcc = 0;
      if (maxRawAcc === -Infinity) maxRawAcc = 0;

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="vibration-${session.id}.csv"`);

      const rows = [];
      rows.push(['MOI UNIVERSITY', 'DEPARTMENT OF MECHANICAL & PRODUCTION ENGINEERING', '', '', '', '', '']);
      rows.push(['STRUCTURAL VIBRATION MONITORING LABORATORY - SCIENTIFIC DATA EXPORT', '', '', '', '', '', '']);
      rows.push(['', '', '', '', '', '', '']);
      
      rows.push(['SESSION METADATA', '', '', '', '', '', '']);
      rows.push(['Session Name', session.name, '', '', '', '', '']);
      rows.push(['Session ID', session.id, '', '', '', '', '']);
      rows.push(['Start Time', new Date(session.startTime).toISOString(), '', '', '', '', '']);
      rows.push(['End Time', session.endTime ? new Date(session.endTime).toISOString() : 'Active Session', '', '', '', '', '']);
      rows.push(['Duration', session.endTime ? `${((session.endTime - session.startTime) / 1000).toFixed(2)} seconds` : 'N/A', '', '', '', '', '']);
      rows.push(['Status', session.isActive ? 'ACTIVE / RECORDING' : 'COMPLETED', '', '', '', '', '']);
      rows.push(['', '', '', '', '', '', '']);

      rows.push(['SCIENTIFIC METRIC SUMMARY', '', '', '', '', '', '']);
      rows.push(['Metric Description', 'Value', 'Unit', 'Definition / Reference', '', '', '']);
      
      const mp = session.mechanicalProperties || {};
      rows.push(['Natural Frequency (fn)', session.naturalFrequency || 'N/A', 'Hz', 'Peak dominant frequency from FFT spectrum analysis', '', '', '']);
      rows.push(['Peak Acceleration Amplitude', session.peakAmplitude ? session.peakAmplitude * 9806.65 : 'N/A', 'mm/s²', 'Maximum spectral acceleration amplitude', '', '', '']);
      rows.push(['Equivalent Stiffness (k)', mp.stiffness || 'N/A', 'N/m', 'Equivalent structural stiffness derived from mass-frequency relations', '', '', '']);
      rows.push(['Damping Coefficient (c)', mp.dampingCoefficient || 'N/A', 'N-s/m', 'Viscous damping coefficient', '', '', '']);
      rows.push(['Damping Ratio (z)', mp.dampingRatio || 'N/A', '-', 'Dimensionless damping ratio (zeta)', '', '', '']);
      rows.push(['Quality Factor (Q)', mp.qFactor || 'N/A', '-', 'Resonant amplification factor', '', '', '']);
      rows.push(['Peak Signal Jerk (Max dZ)', (maxDeltaZ * 9806.65).toFixed(6), 'mm/s²', 'Maximum raw deviation from baseline', '', '', '']);
      rows.push(['Average Jerk (Avg dZ)', (avgDeltaZ * 9806.65).toFixed(6), 'mm/s²', 'Mean deviation indicating average transient activity', '', '', '']);
      rows.push(['Mean Gravity Offset (Bias)', (meanRawAcc * 9806.65).toFixed(6), 'mm/s²', 'Calculated acceleration bias due to physical gravity calibration', '', '', '']);
      rows.push(['Max Acceleration Range', `[${(minRawAcc * 9806.65).toFixed(4)}, ${(maxRawAcc * 9806.65).toFixed(4)}]`, 'mm/s²', 'Full acceleration scale range captured by the sensor', '', '', '']);
      rows.push(['Total Samples', totalSamples, 'records', 'Total data points logged', '', '', '']);
      rows.push(['', '', '', '', '', '', '']);
      rows.push(['', '', '', '', '', '', '']);

      rows.push(['RECORDED TIME-SERIES TELEMETRY', '', '', '', '', '', '']);
      rows.push(['Sample Index', 'Timestamp (UTC)', 'Relative Time (s)', 'Spectral Frequency (Hz)', 'FFT Amplitude (mm/s²)', 'Raw Acceleration Z (mm/s²)', 'Jerk Delta Z (mm/s²)']);

      vibData.forEach((p, idx) => {
        const relTime = ((p.timestamp - session.startTime) / 1000).toFixed(3);
        rows.push([
          idx + 1,
          new Date(p.timestamp).toISOString(),
          relTime,
          p.frequency || 0,
          (p.amplitude || 0) * 9806.65,
          (p.rawAcceleration || 0) * 9806.65,
          (p.deltaZ || 0) * 9806.65
        ]);
      });

      const csvContent = rows
        .map(row => row.map(escapeCSV).join(','))
        .join('\n');

      return res.send(csvContent);
    }

    if (format === 'csv' || format === 'xls' || format === 'xlsx') {
      const totalSamples = vibData.length;
      let maxDeltaZ = 0;
      let avgDeltaZ = 0;
      let maxAmp = 0;
      let avgAmp = 0;
      let meanRawAcc = 0;
      let maxRawAcc = -Infinity;
      let minRawAcc = Infinity;

      if (totalSamples > 0) {
        let sumDeltaZ = 0;
        let sumAmp = 0;
        let sumRawAcc = 0;
        vibData.forEach(p => {
          const dz = p.deltaZ || 0;
          const amp = p.amplitude || 0;
          const raw = p.rawAcceleration || 0;
          sumDeltaZ += dz;
          sumAmp += amp;
          sumRawAcc += raw;
          if (dz > maxDeltaZ) maxDeltaZ = dz;
          if (amp > maxAmp) maxAmp = amp;
          if (raw > maxRawAcc) maxRawAcc = raw;
          if (raw < minRawAcc) minRawAcc = raw;
        });
        avgDeltaZ = sumDeltaZ / totalSamples;
        avgAmp = sumAmp / totalSamples;
        meanRawAcc = sumRawAcc / totalSamples;
      }
      if (minRawAcc === Infinity) minRawAcc = 0;
      if (maxRawAcc === -Infinity) maxRawAcc = 0;

      const mp = session.mechanicalProperties || {};

      res.setHeader('Content-Type', 'application/vnd.ms-excel');
      res.setHeader('Content-Disposition', `attachment; filename="vibration-${session.id}.xls"`);

      const host = req.get('host') || 'localhost:3000';
      const logoUrl = `http://${host}/images/logo.png`;

      const escapeHTML = (val) => {
        if (val === undefined || val === null) return '';
        return String(val)
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;')
          .replace(/'/g, '&#039;');
      };

      const rows = [];
      
      rows.push(`
<html xmlns:o="urn:schemas-microsoft-com:office:office"
      xmlns:x="urn:schemas-microsoft-com:office:excel"
      xmlns="http://www.w3.org/TR/REC-html40">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=utf-8">
  <!--[if gte mso 9]>
  <xml>
    <x:ExcelWorkbook>
      <x:ExcelWorksheets>
        <x:ExcelWorksheet>
          <x:Name>Vibration Session Data</x:Name>
          <x:WorksheetOptions>
            <x:DisplayGridlines/>
          </x:WorksheetOptions>
        </x:ExcelWorksheet>
      </x:ExcelWorksheets>
    </x:ExcelWorkbook>
  </xml>
  <![endif]-->
  <style>
    body {
      font-family: 'Segoe UI', Calibri, Arial, sans-serif;
      color: #334155;
    }
    table {
      border-collapse: collapse;
    }
    td, th {
      font-family: 'Segoe UI', Calibri, Arial, sans-serif;
      font-size: 10pt;
      padding: 8px 12px;
      vertical-align: middle;
      border: 1px solid #cbd5e1;
    }
    .header-title {
      font-size: 16pt;
      font-weight: bold;
      color: #1e3a8a;
      border: none;
    }
    .header-subtitle {
      font-size: 11pt;
      color: #475569;
      font-style: italic;
      border: none;
    }
    .section-title {
      font-size: 11.5pt;
      font-weight: bold;
      color: #ffffff;
      background-color: #1e3a8a;
      border: 1px solid #1e3a8a;
      padding: 10px 14px;
    }
    .meta-label {
      font-weight: bold;
      color: #334155;
      background-color: #f1f5f9;
      border: 1px solid #cbd5e1;
    }
    .meta-value {
      color: #0f172a;
      border: 1px solid #cbd5e1;
    }
    .table-th {
      background-color: #334155;
      color: #ffffff;
      font-weight: bold;
      text-align: left;
      border: 1px solid #334155;
      padding: 10px 12px;
    }
    .table-td {
      border: 1px solid #cbd5e1;
      padding: 8px 12px;
    }
    .num-val {
      text-align: right;
    }
    .text-val {
      text-align: left;
    }
    .center-val {
      text-align: center;
    }
    .metric-name {
      font-weight: bold;
      color: #0f172a;
      border: 1px solid #cbd5e1;
      background-color: #f8fafc;
      white-space: normal;
    }
    .metric-val {
      font-weight: bold;
      color: #0f766e;
      text-align: right;
      border: 1px solid #cbd5e1;
    }
    .metric-unit {
      color: #475569;
      text-align: center;
      border: 1px solid #cbd5e1;
    }
    .metric-desc {
      color: #475569;
      border: 1px solid #cbd5e1;
      white-space: normal;
    }
  </style>
</head>
<body>
  <table>
    <colgroup>
      <col width="150">
      <col width="250">
      <col width="150">
      <col width="180">
      <col width="180">
      <col width="180">
      <col width="180">
    </colgroup>
    
    <!-- Branding Header & Embedded Logo -->
    <tr height="90" style="height: 90px; border: none;">
      <td colspan="7" style="border: none; padding: 10px 0px; text-align: left; vertical-align: middle; height: 90px;">
        <img src="${logoUrl}" height="70" style="height: 70px;" alt="Moi University Logo">
      </td>
    </tr>
    <tr height="30" style="height: 30px; border: none;">
      <td colspan="7" class="header-title">MOI UNIVERSITY</td>
    </tr>
    <tr height="25" style="height: 25px; border: none;">
      <td colspan="7" class="header-subtitle">DEPARTMENT OF MECHANICAL & PRODUCTION ENGINEERING</td>
    </tr>
    <tr height="25" style="height: 25px; border: none;">
      <td colspan="7" style="font-weight: bold; color: #475569; font-size: 11pt; border: none;">STRUCTURAL VIBRATION MONITORING LABORATORY - SCIENTIFIC DATA REPORT</td>
    </tr>
    <tr height="15" style="height: 15px; border: none;"><td colspan="7" style="border: none;"></td></tr>
    
    <!-- Session Metadata Section -->
    <tr height="35" style="height: 35px;">
      <td colspan="7" class="section-title">EXPERIMENTAL RUN CONFIGURATION & METADATA</td>
    </tr>
    <tr>
      <td class="meta-label">Session Name</td>
      <td colspan="6" class="meta-value">${escapeHTML(session.name)}</td>
    </tr>
    <tr>
      <td class="meta-label">Session ID</td>
      <td colspan="6" class="meta-value">${escapeHTML(session.id)}</td>
    </tr>
    <tr>
      <td class="meta-label">Start Time</td>
      <td colspan="6" class="meta-value">${escapeHTML(new Date(session.startTime).toISOString())}</td>
    </tr>
    <tr>
      <td class="meta-label">End Time</td>
      <td colspan="6" class="meta-value">${session.endTime ? escapeHTML(new Date(session.endTime).toISOString()) : 'Active Session'}</td>
    </tr>
    <tr>
      <td class="meta-label">Duration</td>
      <td colspan="6" class="meta-value">${session.endTime ? escapeHTML(((session.endTime - session.startTime) / 1000).toFixed(2)) + ' seconds' : 'N/A'}</td>
    </tr>
    <tr>
      <td class="meta-label">Status</td>
      <td colspan="6" class="meta-value">${session.isActive ? 'ACTIVE / RECORDING' : 'COMPLETED'}</td>
    </tr>
    <tr height="15" style="height: 15px; border: none;"><td colspan="7" style="border: none;"></td></tr>
    
    <!-- Scientific Metrics Section -->
    <tr height="35" style="height: 35px;">
      <td colspan="7" class="section-title">MECHANICAL SYSTEM DYNAMIC PARAMETERS</td>
    </tr>
    <tr height="32" style="background-color: #cbd5e1; font-weight: bold; height: 32px;">
      <td colspan="2" style="border: 1px solid #cbd5e1; padding: 10px 12px; font-weight: bold;">Mechanical Property / Dynamic Metric</td>
      <td style="border: 1px solid #cbd5e1; text-align: right; padding: 10px 12px; font-weight: bold;">Value</td>
      <td style="border: 1px solid #cbd5e1; text-align: center; padding: 10px 12px; font-weight: bold;">Unit</td>
      <td colspan="3" style="border: 1px solid #cbd5e1; padding: 10px 12px; font-weight: bold;">Definition / Reference</td>
    </tr>
    <tr height="48" style="height: 48px;">
      <td colspan="2" class="metric-name">Fundamental Resonance Frequency (fn)</td>
      <td class="metric-val">${escapeHTML(session.naturalFrequency ? session.naturalFrequency.toFixed(3) : 'N/A')}</td>
      <td class="metric-unit">Hz</td>
      <td colspan="3" class="metric-desc">Peak dominant resonance frequency extracted from Fast Fourier Transform (FFT) power spectral density.</td>
    </tr>
    <tr height="48" style="height: 48px;">
      <td colspan="2" class="metric-name">Maximum Peak Dynamic Acceleration Amplitude (Amax)</td>
      <td class="metric-val">${escapeHTML(session.peakAmplitude ? (session.peakAmplitude * 9806.65).toFixed(6) : 'N/A')}</td>
      <td class="metric-unit">mm/s²</td>
      <td colspan="3" class="metric-desc">Maximum dynamic acceleration amplitude in the frequency domain at the fundamental mode.</td>
    </tr>
    <tr height="48" style="height: 48px;">
      <td colspan="2" class="metric-name">Equivalent Structural Stiffness (k)</td>
      <td class="metric-val">${escapeHTML(mp.stiffness ? mp.stiffness.toFixed(2) : 'N/A')}</td>
      <td class="metric-unit">N/m</td>
      <td colspan="3" class="metric-desc">Derived stiffness of the equivalent single-degree-of-freedom (SDOF) model using mass-resonance relationship.</td>
    </tr>
    <tr height="48" style="height: 48px;">
      <td colspan="2" class="metric-name">Viscous Damping Coefficient (c)</td>
      <td class="metric-val">${escapeHTML(mp.dampingCoefficient ? mp.dampingCoefficient.toFixed(4) : 'N/A')}</td>
      <td class="metric-unit">N-s/m</td>
      <td colspan="3" class="metric-desc">Damping coefficient representing structural resistance to velocity (c = 2 * zeta * sqrt(k * m)).</td>
    </tr>
    <tr height="48" style="height: 48px;">
      <td colspan="2" class="metric-name">Dimensionless Modal Damping Ratio (&zeta;)</td>
      <td class="metric-val">${escapeHTML(mp.dampingRatio ? mp.dampingRatio.toFixed(6) : 'N/A')}</td>
      <td class="metric-unit">-</td>
      <td colspan="3" class="metric-desc">Damping ratio (zeta) indicating structural attenuation rate relative to critical damping.</td>
    </tr>
    <tr height="48" style="height: 48px;">
      <td colspan="2" class="metric-name">Resonant Q-Factor (Amplification)</td>
      <td class="metric-val">${escapeHTML(mp.qFactor ? mp.qFactor.toFixed(4) : 'N/A')}</td>
      <td class="metric-unit">-</td>
      <td colspan="3" class="metric-desc">Quality factor representing resonant magnification amplitude at modal excitation (Q = 1 / (2 * zeta)).</td>
    </tr>
    <tr height="48" style="height: 48px;">
      <td colspan="2" class="metric-name">Peak Jerk Amplitude (Max dZ/dt)</td>
      <td class="metric-val">${escapeHTML((maxDeltaZ * 9806.65).toFixed(6))}</td>
      <td class="metric-unit">mm/s²</td>
      <td colspan="3" class="metric-desc">Maximum time rate of change of acceleration, indicating high-frequency shock transients.</td>
    </tr>
    <tr height="48" style="height: 48px;">
      <td colspan="2" class="metric-name">Mean Absolute Jerk (Avg dZ/dt)</td>
      <td class="metric-val">${escapeHTML((avgDeltaZ * 9806.65).toFixed(6))}</td>
      <td class="metric-unit">mm/s²</td>
      <td colspan="3" class="metric-desc">Mean absolute jerk indicating average structural shock rate and transient severity.</td>
    </tr>
    <tr height="48" style="height: 48px;">
      <td colspan="2" class="metric-name">Mean Gravitational Acceleration Offset (g-bias)</td>
      <td class="metric-val">${escapeHTML((meanRawAcc * 9806.65).toFixed(6))}</td>
      <td class="metric-unit">mm/s²</td>
      <td colspan="3" class="metric-desc">Baseline DC component representing constant physical gravity offset (offset at rest).</td>
    </tr>
    <tr height="48" style="height: 48px;">
      <td colspan="2" class="metric-name">Sensor Full-Scale Operating Range</td>
      <td class="metric-val">[${escapeHTML((minRawAcc * 9806.65).toFixed(4))}, ${escapeHTML((maxRawAcc * 9806.65).toFixed(4))}]</td>
      <td class="metric-unit">mm/s²</td>
      <td colspan="3" class="metric-desc">Full-scale dynamic measurement range envelope captured by the triaxial accelerometer.</td>
    </tr>
    <tr height="48" style="height: 48px;">
      <td colspan="2" class="metric-name">Discretized Sample Count</td>
      <td class="metric-val">${escapeHTML(totalSamples)}</td>
      <td class="metric-unit">records</td>
      <td colspan="3" class="metric-desc">Total number of discrete acceleration readings captured during this experimental run.</td>
    </tr>
    <tr height="15" style="height: 15px; border: none;"><td colspan="7" style="border: none;"></td></tr>
    
    <!-- Time Series Section -->
    <tr height="35" style="height: 35px;">
      <td colspan="7" class="section-title">DISCRETE-TIME STRUCTURAL VIBRATION RESPONSE</td>
    </tr>
    <tr style="background-color: #334155; color: #ffffff; font-weight: bold;">
      <th class="table-th">Sequence Index [n]</th>
      <th class="table-th">Timestamp (UTC)</th>
      <th class="table-th">Time Offset (t) (s)</th>
      <th class="table-th">Frequency Coordinate (f) (Hz)</th>
      <th class="table-th">Spectral Acceleration Amplitude [amplitude] (mm/s²)</th>
      <th class="table-th">Proper Acceleration Z-axis [rawAcceleration] (mm/s²)</th>
      <th class="table-th">Relative Jerk Offset [deltaZ] (mm/s²)</th>
    </tr>
`);

      vibData.forEach((p, idx) => {
        const relTime = ((p.timestamp - session.startTime) / 1000).toFixed(3);
        rows.push(`
    <tr>
      <td class="table-td center-val">${idx + 1}</td>
      <td class="table-td text-val">${escapeHTML(new Date(p.timestamp).toISOString())}</td>
      <td class="table-td num-val">${escapeHTML(relTime)}</td>
      <td class="table-td num-val">${escapeHTML((p.frequency || 0).toFixed(3))}</td>
      <td class="table-td num-val">${escapeHTML(((p.amplitude || 0) * 9806.65).toFixed(6))}</td>
      <td class="table-td num-val">${escapeHTML(((p.rawAcceleration || 0) * 9806.65).toFixed(6))}</td>
      <td class="table-td num-val">${escapeHTML(((p.deltaZ || 0) * 9806.65).toFixed(6))}</td>
    </tr>`);
      });

      rows.push(`
  </table>
</body>
</html>`);

      return res.send(rows.join(''));
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
