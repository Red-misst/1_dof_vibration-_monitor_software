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
  console.log('[Simulator] Starting to send mock fft_result data...');
  
  const baseFreq = 15.0; // Simulated 15Hz natural frequency

  sendInterval = setInterval(() => {
    if (!isConnected) return;
    
    time += 0.5;

    // Simulate noise and variation
    const noise = (Math.random() - 0.5) * 0.1;
    const currentZ = 1.0 + (Math.sin(time * baseFreq * 2 * Math.PI) * 0.3) + noise;
    
    const data = {
      type: 'fft_result',
      deviceId: DEVICE_ID,
      timestamp: Date.now(),
      deltaZ: currentZ - 1.0, 
      frequency: baseFreq + (Math.random() * 0.2 - 0.1),
      amplitude: 0.3 + (Math.random() * 0.05),
      raw_acceleration: currentZ
    };

    ws.send(JSON.stringify(data));
    console.log(`[Simulator] Sent mock data: z=${data.raw_acceleration.toFixed(3)}, f=${data.frequency.toFixed(2)}Hz`);
    
  }, 1000); // Send every 1 second
}

console.log('--- ESP8266 WebSocket Simulator ---');
connect();
