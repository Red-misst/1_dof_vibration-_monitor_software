@echo off
title Z-Axis Vibration Monitor — Setup
color 0A
echo.
echo  ============================================
echo   Z-Axis Vibration Monitor v2.0
echo   First-Time Setup
echo   Moi University Mechanical Engineering Department
echo  ============================================
echo.
echo  Checking for Node.js...
node --version >nul 2>&1
if errorlevel 1 (
    echo  [ERROR] Node.js is not installed!
    echo.
    echo  Please download and install Node.js from:
    echo  https://nodejs.org/  (LTS version recommended)
    echo.
    echo  After installing Node.js, run this file again.
    pause
    exit /b 1
)
echo  [OK] Node.js found.
echo.
echo  Installing dependencies (this may take a minute)...
npm install
if errorlevel 1 (
    echo.
    echo  [ERROR] npm install failed. Check your internet connection.
    pause
    exit /b 1
)
echo.
echo  [OK] Setup complete!
echo.
echo  Adding Windows Firewall rules for the monitor...
netsh advfirewall firewall show rule name="Vibration Monitor WS" >nul 2>&1
if errorlevel 1 (
    netsh advfirewall firewall add rule name="Vibration Monitor WS" dir=in action=allow protocol=TCP localport=3000 >nul 2>&1
    netsh advfirewall firewall add rule name="Vibration Monitor mDNS" dir=in action=allow protocol=UDP localport=5353 >nul 2>&1
    echo  [OK] Firewall rules added.
) else (
    echo  [OK] Firewall rules already exist.
)
echo.
echo  ============================================
echo   Setup Complete! Run START.bat to launch.
echo   Moi University Mechanical Engineering Department
echo  ============================================
echo.
pause
