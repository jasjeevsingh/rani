const { createSTT } = require('../../common/ai/factory');
const modelStateService = require('../../common/services/modelStateService');

class AskSttService {
    constructor() {
        this.sttSession = null;
        this.isListening = false;
        this.currentTranscription = '';
        this.modelInfo = null;
        
        // Callbacks
        this.onTranscriptionUpdate = null;
        this.onTranscriptionComplete = null;
        this.onStatusUpdate = null;
        this.onError = null;
    }

    setCallbacks({ onTranscriptionUpdate, onTranscriptionComplete, onStatusUpdate, onError }) {
        this.onTranscriptionUpdate = onTranscriptionUpdate;
        this.onTranscriptionComplete = onTranscriptionComplete;
        this.onStatusUpdate = onStatusUpdate;
        this.onError = onError;
    }

    async initializeSession(language = 'en') {
        try {
            const modelInfo = await modelStateService.getCurrentModelInfo('stt');
            if (!modelInfo || !modelInfo.apiKey) {
                throw new Error('STT model or API key is not configured.');
            }
            this.modelInfo = modelInfo;
            
            console.log(`[AskSttService] Initializing STT for ${modelInfo.provider} using model ${modelInfo.model}`);

            const handleMessage = message => {
                if (!this.modelInfo) {
                    console.log('[AskSttService] Ignoring message - session already closed');
                    return;
                }

                if (this.modelInfo.provider === 'whisper') {
                    if (message.text && message.text.trim()) {
                        const finalText = message.text.trim();
                        
                        // Filter out noise patterns
                        const noisePatterns = [
                            '[BLANK_AUDIO]', '[INAUDIBLE]', '[MUSIC]', '[SOUND]', '[NOISE]',
                            '(BLANK_AUDIO)', '(INAUDIBLE)', '(MUSIC)', '(SOUND)', '(NOISE)'
                        ];
                        
                        const isNoise = noisePatterns.some(pattern => 
                            finalText.includes(pattern) || finalText === pattern
                        );
                        
                        if (!isNoise && finalText.length > 2) {
                            this.currentTranscription = finalText;
                            if (this.onTranscriptionUpdate) {
                                this.onTranscriptionUpdate(finalText, true);
                            }
                            if (this.onTranscriptionComplete) {
                                this.onTranscriptionComplete(finalText);
                            }
                        }
                    }
                } else if (this.modelInfo.provider === 'deepgram') {
                    const text = message.channel?.alternatives?.[0]?.transcript;
                    if (!text || text.trim().length === 0) return;

                    const isFinal = message.is_final;
                    
                    if (isFinal) {
                        this.currentTranscription = text;
                        if (this.onTranscriptionUpdate) {
                            this.onTranscriptionUpdate(text, true);
                        }
                        if (this.onTranscriptionComplete) {
                            this.onTranscriptionComplete(text);
                        }
                    } else {
                        if (this.onTranscriptionUpdate) {
                            this.onTranscriptionUpdate(text, false);
                        }
                    }
                } else if (this.modelInfo.provider === 'gemini') {
                    if (message.serverContent?.turnComplete) {
                        if (this.currentTranscription) {
                            if (this.onTranscriptionComplete) {
                                this.onTranscriptionComplete(this.currentTranscription);
                            }
                        }
                        return;
                    }

                    const transcription = message.serverContent?.inputTranscription;
                    if (!transcription || !transcription.text) return;
                    
                    const textChunk = transcription.text;
                    if (!textChunk.trim() || textChunk.trim() === '<noise>') {
                        return;
                    }

                    this.currentTranscription += textChunk;
                    if (this.onTranscriptionUpdate) {
                        this.onTranscriptionUpdate(this.currentTranscription, false);
                    }
                } else {
                    // OpenAI and other providers
                    const type = message.type;
                    const text = message.transcript || message.delta || 
                                (message.alternatives && message.alternatives[0]?.transcript) || '';

                    if (type === 'conversation.item.input_audio_transcription.delta') {
                        this.currentTranscription += text;
                        if (text && !text.includes('vq_lbr_audio_')) {
                            if (this.onTranscriptionUpdate) {
                                this.onTranscriptionUpdate(this.currentTranscription, false);
                            }
                        }
                    } else if (type === 'conversation.item.input_audio_transcription.completed') {
                        if (text && text.trim()) {
                            this.currentTranscription = text.trim();
                            if (this.onTranscriptionUpdate) {
                                this.onTranscriptionUpdate(this.currentTranscription, true);
                            }
                            if (this.onTranscriptionComplete) {
                                this.onTranscriptionComplete(this.currentTranscription);
                            }
                        }
                    }
                }

                if (message.error) {
                    console.error('[AskSttService] STT Session Error:', message.error);
                    if (this.onError) {
                        this.onError(message.error);
                    }
                }
            };

            const sttConfig = {
                language: language,
                callbacks: {
                    onmessage: handleMessage,
                    onerror: error => {
                        console.error('[AskSttService] STT session error:', error.message);
                        if (this.onError) {
                            this.onError(error);
                        }
                    },
                    onclose: event => {
                        console.log('[AskSttService] STT session closed:', event.reason);
                        this.isListening = false;
                        if (this.onStatusUpdate) {
                            this.onStatusUpdate('disconnected');
                        }
                    },
                },
            };

            const sttOptions = {
                apiKey: this.modelInfo.apiKey,
                language: language,
                usePortkey: this.modelInfo.provider === 'openai-glass',
                portkeyVirtualKey: this.modelInfo.provider === 'openai-glass' ? this.modelInfo.apiKey : undefined,
                callbacks: sttConfig.callbacks,
                sessionType: 'ask' // To distinguish from listen service sessions
            };

            this.sttSession = await createSTT(this.modelInfo.provider, sttOptions);
            
            console.log('✅ [AskSttService] STT session initialized successfully.');
            
            if (this.onStatusUpdate) {
                this.onStatusUpdate('ready');
            }
            
            return true;
        } catch (error) {
            console.error('[AskSttService] Failed to initialize STT session:', error);
            if (this.onError) {
                this.onError(error);
            }
            return false;
        }
    }

    async startListening() {
        if (!this.sttSession) {
            throw new Error('STT session not initialized');
        }
        
        if (this.isListening) {
            console.warn('[AskSttService] Already listening');
            return;
        }

        this.isListening = true;
        this.currentTranscription = '';
        
        if (this.onStatusUpdate) {
            this.onStatusUpdate('listening');
        }
        
        console.log('[AskSttService] Started listening for speech input');
    }

    async stopListening() {
        if (!this.isListening) {
            return;
        }

        this.isListening = false;
        
        if (this.onStatusUpdate) {
            this.onStatusUpdate('stopped');
        }
        
        console.log('[AskSttService] Stopped listening for speech input');
    }

    async sendAudioData(data, mimeType) {
        if (!this.sttSession) {
            throw new Error('STT session not active');
        }

        if (!this.isListening) {
            throw new Error('Not currently listening');
        }

        let modelInfo = this.modelInfo;
        if (!modelInfo) {
            console.warn('[AskSttService] modelInfo not found, fetching on-the-fly as a fallback...');
            modelInfo = await modelStateService.getCurrentModelInfo('stt');
        }
        if (!modelInfo) {
            throw new Error('STT model info could not be retrieved.');
        }

        let payload;
        if (modelInfo.provider === 'gemini') {
            payload = { audio: { data, mimeType: mimeType || 'audio/pcm;rate=24000' } };
        } else if (modelInfo.provider === 'deepgram') {
            payload = Buffer.from(data, 'base64'); 
        } else {
            payload = data;
        }

        await this.sttSession.sendRealtimeInput(payload);
    }

    async transcribeCompleteAudio(base64AudioData, mimeType = 'audio/pcm;rate=16000') {
        console.log(`[AskSttService] transcribeCompleteAudio - data size: ${base64AudioData.length}`);
        
        let modelInfo = this.modelInfo;
        if (!modelInfo) {
            console.warn('[AskSttService] modelInfo not found, fetching on-the-fly as a fallback...');
            modelInfo = await modelStateService.getCurrentModelInfo('stt');
        }
        if (!modelInfo) {
            throw new Error('STT model info could not be retrieved.');
        }

        if (modelInfo.provider === 'openai') {
            return await this.transcribeWithOpenAIWhisper(base64AudioData, modelInfo);
        } else {
            throw new Error(`Direct transcription not implemented for provider: ${modelInfo.provider}`);
        }
    }

    async transcribeWithOpenAIWhisper(base64AudioData, modelInfo) {
        console.log(`[AskSttService] Using OpenAI gpt-4o-mini-transcribe for direct transcription`);
        
        return new Promise((resolve, reject) => {
            const WebSocket = require('ws');
            const wsUrl = 'wss://api.openai.com/v1/realtime?intent=transcription';
            
            const headers = {
                'Authorization': `Bearer ${modelInfo.apiKey}`,
                'OpenAI-Beta': 'realtime=v1',
            };
            
            const ws = new WebSocket(wsUrl, { headers });
            let transcriptionResult = '';
            let timeoutId;
            
            const cleanup = () => {
                if (timeoutId) clearTimeout(timeoutId);
                if (ws.readyState === WebSocket.OPEN) {
                    ws.close();
                }
            };
            
            // Set timeout for transcription
            timeoutId = setTimeout(() => {
                cleanup();
                reject(new Error('Direct transcription timeout'));
            }, 10000);
            
            ws.onopen = () => {
                console.log("[AskSttService] Direct transcription WebSocket opened");
                
                // Configure session for transcription
                const sessionConfig = {
                    type: 'transcription_session.update',
                    session: {
                        input_audio_format: 'pcm16',
                        input_audio_transcription: {
                            model: 'gpt-4o-mini-transcribe',
                            language: 'en'
                        }
                    }
                };
                
                ws.send(JSON.stringify(sessionConfig));
                
                // Send the audio data
                const audioMessage = {
                    type: 'input_audio_buffer.append',
                    audio: base64AudioData
                };
                ws.send(JSON.stringify(audioMessage));
                
                // Commit the audio buffer to trigger transcription
                const commitMessage = {
                    type: 'input_audio_buffer.commit'
                };
                ws.send(JSON.stringify(commitMessage));
            };
            
            ws.onmessage = (event) => {
                try {
                    const message = JSON.parse(event.data);
                    console.log(`[AskSttService] Direct transcription message type: ${message.type}`);
                    console.log(`[AskSttService] Full message:`, JSON.stringify(message, null, 2));
                    
                    if (message.type === 'input_audio_buffer.speech_started') {
                        console.log('[AskSttService] Speech detected in audio buffer');
                    } else if (message.type === 'conversation.item.input_audio_transcription.completed') {
                        console.log(`[AskSttService] Transcription completed: "${message.transcript}"`);
                        transcriptionResult = message.transcript;
                        cleanup();
                        resolve(transcriptionResult);
                    } else if (message.type === 'conversation.item.input_audio_transcription.failed') {
                        console.error('[AskSttService] Transcription failed:', message.error);
                        cleanup();
                        reject(new Error(`Transcription failed: ${message.error?.message || 'Unknown error'}`));
                    } else if (message.type === 'input_audio_buffer.committed') {
                        console.log('[AskSttService] Audio buffer committed, waiting for transcription...');
                    } else if (message.type === 'session.created' || message.type === 'session.updated') {
                        console.log(`[AskSttService] Session event: ${message.type}`);
                    } else {
                        console.log(`[AskSttService] Unhandled message type: ${message.type}`);
                    }
                } catch (error) {
                    console.error('[AskSttService] Error parsing WebSocket message:', error);
                    console.log('[AskSttService] Raw message:', event.data);
                }
            };
            
            ws.onerror = (error) => {
                console.error('[AskSttService] Direct transcription WebSocket error:', error);
                cleanup();
                reject(error);
            };
            
            ws.onclose = () => {
                console.log('[AskSttService] Direct transcription WebSocket closed');
                if (!transcriptionResult) {
                    reject(new Error('WebSocket closed without transcription result'));
                }
            };
        });
    }

    convertPCMToWAV(base64PCM) {
        // Convert base64 PCM16 to WAV format
        const pcmBuffer = Buffer.from(base64PCM, 'base64');
        const sampleRate = 16000;
        const channels = 1;
        const bitsPerSample = 16;
        
        // WAV header
        const header = Buffer.alloc(44);
        header.write('RIFF', 0);
        header.writeUInt32LE(36 + pcmBuffer.length, 4);
        header.write('WAVE', 8);
        header.write('fmt ', 12);
        header.writeUInt32LE(16, 16);
        header.writeUInt16LE(1, 20);
        header.writeUInt16LE(channels, 22);
        header.writeUInt32LE(sampleRate, 24);
        header.writeUInt32LE(sampleRate * channels * bitsPerSample / 8, 28);
        header.writeUInt16LE(channels * bitsPerSample / 8, 32);
        header.writeUInt16LE(bitsPerSample, 34);
        header.write('data', 36);
        header.writeUInt32LE(pcmBuffer.length, 40);
        
        return Buffer.concat([header, pcmBuffer]);
    }

    isActive() {
        return !!this.sttSession && this.isListening;
    }

    async closeSession() {
        if (this.sttSession) {
            try {
                await this.sttSession.close();
                console.log('[AskSttService] STT session closed');
            } catch (error) {
                console.error('[AskSttService] Error closing STT session:', error);
            }
            this.sttSession = null;
        }

        this.isListening = false;
        this.currentTranscription = '';
        this.modelInfo = null;
        
        if (this.onStatusUpdate) {
            this.onStatusUpdate('disconnected');
        }
    }
}

module.exports = AskSttService;
