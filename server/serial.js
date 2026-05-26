/**
 * server/serial.js
 * Automatically scans, connects, and reads telemetry from ESP8266 over USB.
 */

import { SerialPort } from 'serialport';
import { ReadlineParser } from '@serialport/parser-readline';
import { processESPMessage, handleESPDisconnect } from '../websocket/espHandler.js';

let activePort = null;
let activeParser = null;
let reconnectTimer = null;
let isShuttingDown = false;

// Scan interval (e.g. 5 seconds) to look for USB serial devices
const SCAN_INTERVAL_MS = 5000;
const BAUD_RATE = 115200;

export function startSerialListener() {
  console.log('[Serial] Initializing serial port scanner...');
  scanAndConnect();
}

export function stopSerialListener() {
  isShuttingDown = true;
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
  closeActivePort();
}

function closeActivePort() {
  if (activePort) {
    try {
      console.log('[Serial] Closing active serial port...');
      activePort.close();
    } catch (err) {
      console.error('[Serial] Error closing port:', err.message);
    }
    activePort = null;
    activeParser = null;
  }
}

async function scanAndConnect() {
  if (isShuttingDown) return;
  if (activePort && activePort.isOpen) {
    // Already connected, schedule next scan just in case we need to verify connection
    reconnectTimer = setTimeout(scanAndConnect, SCAN_INTERVAL_MS);
    return;
  }

  try {
    const ports = await SerialPort.list();
    // Filter for typical ESP8266 board USB-to-UART converters
    // Linux ports usually look like /dev/ttyUSB* or /dev/ttyACM*
    const targetPort = ports.find(p => {
      const isUsb = p.path.startsWith('/dev/ttyUSB') || p.path.startsWith('/dev/ttyACM');
      const hasEspFriendlyName = p.manufacturer?.toLowerCase().includes('wch') || // CH340
                                 p.manufacturer?.toLowerCase().includes('silicon labs') || // CP2102
                                 p.manufacturer?.toLowerCase().includes('ftdi') ||
                                 p.friendlyName?.toLowerCase().includes('usb') ||
                                 p.manufacturer?.toLowerCase().includes('espressif');
      return isUsb || hasEspFriendlyName;
    });

    if (targetPort) {
      console.log(`[Serial] Found potential ESP8266 device at: ${targetPort.path} (${targetPort.manufacturer || 'Unknown Manufacturer'})`);
      connectToPort(targetPort.path);
    } else {
      // No ports found, schedule scan again
      reconnectTimer = setTimeout(scanAndConnect, SCAN_INTERVAL_MS);
    }
  } catch (err) {
    console.error('[Serial] Scan error:', err.message);
    reconnectTimer = setTimeout(scanAndConnect, SCAN_INTERVAL_MS);
  }
}

function connectToPort(path) {
  closeActivePort();
  let connectedDeviceId = null;

  console.log(`[Serial] Connecting to ${path} at ${BAUD_RATE} baud...`);
  
  activePort = new SerialPort({
    path: path,
    baudRate: BAUD_RATE,
    autoOpen: false
  });

  activeParser = activePort.pipe(new ReadlineParser({ delimiter: '\r\n' }));

  activeParser.on('data', async (line) => {
    const trimmed = line.trim();
    if (!trimmed) return;

    // Check if the line is JSON telemetry data
    if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
      try {
        const data = JSON.parse(trimmed);
        if (data.deviceId) {
          connectedDeviceId = data.deviceId;
        }
        await processESPMessage(data);
      } catch (err) {
        console.warn(`[Serial] Received line looked like JSON but failed to parse: "${trimmed}"`);
      }
    } else {
      // It's a standard serial debug log from the ESP8266. Print it nicely.
      console.log(`[ESP Serial Log] ${trimmed}`);
    }
  });

  activePort.open((err) => {
    if (err) {
      console.error(`[Serial] Failed to open port ${path}:`, err.message);
      if (err.message.includes('busy') || err.message.includes('resource busy')) {
        console.warn('[Serial] TIP: Please ensure that no other program (such as Arduino IDE Serial Monitor) is using the port.');
      }
      activePort = null;
      activeParser = null;
      reconnectTimer = setTimeout(scanAndConnect, SCAN_INTERVAL_MS);
      return;
    }
    console.log(`[Serial] Connection successfully established on ${path}`);
  });

  activePort.on('close', () => {
    console.log(`[Serial] Port ${path} was closed.`);
    if (connectedDeviceId) {
      handleESPDisconnect(connectedDeviceId);
      connectedDeviceId = null;
    }
    activePort = null;
    activeParser = null;
    if (!isShuttingDown) {
      console.log('[Serial] Device disconnected. Scanning for reconnect...');
      reconnectTimer = setTimeout(scanAndConnect, 1000);
    }
  });

  activePort.on('error', (err) => {
    console.error('[Serial] Port error:', err.message);
    // Note: close event will be triggered automatically
  });
}
