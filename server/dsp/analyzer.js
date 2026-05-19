/**
 * server/dsp/analyzer.js
 * Aggregates raw sensor data, applies Hamming window, and runs FFT.
 * Calculates Natural Frequency, Q-Factor, and Damping Ratio.
 */

import { performFFT } from './fft.js';

export function applyHammingWindow(data) {
    const n = data.length;
    const windowed = new Float64Array(n);
    for (let i = 0; i < n; i++) {
        // Hamming window formula
        const multiplier = 0.54 - 0.46 * Math.cos((2 * Math.PI * i) / (n - 1));
        windowed[i] = data[i] * multiplier;
    }
    return windowed;
}

export function analyzeBatch(dataArray, sampleRate) {
    const n = dataArray.length;
    
    // Ensure array is a power of 2
    if ((n & (n - 1)) !== 0) {
        throw new Error("Analyzer requires a power of 2 batch size");
    }

    const windowed = applyHammingWindow(dataArray);
    
    const real = new Float64Array(windowed);
    const imag = new Float64Array(n); // initialized to 0

    performFFT(real, imag);

    // Calculate magnitudes up to Nyquist frequency
    const halfN = n / 2;
    const magnitudes = new Float64Array(halfN + 1);
    const frequencies = new Float64Array(halfN + 1);

    let peakAmp = 0;
    let peakIndex = 0;

    for (let i = 0; i <= halfN; i++) {
        const mag = Math.sqrt(real[i] * real[i] + imag[i] * imag[i]);
        let amplitude = (2.0 / n) * mag;
        
        // DC and Nyquist components are halved
        if (i === 0 || i === halfN) {
            amplitude = amplitude / 2.0;
        }

        magnitudes[i] = amplitude;
        frequencies[i] = (i * sampleRate) / n;

        // Ignore DC offset (i=0) when finding peak resonance
        if (i > 0 && amplitude > peakAmp) {
            peakAmp = amplitude;
            peakIndex = i;
        }
    }

    const peakFreq = frequencies[peakIndex];

    // Half-Power Bandwidth (Q-Factor) calculation
    let qFactor = 0;
    let dampingRatio = 0;
    let bandwidth = 0;

    if (peakAmp > 0) {
        const halfPowerAmp = peakAmp / Math.SQRT2; // -3dB
        
        let f1Index = peakIndex;
        let f2Index = peakIndex;

        // Scan left for lower cutoff
        while (f1Index > 1 && magnitudes[f1Index] > halfPowerAmp) {
            f1Index--;
        }
        
        // Scan right for upper cutoff
        while (f2Index < halfN - 1 && magnitudes[f2Index] > halfPowerAmp) {
            f2Index++;
        }

        // Linear interpolation for exact frequencies
        const interpolateFrequency = (idx, targetAmp, dir) => {
            if (idx <= 1 || idx >= halfN - 1) return frequencies[idx];
            const nextIdx = idx + dir;
            const diffAmp = Math.abs(magnitudes[nextIdx] - magnitudes[idx]);
            if (diffAmp < 1e-6) return frequencies[idx];
            
            const ratio = Math.abs(targetAmp - magnitudes[idx]) / diffAmp;
            return frequencies[idx] + ratio * (frequencies[nextIdx] - frequencies[idx]);
        };

        const f1 = interpolateFrequency(f1Index, halfPowerAmp, 1);
        const f2 = interpolateFrequency(f2Index, halfPowerAmp, -1);

        bandwidth = f2 - f1;
        if (bandwidth > 0 && f1 > 0 && f2 > f1) {
            qFactor = peakFreq / bandwidth;
            dampingRatio = 1 / (2 * qFactor);
        }
    }

    return {
        peakFrequency: peakFreq,
        peakAmplitude: peakAmp,
        qFactor,
        dampingRatio,
        bandwidth,
        resolution: sampleRate / n,
        frequencies: Array.from(frequencies),
        magnitudes: Array.from(magnitudes)
    };
}
