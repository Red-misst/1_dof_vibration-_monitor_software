#!/bin/bash
# Change directory to the location of this script
cd "$(dirname "$0")"

echo "Starting Vibration Monitor..."

# Open the web interface in the default browser after a short delay
(sleep 2 && xdg-open http://localhost:3000 &)

# Start the Node.js server
npm start
