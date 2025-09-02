// Audio capture utilities for Ask window voice input with Speex DSP VAD and real-time voice level
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
        
        // Speex DSP VAD integration
        this.aecMod = null;
        this.preprocessorPtr = null;
        this.isVadInitialized = false;
        
        // Voice activity buffering
        this.voiceSegmentBuffer = [];
        this.currentSegment = [];
        this.isCurrentlyVoice = false;
        this.silenceFrameCount = 0;
        this.voiceFrameCount = 0;
        
        // Real-time voice level tracking
        this.currentVoiceLevel = 0;
        this.smoothedVoiceLevel = 0;
        this.voiceLevelHistory = [];
        this.VOICE_LEVEL_HISTORY_SIZE = 10;
        this.VOICE_LEVEL_SMOOTHING = 0.3;
        
        // VAD thresholds
        this.SILENCE_THRESHOLD_FRAMES = 5; // ~500ms of silence before ending segment
        this.VOICE_THRESHOLD_FRAMES = 2;   // ~200ms of voice before starting segment
        this.MAX_SEGMENT_DURATION = 30;    // 30 seconds max per segment
        this.MIN_SEGMENT_DURATION = 0.5;   // 500ms minimum segment
        
        // Voice level thresholds for visual feedback
        this.VOICE_LEVEL_MIN = 0.005;      // Minimum level to consider voice
        this.VOICE_LEVEL_MAX = 0.1;        // Maximum expected voice level
    }

    /**
     * Calculate real-time voice level with smoothing
     */
    calculateVoiceLevel(audioData) {
        if (!audioData || audioData.length === 0) {
            this.currentVoiceLevel = 0;
            this.updateSmoothedVoiceLevel();
            return 0;
        }

        // Calculate RMS (Root Mean Square) for current chunk
        let sumOfSquares = 0;
        for (let i = 0; i < audioData.length; i++) {
            sumOfSquares += audioData[i] * audioData[i];
        }
        const rms = Math.sqrt(sumOfSquares / audioData.length);
        
        // Normalize to 0-1 range based on expected voice levels
        this.currentVoiceLevel = Math.min(1, Math.max(0, 
            (rms - this.VOICE_LEVEL_MIN) / (this.VOICE_LEVEL_MAX - this.VOICE_LEVEL_MIN)
        ));
        
        // Add to history for additional smoothing
        this.voiceLevelHistory.push(this.currentVoiceLevel);
        if (this.voiceLevelHistory.length > this.VOICE_LEVEL_HISTORY_SIZE) {
            this.voiceLevelHistory.shift();
        }
        
        this.updateSmoothedVoiceLevel();
        return this.smoothedVoiceLevel;
    }

    /**
     * Apply exponential smoothing to voice level
     */
    updateSmoothedVoiceLevel() {
        // Calculate average from recent history
        const avgLevel = this.voiceLevelHistory.length > 0 
            ? this.voiceLevelHistory.reduce((a, b) => a + b, 0) / this.voiceLevelHistory.length 
            : 0;
        
        // Apply exponential smoothing
        this.smoothedVoiceLevel = this.smoothedVoiceLevel * (1 - this.VOICE_LEVEL_SMOOTHING) + 
                                  avgLevel * this.VOICE_LEVEL_SMOOTHING;
    }

    /**
     * Update UI with real-time voice activity and level
     */
    updateVoiceActivityUI(hasVoice, voiceLevel) {
        const askView = document.querySelector('ask-view');
        if (askView) {
            // Update basic voice activity (existing method)
            if (askView.updateVoiceActivity) {
                askView.updateVoiceActivity(hasVoice);
            }
            
            // Update real-time voice level (new enhanced method)
            if (askView.updateVoiceLevel) {
                askView.updateVoiceLevel(voiceLevel, hasVoice);
            }
        }
    }

    /**
     * Initialize Speex DSP VAD
     */
    async initializeVAD() {
        if (this.isVadInitialized) return true;

        try {
            // Import the AEC module (which includes VAD functionality)
            const { createAecModule } = await import('../listen/audioCore/aec.js');
            this.aecMod = await createAecModule();
            
            // Initialize Speex preprocessor for VAD
            // Parameters: frame_size, sampling_rate
            this.preprocessorPtr = this.aecMod.cwrap('speex_preprocess_state_init', 'number', ['number', 'number'])(
                160, // 160 samples at 24kHz = ~6.67ms frames (standard for VAD)
                this.SAMPLE_RATE
            );
            
            if (!this.preprocessorPtr) {
                throw new Error('Failed to initialize Speex preprocessor');
            }
            
            // Enable VAD
            const SPEEX_PREPROCESS_SET_VAD = 14;
            this.aecMod.cwrap('speex_preprocess_ctl', 'number', ['number', 'number', 'number'])(
                this.preprocessorPtr,
                SPEEX_PREPROCESS_SET_VAD,
                1 // Enable VAD
            );
            
            // Set VAD probability thresholds for more sensitive detection
            const SPEEX_PREPROCESS_SET_PROB_START = 14;
            const SPEEX_PREPROCESS_SET_PROB_CONTINUE = 16;
            
            // More sensitive thresholds for conversational use
            this.aecMod.cwrap('speex_preprocess_ctl', 'number', ['number', 'number', 'number'])(
                this.preprocessorPtr,
                SPEEX_PREPROCESS_SET_PROB_START,
                25 // 25% probability to start (more sensitive)
            );
            
            this.aecMod.cwrap('speex_preprocess_ctl', 'number', ['number', 'number', 'number'])(
                this.preprocessorPtr,
                SPEEX_PREPROCESS_SET_PROB_CONTINUE,
                15 // 15% probability to continue (more sensitive)
            );
            
            this.isVadInitialized = true;
            console.log('[AskAudioCapture] Speex VAD initialized successfully');
            return true;
            
        } catch (error) {
            console.error('[AskAudioCapture] Failed to initialize VAD:', error);
            return false;
        }
    }

    /**
     * Process audio frame through Speex VAD
     */
    processVAD(audioFrame) {
        if (!this.isVadInitialized || !this.preprocessorPtr) {
            // Fallback to simple RMS VAD
            return this.isVoiceActive(audioFrame);
        }

        try {
            // Convert Float32 to Int16 for Speex
            const frameSize = 160; // Speex frame size
            const int16Frame = new Int16Array(frameSize);
            
            // Resample/chunk the audio to fit Speex frame size
            for (let i = 0; i < frameSize && i < audioFrame.length; i++) {
                const s = Math.max(-1, Math.min(1, audioFrame[i]));
                int16Frame[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
            }
            
            // Allocate memory in WASM heap
            const framePtr = this.aecMod._malloc(frameSize * 2); // 2 bytes per int16
            this.aecMod.HEAP16.set(int16Frame, framePtr >> 1);
            
            // Run VAD processing
            const isVoice = this.aecMod.cwrap('speex_preprocess_run', 'number', ['number', 'number'])(
                this.preprocessorPtr,
                framePtr
            );
            
            // Clean up
            this.aecMod._free(framePtr);
            
            return isVoice === 1;
            
        } catch (error) {
            console.error('[AskAudioCapture] VAD processing error:', error);
            // Fallback to simple VAD
            return this.isVoiceActive(audioFrame);
        }
    }

    /**
     * Handle voice segment detection and buffering with real-time feedback
     */
    handleVoiceSegment(audioChunk, hasVoice, voiceLevel) {
        // Add current chunk to the ongoing segment
        this.currentSegment.push(...audioChunk);
        
        // Always update UI with real-time voice level for visual feedback
        this.updateVoiceActivityUI(hasVoice, voiceLevel);
        
        if (hasVoice) {
            this.voiceFrameCount++;
            this.silenceFrameCount = 0;
            
            // If we weren't in voice mode but detected voice for enough frames
            if (!this.isCurrentlyVoice && this.voiceFrameCount >= this.VOICE_THRESHOLD_FRAMES) {
                this.isCurrentlyVoice = true;
                console.log('[AskAudioCapture] Voice segment started');
            }
        } else {
            this.silenceFrameCount++;
            this.voiceFrameCount = 0;
            
            // If we were in voice mode but have enough silence frames
            if (this.isCurrentlyVoice && this.silenceFrameCount >= this.SILENCE_THRESHOLD_FRAMES) {
                this.endVoiceSegment();
            }
        }
        
        // Prevent segments from becoming too long
        const segmentDuration = this.currentSegment.length / this.SAMPLE_RATE;
        if (segmentDuration >= this.MAX_SEGMENT_DURATION) {
            this.endVoiceSegment();
        }
    }

    /**
     * End the current voice segment and send to STT if it meets criteria
     */
    endVoiceSegment() {
        if (!this.isCurrentlyVoice) return;
        
        this.isCurrentlyVoice = false;
        console.log('[AskAudioCapture] Voice segment ended');
        
        // Check if segment meets minimum duration requirements
        const segmentDuration = this.currentSegment.length / this.SAMPLE_RATE;
        if (segmentDuration >= this.MIN_SEGMENT_DURATION) {
            console.log(`[AskAudioCapture] Sending voice segment (${segmentDuration.toFixed(2)}s) to STT`);
            this.sendVoiceSegmentToSTT(this.currentSegment);
        } else {
            console.log(`[AskAudioCapture] Voice segment too short (${segmentDuration.toFixed(2)}s), discarding`);
        }
        
        // Reset for next segment
        this.currentSegment = [];
        this.voiceFrameCount = 0;
        this.silenceFrameCount = 0;
    }

    /**
     * Send voice segment to STT service
     */
    async sendVoiceSegmentToSTT(audioSegment) {
        console.log(`[AskAudioCapture] Sending ${audioSegment.length} samples to STT`);
        try {
            const pcm16 = this.convertFloat32ToInt16(new Float32Array(audioSegment));
            const base64Data = this.arrayBufferToBase64(pcm16.buffer);
            
            await window.api.askView.sendAudioData(base64Data, 'audio/pcm;rate=24000');
            console.log('[AskAudioCapture] Successfully sent voice segment to STT');
        } catch (error) {
            console.error('[AskAudioCapture] Error sending voice segment to STT:', error);
        }
    }

    /**
     * Start capturing microphone audio for speech-to-text
     */
    async startCapture() {
        console.log('[AskAudioCapture] startCapture called - enhanced version');
        
        if (this.isCapturing) {
            console.warn('[AskAudioCapture] Already capturing audio');
            return false;
        }

        // Initialize VAD first
        console.log('[AskAudioCapture] Initializing VAD...');
        const vadInitialized = await this.initializeVAD();
        if (!vadInitialized) {
            console.warn('[AskAudioCapture] VAD initialization failed, using fallback');
        } else {
            console.log('[AskAudioCapture] VAD initialized successfully!');
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

                // Process audio in chunks for VAD and voice level detection
                while (this.audioBuffer.length >= samplesPerChunk) {
                    const chunk = this.audioBuffer.splice(0, samplesPerChunk);
                    
                    // Calculate real-time voice level
                    const voiceLevel = this.calculateVoiceLevel(chunk);
                    
                    // Run VAD on this chunk
                    const hasVoice = this.processVAD(chunk);
                    
                    // Debug logging every 10 chunks (1 second)
                    if (Math.random() < 0.1) {
                        console.log(`[AskAudioCapture] VAD: ${hasVoice}, Level: ${voiceLevel.toFixed(3)}, Segment: ${this.isCurrentlyVoice}`);
                    }
                    
                    // Handle voice segment detection and buffering with real-time feedback
                    this.handleVoiceSegment(chunk, hasVoice, voiceLevel);
                }
            };

            // Connect the audio processing chain
            source.connect(this.audioProcessor);
            this.audioProcessor.connect(this.audioContext.destination);

            this.isCapturing = true;
            console.log('[AskAudioCapture] Audio capture started with Speex VAD and real-time voice level');
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

        // End any current voice segment
        if (this.isCurrentlyVoice) {
            this.endVoiceSegment();
        }

        // Reset voice activity indicator
        this.updateVoiceActivityUI(false, 0);

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

        // Clean up VAD resources
        if (this.preprocessorPtr && this.aecMod) {
            this.aecMod.cwrap('speex_preprocess_state_destroy', null, ['number'])(this.preprocessorPtr);
            this.preprocessorPtr = null;
        }

        this.audioBuffer = [];
        this.currentSegment = [];
        this.voiceSegmentBuffer = [];
        this.isCurrentlyVoice = false;
        this.voiceFrameCount = 0;
        this.silenceFrameCount = 0;
        
        // Reset voice level tracking
        this.currentVoiceLevel = 0;
        this.smoothedVoiceLevel = 0;
        this.voiceLevelHistory = [];
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
     * Voice Activity Detection using RMS calculation (fallback)
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

    /**
     * Get current voice activity status
     */
    isVoiceCurrentlyActive() {
        return this.isCurrentlyVoice;
    }

    /**
     * Get current voice level (0-1)
     */
    getCurrentVoiceLevel() {
        return this.smoothedVoiceLevel;
    }

    /**
     * Get statistics about current session
     */
    getSessionStats() {
        return {
            isCapturing: this.isCapturing,
            isVadInitialized: this.isVadInitialized,
            isCurrentlyVoice: this.isCurrentlyVoice,
            currentVoiceLevel: this.currentVoiceLevel,
            smoothedVoiceLevel: this.smoothedVoiceLevel,
            currentSegmentDuration: this.currentSegment.length / this.SAMPLE_RATE,
            voiceFrameCount: this.voiceFrameCount,
            silenceFrameCount: this.silenceFrameCount
        };
    }
}

// Create and export global instance
window.askAudioCapture = new AskAudioCapture();

export default window.askAudioCapture;
