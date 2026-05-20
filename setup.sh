#!/usr/bin/env bash

# ====================================================================
# Precision Structural Resonance & Vibration Analyzer v2.0 Setup Script
# Optimized for Lubuntu / Linux (Debian/Ubuntu-based)
# ====================================================================

# Exit immediately if a command exits with a non-zero status
set -e

# ANSI Color Codes for Premium Terminal UI
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

echo -e "${CYAN}====================================================================${NC}"
echo -e "${CYAN}     __  __       _   _    _       _                                ${NC}"
echo -e "${CYAN}    |  \\/  |     (_) | |  | |     (_)                               ${NC}"
echo -e "${CYAN}    | \\  / | ___  _  | |  | |_ __  ___   __                         ${NC}"
echo -e "${CYAN}    | |\\/| |/ _ \\| | | |  | | '_ \\| \\ \\ / /                         ${NC}"
echo -e "${CYAN}    | |  | | (_) | | | |__| | | | | |\\ V /                          ${NC}"
echo -e "${CYAN}    |_|  |_|\\___/|_|  \\____/|_| |_|_| \\_/                           ${NC}"
echo -e "${CYAN}                                                                    ${NC}"
echo -e "${CYAN}   Precision Structural Resonance & Vibration Analyzer v2.0         ${NC}"
echo -e "${CYAN}   First-Time Setup (Lubuntu / Linux Version)                      ${NC}"
echo -e "${CYAN}   Moi University Mechanical Engineering Department                ${NC}"
echo -e "${CYAN}====================================================================${NC}"
echo ""

# Ensure we are running on Linux
if [ "$(uname)" != "Linux" ]; then
    echo -e "${RED}[ERROR] This setup script is optimized for Linux (Lubuntu/Ubuntu).${NC}"
    echo -e "${RED}Please run SETUP.bat on Windows instead.${NC}"
    exit 1
fi

echo -e "${BLUE}[1/4] Checking System Prerequisites...${NC}"

# Check for Node.js
if ! command -v node >/dev/null 2>&1; then
    echo -e "${YELLOW}[WARNING] Node.js is not installed!${NC}"
    echo -e "${YELLOW}To run this application, Node.js (version 16 or higher) is required.${NC}"
    echo -e "${YELLOW}Would you like to install Node.js and npm via apt now? (Requires sudo) [Y/n]${NC}"
    read -r response
    if [[ -z "$response" || "$response" =~ ^[yY]([eE][sS])?$ ]]; then
        echo -e "${BLUE}Updating package lists...${NC}"
        sudo apt-get update
        echo -e "${BLUE}Installing Node.js and npm...${NC}"
        sudo apt-get install -y nodejs npm
    else
        echo -e "${RED}[ERROR] Node.js is required. Setup aborted.${NC}"
        exit 1
    fi
fi

# Check Node.js version
NODE_VERSION=$(node -v | cut -d'v' -f2)
NODE_MAJOR=$(echo "$NODE_VERSION" | cut -d'.' -f1)

if [ "$NODE_MAJOR" -lt 16 ]; then
    echo -e "${YELLOW}[WARNING] Node.js version $NODE_VERSION is installed, but version >= 16 is recommended.${NC}"
    echo -e "${YELLOW}If dependencies fail to install or compile, please upgrade Node.js.${NC}"
fi

echo -e "${GREEN}[OK] Node.js $(node -v) is installed.${NC}"
echo -e "${GREEN}[OK] npm $(npm -v) is installed.${NC}"
echo ""

echo -e "${BLUE}[2/4] Installing Required System Packages...${NC}"
echo -e "${BLUE}This project compiles native modules (like better-sqlite3) and uses mDNS.${NC}"
echo -e "${BLUE}Sudo privileges are required to install build-essential and avahi-daemon.${NC}"
echo ""

# Identify packages to install
PACKAGES_TO_INSTALL=()

# Check for build-essential (g++, gcc, make)
if ! dpkg -l | grep -q "^ii  build-essential "; then
    PACKAGES_TO_INSTALL+=("build-essential")
fi

# Check for avahi-daemon (mDNS resolver)
if ! dpkg -l | grep -q "^ii  avahi-daemon "; then
    PACKAGES_TO_INSTALL+=("avahi-daemon")
fi

if [ ${#PACKAGES_TO_INSTALL[@]} -ne 0 ]; then
    echo -e "${CYAN}Installing system dependencies via apt: ${PACKAGES_TO_INSTALL[*]}${NC}"
    sudo apt-get update
    sudo apt-get install -y "${PACKAGES_TO_INSTALL[@]}"
    echo -e "${GREEN}[OK] System packages successfully installed.${NC}"
else
    echo -e "${GREEN}[OK] Necessary system packages (build-essential, avahi-daemon) are already installed.${NC}"
fi

# Start & Enable Avahi Daemon
echo -e "${BLUE}Checking Avahi mDNS service status...${NC}"
if systemctl is-active --quiet avahi-daemon; then
    echo -e "${GREEN}[OK] Avahi Daemon is running.${NC}"
else
    echo -e "${BLUE}Starting Avahi Daemon...${NC}"
    sudo systemctl start avahi-daemon
    sudo systemctl enable avahi-daemon
    echo -e "${GREEN}[OK] Avahi Daemon started and enabled on startup.${NC}"
fi
echo ""

echo -e "${BLUE}[3/4] Configuring Firewall Rules...${NC}"
# Check if UFW is installed and active
if command -v ufw >/dev/null 2>&1; then
    if sudo ufw status | grep -q "Status: active"; then
        echo -e "${BLUE}Adding UFW rules to allow connections from ESP8266...${NC}"
        # Port 3000 TCP for Webserver & WebSockets
        sudo ufw allow 3000/tcp comment 'Vibration Monitor Server'
        # Port 5353 UDP for mDNS Multicast Discovery
        sudo ufw allow 5353/udp comment 'Vibration Monitor mDNS'
        sudo ufw reload
        echo -e "${GREEN}[OK] UFW firewall configured.${NC}"
    else
        echo -e "${YELLOW}[INFO] UFW firewall is installed but not active. No rules applied.${NC}"
    fi
else
    echo -e "${YELLOW}[INFO] UFW firewall is not installed. Skipping firewall rules.${NC}"
fi
echo ""

echo -e "${BLUE}[4/4] Installing Project Dependencies (npm install)...${NC}"
npm install

echo ""
echo -e "${GREEN}====================================================================${NC}"
echo -e "${GREEN} Setup Complete! Run './start.sh' to launch the application.        ${NC}"
echo -e "${GREEN} Moi University Mechanical Engineering Department                    ${NC}"
echo -e "${GREEN}====================================================================${NC}"
echo ""
