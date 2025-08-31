const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');

console.log('[TTSService] Starting module load...');

/**
 * Text-to-Speech Service for RANI
 * Handles voice synthesis with multiple provider support
 */
class TTSService {
    constructor(modelStateService) {
        console.log('[TTSService] Constructor called');
        this.modelState = modelStateService;
        this.currentProvider = null;
        this.isPlaying = false;
        this.audioQueue = [];
        this.currentAudio = null;
        
        // TTS Provider configurations
        this.providers = {
            openai: {
                name: 'OpenAI TTS',
                models: ['tts-1', 'tts-1-hd'],
                voices: ['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer'],
                formats: ['mp3', 'opus', 'aac', 'flac'],
                endpoint: 'https://api.openai.com/v1/audio/speech'
            },
            elevenlabs: {
                name: 'ElevenLabs',
                models: ['eleven_monolingual_v1', 'eleven_multilingual_v1', 'eleven_multilingual_v2'],
                voices: [], // Will be populated dynamically
                formats: ['mp3'],
                endpoint: 'https://api.elevenlabs.io/v1/text-to-speech'
            }
        };

        // Audio cache for repeated phrases
        this.audioCache = new Map();
        this.maxCacheSize = 100;

        console.log('[TTSService] Before initialize method definition');
    }

    /**
     * Initialize TTS with current model settings
     */
    async initialize() {
        console.log('[TTSService] Initialize method called');
        try {
            const currentModel = await this.modelState.getCurrentModel();
            await this.setProvider(currentModel.ttsProvider || 'openai');
            console.log('[TTSService] Initialized with provider:', this.currentProvider);
        } catch (error) {
            console.error('[TTSService] Initialization failed:', error);
            // Fallback to OpenAI
            await this.setProvider('openai');
        }
    }

    /**
     * Set TTS provider
     */
    async setProvider(providerName) {
        console.log('[TTSService] setProvider called with:', providerName);
        if (!this.providers[providerName]) {
            throw new Error(`Unsupported TTS provider: ${providerName}`);
        }

        this.currentProvider = providerName;
        
        // Load provider-specific voices if needed
        if (providerName === 'elevenlabs') {
            await this.loadElevenLabsVoices();
        }

        console.log(`[TTSService] Switched to provider: ${providerName}`);
    }

    /**
     * Load available voices from ElevenLabs
     */
    async loadElevenLabsVoices() {
        try {
            const apiKey = await this.modelState.getApiKey('elevenlabs');
            if (!apiKey) {
                console.warn('[TTSService] No ElevenLabs API key found');
                return;
            }

            const response = await fetch('https://api.elevenlabs.io/v1/voices', {
                headers: {
                    'xi-api-key': apiKey
                }
            });

            if (response.ok) {
                const data = await response.json();
                this.providers.elevenlabs.voices = data.voices.map(voice => ({
                    id: voice.voice_id,
                    name: voice.name,
                    category: voice.category
                }));
                console.log(`[TTSService] Loaded ${data.voices.length} ElevenLabs voices`);
            }
        } catch (error) {
            console.error('[TTSService] Failed to load ElevenLabs voices:', error);
        }
    }

    /**
     * Generate speech from text
     */
    async speak(text, options = {}) {
        if (!text || text.trim().length === 0) {
            console.warn('[TTSService] Empty text provided for TTS');
            return null;
        }

        const {
            voice = 'shimmer',
            model = 'tts-1',
            speed = 1.0,
            interrupt = true,
            cache = true
        } = options;

        try {
            // Check cache first
            const cacheKey = this.getCacheKey(text, voice, model, speed);
            if (cache && this.audioCache.has(cacheKey)) {
                console.log('[TTSService] Using cached audio');
                return await this.playAudio(this.audioCache.get(cacheKey), interrupt);
            }

            // Interrupt current playback if requested
            if (interrupt && this.isPlaying) {
                await this.stopSpeaking();
            }

            console.log(`[TTSService] Generating speech for: "${text.substring(0, 50)}..."`);
            const audioBuffer = await this.generateSpeech(text, { voice, model, speed });
            
            if (!audioBuffer) {
                throw new Error('Failed to generate speech audio');
            }

            // Cache the audio
            if (cache) {
                this.cacheAudio(cacheKey, audioBuffer);
            }

            // Play the audio
            return await this.playAudio(audioBuffer, false);

        } catch (error) {
            console.error('[TTSService] Speech generation failed:', error);
            throw error;
        }
    }

    /**
     * Generate speech audio from text
     */
    async generateSpeech(text, options) {
        const { voice, model, speed } = options;
        
        switch (this.currentProvider) {
            case 'openai':
                return await this.generateOpenAISpeech(text, { voice, model, speed });
            case 'elevenlabs':
                return await this.generateElevenLabsSpeech(text, { voice, model });
            default:
                throw new Error(`Unsupported provider: ${this.currentProvider}`);
        }
    }

    /**
     * Generate speech using OpenAI TTS
     */
    async generateOpenAISpeech(text, options) {
        const { voice, model, speed } = options;
        const apiKey = await this.modelState.getApiKey('openai');
        
        if (!apiKey) {
            throw new Error('OpenAI API key not found');
        }

        const response = await fetch(this.providers.openai.endpoint, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: model,
                input: text,
                voice: voice,
                speed: speed,
                response_format: 'mp3'
            })
        });

        if (!response.ok) {
            const error = await response.text();
            throw new Error(`OpenAI TTS API error: ${response.status} - ${error}`);
        }

        return await response.arrayBuffer();
    }

    /**
     * Generate speech using ElevenLabs
     */
    async generateElevenLabsSpeech(text, options) {
        const { voice, model } = options;
        const apiKey = await this.modelState.getApiKey('elevenlabs');
        
        if (!apiKey) {
            throw new Error('ElevenLabs API key not found');
        }

        // Find voice ID
        const voiceId = this.getElevenLabsVoiceId(voice);
        if (!voiceId) {
            throw new Error(`Voice not found: ${voice}`);
        }

        const response = await fetch(`${this.providers.elevenlabs.endpoint}/${voiceId}`, {
            method: 'POST',
            headers: {
                'Accept': 'audio/mpeg',
                'xi-api-key': apiKey,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                text: text,
                model_id: model,
                voice_settings: {
                    stability: 0.5,
                    similarity_boost: 0.5
                }
            })
        });

        if (!response.ok) {
            const error = await response.text();
            throw new Error(`ElevenLabs TTS API error: ${response.status} - ${error}`);
        }

        return await response.arrayBuffer();
    }

    /**
     * Get ElevenLabs voice ID from voice name
     */
    getElevenLabsVoiceId(voiceName) {
        const voice = this.providers.elevenlabs.voices.find(v => 
            v.name.toLowerCase() === voiceName.toLowerCase() || v.id === voiceName
        );
        return voice ? voice.id : null;
    }

    /**
     * Play audio buffer
     */
    async playAudio(audioBuffer, interrupt = false) {
        try {
            this.isPlaying = true;
            
            // In Electron main process, we need to send audio to renderer for playback
            const { BrowserWindow } = require('electron');
            const focusedWindow = BrowserWindow.getFocusedWindow();
            let targetWindow = focusedWindow;
            
            if (!targetWindow || targetWindow.isDestroyed()) {
                // Try to find any available window
                const allWindows = BrowserWindow.getAllWindows();
                targetWindow = allWindows.find(win => !win.isDestroyed());
                
                if (!targetWindow) {
                    throw new Error('No available window for audio playback');
                }
            }
            
            await this.playAudioInRenderer(targetWindow, audioBuffer, interrupt);
            this.isPlaying = false;
        } catch (error) {
            this.isPlaying = false;
            console.error('[TTSService] Audio playback failed:', error);
            throw error;
        }
    }

    /**
     * Send audio to renderer process for playback
     */
    async playAudioInRenderer(window, audioBuffer, interrupt) {
        // Convert ArrayBuffer to Base64 for IPC transmission
        const base64Audio = Buffer.from(audioBuffer).toString('base64');
        
        try {
            // Use invoke pattern to directly call the renderer handler
            const result = await window.webContents.executeJavaScript(`
                window.api.voice.playAudio('${base64Audio}')
            `);
            
            console.log('[TTSService] Audio playback completed successfully');
            return result;
        } catch (error) {
            console.error('[TTSService] Audio playback failed:', error);
            throw error;
        }
    }

    /**
     * Stop current speech
     */
    async stopSpeaking() {
        if (this.currentAudio) {
            this.currentAudio.stop();
            this.currentAudio = null;
        }
        
        this.isPlaying = false;
        this.audioQueue = [];
        
        console.log('[TTSService] Speech stopped');
    }

    /**
     * Check if currently speaking
     */
    isSpeaking() {
        return this.isPlaying;
    }

    /**
     * Get available voices for current provider
     */
    getAvailableVoices() {
        if (!this.currentProvider) {
            return [];
        }

        const provider = this.providers[this.currentProvider];
        if (this.currentProvider === 'openai') {
            return provider.voices.map(voice => ({
                id: voice,
                name: voice,
                provider: 'openai'
            }));
        } else if (this.currentProvider === 'elevenlabs') {
            return provider.voices.map(voice => ({
                id: voice.id,
                name: voice.name,
                category: voice.category,
                provider: 'elevenlabs'
            }));
        }

        return [];
    }

    /**
     * Get cache key for audio caching
     */
    getCacheKey(text, voice, model, speed) {
        const content = `${text}|${voice}|${model}|${speed}|${this.currentProvider}`;
        return crypto.createHash('md5').update(content).digest('hex');
    }

    /**
     * Cache audio for reuse
     */
    cacheAudio(key, audioBuffer) {
        // Implement LRU cache behavior
        if (this.audioCache.size >= this.maxCacheSize) {
            const firstKey = this.audioCache.keys().next().value;
            this.audioCache.delete(firstKey);
        }
        
        this.audioCache.set(key, audioBuffer);
    }

    /**
     * Clear audio cache
     */
    clearCache() {
        this.audioCache.clear();
        console.log('[TTSService] Audio cache cleared');
    }

    /**
     * Get service status
     */
    getStatus() {
        return {
            provider: this.currentProvider,
            isPlaying: this.isPlaying,
            cacheSize: this.audioCache.size,
            availableProviders: Object.keys(this.providers),
            voices: this.getAvailableVoices()
        };
    }
}

console.log('[TTSService] Class defined, exporting...');
module.exports = TTSService;
console.log('[TTSService] Module export complete');
