@echo off
title Precision Structural Resonance and Vibration Analyzer
color 0B
cls
echo.
echo  ====================================================================
echo       __  __       _   _    _       _          
echo      ^|  \/  ^|     (_) ^| ^|  ^| ^|     (_)         
echo      ^| \  / ^| ___  _  ^| ^|  ^| ^|_ __  ___   __  
echo      ^| ^|\/^| ^|/ _ \^| ^| ^| ^|  ^| ^| '_ \^| \ \ / /  
echo      ^| ^|  ^| ^| (_) ^| ^| ^| ^|__^| ^| ^| ^| ^| ^|\ V /   
echo      ^|_^|  ^|_^|\___/^|_^|  \____/^|_^| ^|_^|_^| \_/    
echo.
echo   Precision Structural Resonance ^& Vibration Analyzer v2.0 
echo   Moi University - Department of Mechanical ^& Production Engineering
echo  ====================================================================
echo.

:: Check Node.js is available
node --version >nul 2>&1
if errorlevel 1 (
    echo  [ERROR] Node.js not found. Run SETUP.bat first.
    pause
    exit /b 1
)

:: Check dependencies are installed
if not exist "node_modules" (
    echo  [ERROR] Dependencies not installed. Run SETUP.bat first.
    pause
    exit /b 1
)

echo  Starting server...
echo  Opening browser in 3 seconds...
echo.

:: Open browser after 3s delay
start "" /b cmd /c "timeout /t 3 /nobreak >nul && start http://localhost:3000"

:: Start server (keeps this window open — close it to stop the monitor)
node server/index.js

echo.
echo  [Server stopped]
pause
