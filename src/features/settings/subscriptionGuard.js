/**
 * Subscription Guard - Middleware to enforce subscription requirements
 * Prevents access to app features without valid subscription
 */

const stripeService = require('../settings/stripeService');
const { BrowserWindow, dialog } = require('electron');

class SubscriptionGuard {
    constructor() {
        this.lastValidationCache = new Map();
        this.validationCacheTimeout = 5 * 60 * 1000; // 5 minutes
    }

    /**
     * Check if user has valid subscription, with caching
     * @param {string} uid - User ID
     * @param {boolean} forceRefresh - Skip cache and force fresh validation
     * @returns {Promise<{valid: boolean, status: string, reason?: string}>}
     */
    async checkSubscription(uid, forceRefresh = false) {
        // Check cache first
        if (!forceRefresh) {
            const cached = this.lastValidationCache.get(uid);
            if (cached && (Date.now() - cached.timestamp) < this.validationCacheTimeout) {
                return cached.result;
            }
        }

        // Validate with Stripe service
        const result = await stripeService.validateSubscription(uid);
        
        // Cache the result
        this.lastValidationCache.set(uid, {
            result,
            timestamp: Date.now()
        });

        return result;
    }

    /**
     * Require valid subscription before allowing feature access
     * Shows paywall dialog if subscription is invalid
     * @param {string} uid - User ID
     * @param {string} featureName - Name of feature being accessed
     * @returns {Promise<boolean>} - true if access granted, false if denied
     */
    async requireSubscription(uid, featureName = 'this feature') {
        const validation = await this.checkSubscription(uid);

        if (validation.valid) {
            return true;
        }

        // Only show paywall if payment is actually required
        if (validation.requiresPayment) {
            await this.showPaywall(validation, featureName);
        }
        
        return false;
    }

    /**
     * Show paywall dialog
     * @param {object} validation - Validation result from checkSubscription
     * @param {string} featureName - Name of feature being accessed
     */
    async showPaywall(validation, featureName) {
        let title = 'Subscription Required';
        let message = `You need an active subscription to use ${featureName} with our shared API key.`;

        if (validation.status === 'inactive') {
            title = 'Subscription Required';
            message = 'Subscribe to RANI ($15/month) to start using our shared API key for unlimited research assistance.';
        } else if (validation.status === 'canceled') {
            title = 'Subscription Inactive';
            message = 'Your subscription has been canceled. Resubscribe to continue using RANI with our shared API key.';
        } else if (validation.status === 'past_due') {
            title = 'Payment Issue';
            message = 'There was a problem with your payment. Please update your payment method to continue.';
        }

        const focusedWindow = BrowserWindow.getFocusedWindow();
        if (focusedWindow) {
            const result = await dialog.showMessageBox(focusedWindow, {
                type: 'warning',
                title,
                message,
                detail: validation.reason || 'Subscribe now to continue, or use your personal API keys instead.',
                buttons: ['Subscribe Now ($15/mo)', 'Use Personal API Keys', 'Quit App'],
                defaultId: 0,
                cancelId: 2
            });

            if (result.response === 0) {
                // Open subscription page
                this.openSubscriptionPage();
            } else if (result.response === 1) {
                // Open API key settings
                this.openApiKeySettings();
            } else {
                // Quit app
                const { app } = require('electron');
                app.quit();
            }
        }
    }

    /**
     * Open API key settings page
     */
    openApiKeySettings() {
        const { windowPool } = require('../../window/windowManager.js');
        const header = windowPool.get('header');
        
        if (header) {
            // Send message to renderer to show API key input
            header.webContents.send('show-apikey-header');
            header.focus();
        }
    }

    /**
     * Open subscription/billing page
     */
    openSubscriptionPage() {
        const { shell } = require('electron');
        // This will open the settings page in the app's webview
        // or you can deep link to stripe checkout
        const { windowPool } = require('../../window/windowManager.js');
        const header = windowPool.get('header');
        
        if (header) {
            // Send message to renderer to navigate to billing page
            header.webContents.send('navigate-to', '/settings?tab=billing');
            header.focus();
        } else {
            // Fallback: open in browser
            const webUrl = process.env.RANI_WEB_URL || 'http://localhost:3000';
            shell.openExternal(`${webUrl}/settings?tab=billing`);
        }
    }

    /**
     * Clear validation cache for a user (call after subscription changes)
     * @param {string} uid - User ID
     */
    clearCache(uid) {
        this.lastValidationCache.delete(uid);
    }

    /**
     * Clear all validation caches
     */
    clearAllCaches() {
        this.lastValidationCache.clear();
        this._trialWarningShown = false;
    }
}

const subscriptionGuard = new SubscriptionGuard();
module.exports = subscriptionGuard;
