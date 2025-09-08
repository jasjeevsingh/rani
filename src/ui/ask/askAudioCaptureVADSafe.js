// Safe VAD implementation with error handling and fallback
class AskAudioCaptureVADSafe {
    constructor() {
        this.isVADAvailable = false;
        this.vad = null;
        this.isCapturing = false;
        this.isConversationMode = false;
        this.isSpeaking = false;
        this.isProcessing = false;
        
        // Fallback to original audio capture if VAD fails
        this.useFallback = false;
        
        // State tracking
        this.vadInitialized = false;
        this.isVADMode = false;
        this.speechDetectionActive = false;
        this.isListening = false;
        
        // Audio configuration for VAD
        this.SAMPLE_RATE = 16000;
        this.vadConfig = {
            model: 'silero',
            startThreshold: 0.7,
            endThreshold: 0.35,
            minSilenceMs: 1000,
            maxSpeechMs: 30000,
            frameLengthMs: 30,
        };
        
        // State tracking
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
        
        // Initialize VAD with error handling
        this.initializeVADSafely();
    }

    /**
     * Initialize VAD safely with fallback
     */
    async initializeVADSafely() {
        try {
            console.log('[VAD-Safe] Attempting to load VAD module...');
            
            // Try simpler Web Audio API VAD first
            await this.initializeSimpleVAD();
            
        } catch (error) {
            console.log('[VAD-Safe] Failed to initialize VAD, falling back to basic audio capture:', error);
            // Initialize basic audio capture as fallback
            await this.initializeFallbackAudioCapture();
        }
    }

    /**
     * Initialize simple VAD using Web Audio API
     */
    async initializeSimpleVAD() {
        console.log('[VAD-Safe] Initializing Simple VAD using Web Audio API...');
        
        // Get microphone access
        const stream = await navigator.mediaDevices.getUserMedia({ 
            audio: {
                sampleRate: this.SAMPLE_RATE,
                channelCount: 1,
                echoCancellation: true,
                noiseSuppression: true
            }
        });

        this.audioContext = new (window.AudioContext || window.webkitAudioContext)({
            sampleRate: this.SAMPLE_RATE
        });
        
        const source = this.audioContext.createMediaStreamSource(stream);
        const analyser = this.audioContext.createAnalyser();
        analyser.fftSize = 2048;
        analyser.smoothingTimeConstant = 0.3;
        
        source.connect(analyser);
        
        // Create ScriptProcessor for audio analysis
        const processor = this.audioContext.createScriptProcessor(4096, 1, 1);
        
        let isSpeaking = false;
        let speechStartTime = 0;
        let silenceStartTime = 0;
        let audioBuffer = [];
        
        const SPEECH_THRESHOLD = 0.01; // Increased from 0.001 to reduce false positives
        const MIN_SPEECH_DURATION = 1500; // Increased to 1.5 seconds minimum
        const SILENCE_DURATION = 2000; // Increased to 2 seconds of silence
        const MAX_SPEECH_DURATION = 10000; // Maximum 10 seconds per segment
        
        processor.onaudioprocess = (event) => {
            // Only process if speech detection is active
            if (!this.speechDetectionActive) {
                return;
            }
            
            const inputBuffer = event.inputBuffer;
            const inputData = inputBuffer.getChannelData(0);
            
            // Calculate RMS (Root Mean Square) for voice activity detection
            let sum = 0;
            for (let i = 0; i < inputData.length; i++) {
                sum += inputData[i] * inputData[i];
            }
            const rms = Math.sqrt(sum / inputData.length);
            
            // Add periodic logging to see if audio is being processed (reduced frequency)
            if (Math.random() < 0.005) { // Log roughly every 200 frames (less spam)
                console.log(`🎧 [VAD-Debug] Audio RMS: ${rms.toFixed(6)}, Threshold: ${SPEECH_THRESHOLD}, Active: ${this.speechDetectionActive}`);
            }
            
            const currentTime = Date.now();
            
            if (rms > SPEECH_THRESHOLD) {
                if (!isSpeaking) {
                    // Require sustained speech level for at least 200ms before triggering
                    if (speechStartTime === 0) {
                        speechStartTime = currentTime;
                        audioBuffer = [];
                        return; // Don't trigger immediately, wait for confirmation
                    } else if (currentTime - speechStartTime < 200) {
                        // Still in the confirmation period
                        audioBuffer.push(...Array.from(inputData));
                        return;
                    } else {
                        // Confirmed speech - now trigger
                        isSpeaking = true;
                        this.handleVADSpeechStart();
                    }
                } else {
                    // Continue collecting audio data during speech
                    audioBuffer.push(...Array.from(inputData));
                    silenceStartTime = 0; // Reset silence timer
                }
                
                // Check for maximum speech duration to prevent memory issues
                if (isSpeaking) {
                    const speechDuration = currentTime - speechStartTime;
                    if (speechDuration > MAX_SPEECH_DURATION) {
                        console.log(`🔄 [VAD-Debug] Speech segment reached maximum duration (${MAX_SPEECH_DURATION}ms), processing...`);
                        isSpeaking = false;
                        const speechAudio = new Float32Array(audioBuffer);
                        this.handleVADSpeechEnd(speechAudio);
                        audioBuffer = [];
                        speechStartTime = 0;
                        silenceStartTime = 0;
                    }
                }
                
            } else {
                // Below speech threshold
                if (isSpeaking) {
                    if (silenceStartTime === 0) {
                        silenceStartTime = currentTime;
                    } else if (currentTime - silenceStartTime > SILENCE_DURATION) {
                        // Speech ended
                        isSpeaking = false;
                        const speechDuration = currentTime - speechStartTime;
                        
                        console.log(`🔍 [VAD-Debug] Speech ended - Duration: ${speechDuration}ms, Buffer: ${audioBuffer.length} samples`);
                        
                        if (speechDuration > MIN_SPEECH_DURATION && audioBuffer.length > 0) {
                            // Convert to Float32Array and process
                            const speechAudio = new Float32Array(audioBuffer);
                            this.handleVADSpeechEnd(speechAudio);
                        } else {
                            console.log(`⚠️ [VAD-Debug] Speech too short (${speechDuration}ms) or no audio data, ignoring`);
                        }
                        
                        audioBuffer = [];
                        speechStartTime = 0;
                        silenceStartTime = 0;
                    }
                } else {
                    // Not speaking, reset any pending speech detection
                    if (speechStartTime > 0 && currentTime - speechStartTime > 500) {
                        // Cancel pending speech detection if it doesn't sustain
                        speechStartTime = 0;
                        audioBuffer = [];
                    }
                }
            }
        };
        
        source.connect(processor);
        processor.connect(this.audioContext.destination);
        
        this.vadStream = stream;
        this.vadProcessor = processor;
        this.vadSource = source;
        this.vadAnalyser = analyser;
        this.vadInitialized = true;
        this.isVADMode = true;
        
        // Add periodic status logging
        this.statusInterval = setInterval(() => {
            if (this.speechDetectionActive) {
                console.log(`📊 [VAD-Debug] Status - Conversation: ${this.isConversationMode}, Detection: ${this.speechDetectionActive}, Speaking: ${isSpeaking}`);
            }
        }, 5000); // Log every 5 seconds when active
        
        console.log('[VAD-Safe] Simple VAD initialized successfully');
    }

    /**
     * Initialize basic audio capture when VAD fails
     */
    async initializeFallbackAudioCapture() {
        try {
            console.log('[VAD-Safe] Initializing fallback audio capture...');
            
            // Set up basic audio capture without VAD
            this.isVADMode = false;
            this.vadInitialized = false;
            
            // Initialize basic recording setup
            this.audioContext = null;
            this.mediaRecorder = null;
            this.audioChunks = [];
            
            console.log('[VAD-Safe] Fallback audio capture initialized');
            
        } catch (error) {
            console.error('[VAD-Safe] Failed to initialize fallback audio capture:', error);
        }
    }

    /**
     * Initialize fallback audio capture
     */
    async initializeFallback() {
        try {
            // Load the original audio capture as fallback
            const module = await import('./askAudioCapture.js');
            console.log('[VAD-Safe] Fallback audio capture initialized');
        } catch (error) {
            console.error('[VAD-Safe] Failed to initialize fallback capture:', error);
        }
    }

    /**
     * Start conversation mode with VAD or fallback
     */
    async startConversationMode() {
        if (this.isConversationMode) {
            console.warn('🎙️ [VAD-Debug] Conversation mode already active');
            return false;
        }

        try {
            console.log('🎙️ [VAD-Debug] STARTING CONVERSATION MODE');
            console.log(`   └─ VAD Initialized: ${this.vadInitialized}`);
            console.log(`   └─ VAD Mode: ${this.isVADMode}`);
            console.log(`   └─ Speech Detection Active: ${this.speechDetectionActive}`);
            
            // Start STT session ONCE for the entire conversation
            console.log('🔧 [VAD-Debug] Starting persistent STT session for conversation...');
            const voiceInputResult = await window.api.askView.startVoiceInput();
            if (!voiceInputResult.success) {
                console.error('💥 [VAD-Debug] Failed to start STT session:', voiceInputResult.error);
                return false;
            }
            console.log('✅ [VAD-Debug] Persistent STT session started successfully');
            
            if (this.vadInitialized && this.isVADMode) {
                console.log('✅ [VAD-Debug] Starting Simple VAD conversation mode');
                this.speechDetectionActive = true;
                this.isConversationMode = true;
                console.log(`   └─ Speech Detection now Active: ${this.speechDetectionActive}`);
                console.log('   └─ VAD will send audio segments to persistent STT session');
                this.notifyStateChange('conversationStarted');
                return true;
                
            } else {
                console.log('🔄 [VAD-Debug] Starting fallback audio capture');
                if (window.askAudioCapture) {
                    const result = await window.askAudioCapture.startCapture();
                    if (result) {
                        this.isConversationMode = true;
                        this.notifyStateChange('conversationStarted');
                    }
                    return result;
                } else {
                    throw new Error('No audio capture method available');
                }
            }
            
        } catch (error) {
            console.error('💥 [VAD-Debug] Failed to start conversation mode:', error);
            return false;
        }
    }

    /**
     * Stop conversation mode
     */
    async stopConversationMode() {
        if (!this.isConversationMode) {
            return true;
        }

        try {
            console.log('🔇 [VAD-Debug] STOPPING CONVERSATION MODE');
            
            if (this.vadInitialized && this.isVADMode) {
                console.log('⏸️ [VAD-Debug] Stopping Simple VAD conversation mode');
                this.speechDetectionActive = false;
                
            } else if (window.askAudioCapture) {
                console.log('⏹️ [VAD-Debug] Stopping fallback audio capture');
                await window.askAudioCapture.stopCapture();
            }

            // Stop the persistent STT session
            try {
                console.log('🔧 [VAD-Debug] Stopping persistent STT session...');
                const stopResult = await window.api.askView.stopVoiceInput();
                if (stopResult.success) {
                    console.log('✅ [VAD-Debug] Persistent STT session stopped successfully');
                } else {
                    console.log('ℹ️ [VAD-Debug] STT session already stopped or not active');
                }
            } catch (error) {
                console.log('ℹ️ [VAD-Debug] STT cleanup not needed:', error.message);
            }

            this.isConversationMode = false;
            this.notifyStateChange('conversationStopped');
            return true;
            
        } catch (error) {
            console.error('💥 [VAD-Debug] Error stopping conversation mode:', error);
            this.isConversationMode = false;
            return false;
        }
    }

    /**
     * Handle speech start detection from VAD
     */
    async handleVADSpeechStart() {
        if (!this.isConversationMode) return;
        
        this.speechStartTime = Date.now();
        this.currentSpeechBuffer = [];
        this.isSpeaking = true;
        
        console.log('🎤 [VAD-Debug] SPEECH STARTED');
        console.log(`   └─ Timestamp: ${new Date(this.speechStartTime).toLocaleTimeString()}`);
        console.log(`   └─ Conversation active: ${this.isConversationMode}`);
        console.log(`   └─ Buffer reset: ${this.currentSpeechBuffer.length} samples`);
        console.log('   └─ Using existing persistent STT session');
        
        // Check if we need to interrupt AI speech
        if (this.isAISpeaking()) {
            console.log('🛑 [VAD-Debug] Interrupting AI speech');
            this.handleInterruption();
        }
        
        // Notify callbacks
        if (this.onSpeechStart) {
            this.onSpeechStart();
        }
        
        this.notifyStateChange('speechStarted');
        this.updateVoiceActivity(true);
    }

    /**
     * Handle speech end detection from VAD
     */
    async handleVADSpeechEnd(audio) {
        if (!this.isConversationMode) return;
        
        const speechEndTime = Date.now();
        const speechDurationMs = speechEndTime - this.speechStartTime;
        const speechDurationSec = (speechDurationMs / 1000).toFixed(2);
        
        this.isSpeaking = false;
        this.lastSpeechTime = speechEndTime;
        
        // Convert Float32Array to the format we need
        const audioBuffer = Array.from(audio);
        this.currentSpeechBuffer.push(...audioBuffer);
        
        console.log('🛑 [VAD-Debug] SPEECH ENDED');
        console.log(`   └─ Duration: ${speechDurationSec}s (${speechDurationMs}ms)`);
        console.log(`   └─ Audio samples: ${audioBuffer.length}`);
        console.log(`   └─ Total buffer: ${this.currentSpeechBuffer.length} samples`);
        console.log(`   └─ Sample rate: ${this.SAMPLE_RATE}Hz`);
        console.log(`   └─ Expected audio duration: ${(this.currentSpeechBuffer.length / this.SAMPLE_RATE).toFixed(2)}s`);
        
        // Process the complete speech segment - send to persistent STT session
        await this.processSpeechSegment(this.currentSpeechBuffer);
        this.currentSpeechBuffer = [];
        
        // Notify callbacks
        if (this.onSpeechEnd) {
            this.onSpeechEnd(audioBuffer);
        }
        
        this.notifyStateChange('speechEnded');
        this.updateVoiceActivity(false);
    }

    /**
     * Process a complete speech segment
     */
    async processSpeechSegment(audioBuffer) {
        if (!audioBuffer || audioBuffer.length === 0) {
            console.log('⚠️ [VAD-Debug] Empty audio buffer, skipping processing');
            return;
        }

        const processingStartTime = Date.now();
        const audioDurationSec = (audioBuffer.length / this.SAMPLE_RATE).toFixed(2);
        
        try {
            console.log('🔄 [VAD-Debug] PROCESSING SPEECH SEGMENT');
            console.log(`   └─ Audio samples: ${audioBuffer.length}`);
            console.log(`   └─ Audio duration: ${audioDurationSec}s`);
            console.log(`   └─ Sample rate: ${this.SAMPLE_RATE}Hz`);
            console.log(`   └─ Processing start: ${new Date(processingStartTime).toLocaleTimeString()}`);
            
            this.isProcessing = true;
            this.notifyStateChange('processingStarted');
            
            // Convert audio buffer to the format needed for STT
            console.log('📡 [VAD-Debug] Converting audio for STT...');
            const pcm16 = this.convertFloat32ToInt16(new Float32Array(audioBuffer));
            const base64Data = this.arrayBufferToBase64(pcm16.buffer);
            
            console.log(`   └─ PCM16 size: ${pcm16.length} samples`);
            console.log(`   └─ Base64 size: ${base64Data.length} characters`);
            
            // Send to speech-to-text service using direct transcription
            console.log('🎯 [VAD-Debug] Sending to STT service via direct transcription method...');
            const sttStartTime = Date.now();
            
            try {
                // Use direct transcription method that returns the transcribed text
                const transcriptText = await window.api.askView.transcribeAudioDirect(base64Data, 'audio/pcm;rate=16000');
                console.log('🔄 [VAD-Debug] Direct transcription result:', transcriptText);
                
                if (transcriptText && transcriptText.trim()) {
                    // Send the transcribed text directly to the AI via sendMessage
                    console.log('🤖 [VAD-Debug] Sending transcribed text to AI:', transcriptText.trim());
                    const aiResponse = await window.api.askView.sendMessage(transcriptText.trim());
                    console.log('✅ [VAD-Debug] AI response received');
                } else {
                    console.log('⚠️ [VAD-Debug] Transcription was empty, not sending to AI');
                }
            } catch (error) {
                console.error('💥 [VAD-Debug] Error in direct transcription:', error);
            }
            
            const sttEndTime = Date.now();
            const sttDurationMs = sttEndTime - sttStartTime;
            
            console.log('� [VAD-Debug] Audio sent to STT service');
            console.log(`   └─ STT send time: ${sttDurationMs}ms`);
            console.log('   └─ Transcript should appear via STT callbacks (onSttUpdate/onSttComplete)');
            console.log('   └─ Watch for STT status updates in the main AskView console logs');
            
            // Store the audio segment info for tracking
            const segmentData = {
                timestamp: Date.now(),
                audioLength: audioBuffer.length,
                duration: audioBuffer.length / this.SAMPLE_RATE,
                sttSendTime: sttDurationMs,
                status: 'sent_to_stt'
            };
            
            this.speechSegments.push(segmentData);
            console.log(`   └─ Speech segment stored (${this.speechSegments.length} total)`);
            console.log(`   └─ Transcript will be processed by existing STT callback system`);
            
            // Notify that we've sent audio for processing
            if (this.onSpeechSegment) {
                this.onSpeechSegment(null, audioBuffer, 'processing');
            }
            
        } catch (error) {
            console.error('💥 [VAD-Debug] ERROR processing speech segment:', error);
            console.error('   └─ Error details:', {
                message: error.message,
                stack: error.stack,
                audioBufferLength: audioBuffer.length,
                processingTime: Date.now() - processingStartTime
            });
            
        } finally {
            const totalProcessingTime = Date.now() - processingStartTime;
            this.isProcessing = false;
            this.notifyStateChange('processingEnded');
            
            console.log('🏁 [VAD-Debug] PROCESSING COMPLETE');
            console.log(`   └─ Total processing time: ${totalProcessingTime}ms`);
            console.log(`   └─ Audio sent to existing STT system for transcription`);
        }
    }

    /**
     * Process user message and get AI response
     */
    async processUserMessage(transcript) {
        const aiStartTime = Date.now();
        try {
            console.log('🤖 [VAD-Debug] AI PROCESSING STARTED');
            console.log(`   └─ Message: "${transcript}"`);
            console.log(`   └─ Processing start: ${new Date(aiStartTime).toLocaleTimeString()}`);
            
            const result = await window.api.askView.sendMessage(transcript);
            const aiEndTime = Date.now();
            const aiProcessingTime = aiEndTime - aiStartTime;
            
            console.log('✅ [VAD-Debug] AI RESPONSE RECEIVED');
            console.log(`   └─ AI processing time: ${aiProcessingTime}ms`);
            console.log(`   └─ Result:`, result);
            
            if (result && result.success) {
                console.log('📝 [VAD-Debug] AI PROCESSING SUCCESS');
                console.log(`   └─ Response generated successfully`);
            } else {
                console.log('⚠️ [VAD-Debug] AI PROCESSING WARNING');
                console.log(`   └─ Result may not indicate success:`, result);
            }
            
            console.log('📋 [VAD-Debug] CONVERSATION STATE');
            console.log(`   └─ Total speech segments: ${this.speechSegments.length}`);
            console.log(`   └─ Current processing: ${this.isProcessing ? 'Yes' : 'No'}`);
            console.log(`   └─ Current listening: ${this.isListening ? 'Yes' : 'No'}`);
            
        } catch (error) {
            const aiEndTime = Date.now();
            const aiProcessingTime = aiEndTime - aiStartTime;
            
            console.error('💥 [VAD-Debug] AI PROCESSING ERROR:', error);
            console.error(`   └─ Error after: ${aiProcessingTime}ms`);
            console.error(`   └─ Message that failed: "${transcript}"`);
            console.error(`   └─ Error details:`, {
                message: error.message,
                stack: error.stack
            });
        }
    }

    /**
     * Handle interruption when user speaks during AI speech
     */
    handleInterruption() {
        console.log('[VAD-Safe] User interruption detected, pausing AI speech');
        
        try {
            // Stop any ongoing TTS
            if (window.api?.voice?.tts?.stop) {
                window.api.voice.tts.stop();
            }
            
            if (this.onInterruption) {
                this.onInterruption();
            }
            
            this.notifyStateChange('interrupted');
            
        } catch (error) {
            console.error('[VAD-Safe] Error handling interruption:', error);
        }
    }

    /**
     * Check if AI is currently speaking
     */
    isAISpeaking() {
        // This would be implemented based on your TTS system
        return false; // Placeholder
    }

    /**
     * Update voice activity indicator
     */
    updateVoiceActivity(isActive) {
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
        
        window.dispatchEvent(new CustomEvent(`vad-${event}`, { 
            detail: { ...data, state: this.getState() } 
        }));
    }

    /**
     * Get current state
     */
    getState() {
        return {
            isVADAvailable: this.isVADAvailable,
            useFallback: this.useFallback,
            isConversationMode: this.isConversationMode,
            isSpeaking: this.isSpeaking,
            isProcessing: this.isProcessing,
            speechSegments: this.speechSegments.length
        };
    }

    /**
     * Convert Float32Array to Int16Array (PCM16)
     */
    convertFloat32ToInt16(float32Array) {
        const int16Array = new Int16Array(float32Array.length);
        for (let i = 0; i < float32Array.length; i++) {
            const s = Math.max(-1, Math.min(1, float32Array[i]));
            int16Array[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
        }
        return int16Array;
    }

    /**
     * Convert ArrayBuffer to base64 (safe for large buffers)
     */
    arrayBufferToBase64(buffer) {
        const bytes = new Uint8Array(buffer);
        let binary = '';
        const chunkSize = 8192; // Process in smaller chunks to avoid stack overflow
        
        for (let i = 0; i < bytes.length; i += chunkSize) {
            const chunk = bytes.slice(i, i + chunkSize);
            binary += String.fromCharCode.apply(null, chunk);
        }
        
        return btoa(binary);
    }

    /**
     * Check if conversation mode is active
     */
    isActive() {
        return this.isConversationMode;
    }

    /**
     * Cleanup resources
     */
    cleanup() {
        console.log('[VAD-Safe] Cleaning up resources...');
        
        if (this.vad) {
            try {
                this.vad.destroy();
            } catch (error) {
                console.error('[VAD-Safe] Error destroying VAD:', error);
            }
            this.vad = null;
        }
        
        this.isConversationMode = false;
        this.isSpeaking = false;
        this.isProcessing = false;
        this.currentSpeechBuffer = [];
        this.speechSegments = [];
    }
}

// Create and export global instance with compatibility layer
const vadSafeInstance = new AskAudioCaptureVADSafe();

// Expose as global
window.askAudioCaptureVAD = vadSafeInstance;

// Create compatibility layer for existing askAudioCapture interface
window.askAudioCapture = {
    async startCapture() {
        console.log('[VAD-Safe Compat] CALLED - Starting conversation mode');
        console.log('[VAD-Safe Compat] Instance state:', {
            isCapturing: vadSafeInstance.isCapturing,
            isConversationMode: vadSafeInstance.isConversationMode,
            vadInitialized: vadSafeInstance.vadInitialized
        });
        return await vadSafeInstance.startConversationMode();
    },
    
    async stopCapture() {
        console.log('[VAD-Safe Compat] Stopping conversation mode');
        return await vadSafeInstance.stopConversationMode();
    },
    
    isActive() {
        return vadSafeInstance.isActive();
    }
};

export default vadSafeInstance;
