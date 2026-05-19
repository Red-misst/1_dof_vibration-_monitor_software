/**
 * public/js/chat/messages.js
 * Handles sending, receiving, rendering, and formatting chat messages.
 */

import { state } from './state.js';

export function displayChatMessages() {
  const chatMessagesContainer = document.getElementById('chatMessages');
  if (!chatMessagesContainer) return;

  const sessionSelector = chatMessagesContainer.querySelector('#chatSessionSelector')?.parentElement;
  chatMessagesContainer.innerHTML = '';
  if (sessionSelector) chatMessagesContainer.appendChild(sessionSelector);

  let lastDate = null;

  state.chatMessages.forEach(message => {
    const messageDate = new Date(message.timestamp);
    const dateStr = messageDate.toLocaleDateString();

    if (lastDate !== dateStr) {
      const separator = document.createElement('div');
      separator.className = 'flex justify-center my-4';
      separator.innerHTML = `
        <div style="background:#374151;color:#9ca3af;font-size:11px;padding:4px 12px;border-radius:12px;">
          ${formatDateForDisplay(messageDate)}
        </div>
      `;
      chatMessagesContainer.appendChild(separator);
      lastDate = dateStr;
    }

    if (message.role === 'user') {
      addUserMessageToUI(message.content, message.timestamp);
    } else if (message.role === 'assistant') {
      addAssistantMessageToUI(message.content, message.timestamp);
    }
  });

  if (state.chatMessages.length === 0) {
    const emptyState = document.createElement('div');
    emptyState.style.cssText = 'display:flex;flex-direction:column;align-items:center;justify-content:center;height:240px;text-align:center;';
    emptyState.innerHTML = `
      <div style="color:#3b82f6;font-size:40px;margin-bottom:12px;"><i class="fas fa-robot"></i></div>
      <h4 style="color:#e5e7eb;font-weight:600;margin-bottom:4px;">Vibration Analysis Assistant</h4>
      <p style="color:#9ca3af;font-size:12px;max-width:280px;margin:0 auto;">Ask questions about your vibration data or get insights on the test results.</p>
    `;
    chatMessagesContainer.appendChild(emptyState);
  }

  scrollChatToBottom();
}

export function addUserMessageToUI(message, timestamp = null) {
  const chatMessagesContainer = document.getElementById('chatMessages');
  if (!chatMessagesContainer) return;

  const messageElement = document.createElement('div');
  messageElement.className = 'flex justify-end message-container';

  const messageTime = timestamp ? new Date(timestamp) : new Date();
  const timeStr = messageTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  messageElement.innerHTML = `
    <div style="background:#2563eb;color:white;border-radius:12px;padding:10px 14px;max-width:85%;margin:8px 0;box-shadow:0 2px 8px rgba(0,0,0,0.2);">
      <div style="display:flex;align-items:center;margin-bottom:4px;gap:8px;">
        <span style="font-weight:600;font-size:12px;">You</span>
        <span style="font-size:10px;color:#93c5fd;margin-left:auto;">${timeStr}</span>
      </div>
      <p style="word-break:break-word;font-size:13px;line-height:1.4;">${escapeHTML(message)}</p>
    </div>
  `;

  chatMessagesContainer.appendChild(messageElement);
  scrollChatToBottom();
}

export function addAssistantMessageToUI(message, timestamp = null) {
  const chatMessagesContainer = document.getElementById('chatMessages');
  if (!chatMessagesContainer) return;

  const messageElement = document.createElement('div');
  messageElement.className = 'flex message-container';

  const messageTime = timestamp ? new Date(timestamp) : new Date();
  const timeStr = messageTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const formattedMessage = typeof window.marked !== 'undefined'
    ? window.marked.parse(message)
    : message.replace(/\n/g, '<br>');

  messageElement.innerHTML = `
    <div style="background:#374151;color:#f3f4f6;border-radius:12px;padding:10px 14px;max-width:85%;margin:8px 0;box-shadow:0 2px 8px rgba(0,0,0,0.2);">
      <div style="display:flex;align-items:center;margin-bottom:6px;gap:8px;">
        <div style="width:20px;height:20px;border-radius:50%;background:#3b82f6;display:flex;align-items:center;justify-content:center;">
          <i class="fas fa-robot" style="font-size:10px;color:white;"></i>
        </div>
        <span style="font-weight:600;font-size:12px;color:#93c5fd;">Assistant</span>
        <span style="font-size:10px;color:#9ca3af;margin-left:auto;">${timeStr}</span>
      </div>
      <div class="markdown-content" style="font-size:13px;line-height:1.4;word-break:break-word;">${formattedMessage}</div>
    </div>
  `;

  chatMessagesContainer.appendChild(messageElement);
  scrollChatToBottom();
}

export function addUserMessage(message) {
  if (!message || !state.currentChatSession) return;
  addUserMessageToUI(message);
  state.chatMessages.push({ role: 'user', content: message, timestamp: new Date() });
}

export function addAssistantMessage(message) {
  if (!message || !state.currentChatSession) return;
  addAssistantMessageToUI(message);
  state.chatMessages.push({ role: 'assistant', content: message, timestamp: new Date() });
}

export async function sendChatMessage() {
  const userMessageInput = document.getElementById('userMessage');
  if (!userMessageInput) return;
  const message = userMessageInput.value.trim();

  if (!message || !state.currentChatSession) return;

  userMessageInput.value = '';
  addUserMessage(message);
  showTypingIndicator();
  if (window.startLoading) window.startLoading();

  try {
    const response = await fetch('/api/chat/message', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId: state.currentChatSession, message })
    });

    if (!response.ok) throw new Error('Error sending message');
    const data = await response.json();

    removeTypingIndicator();
    addAssistantMessage(data.message);
  } catch (error) {
    console.error('Error sending message:', error);
    removeTypingIndicator();
    if (window.showNotification) window.showNotification('Error sending message.', 'error');
  } finally {
    if (window.stopLoading) window.stopLoading();
  }
}

function showTypingIndicator() {
  const chatMessages = document.getElementById('chatMessages');
  if (!chatMessages) return;

  const indicator = document.createElement('div');
  indicator.id = 'typingIndicator';
  indicator.className = 'flex message-container';
  indicator.innerHTML = `
    <div style="background:#374151;color:#9ca3af;border-radius:12px;padding:8px 12px;margin:8px 0;">
      <div style="display:flex;align-items:center;gap:6px;">
        <span style="font-size:11px;">Assistant is typing</span>
        <span style="display:inline-block;width:4px;height:4px;border-radius:50%;background:#9ca3af;animation: bounce 1.4s infinite both;"></span>
      </div>
    </div>
  `;
  chatMessages.appendChild(indicator);
  scrollChatToBottom();
}

function removeTypingIndicator() {
  document.getElementById('typingIndicator')?.remove();
}

export function scrollChatToBottom() {
  const chatBody = document.getElementById('chatBody');
  if (chatBody) chatBody.scrollTop = chatBody.scrollHeight;
}

function escapeHTML(html) {
  const div = document.createElement('div');
  div.textContent = html;
  return div.innerHTML;
}

function formatDateForDisplay(date) {
  const now = new Date();
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);

  if (date.toDateString() === now.toDateString()) {
    return 'Today';
  } else if (date.toDateString() === yesterday.toDateString()) {
    return 'Yesterday';
  } else {
    return date.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
  }
}
