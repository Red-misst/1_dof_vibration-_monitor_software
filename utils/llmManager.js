import fetch from 'node-fetch';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CONFIG_PATH = path.join(__dirname, '..', 'data', 'config.json');
const TIMEOUT_MS = 10000;

class LlmManager {
  constructor() {
    this.provider = 'deepseek';
    this.apiKey = '';
    this.model = 'deepseek-chat';
    this.loadConfig();
  }

  loadConfig() {
    try {
      if (fs.existsSync(CONFIG_PATH)) {
        const data = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
        this.provider = data.provider || 'deepseek';
        this.apiKey = data.apiKey || data.DEEPSEEK_API_KEY || '';
        this.model = data.model || (this.provider === 'openai' ? 'gpt-4o-mini' : 'deepseek-chat');
      } else if (process.env.DEEPSEEK_API_KEY) {
        this.provider = 'deepseek';
        this.apiKey = process.env.DEEPSEEK_API_KEY;
        this.model = 'deepseek-chat';
      }
    } catch (err) {
      console.warn('[LLM] Failed to load configuration:', err.message);
    }
  }

  saveConfig() {
    try {
      const data = {
        provider: this.provider,
        apiKey: this.apiKey,
        model: this.model
      };
      fs.mkdirSync(path.dirname(CONFIG_PATH), { recursive: true });
      fs.writeFileSync(CONFIG_PATH, JSON.stringify(data, null, 2));
    } catch (err) {
      console.error('[LLM] Failed to save configuration:', err.message);
    }
  }

  updateConfig(provider, apiKey, model) {
    this.provider = provider;
    this.apiKey = apiKey;
    this.model = model || (provider === 'openai' ? 'gpt-4o-mini' : 'deepseek-chat');
    this.saveConfig();
  }

  async _fetchWithTimeout(url, options) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    try {
      const response = await fetch(url, { ...options, signal: controller.signal });
      clearTimeout(timer);
      return response;
    } catch (err) {
      clearTimeout(timer);
      throw err;
    }
  }

  getEndpoint() {
    if (this.provider === 'openai') {
      return 'https://api.openai.com/v1/chat/completions';
    }
    return 'https://api.deepseek.com/v1/chat/completions';
  }

  async chatCompletion({ messages, systemPrompt, temperature = 0.7 }) {
    if (!this.apiKey) {
      throw new Error('API key is not configured.');
    }

    const endpoint = this.getEndpoint();
    const formattedMessages = [];
    if (systemPrompt) {
      formattedMessages.push({ role: 'system', content: systemPrompt });
    }
    formattedMessages.push(...messages);

    const body = {
      model: this.model,
      messages: formattedMessages,
      temperature,
      max_tokens: 2048
    };

    const response = await this._fetchWithTimeout(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`
      },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`LLM Service Error (${this.provider}, status ${response.status}): ${errorText}`);
    }

    return response.json();
  }

  async testConnection(provider, apiKey, model) {
    const tempManager = new LlmManager();
    tempManager.provider = provider;
    tempManager.apiKey = apiKey;
    tempManager.model = model || (provider === 'openai' ? 'gpt-4o-mini' : 'deepseek-chat');

    await tempManager.chatCompletion({
      messages: [{ role: 'user', content: 'Say OK' }],
      max_tokens: 5
    });
  }

  async generateReportText(session, stats) {
    const contextPrompt = `Generate a comprehensive technical vibration analysis report for the following experiment session:
Session Name: ${session.name}
Date: ${new Date(session.startTime).toLocaleString()}
Duration: ${session.endTime ? Math.floor((new Date(session.endTime) - new Date(session.startTime)) / 1000) + ' seconds' : 'N/A'}
Readings: ${(session.zAxisData || []).length}
Natural Frequency: ${session.naturalFrequency?.toFixed(4) || 'Not detected'} Hz
Peak Amplitude: ${session.peakAmplitude?.toFixed(4) || 'N/A'} g
Q Factor: ${session.mechanicalProperties?.qFactor?.toFixed(2) || 'N/A'}
RMS Value: ${stats.rms?.toFixed(4) || 'N/A'} g
Bandwidth: ${session.mechanicalProperties?.bandwidth?.toFixed(4) || 'N/A'} Hz

Format the response EXACTLY in these sections, using markdown:
---
### Executive Summary
[Write a high-level overview of the findings, vibration severity, and major takeaways here]

---
### Technical Modal Analysis
[Provide an engineering interpretation of the resonance peak at ${session.naturalFrequency?.toFixed(2) || 'N/A'} Hz, its peak amplitude, the Q-factor of ${session.mechanicalProperties?.qFactor?.toFixed(2) || 'N/A'}, and what this implies about structural damping and stiffness]

---
### Root Cause Diagnostics
[Detail potential mechanical/structural causes for the vibration behavior, e.g. rotating imbalances, looseness, resonant excitation, bearing wear]

---
### Structural Engineering Recommendations
[List actionable engineering solutions, such as adding structural stiffeners, viscoelastic damping treatments, tuned mass dampers, or isolators]
---`;

    const systemPrompt = `You are a professional mechanical vibration and dynamic structural health monitoring engineer.
Generate mathematically sound, clear, and action-oriented technical reports.
Do not output title page or info summary tables, as they are drawn separately.
Provide only the four requested sections formatted with markdown headings and lists as specified.`;

    const result = await this.chatCompletion({
      messages: [{ role: 'user', content: contextPrompt }],
      systemPrompt,
      temperature: 0.5
    });

    const content = result.choices?.[0]?.message?.content;
    if (!content) throw new Error('Empty AI response.');
    return content;
  }
}

export default new LlmManager();
