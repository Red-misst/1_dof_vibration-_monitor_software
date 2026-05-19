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

  createChatSessionSelector();

  toggleChat?.addEventListener('click', (e) => {
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
}

export function toggleChatVisibility() {
  const chatInterface = document.getElementById('chatInterface');
  const toggleIcon = document.querySelector('#toggleChat i');
  if (!chatInterface) return;

  if (state.isChatFullscreen) {
    toggleChatFullscreen();
    return;
  }

  const transform = chatInterface.style.transform;
  if (transform === 'translateY(0px)' || transform === 'none' || transform === '') {
    chatInterface.style.transform = 'translateY(450px)';
    if (toggleIcon) toggleIcon.className = 'fas fa-chevron-up';
  } else {
    chatInterface.style.transform = 'translateY(0)';
    if (toggleIcon) toggleIcon.className = 'fas fa-chevron-down';
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
