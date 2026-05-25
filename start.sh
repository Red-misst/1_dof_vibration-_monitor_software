#!/usr/bin/env bash

# ====================================================================
# Precision Structural Resonance & Vibration Analyzer v2.0 Start Script
# Optimized for Lubuntu / Linux (Debian/Ubuntu-based)
# ====================================================================

# Ensure we are running inside a terminal emulator so the user can see the logs.
# If not running in a terminal, spawn a new terminal window.
if [ ! -t 1 ]; then
    for term in x-terminal-emulator qterminal lxterminal gnome-terminal xterm konsole alacritty kitty; do
        if command -v "$term" >/dev/null 2>&1; then
            if [ "$term" = "gnome-terminal" ]; then
                exec gnome-terminal -- "$0" "$@"
            else
                exec "$term" -e "$0" "$@"
            fi
            exit 0
        fi
    done
fi

# ANSI Color Codes for Premium Terminal UI
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

clear
echo ""
echo -e "${CYAN}====================================================================${NC}"
echo -e "${CYAN}     __  __       _   _    _       _                                ${NC}"
echo -e "${CYAN}    |  \\/  |     (_) | |  | |     (_)                               ${NC}"
echo -e "${CYAN}    | \\  / | ___  _  | |  | |_ __  ___   __                         ${NC}"
echo -e "${CYAN}    | |\\/| |/ _ \\| | | |  | | '_ \\| \\ \\ / /                         ${NC}"
echo -e "${CYAN}    | |  | | (_) | | | |__| | | | | |\\ V /                          ${NC}"
echo -e "${CYAN}    |_|  |_|\\___/|_|  \\____/|_| |_|_| \\_/                           ${NC}"
echo -e "${CYAN}                                                                    ${NC}"
echo -e "${CYAN}   Precision Structural Resonance & Vibration Analyzer v2.0         ${NC}"
echo -e "${CYAN}   Moi University - Department of Mechanical & Production Eng.       ${NC}"
echo -e "${CYAN}====================================================================${NC}"
echo ""

# Check Node.js is available
if ! command -v node >/dev/null 2>&1; then
    echo -e "${RED}[ERROR] Node.js not found. Please run './setup.sh' first to install system dependencies.${NC}"
    echo ""
    read -p "Press Enter to exit..."
    exit 1
fi

# Check dependencies are installed
if [ ! -d "node_modules" ]; then
    echo -e "${RED}[ERROR] Dependencies (node_modules) not found. Run './setup.sh' first.${NC}"
    echo ""
    read -p "Press Enter to exit..."
    exit 1
fi

echo -e "${BLUE}Starting server...${NC}"
echo -e "${BLUE}Opening browser in 3 seconds...${NC}"
echo ""

# Open default browser after 3s delay in background
(
    sleep 3
    if command -v xdg-open >/dev/null 2>&1; then
        xdg-open "http://localhost:3000" >/dev/null 2>&1
    elif command -v sensible-browser >/dev/null 2>&1; then
        sensible-browser "http://localhost:3000" >/dev/null 2>&1
    elif command -v x-www-browser >/dev/null 2>&1; then
        x-www-browser "http://localhost:3000" >/dev/null 2>&1
    fi
) &

# Start the Node.js server (this keeps the process in the foreground)
node server/index.js

echo ""
echo -e "${YELLOW}[Server stopped]${NC}"
echo ""
read -p "Press Enter to exit..."
