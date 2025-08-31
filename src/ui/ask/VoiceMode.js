import { LitElement, html, css } from '../assets/lit-core-2.7.4.min.js';

/**
 * Voice Mode Component for RANI Ask Feature
 * Provides voice conversation interface with visual feedback
 */
export class VoiceMode extends LitElement {
    static properties = {
        isActive: { type: Boolean },
        isListening: { type: Boolean },
        isSpeaking: { type: Boolean },
        isProcessing: { type: Boolean },
        currentTranscript: { type: String },
        conversationHistory: { type: Array },
        voiceConfig: { type: Object },
        error: { type: String }
    };

    static styles = css`
        :host {
            display: block;
            width: 100%;
            background: var(--main-content-background, rgba(0, 0, 0, 0.8));
            color: var(--text-color, #e5e5e7);
            border-radius: 8px;
            padding: 1rem;
            font-family: 'Helvetica Neue', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }

        .voice-container {
            display: flex;
            flex-direction: column;
            gap: 1rem;
            height: 100%;
        }

        .voice-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding-bottom: 0.75rem;
            border-bottom: 1px solid var(--border-color, rgba(255, 255, 255, 0.2));
        }

        .voice-title {
            display: flex;
            align-items: center;
            gap: 0.5rem;
            font-size: 1rem;
            font-weight: 600;
        }

        .voice-title-icon {
            width: 18px;
            height: 18px;
            color: var(--text-color, #e5e5e7);
        }

        .voice-status {
            display: flex;
            align-items: center;
            gap: 0.5rem;
            font-size: 0.875rem;
            color: var(--description-color, rgba(255, 255, 255, 0.6));
        }

        .status-indicator {
            width: 8px;
            height: 8px;
            border-radius: 50%;
            background: var(--description-color, rgba(255, 255, 255, 0.6));
        }

        .status-indicator.listening {
            background: #00ff00;
            animation: pulse 1.5s infinite;
        }

        .status-indicator.speaking {
            background: #007aff;
            animation: pulse 1s infinite;
        }

        .status-indicator.processing {
            background: #ff9500;
            animation: spin 1s linear infinite;
        }

        @keyframes pulse {
            0%, 100% { opacity: 1; transform: scale(1); }
            50% { opacity: 0.7; transform: scale(1.2); }
        }

        @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
        }

        .voice-controls {
            display: flex;
            gap: 0.5rem;
            align-items: center;
        }

        .control-button {
            display: flex;
            align-items: center;
            justify-content: center;
            width: 32px;
            height: 32px;
            border: 1px solid var(--border-color, rgba(255, 255, 255, 0.2));
            border-radius: 6px;
            background: var(--button-background, rgba(0, 0, 0, 0.5));
            color: var(--text-color, #e5e5e7);
            cursor: pointer;
            transition: all 0.2s;
            padding: 0;
        }

        .control-button:hover {
            background: var(--hover-background, rgba(255, 255, 255, 0.1));
            border-color: var(--border-color, rgba(255, 255, 255, 0.3));
        }

        .control-button:disabled {
            opacity: 0.5;
            cursor: not-allowed;
        }

        .control-button.primary {
            background: var(--text-input-button-background, #007aff);
            border-color: var(--text-input-button-background, #007aff);
            color: white;
        }

        .control-button.primary:hover {
            background: var(--text-input-button-hover, #0056b3);
            border-color: var(--text-input-button-hover, #0056b3);
        }

        .control-button.danger {
            background: #ff3b30;
            border-color: #ff3b30;
            color: white;
        }

        .control-button.danger:hover {
            background: #d70015;
            border-color: #d70015;
        }

        .control-button svg {
            width: 14px;
            height: 14px;
            stroke: currentColor;
        }

        .transcript-area {
            flex: 1;
            display: flex;
            flex-direction: column;
            gap: 0.75rem;
            min-height: 200px;
            max-height: 400px;
            overflow-y: auto;
        }

        .current-transcript {
            padding: 0.75rem;
            background: var(--input-background, rgba(0, 0, 0, 0.3));
            border: 1px solid var(--border-color, rgba(255, 255, 255, 0.2));
            border-radius: 6px;
            min-height: 60px;
            display: flex;
            align-items: center;
            font-size: 0.875rem;
            line-height: 1.4;
            transition: all 0.2s ease;
        }

        .current-transcript.listening {
            border-color: #00ff00;
            box-shadow: 0 0 0 1px rgba(0, 255, 0, 0.3);
        }

        .current-transcript.processing {
            border-color: #ff9500;
            box-shadow: 0 0 0 1px rgba(255, 149, 0, 0.3);
        }

        .transcript-placeholder {
            color: var(--description-color, rgba(255, 255, 255, 0.6));
            font-style: italic;
        }

        .conversation-history {
            display: flex;
            flex-direction: column;
            gap: 0.5rem;
        }

        .message {
            padding: 0.75rem;
            border-radius: 8px;
            max-width: 85%;
            word-wrap: break-word;
            font-size: 0.875rem;
            line-height: 1.4;
        }

        .message.user {
            align-self: flex-end;
            background: var(--text-input-button-background, #007aff);
            color: white;
        }

        .message.assistant {
            align-self: flex-start;
            background: var(--header-background, rgba(0, 0, 0, 0.8));
            border: 1px solid var(--border-color, rgba(255, 255, 255, 0.2));
            color: var(--text-color, #e5e5e7);
        }

        .message-time {
            font-size: 0.75rem;
            opacity: 0.7;
            margin-top: 0.25rem;
        }

        .voice-settings {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
            gap: 1rem;
            padding: 0.75rem;
            background: var(--header-background, rgba(0, 0, 0, 0.8));
            border: 1px solid var(--border-color, rgba(255, 255, 255, 0.2));
            border-radius: 6px;
            font-size: 0.875rem;
        }

        .setting-group {
            display: flex;
            flex-direction: column;
            gap: 0.25rem;
        }

        .setting-label {
            font-weight: 500;
            color: var(--text-color, #e5e5e7);
            font-size: 0.8rem;
        }

        .setting-select {
            padding: 0.4rem 0.6rem;
            background: var(--input-background, rgba(0, 0, 0, 0.3));
            border: 1px solid var(--border-color, rgba(255, 255, 255, 0.2));
            border-radius: 4px;
            color: var(--text-color, #e5e5e7);
            font-size: 0.8rem;
            transition: border-color 0.2s ease;
        }

        .setting-select:focus {
            outline: none;
            border-color: var(--text-input-button-background, #007aff);
        }

        .error-message {
            padding: 0.75rem;
            background: rgba(255, 59, 48, 0.1);
            border: 1px solid rgba(255, 59, 48, 0.3);
            border-radius: 6px;
            color: #ff3b30;
            font-size: 0.875rem;
            display: flex;
            align-items: center;
            gap: 0.5rem;
        }

        .error-icon {
            width: 16px;
            height: 16px;
            color: #ff3b30;
        }

        .empty-state {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            padding: 2rem;
            text-align: center;
            color: var(--description-color, rgba(255, 255, 255, 0.6));
        }

        .empty-state-icon {
            width: 48px;
            height: 48px;
            margin-bottom: 1rem;
            color: var(--description-color, rgba(255, 255, 255, 0.4));
        }

        .empty-state-title {
            font-size: 1.1rem;
            font-weight: 600;
            margin-bottom: 0.5rem;
            color: var(--text-color, #e5e5e7);
        }

        .hidden {
            display: none;
        }

        /* Scrollbar styling */
        .transcript-area::-webkit-scrollbar {
            width: 6px;
        }

        .transcript-area::-webkit-scrollbar-track {
            background: rgba(255, 255, 255, 0.05);
            border-radius: 3px;
        }

        .transcript-area::-webkit-scrollbar-thumb {
            background: rgba(255, 255, 255, 0.2);
            border-radius: 3px;
        }

        .transcript-area::-webkit-scrollbar-thumb:hover {
            background: rgba(255, 255, 255, 0.3);
        }
    `;

    constructor() {
        super();
        this.isActive = false;
        this.isListening = false;
        this.isSpeaking = false;
        this.isProcessing = false;
        this.currentTranscript = '';
        this.conversationHistory = [];
        this.voiceConfig = {
            voice: 'echo', // Change this to match your desired voice
            model: 'tts-1',
            speed: 2.0
        };
        this.error = '';
        this.availableVoices = [];

        this.setupEventListeners();
    }

    connectedCallback() {
        super.connectedCallback();
        this.loadVoiceSettings();
    }

    disconnectedCallback() {
        super.disconnectedCallback();
        this.cleanup();
    }

    setupEventListeners() {
        // Set up voice event listeners
        if (window.api?.voice) {
            window.api.voice.onConversationStarted((data) => {
                this.isActive = true;
                this.error = '';
                this.requestUpdate();
            });

            window.api.voice.onConversationEnded((data) => {
                this.isActive = false;
                this.isListening = false;
                this.isSpeaking = false;
                this.isProcessing = false;
                this.currentTranscript = '';
                this.requestUpdate();
            });

            window.api.voice.onTranscriptUpdate((data) => {
                this.currentTranscript = data.text || '';
                this.requestUpdate();
            });

            window.api.voice.onUserMessage((data) => {
                this.conversationHistory = [...this.conversationHistory, data];
                this.currentTranscript = '';
                this.requestUpdate();
            });

            window.api.voice.onAiResponse((data) => {
                this.conversationHistory = [...this.conversationHistory, data];
                this.requestUpdate();
            });

            window.api.voice.onListeningStarted((data) => {
                this.isListening = true;
                this.isProcessing = false;
                this.requestUpdate();
            });

            window.api.voice.onListeningStopped((data) => {
                this.isListening = false;
                this.requestUpdate();
            });

            window.api.voice.onSpeakingStarted((data) => {
                this.isSpeaking = true;
                this.isProcessing = false;
                this.requestUpdate();
            });

            window.api.voice.onSpeakingEnded((data) => {
                this.isSpeaking = false;
                this.requestUpdate();
            });

            window.api.voice.onVoiceError((data) => {
                this.error = data.error?.message || 'Voice error occurred';
                this.isProcessing = false;
                this.requestUpdate();
            });
        }
    }

    async loadVoiceSettings() {
        try {
            const voices = await window.api.voice.tts.getVoices();
            this.availableVoices = voices || [];
            this.requestUpdate();
        } catch (error) {
            console.error('[VoiceMode] Failed to load voice settings:', error);
        }
    }

    async startVoiceMode() {
        try {
            this.error = '';
            const result = await window.api.voice.ask.enableVoiceMode({
                voice: this.voiceConfig.voice,
                model: this.voiceConfig.model,
                speed: this.voiceConfig.speed,
                greeting: "Hi! I'm ready to chat. What would you like to talk about?"
            });

            if (!result.success) {
                this.error = result.error || 'Failed to start voice mode';
                this.requestUpdate();
            }
        } catch (error) {
            console.error('[VoiceMode] Failed to start voice mode:', error);
            this.error = error.message || 'Failed to start voice mode';
            this.requestUpdate();
        }
    }

    async stopVoiceMode() {
        try {
            await window.api.voice.ask.disableVoiceMode();
        } catch (error) {
            console.error('[VoiceMode] Failed to stop voice mode:', error);
        }
    }

    async interruptSpeech() {
        try {
            await window.api.voice.conversation.interrupt();
        } catch (error) {
            console.error('[VoiceMode] Failed to interrupt speech:', error);
        }
    }

    async clearHistory() {
        try {
            await window.api.voice.conversation.clearHistory();
            this.conversationHistory = [];
            this.requestUpdate();
        } catch (error) {
            console.error('[VoiceMode] Failed to clear history:', error);
        }
    }

    handleVoiceChange(event) {
        this.voiceConfig.voice = event.target.value;
        this.updateVoiceConfig();
    }

    handleModelChange(event) {
        this.voiceConfig.model = event.target.value;
        this.updateVoiceConfig();
    }

    handleSpeedChange(event) {
        this.voiceConfig.speed = parseFloat(event.target.value);
        this.updateVoiceConfig();
    }

    async updateVoiceConfig() {
        if (this.isActive) {
            try {
                await window.api.voice.conversation.updateConfig(this.voiceConfig);
            } catch (error) {
                console.error('[VoiceMode] Failed to update voice config:', error);
            }
        }
    }

    formatTime(timestamp) {
        return new Date(timestamp).toLocaleTimeString([], { 
            hour: '2-digit', 
            minute: '2-digit' 
        });
    }

    getStatusText() {
        if (this.isProcessing) return 'Processing...';
        if (this.isSpeaking) return 'Speaking';
        if (this.isListening) return 'Listening';
        if (this.isActive) return 'Ready';
        return 'Voice mode off';
    }

    getStatusClass() {
        if (this.isProcessing) return 'processing';
        if (this.isSpeaking) return 'speaking';
        if (this.isListening) return 'listening';
        return '';
    }

    cleanup() {
        // Remove event listeners
        if (window.api?.voice) {
            // Note: In a real implementation, you'd store the callback references
            // and call the remove methods properly
        }
    }

    render() {
        return html`
            <div class="voice-container">
                <div class="voice-header">
                    <div class="voice-title">
                        <svg class="voice-title-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
                            <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
                            <line x1="12" y1="19" x2="12" y2="23"/>
                            <line x1="8" y1="23" x2="16" y2="23"/>
                        </svg>
                        Voice Conversation
                    </div>
                    <div class="voice-status">
                        <div class="status-indicator ${this.getStatusClass()}"></div>
                        <span>${this.getStatusText()}</span>
                    </div>
                    <div class="voice-controls">
                        ${this.isActive ? html`
                            <button 
                                class="control-button" 
                                @click="${this.interruptSpeech}"
                                ?disabled="${!this.isSpeaking}"
                                title="Interrupt speech">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <rect x="6" y="4" width="4" height="16"/>
                                    <rect x="14" y="4" width="4" height="16"/>
                                </svg>
                            </button>
                            <button 
                                class="control-button" 
                                @click="${this.clearHistory}"
                                title="Clear conversation">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <path d="M3 6h18"/>
                                    <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/>
                                    <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>
                                </svg>
                            </button>
                            <button 
                                class="control-button danger" 
                                @click="${this.stopVoiceMode}"
                                title="Stop voice mode">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <line x1="18" y1="6" x2="6" y2="18"/>
                                    <line x1="6" y1="6" x2="18" y2="18"/>
                                </svg>
                            </button>
                        ` : html`
                            <button 
                                class="control-button primary" 
                                @click="${this.startVoiceMode}"
                                title="Start voice mode">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <polygon points="5,3 19,12 5,21"/>
                                </svg>
                            </button>
                        `}
                    </div>
                </div>

                ${this.error ? html`
                    <div class="error-message">
                        <svg class="error-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <circle cx="12" cy="12" r="10"/>
                            <line x1="15" y1="9" x2="9" y2="15"/>
                            <line x1="9" y1="9" x2="15" y2="15"/>
                        </svg>
                        ${this.error}
                    </div>
                ` : ''}

                ${this.isActive ? html`
                    <div class="current-transcript ${this.isListening ? 'listening' : ''} ${this.isProcessing ? 'processing' : ''}">
                        ${this.currentTranscript || html`
                            <span class="transcript-placeholder">
                                ${this.isListening ? 'Listening... speak now' : 
                                  this.isProcessing ? 'Processing your request...' :
                                  this.isSpeaking ? 'AI is speaking...' : 
                                  'Ready to listen'}
                            </span>
                        `}
                    </div>

                    <div class="transcript-area">
                        <div class="conversation-history">
                            ${this.conversationHistory.length > 0 ? 
                                this.conversationHistory.map(msg => html`
                                    <div class="message ${msg.role}">
                                        <div>${msg.content}</div>
                                        <div class="message-time">${this.formatTime(msg.timestamp)}</div>
                                    </div>
                                `) : html`
                                    <div class="empty-state">
                                        <svg class="empty-state-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                                            <path d="M8 12h.01"/>
                                            <path d="M12 12h.01"/>
                                            <path d="M16 12h.01"/>
                                            <path d="M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/>
                                        </svg>
                                        <div class="empty-state-title">Start a conversation</div>
                                        <div>Speak to begin your voice chat with RANI</div>
                                    </div>
                                `
                            }
                        </div>
                    </div>

                    <div class="voice-settings">
                        <div class="setting-group">
                            <label class="setting-label">Voice</label>
                            <select class="setting-select" @change="${this.handleVoiceChange}" .value="${this.voiceConfig.voice}">
                                ${this.availableVoices.map(voice => html`
                                    <option value="${voice.id}">${voice.name}</option>
                                `)}
                            </select>
                        </div>
                        <div class="setting-group">
                            <label class="setting-label">Quality</label>
                            <select class="setting-select" @change="${this.handleModelChange}" .value="${this.voiceConfig.model}">
                                <option value="tts-1">Standard</option>
                                <option value="tts-1-hd">HD Quality</option>
                            </select>
                        </div>
                        <div class="setting-group">
                            <label class="setting-label">Speed</label>
                            <select class="setting-select" @change="${this.handleSpeedChange}" .value="${this.voiceConfig.speed}">
                                <option value="0.75">Slow</option>
                                <option value="1.0">Normal</option>
                                <option value="1.25">Fast</option>
                                <option value="1.5">Very Fast</option>
                            </select>
                        </div>
                    </div>
                ` : html`
                    <div class="empty-state">
                        <svg class="empty-state-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                            <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
                            <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
                            <line x1="12" y1="19" x2="12" y2="23"/>
                            <line x1="8" y1="23" x2="16" y2="23"/>
                        </svg>
                        <div class="empty-state-title">Voice Mode</div>
                        <div>Click the start button to begin a voice conversation with RANI</div>
                    </div>
                `}
            </div>
        `;
    }
}

customElements.define('voice-mode', VoiceMode);
