console.log('[TTSService] Module loading...');

const VOICE_CONFIG = require('./voiceConfig');

class TTSService {
    constructor(modelStateService) {
        console.log('[TTSService] Constructor called');
        this.modelState = modelStateService;
        this.isPlaying = false;
    }

    async speak(text, options = {}) {
        console.log('[TTSService] speak called');
        
        const voice = options.voice || VOICE_CONFIG.defaultVoice;
        
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
                model: 'tts-1',
                input: text,
                voice: voice,
                response_format: 'mp3'
            })
        });

        if (!response.ok) {
            throw new Error(`OpenAI TTS API error: ${response.status}`);
        }

        const audioBuffer = await response.arrayBuffer();
        
        const { BrowserWindow } = require('electron');
        const window = BrowserWindow.getFocusedWindow() || BrowserWindow.getAllWindows()[0];
        
        if (window) {
            const base64Audio = Buffer.from(audioBuffer).toString('base64');
            await window.webContents.executeJavaScript(`
                window.api.voice.playAudio('${base64Audio}')
            `);
        }
    }

    isSpeaking() {
        return this.isPlaying;
    }

    async stopSpeaking() {
        this.isPlaying = false;
    }
}

console.log('[TTSService] Exporting class...');
module.exports = TTSService;
