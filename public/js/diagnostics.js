/**
 * public/js/diagnostics.js
 * Polls /api/diagnostics every 5 seconds and updates the diagnostic panel.
 */

const POLL_INTERVAL = 5000;
let panelVisible = false;

export function initDiagnostics() {
  injectStyle();
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
  set('diag-db', d.database.ok, d.database.ok ? 'SQLITE OK' : 'DB ERROR');
  set('diag-device', d.devices.count > 0, d.devices.count > 0 ? `${d.devices.count} CONNECTED` : 'NO DEVICES');
  set('diag-ai', d.ai.ok, d.ai.ok ? `ONLINE (${(d.ai.provider || 'AI').toUpperCase()})` : (d.ai.ok === false ? 'OFFLINE' : 'NOT TESTED'));

  // Update Chat UI in real-time based on diagnostics
  const chatStatusIndicator = document.getElementById('chatStatusIndicator');
  const fabStatusIndicator = document.getElementById('fabStatusIndicator');
  const chatStatusText = document.getElementById('chatStatusText');
  const chatBody = document.getElementById('chatBody');
  const chatInput = document.getElementById('chatInput');
  const chatSetup = document.getElementById('chatSetup');

  if (d.ai && d.ai.ok) {
    if (chatStatusIndicator) {
      chatStatusIndicator.className = 'status-indicator connected';
      chatStatusIndicator.style.background = '';
    }
    if (fabStatusIndicator) {
      fabStatusIndicator.className = 'status-indicator connected';
      fabStatusIndicator.style.background = '';
    }
    if (chatStatusText) {
      chatStatusText.textContent = `Online (${d.ai.provider === 'openai' ? 'OpenAI' : 'DeepSeek'})`;
      chatStatusText.style.color = 'var(--accent-green)';
    }
    if (chatBody && chatBody.style.display === 'none') chatBody.style.display = 'block';
    if (chatInput && chatInput.style.display === 'none') chatInput.style.display = 'block';
    if (chatSetup && chatSetup.style.display !== 'none') chatSetup.style.display = 'none';
  } else {
    const hasKey = d.ai && d.ai.message !== 'No API key configured';
    if (chatStatusIndicator) {
      chatStatusIndicator.className = 'status-indicator disconnected';
      chatStatusIndicator.style.background = '';
    }
    if (fabStatusIndicator) {
      fabStatusIndicator.className = 'status-indicator disconnected';
      fabStatusIndicator.style.background = '';
    }
    if (chatStatusText) {
      chatStatusText.textContent = hasKey ? 'Offline' : 'Setup Required';
      chatStatusText.style.color = hasKey ? 'var(--accent-red)' : 'var(--text-secondary)';
    }
    if (chatBody && chatBody.style.display !== 'none') chatBody.style.display = 'none';
    if (chatInput && chatInput.style.display !== 'none') chatInput.style.display = 'none';
    if (chatSetup && chatSetup.style.display !== 'flex') chatSetup.style.display = 'flex';
  }

  const ipEl = document.getElementById('diag-ip');
  if (ipEl) {
    const hotspot = d.network.hotspotIP;
    const ips = d.network.localIPs.map(i => i.address).join(', ');
    ipEl.textContent = hotspot ? `${hotspot} (HOTSPOT)` : ips || 'UNKNOWN';
  }

  const mdnsEl = document.getElementById('diag-mdns');
  if (mdnsEl) mdnsEl.textContent = (d.network.mdnsName || 'vibration-monitor.local').toUpperCase();
}

function updatePanelOffline() {
  ['diag-server', 'diag-db', 'diag-device', 'diag-ai'].forEach(id => {
    const dot = document.getElementById(id + '-dot');
    const txt = document.getElementById(id + '-text');
    if (dot) {
      dot.style.background = '#8e8e93';
      dot.style.boxShadow = 'none';
    }
    if (txt) txt.textContent = 'UNKNOWN';
  });
}

function set(id, ok, label) {
  const dot = document.getElementById(id + '-dot');
  const txt = document.getElementById(id + '-text');
  const color = ok === true ? '#30D158' : ok === false ? '#FF453A' : '#FF9F0A';
  if (dot) {
    dot.style.background = color;
    dot.style.boxShadow = `0 0 8px ${color}`;
  }
  if (txt) txt.textContent = label;
}

function formatUptime(s) {
  if (s < 60) return `${Math.floor(s)}S`;
  if (s < 3600) return `${Math.floor(s / 60)}M`;
  return `${Math.floor(s / 3600)}H ${Math.floor((s % 3600) / 60)}M`;
}

function injectStyle() {
  const styleEl = document.createElement('style');
  styleEl.textContent = `
    @keyframes statusPulse {
      0% { transform: scale(0.5); opacity: 0.8; }
      100% { transform: scale(2.2); opacity: 0; }
    }
    .diag-item-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 8px;
    }
    .diag-item-row:last-child {
      margin-bottom: 0;
    }
    .diag-item-lbl {
      color: rgba(255, 255, 255, 0.4);
      font-family: 'SF Mono', ui-monospace, monospace;
      text-transform: uppercase;
      font-size: 9.5px;
      letter-spacing: 0.05em;
    }
    .diag-item-val {
      color: rgba(255, 255, 255, 0.95);
      font-family: 'SF Mono', ui-monospace, monospace;
      font-size: 10px;
      text-align: right;
    }
  `;
  document.head.appendChild(styleEl);
}

function injectPanel() {
  const panel = document.createElement('div');
  panel.id = 'diagnosticsPanel';
  panel.style.cssText = `
    position: fixed; bottom: 20px; left: 20px; z-index: 9999;
    background: rgba(10, 10, 12, 0.65); border: 1px solid rgba(255, 255, 255, 0.05);
    border-radius: 16px; backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px);
    font-family: 'SF Mono', ui-monospace, monospace;
    box-shadow: 0 12px 40px rgba(0,0,0,0.6); min-width: 240px;
    transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
  `;

  panel.innerHTML = `
    <div id="diag-toggle" style="padding: 10px 14px; cursor: pointer; display: flex; align-items: center; justify-content: space-between;">
      <div style="display:flex;align-items:center;gap:10px;">
        <div style="position: relative; display: flex; align-items: center;">
          <span style="display: inline-block; width: 6px; height: 6px; border-radius: 50%; background: #30D158; box-shadow: 0 0 8px #30D158;"></span>
          <span style="position: absolute; width: 14px; height: 14px; border-radius: 50%; border: 1px solid #30D158; opacity: 0; animation: statusPulse 2s infinite;"></span>
        </div>
        <span style="font-weight: 600; font-family: 'SF Mono', monospace; letter-spacing: 0.1em; color: #fff; text-transform: uppercase; font-size: 9.5px;">SYS_STATUS // ONLINE</span>
      </div>
      <span id="diag-chevron" style="transition: transform 0.3s ease; color: rgba(255,255,255,0.4); font-size: 8px;">▲</span>
    </div>
    <div id="diag-body" style="padding: 12px 14px; display: none; border-top: 1px solid rgba(255,255,255,0.05);">
      <div style="margin-bottom: 8px;">
        <div class="diag-item-row">
          <div style="display:flex;align-items:center;gap:8px;">
            <div id="diag-server-dot" style="width:6px;height:6px;border-radius:50%;background:#8e8e93;transition:all 0.3s ease;"></div>
            <span class="diag-item-lbl">Server</span>
          </div>
          <span id="diag-server-text" class="diag-item-val">Checking...</span>
        </div>
        <div class="diag-item-row">
          <div style="display:flex;align-items:center;gap:8px;">
            <div id="diag-db-dot" style="width:6px;height:6px;border-radius:50%;background:#8e8e93;transition:all 0.3s ease;"></div>
            <span class="diag-item-lbl">Database</span>
          </div>
          <span id="diag-db-text" class="diag-item-val">Checking...</span>
        </div>
        <div class="diag-item-row">
          <div style="display:flex;align-items:center;gap:8px;">
            <div id="diag-device-dot" style="width:6px;height:6px;border-radius:50%;background:#8e8e93;transition:all 0.3s ease;"></div>
            <span class="diag-item-lbl">ESP8266</span>
          </div>
          <span id="diag-device-text" class="diag-item-val">Checking...</span>
        </div>
        <div class="diag-item-row">
          <div style="display:flex;align-items:center;gap:8px;">
            <div id="diag-ai-dot" style="width:6px;height:6px;border-radius:50%;background:#8e8e93;transition:all 0.3s ease;"></div>
            <span class="diag-item-lbl">AI (Provider)</span>
          </div>
          <span id="diag-ai-text" class="diag-item-val">Not tested</span>
        </div>
      </div>
      <div style="border-top: 1px solid rgba(255,255,255,0.05); padding-top: 8px; margin-top: 4px;">
        <div class="diag-item-row">
          <span class="diag-item-lbl">PC IP</span>
          <span id="diag-ip" class="diag-item-val" style="color: var(--accent-blue);">...</span>
        </div>
        <div class="diag-item-row">
          <span class="diag-item-lbl">ESP Hostname</span>
          <span id="diag-mdns" class="diag-item-val" style="color: var(--accent-indigo);">vibration-monitor.local</span>
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
    chevron.style.transform = panelVisible ? 'rotate(180deg)' : 'rotate(0deg)';
  });
}
