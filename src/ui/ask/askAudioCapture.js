// Audio capture utilities for Ask window voice input
class AskAudioCapture {
    constructor() {
        this.mediaStream = null;
        this.audioContext = null;
        this.audioProcessor = null;
        this.isCapturing = false;
        
        // Audio configuration
        this.SAMPLE_RATE = 24000;
        this.BUFFER_SIZE = 4096;
        this.AUDIO_CHUNK_DURATION = 0.1; // 100ms chunks
        
        this.audioBuffer = [];
    }

    /**
     * Start capturing microphone audio for speech-to-text
     */
    async startCapture() {
        if (this.isCapturing) {
            console.warn('[AskAudioCapture] Already capturing audio');
            return false;
        }

        try {
            // Request microphone access
            this.mediaStream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    sampleRate: this.SAMPLE_RATE,
                    channelCount: 1,
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true,
                },
                video: false,
            });

            // Create audio context and processing chain
            this.audioContext = new AudioContext({ sampleRate: this.SAMPLE_RATE });
            await this.audioContext.resume();
            
            const source = this.audioContext.createMediaStreamSource(this.mediaStream);
            this.audioProcessor = this.audioContext.createScriptProcessor(this.BUFFER_SIZE, 1, 1);

            const samplesPerChunk = this.SAMPLE_RATE * this.AUDIO_CHUNK_DURATION;

            this.audioProcessor.onaudioprocess = (e) => {
                const inputData = e.inputBuffer.getChannelData(0);
                this.audioBuffer.push(...inputData);

                // Voice Activity Detection for visual feedback
                const hasVoice = this.isVoiceActive(inputData);
                
                // Update visual indicator in AskView
                const askView = document.querySelector('ask-view');
                if (askView && askView.updateVoiceActivity) {
                    askView.updateVoiceActivity(hasVoice);
                }

                // Process audio in chunks when we have enough samples
                while (this.audioBuffer.length >= samplesPerChunk) {
                    const chunk = this.audioBuffer.splice(0, samplesPerChunk);
                    const pcm16 = this.convertFloat32ToInt16(chunk);
                    const base64Data = this.arrayBufferToBase64(pcm16.buffer);

                    // Send audio data to STT service
                    window.api.askView.sendAudioData(base64Data, 'audio/pcm;rate=24000')
                        .catch(error => {
                            console.error('[AskAudioCapture] Error sending audio data:', error);
                        });
                }
            };

            // Connect the audio processing chain
            source.connect(this.audioProcessor);
            this.audioProcessor.connect(this.audioContext.destination);

            this.isCapturing = true;
            console.log('[AskAudioCapture] Audio capture started');
            return true;

        } catch (error) {
            console.error('[AskAudioCapture] Error starting audio capture:', error);
            this.cleanup();
            return false;
        }
    }

    /**
     * Stop capturing audio
     */
    stopCapture() {
        if (!this.isCapturing) {
            return;
        }

        // Reset voice activity indicator
        const askView = document.querySelector('ask-view');
        if (askView && askView.updateVoiceActivity) {
            askView.updateVoiceActivity(false);
        }

        this.cleanup();
        this.isCapturing = false;
        console.log('[AskAudioCapture] Audio capture stopped');
    }

    /**
     * Clean up audio resources
     */
    cleanup() {
        if (this.audioProcessor) {
            this.audioProcessor.disconnect();
            this.audioProcessor = null;
        }

        if (this.audioContext) {
            this.audioContext.close();
            this.audioContext = null;
        }

        if (this.mediaStream) {
            this.mediaStream.getTracks().forEach(track => track.stop());
            this.mediaStream = null;
        }

        this.audioBuffer = [];
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
     * Check if audio capture is active
     */
    isActive() {
        return this.isCapturing;
    }

    /**
     * Voice Activity Detection using RMS calculation
     */
    isVoiceActive(audioData, threshold = 0.01) {
        if (!audioData || audioData.length === 0) {
            return false;
        }

        let sumOfSquares = 0;
        for (let i = 0; i < audioData.length; i++) {
            sumOfSquares += audioData[i] * audioData[i];
        }
        const rms = Math.sqrt(sumOfSquares / audioData.length);

        return rms > threshold;
    }
}

// Create and export global instance
window.askAudioCapture = new AskAudioCapture();

export default window.askAudioCapture;
