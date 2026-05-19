/**
 * public/js/diagnostics.js
 * Polls /api/diagnostics every 5 seconds and updates the diagnostic panel.
 */

const POLL_INTERVAL = 5000;
let panelVisible = false;

export function initDiagnostics() {
  injectPanel();
  poll();
  setInterval(poll, POLL_INTERVAL);
}

async function poll() {
  try {
    const res = await fetch('/api/diagnostics');
    const data = await res.json();
    updatePanel(data);
  } catch {
    updatePanelOffline();
  }
}

function updatePanel(d) {
  set('diag-server', true, `Uptime: ${formatUptime(d.server.uptime)}`);
  set('diag-db', d.database.ok, d.database.ok ? 'SQLite OK' : 'DB Error');
  set('diag-device', d.devices.count > 0, d.devices.count > 0 ? `${d.devices.count} connected` : 'No devices');
  set('diag-ai', d.ai.ok, d.ai.ok ? 'Online' : (d.ai.ok === false ? 'Offline' : 'Not tested'));

  const ipEl = document.getElementById('diag-ip');
  if (ipEl) {
    const hotspot = d.network.hotspotIP;
    const ips = d.network.localIPs.map(i => i.address).join(', ');
    ipEl.textContent = hotspot ? `${hotspot} (hotspot)` : ips || 'Unknown';
  }

  const mdnsEl = document.getElementById('diag-mdns');
  if (mdnsEl) mdnsEl.textContent = d.network.mdnsName;
}

function updatePanelOffline() {
  ['diag-server', 'diag-db', 'diag-device', 'diag-ai'].forEach(id => {
    const dot = document.getElementById(id + '-dot');
    const txt = document.getElementById(id + '-text');
    if (dot) dot.className = 'w-2.5 h-2.5 rounded-full bg-gray-500';
    if (txt) txt.textContent = 'Unknown';
  });
}

function set(id, ok, label) {
  const dot = document.getElementById(id + '-dot');
  const txt = document.getElementById(id + '-text');
  const color = ok === true ? 'bg-green-400' : ok === false ? 'bg-red-400' : 'bg-yellow-400';
  if (dot) dot.className = `w-2.5 h-2.5 rounded-full ${color}`;
  if (txt) txt.textContent = label;
}

function formatUptime(s) {
  if (s < 60) return `${s}s`;
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  return `${Math.floor(s / 3600)}h ${Math.floor((s % 3600) / 60)}m`;
}

function injectPanel() {
  const panel = document.createElement('div');
  panel.id = 'diagnosticsPanel';
  panel.style.cssText = `
    position: fixed; bottom: 16px; left: 16px; z-index: 9999;
    background: rgba(17, 24, 39, 0.95); border: 1px solid rgba(75, 85, 99, 0.6);
    border-radius: 12px; backdrop-filter: blur(12px);
    font-family: 'Inter', sans-serif; font-size: 12px; color: #d1d5db;
    box-shadow: 0 8px 32px rgba(0,0,0,0.4); min-width: 220px;
    transition: all 0.3s ease;
  `;

  panel.innerHTML = `
    <div id="diag-toggle" style="padding: 10px 14px; cursor: pointer; display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid rgba(75,85,99,0.4);">
      <div style="display:flex;align-items:center;gap:8px;">
        <span style="font-size:14px;">📊</span>
        <span style="font-weight:600;color:#f9fafb;">System Status</span>
      </div>
      <span id="diag-chevron" style="transition:transform 0.3s;color:#6b7280;">▲</span>
    </div>
    <div id="diag-body" style="padding: 12px 14px; display:none;">
      <div class="diag-row" style="margin-bottom:8px;">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;">
          <div id="diag-server-dot" class="w-2.5 h-2.5 rounded-full bg-gray-500" style="width:10px;height:10px;border-radius:50%;background:#6b7280;flex-shrink:0;"></div>
          <span style="color:#9ca3af;font-size:11px;text-transform:uppercase;letter-spacing:0.05em;">Server</span>
          <span id="diag-server-text" style="margin-left:auto;color:#d1d5db;">Checking...</span>
        </div>
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;">
          <div id="diag-db-dot" style="width:10px;height:10px;border-radius:50%;background:#6b7280;flex-shrink:0;"></div>
          <span style="color:#9ca3af;font-size:11px;text-transform:uppercase;letter-spacing:0.05em;">Database</span>
          <span id="diag-db-text" style="margin-left:auto;color:#d1d5db;">Checking...</span>
        </div>
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;">
          <div id="diag-device-dot" style="width:10px;height:10px;border-radius:50%;background:#6b7280;flex-shrink:0;"></div>
          <span style="color:#9ca3af;font-size:11px;text-transform:uppercase;letter-spacing:0.05em;">ESP8266</span>
          <span id="diag-device-text" style="margin-left:auto;color:#d1d5db;">Checking...</span>
        </div>
        <div style="display:flex;align-items:center;gap:8px;">
          <div id="diag-ai-dot" style="width:10px;height:10px;border-radius:50%;background:#6b7280;flex-shrink:0;"></div>
          <span style="color:#9ca3af;font-size:11px;text-transform:uppercase;letter-spacing:0.05em;">AI (DeepSeek)</span>
          <span id="diag-ai-text" style="margin-left:auto;color:#d1d5db;">Not tested</span>
        </div>
      </div>
      <div style="border-top:1px solid rgba(75,85,99,0.4);padding-top:8px;margin-top:4px;">
        <div style="display:flex;justify-content:space-between;margin-bottom:3px;">
          <span style="color:#6b7280;">PC IP</span>
          <span id="diag-ip" style="color:#60a5fa;font-family:monospace;">...</span>
        </div>
        <div style="display:flex;justify-content:space-between;">
          <span style="color:#6b7280;">ESP hostname</span>
          <span id="diag-mdns" style="color:#34d399;font-family:monospace;font-size:11px;">vibration-monitor.local</span>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(panel);

  document.getElementById('diag-toggle').addEventListener('click', () => {
    panelVisible = !panelVisible;
    const body = document.getElementById('diag-body');
    const chevron = document.getElementById('diag-chevron');
    body.style.display = panelVisible ? 'block' : 'none';
    chevron.style.transform = panelVisible ? 'rotate(0deg)' : 'rotate(180deg)';
  });
}
