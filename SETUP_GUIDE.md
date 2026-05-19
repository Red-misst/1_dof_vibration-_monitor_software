# Z-Axis Vibration Monitor — Setup Guide

## Quick Start (3 steps)

### Step 1 — First time only: Run SETUP.bat
Double-click **`SETUP.bat`** and wait for it to complete.
> This installs all software dependencies and opens firewall ports. Internet is required once for this step.

### Step 2 — Every day: Run START.bat
Double-click **`START.bat`**.
> The browser will open automatically at `http://localhost:3000`. A small black window stays open in the taskbar — this is the server. **Don't close it** while using the app.

### Step 3 — Connect your ESP8266
Connect the ESP8266 to the **same WiFi hotspot as your PC**.
> The device will find the server automatically using the name `vibration-monitor.local`. No IP address configuration needed.

---

## Setting Up the WiFi Hotspot

1. On your PC: Go to **Settings → Mobile Hotspot** → Turn it on
2. Note the **Network name** and **Password** shown
3. On the ESP8266: Connect to that same WiFi network
4. Both devices are now on the same network and can communicate

---

## ESP8266 Arduino Sketch

Flash the sketch in the `arduino/` folder. Key settings to confirm:

```cpp
const char* ssid = "YOUR_HOTSPOT_NAME";     // Your PC's hotspot name
const char* password = "YOUR_HOTSPOT_PASS"; // Your PC's hotspot password

// Server discovery — no IP needed!
// Primary: mDNS (automatic)
const char* serverHostname = "vibration-monitor.local";

// Fallback: Windows hotspot always uses this IP
IPAddress fallbackIP(192, 168, 137, 1);
```

> **This sketch only needs to be flashed once.** The server is found automatically by hostname — even if your PC's IP changes.

---

## AI Features (DeepSeek)

AI chat and report generation require an internet connection and a DeepSeek API key.

1. Get a free API key at https://platform.deepseek.com
2. Create a file called `.env` in the vibrations folder
3. Add this line: `DEEPSEEK_API_KEY=your_key_here`

**If no internet / no API key:** The app still works fully. Reports will be generated automatically from your data using built-in analysis rules. You will see an "AI Offline" indicator in the System Status panel.

---

## System Status Panel

The small 📊 **System Status** panel in the bottom-left corner shows:

| Indicator | Meaning |
|---|---|
| 🟢 Server | App server is running |
| 🟢 Database | Local data storage is healthy |
| 🟢 ESP8266 | Sensor device is connected |
| 🟢 AI | DeepSeek API is reachable |
| PC IP | Your PC's local IP address (for reference) |
| ESP hostname | `vibration-monitor.local` (what ESP connects to) |

---

## Data Storage

All your test sessions and reports are stored **locally** in:
```
vibrations/data/vibrations.db   ← All sessions and chat history
vibrations/data/reports/        ← PDF report files
```

Your data is never sent to the cloud (only AI queries go to DeepSeek if enabled).

---

## Stopping the App

Simply **close the black terminal window** (or press `Ctrl+C` in it). The browser tab can be closed at any time.

---

## Troubleshooting

| Problem | Solution |
|---|---|
| Browser doesn't open | Open manually: `http://localhost:3000` |
| ESP8266 not connecting | Check both are on the same hotspot |
| "Dependencies not installed" | Run SETUP.bat again |
| AI not working | Check .env file has DEEPSEEK_API_KEY |
| Port 3000 in use | Close other apps using port 3000 |
