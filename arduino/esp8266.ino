#include <Wire.h>
#include <MPU9250_asukiaaa.h>
#include <ESP8266WiFi.h>
#include <WebSocketsClient.h>
#include <ArduinoJson.h>

// ==== Configuration ====
// WiFi Configuration
const char* ssid = "Galaxy";
const char* password = "Barake2023";

// WebSocket Server Configuration (Offline Mode)
// Primary: vibration-monitor.local (mDNS)
// Fallback: 192.168.137.1 (Windows Mobile Hotspot default IP)
const char* host = "vibration-monitor.local";
const int port = 3000;
const char* url = "/esp8266";  // WebSocket path
// DSP Config
#define SAMPLES 128
#define SAMPLING_FREQUENCY 500  // 500Hz sampling
#define SAMPLING_INTERVAL_US 2000 // 1,000,000 / 500
#define INITIAL_THRESHOLD 0.01
#define BUFFER_SIZE 64  // Circular buffer size

// New globals for optimization
double circularBuffer[BUFFER_SIZE];
int bufferIndex = 0;
double movingAverage = 0;
double dynamicThreshold = INITIAL_THRESHOLD;
const double ALPHA = 0.15;  // EMA factor

MPU9250_asukiaaa mySensor;
WebSocketsClient webSocket;

String deviceId = "ESP8266_" + String(ESP.getChipId(), HEX);
bool initialized = false;
double baselineGravity = 0;
double prevZ = 0;

double batchBuffer[SAMPLES];

void webSocketEvent(WStype_t type, uint8_t * payload, size_t length) {
  switch (type) {
    case WStype_DISCONNECTED:
      Serial.println("❌ WebSocket Disconnected");
      digitalWrite(LED_BUILTIN, HIGH);
      break;
    case WStype_CONNECTED:
      Serial.printf("✅ WebSocket Connected: %s\n", payload);
      digitalWrite(LED_BUILTIN, LOW);
      {
        String msg = "{\"type\":\"device_connected\",\"deviceId\":\"" + deviceId + "\"}";
        webSocket.sendTXT(msg);
        delay(500);
        webSocket.sendTXT(msg);
      }
      break;
    case WStype_TEXT:
      Serial.printf("📩 Received: %s\n", payload);
      break;
    default:
      break;
  }
}

void calibrateSensor() {
  Serial.println("Calibrating Z-axis baseline...");
  double sum = 0;
  for (int i = 0; i < 1000; i++) {
    mySensor.accelUpdate();
    sum += mySensor.accelZ();
    delay(2);
  }
  baselineGravity = sum / 1000.0;
  movingAverage = baselineGravity;
  for (int i = 0; i < BUFFER_SIZE; i++) circularBuffer[i] = baselineGravity;
  Serial.printf("Calibration complete. 1G baseline: %.4f\n", baselineGravity);
}

void setup() {
  Serial.begin(115200);
  Wire.begin(4, 5); // SDA, SCL
  pinMode(LED_BUILTIN, OUTPUT);
  digitalWrite(LED_BUILTIN, HIGH);

  mySensor.setWire(&Wire);
  mySensor.beginAccel();

  Serial.println("Connecting to WiFi...");
  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
    digitalWrite(LED_BUILTIN, !digitalRead(LED_BUILTIN));
  }
  digitalWrite(LED_BUILTIN, LOW);
  Serial.println("\n✅ WiFi Connected");

  calibrateSensor();
  initialized = true;

  webSocket.begin(host, port, url);  // Plain ws://
  webSocket.onEvent(webSocketEvent);
  webSocket.setReconnectInterval(5000);

  Serial.println("🔧 Ready: Sampling at 500Hz");
}

void loop() {
    webSocket.loop();

    mySensor.accelUpdate();
    double z = mySensor.accelZ();

    if (!initialized) return;

    double normalizedZ = z - baselineGravity;

    // Update moving average with responsive alpha
    movingAverage = (ALPHA * z) + ((1.0 - ALPHA) * movingAverage);
    
    // Store in circular buffer
    circularBuffer[bufferIndex] = z;
    bufferIndex = (bufferIndex + 1) % BUFFER_SIZE;

    // Calculate dynamic threshold
    double variance = 0;
    for (int i = 0; i < BUFFER_SIZE; i++) {
        variance += sq(circularBuffer[i] - movingAverage);
    }
    variance /= BUFFER_SIZE;
    dynamicThreshold = max(INITIAL_THRESHOLD, sqrt(variance) * 1.5); 

    double deltaZ = abs(z - movingAverage);

    // Send data more frequently when motion is detected
    if (deltaZ > dynamicThreshold) {
        Serial.println("⚠ Motion Detected - Collecting batch");

        // Faster strict sampling for Server-Side FFT
        for (int i = 0; i < SAMPLES; i++) {
            unsigned long startMicros = micros();
            mySensor.accelUpdate();
            batchBuffer[i] = mySensor.accelZ() - baselineGravity;
            
            // Wait strictly for the exact interval (2000us = 500Hz)
            while (micros() - startMicros < SAMPLING_INTERVAL_US) {
                yield();
            }
        }

        // Send batched data
        StaticJsonDocument<2048> doc;
        doc["type"] = "raw_batch";
        doc["deviceId"] = deviceId;
        doc["timestamp"] = millis();
        doc["sampleRate"] = SAMPLING_FREQUENCY;
        doc["samples"] = SAMPLES;
        
        JsonArray dataArray = doc.createNestedArray("data");
        for (int i = 0; i < SAMPLES; i++) {
            dataArray.add(batchBuffer[i]);
        }

        String jsonPayload;
        serializeJson(doc, jsonPayload);
        webSocket.sendTXT(jsonPayload);

        delay(100);  // Debounce after heavy sampling
    } else {
        // Send heartbeat data periodically even without motion
        StaticJsonDocument<200> doc;
        doc["type"] = "heartbeat";
        doc["deviceId"] = deviceId;
        doc["raw_acceleration"] = normalizedZ;
        doc["deltaZ"] = deltaZ;
        doc["timestamp"] = millis();

        String jsonPayload;
        serializeJson(doc, jsonPayload);
        webSocket.sendTXT(jsonPayload);
        
        delay(50); // More frequent baseline updates
    }

    prevZ = z;

}
