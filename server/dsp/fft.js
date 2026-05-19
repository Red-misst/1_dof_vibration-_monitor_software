/**
 * server/dsp/fft.js
 * Highly optimized, zero-dependency Radix-2 Cooley-Tukey FFT implementation.
 * Designed for academic mechanical engineering offline operations.
 */

export function performFFT(real, imag) {
    const n = real.length;
    if (n === 0 || (n & (n - 1)) !== 0) {
        throw new Error("FFT array length must be a power of 2");
    }

    // Bit-reversal permutation
    let j = 0;
    for (let i = 0; i < n - 1; i++) {
        if (i < j) {
            let tempReal = real[i];
            let tempImag = imag[i];
            real[i] = real[j];
            imag[i] = imag[j];
            real[j] = tempReal;
            imag[j] = tempImag;
        }
        let k = n >> 1;
        while (k <= j) {
            j -= k;
            k >>= 1;
        }
        j += k;
    }

    // Cooley-Tukey decimation-in-time radix-2 FFT
    for (let size = 2; size <= n; size *= 2) {
        const halfSize = size / 2;
        const theta = -2 * Math.PI / size;
        const wReal = Math.cos(theta);
        const wImag = Math.sin(theta);

        for (let i = 0; i < n; i += size) {
            let uReal = 1;
            let uImag = 0;
            for (let j = 0; j < halfSize; j++) {
                const k = i + j;
                const m = k + halfSize;
                
                const tReal = uReal * real[m] - uImag * imag[m];
                const tImag = uReal * imag[m] + uImag * real[m];
                
                real[m] = real[k] - tReal;
                imag[m] = imag[k] - tImag;
                real[k] += tReal;
                imag[k] += tImag;
                
                const nextUReal = uReal * wReal - uImag * wImag;
                uImag = uReal * wImag + uImag * wReal;
                uReal = nextUReal;
            }
        }
    }
}
