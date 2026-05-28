#!/bin/bash
echo "Starting Vibration Monitor..."
cd "/home/redmisst/Desktop/1_dof_vibration-_monitor_software"

# Open the browser after a short delay
(sleep 2 && xdg-open http://localhost:3000 &)

# Start the server
npm start
