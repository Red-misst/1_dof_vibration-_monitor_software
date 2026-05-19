/**
 * scripts/esp-simulator.js
 * 
 * Simulates an ESP8266 device connecting to the WebSocket server
 * and sending mock vibration data.
 */

import WebSocket from 'ws';

const WS_URL = 'ws://localhost:3000';
const DEVICE_ID = 'SIM-ESP8266-01';

let ws;
let isConnected = false;
let sendInterval;
let time = 0;

function connect() {
  console.log(`[Simulator] Connecting to ${WS_URL}...`);
  ws = new WebSocket(WS_URL);

  ws.on('open', () => {
    isConnected = true;
    console.log(`[Simulator] Connected. Registering device: ${DEVICE_ID}`);
    
    // Register as an ESP device
    ws.send(JSON.stringify({
      type: 'device_connected',
      deviceId: DEVICE_ID
    }));

    startSendingData();
  });

  ws.on('message', (data) => {
    console.log(`[Simulator] Received: ${data}`);
  });

  ws.on('close', () => {
    isConnected = false;
    console.log('[Simulator] Disconnected. Reconnecting in 3s...');
    clearInterval(sendInterval);
    setTimeout(connect, 3000);
  });

  ws.on('error', (err) => {
    console.error(`[Simulator] WebSocket Error: ${err.message}`);
  });
}

function startSendingData() {
  console.log('[Simulator] Starting to send mock raw_batch and heartbeat data...');
  
  const baseFreq = 85.0; // Simulated high frequency (85Hz) natural frequency
  const SAMPLES = 128;
  const SAMPLING_FREQUENCY = 500;

  // Send a batch every 2 seconds to simulate a vibration event
  sendInterval = setInterval(() => {
    if (!isConnected) return;
    
    const dataArray = [];
    const A = 1.8; // Amplitude in Gs
    const zeta = 0.025; // Damping ratio (metal/plastic ruler)
    const fn = baseFreq; // Natural frequency (85.0Hz)
    const omegaN = 2 * Math.PI * fn;
    const omegaD = omegaN * Math.sqrt(1 - zeta * zeta);

    for (let i = 0; i < SAMPLES; i++) {
        const time = i / SAMPLING_FREQUENCY;
        // Damped oscillator response starting with high velocity at equilibrium (t=0, signal=0)
        // Oscillates bidirectionally (positive and negative Z) relative to baseline and decays smoothly
        const signal = -A * Math.exp(-zeta * omegaN * time) * Math.sin(omegaD * time);
        const noise = (Math.random() - 0.5) * 0.05;
        dataArray.push(signal + noise);
    }
    
    const data = {
      type: 'raw_batch',
      deviceId: DEVICE_ID,
      timestamp: Date.now(),
      sampleRate: SAMPLING_FREQUENCY,
      samples: SAMPLES,
      data: dataArray
    };

    ws.send(JSON.stringify(data));
    console.log(`[Simulator] Sent raw_batch: 128 samples, simulated freq ~85Hz`);
    
  }, 2000);

  // Send heartbeat every 100ms
  setInterval(() => {
    if (!isConnected) return;
    const noise = (Math.random() - 0.5) * 0.02;
    const heartbeatData = {
        type: 'heartbeat',
        deviceId: DEVICE_ID,
        timestamp: Date.now(),
        raw_acceleration: noise,
        deltaZ: Math.abs(noise)
    };
    ws.send(JSON.stringify(heartbeatData));
  }, 100);
}

console.log('--- ESP8266 WebSocket Simulator ---');
connect();
