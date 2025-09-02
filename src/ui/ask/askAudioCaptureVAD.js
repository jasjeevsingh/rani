// Enhanced Audio capture with Voice Activity Detection for Ask window
import { MicVAD, utils } from '@ricky0123/vad-web';

class AskAudioCaptureVAD {
    constructor() {
        this.mediaStream = null;
        this.audioContext = null;
        this.vad = null;
        this.isCapturing = false;
        this.isConversationMode = false;
        this.isSpeaking = false;
        this.isProcessing = false;
        
        // Audio configuration
        this.SAMPLE_RATE = 16000; // VAD works best with 16kHz
        this.BUFFER_SIZE = 4096;
        
        // VAD Configuration
        this.vadConfig = {
            // Model quality: 'silero' (best) or 'legacy' (faster)
            model: 'silero',
            // Voice probability threshold (0-1, higher = more selective)
            startThreshold: 0.7,
            endThreshold: 0.35,
            // Minimum silence duration to end speech (ms)
            minSilenceMs: 1000,
            // Maximum speech duration before forced segmentation (ms) 
            maxSpeechMs: 30000,
            // Audio preprocessing
            frameLengthMs: 30,
        };
        
        // Audio buffers and state
        this.currentSpeechBuffer = [];
        this.speechSegments = [];
        this.lastSpeechTime = 0;
        this.speechStartTime = 0;
        
        // Callbacks
        this.onSpeechStart = null;
        this.onSpeechEnd = null;
        this.onSpeechSegment = null;
        this.onVoiceActivity = null;
        this.onInterruption = null;
        
        // Initialize event handlers
        this.setupEventHandlers();
    }

    setupEventHandlers() {
        // Bind methods to preserve context
        this.handleVADSpeechStart = this.handleVADSpeechStart.bind(this);
        this.handleVADSpeechEnd = this.handleVADSpeechEnd.bind(this);
        this.handleVADAudio = this.handleVADAudio.bind(this);
    }

    /**
     * Initialize VAD with the current configuration
     */
    async initializeVAD() {
        try {
            console.log('[VAD] Initializing Voice Activity Detection...');
            
            this.vad = await MicVAD.new({
                ...this.vadConfig,
                onSpeechStart: this.handleVADSpeechStart,
                onSpeechEnd: this.handleVADSpeechEnd,
                onVADMisfire: (audio) => {
                    console.log('[VAD] Misfire detected, ignoring short audio segment');
                },
            });

            console.log('[VAD] VAD initialized successfully');
            return true;
        } catch (error) {
            console.error('[VAD] Failed to initialize VAD:', error);
            return false;
        }
    }

    /**
     * Start continuous conversation mode with VAD
     */
    async startConversationMode() {
        if (this.isConversationMode) {
            console.warn('[VAD] Conversation mode already active');
            return false;
        }

        try {
            // Initialize VAD if not already done
            if (!this.vad) {
                const vadReady = await this.initializeVAD();
                if (!vadReady) {
                    throw new Error('Failed to initialize VAD');
                }
            }

            // Start VAD listening
            await this.vad.start();
            
            this.isConversationMode = true;
            this.speechSegments = [];
            
            console.log('[VAD] Conversation mode started - speak naturally!');
            
            // Notify UI
            this.notifyStateChange('conversationStarted');
            
            return true;
        } catch (error) {
            console.error('[VAD] Failed to start conversation mode:', error);
            this.cleanup();
            return false;
        }
    }

    /**
     * Stop conversation mode
     */
    async stopConversationMode() {
        if (!this.isConversationMode) {
            return;
        }

        try {
            if (this.vad) {
                this.vad.pause();
            }
            
            this.isConversationMode = false;
            this.isSpeaking = false;
            this.isProcessing = false;
            
            // Process any remaining speech in buffer
            if (this.currentSpeechBuffer.length > 0) {
                await this.processSpeechSegment(this.currentSpeechBuffer);
                this.currentSpeechBuffer = [];
            }
            
            console.log('[VAD] Conversation mode stopped');
            
            // Notify UI
            this.notifyStateChange('conversationEnded');
            
        } catch (error) {
            console.error('[VAD] Error stopping conversation mode:', error);
        }
    }

    /**
     * Handle speech start detection from VAD
     */
    handleVADSpeechStart() {
        if (!this.isConversationMode) return;
        
        console.log('[VAD] Speech started');
        this.speechStartTime = Date.now();
        this.currentSpeechBuffer = [];
        this.isSpeaking = true;
        
        // Check if we need to interrupt AI speech
        if (this.isAISpeaking()) {
            this.handleInterruption();
        }
        
        // Notify callbacks
        if (this.onSpeechStart) {
            this.onSpeechStart();
        }
        
        // Update UI
        this.notifyStateChange('speechStarted');
        this.updateVoiceActivity(true);
    }

    /**
     * Handle speech end detection from VAD
     */
    async handleVADSpeechEnd(audio) {
        if (!this.isConversationMode) return;
        
        console.log('[VAD] Speech ended, processing audio segment');
        this.isSpeaking = false;
        this.lastSpeechTime = Date.now();
        
        // Convert Float32Array to the format we need
        const audioBuffer = Array.from(audio);
        this.currentSpeechBuffer.push(...audioBuffer);
        
        // Process the complete speech segment
        await this.processSpeechSegment(this.currentSpeechBuffer);
        this.currentSpeechBuffer = [];
        
        // Notify callbacks
        if (this.onSpeechEnd) {
            this.onSpeechEnd(audioBuffer);
        }
        
        // Update UI
        this.notifyStateChange('speechEnded');
        this.updateVoiceActivity(false);
    }

    /**
     * Process a complete speech segment
     */
    async processSpeechSegment(audioBuffer) {
        if (!audioBuffer || audioBuffer.length === 0) {
            console.log('[VAD] Empty audio buffer, skipping processing');
            return;
        }

        try {
            console.log(`[VAD] Processing speech segment: ${audioBuffer.length} samples`);
            this.isProcessing = true;
            this.notifyStateChange('processingStarted');
            
            // Convert audio buffer to the format needed for STT
            const pcm16 = this.convertFloat32ToInt16(new Float32Array(audioBuffer));
            const base64Data = this.arrayBufferToBase64(pcm16.buffer);
            
            // Send to speech-to-text service
            const result = await window.api.askView.sendAudioData(base64Data, 'audio/pcm;rate=16000');
            
            if (result && result.transcript) {
                console.log('[VAD] Transcription received:', result.transcript);
                
                // Store speech segment
                this.speechSegments.push({
                    timestamp: Date.now(),
                    transcript: result.transcript,
                    audioLength: audioBuffer.length,
                    duration: audioBuffer.length / this.SAMPLE_RATE
                });
                
                // Notify callbacks
                if (this.onSpeechSegment) {
                    this.onSpeechSegment(result.transcript, audioBuffer);
                }
                
                // Send for AI processing
                await this.processUserMessage(result.transcript);
            }
            
        } catch (error) {
            console.error('[VAD] Error processing speech segment:', error);
        } finally {
            this.isProcessing = false;
            this.notifyStateChange('processingEnded');
        }
    }

    /**
     * Process user message and get AI response
     */
    async processUserMessage(transcript) {
        try {
            console.log('[VAD] Processing user message:', transcript);
            
            // Send message to ask service for AI response
            const result = await window.api.askView.sendMessage(transcript);
            
            if (result && result.success) {
                console.log('[VAD] AI response generated');
                // The AI response will be handled by the existing TTS system
            }
            
        } catch (error) {
            console.error('[VAD] Error processing user message:', error);
        }
    }

    /**
     * Handle interruption when user speaks during AI speech
     */
    handleInterruption() {
        console.log('[VAD] User interruption detected, pausing AI speech');
        
        try {
            // Stop any ongoing TTS
            if (window.api?.voice?.tts?.stop) {
                window.api.voice.tts.stop();
            }
            
            // Notify about interruption
            if (this.onInterruption) {
                this.onInterruption();
            }
            
            this.notifyStateChange('interrupted');
            
        } catch (error) {
            console.error('[VAD] Error handling interruption:', error);
        }
    }

    /**
     * Check if AI is currently speaking
     */
    isAISpeaking() {
        // This would need to be integrated with your TTS system
        // For now, we'll check if there's an active TTS session
        return window.api?.voice?.tts?.isPlaying?.() || false;
    }

    /**
     * Set callback functions
     */
    setCallbacks({
        onSpeechStart,
        onSpeechEnd, 
        onSpeechSegment,
        onVoiceActivity,
        onInterruption
    }) {
        this.onSpeechStart = onSpeechStart;
        this.onSpeechEnd = onSpeechEnd;
        this.onSpeechSegment = onSpeechSegment;
        this.onVoiceActivity = onVoiceActivity;
        this.onInterruption = onInterruption;
    }

    /**
     * Update VAD configuration
     */
    updateVADConfig(newConfig) {
        this.vadConfig = { ...this.vadConfig, ...newConfig };
        
        // If VAD is running, we need to restart it with new config
        if (this.isConversationMode) {
            console.log('[VAD] Updating configuration, restarting...');
            this.stopConversationMode().then(() => {
                this.startConversationMode();
            });
        }
    }

    /**
     * Get current conversation state
     */
    getState() {
        return {
            isConversationMode: this.isConversationMode,
            isSpeaking: this.isSpeaking,
            isProcessing: this.isProcessing,
            speechSegments: this.speechSegments,
            vadConfig: this.vadConfig
        };
    }

    /**
     * Get speech segments for the current conversation
     */
    getSpeechSegments() {
        return [...this.speechSegments];
    }

    /**
     * Clear speech history
     */
    clearSpeechHistory() {
        this.speechSegments = [];
        console.log('[VAD] Speech history cleared');
    }

    /**
     * Convert Float32Array to Int16Array for PCM encoding
     */
    convertFloat32ToInt16(float32Array) {
        const int16Array = new Int16Array(float32Array.length);
        for (let i = 0; i < float32Array.length; i++) {
            const s = Math.max(-1, Math.min(1, float32Array[i]));
            int16Array[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
        }
        return int16Array;
    }

    /**
     * Convert ArrayBuffer to base64 string
     */
    arrayBufferToBase64(buffer) {
        let binary = '';
        const bytes = new Uint8Array(buffer);
        const len = bytes.byteLength;
        for (let i = 0; i < len; i++) {
            binary += String.fromCharCode(bytes[i]);
        }
        return btoa(binary);
    }

    /**
     * Update visual voice activity indicator
     */
    updateVoiceActivity(isActive) {
        const askView = document.querySelector('ask-view');
        if (askView && askView.updateVoiceActivity) {
            askView.updateVoiceActivity(isActive);
        }
        
        if (this.onVoiceActivity) {
            this.onVoiceActivity(isActive);
        }
    }

    /**
     * Notify state changes to UI components
     */
    notifyStateChange(event, data = {}) {
        const askView = document.querySelector('ask-view');
        if (askView && askView.handleVADStateChange) {
            askView.handleVADStateChange(event, data);
        }
        
        // Also dispatch custom events
        window.dispatchEvent(new CustomEvent(`vad-${event}`, { 
            detail: { ...data, state: this.getState() } 
        }));
    }

    /**
     * Cleanup resources
     */
    cleanup() {
        console.log('[VAD] Cleaning up resources...');
        
        if (this.vad) {
            try {
                this.vad.destroy();
            } catch (error) {
                console.error('[VAD] Error destroying VAD:', error);
            }
            this.vad = null;
        }
        
        this.isConversationMode = false;
        this.isSpeaking = false;
        this.isProcessing = false;
        this.currentSpeechBuffer = [];
        this.speechSegments = [];
    }

    /**
     * Check if conversation mode is active
     */
    isActive() {
        return this.isConversationMode;
    }
}

// Create and export global instance
window.askAudioCaptureVAD = new AskAudioCaptureVAD();

export default window.askAudioCaptureVAD;
