/**
 * Subscription API Routes
 * Handles Stripe checkout, subscription status, and billing portal
 */

const express = require('express');
const router = express.Router();

// IPC bridge to communicate with main process
let ipcBridge = null;

function setIpcBridge(bridge) {
    ipcBridge = bridge;
}

/**
 * GET /api/subscription/status
 * Get current subscription status for the authenticated user
 */
router.get('/status', async (req, res) => {
    try {
        if (!ipcBridge) {
            return res.status(500).json({ error: 'IPC bridge not available' });
        }

        const result = await ipcBridge.invoke('subscription:get-status');
        res.json(result);
    } catch (error) {
        console.error('[Subscription API] Error getting status:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * POST /api/subscription/create-checkout
 * Create a Stripe checkout session for subscription
 */
router.post('/create-checkout', async (req, res) => {
    try {
        if (!ipcBridge) {
            return res.status(500).json({ error: 'IPC bridge not available' });
        }

        const result = await ipcBridge.invoke('subscription:create-checkout');
        
        if (result.success) {
            res.json({ checkoutUrl: result.url });
        } else {
            res.status(400).json({ error: result.error });
        }
    } catch (error) {
        console.error('[Subscription API] Error creating checkout:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * POST /api/subscription/open-portal
 * Open Stripe customer portal for managing subscription
 */
router.post('/open-portal', async (req, res) => {
    try {
        if (!ipcBridge) {
            return res.status(500).json({ error: 'IPC bridge not available' });
        }

        const result = await ipcBridge.invoke('subscription:open-portal');
        
        if (result.success) {
            res.json({ portalUrl: result.url });
        } else {
            res.status(400).json({ error: result.error });
        }
    } catch (error) {
        console.error('[Subscription API] Error opening portal:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * POST /api/subscription/refresh
 * Force refresh subscription status from Stripe
 */
router.post('/refresh', async (req, res) => {
    try {
        if (!ipcBridge) {
            return res.status(500).json({ error: 'IPC bridge not available' });
        }

        const result = await ipcBridge.invoke('subscription:refresh-status');
        res.json(result);
    } catch (error) {
        console.error('[Subscription API] Error refreshing status:', error);
        res.status(500).json({ error: error.message });
    }
});

module.exports = { router, setIpcBridge };
