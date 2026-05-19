/**
 * public/js/chat/ui.js
 * Handles the visual UI of the chat window (expand, collapse, fullscreen).
 */

import { state } from './state.js';
import { sendChatMessage, scrollChatToBottom } from './messages.js';
import { createChatSessionSelector } from './sessions.js';

export function initChatInterface() {
  const chatHeader = document.getElementById('chatHeader');
  const toggleChat = document.getElementById('toggleChat');
  const userMessage = document.getElementById('userMessage');
  const sendMessage = document.getElementById('sendMessage');

  const saveKeyBtn = document.getElementById('saveKeyBtn');
  const apiKeyInput = document.getElementById('apiKeyInput');
  const keyStatusMessage = document.getElementById('keyStatusMessage');
  const providerSelect = document.getElementById('providerSelect');
  const modelInput = document.getElementById('modelInput');
  const apiKeyLabel = document.getElementById('apiKeyLabel');

  createChatSessionSelector();

  toggleChat?.addEventListener('click', (e) => {
    e.stopPropagation();
    toggleChatVisibility();
  });

  const chatFab = document.getElementById('chatFab');
  chatFab?.addEventListener('click', (e) => {
    e.stopPropagation();
    toggleChatVisibility();
  });

  chatHeader?.addEventListener('click', (e) => {
    if (e.target !== toggleChat && !toggleChat?.contains(e.target)) {
      toggleChatVisibility();
    }
  });

  chatHeader?.addEventListener('dblclick', () => {
    toggleChatFullscreen();
  });

  // Create fullscreen button in header
  const headerActions = chatHeader?.querySelector('div:last-child');
  if (headerActions) {
    const fullscreenButton = document.createElement('button');
    fullscreenButton.title = "Toggle Fullscreen";
    fullscreenButton.style.cssText = "background:none;border:none;color:#9ca3af;cursor:pointer;padding:4px;margin-right:8px;";
    fullscreenButton.innerHTML = '<i class="fas fa-expand"></i>';
    fullscreenButton.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleChatFullscreen();
    });
    headerActions.prepend(fullscreenButton);
  }

  sendMessage?.addEventListener('click', sendChatMessage);
  userMessage?.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') sendChatMessage();
  });

  // Dynamically default models on provider selection change
  providerSelect?.addEventListener('change', () => {
    const provider = providerSelect.value;
    if (provider === 'openai') {
      if (modelInput) {
        modelInput.placeholder = 'gpt-4o-mini';
        modelInput.value = 'gpt-4o-mini';
      }
      if (apiKeyLabel) apiKeyLabel.textContent = 'OpenAI API Key';
    } else {
      if (modelInput) {
        modelInput.placeholder = 'deepseek-chat';
        modelInput.value = 'deepseek-chat';
      }
      if (apiKeyLabel) apiKeyLabel.textContent = 'DeepSeek API Key';
    }
  });

  // Handle Save API Key button click
  saveKeyBtn?.addEventListener('click', async () => {
    const provider = providerSelect?.value || 'deepseek';
    const apiKey = apiKeyInput?.value.trim();
    const model = modelInput?.value.trim();
    
    if (!apiKey) {
      if (keyStatusMessage) {
        keyStatusMessage.textContent = 'Please enter an API Key';
        keyStatusMessage.style.color = 'var(--accent-red)';
      }
      return;
    }

    saveKeyBtn.disabled = true;
    const originalText = saveKeyBtn.innerHTML;
    saveKeyBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Connecting...';
    if (keyStatusMessage) {
      keyStatusMessage.textContent = `Verifying connection with ${provider === 'openai' ? 'OpenAI' : 'DeepSeek'}...`;
      keyStatusMessage.style.color = 'var(--accent-blue)';
    }

    try {
      const res = await fetch('/api/ai/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider, apiKey, model })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to connect');

      if (keyStatusMessage) {
        keyStatusMessage.textContent = 'Connected successfully!';
        keyStatusMessage.style.color = 'var(--accent-green)';
      }
      if (window.showNotification) {
        window.showNotification(`AI Connected successfully (${provider})!`, 'success');
      }

      await checkAiConfig();
      if (apiKeyInput) apiKeyInput.value = '';
    } catch (err) {
      if (keyStatusMessage) {
        keyStatusMessage.textContent = err.message || 'Verification failed';
        keyStatusMessage.style.color = 'var(--accent-red)';
      }
      if (window.showNotification) {
        window.showNotification(err.message || 'API key verification failed', 'error');
      }
    } finally {
      saveKeyBtn.disabled = false;
      saveKeyBtn.innerHTML = originalText;
    }
  });

  // Initial check on load
  checkAiConfig();
}

export async function checkAiConfig() {
  const chatStatusIndicator = document.getElementById('chatStatusIndicator');
  const fabStatusIndicator = document.getElementById('fabStatusIndicator');
  const chatStatusText = document.getElementById('chatStatusText');
  const chatBody = document.getElementById('chatBody');
  const chatInput = document.getElementById('chatInput');
  const chatSetup = document.getElementById('chatSetup');
  
  const providerSelect = document.getElementById('providerSelect');
  const modelInput = document.getElementById('modelInput');
  const apiKeyLabel = document.getElementById('apiKeyLabel');

  try {
    const res = await fetch('/api/ai/config');
    const data = await res.json();

    if (providerSelect && data.provider) {
      providerSelect.value = data.provider;
    }
    if (modelInput && data.model) {
      modelInput.value = data.model;
    }
    if (apiKeyLabel) {
      apiKeyLabel.textContent = data.provider === 'openai' ? 'OpenAI API Key' : 'DeepSeek API Key';
    }

    if (data.hasKey && data.connected) {
      if (chatStatusIndicator) {
        chatStatusIndicator.className = 'status-indicator active';
        chatStatusIndicator.style.background = 'var(--accent-green)';
      }
      if (fabStatusIndicator) {
        fabStatusIndicator.className = 'status-indicator active';
        fabStatusIndicator.style.background = 'var(--accent-green)';
      }
      if (chatStatusText) {
        chatStatusText.textContent = `Online (${data.provider === 'openai' ? 'OpenAI' : 'DeepSeek'})`;
        chatStatusText.style.color = 'var(--accent-green)';
      }
      if (chatBody) chatBody.style.display = 'block';
      if (chatInput) chatInput.style.display = 'block';
      if (chatSetup) chatSetup.style.display = 'none';
    } else {
      if (chatStatusIndicator) {
        chatStatusIndicator.className = 'status-indicator disconnected';
        chatStatusIndicator.style.background = 'var(--accent-red)';
      }
      if (fabStatusIndicator) {
        fabStatusIndicator.className = 'status-indicator disconnected';
        fabStatusIndicator.style.background = 'var(--accent-red)';
      }
      if (chatStatusText) {
        chatStatusText.textContent = data.hasKey ? 'Offline' : 'Setup Required';
        chatStatusText.style.color = data.hasKey ? 'var(--accent-red)' : 'var(--text-secondary)';
      }
      if (chatBody) chatBody.style.display = 'none';
      if (chatInput) chatInput.style.display = 'none';
      if (chatSetup) chatSetup.style.display = 'flex';
    }
  } catch (err) {
    console.error('[AI] Failed to fetch AI config:', err);
  }
}

export function toggleChatVisibility() {
  const chatInterface = document.getElementById('chatInterface');
  const chatFab = document.getElementById('chatFab');
  if (!chatInterface || !chatFab) return;

  if (state.isChatFullscreen) {
    toggleChatFullscreen();
    return;
  }

  const isHidden = chatInterface.style.opacity === '0' || chatInterface.style.opacity === '';
  
  if (isHidden) {
    // Show chat, hide FAB
    chatInterface.style.transform = 'translateY(0)';
    chatInterface.style.opacity = '1';
    chatInterface.style.pointerEvents = 'auto';
    chatInterface.classList.add('active');

    chatFab.style.transform = 'scale(0)';
    chatFab.style.opacity = '0';
    chatFab.style.pointerEvents = 'none';
  } else {
    // Hide chat, show FAB
    chatInterface.style.transform = 'translateY(120%)';
    chatInterface.style.opacity = '0';
    chatInterface.style.pointerEvents = 'none';
    chatInterface.classList.remove('active');

    chatFab.style.transform = 'scale(1)';
    chatFab.style.opacity = '1';
    chatFab.style.pointerEvents = 'auto';
  }
}

export function toggleChatFullscreen() {
  const chatInterface = document.getElementById('chatInterface');
  const fullscreenIcon = document.querySelector('button[title="Toggle Fullscreen"] i');
  if (!chatInterface) return;

  if (state.isChatFullscreen) {
    chatInterface.classList.remove('chat-fullscreen');
    chatInterface.style.height = '500px';
    chatInterface.style.width = '384px';
    state.isChatFullscreen = false;
    if (fullscreenIcon) fullscreenIcon.className = 'fas fa-expand';
  } else {
    chatInterface.style.transform = 'translateY(0)';
    chatInterface.classList.add('chat-fullscreen');
    chatInterface.style.height = '90vh';
    chatInterface.style.width = '600px';
    state.isChatFullscreen = true;
    if (fullscreenIcon) fullscreenIcon.className = 'fas fa-compress';
  }

  setTimeout(scrollChatToBottom, 300);
}
