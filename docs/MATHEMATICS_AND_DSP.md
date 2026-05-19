# Mathematics and Digital Signal Processing (DSP)

This document outlines the rigorous mathematical foundation and DSP pipeline underlying the Z-Axis Vibration Monitor. It serves as an academic reference for the engineering calculations performed by the system to translate raw physical movement into structural health metrics.

## 1. Data Acquisition and Time-Domain Filtering

### 1.1 The Physical Sensor
The system utilizes the MPU9250 accelerometer. The raw output is a measurement of proper acceleration in the Z-axis (vertical direction) relative to free-fall, expressed in $g$ ($1g \approx 9.81 m/s^2$). 

At rest, the sensor reports approximately $1g$ due to Earth's gravity. To isolate *vibration* (dynamic acceleration) from *gravity* (static acceleration), a baseline calibration is performed on startup by averaging 1000 samples at rest:
$$ \text{Baseline} = \frac{1}{N} \sum_{i=1}^{N} Z_i $$

### 1.2 Exponential Moving Average (EMA)
To account for slow sensor drift or tilt during operation, an Exponential Moving Average is maintained. This acts as a low-pass filter to establish a dynamic baseline:
$$ MA_t = \alpha \cdot Z_t + (1 - \alpha) \cdot MA_{t-1} $$
Where $\alpha = 0.15$ controls the smoothing factor (responsiveness).

### 1.3 Jerk Detection and Dynamic Thresholding
To avoid continuously computing heavy FFTs on idle noise, the system uses variance to create a dynamic trigger threshold. 
A circular buffer of the last $N=64$ samples is maintained. The variance ($\sigma^2$) is calculated as:
$$ \sigma^2 = \frac{1}{N} \sum_{i=1}^{N} (Z_i - MA_t)^2 $$
The event trigger threshold is defined as $1.5 \times \sigma$ (Standard Deviation). When the instantaneous "Jerk" ($\Delta Z = |Z_t - MA_t|$) exceeds this threshold, a vibration event is registered, triggering a high-speed data batch capture.

## 2. Frequency Domain Analysis

When a vibration event is triggered, the ESP8266 switches to strict `micros()` timing to capture $N=128$ samples at exactly $f_s = 500\text{Hz}$ (an interval of exactly $2000\mu s$).

### 2.1 The Hamming Window
Before converting the time-domain batch to the frequency domain, a Hamming Window is applied to the data array on the Node.js server. Because the captured batch is a finite snapshot, the sudden cutoff at the beginning and end of the data causes "spectral leakage." The Hamming Window smoothly tapers the edges of the dataset to zero:
$$ W(n) = 0.54 - 0.46 \cos\left( \frac{2\pi n}{N-1} \right) $$
$$ Z_{windowed}[n] = Z[n] \times W(n) $$

### 2.2 The Fast Fourier Transform (FFT)
The system employs the **Cooley-Tukey Radix-2 Decimation-in-Time FFT** algorithm on the Node.js server. 
The Discrete Fourier Transform (DFT) formula is:
$$ X_k = \sum_{n=0}^{N-1} x_n \cdot e^{-\frac{i 2\pi k n}{N}} $$
By using a power of 2 ($N=128$), the algorithm dramatically reduces computational complexity from $O(N^2)$ to $O(N \log N)$.

#### 2.2.1 Magnitude Scaling for True Amplitude
The raw mathematical output of an FFT ($X_k$) scales linearly with the number of samples $N$. To convert these arbitrary complex magnitudes back into **true physical G-force amplitude**, the system applies exact scaling:
$$ \text{Magnitude}_k = \sqrt{\text{Re}(X_k)^2 + \text{Im}(X_k)^2} $$
$$ \text{Amplitude}_k = \frac{2}{N} \cdot \text{Magnitude}_k $$
*Note: For the DC component ($k=0$) and the Nyquist frequency ($k=N/2$), the amplitude is halved again, as they do not have negative frequency conjugates.*

### 2.3 Nyquist Theorem and Frequency Resolution
According to the Nyquist-Shannon Sampling Theorem, a sampling rate of $f_s = 500\text{Hz}$ allows the system to accurately detect mechanical vibrations up to the Nyquist frequency of $250\text{Hz}$.
The frequency bin resolution ($\Delta f$) is highly precise:
$$ \Delta f = \frac{f_s}{N} = \frac{500}{128} \approx 3.9\text{Hz} $$
*(Note: A larger buffer size $N$ can be sent by the ESP to further increase this resolution to sub-1Hz levels if required).*

## 3. Structural Resonance and Damping

### 3.1 Peak (Natural) Frequency
The Natural Frequency ($f_n$) of the structure is identified by iterating through the complex FFT output magnitudes and finding the maximum amplitude bin.

### 3.2 The Half-Power Bandwidth (Q-Factor) Method
The **Quality Factor (Q-Factor)** is a dimensionless parameter that describes how underdamped an oscillator or resonator is. A higher Q indicates a lower rate of energy loss relative to the stored energy (it rings longer).

To calculate this, the system uses the Half-Power Bandwidth method:
1. Identify the peak amplitude ($A_{max}$) at the natural frequency ($f_n$).
2. Calculate the half-power threshold ($-3\text{dB}$ point): 
   $$ A_{half} = \frac{A_{max}}{\sqrt{2}} \approx 0.707 \cdot A_{max} $$
3. Scan the frequency spectrum to the left and right of $f_n$ to find the lower cutoff frequency ($f_1$) and upper cutoff frequency ($f_2$) where the amplitude drops below $A_{half}$. Linear interpolation is used between bins for exact frequency calculation.
4. Calculate Bandwidth: $\Delta f = f_2 - f_1$
5. Calculate Q-Factor:
   $$ Q = \frac{f_n}{f_2 - f_1} $$

### 3.3 Damping Ratio
The damping ratio ($\zeta$) is mathematically related to the Q-Factor and describes how rapidly the oscillations decay. For lightly damped structures (where $\zeta < 0.1$), it is accurately approximated as:
$$ \zeta \approx \frac{1}{2Q} $$
This metric is critical in mechanical engineering for understanding the structural integrity and safety margins of bridges, machine mounts, and architectural elements.

---
**References:**
- Oppenheim, A. V., & Schafer, R. W. (2010). *Discrete-Time Signal Processing*. Pearson.
- Harris, F. J. (1978). "On the use of windows for harmonic analysis with the discrete Fourier transform." *Proceedings of the IEEE*, 66(1), 51-83.
- Inman, D. J. (2014). *Engineering Vibration*. Pearson.
