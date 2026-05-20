# Z-Axis Vibration Monitor — Setup Guide

## Quick Start (3 steps)

### Step 1 — First time only: Run the Setup Script
- **Windows**: Double-click **`SETUP.bat`** and wait for it to complete.
- **Lubuntu / Linux**: Open a terminal in the folder, make the script executable (`chmod +x setup.sh`), and run it:
  ```bash
  ./setup.sh
  ```
> This installs all system and software dependencies and opens firewall ports. Internet is required once for this step.

### Step 2 — Every day: Run the Start Script
- **Windows**: Double-click **`START.bat`**.
- **Lubuntu / Linux**: Run the start script:
  ```bash
  ./start.sh
  ```
> The browser will open automatically at `http://localhost:3000`. A terminal window stays open in the background — this is the server. **Don't close it** while using the app.

### Step 3 — Connect your ESP8266
Connect the ESP8266 to the **same WiFi hotspot as your PC**.
> The device will find the server automatically using the name `vibration-monitor.local`. No IP address configuration needed.

---

## Setting Up the WiFi Hotspot

### Windows
1. Go to **Settings → Network & internet → Mobile hotspot** → Turn it on.
2. Note the **Network name** and **Network password** shown.

### Lubuntu / Linux (LXQt)
1. Click the network icon in the panel (bottom right) and select **Edit Connections...** (or run `nm-connection-editor`).
2. Click the **+** (plus) icon to add a new connection.
3. Choose **Wi-Fi** as the connection type and click **Create...**.
4. In the **Wi-Fi** tab:
   - Set **SSID** to a name of your choice (e.g. `vibration-hotspot`).
   - Change **Mode** to **Hotspot**.
5. In the **Wi-Fi Security** tab:
   - Set **Security** to **WPA & WPA2 Personal**.
   - Enter a **Password** (e.g. `MoiVibrations2026`).
6. In the **IPv4 Settings** tab:
   - Verify that **Method** is set to **Shared to other computers** (this is NetworkManager's default hotspot mode, which automatically assigns `10.42.0.1` as the gateway/PC IP).
7. Save and enable the connection.
8. Connect your ESP8266 to this WiFi network. Both devices are now on the same subnet and can communicate.

---

## ESP8266 Arduino Sketch

Flash the sketch in the `arduino/` folder. Key settings to confirm:

```cpp
const char* ssid = "YOUR_HOTSPOT_NAME";     // Your PC's hotspot name
const char* password = "YOUR_HOTSPOT_PASS"; // Your PC's hotspot password

// Server discovery — no IP needed!
// Primary: mDNS (automatic)
const char* serverHostname = "vibration-monitor.local";

// Fallbacks if mDNS fails:
// - Windows Mobile Hotspot default gateway IP: 192.168.137.1
// - Lubuntu/Linux Hotspot default gateway IP:  10.42.0.1
// Set the fallback according to your host operating system
IPAddress fallbackIP(10, 42, 0, 1); // e.g. for Lubuntu hotspot
```

> **This sketch only needs to be flashed once.** The server is found automatically by hostname using mDNS — even if your PC's IP changes. If mDNS resolution fails, the ESP8266 will attempt to connect to the fallback IP address.

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
| ESP8266 not connecting | Check both are on the same hotspot. Check that the firewall (UFW on Linux or Windows Firewall) is allowing port 3000 (TCP) and 5353 (UDP). |
| "Dependencies not installed" | Run `SETUP.bat` (Windows) or `setup.sh` (Linux) again. |
| AI not working | Check .env file has DEEPSEEK_API_KEY. |
| Port 3000 in use | Close other apps using port 3000. |
| mDNS not resolving on Linux | Ensure Avahi Daemon is running: `sudo systemctl status avahi-daemon` |
