const { BrowserWindow } = require('electron');
const { createStreamingLLM } = require('../common/ai/factory');
// Lazy require helper to avoid circular dependency issues
const getWindowManager = () => require('../../window/windowManager');
const internalBridge = require('../../bridge/internalBridge');
const AskSttService = require('./stt/askSttService');
const sqliteClient = require('../common/services/sqliteClient');
const DocumentRetrievalService = require('../documents/documentRetrievalService');
const settingsService = require('../settings/settingsService');

const getWindowPool = () => {
    try {
        return getWindowManager().windowPool;
    } catch {
        return null;
    }
};

const sessionRepository = require('../common/repositories/session');
const askRepository = require('./repositories');
const { getSystemPrompt } = require('../common/prompts/promptBuilder');
const { profilePrompts } = require('../common/prompts/promptTemplates');
const path = require('node:path');
const fs = require('node:fs');
const os = require('os');
const util = require('util');
const execFile = util.promisify(require('child_process').execFile);
const { desktopCapturer } = require('electron');
const modelStateService = require('../common/services/modelStateService');

// Try to load sharp, but don't fail if it's not available
let sharp;
try {
    sharp = require('sharp');
    console.log('[AskService] Sharp module loaded successfully');
} catch (error) {
    console.warn('[AskService] Sharp module not available:', error.message);
    console.warn('[AskService] Screenshot functionality will work with reduced image processing capabilities');
    sharp = null;
}
let lastScreenshot = null;

async function captureScreenshot(options = {}) {
    if (process.platform === 'darwin') {
        try {
            const tempPath = path.join(os.tmpdir(), `screenshot-${Date.now()}.png`);

            await execFile('screencapture', ['-x', '-t', 'png', tempPath]);

            const imageBuffer = await fs.promises.readFile(tempPath);
            await fs.promises.unlink(tempPath);

            if (sharp) {
                try {
                    // Optimized for text recognition with higher quality
                    const resizedBuffer = await sharp(imageBuffer)
                        .resize({ 
                            width: 1920, 
                            height: 1080, 
                            fit: 'inside',
                            withoutEnlargement: true 
                        })
                        .sharpen()  // Add sharpening for text clarity
                        .jpeg({ 
                            quality: 95,
                            progressive: false,
                            mozjpeg: true  // Better compression algorithm
                        })
                        .toBuffer();

                    const base64 = resizedBuffer.toString('base64');
                    const metadata = await sharp(resizedBuffer).metadata();

                    lastScreenshot = {
                        base64,
                        width: metadata.width,
                        height: metadata.height,
                        timestamp: Date.now(),
                    };

                    return { success: true, base64, width: metadata.width, height: metadata.height };
                } catch (sharpError) {
                    console.warn('Sharp module failed, falling back to basic image processing:', sharpError.message);
                }
            }
            
            // Fallback: Return the original image without resizing
            console.log('[AskService] Using fallback image processing (no resize/compression)');
            const base64 = imageBuffer.toString('base64');
            
            lastScreenshot = {
                base64,
                width: null, // We don't have metadata without sharp
                height: null,
                timestamp: Date.now(),
            };

            return { success: true, base64, width: null, height: null };
        } catch (error) {
            console.error('Failed to capture screenshot:', error);
            return { success: false, error: error.message };
        }
    }

    try {
        const sources = await desktopCapturer.getSources({
            types: ['screen'],
            thumbnailSize: {
                width: 3840,   // 4K width for better text recognition
                height: 2160,  // 4K height for better text recognition
            },
        });

        if (sources.length === 0) {
            throw new Error('No screen sources available');
        }
        const source = sources[0];
        const buffer = source.thumbnail.toJPEG(95); // Higher quality for text recognition
        const base64 = buffer.toString('base64');
        const size = source.thumbnail.getSize();

        return {
            success: true,
            base64,
            width: size.width,
            height: size.height,
        };
    } catch (error) {
        console.error('Failed to capture screenshot using desktopCapturer:', error);
        return {
            success: false,
            error: error.message,
        };
    }
}

/**
 * @class
 * @description
 */
class AskService {
    constructor() {
        this.abortController = null;
        this.state = {
            isVisible: false,
            isLoading: false,
            isStreaming: false,
            currentQuestion: '',
            currentResponse: '',
            conversationalResponse: '', // New conversational response for TTS
            showTextInput: true,
            isListening: false,
            sttTranscription: '',
            retrievalResults: []
        };
        
        // Initialize STT service
        this.sttService = new AskSttService();
        this.setupSttCallbacks();
        
        // Initialize STT service
        this.sttService = new AskSttService();
        this.setupSttCallbacks();
        
        this.retrievalService = new DocumentRetrievalService(sqliteClient);

        console.log('[AskService] Service instance created.');
    }

    /**
     * Get the target window for sending messages
     * In sidebar mode, sends to header window; otherwise to standalone ask window
     * @returns {BrowserWindow|null}
     * @private
     */
    _getTargetWindow() {
        const windowPool = getWindowPool();
        if (!windowPool) return null;
        
        // Try standalone ask window first (for backward compatibility)
        let askWin = windowPool.get('ask');
        if (askWin && !askWin.isDestroyed() && askWin.isVisible()) {
            return askWin;
        }
        
        // Fallback to header window (sidebar mode)
        const header = windowPool.get('header');
        if (header && !header.isDestroyed()) {
            return header;
        }
        
        return null;
    }

    setupSttCallbacks() {
        console.log('[AskService] Setting up STT callbacks...');
        this.sttService.setCallbacks({
            onTranscriptionUpdate: (text, isFinal) => {
                console.log(`[AskService] STT transcription update: "${text}", isFinal: ${isFinal}`);
                this.state.sttTranscription = text;
                this._broadcastState();
                
                // Send transcription update to the target window
                const targetWindow = this._getTargetWindow();
                if (targetWindow && !targetWindow.isDestroyed()) {
                    targetWindow.webContents.send('ask:sttUpdate', { 
                        text, 
                        isFinal,
                        isListening: this.state.isListening 
                    });
                }
            },
            onTranscriptionComplete: (text) => {
                console.log('[AskService] STT transcription complete:', text);
                this.state.sttTranscription = text;
                this.state.isListening = false;
                this._broadcastState();
                
                // Auto-submit the transcribed text
                if (text.trim()) {
                    console.log('[AskService] Auto-submitting transcribed text:', text.trim());
                    this.sendMessage(text.trim());
                } else {
                    console.log('[AskService] Transcribed text is empty, not submitting');
                }
                
                // Send completion to the target window
                const targetWindow = this._getTargetWindow();
                if (targetWindow && !targetWindow.isDestroyed()) {
                    targetWindow.webContents.send('ask:sttComplete', { 
                        text,
                        isListening: false 
                    });
                }
            },
            onStatusUpdate: (status) => {
                console.log('[AskService] STT status update:', status);
                const targetWindow = this._getTargetWindow();
                if (targetWindow && !targetWindow.isDestroyed()) {
                    targetWindow.webContents.send('ask:sttStatus', { status });
                }
            },
            onError: (error) => {
                console.error('[AskService] STT error:', error);
                this.state.isListening = false;
                this._broadcastState();
                
                const targetWindow = this._getTargetWindow();
                if (targetWindow && !targetWindow.isDestroyed()) {
                    targetWindow.webContents.send('ask:sttError', { 
                        error: error.message || 'Speech recognition error',
                        isListening: false 
                    });
                }
            }
        });
    }

    _broadcastState() {
        const targetWindow = this._getTargetWindow();
        if (targetWindow && !targetWindow.isDestroyed()) {
            targetWindow.webContents.send('ask:stateUpdate', this.state);
        }
    }

    async toggleAskButton(inputScreenOnly = false) {
        const targetWindow = this._getTargetWindow();

        let shouldSendScreenOnly = false;
        if (inputScreenOnly && this.state.showTextInput && targetWindow && targetWindow.isVisible()) {
            shouldSendScreenOnly = true;
            await this.sendMessage('', []);
            return;
        }

        const hasContent = this.state.isLoading || this.state.isStreaming || (this.state.currentResponse && this.state.currentResponse.length > 0);

        if (targetWindow && targetWindow.isVisible() && hasContent) {
            // When ask button is clicked and there's content, toggle the input bar
            this.state.showTextInput = !this.state.showTextInput;
            this._broadcastState();
        } else {
            // Check if we're in sidebar mode (header window is the target)
            const windowPool = getWindowPool();
            const headerWindow = windowPool?.get('header');
            const askWindow = windowPool?.get('ask');
            const isSidebarMode = headerWindow && (!askWindow || !askWindow.isVisible());
            
            if (isSidebarMode) {
                // In sidebar mode: toggle sidebar visibility
                console.log('[AskService] Sidebar mode detected, managing header window');
                if (headerWindow && headerWindow.isVisible()) {
                    // Sidebar is open, just ensure input is shown
                    this.state.showTextInput = true;
                    this.state.isVisible = true;
                    this._broadcastState();
                }
            } else {
                // Standalone ask window mode
                if (targetWindow && targetWindow.isVisible()) {
                    internalBridge.emit('window:requestVisibility', { name: 'ask', visible: false });
                    this.state.isVisible = false;
                } else {
                    console.log('[AskService] Showing hidden Ask window');
                    internalBridge.emit('window:requestVisibility', { name: 'ask', visible: true });
                    this.state.isVisible = true;
                }
                if (this.state.isVisible) {
                    this.state.showTextInput = true;
                    this._broadcastState();
                }
            }
        }
    }

    async closeAskWindow () {
            if (this.abortController) {
                this.abortController.abort('Window closed by user');
                this.abortController = null;
            }

            // Stop any active STT session
            if (this.state.isListening) {
                await this.stopVoiceInput();
            }
    
            this.state = {
                isVisible      : false,
                isLoading      : false,
                isStreaming    : false,
                currentQuestion: '',
                currentResponse: '',
                conversationalResponse: '',
                showTextInput  : true,
                isListening    : false,
                sttTranscription: '',
                retrievalResults: []
            };
            this._broadcastState();
    
            internalBridge.emit('window:requestVisibility', { name: 'ask', visible: false });
    
            return { success: true };
        }
    

    /**
     * 
     * @param {string[]} conversationTexts
     * @returns {string}
     * @private
     */
    _formatConversationForPrompt(conversationTexts) {
        if (!conversationTexts || conversationTexts.length === 0) {
            return 'No conversation history available.';
        }
        return conversationTexts.slice(-30).join('\n');
    }

    /**
     * 
     * @param {string} userPrompt
     * @returns {Promise<{success: boolean, response?: string, error?: string}>}
     */
    async sendMessage(userPrompt, conversationHistoryRaw=[], options = {}) {
        // Extract options with defaults
        const { useRAG = false } = options;
        
        console.log(`[AskService] 🚀 Sending message with RAG ${useRAG ? 'ENABLED' : 'DISABLED'}`);
        
        // Don't force ask window visibility - messages go to sidebar if header is active
        // Only show ask window if no target window is available
        const targetWindow = this._getTargetWindow();
        if (!targetWindow) {
            console.log('[AskService] No target window available, requesting ask window visibility');
            internalBridge.emit('window:requestVisibility', { name: 'ask', visible: true });
        }
        
        this.state = {
            ...this.state,
            isLoading: true,
            isStreaming: false,
            currentQuestion: userPrompt,
            currentResponse: '',
            showTextInput: true,  // Keep input bar visible during processing
            retrievalResults: []
        };
        this._broadcastState();

        if (this.abortController) {
            this.abortController.abort('New request received.');
        }
        this.abortController = new AbortController();
        const { signal } = this.abortController;

        let sessionId;
        
        // Check if we're in voice mode for parallel conversational response
        const isVoiceMode = this.state.isListening || this.state.sttTranscription;

        try {
            console.log(`[AskService] 🤖 Processing message: ${userPrompt.substring(0, 50)}...`);

            sessionId = await sessionRepository.getOrCreateActive('ask');
            await askRepository.addAiMessage({ sessionId, role: 'user', content: userPrompt.trim() });
            console.log(`[AskService] DB: Saved user prompt to session ${sessionId}`);
            
            // NEW: Automatically retrieve conversation history if not provided
            if (conversationHistoryRaw.length === 0) {
                const storedMessages = await askRepository.getAllAiMessagesBySessionId(sessionId);
                // Convert database messages to conversation format, excluding the just-added user message
                conversationHistoryRaw = storedMessages
                    .slice(0, -1) // Exclude the message we just added
                    .map(msg => `${msg.role}: ${msg.content}`);
                console.log(`[AskService] Retrieved ${conversationHistoryRaw.length} messages from conversation history`);
            }
            
            // RAG (Retrieval-Augmented Generation) - Only run if Research Library is enabled
            let retrievedChunks = [];
            if (useRAG) {
                try {
                    console.log(`[AskService:RAG] ✅ Research Library ENABLED - Searching document chunks for query: "${userPrompt.substring(0, 80)}"`);
                    const retrievalStartTime = Date.now();
                    const retrievalResult = await this.retrievalService.search({
                        query: userPrompt,
                        limit: 5
                    });
                    const retrievalDuration = Date.now() - retrievalStartTime;
                    console.log(`[AskService:RAG] ⏱️  Retrieval took ${retrievalDuration}ms`);
                    
                    if (retrievalResult.success) {
                        retrievedChunks = retrievalResult.results;
                        console.log(`[AskService:RAG] Retrieved ${retrievedChunks.length} chunks (provider=${retrievalResult.provider}, model=${retrievalResult.model})`);
                        console.log(`[AskService:RAG] Chunk preview:`, retrievedChunks.map((c, i) => ({
                            index: i + 1,
                            score: c.score?.toFixed(3),
                            docId: c.document_id,
                            title: c.metadata?.title?.substring(0, 50) || 'untitled',
                            contentPreview: c.content?.substring(0, 100) || ''
                        })));
                        this.state.retrievalResults = retrievedChunks;
                        console.log(`[AskService:RAG] ✅ Set retrievalResults in state (${retrievedChunks.length} items)`);
                        this._broadcastState();
                        console.log(`[AskService:RAG] ✅ Broadcasted state with retrievalResults`);
                    } else {
                        console.warn(`[AskService:RAG] Retrieval skipped: ${retrievalResult.reason}`);
                        this.state.retrievalResults = [];
                    }
                } catch (retrievalError) {
                    console.error('[AskService:RAG] Retrieval failed:', retrievalError);
                    this.state.retrievalResults = [];
                }
            } else {
                console.log(`[AskService:RAG] ❌ Research Library DISABLED - Skipping document retrieval`);
                this.state.retrievalResults = [];
            }

            const modelInfo = await modelStateService.getCurrentModelInfo('llm');
            if (!modelInfo || !modelInfo.apiKey) {
                throw new Error('AI model or API key not configured.');
            }
            console.log(`[AskService] Using model: ${modelInfo.model} for provider: ${modelInfo.provider}`);

            // Check screenshot toggle setting before capturing
            const screenshotEnabled = await settingsService.getScreenshotEnabled();
            console.log(`[AskService] Screenshot toggle is ${screenshotEnabled ? 'enabled' : 'disabled'}`);
            
            const screenshotResult = screenshotEnabled 
                ? await captureScreenshot({ quality: 'medium' })
                : { success: false, base64: null };
            const screenshotBase64 = screenshotResult.success ? screenshotResult.base64 : null;
            
            if (screenshotEnabled && screenshotBase64) {
                console.log('[AskService] Screenshot captured and will be sent with message');
            } else if (screenshotEnabled) {
                console.log('[AskService] Screenshot enabled but capture failed');
            } else {
                console.log('[AskService] Screenshot disabled, no screen data will be sent');
            }

            // Start parallel conversational response generation if in voice mode
            let conversationalPromise = null;
            if (isVoiceMode) {
                console.log('[AskService] Starting parallel conversational response generation...');
                conversationalPromise = this._generateConversationalResponseInParallel(userPrompt, modelInfo, screenshotBase64);
            }

            const conversationHistory = this._formatConversationForPrompt(conversationHistoryRaw);

            const systemPrompt = getSystemPrompt('research_assistant', conversationHistory);

            const messages = [
                { role: 'system', content: systemPrompt },
                {
                    role: 'user',
                    content: [
                        { type: 'text', text: `User Request: ${userPrompt.trim()}` },
                    ],
                },
            ];

            if (screenshotBase64) {
                messages[1].content.push({
                    type: 'image_url',
                    image_url: { url: `data:image/jpeg;base64,${screenshotBase64}` },
                });
            }

            const retrievalContextMessage = this.buildRetrievedContextMessage(retrievedChunks);
            if (retrievalContextMessage) {
                console.log(`[AskService:RAG] Injecting retrieval context into prompt (${retrievedChunks.length} chunks).`);
                console.log(`[AskService:RAG] Context message preview (first 500 chars):`, retrievalContextMessage.substring(0, 500));
                messages.splice(1, 0, { role: 'system', content: retrievalContextMessage });
            } else {
                console.log(`[AskService:RAG] No retrieval context to inject (retrievedChunks.length=${retrievedChunks.length})`);
            }
            
            const streamingLLM = createStreamingLLM(modelInfo.provider, {
                apiKey: modelInfo.apiKey,
                model: modelInfo.model,
                temperature: 0.7,
                maxTokens: 2048,
                usePortkey: false, // Disable Portkey for now
                portkeyVirtualKey: undefined,
            });

            try {
                const response = await streamingLLM.streamChat(messages);
                const targetWindow = this._getTargetWindow();

                if (!targetWindow || targetWindow.isDestroyed()) {
                    console.error("[AskService] Target window is not available to send stream to.");
                    response.body.getReader().cancel();
                    return { success: false, error: 'Target window is not available.' };
                }

                const reader = response.body.getReader();
                signal.addEventListener('abort', () => {
                    console.log(`[AskService] Aborting stream reader. Reason: ${signal.reason}`);
                    reader.cancel(signal.reason).catch(() => { /* 이미 취소된 경우의 오류는 무시 */ });
                });

                await this._processStream(reader, targetWindow, sessionId, signal);
                
                // Handle parallel conversational response if it was started
                if (conversationalPromise) {
                    try {
                        const conversationalResponse = await conversationalPromise;
                        if (conversationalResponse) {
                            this.state.conversationalResponse = conversationalResponse;
                            this._broadcastState();
                            
                            console.log('[AskService] Generated parallel conversational response for TTS');
                            
                            // Send conversational response to target window for TTS
                            if (targetWindow && !targetWindow.isDestroyed()) {
                                targetWindow.webContents.send('ask:conversationalResponse', {
                                    text: conversationalResponse,
                                    originalResponse: this.state.currentResponse
                                });
                            }
                        }
                    } catch (error) {
                        console.error('[AskService] Error in parallel conversational response:', error);
                    }
                }
                
                return { success: true };

            } catch (multimodalError) {
                // 멀티모달 요청이 실패했고 스크린샷이 포함되어 있다면 텍스트만으로 재시도
                if (screenshotBase64 && this._isMultimodalError(multimodalError)) {
                    console.log(`[AskService] Multimodal request failed, retrying with text-only: ${multimodalError.message}`);
                    
                    // 텍스트만으로 메시지 재구성
                    const textOnlyMessages = [
                        { role: 'system', content: systemPrompt },
                        {
                            role: 'user',
                            content: `User Request: ${userPrompt.trim()}`
                        }
                    ];

                    if (retrievalContextMessage) {
                        textOnlyMessages.splice(1, 0, { role: 'system', content: retrievalContextMessage });
                    }

                    const fallbackResponse = await streamingLLM.streamChat(textOnlyMessages);
                    const fallbackWindow = this._getTargetWindow();

                    if (!fallbackWindow || fallbackWindow.isDestroyed()) {
                        console.error("[AskService] Target window is not available for fallback response.");
                        fallbackResponse.body.getReader().cancel();
                        return { success: false, error: 'Target window is not available.' };
                    }

                    const fallbackReader = fallbackResponse.body.getReader();
                    signal.addEventListener('abort', () => {
                        console.log(`[AskService] Aborting fallback stream reader. Reason: ${signal.reason}`);
                        fallbackReader.cancel(signal.reason).catch(() => {});
                    });

                    await this._processStream(fallbackReader, fallbackWindow, sessionId, signal);
                    return { success: true };
                } else {
                    // 다른 종류의 에러이거나 스크린샷이 없었다면 그대로 throw
                    throw multimodalError;
                }
            }

        } catch (error) {
            console.error('[AskService] Error during message processing:', error);
            this.state = {
                ...this.state,
                isLoading: false,
                isStreaming: false,
                showTextInput: true,
            };
            this._broadcastState();

            const targetWindow = this._getTargetWindow();
            if (targetWindow && !targetWindow.isDestroyed()) {
                const streamError = error.message || 'Unknown error occurred';
                targetWindow.webContents.send('ask-response-stream-error', { error: streamError });
            }

            return { success: false, error: error.message };
        }
    }

    /**
     * 
     * @param {ReadableStreamDefaultReader} reader
     * @param {BrowserWindow} askWin
     * @param {number} sessionId 
     * @param {AbortSignal} signal
     * @returns {Promise<void>}
     * @private
     */
    async _processStream(reader, askWin, sessionId, signal) {
        const decoder = new TextDecoder();
        let fullResponse = '';

        try {
            this.state.isLoading = false;
            this.state.isStreaming = true;
            this._broadcastState();
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value);
                const lines = chunk.split('\n').filter(line => line.trim() !== '');

                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        const data = line.substring(6);
                        if (data === '[DONE]') {
                            return; 
                        }
                        try {
                            const json = JSON.parse(data);
                            const token = json.choices[0]?.delta?.content || '';
                            if (token) {
                                fullResponse += token;
                                this.state.currentResponse = fullResponse;
                                this._broadcastState();
                            }
                        } catch (error) {
                        }
                    }
                }
            }
        } catch (streamError) {
            if (signal.aborted) {
                console.log(`[AskService] Stream reading was intentionally cancelled. Reason: ${signal.reason}`);
            } else {
                console.error('[AskService] Error while processing stream:', streamError);
                if (askWin && !askWin.isDestroyed()) {
                    askWin.webContents.send('ask-response-stream-error', { error: streamError.message });
                }
            }
        } finally {
            this.state.isStreaming = false;
            this.state.currentResponse = fullResponse;
            console.log(`[AskService:Stream] 📊 Final response length: ${fullResponse.length} chars`);
            console.log(`[AskService:Stream] 📊 retrievalResults in state: ${this.state.retrievalResults?.length || 0} items`);
            this._broadcastState();
            
            if (fullResponse) {
                try {
                    await askRepository.addAiMessage({ sessionId, role: 'assistant', content: fullResponse });
                    console.log(`[AskService] DB: Saved partial or full assistant response to session ${sessionId} after stream ended.`);
                } catch(dbError) {
                    console.error("[AskService] DB: Failed to save assistant response after stream ended:", dbError);
                }
            }
        }
    }

    /**
     * 멀티모달 관련 에러인지 판단
     * @private
     */
    _isMultimodalError(error) {
        const errorMessage = error.message?.toLowerCase() || '';
        return (
            errorMessage.includes('vision') ||
            errorMessage.includes('image') ||
            errorMessage.includes('multimodal') ||
            errorMessage.includes('unsupported') ||
            errorMessage.includes('image_url') ||
            errorMessage.includes('400') ||  // Bad Request often for unsupported features
            errorMessage.includes('invalid') ||
            errorMessage.includes('not supported')
        );
    }

    /**
     * Start voice input/speech-to-text for the ask window
     */
    async startVoiceInput() {
        try {
            if (this.state.isListening) {
                console.warn('[AskService] Voice input already active');
                return { success: false, error: 'Already listening' };
            }

            // Ensure callbacks are configured before initializing session
            console.log('[AskService] Configuring STT callbacks for voice input session');
            this.setupSttCallbacks();

            // Initialize STT session if not already done
            const initialized = await this.sttService.initializeSession();
            if (!initialized) {
                return { success: false, error: 'Failed to initialize speech recognition' };
            }

            await this.sttService.startListening();
            this.state.isListening = true;
            this.state.sttTranscription = '';
            this._broadcastState();

            console.log('[AskService] Voice input started');
            return { success: true };
        } catch (error) {
            console.error('[AskService] Error starting voice input:', error);
            this.state.isListening = false;
            this._broadcastState();
            return { success: false, error: error.message };
        }
    }

    /**
     * Stop voice input/speech-to-text
     */
    async stopVoiceInput() {
        try {
            if (!this.state.isListening) {
                console.warn('[AskService] Voice input not active');
                return { success: false, error: 'Not listening' };
            }

            await this.sttService.stopListening();
            this.state.isListening = false;
            this._broadcastState();

            console.log('[AskService] Voice input stopped');
            return { success: true };
        } catch (error) {
            console.error('[AskService] Error stopping voice input:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Send audio data to STT service
     */
    /**
     * Direct transcription method that bypasses streaming callbacks
     */
    async transcribeAudioDirect(base64AudioData, mimeType = 'audio/pcm;rate=16000') {
        try {
            console.log(`[AskService] Direct transcription - data size: ${base64AudioData.length}`);
            
            // Create a new STT service instance for one-shot transcription
            const AskSttService = require('./stt/askSttService');
            const directSttService = new AskSttService();
            
            // Set up a promise-based callback system
            const transcriptionResult = await directSttService.transcribeCompleteAudio(base64AudioData, mimeType);
            
            if (transcriptionResult && transcriptionResult.trim()) {
                console.log(`[AskService] Direct transcription successful: "${transcriptionResult}"`);
                return transcriptionResult.trim();
            } else {
                throw new Error('No transcription result received');
            }
        } catch (error) {
            console.error('[AskService] Direct transcription error:', error);
            throw error;
        }
    }

    async sendAudioData(data, mimeType) {
        try {
            console.log(`[AskService] sendAudioData called - isListening: ${this.state.isListening}, data size: ${data.length}`);
            
            if (!this.state.isListening) {
                console.warn('[AskService] Rejecting audio data - not listening for voice input');
                return { success: false, error: 'Not listening for voice input' };
            }

            console.log('[AskService] Sending audio data to STT service...');
            await this.sttService.sendAudioData(data, mimeType);
            console.log('[AskService] Audio data sent successfully to STT service');
            return { success: true };
        } catch (error) {
            console.error('[AskService] Error sending audio data:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Generate conversational response in parallel (for simultaneous TTS)
     */
    async _generateConversationalResponseInParallel(userPrompt, modelInfo, screenshotBase64 = null) {
        try {
            const conversationalPrompt = `You are RANI (pronounced rah-nee), an AI research colleague and collaborator. You live on the user's desktop. Your style is like a young woman in her twenties: sharp and enthusiastic with the mind of an expert professor.

User input: "${userPrompt}"

Characteristics:
 - You are a collaborator, not just an assistant. Think of how you'd explain complex ideas to a peer.
 - Use "I" when referring to your perspective as a colleague. Imagine you're looking over the user's screen or work.
 - Use natural speech patterns: contractions, small asides, casual transitions.
 - Balance clarity with energy: approachable, but not sloppy.
 - Keep your responses concise, but engaging. Favor brevity for small talk. If the topic is complex, ask permission to keep going.
 - Use natural turns of phrase (e.g., "That means...", "In other words...").
 - Tone: warm, smart, playful, witty, but grounded in expertise.
 - Think Friday from Iron Man and the Avengers.

Response formatting: Conversational as if speaking directly aloud to a colleague (so no bullet points, lists, emdashes, parentheses, formal structures, etc).

Conversational response:`;

            const messages = [
                {
                    role: 'user',
                    content: [
                        { type: 'text', text: conversationalPrompt },
                    ],
                }
            ];

            // Include screenshot if available (same as main response)
            if (screenshotBase64) {
                messages[0].content.push({
                    type: 'image_url',
                    image_url: { url: `data:image/jpeg;base64,${screenshotBase64}` },
                });
            }

            const streamingLLM = createStreamingLLM(modelInfo.provider, {
                apiKey: modelInfo.apiKey,
                model: modelInfo.model,
                temperature: 0.7,
                maxTokens: 300, // Shorter for conversational response
                usePortkey: false, // Disable Portkey for now
                portkeyVirtualKey: undefined,
            });

            const response = await streamingLLM.streamChat(messages);
            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let conversationalResponse = '';
            let sentenceBuffer = '';

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value);
                const lines = chunk.split('\n').filter(line => line.trim() !== '');

                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        const data = line.substring(6);
                        if (data === '[DONE]') {
                            break;
                        }
                        try {
                            const json = JSON.parse(data);
                            const token = json.choices[0]?.delta?.content || '';
                            if (token) {
                                conversationalResponse += token;
                                sentenceBuffer += token;
                                
                                // Check for sentence boundaries - more aggressive chunking
                                if (this._isSentenceComplete(sentenceBuffer)) {
                                    const chunkText = sentenceBuffer.trim();
                                    console.log(`[AskService] Sending TTS chunk (${chunkText.length} chars): "${chunkText.substring(0, 50)}..."`);
                                    // Send chunk immediately for TTS
                                    const targetWindow = this._getTargetWindow();
                                    if (targetWindow && !targetWindow.isDestroyed()) {
                                        targetWindow.webContents.send('ask:conversationalChunk', {
                                            text: chunkText,
                                            isComplete: false,
                                            timestamp: Date.now()
                                        });
                                    }
                                    sentenceBuffer = '';
                                }
                            }
                        } catch (error) {
                            // Skip invalid JSON
                        }
                    }
                }
            }
            
            // Send any remaining text as final chunk
            if (sentenceBuffer.trim()) {
                console.log(`[AskService] Sending final TTS chunk: "${sentenceBuffer.trim()}"`);
                const targetWindow = this._getTargetWindow();
                if (targetWindow && !targetWindow.isDestroyed()) {
                    targetWindow.webContents.send('ask:conversationalChunk', {
                        text: sentenceBuffer.trim(),
                        isComplete: true,
                        timestamp: Date.now()
                    });
                }
            }

            return conversationalResponse.trim();
        } catch (error) {
            console.error('[AskService] Error generating parallel conversational response:', error);
            // Fallback: return a simple response
            return `I'll help you with that.`;
        }
    }

    /**
     * Build RAG context message for the LLM
     */
    buildRetrievedContextMessage(chunks = []) {
        if (!Array.isArray(chunks) || chunks.length === 0) {
            return null;
        }

        const blocks = chunks.map((chunk, index) => {
            const metadata = chunk.metadata || {};
            const title = metadata.title || metadata.filename || `Document ${chunk.documentId}`;
            const snippet = (chunk.content || '').trim().slice(0, 800);
            const suffix = chunk.content && chunk.content.length > 800 ? '…' : '';
            const location = metadata.startOffset != null ? ` (offset ${metadata.startOffset})` : '';
            const score = typeof chunk.score === 'number' ? ` [score: ${chunk.score.toFixed(2)}]` : '';
            return `Source ${index + 1}: ${title}${location}${score}\n${snippet}${suffix}`;
        });

        return `Use the following context from the user's documents when formulating your response. Do not quote if irrelevant.\n\n${blocks.join('\n\n')}`;
    }

    /**
     * Check if text contains a complete sentence
     */
    _isSentenceComplete(text) {
        if (!text || text.trim().length < 10) return false; // Reduced from 20 to 10 for faster response
    
        const trimmed = text.trim();
        
        // Accept more natural break points for conversational flow
        const naturalBreaks = /[.!?;](\s*$|\s+)/; // Added semicolon, removed capital letter requirement
        
        // For very short complete thoughts, allow immediate breaking
        if (trimmed.length >= 15 && naturalBreaks.test(trimmed)) {
            // Additional check: avoid breaking on abbreviations or decimals
            const avoidBreaking = /\b[A-Z][a-z]*\.$|\d+\.$|etc\.$|vs\.$|Mr\.$|Mrs\.$|Dr\.$|Prof\.$/;
            if (avoidBreaking.test(trimmed)) {
                return false;
            }
            return true;
        }
        
        // For longer sentences, use stricter matching
        const properSentenceEnders = /[.!?](\s*$|\s+[A-Z])/;
        
        return properSentenceEnders.test(trimmed);
    }

    /**
     * Toggle voice input on/off
     */

    /**
     * Toggle voice input on/off
     */
    async toggleVoiceInput() {
        if (this.state.isListening) {
            return await this.stopVoiceInput();
        } else {
            return await this.startVoiceInput();
        }
    }

    /**
     * Load conversation history from database for the current session
     * @returns {Promise<{success: boolean, conversationHistory?: Array, error?: string}>}
     */
    async loadConversationHistory() {
        try {
            console.log('[AskService] Loading conversation history...');
            
            // Get or create active session
            const sessionId = await sessionRepository.getOrCreateActive('ask');
            
            // Retrieve all messages for this session
            const messages = await askRepository.getAllAiMessagesBySessionId(sessionId);
            
            console.log(`[AskService] Loaded ${messages.length} messages from session ${sessionId}`);
            
            // Convert database messages to conversation format
            const conversationHistory = messages.map(msg => ({
                id: msg.id,
                role: msg.role,
                content: msg.content,
                timestamp: msg.sent_at * 1000, // Convert to milliseconds
                model: msg.model
            }));
            
            return {
                success: true,
                conversationHistory,
                sessionId
            };
        } catch (error) {
            console.error('[AskService] Error loading conversation history:', error);
            return {
                success: false,
                error: error.message,
                conversationHistory: []
            };
        }
    }

}

const askService = new AskService();

module.exports = askService;
