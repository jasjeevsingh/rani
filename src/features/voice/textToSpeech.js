console.log('[TTSService] Module loading...');

const VOICE_CONFIG = require('./voiceConfig');

class TTSService {
    constructor(modelStateService) {
        console.log('[TTSService] Constructor called');
        this.modelState = modelStateService;
        this.isPlaying = false;
        this.audioQueue = [];
        this.currentAudio = null;
        this.processingQueue = false;
    }

    async speak(text, options = {}) {
        console.log('[TTSService] speak called with text length:', text.length);
        
        const voice = options.voice || VOICE_CONFIG.defaultVoice;
        const model = options.model || VOICE_CONFIG.model || 'tts-1';
        // Clamp speed between 0.25 and 4.0 (OpenAI TTS limits)
        const speed = Math.max(0.25, Math.min(4.0, options.speed || VOICE_CONFIG.speed || 1.0));
        
        console.log('[TTSService] Using voice:', voice, 'model:', model, 'speed:', speed);
        
        // Get API key using the available method
        const allApiKeys = await this.modelState.getAllApiKeys();
        const apiKey = allApiKeys.openai;
        
        if (!apiKey) {
            throw new Error('OpenAI API key not found');
        }

        const response = await fetch('https://api.openai.com/v1/audio/speech', {
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
            const errorText = await response.text().catch(() => 'Unknown error');
            console.error('[TTSService] OpenAI TTS API error:', response.status, errorText);
            throw new Error(`OpenAI TTS API error: ${response.status} - ${errorText}`);
        }

        const audioBuffer = await response.arrayBuffer();
        
        const { BrowserWindow } = require('electron');
        const window = BrowserWindow.getFocusedWindow() || BrowserWindow.getAllWindows()[0];
        
        if (window) {
            const base64Audio = Buffer.from(audioBuffer).toString('base64');
            
            // If interrupt is requested, clear queue and stop current audio
            if (options.interrupt) {
                console.log('[TTSService] Interrupting - clearing queue and stopping current audio');
                this.audioQueue = [];
                this.isPlaying = false;
                await window.webContents.executeJavaScript(`
                    if (window.currentAudioElement) {
                        window.currentAudioElement.pause();
                        window.currentAudioElement = null;
                    }
                `);
            }
            
            // Queue the audio for playback
            this.audioQueue.push(base64Audio);
            console.log('[TTSService] Queued audio chunk, queue size:', this.audioQueue.length);
            
            // Start processing queue if not already processing
            if (!this.processingQueue) {
                this.processAudioQueue(window);
            }
        }
    }

    async processAudioQueue(window) {
        if (this.processingQueue) return;
        this.processingQueue = true;
        this.isPlaying = true;
        
        console.log('[TTSService] Starting audio queue processing, items:', this.audioQueue.length);
        
        try {
            while (this.audioQueue.length > 0) {
                const base64Audio = this.audioQueue.shift();
                console.log('[TTSService] Playing audio chunk, remaining:', this.audioQueue.length);
                
                // Play and wait for completion
                await window.webContents.executeJavaScript(`
                    new Promise((resolve) => {
                        const audio = new Audio('data:audio/mp3;base64,${base64Audio}');
                        window.currentAudioElement = audio;
                        audio.onended = () => {
                            console.log('[TTS Audio] Chunk ended');
                            resolve();
                        };
                        audio.onerror = (e) => {
                            console.error('[TTS Audio] Playback error:', e);
                            resolve();
                        };
                        audio.play().catch((e) => {
                            console.error('[TTS Audio] Play failed:', e);
                            resolve();
                        });
                    })
                `);
            }
            console.log('[TTSService] Audio queue processing complete');
        } finally {
            this.processingQueue = false;
            this.isPlaying = false;
        }
    }

    isSpeaking() {
        return this.isPlaying;
    }

    async stopSpeaking() {
        this.audioQueue = [];
        this.isPlaying = false;
        this.processingQueue = false;
        
        const { BrowserWindow } = require('electron');
        const window = BrowserWindow.getFocusedWindow() || BrowserWindow.getAllWindows()[0];
        
        if (window) {
            await window.webContents.executeJavaScript(`
                if (window.currentAudioElement) {
                    window.currentAudioElement.pause();
                    window.currentAudioElement = null;
                }
            `);
        }
    }
}

console.log('[TTSService] Exporting class...');
module.exports = TTSService;
