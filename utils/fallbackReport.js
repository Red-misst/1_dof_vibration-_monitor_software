/**
 * utils/fallbackReport.js
 * Generates a rule-based vibration analysis report when AI is offline.
 * No internet required — purely derived from session data.
 */

export function generateFallbackAnalysis(reportContext) {
  const { naturalFrequency, peakAmplitude, mechanicalProperties, readings, rmsValue } = reportContext;
  const freq = naturalFrequency;
  const amp = peakAmplitude;
  const qFactor = mechanicalProperties?.qFactor;
  const bandwidth = mechanicalProperties?.bandwidth;
  const dampingRatio = mechanicalProperties?.dampingRatio || (qFactor ? 1 / (2 * qFactor) : null);

  let summary = '';
  let interpretation = '';
  let causes = '';
  let recommendations = '';

  // ── Frequency classification ────────────────────────────────────────────
  if (!freq || freq === 0) {
    summary = 'Insufficient data to determine natural frequency. Collect more data points.';
    interpretation = 'No dominant frequency was detected in this session.';
    causes = 'This may indicate very low vibration levels, sensor calibration issues, or a short session duration.';
    recommendations = 'Ensure the sensor is firmly attached and the test runs for at least 10 seconds.';
  } else if (freq < 1) {
    summary = `Very low-frequency vibration detected at **${freq.toFixed(3)} Hz** (sub-Hz structural motion).`;
    interpretation = 'Sub-1 Hz frequencies are characteristic of large structural oscillations, seismic-like motion, or slow mechanical sway.';
    causes = 'Possible causes include wind-induced sway (tall structures), foundation settling, or large rotating machinery at very low RPM.';
    recommendations = 'Inspect structural connections and isolation mounts. Consider dynamic isolation pads for low-frequency attenuation.';
  } else if (freq < 10) {
    summary = `Low-frequency resonance detected at **${freq.toFixed(2)} Hz** — common in mechanical structures.`;
    interpretation = 'Frequencies in the 1–10 Hz range are typical of structural resonance in beams, floors, and lightly damped mechanical systems.';
    causes = 'Rotating machinery, HVAC systems, or pedestrian loading can excite these frequencies. Resonance occurs when excitation frequency matches natural frequency.';
    recommendations = 'Add damping material to the structure. Shift the natural frequency by stiffening or adding mass. Avoid operating equipment at speeds that match this frequency.';
  } else if (freq < 100) {
    summary = `Mid-range vibration detected at **${freq.toFixed(2)} Hz** — typical of machinery and motor vibration.`;
    interpretation = 'Frequencies between 10–100 Hz are common in rotating machinery (motors, pumps, fans, gearboxes).';
    causes = 'Unbalanced rotating parts, bearing defects, misalignment, or resonance with mechanical components.';
    recommendations = 'Balance rotating components. Inspect bearings for wear. Check alignment of shafts and couplings.';
  } else {
    summary = `High-frequency vibration detected at **${freq.toFixed(2)} Hz** — inspect for bearing or gear defects.`;
    interpretation = 'Frequencies above 100 Hz typically indicate bearing defects, gear mesh frequencies, or high-speed machinery issues.';
    causes = 'Worn bearings, damaged gear teeth, cavitation in pumps, or electrical interference in motors.';
    recommendations = 'Perform bearing inspection and lubrication check. Use envelope analysis for bearing fault detection.';
  }

  // ── Amplitude assessment ────────────────────────────────────────────────
  let amplitudeNote = '';
  if (amp > 0) {
    if (amp < 0.05) {
      amplitudeNote = 'Peak amplitude is **very low** (< 490 mm/s²) — vibration levels are within normal acceptable range.';
    } else if (amp < 0.5) {
      amplitudeNote = `Peak amplitude of **${(amp * 9806.65).toFixed(3)} mm/s²** is moderate — monitor for increasing trends.`;
    } else if (amp < 2.0) {
      amplitudeNote = `Peak amplitude of **${(amp * 9806.65).toFixed(3)} mm/s²** is elevated — investigate source of vibration.`;
    } else {
      amplitudeNote = `Peak amplitude of **${(amp * 9806.65).toFixed(3)} mm/s²** is HIGH — immediate inspection recommended.`;
    }
  }

  // ── Q Factor assessment ─────────────────────────────────────────────────
  let dampingNote = '';
  if (qFactor && qFactor > 0) {
    if (qFactor < 2) {
      dampingNote = `Q Factor of **${qFactor.toFixed(2)}** indicates **high damping** — the system dissipates energy quickly.`;
    } else if (qFactor < 10) {
      dampingNote = `Q Factor of **${qFactor.toFixed(2)}** indicates **moderate damping** — acceptable for most applications.`;
    } else {
      dampingNote = `Q Factor of **${qFactor.toFixed(2)}** indicates **low damping** — resonance peaks are sharp. Consider adding damping material.`;
    }
  }

  return `# Vibration Analysis Report — ${reportContext.sessionName}

## Summary of Findings

${summary}

${amplitudeNote ? `${amplitudeNote}\n` : ''}${dampingNote ? `${dampingNote}\n` : ''}

**Data Points Collected:** ${readings || 0}
**RMS Acceleration:** ${rmsValue ? (rmsValue * 9806.65).toFixed(4) : 'N/A'} mm/s²

---

## Technical Analysis

${interpretation}

### Measured Parameters & Diagnostic Thresholds
- **Natural Frequency (fn):** ${freq ? freq.toFixed(3) + ' Hz' : 'Not detected'} (Primary resonance indicator)
- **Peak Amplitude:** ${amp ? (amp * 9806.65).toFixed(4) + ' mm/s²' : 'N/A'} (Dynamic displacement stress equivalent)
- **Q Factor (Quality Coefficient):** ${qFactor ? qFactor.toFixed(2) : 'Not calculated'} (Resonant amplification factor)
- **Damping Ratio (ζ):** ${dampingRatio ? dampingRatio.toFixed(4) : 'N/A'} (Rate of decaying transients)
- **Half-Power Bandwidth:** ${bandwidth ? bandwidth.toFixed(3) + ' Hz' : 'N/A'} (-3dB sweep energy drop-off)
- **RMS Acceleration (Arms):** ${rmsValue ? (rmsValue * 9806.65).toFixed(4) + ' mm/s²' : 'N/A'} (Continuous energy equivalence)

### Structural Dynamics Interpretation
Vibration amplitude and mechanical damping determine structural fatigue rates. The measured Q-Factor of **${qFactor ? qFactor.toFixed(2) : 'N/A'}** and damping ratio of **${dampingRatio ? dampingRatio.toFixed(4) : 'N/A'}** highlight the system's susceptibility to cyclic loading. If excitation forces align with the natural frequency of **${freq ? freq.toFixed(2) + ' Hz' : 'N/A'}**, amplitude amplification will occur, potentially causing mounting bracket cracking or fastener degradation.

---

## Possible Causes

${causes}

---

## Recommendations

${recommendations}

---

**Notice:** This report was generated using standard rule-based mechanical analysis without active AI assistance. For dynamic qualitative writing, enable the AI Analysis option in the app setup dashboard.

---

## Conclusion

Based on the collected data, this session recorded **${readings || 0} data points** with a dominant frequency of **${freq ? freq.toFixed(2) + ' Hz' : 'undetermined'}**. ${amp && amp > 0.5 ? 'The elevated amplitude levels warrant further investigation.' : 'Vibration levels appear to be within acceptable ranges for the measured frequency.'}

*Report generated: ${new Date().toLocaleString()}*
`;
}

export function generateFallbackChatResponse(session, userMessage) {
  const freq = session.naturalFrequency;
  const amp = session.peakAmplitude;

  return `**AI assistant is currently offline.**

Based on your session data, here is what I can tell you:

- **Session:** ${session.name}
- **Natural Frequency:** ${freq ? freq.toFixed(2) + ' Hz' : 'Not yet determined'}
- **Peak Amplitude:** ${amp ? (amp * 9806.65).toFixed(3) + ' mm/s²' : 'Not measured'}
- **Status:** ${session.isActive ? 'Active' : 'Completed'}

Your question: *"${userMessage}"*

For a full AI-powered analysis, please check your internet connection and try again. The DeepSeek API is currently unreachable.`;
}
