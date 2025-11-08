const fs = require('fs');
const path = require('path');
const { app } = require('electron');

class BetaConfigService {
    constructor() {
        this.betaApiKey = null;
        this.loadBetaConfig();
    }

    /**
     * Load beta API key from .env.beta file (for packaged app) or environment
     */
    loadBetaConfig() {
        try {
            // In development, read from .env.beta in project root
            if (!app.isPackaged) {
                const envBetaPath = path.join(__dirname, '../../../.env.beta');
                if (fs.existsSync(envBetaPath)) {
                    const envContent = fs.readFileSync(envBetaPath, 'utf-8');
                    const match = envContent.match(/BETA_OPENAI_API_KEY=(.+)/);
                    if (match && match[1] && match[1].trim() !== 'your-openai-api-key-here') {
                        this.betaApiKey = match[1].trim();
                        console.log('[BetaConfig] Loaded beta API key from .env.beta');
                        return;
                    }
                }
            } else {
                // In packaged app, the .env.beta should be bundled in app.asar
                const envBetaPath = path.join(process.resourcesPath, 'app.asar', '.env.beta');
                if (fs.existsSync(envBetaPath)) {
                    const envContent = fs.readFileSync(envBetaPath, 'utf-8');
                    const match = envContent.match(/BETA_OPENAI_API_KEY=(.+)/);
                    if (match && match[1] && match[1].trim() !== 'your-openai-api-key-here') {
                        this.betaApiKey = match[1].trim();
                        console.log('[BetaConfig] Loaded beta API key from packaged .env.beta');
                        return;
                    }
                }
            }

            console.log('[BetaConfig] No beta API key configured');
        } catch (error) {
            console.error('[BetaConfig] Error loading beta config:', error);
        }
    }

    /**
     * Check if beta API key is available
     * @returns {boolean}
     */
    hasBetaApiKey() {
        return !!this.betaApiKey;
    }

    /**
     * Get the beta API key
     * @returns {string|null}
     */
    getBetaApiKey() {
        return this.betaApiKey;
    }

    /**
     * Configure the beta API key for the user
     * This sets up OpenAI as the default provider with the beta key
     */
    async configureBetaApiKey() {
        if (!this.betaApiKey) {
            throw new Error('No beta API key available');
        }

        const modelStateService = require('./modelStateService');
        
        try {
            // Set the OpenAI API key
            await modelStateService.setApiKey('openai', this.betaApiKey);
            console.log('[BetaConfig] Configured beta API key for OpenAI provider');

            // Select default models for OpenAI
            await modelStateService.handleSetSelectedModel('llm', 'gpt-4o-mini');
            await modelStateService.handleSetSelectedModel('stt', 'gpt-4o-mini-transcribe');
            await modelStateService.handleSetSelectedModel('embedding', 'text-embedding-3-small');
            
            console.log('[BetaConfig] Selected default OpenAI models');
            
            return { success: true };
        } catch (error) {
            console.error('[BetaConfig] Error configuring beta API key:', error);
            return { success: false, error: error.message };
        }
    }
}

const betaConfigService = new BetaConfigService();
module.exports = betaConfigService;
