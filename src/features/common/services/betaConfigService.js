/**
 * Beta Configuration Service
 * Manages shared API keys for beta testers
 */

const fs = require('fs');
const path = require('path');

class BetaConfigService {
    constructor() {
        this.initialized = false;
        this.betaConfig = null;
    }

    /**
     * Initialize the service - must be called after app.whenReady()
     */
    initialize() {
        if (this.initialized) return;

        const { app } = require('electron');
        let configPath;

        // In development, load from root .env.beta
        // In production, load from app.asar resources
        if (app.isPackaged) {
            configPath = path.join(process.resourcesPath, '.env.beta');
        } else {
            configPath = path.join(app.getAppPath(), '.env.beta');
        }

        console.log('[BetaConfig] Loading beta config from:', configPath);

        if (fs.existsSync(configPath)) {
            try {
                const content = fs.readFileSync(configPath, 'utf8');
                this.betaConfig = this._parseEnvFile(content);
                console.log('[BetaConfig] Beta config loaded successfully');
            } catch (error) {
                console.error('[BetaConfig] Error loading beta config:', error);
                this.betaConfig = {};
            }
        } else {
            console.log('[BetaConfig] No .env.beta file found');
            this.betaConfig = {};
        }

        this.initialized = true;
    }

    /**
     * Parse .env file content
     */
    _parseEnvFile(content) {
        const config = {};
        const lines = content.split('\n');
        
        for (const line of lines) {
            // Skip comments and empty lines
            if (line.trim().startsWith('#') || !line.trim()) continue;
            
            const [key, ...valueParts] = line.split('=');
            if (key && valueParts.length > 0) {
                config[key.trim()] = valueParts.join('=').trim();
            }
        }
        
        return config;
    }

    /**
     * Check if a beta API key exists
     */
    hasBetaApiKey() {
        if (!this.initialized) this.initialize();
        const key = this.betaConfig?.BETA_OPENAI_API_KEY;
        return !!(key && key !== 'your-openai-api-key-here' && key.trim());
    }

    /**
     * Get the beta OpenAI API key
     */
    getBetaApiKey() {
        if (!this.initialized) this.initialize();
        const key = this.betaConfig?.BETA_OPENAI_API_KEY;
        
        if (!key || key === 'your-openai-api-key-here') {
            return null;
        }
        
        return key.trim();
    }

    /**
     * Configure OpenAI with the beta API key
     * Returns true if successful, false otherwise
     */
    async configureBetaApiKey() {
        const apiKey = this.getBetaApiKey();
        
        if (!apiKey) {
            console.log('[BetaConfig] No valid beta API key found');
            return false;
        }

        try {
            const modelStateService = require('./modelStateService');
            
            // Set the OpenAI API key
            await modelStateService.setProviderApiKey('openai', apiKey);
            
            // Set o4-mini as the default model
            await modelStateService.setSelectedModel('llm', 'o4-mini');
            
            console.log('[BetaConfig] Successfully configured OpenAI with beta key');
            return true;
        } catch (error) {
            console.error('[BetaConfig] Error configuring beta API key:', error);
            return false;
        }
    }
}

// Export singleton instance
module.exports = new BetaConfigService();
