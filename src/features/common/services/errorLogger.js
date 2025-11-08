/**
 * Error Logger Service
 * Logs errors during beta testing for debugging and improvement
 */

const fs = require('fs').promises;
const path = require('path');
const { app } = require('electron');

class ErrorLogger {
    constructor() {
        this.logPath = null;
        this.initialized = false;
    }

    /**
     * Initialize the error logger
     * Should be called after app is ready
     */
    async init() {
        if (this.initialized) return;

        try {
            const userDataPath = app.getPath('userData');
            this.logPath = path.join(userDataPath, 'error-logs.txt');
            this.initialized = true;
            
            // Log initialization
            await this.log({
                message: 'Error logger initialized',
                version: app.getVersion(),
                platform: process.platform,
                arch: process.arch,
                electronVersion: process.versions.electron,
                nodeVersion: process.versions.node,
                chromeVersion: process.versions.chrome
            }, { type: 'info' });
        } catch (error) {
            console.error('[ErrorLogger] Failed to initialize:', error);
        }
    }

    /**
     * Log an error with context
     * @param {Error|Object|string} error - The error to log
     * @param {Object} context - Additional context about the error
     */
    async log(error, context = {}) {
        if (!this.initialized) {
            console.warn('[ErrorLogger] Not initialized, logging to console only');
            console.error(error);
            return;
        }

        try {
            const entry = {
                timestamp: new Date().toISOString(),
                version: app.getVersion(),
                platform: process.platform,
                type: context.type || 'error',
                error: this._formatError(error),
                context
            };

            // Write to file
            const logLine = JSON.stringify(entry) + '\n';
            await fs.appendFile(this.logPath, logLine);

            // Also log to console for development
            if (process.env.NODE_ENV === 'development') {
                console.error('[ErrorLogger]', entry);
            }
        } catch (writeError) {
            console.error('[ErrorLogger] Failed to write log:', writeError);
        }
    }

    /**
     * Format error object for logging
     * @param {Error|Object|string} error 
     * @returns {Object}
     */
    _formatError(error) {
        if (error instanceof Error) {
            return {
                message: error.message,
                stack: error.stack,
                name: error.name
            };
        } else if (typeof error === 'object') {
            return error;
        } else {
            return { message: String(error) };
        }
    }

    /**
     * Get all logged errors
     * @returns {Promise<string>} - The log file contents
     */
    async getLogs() {
        if (!this.initialized) {
            return '';
        }

        try {
            return await fs.readFile(this.logPath, 'utf-8');
        } catch (error) {
            console.error('[ErrorLogger] Failed to read logs:', error);
            return '';
        }
    }

    /**
     * Get recent errors (last N lines)
     * @param {number} count - Number of recent entries to return
     * @returns {Promise<Array>} - Array of parsed log entries
     */
    async getRecentLogs(count = 50) {
        try {
            const logs = await this.getLogs();
            const lines = logs.split('\n').filter(line => line.trim());
            const recentLines = lines.slice(-count);
            return recentLines.map(line => {
                try {
                    return JSON.parse(line);
                } catch {
                    return { raw: line };
                }
            });
        } catch (error) {
            console.error('[ErrorLogger] Failed to get recent logs:', error);
            return [];
        }
    }

    /**
     * Clear all logs
     */
    async clearLogs() {
        if (!this.initialized) {
            return;
        }

        try {
            await fs.writeFile(this.logPath, '');
            console.log('[ErrorLogger] Logs cleared');
        } catch (error) {
            console.error('[ErrorLogger] Failed to clear logs:', error);
        }
    }

    /**
     * Export logs to a specific path
     * @param {string} exportPath - Path to export logs to
     */
    async exportLogs(exportPath) {
        if (!this.initialized) {
            throw new Error('ErrorLogger not initialized');
        }

        try {
            const logs = await this.getLogs();
            await fs.writeFile(exportPath, logs);
            console.log('[ErrorLogger] Logs exported to:', exportPath);
            return exportPath;
        } catch (error) {
            console.error('[ErrorLogger] Failed to export logs:', error);
            throw error;
        }
    }

    /**
     * Get the log file path
     * @returns {string|null}
     */
    getLogPath() {
        return this.logPath;
    }
}

// Export singleton instance
module.exports = new ErrorLogger();
