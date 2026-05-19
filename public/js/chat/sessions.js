/**
 * public/js/chat/sessions.js
 * Handles session selection and loading in the chat interface.
 */

import { state } from './state.js';
import { displayChatMessages, addAssistantMessage } from './messages.js';

export function createChatSessionSelector() {
  const chatMessagesContainer = document.getElementById('chatMessages');
  if (!chatMessagesContainer) return;

  const sessionSelectorContainer = document.createElement('div');
  sessionSelectorContainer.className = 'mb-4';

  const sessionSelector = document.createElement('select');
  sessionSelector.id = 'chatSessionSelector';
  sessionSelector.className = 'w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-gray-200 focus:outline-none focus:ring-1 focus:ring-blue-500';

  const defaultOption = document.createElement('option');
  defaultOption.value = '';
  defaultOption.textContent = 'Select a session to analyze...';
  defaultOption.disabled = true;
  defaultOption.selected = true;
  sessionSelector.appendChild(defaultOption);
  sessionSelectorContainer.appendChild(sessionSelector);

  const existingSelector = document.querySelector('#chatSessionSelector');
  if (existingSelector) {
    existingSelector.parentElement.replaceWith(sessionSelectorContainer);
  } else {
    chatMessagesContainer.prepend(sessionSelectorContainer);
  }

  sessionSelector.addEventListener('change', (e) => {
    const sessionId = e.target.value;
    if (sessionId) loadChatSession(sessionId);
  });
}

export function updateChatSessionSelector(sessions) {
  const sessionSelector = document.getElementById('chatSessionSelector');
  if (!sessionSelector) return;

  while (sessionSelector.options.length > 1) {
    sessionSelector.remove(1);
  }

  sessions.forEach(session => {
    const option = document.createElement('option');
    option.value = session.id || session._id;
    const sessionDate = new Date(session.startTime || session.createdAt).toLocaleDateString();
    option.textContent = `${session.name} (${sessionDate})`;
    sessionSelector.appendChild(option);
  });

  if (state.currentChatSession) {
    sessionSelector.value = state.currentChatSession;
  }
}

export async function loadChatSession(sessionId) {
  if (!sessionId) return;
  showChatLoadingIndicator();

  try {
    const response = await fetch(`/api/chat/${sessionId}`);
    if (!response.ok) throw new Error('Error fetching chat history');
    const data = await response.json();

    state.currentChatSession = sessionId;
    state.chatMessages = data.messages || [];

    displayChatMessages();

    // Enable chat inputs
    const userMessageInput = document.getElementById('userMessage');
    const sendMessageBtn = document.getElementById('sendMessage');
    const chatInputDesc = document.querySelector('#chatInput div:last-child');

    if (userMessageInput) userMessageInput.disabled = false;
    if (sendMessageBtn) sendMessageBtn.disabled = false;
    if (chatInputDesc) chatInputDesc.textContent = 'Ask about your vibration data...';

    if (state.chatMessages.length === 0) {
      addAssistantMessage("Hello! I'm your vibration analysis assistant. How can I help you analyze this session's data?");
    }
  } catch (error) {
    console.error('Error loading chat session:', error);
    if (window.showNotification) window.showNotification('Error loading chat session.', 'error');
  } finally {
    removeChatLoadingIndicator();
  }
}

export function addSessionToChat(session, selectIt = false) {
  const sessionSelector = document.getElementById('chatSessionSelector');
  if (!sessionSelector) return;

  const id = session.id || session._id;
  let exists = false;
  for (let i = 0; i < sessionSelector.options.length; i++) {
    if (sessionSelector.options[i].value === id) {
      exists = true;
      break;
    }
  }

  if (!exists) {
    const option = document.createElement('option');
    option.value = id;
    const sessionDate = new Date(session.startTime || session.createdAt).toLocaleDateString();
    option.textContent = `${session.name} (${sessionDate})`;
    sessionSelector.appendChild(option);
  }

  if (selectIt) {
    sessionSelector.value = id;
    loadChatSession(id);
  }
}

function showChatLoadingIndicator() {
  const chatMessages = document.getElementById('chatMessages');
  if (!chatMessages) return;

  const sessionSelector = chatMessages.querySelector('#chatSessionSelector')?.parentElement;
  chatMessages.innerHTML = '';
  if (sessionSelector) chatMessages.appendChild(sessionSelector);

  const indicator = document.createElement('div');
  indicator.id = 'chatLoadingIndicator';
  indicator.className = 'flex items-center justify-center py-4';
  indicator.innerHTML = `
    <div style="width: 24px; height: 24px; border: 2px solid #3b82f6; border-top-color: transparent; border-radius: 50%; animation: spin 1s linear infinite;"></div>
    <span style="margin-left: 8px; color: #9ca3af;">Loading chat history...</span>
  `;
  chatMessages.appendChild(indicator);
}

function removeChatLoadingIndicator() {
  document.getElementById('chatLoadingIndicator')?.remove();
}
