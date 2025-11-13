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

        console.log('[BetaConfig] Is packaged:', app.isPackaged);
        console.log('[BetaConfig] Loading beta config from:', configPath);
        console.log('[BetaConfig] File exists:', fs.existsSync(configPath));

        if (fs.existsSync(configPath)) {
            try {
                const content = fs.readFileSync(configPath, 'utf8');
                console.log('[BetaConfig] File content length:', content.length);
                console.log('[BetaConfig] File content preview:', content.substring(0, 100));
                this.betaConfig = this._parseEnvFile(content);
                console.log('[BetaConfig] Beta config loaded successfully');
                console.log('[BetaConfig] Config keys:', Object.keys(this.betaConfig));
                console.log('[BetaConfig] Full config:', JSON.stringify(this.betaConfig, null, 2));
                
                // Check beta key after config is set (don't call hasBetaApiKey to avoid recursion)
                const key = this.betaConfig?.BETA_OPENAI_API_KEY;
                const hasKey = !!(key && key !== 'your-openai-api-key-here' && key.trim());
                console.log('[BetaConfig] Has valid beta key:', hasKey);
            } catch (error) {
                console.error('[BetaConfig] Error loading beta config:', error);
                this.betaConfig = {};
            }
        } else {
            console.log('[BetaConfig] No .env.beta file found at path');
            console.log('[BetaConfig] App path:', app.getAppPath());
            console.log('[BetaConfig] Resources path:', process.resourcesPath);
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
            const trimmedLine = line.trim();
            if (!trimmedLine || trimmedLine.startsWith('#')) continue;
            
            const equalIndex = trimmedLine.indexOf('=');
            if (equalIndex === -1) continue;
            
            const key = trimmedLine.substring(0, equalIndex).trim();
            const value = trimmedLine.substring(equalIndex + 1).trim();
            
            if (key && value) {
                config[key] = value;
                console.log(`[BetaConfig] Parsed: ${key} = ${value.substring(0, 20)}...`);
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
        console.log('[BetaConfig] hasBetaApiKey - raw key:', key);
        console.log('[BetaConfig] hasBetaApiKey - key length:', key?.length);
        console.log('[BetaConfig] hasBetaApiKey - is placeholder:', key === 'your-openai-api-key-here');
        const result = !!(key && key !== 'your-openai-api-key-here' && key.trim());
        console.log('[BetaConfig] hasBetaApiKey - result:', result);
        return result;
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
            await modelStateService.setApiKey('openai', apiKey);
            
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
