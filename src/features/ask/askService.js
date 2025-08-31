const { BrowserWindow } = require('electron');
const { createStreamingLLM } = require('../common/ai/factory');
// Lazy require helper to avoid circular dependency issues
const getWindowManager = () => require('../../window/windowManager');
const internalBridge = require('../../bridge/internalBridge');
const AskSttService = require('./stt/askSttService');

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
            const tempPath = path.join(os.tmpdir(), `screenshot-${Date.now()}.jpg`);

            await execFile('screencapture', ['-x', '-t', 'jpg', tempPath]);

            const imageBuffer = await fs.promises.readFile(tempPath);
            await fs.promises.unlink(tempPath);

            if (sharp) {
                try {
                    // Try using sharp for optimal image processing
                    const resizedBuffer = await sharp(imageBuffer)
                        .resize({ height: 384 })
                        .jpeg({ quality: 80 })
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
                width: 1920,
                height: 1080,
            },
        });

        if (sources.length === 0) {
            throw new Error('No screen sources available');
        }
        const source = sources[0];
        const buffer = source.thumbnail.toJPEG(70);
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
        };
        
        // Initialize STT service
        this.sttService = new AskSttService();
        this.setupSttCallbacks();
        
        // Initialize STT service
        this.sttService = new AskSttService();
        this.setupSttCallbacks();
        
        console.log('[AskService] Service instance created.');
    }

    setupSttCallbacks() {
        this.sttService.setCallbacks({
            onTranscriptionUpdate: (text, isFinal) => {
                this.state.sttTranscription = text;
                this._broadcastState();
                
                // Send transcription update to the ask window
                const askWindow = getWindowPool()?.get('ask');
                if (askWindow && !askWindow.isDestroyed()) {
                    askWindow.webContents.send('ask:sttUpdate', { 
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
                    this.sendMessage(text.trim());
                }
                
                // Send completion to the ask window
                const askWindow = getWindowPool()?.get('ask');
                if (askWindow && !askWindow.isDestroyed()) {
                    askWindow.webContents.send('ask:sttComplete', { 
                        text,
                        isListening: false 
                    });
                }
            },
            onStatusUpdate: (status) => {
                console.log('[AskService] STT status update:', status);
                const askWindow = getWindowPool()?.get('ask');
                if (askWindow && !askWindow.isDestroyed()) {
                    askWindow.webContents.send('ask:sttStatus', { status });
                }
            },
            onError: (error) => {
                console.error('[AskService] STT error:', error);
                this.state.isListening = false;
                this._broadcastState();
                
                const askWindow = getWindowPool()?.get('ask');
                if (askWindow && !askWindow.isDestroyed()) {
                    askWindow.webContents.send('ask:sttError', { 
                        error: error.message || 'Speech recognition error',
                        isListening: false 
                    });
                }
            }
        });
    }

    _broadcastState() {
        const askWindow = getWindowPool()?.get('ask');
        if (askWindow && !askWindow.isDestroyed()) {
            askWindow.webContents.send('ask:stateUpdate', this.state);
        }
    }

    async toggleAskButton(inputScreenOnly = false) {
        const askWindow = getWindowPool()?.get('ask');

        let shouldSendScreenOnly = false;
        if (inputScreenOnly && this.state.showTextInput && askWindow && askWindow.isVisible()) {
            shouldSendScreenOnly = true;
            await this.sendMessage('', []);
            return;
        }

        const hasContent = this.state.isLoading || this.state.isStreaming || (this.state.currentResponse && this.state.currentResponse.length > 0);

        if (askWindow && askWindow.isVisible() && hasContent) {
            this.state.showTextInput = !this.state.showTextInput;
            this._broadcastState();
        } else {
            if (askWindow && askWindow.isVisible()) {
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
    async sendMessage(userPrompt, conversationHistoryRaw=[]) {
        internalBridge.emit('window:requestVisibility', { name: 'ask', visible: true });
        this.state = {
            ...this.state,
            isLoading: true,
            isStreaming: false,
            currentQuestion: userPrompt,
            currentResponse: '',
            showTextInput: false,
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
            
            const modelInfo = await modelStateService.getCurrentModelInfo('llm');
            if (!modelInfo || !modelInfo.apiKey) {
                throw new Error('AI model or API key not configured.');
            }
            console.log(`[AskService] Using model: ${modelInfo.model} for provider: ${modelInfo.provider}`);

            const screenshotResult = await captureScreenshot({ quality: 'medium' });
            const screenshotBase64 = screenshotResult.success ? screenshotResult.base64 : null;

            // Start parallel conversational response generation if in voice mode
            let conversationalPromise = null;
            if (isVoiceMode) {
                console.log('[AskService] Starting parallel conversational response generation...');
                conversationalPromise = this._generateConversationalResponseInParallel(userPrompt, modelInfo, screenshotBase64);
            }

            const conversationHistory = this._formatConversationForPrompt(conversationHistoryRaw);

            const systemPrompt = getSystemPrompt('pickle_glass_analysis', conversationHistory, false);

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
            
            const streamingLLM = createStreamingLLM(modelInfo.provider, {
                apiKey: modelInfo.apiKey,
                model: modelInfo.model,
                temperature: 0.7,
                maxTokens: 2048,
                usePortkey: modelInfo.provider === 'openai-glass',
                portkeyVirtualKey: modelInfo.provider === 'openai-glass' ? modelInfo.apiKey : undefined,
            });

            try {
                const response = await streamingLLM.streamChat(messages);
                const askWin = getWindowPool()?.get('ask');

                if (!askWin || askWin.isDestroyed()) {
                    console.error("[AskService] Ask window is not available to send stream to.");
                    response.body.getReader().cancel();
                    return { success: false, error: 'Ask window is not available.' };
                }

                const reader = response.body.getReader();
                signal.addEventListener('abort', () => {
                    console.log(`[AskService] Aborting stream reader. Reason: ${signal.reason}`);
                    reader.cancel(signal.reason).catch(() => { /* 이미 취소된 경우의 오류는 무시 */ });
                });

                await this._processStream(reader, askWin, sessionId, signal);
                
                // Handle parallel conversational response if it was started
                if (conversationalPromise) {
                    try {
                        const conversationalResponse = await conversationalPromise;
                        if (conversationalResponse) {
                            this.state.conversationalResponse = conversationalResponse;
                            this._broadcastState();
                            
                            console.log('[AskService] Generated parallel conversational response for TTS');
                            
                            // Send conversational response to ask window for TTS
                            if (askWin && !askWin.isDestroyed()) {
                                askWin.webContents.send('ask:conversationalResponse', {
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

                    const fallbackResponse = await streamingLLM.streamChat(textOnlyMessages);
                    const askWin = getWindowPool()?.get('ask');

                    if (!askWin || askWin.isDestroyed()) {
                        console.error("[AskService] Ask window is not available for fallback response.");
                        fallbackResponse.body.getReader().cancel();
                        return { success: false, error: 'Ask window is not available.' };
                    }

                    const fallbackReader = fallbackResponse.body.getReader();
                    signal.addEventListener('abort', () => {
                        console.log(`[AskService] Aborting fallback stream reader. Reason: ${signal.reason}`);
                        fallbackReader.cancel(signal.reason).catch(() => {});
                    });

                    await this._processStream(fallbackReader, askWin, sessionId, signal);
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

            const askWin = getWindowPool()?.get('ask');
            if (askWin && !askWin.isDestroyed()) {
                const streamError = error.message || 'Unknown error occurred';
                askWin.webContents.send('ask-response-stream-error', { error: streamError });
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
    async sendAudioData(data, mimeType) {
        try {
            if (!this.state.isListening) {
                return { success: false, error: 'Not listening for voice input' };
            }

            await this.sttService.sendAudioData(data, mimeType);
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
            const conversationalPrompt = `You are RANI (pronounced rah-nee), an AI research colleague and collaborator. Your style is like a young woman in her twenties: sharp and enthusiastic with the mind of an expert professor.
Take the following detailed response and rewrite it so it sounds like youre explaining it out loud in conversation.

User question: "${userPrompt}"

Instructions:
 - You are collaborator, not just an assistant. Think of how you'd explain complex ideas to a peer.
 - Keep all important information and key points.
 - Use "I" when referring to your perspective as a colleague, perhaps looking over my screen or work. 
 - Use natural speech patterns: contractions, small asides, casual transitions (like "so", "basically", "the cool thing is…").
 - Balance clarity with energy: approachable, but not sloppy.
 - Keep your responses concise, to the point, but engaging. 2-5 sentences max. If the topic is complex, ask permission to keep going.
 - Avoid bullet points and heavy formatting; make it continuous and flowing.
 - Use natural turns of phrase (e.g., "That means...", "In other words...").
 - Tone: warm, smart, a little playful, witty, but grounded in expertise.
 - Think Friday from Iron Man and the Avengers.

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
                usePortkey: modelInfo.provider === 'openai-glass',
                portkeyVirtualKey: modelInfo.provider === 'openai-glass' ? modelInfo.apiKey : undefined,
            });

            const response = await streamingLLM.streamChat(messages);
            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let conversationalResponse = '';

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
                            }
                        } catch (error) {
                            // Skip invalid JSON
                        }
                    }
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

}

const askService = new AskService();

module.exports = askService;